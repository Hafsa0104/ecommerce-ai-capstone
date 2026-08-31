// services/authAccountService.ts — the local "account book" that makes
// sign-in a real, checkable thing (see hooks/useAuthForm's own comment)
// and, since it's the thing sign-in actually authenticates against, the
// thing Edit Profile has to stay in sync with too: this project has no
// backend, so the signed-in identity (AuthContext), the credential
// record used to sign back in (this file), and the extra profile detail
// shown on /profile (its own localStorage, scoped in that file) are
// three separate pieces of local state, not one — a form that only
// updates the display value without updating this one would silently
// leave sign-in checking against the OLD email/name forever. Pulled out
// of useAuthForm.ts (which still owns all the sign-in/sign-up FORM
// logic) so app/profile/page.tsx can read/write the same account
// records directly, without pulling in that whole form's state machine
// just to rename an account. Client-only — every caller is already
// "use client".
export interface StoredAccount {
  name: string;
  password: string;
}

const ACCOUNTS_KEY = "auth-accounts";

// Same practical "local@domain.tld" shape as the rest of this app's
// email handling — see useAuthForm's own comment on why this isn't full
// RFC 5322.
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function loadAccounts(): Record<string, StoredAccount> {
  try {
    const raw = window.localStorage.getItem(ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    // Corrupt/inaccessible storage — treat as no known accounts yet.
    return {};
  }
}

export function getAccount(email: string): StoredAccount | undefined {
  return loadAccounts()[normalizeEmail(email)];
}

export function saveAccount(email: string, account: StoredAccount): void {
  try {
    const accounts = loadAccounts();
    accounts[normalizeEmail(email)] = account;
    window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {
    // Best-effort — the caller's own in-memory state still updates
    // either way, it just won't be remembered for a future visit if
    // storage isn't available.
  }
}

export function deleteAccount(email: string): void {
  try {
    const accounts = loadAccounts();
    delete accounts[normalizeEmail(email)];
    window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {
    // Best-effort, same as saveAccount above.
  }
}
