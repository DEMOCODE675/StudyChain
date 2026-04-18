import { useMemo, useState } from "react";

import { readApiError, uploadNote } from "../services/api";
import { saveNote } from "../services/firestore";

function getYears(structure, branch) {
    if (!branch || !structure[branch]) {
        return [];
    }
    return Object.keys(structure[branch]);
}

function getSemesters(structure, branch, year) {
    if (!branch || !year || !structure[branch]?.[year]) {
        return [];
    }
    return Object.keys(structure[branch][year]);
}

function getSubjects(structure, branch, year, semester) {
    if (!branch || !year || !semester || !structure[branch]?.[year]?.[semester]) {
        return [];
    }
    return structure[branch][year][semester];
}

function getChapterTemplates(subject) {
    const templates = ["Assignment Solutions", "Unit Notes", "Additional"];

    if (subject && subject.toLowerCase().includes("lab")) {
        return ["Manual Copy", ...templates];
    }

    return templates;
}

function parseTagInput(rawTags) {
    return rawTags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .map((tag) => (tag.startsWith("#") ? tag : `#${tag.replaceAll(" ", "")}`));
}

export default function UploadForm({ structure, user, onUploaded, onRequestLogin }) {
    const [branch, setBranch] = useState("");
    const [year, setYear] = useState("");
    const [semester, setSemester] = useState("");
    const [subject, setSubject] = useState("");
    const [chapter, setChapter] = useState("");
    const [tagsInput, setTagsInput] = useState("#Important, #Exam");
    const [file, setFile] = useState(null);

    const [isUploading, setIsUploading] = useState(false);
    const [, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const branches = useMemo(() => Object.keys(structure || {}), [structure]);
    const years = useMemo(() => getYears(structure, branch), [structure, branch]);
    const semesters = useMemo(
        () => getSemesters(structure, branch, year),
        [structure, branch, year]
    );
    const subjects = useMemo(
        () => getSubjects(structure, branch, year, semester),
        [structure, branch, year, semester]
    );
    const chapterTemplates = useMemo(() => getChapterTemplates(subject), [subject]);

    function resetDependentFields(level) {
        if (level === "branch") {
            setYear("");
            setSemester("");
            setSubject("");
            return;
        }

        if (level === "year") {
            setSemester("");
            setSubject("");
            return;
        }

        if (level === "semester") {
            setSubject("");
        }
    }

    async function handleSubmit(event) {
        event.preventDefault();

        if (!user) {
            setErrorMessage("Please login with Google before uploading notes.");
            setSuccessMessage("");
            return;
        }

        if (!file) {
            setErrorMessage("Please select a PDF files to upload.");
            setSuccessMessage("");
            return;
        }

        const lowerName = file.name.toLowerCase();
        if (!lowerName.endsWith(".pdf") && !lowerName.endsWith(".txt")) {
            setErrorMessage("Only PDF and TXT files are allowed.");
            setSuccessMessage("");
            return;
        }

        if (!branch || !year || !semester || !subject || !chapter.trim()) {
            setErrorMessage("Please complete all metadata fields before uploading.");
            setSuccessMessage("");
            return;
        }

        setIsUploading(true);
        setErrorMessage("");
        setSuccessMessage("");

        try {
            const normalizedTags = parseTagInput(tagsInput);

            const uploadResponse = await uploadNote({
                file,
                branch,
                year,
                semester,
                subject,
                chapter: chapter.trim(),
                tags: normalizedTags,
                uploadedBy: user.uid,
            });

            const savedNote = await saveNote({
                cid: uploadResponse.cid,
                filename: uploadResponse.filename || file.name,
                branch,
                year,
                semester,
                subject,
                chapter: chapter.trim(),
                tags: normalizedTags,
                uploadedBy: user.uid,
                uploadedByName: user.name || "Student",
            });

            setSuccessMessage(`Uploaded successfully. CID: ${savedNote.cid}`);
            setChapter("");
            setFile(null);
            if (onUploaded) {
                onUploaded(savedNote);
            }
        } catch (error) {
            setErrorMessage(readApiError(error, "Upload failed."));
        } finally {
            setIsUploading(false);
        }
    }

    return (
        <section className="rounded-2xl border border-zinc-300 bg-white p-5 md:p-6">
            <div className="mb-4">
                <h2 className="text-xl font-semibold">Upload New Note</h2>
            </div>

            {!user ? (
                <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    Login is required to upload notes.
                    <button
                        type="button"
                        onClick={() => {
                            if (onRequestLogin) {
                                void onRequestLogin();
                            }
                        }}
                        className="ml-2 rounded-md border border-amber-500 px-2 py-1 text-[11px] font-medium text-amber-700 hover:bg-amber-100"
                    >
                        Login with Google
                    </button>
                </div>
            ) : (
                <div className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
                    Uploading as <span className="font-semibold text-violet-700">{user.name || "Student"}</span>
                </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="grid gap-3 md:grid-cols-2">
                    <label className="text-sm font-medium text-zinc-700">
                        Branch
                        <select
                            value={branch}
                            onChange={(event) => {
                                setBranch(event.target.value);
                                resetDependentFields("branch");
                            }}
                            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
                        >
                            <option value="">Select branch</option>
                            {branches.map((item) => (
                                <option key={item} value={item}>
                                    {item}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="text-sm font-medium text-zinc-700">
                        Year
                        <select
                            value={year}
                            onChange={(event) => {
                                setYear(event.target.value);
                                resetDependentFields("year");
                            }}
                            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
                            disabled={!branch}
                        >
                            <option value="">Select year</option>
                            {years.map((item) => (
                                <option key={item} value={item}>
                                    {item}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="text-sm font-medium text-zinc-700">
                        Semester
                        <select
                            value={semester}
                            onChange={(event) => {
                                setSemester(event.target.value);
                                resetDependentFields("semester");
                            }}
                            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
                            disabled={!year}
                        >
                            <option value="">Select semester</option>
                            {semesters.map((item) => (
                                <option key={item} value={item}>
                                    {item}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="text-sm font-medium text-zinc-700">
                        Subject
                        <select
                            value={subject}
                            onChange={(event) => setSubject(event.target.value)}
                            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
                            disabled={!semester}
                        >
                            <option value="">Select subject</option>
                            {subjects.map((item) => (
                                <option key={item} value={item}>
                                    {item}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                    <label className="text-sm font-medium text-zinc-700">
                        Chapter
                        <input
                            type="text"
                            value={chapter}
                            onChange={(event) => setChapter(event.target.value)}
                            placeholder="Unit 2, Chapter 4..."
                            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
                        />

                        <div className="mt-2 flex flex-wrap gap-2">
                            {chapterTemplates.map((template) => (
                                <button
                                    key={template}
                                    type="button"
                                    onClick={() => setChapter(template)}
                                    className="rounded-md border border-zinc-300 px-2 py-1 text-[11px] font-medium text-zinc-700 transition hover:border-black"
                                >
                                    {template}
                                </button>
                            ))}
                        </div>
                    </label>

                    <label className="text-sm font-medium text-zinc-700">
                        Tags (comma separated)
                        <input
                            type="text"
                            value={tagsInput}
                            onChange={(event) => setTagsInput(event.target.value)}
                            placeholder="#Important, #Exam, #ShortNotes"
                            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
                        />
                    </label>
                </div>

                <label className="block text-sm font-medium text-zinc-700">
                    Upload file
                    <input
                        type="file"
                        accept=".pdf,.txt,text/plain,application/pdf"
                        onChange={(event) => {
                            setFile(event.target.files && event.target.files.length > 0
                                ? event.target.files[0]
                                : null);
                        }}
                        className="mt-1 block w-full cursor-pointer rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-zinc-900 file:px-3 file:py-2 file:text-white"
                    />
                </label>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        type="submit"
                        disabled={isUploading || !user}
                        className="rounded-lg border border-black bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isUploading ? "Uploading..." : "Upload to StudyChain"}
                    </button>
                    {file ? <p className="mono text-xs text-zinc-500">Selected: {file.name}</p> : null}
                </div>
            </form>

            {successMessage ? (
                <p className="mono mt-4 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                    {successMessage}
                </p>
            ) : null}
        </section>
    );
}
