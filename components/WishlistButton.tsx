"use client";

// components/WishlistButton.tsx — heart toggle reused on ProductCard
// (grid/listing cards) and the product-detail page. Wishlist is one of
// the actions this app's account-gating rule treats as sign-in-required
// (see AuthContext/AuthModal) — unlike Add to Cart, a saved-items list
// only makes sense attached to an account, so it's fair to ask first
// rather than silently letting it work as a guest, then losing it.
//
// Removing is confirmed, saving isn't: a stray click that adds an item
// is trivially undone by clicking again, but a stray click that removes
// one silently loses it — asking "remove this?" only on that direction
// matches the actual risk instead of adding friction both ways.
import { type MouseEvent } from "react";
import { Heart } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useAuthModal } from "@/context/AuthModalContext";
import { useConfirmDialog } from "@/context/ConfirmDialogContext";
import { useWishlist } from "@/context/WishlistContext";
import styles from "./WishlistButton.module.css";

interface WishlistButtonProps {
  productId: string;
  productName: string;
  /** "compact" is icon-only, absolutely positioned for overlaying a
   * ProductCard image. "icon" is also icon-only but a normal inline
   * bordered button — same visual language as "default", just without
   * the "Save"/"Saved" text label (the product-detail page's own
   * actions row). "default" (icon+label) is the fallback for anywhere
   * else that hasn't opted into either icon-only variant. */
  variant?: "default" | "compact" | "icon";
}

export default function WishlistButton({ productId, productName, variant = "default" }: WishlistButtonProps) {
  const { isSignedIn } = useAuth();
  const { requestAuth } = useAuthModal();
  const { confirm } = useConfirmDialog();
  const { isInWishlist, addItem, removeItem } = useWishlist();
  const saved = isInWishlist(productId);

  function handleClick(e: MouseEvent<HTMLButtonElement>) {
    // WishlistButton is often nested inside a card that's itself a link
    // (ProductCard's image/name links to the product) — stop the click
    // from also activating that link underneath it.
    e.preventDefault();
    e.stopPropagation();
    if (!isSignedIn) {
      requestAuth({ actionReason: `save ${productName} to your wishlist` });
      return;
    }
    if (saved) {
      confirm({
        title: "Remove from Wishlist",
        message: `Remove ${productName} from your wishlist?`,
        confirmLabel: "Remove",
        destructive: true,
        onConfirm: () => removeItem(productId),
      });
    } else {
      addItem(productId);
    }
  }

  const btnClassName =
    variant === "compact" ? styles.compactBtn : variant === "icon" ? styles.iconBtn : styles.defaultBtn;
  // Both icon-only variants need a real accessible name since neither
  // renders the visible "Save"/"Saved" text the default variant relies
  // on for that.
  const needsAriaLabel = variant === "compact" || variant === "icon";

  return (
    <button
      type="button"
      className={`${btnClassName} ${saved ? styles.saved : ""}`}
      aria-pressed={saved}
      aria-label={needsAriaLabel ? `${saved ? "Remove" : "Save"} ${productName} ${saved ? "from" : "to"} wishlist` : undefined}
      onClick={handleClick}
    >
      <Heart
        size={variant === "compact" ? 16 : variant === "icon" ? 22 : 18}
        aria-hidden="true"
        fill={saved ? "currentColor" : "none"}
      />
      {variant === "default" && <span>{saved ? "Saved" : "Save"}</span>}
    </button>
  );
}
