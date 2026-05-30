"use client";

import { useState } from "react";

/** Hard cap on how many categories a creator can self-assign. Keeps the
 *  taxonomy meaningful — without a cap creators tag everything for visibility
 *  and the category pills lose their filtering value. Matches yamohub-style
 *  "pick your top 5" UX. */
export const MAX_CATEGORIES = 5;

type CategoryOption = {
  slug: string;
  label: string;
};

type Props = {
  categories: CategoryOption[];
  defaultSelected: string[];
};

/**
 * Multi-select category picker rendered as toggleable pills. Each pill is
 * actually a `<label>` wrapping a hidden checkbox named `categorySlugs[]`
 * so the form submits as a multi-value field that `formData.getAll()` can
 * read directly on the server — no JSON encoding needed.
 *
 * UX rules:
 *   - Cap at MAX_CATEGORIES. Once hit, unchecked pills go disabled so
 *     visitors see they need to deselect something to add more.
 *   - "X / N selected" counter sits above the row.
 */
export function CategoryPicker({ categories, defaultSelected }: Props) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(defaultSelected),
  );

  const atCap = selected.size >= MAX_CATEGORIES;

  function toggle(slug: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else if (next.size < MAX_CATEGORIES) {
        next.add(slug);
      }
      return next;
    });
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "6px",
        }}
      >
        <p
          style={{
            fontSize: "11px",
            color: "var(--text-muted)",
            fontFamily: "var(--font-dm-sans)",
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          Pick up to {MAX_CATEGORIES} categories that match what you offer.
          Visitors filter the homepage grid by these.
        </p>
        <span
          style={{
            fontFamily: "var(--font-dm-mono)",
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.08em",
            color: atCap ? "var(--accent-purple)" : "var(--text-muted)",
            whiteSpace: "nowrap",
            marginLeft: "12px",
          }}
        >
          {selected.size} / {MAX_CATEGORIES}
        </span>
      </div>

      <div className="category-picker">
        {categories.map((c) => {
          const isSelected = selected.has(c.slug);
          const isDisabled = !isSelected && atCap;
          return (
            <label
              key={c.slug}
              className={`category-pill ${isSelected ? "category-pill--active" : ""} ${
                isDisabled ? "category-pill--disabled" : ""
              }`}
            >
              <input
                type="checkbox"
                name="categorySlugs"
                value={c.slug}
                checked={isSelected}
                onChange={() => toggle(c.slug)}
                disabled={isDisabled}
                style={{
                  position: "absolute",
                  width: 1,
                  height: 1,
                  padding: 0,
                  margin: -1,
                  overflow: "hidden",
                  clip: "rect(0, 0, 0, 0)",
                  whiteSpace: "nowrap",
                  border: 0,
                }}
              />
              {c.label}
            </label>
          );
        })}
      </div>

      <style>{`
        .category-picker {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .category-pill {
          display: inline-flex;
          align-items: center;
          padding: 7px 13px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: var(--bg-surface);
          color: var(--text-secondary);
          font-family: var(--font-dm-sans);
          font-size: 12.5px;
          font-weight: 500;
          letter-spacing: -0.01em;
          cursor: pointer;
          user-select: none;
          transition: border-color 0.18s ease, background 0.18s ease,
            color 0.18s ease, opacity 0.18s ease;
        }
        .category-pill:hover {
          border-color: rgba(168, 85, 247, 0.4);
          color: var(--text-primary);
        }
        .category-pill--active {
          border-color: var(--accent-purple);
          background: rgba(168, 85, 247, 0.16);
          color: #fff;
        }
        .category-pill--active:hover {
          background: rgba(168, 85, 247, 0.22);
        }
        .category-pill--disabled {
          cursor: not-allowed;
          opacity: 0.4;
        }
        .category-pill--disabled:hover {
          border-color: var(--border);
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
}
