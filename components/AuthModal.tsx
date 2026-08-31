"use client";

// components/AuthModal.tsx — the one shared "Sign in / Create account"
// dialog every account-gated action in this app opens: review Helpful
// votes, Wishlist, Checkout. There's no auth backend here (see
// AuthContext) — this collects a name/email/password and records it as
// the mock signed-in identity, entirely in this browser (see
// useAuthForm's own comment on the local "account book" that makes an
// "Incorrect email or password" error real rather than decorative,
// still without ever sending anything anywhere). That's disclosed to
// the user directly in the form, the same honesty this app already
// applies to Cart/Profile/the product-detail request dialogs.
//
// allowGuest controls whether "Continue as Guest" appears — per the
// account-gating rule this app follows, that's offered at Checkout
// (guest checkout is normal) but never for Wishlist/Helpful-votes
// (those are inherently account-specific: there's nowhere else to
// attach them).
//
// Sign In / Create Account is a local `mode` toggle, not two routes —
// there's nothing to navigate to (both render inside this one modal
// instance), so plain <button>s with aria-current are correct here, the
// same "don't fake a widget that isn't real" reasoning this project
// already applies to ProductGallery's thumbnail strip.
import { useId, useState } from "react";
import Link from "next/link";
import { AlertCircle, Info, ShieldCheck } from "lucide-react";
import { useAuthForm, type ForgotStage } from "@/hooks/useAuthForm";
import Dialog from "./Dialog";
import PasswordField from "./PasswordField";
import styles from "./RequestDialogs.module.css";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  /** What the gated action IS, not a full sentence — e.g. "save Headphones to your wishlist"
   * or "mark this review as helpful". Templated per mode below ("Sign in to {actionReason}." /
   * "Create an account to {actionReason}.") so the subtext stays correct whichever tab is
   * active, instead of a caller-supplied sentence that's frozen to whatever mode was showing
   * when it was written. Omit for the generic wishlist-flavored default (DEFAULT_REASON). */
  actionReason?: string;
  allowGuest?: boolean;
  onGuestContinue?: () => void;
}

type Mode = "sign-in" | "create-account";

const HEADING: Record<Mode, string> = {
  "sign-in": "Sign in to your account",
  "create-account": "Create your account",
};

const DEFAULT_REASON: Record<Mode, string> = {
  "sign-in": "Sign in to save products to your wishlist.",
  "create-account": "Create an account to save products to your wishlist.",
};

const REASON_PREFIX: Record<Mode, string> = {
  "sign-in": "Sign in to",
  "create-account": "Create an account to",
};

// Cross-link to the new full-page equivalents (app/sign-in,
// app/sign-up) — a real <Link> to a real route, unlike the Sign In /
// Create Account mode toggle above, which stays plain buttons since
// there's genuinely nowhere for THAT to navigate to.
const PAGE_HREF: Record<Mode, string> = {
  "sign-in": "/sign-in",
  "create-account": "/sign-up",
};

const FORGOT_HEADING: Record<ForgotStage, string> = {
  verify: "Reset your password",
  code: "Enter verification code",
  reset: "Set a new password",
};

// A function per stage (not a plain string) only because "code" needs
// to interpolate the actual email it was sent for.
const FORGOT_SUBTEXT: Record<ForgotStage, (email: string) => string> = {
  verify: () => "Enter the email on your account and we'll send you a verification code.",
  code: (email) => `Enter the 6-digit code${email ? ` sent for ${email}` : ""}.`,
  reset: () => "Choose a new password for this account.",
};

