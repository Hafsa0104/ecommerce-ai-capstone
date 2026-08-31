// ============================================================
// services/orderService.ts — order history, persisted to
// localStorage under the signed-in user's own email, the same
// scoping pattern app/profile/page.tsx already uses for profile
// info (see its profileStorageKey). Client-only (touches
// localStorage directly) — unlike productService.ts, this can't run
// on the server; every caller here is already a "use client" page/
// component.
//
// Orders are only ever saved for a SIGNED-IN user: My Orders lives
// inside Profile, which is itself gated behind sign-in, so a guest
// checkout has nowhere an order could later be looked up anyway —
// see the checkout page's own confirmation screen, which says so
// honestly instead of pretending a guest order was saved somewhere.
// ============================================================

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface OrderShipping {
  fullName: string;
  email: string;
  address: string;
  city: string;
  country: string;
}

export interface Order {
  id: string;
  placedAt: string; // ISO timestamp
  items: OrderItem[];
  total: number;
  shipping: OrderShipping;
}

function ordersStorageKey(email: string): string {
  return `orders:${email.trim().toLowerCase()}`;
}

// Short and readable, not a raw UUID — reads like a real order
// number a shopper could reference, matching the demo OTP code's own
// "looks real, clearly isn't wired to anything real" spirit.
export function generateOrderId(): string {
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `ORD-${rand}`;
}

export function getOrders(email: string): Order[] {
  try {
    const raw = window.localStorage.getItem(ordersStorageKey(email));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Newest first — most orders histories (and this app's own message
// inbox/address list additions) read top-to-bottom as newest-first.
export function saveOrder(email: string, order: Order): void {
  const existing = getOrders(email);
  window.localStorage.setItem(ordersStorageKey(email), JSON.stringify([order, ...existing]));
}

// Called when Edit Profile changes the signed-in user's email (see
// app/profile/page.tsx's handleSaveProfile) — order history is keyed
// by email, so without this a changed email would make every past
// order look like it vanished, even though nothing was actually lost.
// No-op (not an error) if there's nothing to move, or if the two keys
// are already the same.
export function migrateOrders(oldEmail: string, newEmail: string): void {
  if (ordersStorageKey(oldEmail) === ordersStorageKey(newEmail)) return;
  try {
    const raw = window.localStorage.getItem(ordersStorageKey(oldEmail));
    if (raw) {
      window.localStorage.setItem(ordersStorageKey(newEmail), raw);
      window.localStorage.removeItem(ordersStorageKey(oldEmail));
    }
  } catch {
    // Best-effort — a failed migration just leaves history under the
    // old key rather than breaking the profile save itself.
  }
}
