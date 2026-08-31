"use client";

// ============================================================
// context/AuthContext.tsx — mock sign-in state, persisted to
// localStorage (same pattern as CartContext/Profile). This project
// deliberately has no auth backend (see app/profile/page.tsx's own
// comment) — signing in here just records a name/email locally, the
// same "demo account" honesty the rest of the app already uses. It
// exists so account-gated actions (review "Helpful" votes, Wishlist,
// Checkout) have one shared, real signed-in/signed-out state to check,
// instead of each feature inventing its own.
// ============================================================
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export interface AuthUser {
  name: string;
  email: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isSignedIn: boolean;
  hydrated: boolean;
  signIn: (user: AuthUser) => void;
  signOut: () => void;
  /** Updates the signed-in identity in place (name and/or email) without
   * a full sign-in — what Edit Profile calls after it's already synced
   * the same change to the credential book (see authAccountService and
   * app/profile/page.tsx's handleSaveProfile). Separate from signIn:
   * that name implies authenticating against a stored account, which
   * this deliberately doesn't do — the caller already knows who's
   * signed in and is only correcting their on-record name/email. */
  updateUser: (next: AuthUser) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const STORAGE_KEY = "auth-user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setUser(JSON.parse(raw));
    } catch {
      // Corrupt or inaccessible storage — start signed out.
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (user) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    else window.localStorage.removeItem(STORAGE_KEY);
  }, [user, hydrated]);

  const signIn = useCallback((next: AuthUser) => setUser(next), []);
  const signOut = useCallback(() => setUser(null), []);
  // Same setter as signIn — the distinction is in the two functions'
  // names/intent for callers, not in what they actually do to state;
  // the localStorage sync effect above already persists whichever one
  // was called, identically.
  const updateUser = useCallback((next: AuthUser) => setUser(next), []);

  const value = useMemo(
    () => ({ user, isSignedIn: user !== null, hydrated, signIn, signOut, updateUser }),
    [user, hydrated, signIn, signOut, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
