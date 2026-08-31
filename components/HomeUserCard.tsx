"use client";

// components/HomeUserCard.tsx — the homepage right-panel "Hi, welcome"
// card (app/page.tsx). Split out as its own small client component
// rather than making the whole (server, ISR-cached) homepage a client
// component just for this one auth-aware fragment. Reuses AuthContext's
// existing mock sign-in state — the same one Navbar's own Sign In/
// Profile swap already reads — not a second auth state, and the same
// styles.userCard/.btnJoin/.btnLogin classes from page.module.css, so
// this stays visually identical to the original card either way.
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import styles from "@/app/page.module.css";

export default function HomeUserCard() {
  const { user, isSignedIn, signOut } = useAuth();

  // Before AuthContext hydrates from localStorage, `isSignedIn` reads
  // false regardless of the real stored state — same brief signed-out-
  // first flash Navbar's own Sign In/Profile link already accepts (see
  // its own isSignedIn usage), not a new inconsistency introduced here.
  if (isSignedIn && user) {
    return (
      <div className={styles.userCard}>
        <h2 className={styles.userCardHeading}>Hi, {user.name} 👋</h2>
        <p className={styles.userCardSub}>Welcome back!</p>
        <Link href="/profile" className={styles.btnJoin}>
          My Account
        </Link>
        <button type="button" className={styles.btnLogin} onClick={signOut}>
          Log out
        </button>
      </div>
    );
  }

  return (
    <div className={styles.userCard}>
      <h2 className={styles.userCardHeading}>Hi, welcome</h2>
      <p className={styles.userCardSub}>Let&apos;s get started</p>
      <Link href="/sign-up" className={styles.btnJoin}>
        Join now
      </Link>
      <Link href="/sign-in" className={styles.btnLogin}>
        Log in
      </Link>
    </div>
  );
}
