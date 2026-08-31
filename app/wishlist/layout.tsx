import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Wishlist",
  // Personal, per-user content — never index this page.
  robots: { index: false, follow: false },
};

export default function WishlistLayout({ children }: { children: React.ReactNode }) {
  return children;
}
