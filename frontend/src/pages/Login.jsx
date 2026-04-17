import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function Login({
    user,
    isAuthLoading,
    authError,
    isFirebaseConfigured,
    onLogin,
    onLogout,
    onNavigate,
}) {
    const [isAuthActionPending, setIsAuthActionPending] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const fromPath =
        typeof location.state?.from === "string" && location.state.from !== "/login"
            ? location.state.from
            : "";

    async function handleLogin() {
        if (!onLogin) {
            return;
        }

        setIsAuthActionPending(true);
        try {
            await onLogin();

            // If user was redirected from a protected route, send them back there after sign-in.
            if (fromPath) {
                navigate(fromPath, { replace: true });
            }
        } catch {
            // AuthContext provides a detailed user-facing error.
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
            // AuthContext provides a detailed user-facing error.
        } finally {
            setIsAuthActionPending(false);
        }
    }

    return (
        <section className="space-y-4">
            <header className="rounded-2xl border border-zinc-300 bg-white p-5 md:p-6">
                {/*<p className="mono text-xs uppercase tracking-[0.14em] text-zinc-500">Authentication</p>*/}
                <h2 className="mt-2 text-3xl font-bold tracking-tight">Login</h2>
                {/*<p className="mt-2 text-sm text-zinc-600">
                    Use Google Sign-In to upload notes, like content, and manage your uploads.
                </p>*/}
                {fromPath ? (
                    <p className="mt-2 text-center text-xs text-zinc-500">
                        {/* You need to sign in to continue to <span className="mono">{fromPath}</span>.*/}
                        You need to sign in to continue to upload and like notes.
                    </p>
                ) : null}
            </header>

            {!isFirebaseConfigured ? (
                <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    {/*Firebase is not configured. Add the VITE_FIREBASE_* variables in
                    <span className="mono"> frontend/.env</span> and restart the frontend.*/}
                    try again later.
                </div>
            ) : null}

            {authError ? (
                <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {authError}
                </div>
            ) : null}

            <section className="rounded-2xl border border-zinc-300 bg-white p-5 md:p-6">
                {isAuthLoading ? (
                    <p className="text-sm text-zinc-600">Checking your login session...</p>
                ) : null}

                {!isAuthLoading && !user ? (
                    <div className="space-y-3">
                        <p className="text-sm text-zinc-700">You are currently signed out.</p>
                        <button
                            type="button"
                            onClick={handleLogin}
                            disabled={!isFirebaseConfigured || isAuthActionPending}
                            className="rounded-lg border border-black bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isAuthActionPending ? "Opening Google..." : "Login with Google"}
                        </button>
                    </div>
                ) : null}

                {!isAuthLoading && user ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                            {user.photoURL ? (
                                <img
                                    src={user.photoURL}
                                    alt={user.name}
                                    className="h-12 w-12 rounded-full border border-zinc-200 object-cover"
                                />
                            ) : (
                                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-zinc-200 bg-white text-base font-semibold text-zinc-700">
                                    {user.name.slice(0, 1).toUpperCase()}
                                </div>
                            )}
                            <div className="min-w-0">
                                <p className="truncate text-base font-semibold text-zinc-900">{user.name}</p>
                                <p className="truncate text-sm text-zinc-600">Signed in with Google</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => onNavigate("explore")}
                                className="rounded-lg border border-zinc-400 px-3 py-2 text-sm font-medium text-zinc-800 transition hover:border-black"
                            >
                                Go to Explore
                            </button>
                            <button
                                type="button"
                                onClick={() => onNavigate("upload")}
                                className="rounded-lg border border-zinc-400 px-3 py-2 text-sm font-medium text-zinc-800 transition hover:border-black"
                            >
                                Go to Upload
                            </button>
                            <button
                                type="button"
                                onClick={() => onNavigate("my-uploads")}
                                className="rounded-lg border border-zinc-400 px-3 py-2 text-sm font-medium text-zinc-800 transition hover:border-black"
                            >
                                Go to My Uploads
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={handleLogout}
                            disabled={isAuthActionPending}
                            className="rounded-lg border border-zinc-400 px-4 py-2 text-sm font-medium text-zinc-800 transition hover:border-black disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isAuthActionPending ? "Signing out..." : "Logout"}
                        </button>
                    </div>
                ) : null}
            </section>
        </section>
    );
}
