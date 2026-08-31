"use client";

// components/ReviewCard.tsx — one customer review: proper star icons
// (replacing the old plain-text ★/☆ characters) plus a "Helpful" vote,
// gated by sign-in per this app's account-gating rule (see AuthContext)
// — voting on a review is inherently account-specific, there's nowhere
// else to attach it, so unlike Add to Cart it's fair to ask first.
//
// No reviewer name/"Verified Buyer" badge here on purpose: the review
// data (services/productData.ts's REVIEW_TEMPLATES) has no per-review
// author or purchase-verification info, and inventing one would be
// exactly the kind of unbacked claim this project's product-detail
// audit already went through and removed elsewhere (see
// CATEGORY_SPEC_DEFAULTS/getSpecs in services/).
import { useEffect, useState } from "react";
import { Star, ThumbsUp } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useAuthModal } from "@/context/AuthModalContext";
import { hashStr } from "@/services/productService";
import styles from "./ReviewCard.module.css";

interface ReviewCardProps {
  reviewId: string;
  stars: number;
  text: string;
}

const VOTES_KEY = "review-helpful-votes";

function readVotedSet(): Set<string> {
  try {
    const raw = window.localStorage.getItem(VOTES_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

export default function ReviewCard({ reviewId, stars, text }: ReviewCardProps) {
  const { isSignedIn } = useAuth();
  const { requestAuth } = useAuthModal();
  const [voted, setVoted] = useState(false);

  // Read the one-time localStorage snapshot after mount (can't run
  // during SSR — no window there). voted starts false in both the
  // server render and this first client render, so there's no
  // hydration-mismatch warning; this effect only updates it afterward.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVoted(readVotedSet().has(reviewId));
  }, [reviewId]);

  // Stable, plausible-looking base count — real review UIs show
  // helpful counts left by OTHER shoppers, which this app has no
  // backend to actually source. Deriving it from the review's own id
  // (not Math.random()) keeps it identical on every load instead of
  // reshuffling, and identical between server and client render.
  const baseCount = 3 + (hashStr(reviewId) % 40);
  const displayCount = baseCount + (voted ? 1 : 0);

  function handleHelpfulClick() {
    if (!isSignedIn) {
      requestAuth({ actionReason: "mark this review as helpful" });
      return;
    }
    const next = !voted;
    setVoted(next);
    const set = readVotedSet();
    if (next) set.add(reviewId);
    else set.delete(reviewId);
    window.localStorage.setItem(VOTES_KEY, JSON.stringify([...set]));
  }

  return (
    <li className={styles.reviewItem}>
      <div className={styles.starRow} role="img" aria-label={`${stars} out of 5 stars`}>
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            size={16}
            aria-hidden="true"
            className={i < stars ? styles.starFilled : styles.starEmpty}
            fill={i < stars ? "currentColor" : "none"}
          />
        ))}
      </div>

      <p className={styles.reviewText}>{text}</p>

      <button
        type="button"
        className={`${styles.helpfulBtn} ${voted ? styles.helpfulBtnActive : ""}`}
        aria-pressed={voted}
        onClick={handleHelpfulClick}
      >
        <ThumbsUp size={14} aria-hidden="true" fill={voted ? "currentColor" : "none"} />
        Helpful ({displayCount})
      </button>
    </li>
  );
}
