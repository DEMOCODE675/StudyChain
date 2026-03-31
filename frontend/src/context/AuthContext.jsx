import {
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { auth, googleProvider, isFirebaseConfigured } from "../services/firebase";

const AuthContext = createContext(undefined);

function mapAuthUser(firebaseUser) {
  if (!firebaseUser) {
    return null;
  }

  return {
    uid: firebaseUser.uid,
    name: firebaseUser.displayName || "Student",
    email: firebaseUser.email || "",
    photoURL: firebaseUser.photoURL || "",
  };
}

function readAuthError(error, fallback) {
  const code = String(error?.code || "");

  if (code.includes("popup-closed-by-user")) {
    return "Google sign-in popup was closed before authentication completed.";
  }

  if (code.includes("popup-blocked")) {
    return "Popup was blocked. Please allow popups and try again.";
  }

  if (code.includes("unauthorized-domain")) {
    return "This domain is not authorized in Firebase Authentication settings.";
  }

  return String(error?.message || fallback);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setIsAuthLoading(false);
      return undefined;
    }

    let active = true;
    let unsubscribe = () => {};

    async function initializeAuth() {
      try {
        await setPersistence(auth, browserLocalPersistence);
      } catch (error) {
        if (active) {
          setAuthError(readAuthError(error, "Failed to initialize auth session."));
        }
      }

      unsubscribe = onAuthStateChanged(auth, (nextUser) => {
        if (!active) {
          return;
        }

        setUser(mapAuthUser(nextUser));
        setIsAuthLoading(false);
      });
    }

    void initializeAuth();

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  async function loginWithGoogle() {
    if (!isFirebaseConfigured || !auth) {
      const message =
        "Firebase is not configured. Add VITE_FIREBASE_* values in frontend/.env.";
      setAuthError(message);
      throw new Error(message);
    }

    setAuthError("");
    await signInWithPopup(auth, googleProvider).catch((error) => {
      const message = readAuthError(error, "Google sign-in failed.");
      setAuthError(message);
      throw new Error(message);
    });
  }

  async function logout() {
    if (!auth) {
      return;
    }

    setAuthError("");
    await signOut(auth).catch((error) => {
      const message = readAuthError(error, "Logout failed.");
      setAuthError(message);
      throw new Error(message);
    });
  }

  const value = useMemo(
    () => ({
      user,
      isAuthLoading,
      authError,
      isFirebaseConfigured,
      loginWithGoogle,
      logout,
    }),
    [user, isAuthLoading, authError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
