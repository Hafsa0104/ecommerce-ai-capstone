"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

interface UseDisclosureResult {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  close: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
  panelRef: RefObject<HTMLDivElement | null>;
}

/**
 * Shared behavior for header dropdowns (category flyout, deliver-to,
 * language selector): Escape closes and returns focus to the trigger,
 * clicking outside closes without moving focus, and the trigger ref
 * is exposed so callers can wire aria-expanded/aria-controls.
 */
export function useDisclosure(): UseDisclosureResult {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  function close() {
    setOpen(false);
  }

  function toggle() {
    setOpen((o) => !o);
  }

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    function handlePointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [open]);

  return { open, setOpen, toggle, close, triggerRef, panelRef };
}
