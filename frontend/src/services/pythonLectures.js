import {
  addDoc,
  collection,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";

import { db, isFirebaseConfigured } from "./firebase";

const PYTHON_SOLUTIONS_COLLECTION = "pythonSolutions";
const FIXED_CONTENT_TYPE = "solution";

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

  return Array.from(
    new Set(
      tags
        .map((tag) => String(tag || "").trim())
        .filter(Boolean)
        .map((tag) => (tag.startsWith("#") ? tag : `#${tag.replaceAll(" ", "")}`))
    )
  );
}

function normalizeNumericSegment(value) {
  const parsed = Number.parseInt(String(value ?? "").trim(), 10);
  if (!Number.isFinite(parsed)) {
    return "";
  }

  return String(parsed);
}

function splitLegacyPath(value) {
  const cleaned = String(value || "")
    .trim()
    .replace(/[^0-9.]/g, "");

  if (!cleaned) {
    return { lectureNumber: "", lectureSubNumber: "" };
  }

  const [majorRaw, subRaw] = cleaned.split(".").filter(Boolean);

  return {
    lectureNumber: normalizeNumericSegment(majorRaw),
    lectureSubNumber: normalizeNumericSegment(subRaw),
  };
}

function normalizeLectureNumber(value) {
  return normalizeNumericSegment(value);
}

function normalizeLectureSubNumber(value) {
  return normalizeNumericSegment(value);
}

function compareNumericStrings(left, right) {
  const leftValue = Number.parseInt(String(left ?? "0"), 10);
  const rightValue = Number.parseInt(String(right ?? "0"), 10);

  if (!Number.isFinite(leftValue) && !Number.isFinite(rightValue)) {
    return 0;
  }
  if (!Number.isFinite(leftValue)) {
    return -1;
  }
  if (!Number.isFinite(rightValue)) {
    return 1;
  }

  return leftValue - rightValue;
}

export function compareLectureNumbers(left, right) {
  return compareNumericStrings(left, right);
}

export function compareLectureSubNumbers(left, right) {
  return compareNumericStrings(left, right);
}

function getLecturePartsFromData(data) {
  const parsedLegacyQuestion = splitLegacyPath(data.questionNumber || "");
  const parsedLegacyLecture = splitLegacyPath(data.lectureNumber || "");

  const lectureNumber =
    normalizeLectureNumber(data.lectureNumber)
    || parsedLegacyLecture.lectureNumber
    || parsedLegacyQuestion.lectureNumber
    || "0";

  const lectureSubNumber =
    normalizeLectureSubNumber(data.lectureSubNumber)
    || parsedLegacyLecture.lectureSubNumber
    || parsedLegacyQuestion.lectureSubNumber
    || "0";

  return {
    lectureNumber,
    lectureSubNumber,
    lecturePath: `${lectureNumber}.${lectureSubNumber}`,
  };
}

// Compatibility exports retained so existing imports do not break.
export function questionNumberToParts(questionNumber) {
  const parts = splitLegacyPath(questionNumber);
  return [parts.lectureNumber, parts.lectureSubNumber]
    .filter(Boolean)
    .map((part) => Number.parseInt(part, 10));
}

export function compareQuestionNumbers(left, right) {
  const leftParts = splitLegacyPath(left);
  const rightParts = splitLegacyPath(right);

  const byLecture = compareLectureNumbers(leftParts.lectureNumber, rightParts.lectureNumber);
  if (byLecture !== 0) {
    return byLecture;
  }

  return compareLectureSubNumbers(leftParts.lectureSubNumber, rightParts.lectureSubNumber);
}

function mapSolutionDoc(snapshot) {
  const data = snapshot.data() || {};
  const lectureParts = getLecturePartsFromData(data);

  return {
    id: snapshot.id,
    lectureNumber: lectureParts.lectureNumber,
    lectureSubNumber: lectureParts.lectureSubNumber,
    lecturePath: lectureParts.lecturePath,
    solutionTitle: String(data.solutionTitle || data.questionTitle || data.title || "Untitled Solution"),
    problemStatement: String(data.problemStatement || data.questionText || data.description || ""),
    solutionCode: String(data.solutionCode || data.code || ""),
    tags: normalizeTags(data.tags),
    uploadedBy: String(data.uploadedBy || ""),
    uploadedByName: String(data.uploadedByName || "Student"),
    createdAt: normalizeCreatedAt(data.createdAt),
    contentType: String(data.contentType || FIXED_CONTENT_TYPE),
  };
}

export async function getPythonSolutions() {
  ensureFirestore();

  const solutionsQuery = query(
    collection(db, PYTHON_SOLUTIONS_COLLECTION),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(solutionsQuery);

  return snapshot.docs
    .map(mapSolutionDoc)
    .filter(
      (item) =>
        item.contentType === FIXED_CONTENT_TYPE
        && item.solutionCode.trim().length > 0
    );
}

export async function createPythonSolution(solutionData) {
  ensureFirestore();

  const lectureNumber = normalizeLectureNumber(solutionData.lectureNumber);
  const lectureSubNumber = normalizeLectureSubNumber(solutionData.lectureSubNumber);
  if (!lectureNumber || !lectureSubNumber) {
    throw new Error("Lecture number and lecture sub number are required. Example: 17 and 1");
  }

  const solutionTitle = String(solutionData.solutionTitle || solutionData.questionTitle || "").trim();
  const problemStatement = String(solutionData.problemStatement || solutionData.questionText || "").trim();
  const solutionCode = String(solutionData.solutionCode || "").trim();

  if (!solutionTitle) {
    throw new Error("Solution title is required.");
  }

  if (!solutionCode) {
    throw new Error("Solution code is required.");
  }

  const payload = {
    lectureNumber,
    lectureSubNumber,
    solutionTitle,
    problemStatement,
    solutionCode,
    tags: normalizeTags(solutionData.tags),
    uploadedBy: String(solutionData.uploadedBy || "").trim(),
    uploadedByName: String(solutionData.uploadedByName || "Student").trim() || "Student",
    // Keep backward-compatible fields for older clients reading legacy schema.
    questionNumber: `${lectureNumber}.${lectureSubNumber}`,
    questionTitle: solutionTitle,
    questionText: problemStatement,
    contentType: FIXED_CONTENT_TYPE,
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, PYTHON_SOLUTIONS_COLLECTION), payload);
  const createdSnapshot = await getDoc(docRef);

  return mapSolutionDoc(createdSnapshot);
}
