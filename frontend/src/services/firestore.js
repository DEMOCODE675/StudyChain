import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";

import { db, isFirebaseConfigured } from "./firebase";

const NOTES_COLLECTION = "notes";

function ensureFirestore() {
  if (!isFirebaseConfigured || !db) {
    throw new Error(
      "Firebase is not configured. Add VITE_FIREBASE_* values in frontend/.env."
    );
  }
}

function normalizeCreatedAt(value) {
  if (!value) {
    return null;
  }

  if (typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) {
    return [];
  }

  return tags
    .map((tag) => String(tag).trim())
    .filter(Boolean)
    .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`));
}

function normalizeLikeCount(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeLikedBy(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((uid) => String(uid || "").trim())
        .filter(Boolean)
    )
  );
}

function normalizeLikedByPreserveOrder(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((uid) => String(uid || "")).filter(Boolean);
}

function mapNoteDoc(snapshot) {
  const data = snapshot.data() || {};

  return {
    id: snapshot.id,
    cid: String(data.cid || ""),
    filename: String(data.filename || "Untitled"),
    branch: String(data.branch || ""),
    year: String(data.year || ""),
    semester: String(data.semester || ""),
    subject: String(data.subject || ""),
    chapter: String(data.chapter || ""),
    tags: normalizeTags(data.tags),
    uploadedBy: String(data.uploadedBy || ""),
    uploadedByName: String(data.uploadedByName || "Anonymous"),
    likes: normalizeLikeCount(data.likes),
    likedBy: normalizeLikedBy(data.likedBy),
    createdAt: normalizeCreatedAt(data.createdAt),
  };
}

function sortLatest(notes) {
  return [...notes].sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  });
}

function applyClientFilters(notes, filters) {
  return notes.filter((note) => {
    if (filters.branch && note.branch !== filters.branch) {
      return false;
    }
    if (filters.year && note.year !== filters.year) {
      return false;
    }
    if (filters.semester && note.semester !== filters.semester) {
      return false;
    }
    if (filters.subject && note.subject !== filters.subject) {
      return false;
    }
    if (filters.chapter && note.chapter.toLowerCase() !== filters.chapter.toLowerCase()) {
      return false;
    }
    if (filters.uploadedBy && note.uploadedBy !== filters.uploadedBy) {
      return false;
    }
    return true;
  });
}

export async function saveNote(noteData) {
  ensureFirestore();

  const payload = {
    cid: String(noteData.cid || ""),
    filename: String(noteData.filename || "Untitled"),
    branch: String(noteData.branch || ""),
    year: String(noteData.year || ""),
    semester: String(noteData.semester || ""),
    subject: String(noteData.subject || ""),
    chapter: String(noteData.chapter || ""),
    tags: normalizeTags(noteData.tags),
    uploadedBy: String(noteData.uploadedBy || ""),
    uploadedByName: String(noteData.uploadedByName || "Anonymous"),
    likes: 0,
    likedBy: [],
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, NOTES_COLLECTION), payload);
  const created = await getDoc(docRef);
  return mapNoteDoc(created);
}

export async function getAllNotes() {
  ensureFirestore();

  const notesQuery = query(collection(db, NOTES_COLLECTION), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(notesQuery);
  return snapshot.docs.map(mapNoteDoc);
}

export async function getNotesByFilter(filters) {
  ensureFirestore();

  const activeFilters = {
    branch: filters.branch || "",
    year: filters.year || "",
    semester: filters.semester || "",
    subject: filters.subject || "",
    chapter: filters.chapter || "",
    uploadedBy: filters.uploadedBy || "",
  };

  const constraints = [];
  if (activeFilters.branch) constraints.push(where("branch", "==", activeFilters.branch));
  if (activeFilters.year) constraints.push(where("year", "==", activeFilters.year));
  if (activeFilters.semester)
    constraints.push(where("semester", "==", activeFilters.semester));
  if (activeFilters.subject) constraints.push(where("subject", "==", activeFilters.subject));
  if (activeFilters.uploadedBy)
    constraints.push(where("uploadedBy", "==", activeFilters.uploadedBy));

  try {
    const filteredQuery = query(
      collection(db, NOTES_COLLECTION),
      ...constraints,
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(filteredQuery);
    const notes = snapshot.docs.map(mapNoteDoc);
    return applyClientFilters(notes, activeFilters);
  } catch {
    // Fallback keeps UX working when composite indexes are not created yet.
    const allNotes = await getAllNotes();
    const filtered = applyClientFilters(allNotes, activeFilters);
    return sortLatest(filtered);
  }
}

export async function searchNotes(keyword) {
  ensureFirestore();

  const term = String(keyword || "").trim().toLowerCase();
  if (!term) {
    return getAllNotes();
  }

  const notes = await getAllNotes();
  return notes.filter((note) => {
    const fields = [note.filename, note.subject, note.chapter, ...note.tags];
    return fields.some((field) => field.toLowerCase().includes(term));
  });
}

export async function likeNote(noteId, userId) {
  ensureFirestore();

  const identifier = String(noteId || "").trim();
  if (!identifier) {
    throw new Error("Cannot like note: missing note identifier.");
  }

  const normalizedUserId = String(userId || "").trim();
  if (!normalizedUserId) {
    throw new Error("Cannot update like: login is required.");
  }

  const NOT_FOUND_CODE = "note-not-found";

  async function applyLikeToggle(noteRef) {
    return runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(noteRef);
      if (!snapshot.exists()) {
        const missingError = new Error("Note not found.");
        missingError.code = NOT_FOUND_CODE;
        throw missingError;
      }

      const payload = snapshot.data() || {};
      const currentLikes =
        typeof payload.likes === "number" && Number.isFinite(payload.likes)
          ? payload.likes
          : 0;
      const currentLikedBy = normalizeLikedByPreserveOrder(payload.likedBy);
      const alreadyLiked = currentLikedBy.includes(normalizedUserId);

      const nextLikedBy = alreadyLiked
        ? currentLikedBy.filter((uid) => uid !== normalizedUserId)
        : [...currentLikedBy, normalizedUserId];
      const nextLikes = alreadyLiked ? Math.max(0, currentLikes - 1) : currentLikes + 1;
      const toggledAction = alreadyLiked ? "unliked" : "liked";

      transaction.update(noteRef, {
        likes: nextLikes,
        likedBy: nextLikedBy,
      });

      return {
        ...mapNoteDoc(snapshot),
        likes: nextLikes,
        likedBy: normalizeLikedBy(nextLikedBy),
        action: toggledAction,
      };
    });
  }

  const directRef = doc(db, NOTES_COLLECTION, identifier);

  try {
    return await applyLikeToggle(directRef);
  } catch (error) {
    const code = String(error?.code || "");

    if (code === NOT_FOUND_CODE) {
      // Backward compatibility for legacy clients that may still pass CID.
      const cidQuery = query(collection(db, NOTES_COLLECTION), where("cid", "==", identifier));
      const cidSnapshot = await getDocs(cidQuery);

      if (cidSnapshot.empty) {
        throw new Error("Note not found.");
      }

      try {
        return await applyLikeToggle(cidSnapshot.docs[0].ref);
      } catch (fallbackError) {
        const fallbackCode = String(fallbackError?.code || "");
        if (fallbackCode.includes("permission-denied")) {
          throw new Error("Like update failed: check Firestore rules for like/unlike permissions.");
        }

        throw fallbackError;
      }
    }

    if (code.includes("permission-denied")) {
      throw new Error("Like update failed: check Firestore rules for like/unlike permissions.");
    }

    throw error;
  }
}

export async function getNotesByUser(uid) {
  return getNotesByFilter({ uploadedBy: uid });
}
