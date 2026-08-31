"use client";

// ============================================================
// context/CartContext.tsx — cart state, persisted to localStorage,
// scoped to whoever's actually signed in (see cartStorageKey) —
// signing into a different account shows THAT account's own cart, not
// whatever was last in the browser. Guest carts (no one signed in)
// still work exactly as before, under the original flat, unscoped key
// — cart is one of the few actions this app allows without an account
// (see WishlistButton's own comment on which actions require sign-in
// and which don't), so there has to be somewhere for a guest's cart to
// live too. Navbar reads itemCount; the Cart page reads/writes items
// directly through this same context.
// ============================================================
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "./AuthContext";

export interface CartItem {
  productId: string;
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  hydrated: boolean;
  addItem: (productId: string, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);
// Unchanged — this is also the guest-cart key (no signed-in email), so
// an existing guest cart keeps working under exactly the key it always
// has. Only a SIGNED-IN cart gets a per-account suffix.
const STORAGE_KEY = "cart-items";

function cartStorageKey(email: string | null): string {
  return email ? `${STORAGE_KEY}:${email}` : STORAGE_KEY;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const { user, hydrated: authHydrated } = useAuth();
  const email = user ? user.email.trim().toLowerCase() : null;

  // Render-time "identity changed" detection (same pattern
  // app/profile/page.tsx already uses for its own per-user data) —
  // drops hydrated back to false the INSTANT the signed-in email
  // changes (sign in, sign out, or switching accounts), before the
  // write effect below gets a chance to run with the PREVIOUS
  // identity's items under the NEW identity's key. The reload effect,
  // which also depends on `email`, is what sets hydrated back to true
  // once it's actually loaded the right account's own cart.
  const [prevEmail, setPrevEmail] = useState(email);
  if (email !== prevEmail) {
    setPrevEmail(email);
    setHydrated(false);
  }

  // Loads (or reloads, on a sign-in/sign-out/account switch) from
  // localStorage — client only, and gated on AuthContext's OWN
  // hydration first: without waiting for `authHydrated`, this would
  // briefly guess "guest" on every load, even for an already-signed-in
  // visitor, before AuthContext finishes reading who that actually is.
  useEffect(() => {
    if (!authHydrated) return;
    try {
      const key = cartStorageKey(email);
      let raw = window.localStorage.getItem(key);
      // One-time migration for a SIGNED-IN account only: before this
      // per-account scoping existed, every cart — guest or signed-in —
      // lived under the flat STORAGE_KEY. A signed-in visitor's own
      // pre-existing cart is sitting there, not under their new
      // per-account key; adopt it once (and clear the flat key, so it
      // isn't also later claimed by a guest session or a different
      // account) rather than making it look like it silently emptied.
      if (!raw && email) {
        const legacyRaw = window.localStorage.getItem(STORAGE_KEY);
        if (legacyRaw) {
          raw = legacyRaw;
          window.localStorage.setItem(key, legacyRaw);
          window.localStorage.removeItem(STORAGE_KEY);
        }
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setItems(raw ? JSON.parse(raw) : []);
    } catch {
      // Corrupt or inaccessible storage — start with an empty cart.
      setItems([]);
    } finally {
      setHydrated(true);
    }
  }, [authHydrated, email]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(cartStorageKey(email), JSON.stringify(items));
  }, [items, hydrated, email]);

  const addItem = useCallback((productId: string, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === productId);
      if (existing) {
        return prev.map((i) => (i.productId === productId ? { ...i, quantity: i.quantity + quantity } : i));
      }
      return [...prev, { productId, quantity }];
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((i) => i.productId !== productId)
        : prev.map((i) => (i.productId === productId ? { ...i, quantity } : i))
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const itemCount = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);

  const value = useMemo(
    () => ({ items, itemCount, hydrated, addItem, removeItem, updateQuantity, clearCart }),
    [items, itemCount, hydrated, addItem, removeItem, updateQuantity, clearCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
