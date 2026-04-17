import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import Sidebar from "./components/Sidebar";
import { useAuth } from "./context/AuthContext";
import Explore from "./pages/Explore";
import Login from "./pages/Login";
import MyUploads from "./pages/MyUploads";
import PythonProgramming from "./pages/PythonProgramming";
import Upload from "./pages/Upload";
import { fetchStructure, readApiError } from "./services/api";

const PAGE_TO_PATH = {
    explore: "/explore",
    "python-solutions": "/python-solutions",
    upload: "/upload",
    "my-uploads": "/my-uploads",
    login: "/login",
};

function pathToPage(pathname) {
    if (pathname.startsWith("/python-solutions")) {
        return "python-solutions";
    }

    if (pathname.startsWith("/python-programming")) {
        return "python-solutions";
    }

    if (pathname.startsWith("/upload")) {
        return "upload";
    }

    if (pathname.startsWith("/my-uploads")) {
        return "my-uploads";
    }

    if (pathname.startsWith("/login")) {
        return "login";
    }

    return "explore";
}

function RequireAuth({ user, isAuthLoading, children }) {
    const location = useLocation();

    if (isAuthLoading) {
        return (
            <section className="rounded-2xl border border-zinc-300 bg-white p-5 md:p-6">
                <p className="text-sm text-zinc-600">Checking your login session...</p>
            </section>
        );
    }

    if (!user) {
        return (
            <Navigate
                to="/login"
                replace
                state={{ from: location.pathname }}
            />
        );
    }

    return children;
}

export default function App() {
    const [structure, setStructure] = useState({});
    const [structureError, setStructureError] = useState("");
    const [filters, setFilters] = useState({
        branch: "",
        year: "",
        semester: "",
        subject: "",
    });
    const location = useLocation();
    const navigate = useNavigate();
    const activePage = pathToPage(location.pathname);
    const [refreshToken, setRefreshToken] = useState(0);
    const {
        user,
        isAuthLoading,
        authError,
        isFirebaseConfigured,
        loginWithGoogle,
        logout,
    } = useAuth();

    useEffect(() => {
        let active = true;

        async function loadStructure() {
            try {
                const structureResponse = await fetchStructure();

                if (!active) {
                    return;
                }

                setStructure(structureResponse);
                setStructureError("");
            } catch (error) {
                if (!active) {
                    return;
                }

                setStructureError(readApiError(error, "Failed to load academic structure."));
            }
        }

        void loadStructure();

        return () => {
            active = false;
        };
    }, []);

    function handleSelectFilters(nextFilters) {
        setFilters(nextFilters);
    }

    function handleResetFilters() {
        setFilters({
            branch: "",
            year: "",
            semester: "",
            subject: "",
        });
    }

    function handleUploadSuccess() {
        setRefreshToken((value) => value + 1);
        navigate("/explore");
    }

    function handleNavigate(page) {
        const nextPath = PAGE_TO_PATH[page] || "/explore";
        navigate(nextPath);
    }

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_0%_0%,_#ffffff_0%,_#f4f4f3_40%,_#ececeb_100%)] text-zinc-900">
            <div className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col md:flex-row">
                <Sidebar
                    structure={structure}
                    activePage={activePage}
                    onNavigate={handleNavigate}
                    filters={filters}
                    onSelectFilters={handleSelectFilters}
                    onResetFilters={handleResetFilters}
                    user={user}
                    isAuthLoading={isAuthLoading}
                    authError={authError}
                    isFirebaseConfigured={isFirebaseConfigured}
                    onLogin={loginWithGoogle}
                    onLogout={logout}
                />

                <main className="flex-1 p-4 md:p-6 lg:p-8">
                    <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-300 bg-white px-4 py-3">
                        <p className="mono text-xs uppercase tracking-[0.1em] text-zinc-500">
                            Current Filter: {[
                                filters.branch,
                                filters.year,
                                filters.semester,
                                filters.subject,
                            ].filter(Boolean).join(" / ") || "All"}
                        </p>
                    </div>

                    {structureError ? (
                        <div className="mono mb-5 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-xs text-red-700">
                            {structureError}
                        </div>
                    ) : null}

                    {!isFirebaseConfigured ? (
                        <div className="mono mb-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                            Firebase is not configured. Add VITE_FIREBASE_* values to frontend/.env to use
                            Authentication and Firestore.
                        </div>
                    ) : null}

                    {authError ? (
                        <div className="mono mb-5 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-xs text-red-700">
                            {authError}
                        </div>
                    ) : null}

                    <Routes>
                        <Route
                            path="/"
                            element={<Navigate to="/explore" replace />}
                        />
                        <Route
                            path="/explore"
                            element={(
                                <Explore
                                    filters={filters}
                                    refreshToken={refreshToken}
                                    user={user}
                                    onRequestLogin={loginWithGoogle}
                                />
                            )}
                        />
                        <Route
                            path="/python-solutions"
                            element={(
                                <PythonProgramming
                                    user={user}
                                    onRequestLogin={loginWithGoogle}
                                />
                            )}
                        />
                        <Route
                            path="/python-programming"
                            element={<Navigate to="/python-solutions" replace />}
                        />
                        <Route
                            path="/upload"
                            element={(
                                <RequireAuth
                                    user={user}
                                    isAuthLoading={isAuthLoading}
                                >
                                    <Upload
                                        structure={structure}
                                        user={user}
                                        onRequestLogin={loginWithGoogle}
                                        onUploadSuccess={handleUploadSuccess}
                                    />
                                </RequireAuth>
                            )}
                        />
                        <Route
                            path="/my-uploads"
                            element={(
                                <RequireAuth
                                    user={user}
                                    isAuthLoading={isAuthLoading}
                                >
                                    <MyUploads
                                        user={user}
                                        onRequestLogin={loginWithGoogle}
                                        refreshToken={refreshToken}
                                    />
                                </RequireAuth>
                            )}
                        />
                        <Route
                            path="/login"
                            element={(
                                <Login
                                    user={user}
                                    isAuthLoading={isAuthLoading}
                                    authError={authError}
                                    isFirebaseConfigured={isFirebaseConfigured}
                                    onLogin={loginWithGoogle}
                                    onLogout={logout}
                                    onNavigate={handleNavigate}
                                />
                            )}
                        />
                        <Route
                            path="*"
                            element={<Navigate to="/explore" replace />}
                        />
                    </Routes>
                </main>
            </div>
        </div>
    );
}
