"use client";

import { useState, useRef } from "react";
import { X } from "lucide-react";

export const MAX_TAGS = 10;
export const MAX_TAG_LEN = 30;

type Props = {
  defaultValue: string[];
};

/**
 * Free-text tag input. Type a tag, press Enter (or comma) to commit it as
 * a chip. Each committed tag becomes a hidden `<input name="customTags">`
 * so `formData.getAll("customTags")` picks them all up on the server with
 * no JSON round-trip — same FormData pattern as the CategoryPicker.
 *
 * UX rules:
 *   - Max 10 tags; once hit, input is disabled with a counter hint
 *   - Max 30 chars per tag; longer pastes are clipped on commit
 *   - Trimmed + de-duped against existing tags
 *   - Backspace on empty input removes the most recent tag (handy after a
 *     mistake)
 *   - Comma also commits the current draft so creators who paste
 *     "Massage, Roleplay, Webcam" get three chips
 */
export function TagsInput({ defaultValue }: Props) {
  // We seed state from the initial server value. After that, this state
  // is the source of truth for both display + form submission (via the
  // hidden inputs rendered below).
  const [tags, setTags] = useState<string[]>(() =>
    Array.from(new Set(defaultValue.map((t) => t.trim()).filter(Boolean))),
  );
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const atCap = tags.length >= MAX_TAGS;

  function commit() {
    const cleaned = draft.trim().slice(0, MAX_TAG_LEN);
    if (!cleaned) {
      setDraft("");
      return;
    }
    if (tags.includes(cleaned)) {
      // Already present — silently swallow the duplicate, clear input
      setDraft("");
      return;
    }
    if (atCap) {
      setDraft("");
      return;
    }
    setTags((prev) => [...prev, cleaned]);
    setDraft("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit();
    } else if (e.key === "Backspace" && draft.length === 0 && tags.length > 0) {
      // Power-user shortcut: empty input + backspace → remove last tag
      setTags((prev) => prev.slice(0, -1));
    }
  }

  function removeTag(index: number) {
    setTags((prev) => prev.filter((_, i) => i !== index));
    // Return focus to the input so the next remove / type flows
    inputRef.current?.focus();
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
            maxWidth: "440px",
          }}
        >
          Your own keywords that appear on your public profile. Press Enter
          or comma to add. Visible to visitors but not used for filtering.
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
          {tags.length} / {MAX_TAGS}
        </span>
      </div>

      <div
        onClick={() => inputRef.current?.focus()}
        className="tags-input"
        // The container looks like a single input even though it's not —
        // tag chips and the live input share the same box.
      >
        {tags.map((t, i) => (
          <span key={`${t}-${i}`} className="tag-chip">
            {t}
            <button
              type="button"
              onClick={() => removeTag(i)}
              aria-label={`Remove tag ${t}`}
              className="tag-chip__remove"
            >
              <X size={11} strokeWidth={2.5} />
            </button>
            {/* Hidden form input that ships this tag's value on submit.
                Multiple inputs with the same name → formData.getAll() picks
                them up as an array server-side. No JSON.stringify needed. */}
            <input type="hidden" name="customTags" value={t} />
          </span>
        ))}

        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, MAX_TAG_LEN))}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            // Commit on blur so the creator doesn't lose a typed tag if
            // they tab away without pressing Enter.
            if (draft.trim()) commit();
          }}
          disabled={atCap && draft.length === 0}
          placeholder={
            atCap
              ? `${MAX_TAGS} tags is the limit`
              : tags.length === 0
                ? "Add a tag, e.g. \"Outcalls\" or \"Bilingual\""
                : "Add another…"
          }
          className="tag-input__field"
          maxLength={MAX_TAG_LEN}
        />
      </div>

      <style>{`
        .tags-input {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          padding: 8px 10px;
          border-radius: 10px;
          border: 1px solid var(--border-strong);
          background: var(--bg-surface);
          min-height: 44px;
          align-items: center;
          cursor: text;
          transition: border-color 0.18s ease;
        }
        .tags-input:focus-within {
          border-color: var(--accent-purple);
        }

        .tag-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 4px 4px 10px;
          border-radius: 999px;
          background: rgba(168, 85, 247, 0.16);
          border: 1px solid rgba(168, 85, 247, 0.4);
          color: #fff;
          font-family: var(--font-dm-sans);
          font-size: 12.5px;
          font-weight: 500;
          letter-spacing: -0.01em;
        }
        .tag-chip__remove {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: rgba(168, 85, 247, 0.25);
          border: none;
          color: #fff;
          cursor: pointer;
          padding: 0;
          transition: background 0.15s ease;
        }
        .tag-chip__remove:hover {
          background: rgba(168, 85, 247, 0.45);
        }

        .tag-input__field {
          flex: 1;
          min-width: 140px;
          padding: 6px 4px;
          background: transparent;
          border: none;
          color: var(--text-primary);
          font-family: var(--font-dm-sans);
          font-size: 14px;
          outline: none;
        }
        .tag-input__field::placeholder {
          color: var(--text-muted);
        }
        .tag-input__field:disabled {
          opacity: 0.5;
        }
      `}</style>
    </div>
  );
}
