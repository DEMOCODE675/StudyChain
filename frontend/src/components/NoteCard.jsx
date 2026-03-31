import { buildIpfsLink } from "../services/api";

function formatTimestamp(value) {
    const date = new Date(value || 0);
    if (Number.isNaN(date.getTime())) {
        return "Unknown time";
    }
    return date.toLocaleString();
}

export default function NoteCard({
    note,
    onLike,
    isLiking,
    highlight,
    canLike = false,
    isLiked = false,
    onRequireLogin,
}) {
    const ipfsLink = buildIpfsLink(note.cid);
    const tags = Array.isArray(note.tags) ? note.tags : [];
    const noteIdentifier = note.id || note.cid;

    function handleLikeClick() {
        if (!canLike) {
            if (onRequireLogin) {
                onRequireLogin();
            }
            return;
        }

        if (!noteIdentifier || typeof onLike !== "function") {
            return;
        }

        onLike(noteIdentifier);
    }

    return (
        <article
            className={`rounded-2xl border bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-lg ${highlight ? "border-black shadow-[6px_6px_0_0_#111111]" : "border-zinc-300"
                }`}
        >
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h3 className="text-base font-semibold text-zinc-900">{note.filename}</h3>
                    <p className="mt-1 text-sm text-zinc-600">
                        {note.branch} · {note.year} · {note.semester}
                    </p>
                    <p className="text-sm text-zinc-700">
                        {note.subject} / {note.chapter}
                    </p>
                </div>

                {highlight ? (
                    <span className="mono rounded-full border border-black px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-black">
                        Top Note
                    </span>
                ) : null}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
                {tags.length > 0 ? (
                    tags.map((tag) => (
                        <span
                            key={`${note.id}-${tag}`}
                            className="mono rounded-full border border-zinc-300 px-2 py-1 text-[11px] text-zinc-700"
                        >
                            {tag}
                        </span>
                    ))
                ) : (
                    <span className="mono rounded-full border border-zinc-200 px-2 py-1 text-[11px] text-zinc-500">
                        #NoTags
                    </span>
                )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-zinc-600">
                <span className="mono">Uploader: {note.uploadedByName || "Anonymous"}</span>
                <span className="mono">•</span>
                <span className="mono">{formatTimestamp(note.createdAt)}</span>
                <span className="mono">•</span>
                <span className="mono">Likes: {note.likes}</span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
                <a
                    href={ipfsLink}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-black px-3 py-2 text-sm font-medium transition hover:bg-black hover:text-white"
                >
                    View
                </a>
                <a
                    href={ipfsLink}
                    target="_blank"
                    rel="noreferrer"
                    download={note.filename}
                    className="rounded-lg border border-zinc-400 px-3 py-2 text-sm font-medium transition hover:border-black"
                >
                    Download
                </a>
                <button
                    type="button"
                    onClick={handleLikeClick}
                    disabled={isLiking}
                    className="rounded-lg border border-zinc-400 px-3 py-2 text-sm font-medium transition hover:border-black disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isLiking
                        ? "Updating..."
                        : canLike
                            ? `${isLiked ? "Unlike" : "Like"} (${note.likes})`
                            : "Login to Like"}
                </button>
            </div>
        </article>
    );
}
