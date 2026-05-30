"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronUp, ChevronDown, Trash2, Plus, X } from "lucide-react";
import type { ExternalLinkKind } from "@prisma/client";
import {
  EXTERNAL_LINK_KIND_META,
  EXTERNAL_LINK_KIND_ORDER,
} from "@/app/lib/external-link-kinds";
import {
  addExternalLink,
  deleteExternalLink,
  reorderExternalLinks,
} from "./external-links";
import type { ExternalLinkRow } from "./external-links-config";

type Props = {
  initialLinks: ExternalLinkRow[];
  /** Set in the parent server component — kept as a hard ceiling so the
   *  client UI shows "5 / 5" before the server action rejects the add. */
  maxLinks: number;
};

/**
 * Manage the calling creator's external profile links.
 *
 * Layout: a stacked list of the current links (kind icon + URL + reorder
 * arrows + delete), with an "Add a link" button that toggles a small inline
 * form. Reordering is up/down buttons instead of drag-and-drop — at the
 * current 5-link cap, drag wouldn't be meaningfully better and would pull
 * in a dnd library for a single feature.
 *
 * Optimistic updates aren't worth it here — server actions paired with
 * router.refresh() round-trip in well under 200 ms locally and the user is
 * mid-flow (editing their own profile), so a small flash of "Saving…" reads
 * as truth, not as lag.
 */
