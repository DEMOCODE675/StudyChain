import { useEffect, useMemo, useState } from "react";

import NoteCard from "../components/NoteCard";
import { readApiError } from "../services/api";
import {
    getAllNotes,
    getNotesByFilter,
    likeNote,
    searchNotes,
} from "../services/firestore";

function applyHierarchyFilters(notes, filters) {
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
        return true;
    });
}

function sortNotes(notes, sortBy) {
    if (sortBy === "likes") {
        return [...notes].sort((a, b) => {
            if (b.likes !== a.likes) {
                return b.likes - a.likes;
            }
            return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        });
    }

    return [...notes].sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
}

function applyOptimisticLike(notes, noteId, userId) {
    return notes.map((note) => {
        const isTarget =
            note.id === noteId ||
            note.cid === noteId;

        if (!isTarget) {
            return note;
        }

        const currentLikedBy = Array.isArray(note.likedBy) ? note.likedBy : [];
        const alreadyLiked = currentLikedBy.includes(userId);
        const nextLikedBy = alreadyLiked
            ? currentLikedBy.filter((uid) => uid !== userId)
            : [...currentLikedBy, userId];
        const currentLikes = typeof note.likes === "number" && Number.isFinite(note.likes)
            ? note.likes
            : 0;
        const nextLikes = alreadyLiked ? Math.max(0, currentLikes - 1) : currentLikes + 1;

        return {
            ...note,
            likedBy: nextLikedBy,
            likes: nextLikes,
        };
    });
}

export default function Explore({ filters, refreshToken, user, onRequestLogin }) {
    const [notes, setNotes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [, setErrorMessage] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [debouncedKeyword, setDebouncedKeyword] = useState("");
    const [chapterFilter, setChapterFilter] = useState("");
    const [sortBy, setSortBy] = useState("latest");
    const [likingCid, setLikingCid] = useState("");

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedKeyword(searchInput.trim());
        }, 300);

        return () => clearTimeout(timer);
    }, [searchInput]);

    useEffect(() => {
        let active = true;

        async function loadNotes() {
            setIsLoading(true);
            setErrorMessage("");

            try {
                const activeFilters = {
                    branch: filters.branch,
                    year: filters.year,
                    semester: filters.semester,
                    subject: filters.subject,
                    chapter: chapterFilter,
                };
                const hasActiveFilters = Object.values(activeFilters).some(Boolean);

                let response = [];
                if (debouncedKeyword) {
                    response = await searchNotes(debouncedKeyword);
                }

                if (!debouncedKeyword && hasActiveFilters) {
                    response = await getNotesByFilter(activeFilters);
                }

                if (!debouncedKeyword && !hasActiveFilters) {
                    response = await getAllNotes();
                }

                const filteredNotes = debouncedKeyword
                    ? applyHierarchyFilters(response, activeFilters)
                    : response;
                if (active) {
                    setNotes(filteredNotes);
                }
            } catch (error) {
                if (active) {
                    setErrorMessage(readApiError(error, "Failed to load notes."));
                    setNotes([]);
                }
            } finally {
                if (active) {
                    setIsLoading(false);
                }
            }
        }

        void loadNotes();

        return () => {
            active = false;
        };
    }, [filters, chapterFilter, debouncedKeyword, refreshToken]);

    const sortedNotes = useMemo(() => sortNotes(notes, sortBy), [notes, sortBy]);
    const chapterOptions = useMemo(() => {
        const chapters = new Set(notes.map((note) => note.chapter));
        return Array.from(chapters).sort();
    }, [notes]);

    async function handleLike(noteId) {
        if (!user) {
            setErrorMessage("Please login to like notes.");
            if (onRequestLogin) {
                try {
                    await onRequestLogin();
                } catch {
                    // AuthContext handles detailed auth errors.
                }
            }
            return;
        }

        if (likingCid === noteId) {
            return;
        }

        setErrorMessage("");
        const previousNotes = notes;
        setNotes((prev) => applyOptimisticLike(prev, noteId, user.uid));
        setLikingCid(noteId);
        try {
            const updated = await likeNote(noteId, user.uid);
            const isSameNote = (note) =>
                note.id === updated.id ||
                note.cid === updated.cid ||
                note.id === noteId ||
                note.cid === noteId;

            setNotes((prev) => prev.map((note) => (isSameNote(note) ? updated : note)));
        } catch (error) {
            setNotes(previousNotes);
            setErrorMessage(readApiError(error, "Failed to like this note."));
        } finally {
            setLikingCid("");
        }
    }

    return (
        <section className="space-y-5">
            <header className="rounded-2xl border border-zinc-300 bg-white p-5 md:p-6">
                {/*<p className="mono text-xs uppercase tracking-[0.14em] text-zinc-500">Discover</p>*/}
                <h2 className="mt-2 text-3xl font-bold tracking-tight">Find Notes</h2>
                {/*<p className="mt-2 text-sm text-zinc-600">
                    Search and filter notes by branch, year, semester, subject, chapter, and tags.
                </p>*/}

                {/*<div className="mt-4 grid gap-3 md:grid-cols-3">
                    <label className="text-sm font-medium text-zinc-700 md:col-span-2">
                        Search by filename, subject, chapter, or tags
                        <input
                            value={searchInput}
                            onChange={(event) => setSearchInput(event.target.value)}
                            type="text"
                            placeholder="Try: Physic, Maths, #Important"
                            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
                        />
                    </label>

                    <label className="text-sm font-medium text-zinc-700">
                        Sort by
                        <select
                            value={sortBy}
                            onChange={(event) => setSortBy(event.target.value)}
                            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
                        >
                            <option value="latest">Latest</option>
                            <option value="likes">Most liked</option>
                        </select>
                    </label>
                </div>*/}

                {/*<div className="mt-3">
                    <label className="text-sm font-medium text-zinc-700">
                        Chapter filter
                        <select
                            value={chapterFilter}
                            onChange={(event) => setChapterFilter(event.target.value)}
                            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-black focus:outline-none md:w-[320px]"
                        >
                            <option value="">All chapters</option>
                            {chapterOptions.map((chapter) => (
                                <option key={chapter} value={chapter}>
                                    {chapter}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>*/}
            </header>

            <section className="rounded-2xl border border-zinc-300 bg-white p-5 md:p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold">All Matching Notes</h3>
                    <span className="mono text-xs uppercase tracking-[0.1em] text-zinc-500">
                        {sortedNotes.length} result(s)
                    </span>
                </div>

                {isLoading ? <p className="text-sm text-zinc-500">Loading notes...</p> : null}

                {!isLoading && sortedNotes.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center">
                        <p className="text-sm font-medium text-zinc-700">No notes found</p>
                        <p className="mt-1 text-xs text-zinc-500">
                            Try changing filters, removing chapter, or searching with a different keyword.
                        </p>
                    </div>
                ) : null}

                {!isLoading && sortedNotes.length > 0 ? (
                    <div className="grid gap-3 lg:grid-cols-2">
                        {sortedNotes.map((note) => (
                            <NoteCard
                                key={note.id}
                                note={note}
                                onLike={handleLike}
                                isLiking={likingCid === (note.id || note.cid)}
                                isLiked={Boolean(user && Array.isArray(note.likedBy) && note.likedBy.includes(user.uid))}
                                canLike={Boolean(user)}
                                onRequireLogin={onRequestLogin}
                            />
                        ))}
                    </div>
                ) : null}
            </section>
        </section>
    );
}
