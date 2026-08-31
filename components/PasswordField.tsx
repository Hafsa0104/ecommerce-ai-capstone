"use client";

// components/PasswordField.tsx — a password <input> plus a show/hide
// ("eye") toggle button, shared by the two real password fields in the
// app (AuthSplitPage's full-page /sign-in, /sign-up, and AuthModal's
// contextual dialog — see useAuthForm) so the same accessible toggle
// isn't hand-rolled twice with two chances to get the ARIA wrong.
// `inputClassName` takes the caller's own `.input` class (each of those
// two components styles its fields from its own CSS module) — this
// only adds the toggle button and the padding to make room for it, it
// doesn't replace the caller's existing field styling.
import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import styles from "./PasswordField.module.css";

interface PasswordFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  inputClassName: string;
  placeholder?: string;
  ariaInvalid?: boolean;
  ariaDescribedBy?: string;
}

export default function PasswordField({
  id,
  value,
  onChange,
  autoComplete,
  inputClassName,
  placeholder,
  ariaInvalid,
  ariaDescribedBy,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  // A stable id for the live region announcing the toggle's own result
  // (see aria-live paragraph below) — not user-facing text, just a
  // screen-reader confirmation that the state actually changed.
  const statusId = useId();

  return (
    <div className={styles.wrap}>
      <input
        id={id}
        // The one thing this component actually does: swap the native
        // masking on and off. Nothing else about the field (validation,
        // value, autoComplete) changes based on this.
        type={visible ? "text" : "password"}
        className={`${inputClassName} ${styles.input}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        // Inline, not a CSS rule reaching into the caller's own
        // stylesheet: which of two separate, differently-loaded CSS
        // Modules "wins" on a shared class name isn't something to
        // depend on, and this only needs to reserve room for the
        // button regardless of which field it's rendered in.
        style={{ paddingRight: "2.75rem" }}
        aria-invalid={ariaInvalid ? "true" : undefined}
        aria-describedby={ariaDescribedBy ? `${ariaDescribedBy} ${statusId}` : statusId}
      />
      <button
        type="button"
        className={styles.toggleBtn}
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
      >
        {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
      </button>
      {/* Visually hidden — aria-pressed on the button already tells a
          screen reader the toggle's current state on demand, but a
          live region is what actually announces the CHANGE the instant
          it happens, without needing to re-focus the button to hear it. */}
      <span id={statusId} className="sr-only" aria-live="polite">
        {visible ? "Password is visible" : "Password is hidden"}
      </span>
    </div>
  );
}
