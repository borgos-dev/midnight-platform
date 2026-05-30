"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import {
  MIN_RATING,
  MAX_RATING,
  COMMENT_MAX_LENGTH,
} from "@/app/lib/reviews-config";
import { submitReview } from "@/app/actions/reviews";

type Props = {
  creatorprofileId: number;
  creatorName: string;
  /** Pre-filled values when the visitor already has a review (lets them
   *  edit instead of starting fresh). Null when this is a first-time review. */
  initial: { rating: number; comment: string | null } | null;
};

/**
 * Inline review form at the bottom of the creator profile.
 *
 * UX notes:
 *   - Star picker is the primary input — five clickable stars + a clear
 *     button. Tab-accessible, keyboard arrows nudge the rating.
 *   - Comment is optional. We tell the visitor explicitly that the
 *     comment goes through moderation while the star posts immediately —
 *     transparency around the hybrid policy.
 *   - On submit, the form stays mounted with the saved values so the
 *     visitor can re-edit if they want. Success/pending state shown
 *     inline; no toast / modal.
 */
export function ReviewForm({ creatorprofileId, creatorName, initial }: Props) {
  const router = useRouter();
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [comment, setComment] = useState(initial?.comment ?? "");
  const [hoverRating, setHoverRating] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ pendingComment: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();

  const showRating = hoverRating || rating;
  const isEditing = initial !== null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(null);
    if (rating < MIN_RATING) {
      setError("Pick a rating before submitting.");
      return;
    }
    startTransition(async () => {
      const result = await submitReview(creatorprofileId, rating, comment);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved({ pendingComment: result.pendingComment });
      // Refresh so the new average + count are picked up on the next paint.
      router.refresh();
    });
  };

  return (
    <section className="mn-review-form" aria-label={`Leave a review for ${creatorName}`}>
      <h2 className="mn-review-form__heading">
        {isEditing ? "Update your review" : `Review ${creatorName}`}
      </h2>
      <p className="mn-review-form__sub">
        Your star rating goes live right away. If you leave a comment, an
        admin reviews it before it appears on the profile.
      </p>

      <form onSubmit={handleSubmit} className="mn-review-form__body">
        {/* Star picker */}
        <div className="mn-review-form__row">
          <span className="mn-review-form__label">Your rating</span>
          <div
            role="radiogroup"
            aria-label="Star rating"
            className="mn-review-form__stars"
            onMouseLeave={() => setHoverRating(0)}
          >
            {[1, 2, 3, 4, 5].map((value) => {
              const isFilled = value <= showRating;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={value === rating}
                  aria-label={`${value} star${value === 1 ? "" : "s"}`}
                  onClick={() => setRating(value)}
                  onMouseEnter={() => setHoverRating(value)}
                  onFocus={() => setHoverRating(value)}
                  onBlur={() => setHoverRating(0)}
                  className="mn-review-form__star"
                >
                  <Star
                    size={26}
                    strokeWidth={isFilled ? 0 : 1.6}
                    style={{
                      color: isFilled ? "#E6A817" : "rgba(255,255,255,0.22)",
                      fill: isFilled ? "#E6A817" : "transparent",
                      transition: "color 0.15s ease, fill 0.15s ease",
                    }}
                  />
                </button>
              );
            })}
            {rating > 0 && (
              <button
                type="button"
                onClick={() => setRating(0)}
                className="mn-review-form__clear"
                aria-label="Clear rating"
              >
                clear
              </button>
            )}
          </div>
        </div>

        {/* Comment */}
        <div className="mn-review-form__row">
          <label htmlFor="review-comment" className="mn-review-form__label">
            Comment <span className="mn-review-form__optional">(optional)</span>
          </label>
          <textarea
            id="review-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={COMMENT_MAX_LENGTH}
            placeholder="Share what made this booking special, or what to look out for. Comments go through moderation before they appear."
            rows={3}
            className="mn-review-form__textarea"
          />
          <div className="mn-review-form__counter">
            {comment.length} / {COMMENT_MAX_LENGTH}
          </div>
        </div>

        {error && (
          <div role="alert" className="mn-review-form__error">
            {error}
          </div>
        )}

        {saved && (
          <div role="status" className="mn-review-form__success">
            {saved.pendingComment
              ? `Thanks — your ${rating}-star rating is live. The comment is queued for moderation.`
              : `Thanks — your ${rating}-star rating is live.`}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending || rating < MIN_RATING || rating > MAX_RATING}
          className="mn-review-form__submit"
        >
          {isPending
            ? "Saving…"
            : isEditing
              ? "Update review"
              : "Submit review"}
        </button>
      </form>

      <style>{`
        .mn-review-form {
          margin-top: 24px;
          padding: 20px;
          border-radius: 14px;
          border: 1px solid var(--border);
          background: var(--bg-surface);
        }
        .mn-review-form__heading {
          font-family: var(--font-cormorant);
          font-size: 20px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 4px;
          letter-spacing: -0.01em;
        }
        .mn-review-form__sub {
          font-family: var(--font-dm-sans);
          font-size: 12px;
          color: var(--text-muted);
          line-height: 1.5;
          margin: 0 0 16px;
        }
        .mn-review-form__body {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .mn-review-form__row {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .mn-review-form__label {
          font-family: var(--font-dm-mono);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.12em;
          color: var(--text-secondary);
          text-transform: uppercase;
        }
        .mn-review-form__optional {
          font-weight: 500;
          color: var(--text-muted);
          text-transform: none;
          letter-spacing: 0.02em;
        }
        .mn-review-form__stars {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .mn-review-form__star {
          background: transparent;
          border: none;
          padding: 4px;
          cursor: pointer;
          transition: transform 0.12s ease;
        }
        .mn-review-form__star:hover {
          transform: translateY(-1px);
        }
        .mn-review-form__clear {
          margin-left: 8px;
          padding: 4px 8px;
          background: transparent;
          border: none;
          color: var(--text-muted);
          font-family: var(--font-dm-mono);
          font-size: 10px;
          letter-spacing: 0.08em;
          cursor: pointer;
        }
        .mn-review-form__clear:hover {
          color: var(--text-primary);
        }
        .mn-review-form__textarea {
          width: 100%;
          padding: 12px;
          border-radius: 10px;
          border: 1px solid var(--border-strong);
          background: rgba(255, 255, 255, 0.02);
          color: var(--text-primary);
          font-family: var(--font-dm-sans);
          font-size: 13px;
          line-height: 1.5;
          resize: vertical;
          min-height: 80px;
          transition: border-color 0.18s ease;
        }
        .mn-review-form__textarea:focus {
          outline: none;
          border-color: var(--accent-purple);
        }
        .mn-review-form__counter {
          align-self: flex-end;
          font-family: var(--font-dm-mono);
          font-size: 10px;
          color: var(--text-muted);
        }
        .mn-review-form__error {
          padding: 10px 12px;
          border-radius: 8px;
          background: rgba(232, 84, 122, 0.08);
          border: 1px solid rgba(232, 84, 122, 0.30);
          color: #E8547A;
          font-family: var(--font-dm-sans);
          font-size: 12.5px;
        }
        .mn-review-form__success {
          padding: 10px 12px;
          border-radius: 8px;
          background: rgba(92, 184, 138, 0.08);
          border: 1px solid rgba(92, 184, 138, 0.30);
          color: #5CB88A;
          font-family: var(--font-dm-sans);
          font-size: 12.5px;
          line-height: 1.5;
        }
        .mn-review-form__submit {
          align-self: flex-end;
          padding: 11px 22px;
          border: none;
          border-radius: 10px;
          background: linear-gradient(135deg, var(--accent-purple), #7c3aed);
          color: #fff;
          font-family: var(--font-dm-mono);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.10em;
          text-transform: uppercase;
          cursor: pointer;
          box-shadow: 0 6px 20px rgba(168, 85, 247, 0.32);
          transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
        }
        .mn-review-form__submit:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 10px 28px rgba(168, 85, 247, 0.42);
        }
        .mn-review-form__submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </section>
  );
}
