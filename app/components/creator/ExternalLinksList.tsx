import type { ExternalLinkKind } from "@prisma/client";
import { EXTERNAL_LINK_KIND_META } from "@/app/lib/external-link-kinds";

export type PublicExternalLink = {
  id: number;
  kind: ExternalLinkKind;
};

type Props = {
  links: PublicExternalLink[];
};

/**
 * Public-profile renderer for a creator's external links.
 *
 * Each link is a labeled, brand-tinted chip. Tapping it navigates to
 * /api/link-click/[id] which records an `external_link_click` analytics
 * event and 302-redirects to the stored URL. We never expose the raw URL
 * in the DOM — that keeps the redirect path the only way to reach it
 * (so the click always gets tracked) and means a scraper can't bypass
 * analytics by reading the href directly.
 *
 * Renders nothing when the creator has no links. The parent decides
 * whether to render a section heading; this component only owns the chips.
 */
export function ExternalLinksList({ links }: Props) {
  if (links.length === 0) return null;

  return (
    <div className="mn-external-links">
      {links.map((link) => {
        const meta = EXTERNAL_LINK_KIND_META[link.kind];
        const Icon = meta.icon;
        return (
          <a
            key={link.id}
            href={`/api/link-click/${link.id}`}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="mn-external-link"
            style={{
              borderColor: `${meta.accent}40`,
              color: meta.accent,
            }}
            aria-label={`Open ${meta.label} (opens in a new tab)`}
          >
            <Icon size={14} strokeWidth={2.2} aria-hidden />
            <span className="mn-external-link__label">{meta.label}</span>
          </a>
        );
      })}

      <style>{`
        .mn-external-links {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .mn-external-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 12px;
          border-radius: 999px;
          border: 1px solid;
          background: rgba(255, 255, 255, 0.02);
          text-decoration: none;
          font-family: var(--font-dm-mono);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.06em;
          line-height: 1;
          transition: background 0.18s ease, transform 0.15s ease;
          /* Each chip has its own accent color set inline by the parent
             via the style prop — keeps the brand hue consistent without
             hardcoding eight color classes. */
        }
        .mn-external-link:hover {
          background: rgba(255, 255, 255, 0.05);
          transform: translateY(-1px);
        }
        .mn-external-link__label {
          letter-spacing: -0.01em;
          /* Body font for the label is more readable than mono at this
             small size; the icon + brand color carries the recognition. */
          font-family: var(--font-dm-sans);
          font-size: 12.5px;
          font-weight: 600;
          letter-spacing: -0.005em;
        }
      `}</style>
    </div>
  );
}
