"use client";

// components/AuthSplitPage.tsx — the full-page Sign In / Sign Up
// experience (app/sign-in, app/sign-up), split-screen with a switchable
// product showcase on the right. This is a SEPARATE surface from
// AuthModal (the quick contextual dialog opened from a wishlist heart,
// a review's Helpful vote, or checkout) — that one is untouched and
// still handles those in-context flows; this is for anyone who
// navigates here directly. Both ultimately share the same validation/
// submit logic (see hooks/useAuthForm) and the same mock AuthContext —
// there's still no real account backend, see the prototype notice below.
//
// The showcase images are real product photos already in the catalog
// (not invented illustrations). Three ways to change which one shows:
// hovering/clicking a thumbnail, the Previous/Next buttons on the main
// image, or auto-advancing every few seconds when nobody's interacting
// with it — see the effect below for how those three stay out of each
// other's way. Hovering is a genuine PREVIEW, not a selection: the main
// image shows whatever's hovered only while the pointer is there, then
// reverts to the actual selected/auto-advancing image once the pointer
// leaves — see previewIndex/displayIndex below.
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ChevronLeft, ChevronRight, Info, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useAuthForm, type AuthFormMode, type ForgotStage } from "@/hooks/useAuthForm";
import PasswordField from "./PasswordField";
import { getProductsByCategory, isDealProduct } from "@/services/productService";
import { CATEGORY_LABELS } from "@/services/productData";
import type { CategoryKey } from "@/types/product";
import styles from "./AuthSplitPage.module.css";

interface AuthSplitPageProps {
  mode: AuthFormMode;
}

interface ShowcaseItem {
  category: CategoryKey;
  img: string;
}

// A curated handful of categories with strong hero photography — not
// every category, this is a showcase strip, not the full catalog list
// CategoryFlyout already provides elsewhere.
const SHOWCASE: ShowcaseItem[] = [
  { category: "automobiles", img: "/images/automobile/alloy-wheel.webp" },
  { category: "computer-and-tech", img: "/images/tech/laptop.webp" },
  { category: "animal-and-pets", img: "/images/animals/Dog-leash-lifestyle-shot.webp" },
  { category: "sports-and-outdoor", img: "/images/sports/camping-tent.webp" },
  { category: "home-interiors", img: "/images/interior/standing-desk.webp" },
];

// Real, catalog-derived — not a decorative "Sale!" sticker invented for
// this page. Reuses the exact same isDealProduct rule the Deals filter
// and every ProductCard badge already apply, just asked per-category
// instead of per-product. Computed once at module scope (SHOWCASE and
// the catalog are both static, nothing here depends on props/state).
const SHOWCASE_HAS_DEAL: Partial<Record<CategoryKey, boolean>> = Object.fromEntries(
  SHOWCASE.map((item) => [item.category, getProductsByCategory(item.category).some(isDealProduct)])
);

const AUTO_ADVANCE_MS = 5000;

const HEADING: Record<AuthFormMode, string> = {
  "sign-in": "Welcome back",
  "create-account": "Create your account",
};

