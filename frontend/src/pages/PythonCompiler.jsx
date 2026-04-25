import { useCallback, useEffect, useMemo, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { EditorView } from "@codemirror/view";
import { githubDark, githubLight } from "@uiw/codemirror-theme-github";
import { indentationMarkers } from "@replit/codemirror-indentation-markers";
import { useNavigate } from "react-router-dom";

const PYODIDE_VERSION = "0.26.4";
const PYODIDE_INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
const PYODIDE_SCRIPT_URL = `${PYODIDE_INDEX_URL}pyodide.js`;

const DEFAULT_CODE = `print("Hello from StudyChain Python Compiler")
name = "Student"
print("Welcome,", name)
`;

const STORAGE_KEY_CODE = "studychain.pythonCompiler.code.v1";
const STORAGE_KEY_INPUT = "studychain.pythonCompiler.input.v1";
const STORAGE_KEY_LAST_SAVED_AT = "studychain.pythonCompiler.lastSavedAt.v1";

const STARTER_SNIPPETS = [
    {
        id: "hello",
        label: "Hello + Variables",
        code: DEFAULT_CODE,
        input: "",
    },
    {
        id: "sum-two-numbers",
        label: "Read Two Numbers",
        code: `first = int(input("First number: "))
second = int(input("Second number: "))
print("Sum:", first + second)
`,
        input: "12\n30",
    },
    {
        id: "list-squares",
        label: "List Squares",
        code: `count = int(input("How many values? "))
numbers = []
for _ in range(count):
    numbers.append(int(input()))

squares = [value * value for value in numbers]
print("Squares:", squares)
`,
        input: "4\n2\n3\n5\n7",
    },
];

let pyodideScriptPromise;
let pyodideInstancePromise;

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

function getEditorHeight(code, isMobileViewport) {
    const lines = getCodeLineCount(code);
    const estimated = lines * 22 + 60;
    const minHeight = isMobileViewport ? 300 : 260;
    const maxHeight = isMobileViewport ? 680 : 520;
    return `${Math.min(maxHeight, Math.max(minHeight, estimated))}px`;
}

function formatClockTime(value) {
    if (!value) {
        return "Never";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "Never";
    }

    return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });
}

async function loadPyodideScript() {
    if (typeof window === "undefined") {
        throw new Error("Python runtime is available only in browser.");
    }

    if (typeof window.loadPyodide === "function") {
        return;
    }

    if (!pyodideScriptPromise) {
        pyodideScriptPromise = new Promise((resolve, reject) => {
            const existing = document.querySelector("script[data-pyodide-loader='true']");

            if (existing) {
                if (typeof window.loadPyodide === "function") {
                    resolve();
                    return;
                }

                existing.addEventListener("load", () => resolve(), { once: true });
                existing.addEventListener(
                    "error",
                    () => reject(new Error("Failed to load Python runtime script.")),
                    { once: true }
                );
                return;
            }

            const script = document.createElement("script");
            script.src = PYODIDE_SCRIPT_URL;
            script.async = true;
            script.dataset.pyodideLoader = "true";
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Failed to load Python runtime script."));
            document.body.appendChild(script);
        }).catch((error) => {
            pyodideScriptPromise = undefined;
            throw error;
        });
    }

    await pyodideScriptPromise;
}

async function loadPyodideRuntime() {
    if (!pyodideInstancePromise) {
        pyodideInstancePromise = (async () => {
            await loadPyodideScript();
            if (typeof window.loadPyodide !== "function") {
                throw new Error("Python runtime loader is unavailable.");
            }

            return window.loadPyodide({
                indexURL: PYODIDE_INDEX_URL,
            });
        })().catch((error) => {
            pyodideInstancePromise = undefined;
            throw error;
        });
    }

    return pyodideInstancePromise;
}

function getProxyValue(proxy) {
    if (proxy == null) {
        return "";
    }

    const value = String(proxy);
    if (typeof proxy.destroy === "function") {
        proxy.destroy();
    }
    return value;
}

