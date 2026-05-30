# Midnight Button — Design System

The single source of truth for `<Button>` in this app. If you find yourself adding a one-off button style outside this component, read this doc first; the variant you're reaching for probably already exists.

## Anatomy

```
┌──────────────────────────────┐
│  [icon]  Label text  [icon]  │
└──────────────────────────────┘
```

- One component, one DOM element (`<button>`).
- Optional `leftIcon` and `rightIcon`.
- Optional `loading` swaps the children for a spinner without changing the button's width.

## Variants (5)

A button has exactly one variant. Pick by the user's intent, not by what color you want.

| Variant     | Use for                                                | Visual signal                      |
| ----------- | ------------------------------------------------------ | ---------------------------------- |
| `primary`   | The single most important action on the screen         | Brand purple, shadow glow          |
| `primary-lighter` | A/B test arm for `primary` — see "A/B testing the primary CTA" below | Lighter purple, off-white text  |
| `secondary` | Equal-priority alternative to primary, or "less than"  | Subtle bordered surface            |
| `danger`    | Destructive action (delete, ban, cancel subscription)  | Rose/red, shadow glow              |
| `ghost`     | Tertiary action, icon-only buttons, "Cancel" in modals | Transparent until hover            |
| `gold`      | VIP+ elite contexts (premium content, premium actions) | Gold gradient on dark text         |

**Rules:**

- **At most one `primary` button per visible screen state.** If you need a second equally-important action, one of them is actually `secondary`.
- **`gold` is not a tier of `primary`.** It's a brand signal for VIP+ contexts. Don't use `gold` just because you want the button to stand out — use it when the action is *about* premium/VIP+.
- **`danger` is for destructive actions only.** "Submit" is never danger. "Delete account" always is.
- **`ghost` is for low-emphasis actions.** "Cancel" in a confirm dialog. The X close button on a modal. Filter chips. Never the only action a user is supposed to take.

## Sizes (3)

| Size | Height | Padding | Text   | Use for                                                |
| ---- | ------ | ------- | ------ | ------------------------------------------------------ |
| `sm` | 32 px  | 12 px   | xs     | Toolbars, table rows, filter chips, secondary toolbars |
| `md` | 40 px  | 16 px   | sm     | **Default.** Forms, dialog footers, in-page CTAs       |
| `lg` | 48 px  | 24 px   | base   | The one hero conversion CTA per page                   |

**Rules:**

- **Default to `md`.** Don't pick a size; let the default work.
- **At most one `lg` button per screen.** Two `lg` buttons defeat the hierarchy.
- **`gold` should never be `sm`.** Premium content gets premium real estate.
- **All buttons in a group share a size.** A toolbar with mixed `sm` and `md` looks broken.

## States (6)

Each variant must render all six states. The component handles this; do not re-implement.

| State            | Behavior                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| `default`        | At rest.                                                                                          |
| `hover`          | Brighten base color ~10%; pump shadow for primary/danger/gold. No-op on touch.                    |
| `focus-visible`  | 2px ring of variant accent at 60% opacity, 2px offset. **Keyboard only — never on mouse click.**  |
| `active`         | `scale-[0.97]` + slight brightness drop. Transition ≤100ms.                                       |
| `disabled`       | 50% opacity, `cursor-not-allowed`, no hover/active reactions.                                     |
| `loading`        | Children replaced with spinner. Button width is unchanged. `aria-busy="true"`. Click is ignored.  |

**`:focus` vs `:focus-visible`:**

The component uses `focus-visible:` exclusively. If you reach for `focus:` somewhere, you'll get the ring on every mouse click — looks broken. Always `:focus-visible`.

**Disabled and accessibility:**

The standard HTML `disabled` attribute removes the button from focus order. This is correct for *most* cases. If you have a disabled button whose disabled-ness has an explainable cause ("fill in the form first"), prefer `aria-disabled="true"` + a click handler that explains, so screen reader users can land on it. The component does not currently expose `aria-disabled` separately — pass it via `...rest` if you need this pattern.

**Loading and layout:**

The spinner has the same line-height as the label, so the button's height stays fixed. The width may visually shrink slightly because the spinner is narrower than typical labels — to prevent layout shift between idle and loading, use `fullWidth` on submit buttons in forms, or set `min-w-*` from the parent.

## Spacing — the rule everyone breaks

**The Button has zero outer margin.** All spacing comes from the parent layout. This is non-negotiable; baking margin into the component creates spacing bugs in every consumer that doesn't want that margin.