const SUBTEXT: Record<AuthFormMode, string> = {
  "sign-in": "Sign in to manage your wishlist, track orders, and connect with verified suppliers.",
  "create-account": "Join us to save products, track orders, and connect with verified suppliers.",
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

export default function AuthSplitPage({ mode }: AuthSplitPageProps) {
  const router = useRouter();
  const { isSignedIn, hydrated } = useAuth();
  const [activeIndex, setActiveIndex] = useState(0);
  // The actual committed selection (drives auto-advance, aria-current,
  // roving tabindex, and what the main image reverts to once a hover
  // preview ends) — kept separate from previewIndex below, which is
  // purely a transient "what's the mouse over right now" and never
  // itself the source of truth for anything except which image is
  // painted at this instant.
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [autoAdvancePaused, setAutoAdvancePaused] = useState(false);
  // One ref array — the thumbnail row now renders in exactly one place
  // at every breakpoint (below the showcase image; see .imageThumbRow),
  // not a mobile/tablet "inline in the form" variant plus a separate
  // desktop one.
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);
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
  } = useAuthForm({
    mode,
    onSuccess: () => router.push("/"),
  });

  const nameFieldId = useId();
  const emailFieldId = useId();
  const passwordFieldId = useId();
  const otpFieldId = useId();
  const errorId = useId();

  // An already-signed-in visitor landing on /sign-in or /sign-up
  // directly (bookmark, back button, typed URL) has nothing to do
  // here — send them home instead of showing the form again. Gated on
  // `hydrated` so this only fires once AuthContext has actually read
  // localStorage; replace (not push) so the auth route doesn't linger
  // in history for the back button to return to.
  useEffect(() => {
    if (hydrated && isSignedIn) router.replace("/");
  }, [hydrated, isSignedIn, router]);

  // What's actually painted in the main image right now — the hover
  // preview when there is one, the real selection otherwise. Deliberately
  // NOT what drives aria-current/tabIndex on the thumbnails (those stay
  // on activeIndex, see renderThumbButtons) — a screen reader or
  // keyboard user never sets previewIndex (mouse-only), so their view of
  // "which one is current" should never flicker because of someone else's
  // mouse position, and this is single-user/local state anyway.
  const displayIndex = previewIndex ?? activeIndex;
  const active = SHOWCASE[displayIndex];
  // Real, computed count — not an invented "trusted by X" style stat.
  const activeCount = useMemo(() => getProductsByCategory(active.category).length, [active.category]);

  // Reschedules from whichever change was LAST — manual or automatic —
  // instead of a fixed-interval timer that would fight a shopper who's
  // actively browsing the thumbnails. Paused entirely (not just reset)
  // while the pointer or keyboard focus is anywhere in the carousel —
  // WCAG 2.2.2 (Pause, Stop, Hide) territory for auto-updating content,
  // even for something this decorative.
  useEffect(() => {
    if (autoAdvancePaused) return;
    const t = window.setTimeout(() => {
      setActiveIndex((i) => (i + 1) % SHOWCASE.length);
    }, AUTO_ADVANCE_MS);
    return () => window.clearTimeout(t);
  }, [activeIndex, autoAdvancePaused]);

  function pauseAutoAdvance() {
    setAutoAdvancePaused(true);
  }

  // Also clears any hover preview — this doubles as "the mouse/focus
  // left the thumbnail strip," which is exactly when the main image
  // should stop showing whatever was being previewed and go back to
  // showing the real selection (or wherever auto-advance currently is).
  function resumeAutoAdvance() {
    setAutoAdvancePaused(false);
    setPreviewIndex(null);
  }

  // Wraps — a carousel's Previous/Next is expected to cycle, unlike the
  // thumbnail strip's own arrow-key navigation just below (kept
  // clamped, matching the non-wrapping convention already established
  // for ProductGallery's thumbnails elsewhere in this project — two
  // different controls, each keeping its own established behavior).
  // Clears any hover preview too, for the same reason selectAndFocus
  // does below — once a NEW selection is committed, the main image
  // should reflect that, not a stale preview from wherever the mouse
  // happens to be.
  function goTo(i: number) {
    setActiveIndex(((i % SHOWCASE.length) + SHOWCASE.length) % SHOWCASE.length);
    setPreviewIndex(null);
  }

  // Click/keyboard activation on a thumbnail moves focus together with
  // the selection (same as ProductGallery's own selectAndFocus) —
  // without this, arrow-key navigation would change which image shows
  // while leaving the visible keyboard-focus ring behind on the button
  // that's no longer current. Hover (onMouseEnter, below) deliberately
  // does NOT go through this: moving focus on a plain mouse hover would
  // steal it from wherever a keyboard user actually was — hover only
  // ever sets previewIndex (see renderThumbButtons), never activeIndex.
  function selectAndFocus(i: number) {
    setActiveIndex(i);
    setPreviewIndex(null);
    thumbRefs.current[i]?.focus();
  }

  // Clamped, not wrapped — see the comment on goTo() above for why this
  // control keeps that convention while the new Previous/Next buttons
  // don't.
  function handleThumbKeyDown(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    let next: number;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = Math.min(i + 1, SHOWCASE.length - 1);
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = Math.max(i - 1, 0);
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = SHOWCASE.length - 1;
    else return;
    e.preventDefault();
    selectAndFocus(next);
  }

  function renderThumbButtons() {
    return SHOWCASE.map((item, i) => {
      const hasDeal = SHOWCASE_HAS_DEAL[item.category];
      return (
        <button
          key={item.category}
          ref={(el) => {
            thumbRefs.current[i] = el;
          }}
          type="button"
          className={`${styles.thumbBtn} ${i === activeIndex ? styles.thumbBtnActive : ""}`}
          aria-current={i === activeIndex ? "true" : undefined}
          aria-label={`Preview ${CATEGORY_LABELS[item.category]}${hasDeal ? " — has deals" : ""}`}
          tabIndex={i === activeIndex ? 0 : -1}
          onClick={() => selectAndFocus(i)}
          // A genuine hover PREVIEW, not a selection — sets previewIndex
          // only, never activeIndex, so the main image shows this while
          // hovered and reverts to the real selection the moment the
          // pointer leaves (see resumeAutoAdvance, wired to the row's
          // onMouseLeave below). Gated in spirit to mouse users the same
          // way ProductGallery's own hover-zoom is (no separate media
          // query needed here since onMouseEnter simply never fires from
          // a touch tap). State-only, not selectAndFocus — moving
          // keyboard focus on a plain mouse hover would steal it from
          // wherever a keyboard user actually was.
          onMouseEnter={() => setPreviewIndex(i)}
          onKeyDown={(e) => handleThumbKeyDown(e, i)}
        >
          {/* Clips the photo to a rounded square — NOT .thumbBtn itself
              (see its own comment for why: that would also clip
              .thumbBtn's own ::after underline indicator below, which
              is deliberately positioned outside this box). */}
          <span className={styles.thumbImageClip}>
            <Image src={item.img} alt="" width={56} height={56} className={styles.thumbImage} />
          </span>
          {/* Real signal (SHOWCASE_HAS_DEAL, catalog-derived above), not
              decoration — the color alone isn't the only cue, the
              button's aria-label carries "— has deals" too. */}
          {hasDeal && <span className={styles.dealBadge} aria-hidden="true" title="This category has deals" />}
        </button>
      );
    });
  }

  // Nothing to render while the redirect effect above is about to fire
  // — avoids showing the form for the one tick between hydration
  // confirming "already signed in" and the router actually navigating
  // away.
  if (hydrated && isSignedIn) return null;

  return (
    <div className={styles.page}>
      <div className={styles.formPane}>
        <div className={styles.formInner}>
          <h1 className={styles.heading}>{forgotMode ? FORGOT_HEADING[forgotStage] : HEADING[mode]}</h1>
          <p className={styles.subtext}>
            {forgotMode ? FORGOT_SUBTEXT[forgotStage](email) : SUBTEXT[mode]}
          </p>

          {forgotMode && forgotStage === "verify" && (
            <form onSubmit={handleSendCode} noValidate className={styles.form}>
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
                  placeholder="you@example.com"
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
              <button type="submit" className={styles.submitBtn}>
                Send code
              </button>
            </form>
          )}

          {forgotMode && forgotStage === "code" && (
            <form onSubmit={handleVerifyCode} noValidate className={styles.form}>
              {/* Demo-only, same honest pattern app/profile/page.tsx's
                  phone-verification OTP already uses: there's no real
                  email backend to actually deliver this through, so the
                  code is shown directly rather than pretending it was
                  sent somewhere. */}
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
                  aria-describedby={otpError ? "forgot-otp-error" : undefined}
                />
                {otpError && (
                  <p id="forgot-otp-error" className={styles.authAlert} role="alert">
                    <AlertCircle size={16} aria-hidden="true" className={styles.authAlertIcon} />
                    {otpError}
                  </p>
                )}
              </div>
              <button type="submit" className={styles.submitBtn}>
                Verify code
              </button>
              <p className={styles.switchLink}>
                Didn&apos;t get a code?{" "}
                <button type="button" className={styles.forgotBtn} onClick={resendCode}>
                  Resend code
                </button>
              </p>
            </form>
          )}

          {forgotMode && forgotStage === "reset" && (
            <form onSubmit={handleResetPassword} noValidate className={styles.form}>
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
                  placeholder="••••••••"
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
              <button type="submit" className={styles.submitBtn}>
                Reset password
              </button>
            </form>
          )}

          {!forgotMode && (
            <form onSubmit={handleSubmit} noValidate className={styles.form}>
              {mode === "create-account" && (
                <div className={styles.field}>
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
                    placeholder="Your full name"
                    aria-invalid={invalidField === "name" ? "true" : undefined}
                    aria-describedby={invalidField === "name" ? errorId : undefined}
                  />
                  {/* Rendered right after the field it's actually about,
                      not as one shared block after every input — icon +
                      banner, not a bare line of red text, since this can
                      also carry a whole-form result (an unrecognized
                      email/password pair), not only a one-field nudge. */}
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
                  placeholder="you@example.com"
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
                  {/* Only where it's actionable: signing in (an existing
                      account to reset). Real account creation has
                      nothing yet to forget. */}
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
                  placeholder="••••••••"
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

              <button type="submit" className={styles.submitBtn}>
                {mode === "sign-in" ? "Sign In" : "Create Account"}
              </button>
            </form>
          )}

          <p className={styles.switchLink}>
            {forgotMode ? (
              <button type="button" className={styles.switchLinkBtn} onClick={exitForgotMode}>
                Back to sign in
              </button>
            ) : mode === "sign-in" ? (
              <>
                Don&apos;t have an account? <Link href="/sign-up">Create one</Link>
              </>
            ) : (
              <>
                Already have an account? <Link href="/sign-in">Sign in</Link>
              </>
            )}
          </p>

          <div className={styles.note}>
            <Info size={16} aria-hidden="true" className={styles.noteIcon} />
            <p>
              <strong>Prototype.</strong> No account backend yet — your name, email, and password stay in this
              browser, nothing is sent anywhere. Create an account first, then sign in with that same email and
              password.
            </p>
          </div>
        </div>
      </div>

      {/* The showcase pane — side-by-side with the form only from 64rem
          up; below that (mobile AND tablet) .page stacks these two
          panes instead, so this renders as the second section on the
          page: info/form first, category heading + image second,
          thumbnail row last. Three real, stacked pieces now (heading,
          image, thumbnails) rather than the category name/count being
          overlaid as text on top of the photo — see .showcaseHeader's
          own comment for why. */}
      <div
        className={styles.imagePane}
        onMouseEnter={pauseAutoAdvance}
        onMouseLeave={resumeAutoAdvance}
        onFocus={pauseAutoAdvance}
        onBlur={resumeAutoAdvance}
      >
        {/* A real heading above the image, not text overlaid on the
            photo — plain, high-contrast page content instead of white
            text that needs a glass card and a gradient just to stay
            readable over whatever photo happens to be showing. */}
        <div className={styles.showcaseHeader}>
          <p className={styles.showcaseCategory}>{CATEGORY_LABELS[active.category]}</p>
          <p className={styles.showcaseMeta}>{activeCount} products from verified suppliers</p>
        </div>

        <div className={styles.imageFrame}>
          {/* Decorative: only the photo and its gradient overlay — the
              Explore button below is a SIBLING of this, not nested
              inside it, so it stays in the accessibility tree and tab
              order regardless. */}
          <div aria-hidden="true" className={styles.imageInner}>
            <Image
              key={active.category}
              src={active.img}
              alt=""
              fill
              priority
              // Without `sizes`, next/image assumes this fills the whole
              // viewport width and requests an image sized for that on
              // every device — several times larger than the ~50vw
              // (mobile: 100vw) this pane actually renders at, which is
              // slow on a real connection even though it's invisible on
              // a fast local one. Matches the pane's own width
              // breakpoint.
              sizes="(min-width: 64rem) 50vw, 100vw"
              className={styles.showcaseImage}
            />
            <div className={styles.imageOverlay} />
          </div>

          {/* The category's own listing page, sorted by trending — not
              one specific product. "Explore Automobiles" reads as "see
              everything in this category", so it should land there, not
              on a single item; the trending sort is what surfaces the
              category's real most-ordered products on that page, tying
              back to "trending" without picking just one of them here.
              Glass + raised "3D" button treatment on purpose
              (backdrop-filter is inline here, not in
              AuthSplitPage.module.css — see the comment on .exploreBtn
              there for why Turbopack's CSS pipeline needs that worked
              around). */}
          <Link
            href={`/listing?category=${active.category}&sort=trending`}
            className={styles.exploreBtn}
            style={{ backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}
          >
            Explore {CATEGORY_LABELS[active.category]}
            <ChevronRight size={16} aria-hidden="true" />
          </Link>

          <button
            type="button"
            className={`${styles.carouselBtn} ${styles.carouselBtnPrev}`}
            aria-label="Previous category"
            onClick={() => goTo(activeIndex - 1)}
          >
            <ChevronLeft size={22} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={`${styles.carouselBtn} ${styles.carouselBtnNext}`}
            aria-label="Next category"
            onClick={() => goTo(activeIndex + 1)}
          >
            <ChevronRight size={22} aria-hidden="true" />
          </button>
        </div>

        {/* Below the now-shortened photo, within the same column, at
            every width now (see the pane comment above). Same
            pause/resume-on-hover handlers as the rest of this pane,
            which also clear the hover preview (resumeAutoAdvance) so
            leaving the strip always reverts the main image to the real
            selection. No visible text label (unlike the old inline
            variant's "Explore categories") — this row reads as part of
            the showcase carousel itself, not a separate form-adjacent
            control, so its aria-label alone carries that context for
            assistive tech. */}
        <div
          className={styles.imageThumbRow}
          role="group"
          aria-label="Preview a category"
          onMouseEnter={pauseAutoAdvance}
          onMouseLeave={resumeAutoAdvance}
          onFocus={pauseAutoAdvance}
          onBlur={resumeAutoAdvance}
        >
          {renderThumbButtons()}
        </div>
      </div>
    </div>
  );
}
