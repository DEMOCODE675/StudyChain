import { useEffect, useMemo, useState } from "react";

import NoteCard from "../components/NoteCard";
import { readApiError } from "../services/api";
import { getNotesByUser, likeNote } from "../services/firestore";

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

export default function MyUploads({ user, onRequestLogin, refreshToken }) {
    const [notes, setNotes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [sortBy, setSortBy] = useState("latest");
    const [likingNoteId, setLikingNoteId] = useState("");

    useEffect(() => {
        if (!user) {
            setNotes([]);
            setIsLoading(false);
            setErrorMessage("");
            return;
        }

        let active = true;

        async function loadMyNotes() {
            setIsLoading(true);
            setErrorMessage("");

            try {
                const mine = await getNotesByUser(user.uid);

                if (active) {
                    setNotes(mine);
                }
            } catch (error) {
                if (active) {
                    setErrorMessage(readApiError(error, "Failed to load your uploads."));
                    setNotes([]);
                }
            } finally {
                if (active) {
                    setIsLoading(false);
                }
            }
        }

        void loadMyNotes();

        return () => {
            active = false;
        };
    }, [user, refreshToken]);

    const sortedNotes = useMemo(() => sortNotes(notes, sortBy), [notes, sortBy]);

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

        setLikingNoteId(noteId);
        try {
            const updated = await likeNote(noteId, user.uid);
            setNotes((prev) =>
                prev.map((note) =>
                    note.id === updated.id ||
                        note.cid === updated.cid ||
                        note.id === noteId ||
                        note.cid === noteId
                        ? updated
                        : note
                )
            );
        } catch (error) {
            setErrorMessage(readApiError(error, "Failed to like this note."));
        } finally {
            setLikingNoteId("");
        }
    }

    if (!user) {
        return (
            <section className="space-y-4">
                <header className="rounded-2xl border border-zinc-300 bg-white p-5 md:p-6">
                    <p className="mono text-xs uppercase tracking-[0.14em] text-zinc-500">Personal Space</p>
                    <h2 className="mt-2 text-3xl font-bold tracking-tight">My Uploads</h2>
                    <p className="mt-2 text-sm text-zinc-600">
                        Login to view notes uploaded by your account.
                    </p>
                    <button
                        type="button"
                        onClick={() => {
                            if (onRequestLogin) {
                                void onRequestLogin();
                            }
                        }}
                        className="mt-4 rounded-lg border border-black bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-white hover:text-black"
                    >
                        Login with Google
                    </button>
                </header>
            </section>
        );
    }

    return (
        <section className="space-y-4">
            <header className="rounded-2xl border border-zinc-300 bg-white p-5 md:p-6">
                <p className="mono text-xs uppercase tracking-[0.14em] text-zinc-500">Personal Space</p>
                <h2 className="mt-2 text-3xl font-bold tracking-tight">My Uploads</h2>
                <p className="mt-2 text-sm text-zinc-600">
                    Showing notes uploaded by <span className="mono">{user.name || "Student"}</span>
                </p>

                <div className="mt-4 w-full max-w-[220px]">
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
                </div>
            </header>

            {errorMessage ? (
                <div className="mono rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-xs text-red-700">
                    {errorMessage}
                </div>
            ) : null}

            <section className="rounded-2xl border border-zinc-300 bg-white p-5 md:p-6">
                {isLoading ? <p className="text-sm text-zinc-500">Loading your notes...</p> : null}

                {!isLoading && sortedNotes.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center">
                        <p className="text-sm font-medium text-zinc-700">No uploads found</p>
                        <p className="mt-1 text-xs text-zinc-500">
                            Upload a note from the Upload page using your signed-in account.
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
                                isLiking={likingNoteId === (note.id || note.cid)}
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