| Context                          | Spacing pattern                                                       |
| -------------------------------- | --------------------------------------------------------------------- |
| Form footer                      | `mt-6` from last input; `gap-3` between buttons in the footer         |
| Dialog footer (right-aligned)    | `gap-2` between buttons; `mt-6` from content above                    |
| Hero CTA                         | `mt-8` to `mt-12` from headline                                       |
| Toolbar (icon buttons)           | `gap-1` (4 px)                                                        |
| Toolbar (labeled buttons)        | `gap-2` (8 px)                                                        |
| Vertical CTA stack               | `gap-3` (12 px) — anything tighter feels glued                        |
| Sticky bottom bar (mobile)       | `fullWidth` button; `p-4` around; `pb-[calc(env(safe-area-inset-bottom)+16px)]` |
| Inline action after a field      | `ml-2` from the trailing element                                      |

**Button ordering in dialogs (Western convention):**

Primary on the **right**:

```
[ Cancel ] [ Save ]
[ Cancel ] [ Delete ]   ← danger on the right; pattern still holds
```

This is contested. Pick one and enforce it; inconsistency within an app is worse than either choice.

## Examples

### A form submit button

```tsx
import { Button } from "@/app/components/ui/Button";

<form onSubmit={onSubmit}>
  {/* fields */}
  <div className="mt-6">
    <Button type="submit" loading={pending} fullWidth>
      Create account
    </Button>
  </div>
</form>
```

### A confirm dialog

```tsx
<div className="mt-6 flex justify-end gap-2">
  <Button variant="ghost" onClick={onCancel}>Cancel</Button>
  <Button variant="danger" onClick={onDelete}>Delete account</Button>
</div>
```

### A VIP+ unlock CTA

```tsx
<Button variant="gold" size="lg" fullWidth>
  Unlock VIP+ — 5,000 CFA / month
</Button>
```

### An icon button in a toolbar

```tsx
<Button variant="ghost" size="sm" aria-label="Close" leftIcon={<XIcon size={16} />} />
```

Note: an icon-only button still needs `aria-label`. Without it, screen readers announce nothing.

## Anti-patterns

These should fail code review.

1. **Two `primary` buttons in one view.** Pick one. The other becomes `secondary`.
2. **Margin baked into the Button.** Never. Spacing is the container's responsibility.
3. **`disabled` for "you haven't filled the form yet"** — users can't tell what's wrong. Either show validation errors or use `aria-disabled` + a click handler that explains.
4. **Tooltips on `disabled` buttons** — `disabled` removes the button from pointer events, so the tooltip never appears. Use `aria-disabled` for that case.
5. **Loading spinners that resize the button.** Width must stay fixed; otherwise sibling buttons jump.
6. **`focus:` instead of `focus-visible:`.** Causes the focus ring on every mouse click. Always `focus-visible:`.
7. **Custom one-off button styles in features** — if a variant doesn't exist, propose adding it to this component; don't fork it locally.

## API reference

```ts
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "gold"; // default: "primary"
  size?: "sm" | "md" | "lg";                                       // default: "md"
  loading?: boolean;                                               // default: false
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;                                             // default: false
};
```

Forwards refs. Defaults `type="button"` to prevent accidental form submission. Accepts every native `<button>` attribute via `...rest`.

## A/B testing the primary CTA

The `primary-lighter` variant exists for one reason: `primary` (purple-600 fill, white text) has a real WCAG trade-off. Its label contrast is ~5.4:1 (✓ AA), but its button-vs-background contrast is ~3.7:1 (just above the 3:1 floor for UI components). `primary-lighter` (purple-500 fill, purple-50 text) flips the trade-off — ~5.0:1 button-vs-background, ~4.6:1 label.

### How bucketing works

`app/lib/ab.ts` exports `getPrimaryButtonVariant({ userId })`. Use it at the server-component level and pass the result down to client components.

```ts
import { getPrimaryButtonVariant } from "@/app/lib/ab";

const primaryVariant = getPrimaryButtonVariant({ userId: viewer?.id });
```

- **Logged-in viewer with `userId`** → deterministic 50/50 split by `userId % 2`.
- **Anonymous viewer** (no `userId`) → falls back to control (`primary`). Bucketing anonymous traffic requires a cookie-based assigner; deferred.
- **Forced arm for everyone** → set the env var `NEXT_PUBLIC_PRIMARY_VARIANT` to `"primary"` or `"primary-lighter"`. Useful for staging dogfood, demoing one arm to stakeholders, or rolling out the winner once the test ends.

