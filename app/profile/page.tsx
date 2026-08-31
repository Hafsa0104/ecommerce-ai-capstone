"use client";

// app/profile/page.tsx — this build has no auth backend (a deliberate
// scope decision: localStorage-only, no Firebase, for this project —
// see AuthContext). Signing in there is what gates this page now: signed
// out, it's a prompt rather than a dashboard pretending you're already
// logged in. Edits persist to localStorage so the UI still feels real
// across visits, same pattern as CartContext.
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  UserPen,
  Package,
  MapPin,
  ShieldCheck,
  User,
  LogOut,
  Briefcase,
  Home,
  Plus,
  Phone,
  Pencil,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useAuthModal } from "@/context/AuthModalContext";
import { useCurrency } from "@/context/CurrencyContext";
import { getOrders, migrateOrders, type Order } from "@/services/orderService";
import { EMAIL_RE, deleteAccount, loadAccounts, normalizeEmail, saveAccount } from "@/services/authAccountService";
import Dialog from "@/components/Dialog";
import styles from "./page.module.css";

type Tab = "overview" | "edit" | "orders" | "addresses" | "security";

// Pakistani mobile format only (03XX-XXXXXXX, 11 digits after removing
// any dashes/spaces the user typed) — matches the postal-code/city
// validation below, all scoped to Pakistan for this pass rather than
// general-purpose international formats.
const PK_PHONE_RE = /^03\d{9}$/;
function normalizePhone(raw: string): string {
  return raw.replace(/[\s-]/g, "");
}

interface ProfileInfo {
  name: string;
  email: string;
  phone: string;
  // Whether `phone` specifically has completed the (simulated) OTP
  // flow below — reset to false any time the saved phone number
  // actually changes, so this never silently carries over to a
  // different number. Demo-only: see the OTP UI's own on-page note.
  phoneVerified: boolean;
}

// Major Pakistani cities only — a <select> instead of free text, so a
// saved address can't contain a misspelled city name. Not an
// exhaustive list of every Pakistani city, just the common ones a demo
// shipping form would realistically offer.
const PAKISTAN_CITIES = [
  "Karachi",
  "Lahore",
  "Faisalabad",
  "Rawalpindi",
  "Multan",
  "Peshawar",
  "Islamabad",
  "Quetta",
  "Gujranwala",
  "Hyderabad",
  "Sialkot",
  "Bahawalpur",
];

const POSTAL_CODE_RE = /^\d{5}$/;

// Structured house-number/street-name/area/city/postal-code fields
// instead of the earlier free-text building/colony/province/address-line
// blob — the city <select> plus a validated postal code are what
// actually rule out the typo-class "this address doesn't exist"
// errors a frontend can catch without a real geocoding API (out of
// scope here — see the form's own note). `country` is fixed to
// "Pakistan" rather than a free-text field: every City option is
// already a Pakistani city and the postal-code/phone formats are
// Pakistan-specific, so a free-text country could disagree with both.
interface Address {
  id: string;
  label: "Office" | "Home";
  fullName: string;
  phone: string;
  houseNumber: string; // House / street number
  streetName: string;
  area?: string; // Area / neighborhood — optional
  city: string; // one of PAKISTAN_CITIES
  postalCode: string; // 5 digits
  country: string;
}

// Keyed by the signed-in user's own email, not one flat key shared by
// everyone — that was the actual bug (for both of these): a single
// global key meant whichever user's edits were saved LAST kept showing
// up for EVERY subsequently signed-in user, since nothing tied the
// cached data to who was actually signed in. Normalized the same way
// useAuthForm normalizes emails for its own account lookups, so this
// stays consistent with whatever casing the user actually signed in
// with.
function profileStorageKey(email: string): string {
  return `profile-info:${email.trim().toLowerCase()}`;
}

function addressStorageKey(email: string): string {
  return `profile-addresses:${email.trim().toLowerCase()}`;
}

// Pre-scoping, every signed-in user's addresses lived under this one
// flat key — a one-time migration (see the addresses-load effect
// below) adopts whatever's here once for the first account that loads
// after this change, rather than making existing saved addresses look
// like they vanished.
const LEGACY_ADDRESS_KEY = "profile-addresses";

const TABS: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "edit", label: "Edit profile", icon: UserPen },
  { id: "orders", label: "My orders", icon: Package },
  { id: "addresses", label: "Addresses", icon: MapPin },
  { id: "security", label: "Security", icon: ShieldCheck },
];