export function ExternalLinksEditor({ initialLinks, maxLinks }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const canAddMore = initialLinks.length < maxLinks;

  // Optimistic ordering state. We mirror initialLinks in component state so
  // the up/down buttons feel instant; the actual reorder server action then
  // persists the new ordering on the next paint via router.refresh().
  const [orderedLinks, setOrderedLinks] = useState(initialLinks);

  // Re-sync if the parent's links change (after an add/delete refreshes
  // the page). This keeps the editor honest when other tabs or background
  // revalidations land.
  if (
    orderedLinks.length !== initialLinks.length ||
    !orderedLinks.every((l, i) => l.id === initialLinks[i].id)
  ) {
    setOrderedLinks(initialLinks);
  }

  const handleMove = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= orderedLinks.length) return;
    const next = [...orderedLinks];
    [next[index], next[target]] = [next[target], next[index]];
    setOrderedLinks(next);
    setError(null);
    startTransition(async () => {
      const result = await reorderExternalLinks(next.map((l) => l.id));
      if (!result.ok) {
        setError(result.error);
        // Revert on failure
        setOrderedLinks(orderedLinks);
      } else {
        router.refresh();
      }
    });
  };

  const handleDelete = (linkId: number) => {
    setError(null);
    startTransition(async () => {
      const result = await deleteExternalLink(linkId);
      if (!result.ok) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="text-[13px] font-semibold text-white tracking-tight">
            External links
          </h2>
          <p className="text-[11.5px] text-white/35 mt-0.5">
            Show visitors where else to find you. Up to {maxLinks} links.
          </p>
        </div>
        <span className="text-[11px] text-white/30 font-mono">
          {orderedLinks.length} / {maxLinks}
        </span>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-md border border-rose-500/40 bg-rose-500/8 px-3 py-2 text-[12px] text-rose-200"
        >
          {error}
        </div>
      )}

      {orderedLinks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/15 bg-white/2 px-4 py-6 text-center">
          <p className="text-[12.5px] text-white/45">
            No external links yet. Add one below to show visitors your other
            channels.
          </p>
        </div>
      ) : (
        <ul className="space-y-2" aria-label="Your external links">
          {orderedLinks.map((link, idx) => {
            const meta = EXTERNAL_LINK_KIND_META[link.kind];
            const Icon = meta.icon;
            return (
              <li
                key={link.id}
                className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/3 px-3 py-2"
              >
                <span
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md"
                  style={{
                    background: `${meta.accent}1a`,
                    color: meta.accent,
                  }}
                  aria-hidden
                >
                  <Icon size={14} strokeWidth={2.2} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-medium text-white">
                    {meta.label}
                  </div>
                  <div className="text-[11px] text-white/50 truncate font-mono">
                    {link.url}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleMove(idx, -1)}
                    disabled={isPending || idx === 0}
                    aria-label="Move up"
                    className="h-7 w-7 inline-flex items-center justify-center rounded-md text-white/55 hover:text-white hover:bg-white/8 disabled:opacity-25 disabled:hover:bg-transparent transition"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMove(idx, 1)}
                    disabled={isPending || idx === orderedLinks.length - 1}
                    aria-label="Move down"
                    className="h-7 w-7 inline-flex items-center justify-center rounded-md text-white/55 hover:text-white hover:bg-white/8 disabled:opacity-25 disabled:hover:bg-transparent transition"
                  >
                    <ChevronDown size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(link.id)}
                    disabled={isPending}
                    aria-label="Delete link"
                    className="h-7 w-7 inline-flex items-center justify-center rounded-md text-rose-300/70 hover:text-rose-300 hover:bg-rose-500/10 disabled:opacity-25 transition"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {canAddMore && !addOpen && (
        <button
          type="button"
          onClick={() => {
            setAddOpen(true);
            setError(null);
          }}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/12 bg-white/3 px-3 py-2 text-[12px] font-semibold text-white/80 hover:border-purple-500/50 hover:text-white transition"
        >
          <Plus size={13} />
          Add a link
        </button>
      )}

      {canAddMore && addOpen && (
        <AddLinkForm
          onCancel={() => setAddOpen(false)}
          onSuccess={() => {
            setAddOpen(false);
            router.refresh();
          }}
          onError={(e) => setError(e)}
        />
      )}

      {!canAddMore && (
        <p className="text-[11px] text-white/35">
          You&apos;ve reached the {maxLinks}-link limit. Delete one to add another.
        </p>
      )}
    </section>
  );
}

/**
 * Inline "add a link" form: kind dropdown + URL input + Save/Cancel.
 * Owned by ExternalLinksEditor so the parent can replace the trigger
 * button with the form in place (less layout shift than a modal).
 */
function AddLinkForm({
  onCancel,
  onSuccess,
  onError,
}: {
  onCancel: () => void;
  onSuccess: () => void;
  onError: (e: string) => void;
}) {
  const [kind, setKind] = useState<ExternalLinkKind>("INSTAGRAM");
  const [url, setUrl] = useState("");
  const [isPending, startTransition] = useTransition();

  const meta = EXTERNAL_LINK_KIND_META[kind];

  const handleSave = () => {
    onError("");
    startTransition(async () => {
      const result = await addExternalLink(kind, url);
      if (!result.ok) {
        onError(result.error);
      } else {
        setUrl("");
        onSuccess();
      }
    });
  };

  return (
    <div className="rounded-lg border border-purple-500/30 bg-purple-500/4 p-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-mono uppercase tracking-wider text-purple-300">
          New link
        </span>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel"
          className="h-6 w-6 inline-flex items-center justify-center rounded-md text-white/45 hover:text-white hover:bg-white/8 transition"
        >
          <X size={13} />
        </button>
      </div>

      <div className="grid grid-cols-[140px_1fr] gap-2">
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as ExternalLinkKind)}
          disabled={isPending}
          aria-label="Link kind"
          className="rounded-lg border border-white/8 bg-white/3 px-2.5 py-2 text-[12.5px] text-white focus:outline-none focus:border-purple-500/50 transition"
        >
          {EXTERNAL_LINK_KIND_ORDER.map((k) => (
            <option key={k} value={k}>
              {EXTERNAL_LINK_KIND_META[k].label}
            </option>
          ))}
        </select>
        <input
          type="url"
          inputMode="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={isPending}
          placeholder={meta.hint}
          aria-label="Link URL"
          className="rounded-lg border border-white/8 bg-white/3 px-3 py-2 text-[12.5px] text-white placeholder-white/25 focus:outline-none focus:border-purple-500/50 transition font-mono"
        />
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="px-3 py-1.5 text-[12px] text-white/55 hover:text-white transition"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || url.trim().length === 0}
          className="rounded-md bg-purple-600 hover:bg-purple-500 disabled:opacity-50 px-3 py-1.5 text-[12px] font-semibold text-white transition"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
