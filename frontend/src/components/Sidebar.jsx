import { useMemo, useState } from "react";

function SidebarSectionButton({ active, label, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${active
                ? "border-black bg-black text-white"
                : "border-zinc-300 bg-white text-zinc-800 hover:border-black"
                }`}
        >
            {label}
        </button>
    );
}

export default function Sidebar({
    structure,
    activePage,
    onNavigate,
    filters,
    onSelectFilters,
    onResetFilters,
    user,
    isAuthLoading,
    authError,
    isFirebaseConfigured,
    onLogin,
    onLogout,
}) {
    const [expandedBranches, setExpandedBranches] = useState({});
    const [expandedYears, setExpandedYears] = useState({});
    const [expandedSemesters, setExpandedSemesters] = useState({});
    const [isAuthActionPending, setIsAuthActionPending] = useState(false);

    const branchEntries = useMemo(() => Object.entries(structure || {}), [structure]);

    function toggleExpanded(setter, key) {
        setter((prev) => ({ ...prev, [key]: !prev[key] }));
    }

    function handleBranchSelect(branch) {
        onSelectFilters({ branch, year: "", semester: "", subject: "" });
        onNavigate("explore");
    }

    function handleYearSelect(branch, year) {
        onSelectFilters({ branch, year, semester: "", subject: "" });
        onNavigate("explore");
    }

    function handleSemesterSelect(branch, year, semester) {
        onSelectFilters({ branch, year, semester, subject: "" });
        onNavigate("explore");
    }

    function handleSubjectSelect(branch, year, semester, subject) {
        onSelectFilters({ branch, year, semester, subject });
        onNavigate("explore");
    }

    async function handleLogin() {
        if (!onLogin) {
            return;
        }

        setIsAuthActionPending(true);
        try {
            await onLogin();
        } catch {
            // AuthContext already stores and renders user-facing error messages.
        } finally {
            setIsAuthActionPending(false);
        }
    }

    async function handleLogout() {
        if (!onLogout) {
            return;
        }

        setIsAuthActionPending(true);
        try {
            await onLogout();
        } catch {
            // AuthContext already stores and renders user-facing error messages.
        } finally {
            setIsAuthActionPending(false);
        }
    }

    return (
        <aside className="w-full shrink-0 border-r border-zinc-900/10 bg-white/90 p-4 md:w-[320px] md:p-6">
            <div className="rounded-2xl border border-black bg-black p-4 text-white">
                <div className="flex items-center gap-3">
                    <img
                        src="/studychain-logo.svg"
                        alt="StudyChain logo"
                        className="h-10 w-10 rounded-xl border border-white/20 bg-white object-contain p-1"
                    />
                    <p className="mono text-xs uppercase tracking-[0.18em] text-zinc-300">StudyChain</p>
                </div>
                <p className="mt-2 text-sm text-zinc-200">Free Learning Materials for college students.</p>
            </div>

            <nav className="mt-4 space-y-2">
                <SidebarSectionButton
                    label="Explore"
                    active={activePage === "explore"}
                    onClick={() => onNavigate("explore")}
                />
                <SidebarSectionButton
                    label="Upload"
                    active={activePage === "upload"}
                    onClick={() => onNavigate("upload")}
                />
                <SidebarSectionButton
                    label={user ? "Account" : "Login"}
                    active={activePage === "login"}
                    onClick={() => onNavigate("login")}
                />
                <SidebarSectionButton
                    label="My Uploads"
                    active={activePage === "my-uploads"}
                    onClick={() => onNavigate("my-uploads")}
                />
            </nav>

            <section className="mt-5 rounded-2xl border border-zinc-300 bg-white p-3">
                <h2 className="text-sm font-semibold">Account</h2>

                {!isFirebaseConfigured ? (
                    <p className="mt-2 text-xs text-zinc-600">
                        Add Firebase config in frontend/.env to enable Google login and Firestore sync.
                    </p>
                ) : null}

                {isAuthLoading ? (
                    <p className="mt-2 text-xs text-zinc-600">Checking sign-in session...</p>
                ) : null}

                {user ? (
                    <div className="mt-3 space-y-3">
                        <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                            {user.photoURL ? (
                                <img
                                    src={user.photoURL}
                                    alt={user.name}
                                    className="h-10 w-10 rounded-full border border-zinc-200 object-cover"
                                />
                            ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white text-sm font-semibold text-zinc-700">
                                    {user.name.slice(0, 1).toUpperCase()}
                                </div>
                            )}
                            <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-zinc-900">{user.name}</p>
                                <p className="truncate text-xs text-zinc-600">Signed in</p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleLogout}
                            disabled={isAuthActionPending}
                            className="w-full rounded-lg border border-zinc-400 px-3 py-2 text-sm font-medium text-zinc-800 transition hover:border-black disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isAuthActionPending ? "Signing out..." : "Logout"}
                        </button>
                    </div>
                ) : (
                    <div className="mt-3 space-y-2">
                        <p className="text-xs text-zinc-600">Login to upload notes and like shared material.</p>
                        <button
                            type="button"
                            onClick={handleLogin}
                            disabled={!isFirebaseConfigured || isAuthActionPending || isAuthLoading}
                            className="w-full rounded-lg border border-black bg-black px-3 py-2 text-sm font-medium text-white transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isAuthActionPending ? "Opening Google..." : "Login with Google"}
                        </button>
                    </div>
                )}

                {authError ? <p className="mt-2 text-xs text-red-700">{authError}</p> : null}
            </section>

            <section className="mt-5 rounded-2xl border border-zinc-300 bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold">Academic Navigation</h2>
                    <button
                        type="button"
                        onClick={onResetFilters}
                        className="mono rounded-md border border-zinc-300 px-2 py-1 text-[11px] uppercase tracking-[0.1em] text-zinc-700 hover:border-black"
                    >
                        Clear
                    </button>
                </div>

                <div className="mono mt-2 text-[11px] uppercase tracking-[0.08em] text-zinc-500">
                    Branch → Year → Semester → Subject
                </div>

                {branchEntries.length === 0 ? (
                    <p className="mt-3 text-sm text-zinc-500">Loading structure...</p>
                ) : (
                    <ul className="mt-3 space-y-2 text-sm">
                        {branchEntries.map(([branch, years]) => {
                            const branchKey = `branch:${branch}`;
                            const isBranchOpen = Boolean(expandedBranches[branchKey]);
                            const isBranchActive = filters.branch === branch;

                            return (
                                <li key={branch} className="rounded-xl border border-zinc-300 bg-zinc-50 p-2">
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            className="mono rounded-md border border-zinc-300 px-2 py-1 text-[11px] text-zinc-700"
                                            onClick={() => toggleExpanded(setExpandedBranches, branchKey)}
                                            aria-label={`Toggle ${branch}`}
                                        >
                                            {isBranchOpen ? "-" : "+"}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleBranchSelect(branch)}
                                            className={`w-full rounded-md px-2 py-1 text-left transition ${isBranchActive ? "bg-black text-white" : "hover:bg-zinc-200"
                                                }`}
                                        >
                                            {branch}
                                        </button>
                                    </div>

                                    {isBranchOpen ? (
                                        <ul className="mt-2 space-y-2 pl-3">
                                            {Object.entries(years).map(([year, semesters]) => {
                                                const yearKey = `${branch}:${year}`;
                                                const isYearOpen = Boolean(expandedYears[yearKey]);
                                                const isYearActive =
                                                    filters.branch === branch && filters.year === year;

                                                return (
                                                    <li key={year}>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                className="mono rounded-md border border-zinc-300 px-2 py-1 text-[11px] text-zinc-700"
                                                                onClick={() =>
                                                                    toggleExpanded(setExpandedYears, yearKey)
                                                                }
                                                                aria-label={`Toggle ${year}`}
                                                            >
                                                                {isYearOpen ? "-" : "+"}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleYearSelect(branch, year)}
                                                                className={`w-full rounded-md px-2 py-1 text-left transition ${isYearActive
                                                                    ? "bg-zinc-900 text-white"
                                                                    : "hover:bg-zinc-200"
                                                                    }`}
                                                            >
                                                                {year}
                                                            </button>
                                                        </div>

                                                        {isYearOpen ? (
                                                            <ul className="mt-2 space-y-2 pl-3">
                                                                {Object.entries(semesters).map(
                                                                    ([semester, subjects]) => {
                                                                        const semesterKey =
                                                                            `${branch}:${year}:${semester}`;
                                                                        const isSemesterOpen = Boolean(
                                                                            expandedSemesters[semesterKey]
                                                                        );
                                                                        const isSemesterActive =
                                                                            filters.branch === branch
                                                                            && filters.year === year
                                                                            && filters.semester === semester;

                                                                        return (
                                                                            <li key={semester}>
                                                                                <div className="flex items-center gap-2">
                                                                                    <button
                                                                                        type="button"
                                                                                        className="mono rounded-md border border-zinc-300 px-2 py-1 text-[11px] text-zinc-700"
                                                                                        onClick={() =>
                                                                                            toggleExpanded(
                                                                                                setExpandedSemesters,
                                                                                                semesterKey
                                                                                            )
                                                                                        }
                                                                                        aria-label={`Toggle ${semester}`}
                                                                                    >
                                                                                        {isSemesterOpen ? "-" : "+"}
                                                                                    </button>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() =>
                                                                                            handleSemesterSelect(
                                                                                                branch,
                                                                                                year,
                                                                                                semester
                                                                                            )
                                                                                        }
                                                                                        className={`w-full rounded-md px-2 py-1 text-left transition ${isSemesterActive
                                                                                            ? "bg-zinc-800 text-white"
                                                                                            : "hover:bg-zinc-200"
                                                                                            }`}
                                                                                    >
                                                                                        {semester}
                                                                                    </button>
                                                                                </div>

                                                                                {isSemesterOpen ? (
                                                                                    <ul className="mt-2 space-y-1 pl-3">
                                                                                        {subjects.map((subject) => {
                                                                                            const isSubjectActive =
                                                                                                filters.branch === branch
                                                                                                && filters.year === year
                                                                                                && filters.semester
                                                                                                === semester
                                                                                                && filters.subject
                                                                                                === subject;
                                                                                            return (
                                                                                                <li key={subject}>
                                                                                                    <button
                                                                                                        type="button"
                                                                                                        onClick={() =>
                                                                                                            handleSubjectSelect(
                                                                                                                branch,
                                                                                                                year,
                                                                                                                semester,
                                                                                                                subject
                                                                                                            )
                                                                                                        }
                                                                                                        className={`w-full rounded-md px-2 py-1 text-left text-xs transition ${isSubjectActive
                                                                                                            ? "bg-zinc-700 text-white"
                                                                                                            : "hover:bg-zinc-200"
                                                                                                            }`}
                                                                                                    >
                                                                                                        {subject}
                                                                                                    </button>
                                                                                                </li>
                                                                                            );
                                                                                        })}
                                                                                    </ul>
                                                                                ) : null}
                                                                            </li>
                                                                        );
                                                                    }
                                                                )}
                                                            </ul>
                                                        ) : null}
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    ) : null}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>

            <section className="mt-5 rounded-2xl border border-zinc-300 bg-white p-3">
                <h2 className="text-sm font-semibold">Web3</h2>
                <p className="mt-1 text-xs text-zinc-600">
                    Uploader identity is linked internally and can later map to a wallet for smart-contract CID anchoring.
                </p>
                <p className="mono mt-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-[11px] text-zinc-600">
                    {user ? "Identity linked for uploads and likes." : "Sign in to attach uploads to your identity."}
                </p>
                <button
                    type="button"
                    className="mono mt-3 w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs uppercase tracking-[0.12em] text-zinc-500"
                    disabled
                >
                    MetaMask Integration (Soon)
                </button>
            </section>
        </aside>
    );
}
