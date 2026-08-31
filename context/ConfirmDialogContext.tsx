"use client";

// ============================================================
// context/ConfirmDialogContext.tsx — one shared "are you sure?" dialog
// for the whole app, opened on demand via confirm(). Same reasoning as
// AuthModalContext: a WishlistButton rendered on every product card
// (dozens per listing page) must NOT each own a private confirmation
// dialog — that's the exact per-instance <dialog> bloat AuthModal was
// refactored away from. This renders exactly one, reused by any caller.
// ============================================================
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import Dialog from "@/components/Dialog";
import styles from "@/components/RequestDialogs.module.css";

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the confirm button as a destructive (red) action — removing
   * something, not just any confirmation — rather than the default
   * primary blue. */
  destructive?: boolean;
  onConfirm: () => void;
}

interface ConfirmDialogContextValue {
  confirm: (options: ConfirmOptions) => void;
}

const ConfirmDialogContext = createContext<ConfirmDialogContextValue | undefined>(undefined);

const DEFAULT_OPTIONS: ConfirmOptions = {
  title: "Are you sure?",
  message: "",
  onConfirm: () => {},
};

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>(DEFAULT_OPTIONS);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    setOpen(true);
  }, []);

  function handleConfirm() {
    options.onConfirm();
    setOpen(false);
  }

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmDialogContext.Provider value={value}>
      {children}
      <Dialog open={open} onClose={() => setOpen(false)} title={options.title}>
        <p className={styles.readonlyValue}>{options.message}</p>
        <div className={styles.actions}>
          <button type="button" className={styles.secondaryBtn} onClick={() => setOpen(false)}>
            {options.cancelLabel ?? "Cancel"}
          </button>
          <button
            type="button"
            className={options.destructive ? styles.dangerBtn : styles.primaryBtn}
            onClick={handleConfirm}
          >
            {options.confirmLabel ?? "Confirm"}
          </button>
        </div>
      </Dialog>
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirmDialog(): ConfirmDialogContextValue {
  const ctx = useContext(ConfirmDialogContext);
  if (!ctx) throw new Error("useConfirmDialog must be used within a ConfirmDialogProvider");
  return ctx;
}