### Where it's wired

| Surface | File | Bucketing |
|---|---|---|
| WhatsApp CTA on creator profile | [WhatsAppButton.tsx](app/components/creator/WhatsAppButton.tsx) via [creator/[id]/page.tsx](app/creator/[id]/page.tsx) | Per-viewer (`viewerId`) |
| Upgrade fallback link on creator profile | [creator/[id]/page.tsx](app/creator/[id]/page.tsx) (`buttonClasses` helper) | Per-viewer (`viewerId`) |
| Signup CTA | [become-a-member/page.tsx](app/become-a-member/page.tsx) | Anonymous → control (env override only) |

Both creator-profile CTAs read the same bucket per render, so a viewer sees a consistent arm within a single page view.

### Measurement (live)

`AnalyticsEvent` has a `variant` column and the API route accepts it for every event type. Three event types matter for the experiment:

| Event | When it fires | Notes |
|---|---|---|
| `cta_exposure` | When a creator-profile CTA mounts | Server-dedupes per (visitor, creator, eventType) within 30 min; client-dedupes via `sessionStorage` so the dual-render (sidebar + sticky bar) only POSTs once |
| `whatsapp_click` | When the WhatsApp CTA is clicked | Existing event, now tagged with `variant` |
| `upgrade_click` | When the upgrade-fallback link is clicked | New event, fired by `<UpgradeLink>` |

Self-events (creator viewing their own profile) are blocked server-side, so a creator clicking around their own page won't pollute their own bucket's stats.

#### Reading the experiment

Per-arm conversion rate, across all creators, last 14 days:

```sql
SELECT
  variant,
  SUM(CASE WHEN eventType = 'cta_exposure'   THEN 1 ELSE 0 END) AS exposures,
  SUM(CASE WHEN eventType = 'whatsapp_click' THEN 1 ELSE 0 END) AS whatsapp_clicks,
  SUM(CASE WHEN eventType = 'upgrade_click'  THEN 1 ELSE 0 END) AS upgrade_clicks,
  ROUND(
    SUM(CASE WHEN eventType IN ('whatsapp_click','upgrade_click') THEN 1 ELSE 0 END)
    / NULLIF(SUM(CASE WHEN eventType = 'cta_exposure' THEN 1 ELSE 0 END), 0)
    * 100, 2
  ) AS conversion_rate_pct
FROM AnalyticsEvent
WHERE
  variant IS NOT NULL
  AND createdAt >= NOW() - INTERVAL 14 DAY
GROUP BY variant;
```

Statistical significance is on you to validate (sample size, base rates, etc.) — the data layer is just the inputs.

#### Anonymous traffic and the signup CTA

The signup CTA at `/become-a-member` uses `getPrimaryButtonVariant()` with no userId, so it always renders control (`primary`) unless the env override is set. Exposure is NOT fired for it. To make signup A/B-able we'd need a cookie-based assigner — deferred until we know the creator-profile experiment is worth running. The signup CTA's role here is just to stay visually consistent with whatever arm is forced via env override.

### Picking a winner

After 2 weeks (or whatever sample size you need for statistical significance), if one arm wins:

1. Set `NEXT_PUBLIC_PRIMARY_VARIANT` to the winning arm so every user sees it
2. Confirm in production for a week
3. Promote the winner to be the default `primary` variant in `Button.tsx` and delete the loser
4. Remove the env override and the `getPrimaryButtonVariant` calls

The point of the scaffolding is that step 4 is a small mechanical cleanup, not a re-architecture.

## Migration plan (deferred)

The codebase currently has 15+ files with ad-hoc button styles (purple-600, amber gradients, rose, etc.). Migration should happen incrementally — replace one feature's buttons at a time, not all at once. Start with the highest-traffic surfaces:

1. [WhatsAppButton](app/components/creator/WhatsAppButton.tsx) — already split by `isVipPlus` (primary vs gold). Becomes `<Button variant={isVipPlus ? "gold" : "primary"} fullWidth>`.
2. [Signup form CTA](app/become-a-member/page.tsx) — `<Button variant="primary" size="lg" loading={pending} fullWidth>`.
3. [Upgrade link](app/creator/[id]/page.tsx) — `<Button variant="primary" fullWidth>` (used as a Link — wrap with `<Link>` or pass `as` if we add that prop later).

Do not refactor everything in one PR.