export default function PythonCompiler() {
    const navigate = useNavigate();
    const [code, setCode] = useState(DEFAULT_CODE);
    const [stdinValue, setStdinValue] = useState("");
    const [output, setOutput] = useState("Preparing Python runtime...");
    const [runtimeError, setRuntimeError] = useState("");
    const [isRuntimeLoading, setIsRuntimeLoading] = useState(true);
    const [isRunning, setIsRunning] = useState(false);
    const [isMobileViewport, setIsMobileViewport] = useState(getIsMobileViewport);
    const [lastSavedAt, setLastSavedAt] = useState(null);
    const [lastRunDurationMs, setLastRunDurationMs] = useState(null);
    const [selectedSnippetId, setSelectedSnippetId] = useState(STARTER_SNIPPETS[0].id);
    const [isOutputCopied, setIsOutputCopied] = useState(false);
    const [hasRestoredDraft, setHasRestoredDraft] = useState(false);

    const compilerExtensions = useMemo(() => {
        const extensions = [
            python(),
            indentationMarkers({
                highlightActiveBlock: true,
                markerType: "fullScope",
                hideFirstIndent: false,
            }),
        ];

        if (isMobileViewport) {
            extensions.push(EditorView.lineWrapping);
        }

        return extensions;
    }, [isMobileViewport]);

    const editorHeight = useMemo(
        () => getEditorHeight(code, isMobileViewport),
        [code, isMobileViewport]
    );

    const runtimeStatusLabel = useMemo(() => {
        if (isRuntimeLoading) {
            return "Loading Runtime";
        }

        if (isRunning) {
            return "Running";
        }

        if (runtimeError) {
            return "Runtime Error";
        }

        return "Ready";
    }, [isRuntimeLoading, isRunning, runtimeError]);

    const runtimeStatusClass = useMemo(() => {
        if (isRuntimeLoading) {
            return "border-blue-300 bg-blue-50 text-blue-700";
        }

        if (isRunning) {
            return "border-amber-300 bg-amber-50 text-amber-700";
        }

        if (runtimeError) {
            return "border-rose-300 bg-rose-50 text-rose-700";
        }

        return "border-emerald-300 bg-emerald-50 text-emerald-700";
    }, [isRuntimeLoading, isRunning, runtimeError]);

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        try {
            const savedCode = window.localStorage.getItem(STORAGE_KEY_CODE);
            const savedInput = window.localStorage.getItem(STORAGE_KEY_INPUT);
            const savedTimestamp = window.localStorage.getItem(STORAGE_KEY_LAST_SAVED_AT);
            let restoredAnyDraft = false;

            if (savedCode !== null) {
                setCode(savedCode);
                restoredAnyDraft = true;
            }

            if (savedInput !== null) {
                setStdinValue(savedInput);
                restoredAnyDraft = true;
            }

            if (savedTimestamp) {
                const numericTimestamp = Number(savedTimestamp);
                if (Number.isFinite(numericTimestamp) && numericTimestamp > 0) {
                    setLastSavedAt(numericTimestamp);
                }
            }

            if (restoredAnyDraft) {
                setHasRestoredDraft(true);
            }
        } catch {
            // Ignore browser storage access issues.
        }
    }, []);

    useEffect(() => {
        let active = true;

        async function prepareRuntime() {
            setIsRuntimeLoading(true);
            setRuntimeError("");

            try {
                await loadPyodideRuntime();
                if (!active) {
                    return;
                }
                setOutput("Runtime ready. Write Python code and click Run Python.");
            } catch (error) {
                if (!active) {
                    return;
                }
                setRuntimeError(error?.message || "Failed to load Python runtime.");
                setOutput("Runtime failed to load. Check internet connection and try again.");
            } finally {
                if (active) {
                    setIsRuntimeLoading(false);
                }
            }
        }

        void prepareRuntime();

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
        if (typeof window === "undefined") {
            return undefined;
        }

        const timer = window.setTimeout(() => {
            try {
                window.localStorage.setItem(STORAGE_KEY_CODE, code);
                window.localStorage.setItem(STORAGE_KEY_INPUT, stdinValue);
                const timestamp = Date.now();
                window.localStorage.setItem(STORAGE_KEY_LAST_SAVED_AT, String(timestamp));
                setLastSavedAt(timestamp);
            } catch {
                // Ignore browser storage access issues.
            }
        }, 350);

        return () => {
            window.clearTimeout(timer);
        };
    }, [code, stdinValue]);

    useEffect(() => {
        if (!isOutputCopied) {
            return undefined;
        }

        const timer = setTimeout(() => {
            setIsOutputCopied(false);
        }, 1200);

        return () => {
            clearTimeout(timer);
        };
    }, [isOutputCopied]);

    const runCode = useCallback(async () => {
        if (!code.trim()) {
            setOutput("Please write Python code before running.");
            return;
        }

        setIsRunning(true);
        setRuntimeError("");
        const runStartTime = typeof performance !== "undefined"
            ? performance.now()
            : Date.now();

        try {
            const pyodide = await loadPyodideRuntime();
            const inputLines = stdinValue
                ? stdinValue.split(/\r\n|\r|\n/)
                : [];

            await pyodide.runPythonAsync(`
import builtins
import io
import sys
import traceback

__studychain_source = ${JSON.stringify(code)}
__studychain_input_lines = ${JSON.stringify(inputLines)}
__studychain_input_iter = iter(__studychain_input_lines)

__studychain_result_stdout = ""
__studychain_result_stderr = ""
__studychain_result_traceback = ""

def __studychain_input(prompt=""):
    if prompt:
        print(prompt, end="")
    try:
        return next(__studychain_input_iter)
    except StopIteration:
        raise EOFError("No more input provided.")

__studychain_prev_stdout = sys.stdout
__studychain_prev_stderr = sys.stderr
__studychain_prev_input = builtins.input
__studychain_stdout = io.StringIO()
__studychain_stderr = io.StringIO()

try:
    sys.stdout = __studychain_stdout
    sys.stderr = __studychain_stderr
    builtins.input = __studychain_input
    exec(__studychain_source, {})
except Exception:
    __studychain_result_traceback = traceback.format_exc()
finally:
    sys.stdout = __studychain_prev_stdout
    sys.stderr = __studychain_prev_stderr
    builtins.input = __studychain_prev_input
    __studychain_result_stdout = __studychain_stdout.getvalue()
    __studychain_result_stderr = __studychain_stderr.getvalue()
`);

            const stdout = getProxyValue(pyodide.globals.get("__studychain_result_stdout"));
            const stderr = getProxyValue(pyodide.globals.get("__studychain_result_stderr"));
            const tracebackText = getProxyValue(pyodide.globals.get("__studychain_result_traceback"));

            const mergedOutput = [stdout, stderr, tracebackText]
                .map((chunk) => chunk.trim())
                .filter(Boolean)
                .join("\n\n");

            setOutput(mergedOutput || "Program finished with no output.");
            const runEndTime = typeof performance !== "undefined"
                ? performance.now()
                : Date.now();
            setLastRunDurationMs(Math.max(0, runEndTime - runStartTime));
        } catch (error) {
            const message = error?.message || "Failed to execute code.";
            setRuntimeError(message);
            setOutput(`Runtime error:\n${message}`);
        } finally {
            setIsRunning(false);
        }
    }, [code, stdinValue]);

    useEffect(() => {
        if (typeof window === "undefined") {
            return undefined;
        }

        const handleKeyDown = (event) => {
            if (!(event.metaKey || event.ctrlKey) || event.key !== "Enter") {
                return;
            }

            if (isRuntimeLoading || isRunning) {
                return;
            }

            event.preventDefault();
            void runCode();
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [isRuntimeLoading, isRunning, runCode]);

    function handleSnippetChange(event) {
        const snippetId = event.target.value;
        setSelectedSnippetId(snippetId);

        const snippet = STARTER_SNIPPETS.find((item) => item.id === snippetId);
        if (!snippet) {
            return;
        }

        setCode(snippet.code);
        setStdinValue(snippet.input || "");
        setRuntimeError("");
        setOutput(`Loaded template: ${snippet.label}`);
    }

    async function handleCopyOutput() {
        if (!navigator?.clipboard?.writeText) {
            return;
        }

        try {
            await navigator.clipboard.writeText(output || "");
            setIsOutputCopied(true);
        } catch {
            setRuntimeError("Could not copy output to clipboard.");
        }
    }

    return (
        <section className="space-y-5">
            <header className="relative overflow-hidden rounded-2xl border border-zinc-300 bg-[linear-gradient(145deg,_#ffffff_0%,_#eef7ff_45%,_#dbeeff_100%)] p-5 md:p-6">
                <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full border border-cyan-200 bg-cyan-100/60" />
                <div className="absolute -left-8 bottom-0 h-20 w-20 rounded-full border border-blue-200 bg-blue-100/55" />
                <div className="relative">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight">Python Compiler</h2>
                            <p className="mt-2 max-w-3xl text-sm text-zinc-700">
                                Run Python code directly in your browser and see output instantly.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => navigate("/python-solutions")}
                            className="mono rounded-lg border border-black px-3 py-2 text-[11px] uppercase tracking-[0.1em] text-zinc-800 transition hover:bg-black hover:text-white"
                        >
                            {"<- Back to Solutions"}
                        </button>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span className={`mono rounded-md border px-2 py-1 text-[11px] uppercase tracking-[0.08em] ${runtimeStatusClass}`}>
                            {runtimeStatusLabel}
                        </span>
                        <span className="mono rounded-md border border-zinc-300 bg-white/75 px-2 py-1 text-[11px] uppercase tracking-[0.08em] text-zinc-600">
                            Auto-saved: {formatClockTime(lastSavedAt)}
                        </span>
                        <span className="mono rounded-md border border-zinc-300 bg-white/75 px-2 py-1 text-[11px] uppercase tracking-[0.08em] text-zinc-600">
                            Shortcut: Ctrl/Cmd + Enter
                        </span>
                    </div>
                </div>
            </header>

            {hasRestoredDraft ? (
                <div className="mono flex flex-wrap items-center justify-between gap-2 rounded-xl border border-sky-300 bg-sky-50 px-4 py-3 text-xs text-sky-700">
                    <span>Draft restored from your last visit.</span>
                    <button
                        type="button"
                        onClick={() => setHasRestoredDraft(false)}
                        className="rounded-md border border-sky-300 px-2 py-1 text-[11px] uppercase tracking-[0.08em] transition hover:border-sky-600"
                    >
                        Dismiss
                    </button>
                </div>
            ) : null}

            {runtimeError ? (
                <div className="mono rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                    {runtimeError}
                </div>
            ) : null}

            <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
                <section className="rounded-2xl border border-zinc-300 bg-white p-5 md:p-6">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-xl font-semibold">Write Python Code</h3>
                        <span className="mono rounded-md border border-zinc-300 px-2 py-1 text-[11px] uppercase tracking-[0.08em] text-zinc-600">
                            Browser Runtime
                        </span>
                    </div>

                    <label className="block text-sm font-medium text-zinc-700">
                        Quick templates
                        <select
                            value={selectedSnippetId}
                            onChange={handleSnippetChange}
                            className="mono mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
                        >
                            {STARTER_SNIPPETS.map((snippet) => (
                                <option key={snippet.id} value={snippet.id}>
                                    {snippet.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <div className="-mx-2 mt-3 max-w-full overflow-x-auto rounded-lg border border-zinc-300 sm:mx-0">
                        <CodeMirror
                            value={code}
                            height={editorHeight}
                            theme={githubLight}
                            extensions={compilerExtensions}
                            onChange={(value) => setCode(value)}
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

                    <label className="mt-4 block text-sm font-medium text-zinc-700">
                        Input (optional, one line per input())
                        <textarea
                            value={stdinValue}
                            onChange={(event) => setStdinValue(event.target.value)}
                            rows={4}
                            placeholder="If your code uses input(), provide values here."
                            className="mono mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
                        />
                    </label>

                    <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap sm:items-center">
                        <button
                            type="button"
                            onClick={() => {
                                void runCode();
                            }}
                            disabled={isRunning || isRuntimeLoading}
                            className="mono w-full rounded-lg border border-black bg-black px-4 py-2 text-[11px] uppercase tracking-[0.08em] text-white transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                        >
                            {isRunning ? "Running..." : "Run Python"}
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setOutput("");
                                setRuntimeError("");
                            }}
                            className="mono w-full rounded-lg border border-zinc-300 px-4 py-2 text-[11px] uppercase tracking-[0.08em] text-zinc-700 transition hover:border-black sm:w-auto"
                        >
                            Clear Output
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setSelectedSnippetId(STARTER_SNIPPETS[0].id);
                                setCode(DEFAULT_CODE);
                                setStdinValue("");
                                setRuntimeError("");
                            }}
                            className="mono w-full rounded-lg border border-zinc-300 px-4 py-2 text-[11px] uppercase tracking-[0.08em] text-zinc-700 transition hover:border-black sm:w-auto"
                        >
                            Reset Code
                        </button>

                        <span className="mono text-[11px] uppercase tracking-[0.08em] text-zinc-500 sm:ml-auto">
                            {getCodeLineCount(code)} line(s)
                        </span>
                    </div>
                </section>

                <section className="rounded-2xl border border-zinc-300 bg-white p-5 md:p-6">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-xl font-semibold">Output</h3>
                        <div className="flex flex-wrap items-center gap-2">
                            {lastRunDurationMs !== null ? (
                                <span className="mono rounded-md border border-zinc-300 px-2 py-1 text-[11px] uppercase tracking-[0.08em] text-zinc-600">
                                    Last run: {(lastRunDurationMs / 1000).toFixed(2)}s
                                </span>
                            ) : null}
                            <button
                                type="button"
                                onClick={() => {
                                    void handleCopyOutput();
                                }}
                                disabled={!output}
                                className="mono rounded-md border border-zinc-300 px-2 py-1 text-[11px] uppercase tracking-[0.08em] text-zinc-700 transition hover:border-black disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isOutputCopied ? "Copied" : "Copy Output"}
                            </button>
                        </div>
                    </div>

                    <div className="min-h-[260px] rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-zinc-100">
                        <pre className="mono max-h-[540px] overflow-auto whitespace-pre-wrap break-words text-xs leading-relaxed sm:text-sm">
                            {output || "Output will appear here."}
                        </pre>
                    </div>
                </section>
            </div>
        </section>
    );
}
