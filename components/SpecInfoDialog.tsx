"use client";

// components/SpecInfoDialog.tsx — small reusable "View X terms" trigger
// + informational Dialog. Used twice on the product-detail page
// (Warranty, Protection) instead of writing two near-identical modal
// components: both are the same shape — a button that opens a Dialog
// containing a couple of cautiously-worded paragraphs and a Close
// button, no form, no state beyond open/closed.
import { useState, type ReactNode } from "react";
import { Info } from "lucide-react";
import Dialog from "./Dialog";
import styles from "./RequestDialogs.module.css";

interface SpecInfoDialogProps {
  triggerLabel: string;
  title: string;
  children: ReactNode;
}

export default function SpecInfoDialog({ triggerLabel, title, children }: SpecInfoDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className={styles.infoTrigger} onClick={() => setOpen(true)}>
        <Info size={14} aria-hidden="true" />
        {triggerLabel}
      </button>

      <Dialog open={open} onClose={() => setOpen(false)} title={title}>
        <div className={styles.infoBody}>{children}</div>
        <div className={styles.actions}>
          <button type="button" className={styles.primaryBtn} onClick={() => setOpen(false)}>
            Close
          </button>
        </div>
      </Dialog>
    </>
  );
}
