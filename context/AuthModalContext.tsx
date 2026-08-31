"use client";

// ============================================================
// context/AuthModalContext.tsx — one shared AuthModal instance for the
// whole app, opened on demand via requestAuth(). Without this, every
// gated control (each review's Helpful button, each ProductCard's
// wishlist heart) would render its own private <AuthModal> — on a
// listing page with a dozen product cards that's a dozen mostly-closed
// <dialog> elements in the DOM for one feature. This renders exactly
// one, provided once here and reused by every consumer via useAuthModal().
// ============================================================
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import AuthModal from "@/components/AuthModal";

interface RequestAuthOptions {
  actionReason?: string;
  allowGuest?: boolean;
  onGuestContinue?: () => void;
}

interface AuthModalContextValue {
  requestAuth: (options?: RequestAuthOptions) => void;
}

const AuthModalContext = createContext<AuthModalContextValue | undefined>(undefined);

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<RequestAuthOptions>({});

  const requestAuth = useCallback((opts: RequestAuthOptions = {}) => {
    setOptions(opts);
    setOpen(true);
  }, []);

  const value = useMemo(() => ({ requestAuth }), [requestAuth]);

  return (
    <AuthModalContext.Provider value={value}>
      {children}
      <AuthModal
        open={open}
        onClose={() => setOpen(false)}
        actionReason={options.actionReason}
        allowGuest={options.allowGuest}
        onGuestContinue={options.onGuestContinue}
      />
    </AuthModalContext.Provider>
  );
}

export function useAuthModal(): AuthModalContextValue {
  const ctx = useContext(AuthModalContext);
  if (!ctx) throw new Error("useAuthModal must be used within an AuthModalProvider");
  return ctx;
}
