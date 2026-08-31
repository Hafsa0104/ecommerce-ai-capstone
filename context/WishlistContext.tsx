"use client";

// ============================================================
// context/WishlistContext.tsx — saved-product-id list, persisted to
// localStorage, scoped to whoever's actually signed in (see
// wishlistStorageKey) — signing into a different account shows THAT
// account's own wishlist, not whatever was last in the browser. Same
// shape/persistence pattern as CartContext, kept entirely separate from
// it: cart and wishlist are different concerns (one is "I intend to buy
// this now", the other "remember this for later"), and per the
// account-gating rule this app follows (see AuthContext), the wishlist
// is one of the actions that requires being signed in — the gating
// check itself lives in WishlistButton, not here; this context only
// ever holds/persists state. No guest bucket needed here the way
// CartContext has one: nothing can ever add to a wishlist while signed
// out in the first place.
// ============================================================
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "./AuthContext";

interface WishlistContextValue {
  productIds: string[];
  itemCount: number;
  hydrated: boolean;
  isInWishlist: (productId: string) => boolean;
  addItem: (productId: string) => void;
  removeItem: (productId: string) => void;
}

const WishlistContext = createContext<WishlistContextValue | undefined>(undefined);
const STORAGE_KEY = "wishlist-items";

// No signed-in email (signed out, or AuthContext hasn't resolved yet) —
// a fixed "nobody" bucket rather than reusing the bare STORAGE_KEY
// unscoped: unlike Cart, nothing should ever legitimately read from or
// write to this while signed out, so it deliberately doesn't alias to
// any single real account's data.
function wishlistStorageKey(email: string | null): string {
  return `${STORAGE_KEY}:${email ?? "guest"}`;
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [productIds, setProductIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const { user, hydrated: authHydrated } = useAuth();
  const email = user ? user.email.trim().toLowerCase() : null;

  // Same render-time "identity changed" pattern as CartContext — see
  // its own comment for why this has to drop hydrated back to false
  // before the write effect below can run against the new email.
  const [prevEmail, setPrevEmail] = useState(email);
  if (email !== prevEmail) {
    setPrevEmail(email);
    setHydrated(false);
  }

  useEffect(() => {
    if (!authHydrated) return;
    try {
      const key = wishlistStorageKey(email);
      let raw = window.localStorage.getItem(key);
      // One-time migration for a SIGNED-IN account only: before this
      // per-account scoping existed, the wishlist lived under the flat
      // STORAGE_KEY (it always required being signed in to write to,
      // just not scoped to WHICH account). Adopt that existing data
      // once as this account's own wishlist, then clear the flat key
      // so it can't also get claimed by a different account later.
      if (!raw && email) {
        const legacyRaw = window.localStorage.getItem(STORAGE_KEY);
        if (legacyRaw) {
          raw = legacyRaw;
          window.localStorage.setItem(key, legacyRaw);
          window.localStorage.removeItem(STORAGE_KEY);
        }
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProductIds(raw ? JSON.parse(raw) : []);
    } catch {
      // Corrupt or inaccessible storage — start with an empty wishlist.
      setProductIds([]);
    } finally {
      setHydrated(true);
    }
  }, [authHydrated, email]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(wishlistStorageKey(email), JSON.stringify(productIds));
  }, [productIds, hydrated, email]);

  const addItem = useCallback((productId: string) => {
    setProductIds((prev) => (prev.includes(productId) ? prev : [...prev, productId]));
  }, []);

  const removeItem = useCallback((productId: string) => {
    setProductIds((prev) => prev.filter((id) => id !== productId));
  }, []);

  const isInWishlist = useCallback((productId: string) => productIds.includes(productId), [productIds]);

  const value = useMemo(
    () => ({ productIds, itemCount: productIds.length, hydrated, isInWishlist, addItem, removeItem }),
    [productIds, hydrated, isInWishlist, addItem, removeItem]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within a WishlistProvider");
  return ctx;
}