export default function ProfilePage() {
  const { user, isSignedIn, signOut, updateUser } = useAuth();
  const { formatPrice } = useCurrency();
  const { requestAuth } = useAuthModal();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  // Lazy-initialized from whichever user is ALREADY signed in at first
  // render (true for a client-side sign-in that doesn't reload the
  // page — the mount effect below is what covers a hard refresh,
  // where AuthContext's own user is still resolving at this point) —
  // never a hardcoded placeholder identity. The mount effect is still
  // what actually loads this specific user's own saved edits (or
  // re-seeds a different user's after switching accounts); this only
  // avoids ever painting the WRONG name for even one render.
  const [profile, setProfile] = useState<ProfileInfo>(() =>
    user
      ? { name: user.name, email: user.email, phone: "", phoneVerified: false }
      : { name: "", email: "", phone: "", phoneVerified: false }
  );
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  // Phone format error from the Edit Profile form's own submit (see
  // handleSaveProfile) — separate from the OTP flow below, which only
  // ever runs against an already-saved, already-format-valid number.
  const [phoneError, setPhoneError] = useState("");
  // Name/email validation from the same submit — kept separate from
  // phoneError (a different field, checked first) so each shows next
  // to the specific input it's actually about, the same field-adjacent
  // placement useAuthForm's own invalidField uses on the real sign-in/
  // sign-up forms.
  const [identityError, setIdentityError] = useState<{ field: "name" | "email"; message: string } | null>(null);
  // The OTP mini-flow's own transient state — deliberately NOT part of
  // ProfileInfo/localStorage: a demo code regenerating after a refresh
  // is expected, only the resulting `phoneVerified` boolean persists.
  const [otpStage, setOtpStage] = useState<"idle" | "sent">("idle");
  const [demoCode, setDemoCode] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [otpError, setOtpError] = useState("");
  // The Office/Home label picker is two plain toggle buttons, not
  // native radios — so its value rides along in the form submit via a
  // hidden input (see the address dialog's form below) kept in sync
  // with this, the same uncontrolled-form-via-FormData pattern the
  // rest of this form already uses for every other field.
  const [addressLabel, setAddressLabel] = useState<"Office" | "Home">("Office");
  // Add + Edit share one dialog and one form — null id means "new
  // address"; a real id means "editing this saved one" (see
  // editingAddress below, which the form's defaultValues and submit
  // handler both key off of).
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  // Bumped on every "Add new address" open so the form's key (below)
  // changes even between two back-to-back adds, where editingAddressId
  // stays null both times. Without this, two adds in a row would reuse
  // the same uncontrolled <input> DOM nodes and the second dialog would
  // silently open pre-filled with whatever was typed for the first.
  const [addFormNonce, setAddFormNonce] = useState(0);
  // Postal-code format error for the address dialog's own submit —
  // same validate-on-submit pattern as the profile phone field above.
  const [addressFormError, setAddressFormError] = useState("");

  // Signing out clears what's displayed, not just AuthContext's own
  // user pointer — this component doesn't unmount just because the
  // signed-in user changed, so without this a sign-out followed by a
  // DIFFERENT user signing in (no page reload) could still render for
  // one tick with the previous user's name/email/addresses still in
  // this state, before the sync effect below corrects it for whoever's
  // signed in now. React's "adjusting state when a value changes"
  // render-time pattern (same technique AuthModal.tsx/QuantityStepper.tsx
  // already use), not a useEffect: this needs to happen before the
  // render that would show the stale data commits, not after.
  const [prevIsSignedIn, setPrevIsSignedIn] = useState(isSignedIn);
  if (isSignedIn !== prevIsSignedIn) {
    setPrevIsSignedIn(isSignedIn);
    if (!isSignedIn) {
      setProfile({ name: "", email: "", phone: "", phoneVerified: false });
      setAddresses([]);
      setOrders([]);
      setHydrated(false);
      // Also drop any in-progress OTP attempt — it belongs to whichever
      // user just signed out, not to whoever (if anyone) signs in next.
      setPhoneError("");
      setIdentityError(null);
      setOtpStage("idle");
      setDemoCode("");
      setOtpInput("");
      setOtpError("");
    }
  }

  useEffect(() => {
    // This effect only ever runs once ProfilePage has already rendered
    // the signed-in dashboard below (isSignedIn gates that JSX), so
    // `user` is already resolved here — no race with AuthContext's own
    // hydration. Re-runs whenever `user` itself changes too — that's
    // what makes switching accounts (sign out, then a different sign
    // in) within the same page load actually re-sync to the NEW user's
    // own saved profile, instead of leaving the previous user's still
    // displayed.
    if (!isSignedIn || !user) return;
    try {
      // Scoped to THIS user's email (see profileStorageKey) — a flat,
      // shared key was the actual bug: it showed whichever user's
      // edits were saved last, for every signed-in user afterward.
      const rawProfile = window.localStorage.getItem(profileStorageKey(user.email));
      let rawAddresses = window.localStorage.getItem(addressStorageKey(user.email));
      // One-time migration for whichever account first loads after this
      // per-account scoping: before it existed, every signed-in user's
      // addresses lived under the one flat LEGACY_ADDRESS_KEY. Adopt
      // that data once as this account's own addresses (and clear the
      // legacy key, so it can't also get claimed by the next account
      // that signs in) rather than making existing saved addresses look
      // like they silently vanished.
      if (!rawAddresses) {
        const legacyRaw = window.localStorage.getItem(LEGACY_ADDRESS_KEY);
        if (legacyRaw) {
          rawAddresses = legacyRaw;
          window.localStorage.setItem(addressStorageKey(user.email), legacyRaw);
          window.localStorage.removeItem(LEGACY_ADDRESS_KEY);
        }
      }
      // One-time sync from localStorage on mount — see CartContext for
      // why this can't be lazy initial state (no localStorage on server).
      // No saved profile yet for this user specifically: seed name/email
      // from their actual signed-in identity, never a hardcoded default.
      // phoneVerified defaults to false before the spread so a profile
      // saved before that field existed still parses into a valid
      // ProfileInfo instead of silently reading as `undefined`.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (rawProfile) setProfile({ phoneVerified: false, ...JSON.parse(rawProfile) });
      else setProfile({ name: user.name, email: user.email, phone: "", phoneVerified: false });
      if (rawAddresses) setAddresses(JSON.parse(rawAddresses));
      // Written by the checkout page (see saveOrder) under this same
      // per-user key when this user places an order while signed in.
      setOrders(getOrders(user.email));
      // Switching to a different signed-in user: any OTP attempt on
      // screen belonged to whoever was signed in before.
      setPhoneError("");
      setOtpStage("idle");
      setDemoCode("");
      setOtpInput("");
      setOtpError("");
    } catch {
      // Corrupt or inaccessible storage — fall back to the signed-in
      // identity itself, never a hardcoded placeholder.
      setProfile({ name: user.name, email: user.email, phone: "", phoneVerified: false });
    } finally {
      setHydrated(true);
    }

    // Deep link from elsewhere in the site (e.g. the navbar's Orders
    // link, "/profile#orders") — open that tab instead of always
    // landing on Overview. Read once on mount, same as the storage sync
    // above, so this can't run during SSR and mismatch the first paint.
    const hash = window.location.hash.slice(1);
    if (TABS.some((t) => t.id === hash)) setActiveTab(hash as Tab);
    // isSignedIn/user, not []: this effect is gated on isSignedIn (see
    // above) and needs to actually re-run once AuthContext's own
    // hydration resolves it from false to true — a plain mount-only []
    // effect would fire once while still signed out, see nothing to do,
    // and never fire again.
  }, [isSignedIn, user]);

  useEffect(() => {
    if (!hydrated || !user) return;
    // Saved under the SIGNED-IN user's own email (profileStorageKey),
    // not whatever's currently typed into the editable email field
    // below — that field is a display value the user can customize
    // within their own profile, not the key that identifies whose
    // profile this is.
    window.localStorage.setItem(profileStorageKey(user.email), JSON.stringify(profile));
  }, [profile, hydrated, user]);

  useEffect(() => {
    if (!hydrated || !user) return;
    window.localStorage.setItem(addressStorageKey(user.email), JSON.stringify(addresses));
  }, [addresses, hydrated, user]);

  function handleSaveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return; // this tab only renders while signed in — defensive only
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") || "").trim();
    const email = normalizeEmail(String(form.get("email") || ""));
    const phone = normalizePhone(String(form.get("phone") || ""));

    // Name and email aren't just display text on this page — they're
    // the same identity Sign In actually authenticates against (see
    // authAccountService), so they get the same required/format
    // validation useAuthForm applies on the real sign-in/sign-up forms,
    // checked first (top to bottom) before the phone field below.
    if (!name) {
      setIdentityError({ field: "name", message: "Full name is required." });
      return;
    }
    if (!email) {
      setIdentityError({ field: "email", message: "Email is required." });
      return;
    }
    if (!EMAIL_RE.test(email)) {
      setIdentityError({ field: "email", message: "Enter a valid email address." });
      return;
    }

    const currentEmail = normalizeEmail(user.email);
    const emailChanged = email !== currentEmail;

    // Changing TO an email another account already owns would either
    // silently take over that account's credential record or leave two
    // different signed-in identities pointing at one entry — reject it
    // the same way Create Account rejects a duplicate email, rather
    // than letting either happen.
    if (emailChanged && loadAccounts()[email]) {
      setIdentityError({
        field: "email",
        message: "An account with this email already exists. Use a different email.",
      });
      return;
    }
    setIdentityError(null);

    // Format-validate on submit, not on every keystroke. Phone stays
    // optional (matches the existing "Optional" placeholder) — only a
    // non-empty value that doesn't match the expected shape is an error.
    if (phone && !PK_PHONE_RE.test(phone)) {
      setPhoneError("Enter a valid Pakistani mobile number, e.g. 0300-1234567.");
      return;
    }
    setPhoneError("");

    // Keeps the credential book Sign In actually checks against in
    // sync — without this, a renamed/re-emailed account here would
    // keep signing in under the OLD name/email forever, no matter what
    // this page shows. The password is never touched by this form, so
    // it's read from the existing record and carried over as-is.
    const account = loadAccounts()[currentEmail];
    if (account) {
      if (emailChanged) deleteAccount(currentEmail);
      saveAccount(email, { name, password: account.password });
    }

    // Per-user data keyed by email — this page's own saved profile
    // record and addresses, plus order history (services/orderService)
    // — moves with the account on an email change instead of silently
    // looking empty under the new email. The profile record and
    // addresses both get rewritten under the new key by their own
    // localStorage-sync effects above (each depends on `user`, which
    // updateUser below changes) — this only needs to clean up the now-
    // stale entries left under the old key.
    if (emailChanged) {
      try {
        window.localStorage.removeItem(profileStorageKey(currentEmail));
        window.localStorage.removeItem(addressStorageKey(currentEmail));
      } catch {
        // Best-effort, same as the rest of this form's localStorage use.
      }
      migrateOrders(currentEmail, email);
    }

    // The actual signed-in identity — Navbar, the homepage welcome
    // card, and everywhere else that shows "signed in as X" read THIS,
    // not this page's own `profile` state below.
    updateUser({ name, email });

    // A changed number is no longer the one that was verified — reset
    // the flag (and any in-progress OTP attempt for the old number)
    // rather than letting verification silently carry over.
    const phoneChanged = phone !== profile.phone;
    setProfile((prev) => ({ name, email, phone, phoneVerified: phoneChanged ? false : prev.phoneVerified }));
    if (phoneChanged) {
      setOtpStage("idle");
      setDemoCode("");
      setOtpInput("");
      setOtpError("");
    }
    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 2500);
  }

  // Demo-only: generates a random 6-digit code locally and displays it
  // on screen (see the banner below) instead of sending a real SMS —
  // this project has no SMS backend/API key, see the OTP block's own
  // note in the rendered UI.
  function handleSendCode() {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setDemoCode(code);
    setOtpStage("sent");
    setOtpInput("");
    setOtpError("");
  }

  function handleVerifyCode(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (otpInput.trim() === demoCode) {
      setProfile((prev) => ({ ...prev, phoneVerified: true }));
      setOtpStage("idle");
      setDemoCode("");
      setOtpInput("");
      setOtpError("");
    } else {
      setOtpError("That code doesn't match. Check the code above, or resend a new one.");
    }
  }

  const editingAddress = addresses.find((a) => a.id === editingAddressId) ?? null;

  function openAddAddress() {
    setEditingAddressId(null);
    setAddressLabel("Office");
    setAddFormNonce((n) => n + 1);
    setAddressFormError("");
    setAddressDialogOpen(true);
  }

  function openEditAddress(addr: Address) {
    setEditingAddressId(addr.id);
    setAddressLabel(addr.label);
    setAddressFormError("");
    setAddressDialogOpen(true);
  }

  function handleSaveAddress(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const postalCode = String(form.get("postalCode") || "").trim();

    // Format-validate on submit — city is already constrained to a
    // fixed list by the <select> below, so postal code is the one
    // field here that still needs its own shape check.
    if (!POSTAL_CODE_RE.test(postalCode)) {
      setAddressFormError("Enter a valid 5-digit postal code.");
      return;
    }
    setAddressFormError("");

    const fields = {
      label: (form.get("label") === "Home" ? "Home" : "Office") as "Office" | "Home",
      fullName: String(form.get("fullName") || ""),
      phone: String(form.get("phone") || ""),
      houseNumber: String(form.get("houseNumber") || ""),
      streetName: String(form.get("streetName") || ""),
      area: String(form.get("area") || ""),
      city: String(form.get("city") || ""),
      postalCode,
      // Fixed, not user-editable — see the Address interface's own
      // comment on why a free-text country field doesn't make sense
      // once City is limited to a Pakistani-cities <select>.
      country: "Pakistan",
    };
    if (editingAddressId) {
      // Editing: replace that one entry in place, everything else in
      // the list untouched — not remove-then-re-add, which would lose
      // its original position in the list.
      setAddresses((prev) => prev.map((a) => (a.id === editingAddressId ? { ...fields, id: editingAddressId } : a)));
    } else {
      setAddresses((prev) => [...prev, { ...fields, id: crypto.randomUUID() }]);
    }
    setAddressDialogOpen(false);
    setEditingAddressId(null);
  }

  const initial = profile.name.trim().charAt(0).toUpperCase() || "D";

  if (!isSignedIn) {
    return (
      <div className={`wrap ${styles.pageContainer}`}>
        <h1 className={styles.pageHeading}>My Account</h1>
        <div className={styles.emptyState} role="status">
          <User size={40} aria-hidden="true" />
          <p>Sign in to view your account.</p>
          <button type="button" className={styles.signInBtn} onClick={() => requestAuth()}>
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`wrap ${styles.pageContainer}`}>
      <h1 className={styles.pageHeading}>My Account</h1>
      <p className={styles.demoNotice}>
        This is a demo account — there&apos;s no real account backend yet, so what you see here is only stored in
        your browser.
      </p>

      <div className={styles.layout}>
        <aside className={styles.sidebar} aria-label="Account sections">
          <div className={styles.avatarWrap}>
            <div className={styles.avatar} aria-hidden="true">
              {initial}
            </div>
            <h2 className={styles.sidebarName}>{profile.name}</h2>
            <button type="button" className={styles.signOutBtn} onClick={signOut}>
              <LogOut size={14} aria-hidden="true" />
              Sign out
            </button>
          </div>

          <nav role="tablist" aria-label="Account sections" className={styles.tabNav}>
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                id={`tab-${id}`}
                aria-selected={activeTab === id}
                aria-controls={`panel-${id}`}
                className={`${styles.tabBtn} ${activeTab === id ? styles.tabBtnActive : ""}`}
                onClick={() => setActiveTab(id)}
              >
                <Icon size={16} aria-hidden="true" />
                {label}
              </button>
            ))}
          </nav>
        </aside>

        <div className={styles.content}>
          {activeTab === "overview" && (
            <section id="panel-overview" role="tabpanel" aria-labelledby="tab-overview" className={styles.panel}>
              <h2>Overview</h2>
              <div className={styles.statGrid}>
                <div className={styles.statCard}>
                  <span className={styles.statValue}>{addresses.length}</span>
                  <span className={styles.statLabel}>Saved addresses</span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statValue}>{orders.length}</span>
                  <span className={styles.statLabel}>Orders placed</span>
                </div>
              </div>
              <p className={styles.overviewEmail}>{profile.email}</p>
            </section>
          )}

          {activeTab === "edit" && (
            <section id="panel-edit" role="tabpanel" aria-labelledby="tab-edit" className={styles.panel}>
              <h2>Edit profile</h2>
              <form className={styles.form} onSubmit={handleSaveProfile}>
                <label htmlFor="name" className={styles.formLabel}>
                  Full name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  defaultValue={profile.name}
                  className={styles.formInput}
                  aria-invalid={identityError?.field === "name" ? true : undefined}
                  aria-describedby={identityError?.field === "name" ? "identity-error" : undefined}
                />
                {identityError?.field === "name" && (
                  <p id="identity-error" role="alert" className={styles.fieldError}>
                    {identityError.message}
                  </p>
                )}

                <label htmlFor="email" className={styles.formLabel}>
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={profile.email}
                  className={styles.formInput}
                  aria-invalid={identityError?.field === "email" ? true : undefined}
                  aria-describedby={identityError?.field === "email" ? "identity-error" : undefined}
                />
                {identityError?.field === "email" && (
                  <p id="identity-error" role="alert" className={styles.fieldError}>
                    {identityError.message}
                  </p>
                )}
                {/* This is the SAME identity Sign In checks against, not
                    just a display label — see handleSaveProfile. */}
                <p className={styles.inlineDemoNote}>
                  Changing your email or name here also updates your sign-in details for this browser.
                </p>

                <label htmlFor="phone" className={styles.formLabel}>
                  Phone
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  defaultValue={profile.phone}
                  placeholder="03XX-XXXXXXX (optional)"
                  className={styles.formInput}
                  aria-invalid={phoneError ? true : undefined}
                  aria-describedby={phoneError ? "phone-error" : undefined}
                />
                {phoneError && (
                  <p id="phone-error" role="alert" className={styles.fieldError}>
                    {phoneError}
                  </p>
                )}

                <button type="submit" className={styles.saveBtn}>
                  Save changes
                </button>
                <p aria-live="polite" className={styles.savedNotice}>
                  {savedNotice ? "Saved." : ""}
                </p>
              </form>

              {/* Phone verification — only meaningful once a validly
                  formatted number is actually saved (see handleSaveProfile);
                  editing the field above doesn't affect this until Save
                  is pressed again. Entirely simulated: see the demo note
                  below and in the "Demo mode" banner once a code is sent. */}
              {profile.phone && PK_PHONE_RE.test(profile.phone) && (
                <div className={styles.otpBlock}>
                  {profile.phoneVerified ? (
                    <p className={styles.verifiedBadge}>
                      <CheckCircle2 size={16} aria-hidden="true" />
                      Phone verified
                    </p>
                  ) : otpStage === "idle" ? (
                    <>
                      <button type="button" className={styles.addAddressTrigger} onClick={handleSendCode}>
                        Send verification code
                      </button>
                      <p className={styles.inlineDemoNote}>
                        Simulated for this demo — no real SMS is sent.
                      </p>
                    </>
                  ) : (
                    <div className={styles.otpPanel}>
                      <p className={styles.demoOtpBanner} role="status">
                        Demo mode — no SMS is actually sent. Your code is: <strong>{demoCode}</strong>
                      </p>
                      <form onSubmit={handleVerifyCode} className={styles.otpForm}>
                        <label htmlFor="otpInput" className={styles.formLabel}>
                          Enter the 6-digit code
                        </label>
                        <input
                          id="otpInput"
                          name="otpInput"
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={6}
                          value={otpInput}
                          onChange={(e) => {
                            setOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6));
                            if (otpError) setOtpError("");
                          }}
                          className={styles.formInput}
                          aria-invalid={otpError ? true : undefined}
                          aria-describedby={otpError ? "otp-error" : undefined}
                        />
                        {otpError && (
                          <p id="otp-error" role="alert" className={styles.fieldError}>
                            {otpError}
                          </p>
                        )}
                        <div className={styles.otpActions}>
                          <button type="submit" className={styles.saveBtn}>
                            Verify
                          </button>
                          <button type="button" className={styles.editAddressBtn} onClick={handleSendCode}>
                            Resend code
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {activeTab === "orders" && (
            <section id="panel-orders" role="tabpanel" aria-labelledby="tab-orders" className={styles.panel}>
              <h2>My orders</h2>
              {orders.length === 0 ? (
                <div className={styles.emptyState} role="status">
                  <Package size={32} aria-hidden="true" />
                  <p>No orders yet.</p>
                  <Link href="/listing" className={styles.emptyStateLink}>
                    Browse products
                  </Link>
                </div>
              ) : (
                // Written by the Checkout page (see saveOrder in
                // services/orderService.ts) at the moment a signed-in
                // shopper places an order — newest first, same as the
                // storage helper itself already returns them.
                <ul className={styles.orderList}>
                  {orders.map((order) => (
                    <li key={order.id} className={styles.orderCard}>
                      <div className={styles.orderCardTop}>
                        <span className={styles.orderCardId}>Order #{order.id}</span>
                        <span className={styles.orderCardDate}>
                          {new Date(order.placedAt).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                      <ul className={styles.orderItemList}>
                        {order.items.map((item) => (
                          <li key={item.productId}>
                            {item.name} <span className={styles.orderItemQty}>× {item.quantity}</span>
                          </li>
                        ))}
                      </ul>
                      <div className={styles.orderCardTotal}>Total: {formatPrice(order.total)}</div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {activeTab === "addresses" && (
            <section id="panel-addresses" role="tabpanel" aria-labelledby="tab-addresses" className={styles.panel}>
              <div className={styles.panelHeaderRow}>
                <h2>Addresses</h2>
                {addresses.length > 0 && (
                  <button type="button" className={styles.addAddressTrigger} onClick={openAddAddress}>
                    <Plus size={16} aria-hidden="true" />
                    Add new address
                  </button>
                )}
              </div>

              {addresses.length === 0 ? (
                <div className={styles.emptyState} role="status">
                  <MapPin size={32} aria-hidden="true" />
                  <p>No saved addresses yet.</p>
                  <button type="button" className={styles.signInBtn} onClick={openAddAddress}>
                    <Plus size={16} aria-hidden="true" />
                    Add new address
                  </button>
                </div>
              ) : (
                <ul className={styles.addressList}>
                  {addresses.map((addr) => {
                    // Falls back to "" for anything an address saved
                    // under an earlier shape of this form doesn't have
                    // — see the Address type's own comment — and joins
                    // only the non-empty parts so a legacy address (or
                    // one where the optional Area was left blank)
                    // doesn't render with stray double commas.
                    const locality = [addr.houseNumber, addr.streetName, addr.area, addr.city, addr.postalCode, addr.country]
                      .filter(Boolean)
                      .join(", ");
                    return (
                      <li key={addr.id} className={styles.addressCard}>
                        <div className={styles.addressCardTop}>
                          <span className={styles.addressLabelPill}>
                            {addr.label === "Home" ? <Home size={12} aria-hidden="true" /> : <Briefcase size={12} aria-hidden="true" />}
                            {addr.label}
                          </span>
                          <div className={styles.addressCardActions}>
                            <button type="button" className={styles.editAddressBtn} onClick={() => openEditAddress(addr)}>
                              <Pencil size={13} aria-hidden="true" />
                              Edit
                            </button>
                            <button
                              type="button"
                              className={styles.removeAddressBtn}
                              onClick={() => setAddresses((prev) => prev.filter((a) => a.id !== addr.id))}
                            >
                              <Trash2 size={13} aria-hidden="true" />
                              Remove
                            </button>
                          </div>
                        </div>
                        <strong className={styles.addressCardName}>{addr.fullName || "Address"}</strong>
                        {addr.phone && (
                          <p className={styles.addressCardPhone}>
                            <Phone size={13} aria-hidden="true" />
                            {addr.phone}
                          </p>
                        )}
                        {locality && <p>{locality}</p>}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )}

          {activeTab === "security" && (
            <section id="panel-security" role="tabpanel" aria-labelledby="tab-security" className={styles.panel}>
              <h2>Security</h2>
              <form
                className={styles.form}
                onSubmit={(e) => {
                  e.preventDefault();
                }}
              >
                <label htmlFor="currentPassword" className={styles.formLabel}>
                  Current password
                </label>
                <input id="currentPassword" name="currentPassword" type="password" className={styles.formInput} />

                <label htmlFor="newPassword" className={styles.formLabel}>
                  New password
                </label>
                <input id="newPassword" name="newPassword" type="password" className={styles.formInput} />

                <button type="submit" className={styles.saveBtn} disabled>
                  Update password
                </button>
                <p className={styles.savedNotice}>Not wired to a real account yet — UI only.</p>
              </form>
            </section>
          )}
        </div>
      </div>

      {/* One shared dialog for both Add and Edit — reuses this app's
          existing Dialog component (same pattern as Request a Quote /
          Request Customization) instead of the form always sitting
          inline on the page. Always rendered, gated by `open` (see
          Dialog's own comment on why), not conditional on the
          Addresses tab being active — its `open` state already covers
          that. The form's key (editingAddressId, or a bumped nonce for
          "new") forces it — and its uncontrolled defaultValue inputs —
          to remount whenever switching between "add new" and "edit
          this address", between two different addresses, or between
          two back-to-back "add new" opens; without it, defaultValue
          only applies on an input's original mount and a later open
          wouldn't reflect the (possibly different, or blank) address
          it should now show. */}
      <Dialog
        open={addressDialogOpen}
        onClose={() => {
          setAddressDialogOpen(false);
          setEditingAddressId(null);
        }}
        title={editingAddress ? "Edit address" : "Add new address"}
      >
        <form
          key={editingAddressId ?? `new-${addFormNonce}`}
          className={styles.form}
          onSubmit={handleSaveAddress}
        >
          {/* ids prefixed addr- — this dialog is mounted unconditionally
              (see the comment above), so its fields share the DOM at
              the same time as the Edit Profile tab's own #phone field;
              without the prefix the two ids would collide. */}
          <label htmlFor="addr-fullName" className={styles.formLabel}>
            Full name
          </label>
          <input
            id="addr-fullName"
            name="fullName"
            type="text"
            defaultValue={editingAddress?.fullName}
            placeholder="Enter your first and last name"
            required
            className={styles.formInput}
          />

          <label htmlFor="addr-phone" className={styles.formLabel}>
            Phone Number
          </label>
          <input
            id="addr-phone"
            name="phone"
            type="tel"
            defaultValue={editingAddress?.phone}
            placeholder="Please enter your phone number"
            required
            className={styles.formInput}
          />

          <label htmlFor="addr-houseNumber" className={styles.formLabel}>
            House / street number
          </label>
          <input
            id="addr-houseNumber"
            name="houseNumber"
            type="text"
            defaultValue={editingAddress?.houseNumber}
            placeholder="e.g. House# 123"
            required
            className={styles.formInput}
          />

          <label htmlFor="addr-streetName" className={styles.formLabel}>
            Street name
          </label>
          <input
            id="addr-streetName"
            name="streetName"
            type="text"
            defaultValue={editingAddress?.streetName}
            placeholder="e.g. Street# 12, ABC Road"
            required
            className={styles.formInput}
          />

          <label htmlFor="addr-area" className={styles.formLabel}>
            Area / neighborhood
          </label>
          <input
            id="addr-area"
            name="area"
            type="text"
            defaultValue={editingAddress?.area}
            placeholder="Optional"
            className={styles.formInput}
          />

          <label htmlFor="addr-city" className={styles.formLabel}>
            City
          </label>
          <select
            id="addr-city"
            name="city"
            defaultValue={editingAddress?.city ?? ""}
            required
            className={styles.formInput}
          >
            <option value="" disabled>
              Select a city
            </option>
            {PAKISTAN_CITIES.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>

          <label htmlFor="addr-postalCode" className={styles.formLabel}>
            Postal code
          </label>
          <input
            id="addr-postalCode"
            name="postalCode"
            type="text"
            inputMode="numeric"
            maxLength={5}
            defaultValue={editingAddress?.postalCode}
            placeholder="5 digits, e.g. 74200"
            required
            className={styles.formInput}
            aria-invalid={addressFormError ? true : undefined}
            aria-describedby={addressFormError ? "addr-postalCode-error" : undefined}
          />
          {addressFormError && (
            <p id="addr-postalCode-error" role="alert" className={styles.fieldError}>
              {addressFormError}
            </p>
          )}
          <p className={styles.inlineDemoNote}>
            City and postal code are checked for a valid format only — this demo doesn&apos;t verify the address
            actually exists.
          </p>

          <span className={styles.formLabel}>Select a label for effective delivery</span>
          <input type="hidden" name="label" value={addressLabel} />
          <div className={styles.labelToggleRow} role="radiogroup" aria-label="Address label">
            <button
              type="button"
              role="radio"
              aria-checked={addressLabel === "Office"}
              className={`${styles.labelToggleBtn} ${addressLabel === "Office" ? styles.labelToggleBtnActive : ""}`}
              onClick={() => setAddressLabel("Office")}
            >
              <Briefcase size={16} aria-hidden="true" />
              Office
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={addressLabel === "Home"}
              className={`${styles.labelToggleBtn} ${addressLabel === "Home" ? styles.labelToggleBtnActive : ""}`}
              onClick={() => setAddressLabel("Home")}
            >
              <Home size={16} aria-hidden="true" />
              Home
            </button>
          </div>

          <button type="submit" className={styles.saveBtn}>
            {editingAddress ? "Save changes" : "Add address"}
          </button>
        </form>
      </Dialog>
    </div>
  );
}