export default function AuthModal({ open, onClose, actionReason, allowGuest = false, onGuestContinue }: AuthModalProps) {
  const [mode, setMode] = useState<Mode>("sign-in");
  const {
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
  } = useAuthForm({ mode, onSuccess: onClose });

  // Switching the Sign In / Create Account tab always leaves forgotMode
  // — there's no "reset password while creating an account" state, and
  // without this a tab switch mid-reset would leave forgotMode true
  // with mode now "create-account", which nothing below expects.
  function selectMode(next: Mode) {
    setMode(next);
    exitForgotMode();
  }

  const nameFieldId = useId();
  const emailFieldId = useId();
  const passwordFieldId = useId();
  const otpFieldId = useId();
  const errorId = useId();

  // Reset to a clean slate during render (React's "adjusting state when
  // a prop changes" pattern — see QuoteRequestDialog for the same
  // technique and why it's not a useEffect) every time this is freshly
  // opened, rather than showing a stale mode/error from a previous visit.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setMode("sign-in");
      reset();
    }
  }

  function handleGuest() {
    onGuestContinue?.();
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={forgotMode ? FORGOT_HEADING[forgotStage] : HEADING[mode]}
      align="center"
      maxHeight="94vh"
    >
      {/* No logo lockup here (there was one) — purely decorative, and
          the Navbar behind this modal already shows one at the top of
          every page; the modal's real accessible name already comes
          from the heading above via Dialog's aria-labelledby. Removed
          mainly to reclaim vertical space: on common phone/short-
          desktop heights this modal needed an internal scroll to reach
          the submit button, and a purely decorative image was the
          first thing to go before trimming any real content. */}
      <p className={styles.authSubtext}>
        {forgotMode
          ? FORGOT_SUBTEXT[forgotStage](email)
          : actionReason
            ? `${REASON_PREFIX[mode]} ${actionReason}.`
            : DEFAULT_REASON[mode]}
      </p>

      {/* The Sign In / Create Account tabs don't apply mid-reset — there's
          only the one thing to do here, and both tabs would otherwise
          silently discard forgotMode (see selectMode) the moment either
          was clicked. */}
      {!forgotMode && (
        <div className={styles.modeTabs} role="group" aria-label="Choose sign in or create account">
          <button
            type="button"
            className={`${styles.modeTab} ${mode === "sign-in" ? styles.modeTabActive : ""}`}
            aria-current={mode === "sign-in" ? "true" : undefined}
            onClick={() => selectMode("sign-in")}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`${styles.modeTab} ${mode === "create-account" ? styles.modeTabActive : ""}`}
            aria-current={mode === "create-account" ? "true" : undefined}
            onClick={() => selectMode("create-account")}
          >
            Create Account
          </button>
        </div>
      )}

      {forgotMode && forgotStage === "verify" && (
        <form onSubmit={handleSendCode} noValidate>
          <div className={styles.field}>
            <label className={styles.label} htmlFor={emailFieldId}>
              Email
            </label>
            <input
              id={emailFieldId}
              type="email"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              aria-invalid={invalidField === "email" ? "true" : undefined}
              aria-describedby={invalidField === "email" ? errorId : undefined}
            />
            {invalidField === "email" && error && (
              <p id={errorId} className={styles.authAlert} role="alert">
                <AlertCircle size={16} aria-hidden="true" className={styles.authAlertIcon} />
                {error}
              </p>
            )}
          </div>
          <button type="submit" className={styles.fullWidthBtn}>
            Send code
          </button>
          <p className={styles.fullPageLink}>
            <button type="button" className={styles.forgotBtn} onClick={exitForgotMode}>
              Back to sign in
            </button>
          </p>
        </form>
      )}

      {forgotMode && forgotStage === "code" && (
        <form onSubmit={handleVerifyCode} noValidate>
          {/* Demo-only, same honest pattern app/profile/page.tsx's
              phone-verification OTP already uses: there's no real email
              backend to actually deliver this through, so the code is
              shown directly rather than pretending it was sent
              somewhere. */}
          <p className={styles.demoOtpBanner} role="status">
            <ShieldCheck size={16} aria-hidden="true" />
            Demo mode — no real email is sent. Your code is: <strong>{otpCode}</strong>
          </p>
          <div className={styles.field}>
            <label className={styles.label} htmlFor={otpFieldId}>
              Verification code
            </label>
            <input
              id={otpFieldId}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              className={styles.input}
              value={otpInput}
              onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
              aria-invalid={otpError ? "true" : undefined}
              aria-describedby={otpError ? "modal-forgot-otp-error" : undefined}
            />
            {otpError && (
              <p id="modal-forgot-otp-error" className={styles.authAlert} role="alert">
                <AlertCircle size={16} aria-hidden="true" className={styles.authAlertIcon} />
                {otpError}
              </p>
            )}
          </div>
          <button type="submit" className={styles.fullWidthBtn}>
            Verify code
          </button>
          <p className={styles.fullPageLink}>
            Didn&apos;t get a code?{" "}
            <button type="button" className={styles.forgotBtn} onClick={resendCode}>
              Resend code
            </button>
          </p>
          <p className={styles.fullPageLink}>
            <button type="button" className={styles.forgotBtn} onClick={exitForgotMode}>
              Back to sign in
            </button>
          </p>
        </form>
      )}

      {forgotMode && forgotStage === "reset" && (
        <form onSubmit={handleResetPassword} noValidate>
          <div className={styles.field}>
            <label className={styles.label} htmlFor={passwordFieldId}>
              New password
            </label>
            <PasswordField
              id={passwordFieldId}
              inputClassName={styles.input}
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              ariaInvalid={invalidField === "password"}
              ariaDescribedBy={invalidField === "password" ? errorId : undefined}
            />
            {invalidField === "password" && error && (
              <p id={errorId} className={styles.authAlert} role="alert">
                <AlertCircle size={16} aria-hidden="true" className={styles.authAlertIcon} />
                {error}
              </p>
            )}
          </div>
          <button type="submit" className={styles.fullWidthBtn}>
            Reset password
          </button>
        </form>
      )}

      {!forgotMode && (
        <form onSubmit={handleSubmit} noValidate>
          {mode === "create-account" && (
            <div className={styles.authField}>
              <label className={styles.label} htmlFor={nameFieldId}>
                Full name
              </label>
              <input
                id={nameFieldId}
                type="text"
                className={styles.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                aria-invalid={invalidField === "name" ? "true" : undefined}
                aria-describedby={invalidField === "name" ? errorId : undefined}
              />
              {/* Rendered right after the field it's actually about,
                  not as one shared block after every input — the same
                  "close to the relevant input" placement AuthSplitPage
                  uses. .authAlert isn't the shared .errorText this same
                  stylesheet gives QuoteRequestDialog/
                  CustomizationRequestDialog's field errors — those are
                  already field-adjacent one-liners; this gets the
                  icon+banner treatment since it can also carry a
                  whole-form result (an unrecognized email/password
                  pair), not only a one-field nudge. */}
              {invalidField === "name" && error && (
                <p id={errorId} className={styles.authAlert} role="alert">
                  <AlertCircle size={16} aria-hidden="true" className={styles.authAlertIcon} />
                  {error}
                </p>
              )}
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.label} htmlFor={emailFieldId}>
              Email
            </label>
            <input
              id={emailFieldId}
              type="email"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              aria-invalid={invalidField === "email" ? "true" : undefined}
              aria-describedby={invalidField === "email" ? errorId : undefined}
            />
            {invalidField === "email" && error && (
              <p id={errorId} className={styles.authAlert} role="alert">
                <AlertCircle size={16} aria-hidden="true" className={styles.authAlertIcon} />
                {error}
              </p>
            )}
          </div>

          <div className={styles.field}>
            <div className={styles.labelRow}>
              <label className={styles.label} htmlFor={passwordFieldId}>
                Password
              </label>
              {mode === "sign-in" && (
                <button type="button" className={styles.forgotBtn} onClick={enterForgotMode}>
                  Forgot password?
                </button>
              )}
            </div>
            <PasswordField
              id={passwordFieldId}
              inputClassName={styles.input}
              value={password}
              onChange={setPassword}
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              ariaInvalid={invalidField === "password"}
              ariaDescribedBy={invalidField === "password" ? errorId : undefined}
            />
            {invalidField === "password" && error && (
              <p id={errorId} className={styles.authAlert} role="alert">
                <AlertCircle size={16} aria-hidden="true" className={styles.authAlertIcon} />
                {error}
              </p>
            )}
          </div>

          <button type="submit" className={styles.fullWidthBtn}>
            {mode === "sign-in" ? "Sign In" : "Create Account"}
          </button>

          {/* Trimmed to two short sentences (was three) — same facts,
              less vertical space, part of fitting this modal on screen
              without scrolling on common phone/short-desktop heights.
              The full-page /sign-in, /sign-up note stays as written;
              this one specifically needed to be shorter. */}
          <div className={styles.noteWithIcon}>
            <Info size={16} aria-hidden="true" className={styles.noteIcon} />
            <p>
              <strong>Prototype.</strong> Stored only in this browser, nothing is sent anywhere. Create an account
              first, then sign in with it.
            </p>
          </div>
        </form>
      )}

      {/* Neither applies mid-reset: guest checkout has nothing to do
          with an existing account's password, and the full-page link
          below would land on the real /sign-in form with none of this
          dialog's own reset progress. */}
      {!forgotMode && (
        <>
          {allowGuest && (
            <>
              <div className={styles.divider} role="presentation">
                or
              </div>
              <button type="button" className={styles.guestBtn} onClick={handleGuest}>
                Continue as Guest
              </button>
            </>
          )}

          <p className={styles.fullPageLink}>
            Prefer a full page?{" "}
            {/* onClick={onClose} — AuthModalProvider (and its `open` state)
                lives at the root layout, so it persists across a route
                change instead of unmounting; without this, the modal would
                still be "open" by that state after landing on /sign-in or
                /sign-up and render on top of the very page it just linked
                to. onClick and the real navigation both fire from one
                click — this isn't a substitute for the href. */}
            <Link href={PAGE_HREF[mode]} onClick={onClose}>
              Go to {mode === "sign-in" ? "Sign In" : "Sign Up"}
            </Link>
          </p>
        </>
      )}
    </Dialog>
  );
}
