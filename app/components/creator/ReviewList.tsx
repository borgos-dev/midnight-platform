import { RatingStars } from "./RatingStars";
import type { PublicReviewRow } from "@/app/lib/reviews-config";

type Props = {
  reviews: PublicReviewRow[];
};

/**
 * Public review list shown on the creator profile.
 *
 * Each row shows the star rating + (if approved) the comment. Rows where
 * the comment is still pending or was rejected still appear — the star
 * counts in the public average, and visitors seeing several star-only
 * rows know engagement exists even if specific comments aren't approved
 * yet. Server-side filtering already strips comment text from non-
 * COMMENT_APPROVED rows so unmoderated text never reaches the client.
 */
export function ReviewList({ reviews }: Props) {
  if (reviews.length === 0) {
    return (
      <div className="mn-review-list mn-review-list--empty">
        <p>
          No reviews yet. Be the first to leave one — your star helps other
          visitors decide.
        </p>
        <style>{`
          .mn-review-list--empty {
            margin-top: 8px;
            padding: 22px;
            border-radius: 14px;
            border: 1px dashed var(--border-strong);
            background: rgba(255, 255, 255, 0.015);
            text-align: center;
          }
          .mn-review-list--empty p {
            margin: 0;
            font-family: var(--font-dm-sans);
            font-size: 13px;
            color: var(--text-muted);
            line-height: 1.6;
          }
        `}</style>
      </div>
    );
  }

  return (
    <ul className="mn-review-list" aria-label="Visitor reviews">
      {reviews.map((review) => (
        <li key={review.id} className="mn-review-list__item">
          <header className="mn-review-list__head">
            <RatingStars rating={review.rating} size={14} />
            <time
              dateTime={review.createdAt.toISOString()}
              className="mn-review-list__date"
            >
              {formatRelative(review.createdAt)}
            </time>
          </header>
          {review.comment && (
            <p className="mn-review-list__comment">{review.comment}</p>
          )}
        </li>
      ))}

      <style>{`
        .mn-review-list {
          list-style: none;
          padding: 0;
          margin: 8px 0 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .mn-review-list__item {
          padding: 12px 14px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.025);
          border: 1px solid var(--border);
        }
        .mn-review-list__head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 6px;
        }
        .mn-review-list__date {
          font-family: var(--font-dm-mono);
          font-size: 10px;
          color: var(--text-muted);
          letter-spacing: 0.04em;
        }
        .mn-review-list__comment {
          font-family: var(--font-dm-sans);
          font-size: 13px;
          line-height: 1.55;
          color: var(--text-secondary);
          margin: 0;
          white-space: pre-wrap;
          word-wrap: break-word;
        }
      `}</style>
    </ul>
  );
}

/**
 * Coarse relative date — "2d ago", "3w ago", "5mo ago". Avoids importing
 * a date library for one display string. Mirrors the brevity convention
 * used elsewhere on the dashboard (NN/g pattern: brief context > absolute
 * date on small surfaces).
 */
function formatRelative(date: Date): string {
  const diff = Date.now() - date.getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;
  if (diff < hour) return `${Math.max(1, Math.floor(diff / minute))}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < week) return `${Math.floor(diff / day)}d ago`;
  if (diff < month) return `${Math.floor(diff / week)}w ago`;
  if (diff < year) return `${Math.floor(diff / month)}mo ago`;
  return `${Math.floor(diff / year)}y ago`;
}
