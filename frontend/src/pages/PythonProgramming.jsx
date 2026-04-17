import { useEffect, useMemo, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { githubDark, githubLight } from "@uiw/codemirror-theme-github";
import { indentationMarkers } from "@replit/codemirror-indentation-markers";

import { readApiError } from "../services/api";
import {
    compareLectureNumbers,
    compareLectureSubNumbers,
    createPythonSolution,
    getPythonSolutions,
} from "../services/pythonLectures";

function parseTagInput(rawTags) {
    return rawTags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .map((tag) => (tag.startsWith("#") ? tag : `#${tag.replaceAll(" ", "")}`));
}

function sortSolutionsByLecture(solutions) {
    return [...solutions].sort((left, right) => {
        const byLectureNumber = compareLectureNumbers(left.lectureNumber, right.lectureNumber);
        if (byLectureNumber !== 0) {
            return byLectureNumber;
        }

        const byLectureSubNumber = compareLectureSubNumbers(
            left.lectureSubNumber,
            right.lectureSubNumber
        );
        if (byLectureSubNumber !== 0) {
            return byLectureSubNumber;
        }

        const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
        const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
        return rightTime - leftTime;
    });
}

function formatCreatedAt(value) {
    const date = new Date(value || 0);
    if (Number.isNaN(date.getTime())) {
        return "Unknown time";
    }

    return date.toLocaleString();
}

function getIsMobileViewport() {
    if (typeof window === "undefined") {
        return false;
    }

    return window.matchMedia("(max-width: 640px)").matches;
}

function getCodeLineCount(code) {
    const normalized = String(code || "");
    if (!normalized) {
        return 1;
    }

    return normalized.split(/\r\n|\r|\n/).length;
}

function getEditorHeightForCode(
    code,
    {
        isMobile,
        minMobile = 360,
        maxMobile = 760,
        minDesktop = 320,
        maxDesktop = 640,
        lineHeight = 23,
        verticalPadding = 56,
    }
) {
    const lines = getCodeLineCount(code);
    const estimated = lines * lineHeight + verticalPadding;
    const minHeight = isMobile ? minMobile : minDesktop;
    const maxHeight = isMobile ? maxMobile : maxDesktop;
    const clamped = Math.min(maxHeight, Math.max(minHeight, estimated));
    return `${clamped}px`;
}

export default function PythonProgramming({ user, onRequestLogin }) {
    const [solutions, setSolutions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [copiedSolutionId, setCopiedSolutionId] = useState("");

    const [lectureNumber, setLectureNumber] = useState("");
    const [lectureSubNumber, setLectureSubNumber] = useState("");
    const [solutionTitle, setSolutionTitle] = useState("");
    const [problemStatement, setProblemStatement] = useState("");
    const [solutionCode, setSolutionCode] = useState("");
    const [tagsInput, setTagsInput] = useState("#python, #solution");

    const [searchInput, setSearchInput] = useState("");
    const [activeLectureNumber, setActiveLectureNumber] = useState("");
    const [isMobileViewport, setIsMobileViewport] = useState(getIsMobileViewport);

    const pythonExtensions = useMemo(
        () => [
            python(),
            indentationMarkers({
                highlightActiveBlock: true,
                markerType: "fullScope",
                hideFirstIndent: false,
            }),
        ],
        []
    );

    useEffect(() => {
        let active = true;

        async function loadSolutions() {
            setIsLoading(true);
            setErrorMessage("");

            try {
                const response = await getPythonSolutions();
                if (active) {
                    setSolutions(sortSolutionsByLecture(response));
                }
            } catch (error) {
                if (active) {
                    setErrorMessage(readApiError(error, "Failed to load Python solutions."));
                    setSolutions([]);
                }
            } finally {
                if (active) {
                    setIsLoading(false);
                }
            }
        }

        void loadSolutions();

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") {
            return undefined;
        }

        const mediaQuery = window.matchMedia("(max-width: 640px)");
        const handleChange = () => {
            setIsMobileViewport(mediaQuery.matches);
        };

        handleChange();

        if (typeof mediaQuery.addEventListener === "function") {
            mediaQuery.addEventListener("change", handleChange);
            return () => {
                mediaQuery.removeEventListener("change", handleChange);
            };
        }

        mediaQuery.addListener(handleChange);
        return () => {
            mediaQuery.removeListener(handleChange);
        };
    }, []);

    useEffect(() => {
        if (!copiedSolutionId) {
            return undefined;
        }

        const timer = setTimeout(() => {
            setCopiedSolutionId("");
        }, 1400);

        return () => {
            clearTimeout(timer);
        };
    }, [copiedSolutionId]);

    const visibleSolutions = useMemo(() => {
        const term = searchInput.trim().toLowerCase();

        if (!term) {
            return sortSolutionsByLecture(solutions);
        }

        return sortSolutionsByLecture(
            solutions.filter((item) => {
                const searchableFields = [
                    item.lectureNumber,
                    item.lectureSubNumber,
                    item.solutionTitle,
                    item.problemStatement,
                    item.solutionCode,
                    ...(Array.isArray(item.tags) ? item.tags : []),
                ];

                return searchableFields.some((field) =>
                    String(field || "")
                        .toLowerCase()
                        .includes(term)
                );
            })
        );
    }, [solutions, searchInput]);

    const lectureGroups = useMemo(() => {
        const grouped = new Map();

        visibleSolutions.forEach((item) => {
            const key = String(item.lectureNumber || "0");
            const existing = grouped.get(key) || [];
            existing.push(item);
            grouped.set(key, existing);
        });

        grouped.forEach((items, key) => {
            grouped.set(key, sortSolutionsByLecture(items));
        });

        return grouped;
    }, [visibleSolutions]);

    const lectureNumbers = useMemo(
        () => Array.from(lectureGroups.keys()).sort((left, right) => compareLectureNumbers(left, right)),
        [lectureGroups]
    );

    useEffect(() => {
        if (lectureNumbers.length === 0) {
            setActiveLectureNumber("");
            return;
        }

        if (!activeLectureNumber || !lectureGroups.has(activeLectureNumber)) {
            setActiveLectureNumber(lectureNumbers[0]);
        }
    }, [lectureNumbers, activeLectureNumber, lectureGroups]);

    const activeLectureIndex = useMemo(
        () => lectureNumbers.findIndex((value) => value === activeLectureNumber),
        [lectureNumbers, activeLectureNumber]
    );

    const activeLectureSolutions = useMemo(
        () => lectureGroups.get(activeLectureNumber) || [],
        [lectureGroups, activeLectureNumber]
    );

    const composeEditorHeight = useMemo(
        () => getEditorHeightForCode(solutionCode, { isMobile: isMobileViewport }),
        [solutionCode, isMobileViewport]
    );

    function goToPreviousLecture() {
        if (activeLectureIndex <= 0) {
            return;
        }

        setActiveLectureNumber(lectureNumbers[activeLectureIndex - 1]);
    }

    function goToNextLecture() {
        if (activeLectureIndex < 0 || activeLectureIndex >= lectureNumbers.length - 1) {
            return;
        }

        setActiveLectureNumber(lectureNumbers[activeLectureIndex + 1]);
    }

    async function handleSubmit(event) {
        event.preventDefault();

        if (!user) {
            setErrorMessage("Login is required to add Python coding solutions.");
            setSuccessMessage("");
            if (onRequestLogin) {
                try {
                    await onRequestLogin();
                } catch {
                    // AuthContext handles detailed auth errors.
                }
            }
            return;
        }

        const normalizedLectureNumber = lectureNumber.trim();
        const normalizedLectureSubNumber = lectureSubNumber.trim();

        if (!/^\d+$/.test(normalizedLectureNumber)) {
            setErrorMessage("Use lecture no. in number format like 17.");
            setSuccessMessage("");
            return;
        }

        if (!/^\d+$/.test(normalizedLectureSubNumber)) {
            setErrorMessage("Use lecture sub no. in number format like 1 or 2.");
            setSuccessMessage("");
            return;
        }

        if (!solutionTitle.trim() || !solutionCode.trim()) {
            setErrorMessage("Solution title and solution code are required.");
            setSuccessMessage("");
            return;
        }

        setIsSaving(true);
        setErrorMessage("");
        setSuccessMessage("");

        try {
            const createdSolution = await createPythonSolution({
                lectureNumber: normalizedLectureNumber,
                lectureSubNumber: normalizedLectureSubNumber,
                solutionTitle: solutionTitle.trim(),
                problemStatement: problemStatement.trim(),
                solutionCode,
                tags: parseTagInput(tagsInput),
                uploadedBy: user.uid,
                uploadedByName: user.name || "Student",
            });

            setSolutions((prev) => sortSolutionsByLecture([...prev, createdSolution]));
            setActiveLectureNumber(createdSolution.lectureNumber);
            setSuccessMessage(
                `Lecture ${createdSolution.lectureNumber}.${createdSolution.lectureSubNumber} solution published.`
            );

            setLectureSubNumber("");
            setSolutionTitle("");
            setProblemStatement("");
            setSolutionCode("");
        } catch (error) {
            setErrorMessage(readApiError(error, "Failed to save solution."));
        } finally {
            setIsSaving(false);
        }
    }

    async function handleCopyCode(item) {
        if (!navigator?.clipboard?.writeText) {
            return;
        }

        try {
            await navigator.clipboard.writeText(item.solutionCode || "");
            setCopiedSolutionId(item.id);
        } catch {
            setErrorMessage("Could not copy code to clipboard.");
        }
    }

    return (
        <section className="space-y-5">
            <header className="relative overflow-hidden rounded-2xl border border-zinc-300 bg-[linear-gradient(145deg,_#ffffff_0%,_#ecf5ff_45%,_#d9ebff_100%)] p-5 md:p-6">
                <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full border border-blue-200 bg-blue-100/60" />
                <div className="absolute -left-8 bottom-0 h-20 w-20 rounded-full border border-sky-200 bg-sky-100/50" />
                <div className="relative">
                    {/*<p className="mono text-xs uppercase tracking-[0.14em] text-zinc-600">Python Solution Studio</p>*/}
                    <h2 className="mt-2 text-3xl font-bold tracking-tight">Lecture-wise Python Solutions</h2>
                    <p className="mt-2 max-w-3xl text-sm text-zinc-700">
                        Add only Python solutions and organize them by lecture number and sub lecture number.
                    </p>
                    {/*<p className="mono mt-3 inline-flex rounded-md border border-black/20 bg-black/5 px-2 py-1 text-[11px] uppercase tracking-[0.08em] text-zinc-700">
                        Locked mode: solution only
                    </p>*/}
                </div>
            </header>

            {errorMessage ? (
                <div className="mono rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-xs text-red-700">
                    {errorMessage}
                </div>
            ) : null}

            {successMessage ? (
                <div className="mono rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">
                    {successMessage}
                </div>
            ) : null}

            <div className="grid gap-5 xl:grid-cols-[1.15fr_1.85fr]">
                <section className="rounded-2xl border border-zinc-300 bg-white p-5 md:p-6">
                    <div className="mb-4">
                        <h3 className="text-xl font-semibold">Add Python Solution</h3>
                        <p className="mt-1 text-sm text-zinc-600">
                            Add lecture details first, then add Python solution code.
                        </p>
                    </div>

                    {!user ? (
                        <div className="mb-4 rounded-lg border border-black bg-amber-50 px-3 py-2 text-xs text-blue-700">
                            Login is required to publish solutions.
                            <button
                                type="button"
                                onClick={() => {
                                    if (onRequestLogin) {
                                        void onRequestLogin();
                                    }
                                }}
                                className="ml-2 rounded-md border border-black px-2 py-1 text-[11px] font-medium text-blue-500 hover:bg-blue-300/30 transition"
                            >
                                Login with Google
                            </button>
                        </div>
                    ) : (
                        <p className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
                            Posting as <span className="font-semibold text-violet-700">{user.name || "Student"}</span>
                        </p>
                    )}

                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <label className="block text-sm font-medium text-zinc-700">
                                Lecture no.
                                <input
                                    type="text"
                                    value={lectureNumber}
                                    onChange={(event) => setLectureNumber(event.target.value)}
                                    placeholder="16"
                                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
                                />
                            </label>

                            <label className="block text-sm font-medium text-zinc-700">
                                Lecture sub no.
                                <input
                                    type="text"
                                    value={lectureSubNumber}
                                    onChange={(event) => setLectureSubNumber(event.target.value)}
                                    placeholder="1"
                                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
                                />
                            </label>
                        </div>

                        <label className="block text-sm font-medium text-zinc-700">
                            Solution title
                            <input
                                type="text"
                                value={solutionTitle}
                                onChange={(event) => setSolutionTitle(event.target.value)}
                                placeholder="List, Set, Tuple, etc"
                                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
                            />
                        </label>

                        <label className="block text-sm font-medium text-zinc-700">
                            Problem statement (optional)
                            <textarea
                                value={problemStatement}
                                onChange={(event) => setProblemStatement(event.target.value)}
                                rows={3}
                                placeholder="Write a function that returns the largest value from the given list."
                                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
                            />
                        </label>

                        <div>
                            <p className="text-sm font-medium text-zinc-700">Solution code</p>
                            <div className="-mx-2 mt-1 overflow-hidden rounded-lg border border-zinc-300 sm:mx-0">
                                <CodeMirror
                                    value={solutionCode}
                                    height={composeEditorHeight}
                                    theme={githubLight}
                                    extensions={pythonExtensions}
                                    onChange={(value) => setSolutionCode(value)}
                                    placeholder={"def largest(values):\n    return max(values)"}
                                    basicSetup={{
                                        lineNumbers: true,
                                        foldGutter: true,
                                        highlightActiveLine: true,
                                        highlightActiveLineGutter: true,
                                        bracketMatching: true,
                                        closeBrackets: true,
                                        autocompletion: true,
                                        indentOnInput: true,
                                        indentWithTab: true,
                                        tabSize: 4,
                                    }}
                                />
                            </div>
                        </div>

                        <label className="block text-sm font-medium text-zinc-700">
                            Tags (comma separated)
                            <input
                                type="text"
                                value={tagsInput}
                                onChange={(event) => setTagsInput(event.target.value)}
                                placeholder="#python, #solution, #arrays"
                                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
                            />
                        </label>

                        <button
                            type="submit"
                            disabled={isSaving || !user}
                            className="w-full rounded-lg border border-black bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isSaving ? "Publishing..." : "Publish Solution"}
                        </button>
                    </form>
                </section>

                <section className="rounded-2xl border border-zinc-300 bg-white p-5 md:p-6">
                    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                        <div>
                            <h3 className="text-xl font-semibold">Python Solution (CodeTantra)</h3>
                            {/*<p className="mt-1 text-sm text-zinc-600">
                                Browse lecture-by-lecture. All Lecture 17 solutions stay together, then 18, then 19.
                            </p>*/}
                        </div>
                        <span className="mono rounded-md border border-zinc-300 px-2 py-1 text-[11px] uppercase tracking-[0.1em] text-zinc-600">
                            {visibleSolutions.length} solution(s) total
                        </span>
                    </div>

                    <label className="text-sm font-medium text-zinc-700">
                        Search in solutions
                        <input
                            type="text"
                            value={searchInput}
                            onChange={(event) => setSearchInput(event.target.value)}
                            placeholder="Search by lecture, title, statement, tags, or code"
                            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
                        />
                    </label>

                    {lectureNumbers.length > 0 ? (
                        <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                            {/*<div className="flex flex-wrap items-center justify-between gap-2">
                                <button
                                    type="button"
                                    onClick={goToPreviousLecture}
                                    disabled={activeLectureIndex <= 0}
                                    className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:border-black disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Previous Lecture
                                </button>

                                <p className="mono text-xs uppercase tracking-[0.1em] text-zinc-600">
                                    Lecture {activeLectureNumber} ({activeLectureSolutions.length} solution(s))
                                </p>

                                <button
                                    type="button"
                                    onClick={goToNextLecture}
                                    disabled={activeLectureIndex < 0 || activeLectureIndex >= lectureNumbers.length - 1}
                                    className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:border-black disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Next Lecture
                                </button>
                            </div>*/}

                            <div className="mt-3 flex flex-wrap gap-2">
                                {lectureNumbers.map((number) => {
                                    const isActive = number === activeLectureNumber;
                                    return (
                                        <button
                                            key={number}
                                            type="button"
                                            onClick={() => setActiveLectureNumber(number)}
                                            className={`mono rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.1em] transition ${isActive
                                                ? "border-black bg-black text-white"
                                                : "border-zinc-300 text-zinc-700 hover:border-black"
                                                }`}
                                        >
                                            Lecture {number}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ) : null}

                    {isLoading ? (
                        <p className="mt-5 text-sm text-zinc-500">Loading Python solutions...</p>
                    ) : null}

                    {!isLoading && lectureNumbers.length === 0 ? (
                        <div className="mt-5 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center">
                            <p className="text-sm font-medium text-zinc-700">No solutions found</p>
                            <p className="mt-1 text-xs text-zinc-500">
                                Add your first solution under lecture 17, sub lecture 1.
                            </p>
                        </div>
                    ) : null}

                    {!isLoading && lectureNumbers.length > 0 ? (
                        <section className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                            <div className="mb-3 flex items-center justify-between gap-3">
                                <h4 className="text-base font-semibold text-zinc-900">
                                    Lecture {activeLectureNumber}
                                </h4>
                                <span className="mono text-[11px] uppercase tracking-[0.1em] text-zinc-500">
                                    {activeLectureSolutions.length} solution(s)
                                </span>
                            </div>

                            <div className="space-y-3">
                                {activeLectureSolutions.map((item) => (
                                    <article
                                        key={item.id}
                                        className="rounded-lg border border-zinc-300 bg-white p-3"
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div>
                                                <p className="mono text-[11px] uppercase tracking-[0.1em] text-zinc-500">
                                                    Lecture {item.lectureNumber}.{item.lectureSubNumber}
                                                </p>
                                                <h5 className="text-sm font-semibold text-zinc-900">
                                                    {item.solutionTitle}
                                                </h5>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    void handleCopyCode(item);
                                                }}
                                                className="mono rounded-md border border-zinc-300 px-2 py-1 text-[11px] uppercase tracking-[0.08em] text-zinc-700 transition hover:border-black"
                                            >
                                                {copiedSolutionId === item.id ? "Copied" : "Copy code"}
                                            </button>
                                        </div>

                                        {item.problemStatement ? (
                                            <p className="mt-2 text-sm text-zinc-700">{item.problemStatement}</p>
                                        ) : null}

                                        <div className="-mx-2 mt-3 overflow-hidden rounded-lg border border-zinc-800 sm:mx-0">
                                            <CodeMirror
                                                value={item.solutionCode}
                                                height={getEditorHeightForCode(item.solutionCode, {
                                                    isMobile: isMobileViewport,
                                                    minMobile: 320,
                                                    maxMobile: 700,
                                                    minDesktop: 220,
                                                    maxDesktop: 500,
                                                })}
                                                theme={githubDark}
                                                extensions={pythonExtensions}
                                                editable={false}
                                                readOnly
                                                basicSetup={{
                                                    lineNumbers: true,
                                                    foldGutter: false,
                                                    highlightActiveLine: false,
                                                    highlightActiveLineGutter: false,
                                                    bracketMatching: true,
                                                    closeBrackets: false,
                                                    autocompletion: false,
                                                    indentOnInput: false,
                                                }}
                                            />
                                        </div>

                                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-600">
                                            <span className="mono">By: {item.uploadedByName || "Student"}</span>
                                            <span className="mono">|</span>
                                            <span className="mono">{formatCreatedAt(item.createdAt)}</span>
                                        </div>

                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {Array.isArray(item.tags) && item.tags.length > 0 ? (
                                                item.tags.map((tag) => (
                                                    <span
                                                        key={`${item.id}-${tag}`}
                                                        className="mono rounded-full border border-zinc-300 px-2 py-1 text-[11px] text-zinc-700"
                                                    >
                                                        {tag}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="mono rounded-full border border-zinc-200 px-2 py-1 text-[11px] text-zinc-500">
                                                    #solution
                                                </span>
                                            )}
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </section>
                    ) : null}
                </section>
            </div>
        </section>
    );
}
