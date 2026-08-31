"use client";

// hooks/useAuthForm.ts — the sign-in/create-account validation and
// submit logic, shared between AuthModal (the quick contextual dialog)
// and AuthSplitPage (the new full-page /sign-in, /sign-up routes)
// instead of duplicating the same validation rules in both places. Both
// surfaces ultimately just call AuthContext's signIn() — there's still
// no real account backend (see AuthContext) — this only centralizes the
// form's own behavior.
//
// A lightweight local "account book" (services/authAccountService.ts)
// makes sign-in a real, checkable thing instead of a rule with nothing
// to check against. Only Create Account ever writes a new entry to it
// (via this form) — Sign In only ever READS from it: an email with no
// matching entry, or a password that doesn't match the one on file, is
// rejected. (An earlier version of this let Sign In silently register a
// new account for any never-seen email — that's deliberately gone: Sign
// In authenticates against an existing local "account," it doesn't
// create one.) Same local-only, never-sent-anywhere honesty as the rest
// of this mock auth — see AuthContext's own comment. The account book
// itself lives in that separate service file, not here, because
// app/profile/page.tsx's Edit Profile form needs to read/write the same
// records too (renaming an account's email, updating its name) without
// pulling in this whole sign-in/sign-up form's state machine just to do
// that.
//
// Sign-in failure tells the user exactly which of the two things is
// wrong (no account for that email vs. the right account, wrong
// password) instead of one blended "Invalid email or password." This
// project has no real backend or real accounts to protect — it's an
// explicitly-labeled local prototype (see AuthContext/AuthSplitPage's
// own "Prototype" notice) — so the enumeration risk a real product
// would weigh here doesn't apply, and a demo where a correct email/
// password pair can still get rejected with no indication of why is a
// worse trade to make.
//
// forgotMode (see below) exists for the same reason: a wrong-password
// message alone still leaves someone with no way back in if what
// they're typing genuinely isn't what's on file for that email (a
// stale guess from an earlier visit, a typo the first time they set
// it, etc.) — there's no real email/backend to send a reset link
// through, so resetting it directly is the honest equivalent for a
// local-only prototype. It's still gated behind a one-time code first
// (forgotStage), the same way app/profile/page.tsx's phone-verification
// OTP already is — otherwise "type any email and immediately set a new
// password for it" would let anyone reset an account they don't own
// just by knowing its email, which defeats the point of a password at
// all. This project has no real email/SMS backend (see AuthContext), so
// exactly like that phone OTP, the code is generated locally and shown
// directly on screen — clearly labeled "demo," not pretending to be a
// real delivery this prototype can't actually do.
import { useState, type FormEvent } from "react";
import { useAuth, type AuthUser } from "@/context/AuthContext";
import { EMAIL_RE, loadAccounts, saveAccount } from "@/services/authAccountService";

export type AuthFormMode = "sign-in" | "create-account";
export type AuthInvalidField = "name" | "email" | "password" | null;
/** Which screen of the Forgot-password flow is showing — a step machine,
 * not a boolean, since there are genuinely three different things to
 * ask for in order: the account (email), proof it's really that
 * account's owner (the code), then the actual new password. */
export type ForgotStage = "verify" | "code" | "reset";

interface UseAuthFormOptions {
  mode: AuthFormMode;
  onSuccess?: (user: AuthUser) => void;
}

function generateDemoCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function useAuthForm({ mode, onSuccess }: UseAuthFormOptions) {
  const { signIn } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [invalidField, setInvalidField] = useState<AuthInvalidField>(null);
  // Only meaningful in "sign-in" mode — a lightweight sub-state, not a
  // third AuthFormMode: it reuses the exact same email/password fields
  // (the password field just means "new password" once it's reached)
  // rather than introducing a separate route or a whole new form.
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotStage, setForgotStage] = useState<ForgotStage>("verify");
  // The locally-generated demo code vs. what the user actually typed —
  // kept apart the same way app/profile/page.tsx's phone OTP keeps
  // demoCode/otpInput separate, for the same reason: comparing them is
  // literally the whole check.
  const [otpCode, setOtpCode] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [otpError, setOtpError] = useState("");

  function reset() {
    setName("");
    setEmail("");
    setPassword("");
    setError("");
    setInvalidField(null);
    setForgotMode(false);
    setForgotStage("verify");
    setOtpCode("");
    setOtpInput("");
    setOtpError("");
  }

  // Keeps the current email (there's a good chance it's what the user
  // was already stuck on) and starts at the first stage — a stale
  // "Incorrect password" error from the sign-in attempt that led here
  // shouldn't still be showing once the form itself has changed what
  // it's asking.
  function enterForgotMode() {
    setForgotMode(true);
    setForgotStage("verify");
    setPassword("");
    setOtpCode("");
    setOtpInput("");
    setOtpError("");
    setError("");
    setInvalidField(null);
  }

  function exitForgotMode() {
    setForgotMode(false);
    setForgotStage("verify");
    setPassword("");
    setOtpCode("");
    setOtpInput("");
    setOtpError("");
    setError("");
    setInvalidField(null);
  }

  // Stage 1: confirm which account this is for, and only proceed if it
  // actually exists — generating and "sending" a code for an email with
  // no account would be a tell in itself (whether that email is
  // registered), the same enumeration concern Sign In's own error
  // messages already reason about, so this checks first rather than
  // always showing "code sent."
  function handleSendCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError("Email is required.");
      setInvalidField("email");
      return;
    }
    if (!EMAIL_RE.test(normalizedEmail)) {
      setError("Enter a valid email address.");
      setInvalidField("email");
      return;
    }
    if (!loadAccounts()[normalizedEmail]) {
      setError("No account found for this email.");
      setInvalidField("email");
      return;
    }
    setError("");
    setInvalidField(null);
    setOtpCode(generateDemoCode());
    setOtpInput("");
    setOtpError("");
    setForgotStage("code");
  }

  // A fresh code, same account — for "didn't get it" / "it expired" in
  // spirit, even though nothing here can actually expire. Doesn't
  // re-validate the email (stage 1 already did) or touch forgotStage.
  function resendCode() {
    setOtpCode(generateDemoCode());
    setOtpInput("");
    setOtpError("");
  }

  // Stage 2: the actual proof-of-ownership check — this is what makes
  // stage 3 safe to let overwrite a password.
  function handleVerifyCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (otpInput.trim() !== otpCode) {
      setOtpError("Incorrect code. Please try again.");
      return;
    }
    setOtpError("");
    setForgotStage("reset");
  }

  // Stage 3: only reachable after stage 2 actually verified the code —
  // re-checks the account still exists (belt-and-suspenders; nothing in
  // this flow can remove it between stages, but never assume) rather
  // than trusting forgotStage alone to have gotten here honestly.
  function handleResetPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();
    if (!normalizedPassword) {
      setError("Password is required.");
      setInvalidField("password");
      return;
    }
    if (normalizedPassword.length < 4) {
      setError("Password must be at least 4 characters.");
      setInvalidField("password");
      return;
    }
    const existing = loadAccounts()[normalizedEmail];
    if (!existing) {
      setError("No account found for this email.");
      setInvalidField("email");
      setForgotStage("verify");
      return;
    }
    setError("");
    setInvalidField(null);
    // Overwrites the stored password only — the account's name is
    // untouched, and this still never leaves the browser (same
    // saveAccount as Create Account uses).
    saveAccount(normalizedEmail, { name: existing.name, password: normalizedPassword });
    setForgotMode(false);
    setForgotStage("verify");
    const user: AuthUser = { name: existing.name, email: normalizedEmail };
    signIn(user);
    onSuccess?.(user);
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    // Leading/trailing whitespace here is never intentional — it's
    // autofill or a stray copy-paste space, and comparing against it
    // raw would silently reject an objectively-correct password
    // (typed identically both times) with no way for the user to tell
    // why. Email already gets the same treatment above.
    const normalizedPassword = password.trim();

    // Each required-but-empty field gets its own "X is required." —
    // distinct from the format/strength messages below, which only
    // apply once something's actually been typed. Checked in field
    // order (name, email, password) so whichever's wrong first is what
    // gets reported, matching how the fields read top to bottom.
    if (mode === "create-account" && !name.trim()) {
      setError("Full name is required.");
      setInvalidField("name");
      return;
    }
    if (!normalizedEmail) {
      setError("Email is required.");
      setInvalidField("email");
      return;
    }
    if (!EMAIL_RE.test(normalizedEmail)) {
      setError("Enter a valid email address.");
      setInvalidField("email");
      return;
    }
    if (!normalizedPassword) {
      setError("Password is required.");
      setInvalidField("password");
      return;
    }
    if (normalizedPassword.length < 4) {
      setError("Password must be at least 4 characters.");
      setInvalidField("password");
      return;
    }

    const accounts = loadAccounts();
    const existing = accounts[normalizedEmail];

    if (mode === "create-account") {
      if (existing) {
        setError("An account with this email already exists — sign in instead.");
        setInvalidField("email");
        return;
      }
      setError("");
      setInvalidField(null);
      saveAccount(normalizedEmail, { name: name.trim(), password: normalizedPassword });
      // Frontend prototype only — no request is made anywhere; this
      // just records the mock identity locally (see AuthContext).
      const user: AuthUser = { name: name.trim(), email: normalizedEmail };
      signIn(user);
      onSuccess?.(user);
      return;
    }

    // Sign in only ever authenticates against an account Create Account
    // already made — it never creates one. The two ways that can fail
    // are genuinely different problems for the user (no account yet vs.
    // an account that exists but doesn't match this password), so they
    // get distinct messages instead of one blended "Invalid email or
    // password" — see the file-level comment above for why that trade
    // is fine here.
    if (!existing) {
      setError("No account found for this email. Create one below to get started.");
      setInvalidField("email");
      return;
    }
    if (existing.password !== normalizedPassword) {
      setError("Incorrect password for this account. Please try again, or use Forgot password? below.");
      setInvalidField("password");
      return;
    }
    setError("");
    setInvalidField(null);
    const user: AuthUser = { name: existing.name, email: normalizedEmail };
    signIn(user);
    onSuccess?.(user);
  }

  return {
    name,
    setName,
    email,
    setEmail,
    password,
    setPassword,
    error,
    invalidField,
    forgotMode,
    forgotStage,
    enterForgotMode,
    exitForgotMode,
    handleSendCode,
    resendCode,
    otpInput,
    setOtpInput,
    otpCode,
    otpError,
    handleVerifyCode,
    handleResetPassword,
    handleSubmit,
    reset,
  };
}
