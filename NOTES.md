# Midnight — Session Notes (2026-05-29)

Big session — covered storage strategy, subscription tier picker, daily quotas, post retention, founding-creator admin tool, dashboard UX audit + tier theming, and a complete pass on the VIP+ blur + lock feature (preview, controls, render). Two migrations to run before any of this works end-to-end.

---

## What we built / changed

### 1. Public tier picker page — `/upgrade`
[app/upgrade/page.tsx](client/app/upgrade/page.tsx). Four cards (VIP+, VIP, Premium, Regular free), gold/purple/rose/gray themes matching the tier palette. RECOMMENDED ribbon on VIP+. Footer card links to `/boost`.

Dashboard sidebar's **Subscription** link in [dashboard/layout.tsx](client/app/dashboard/layout.tsx) points to `/upgrade` (was `/upgrade/checkout`).

### 2. Central pricing/quota module — [app/lib/plans.ts](client/app/lib/plans.ts)
Single source of truth. Replaces three out-of-sync price tables.

| Tier     | Price       | Cycle | Posts/day | Videos/day | Retention |
|----------|-------------|-------|-----------|------------|-----------|
| Regular  | Free        | —     | **3**     | **blocked**| 14 days   |
| Premium  | 15,000 CFA  | 14d   | 5         | 2          | 30 days   |
| VIP      | 20,000 CFA  | 14d   | 7         | 3          | 60 days   |
| VIP+     | 30,000 CFA  | 14d   | 10        | 5          | 90 days   |

Every surface that shows or charges for a tier reads from this module. Regular bumped 1 → 3 posts/day after feedback that 1/day kills exploration.

### 3. PREMIUM wired through the checkout flow
- [upgrade/checkout/actions.ts](client/app/upgrade/checkout/actions.ts), [page.tsx](client/app/upgrade/checkout/page.tsx), [PlanSummary.tsx](client/app/upgrade/checkout/PlanSummary.tsx)
- [UpgradeDialog.tsx](client/app/dashboard/UpgradeDialog.tsx) — third card + "Compare all plans →" link

### 4. Daily post + video quotas
- [uploadsPost.ts](client/app/dashboard/actions/uploadsPost.ts) enforces total cap + video sub-cap before any Cloudinary work; Regular gets popup before metadata loads when picking a video
- [UploadPostForm.tsx](client/app/dashboard/components/UploadPostForm.tsx) shows live meter, retention note, and "PREVIEW · WHAT VISITORS SEE" live blur thumbnail

### 5. Post auto-retention
- [app/lib/post-retention.ts](client/app/lib/post-retention.ts) — `expireOldPostsForCreator(creatorId, tier)`
- Lazy per-creator sweep from dashboard render + upload, both wrapped in try/catch so a Cloudinary failure can't tank the page
- Cloudinary `destroy()` calls also wrapped in try/catch because the SDK can throw *synchronously* on missing config — chained `.catch()` won't intercept that

### 6. Visitor reviews + ratings
- [reviews-config.ts](client/app/lib/reviews-config.ts), [reviews-server.ts](client/app/lib/reviews-server.ts), [reviews.ts](client/app/actions/reviews.ts), [moderateReview.ts](client/app/actions/moderateReview.ts)
- Components in [app/components/creator/](client/app/components/creator/) — `RatingStars`, `ReviewForm`, `ReviewList`
- [admin/reviews/page.tsx](client/app/admin/reviews/page.tsx) — hybrid moderation queue (stars live instantly, comments need approval)

### 7. Founding-creator admin tool — `/admin/founding-creators`
- [page.tsx](client/app/admin/founding-creators/page.tsx), [actions.ts](client/app/admin/founding-creators/actions.ts), [GrantForm.tsx](client/app/admin/founding-creators/GrantForm.tsx)
- **Grant**: creates a $0 ACTIVE subscription with `phoneNumber="FOUNDING_GRANT"` marker, optionally auto-flips `verified=true` for VIP+ grants
- **Cancel grant** + **Change tier** inline buttons on each active grant (rose Cancel + tier-target buttons) — end date preserved on tier change
- Sidebar entry added in [AdminSidebar.tsx](client/app/admin/AdminSidebar.tsx)

### 8. Pre-existing bug fix: PREMIUM in tier resolution
- Both [resolveTier](client/app/admin/subscriptions/approveSubscription.ts) and [enforceSubscriptionStatus](client/app/lib/subscription.ts) were missing PREMIUM
- New `PAID_TIERS` constant in `subscription.ts` so the expiry/repair queries don't drift again

### 9. Logos + favicon
- [app/icon.png](client/app/icon.png) — Next.js App Router file-convention favicon (auto-serves at `/icon.png`)
- `metadata.icons` in [app/layout.tsx](client/app/layout.tsx) also points to `/Midnight-logo1.png`
- [dashboard/layout.tsx](client/app/dashboard/layout.tsx) — replaced purple-gradient "M" placeholders with the actual logo on both mobile header (28px) and desktop sidebar (32px)

### 10. Dashboard UX: empty-state Setup Checklist tile
- [dashboard/page.tsx](client/app/dashboard/page.tsx) computes `setupStatus` (avatar / WhatsApp / bio / first post)
- [DashboardShell.tsx](client/app/dashboard/DashboardShell.tsx) threads `SetupStatus` type through
- [IntentGrid.tsx](client/app/components/dashboard/sections/IntentGrid.tsx) swaps the dead Conversion Rate KPI for an actionable `SetupChecklistCard` while any item is incomplete. Once all four done, normal KPI returns automatically.
- City Rank grammar fixed: was `"Top creator in 3 in your city"` (nonsense), now `"Top creator in your city"` / `"Top 3 in your city"` / `"Ranked #7 in your city"`

### 11. Tier theming across the dashboard
- Tier color tokens extracted to [app/lib/tier-tokens.ts](client/app/lib/tier-tokens.ts) so server components can import them without crossing `"use client"`. Old import path from `DashboardShell` still works (re-exported).
- [dashboard/profile/page.tsx](client/app/dashboard/profile/page.tsx) + [dashboard/media/page.tsx](client/app/dashboard/media/page.tsx) — tier-colored top accent strip + tier badge with icon on the page header

### 12. Blur feature — full revamp
Per-post creator control of blur intensity AND whether the WhatsApp lock overlay shows. New schema column `post.showLock` (default true). Full rendering coverage on every surface.

- **Upload form** ([UploadPostForm.tsx](client/app/dashboard/components/UploadPostForm.tsx))
  - "Blur preview" checkbox (VIP+ only) + "Tease level" slider (range **4..25**, raised from 16 so creators can reach near-opaque block)
  - **Live preview thumbnail** at 16:9 with `<video>` element for video files + `<img>` for images, using the EXACT same `blur(Npx) brightness(0.85)` filter the public renderer applies. Falls back to gradient placeholder when no file selected.
  - **"Show WhatsApp lock"** sub-checkbox (default ON, only visible when blur is on) — uncheck for blur tease without WhatsApp CTA; tap routes to profile page instead
  - Clarifier paragraph distinguishing this slider (tease blur) from the per-file `ADD BLUR` button (face-tracking editor)
  - **Cancel button** clears all unsaved state (files, blur toggle, intensity, captions) via `formRef.current?.reset()`
- **Server action** ([uploadsPost.ts](client/app/dashboard/actions/uploadsPost.ts))
  - Reads `showLock` from FormData, persists `true` for non-blurred posts so toggling blur on later gets the default
  - Server clamp updated to 4..25
- **Public renderer** ([FeedPost.tsx](client/app/components/feed/FeedPost.tsx))
  - Lock overlay renders only when `isLocked && showLock === true`
  - When `isLocked && !showLock`: blur stays, but a transparent tap target routes to `/creator/<id>` instead of WhatsApp
- **Surfaces threaded for `showLock` + `blurIntensity`:**
  - [Feed.tsx](client/app/components/feed/Feed.tsx) — public `/feed`. Also fixed: `blurred` prop was wrong (`isLocked` instead of `isLocked && post.blurred`) — that was masking real blur as a black-tile artifact
  - [LatestFeedStrip.tsx](client/app/components/landing/LatestFeedStrip.tsx) — homepage strip. **Video blur was missing entirely (only images blurred); now videos blur too** with `autoPlay+loop` on locked clips so motion shows through. Hardcoded 14px blur replaced with `post.blurIntensity`.
  - [CreatorProfileContent.tsx](client/app/components/creator/CreatorProfileContent.tsx) + [creator/[id]/page.tsx](client/app/creator/[id]/page.tsx) — creator profile feed + reels
  - [FeedReelViewer.tsx](client/app/components/feed/FeedReelViewer.tsx) — ReelPost type extended
  - [page.tsx](client/app/page.tsx) — homepage Latest Feed Strip data shaping
- **Creator profile blur bug fix** ([creator/[id]/page.tsx](client/app/creator/[id]/page.tsx)) — was `const locked = tierRank[viewerTier] < tierRank[post.accessLevel]`, which made `blurred: post.locked` always false on **Public** posts even when the creator opted into blur. Now: `const locked = !isOwner && (tierLocked || post.blurred)`. Owners always see un-blurred; non-owners see tease blur when creator opted in, regardless of accessLevel.

### 13. VideoBlurEditor error state revamp
- [VideoBlurEditor.tsx](client/app/components/blur-editor/VideoBlurEditor.tsx) — title "Face tracking unavailable" (was "Something went wrong"), purple callout box explaining the **VIP+ tease blur still works** even when face-tracking fails on HEVC, and a prominent purple **"Close and continue uploading"** button so the creator doesn't have to find the X to escape

### 14. Cloudinary HEVC fix — [app/lib/media-url.ts](client/app/lib/media-url.ts)
- iPhone HEVC videos uploaded as-is to Cloudinary; Chrome on Windows can't decode them, so video tags rendered as silent black boxes
- New `browserSafeMediaUrl(url, kind)` rewrites delivery URL with `f_mp4,vc_h264` so Cloudinary lazily transcodes on first request, caches result
- Applied at every video render path: [Feed.tsx](client/app/components/feed/Feed.tsx), [page.tsx](client/app/page.tsx), [CreatorProfileContent.tsx](client/app/components/creator/CreatorProfileContent.tsx), [PostManagementCard.tsx](client/app/dashboard/components/PostManagementCard.tsx)
- Images pass through untouched (Cloudinary's WebP/AVIF auto-format already handles those at the browser level)

### 15. Multiple Prisma relation/field bugs caught and fixed
- `creatorprofile.subscription` → **`subscriptions`** (plural) on the back-relation field
- `post.creatorprofileId` → **`creatorId`** (post model FK pre-dates the codebase `creatorprofileId` convention) — affected `expireOldPostsForCreator`, quota check, and video sub-cap query

---

## Decisions we made and why

### Subscription model
- **14-day cycles, not monthly** — matches Cameroon market reference; more frequent purchase decisions.
- **PREMIUM 15k / VIP 20k / VIP+ 30k CFA** — single authority in `plans.ts`.
- **Regular shown as free card on `/upgrade`** — full ladder visible side-by-side.
- **`/upgrade` is public** — anyone can see plans; helps recruit creators.
- **Boost stays at `/boost`** — different product. Footer link on `/upgrade` keeps it discoverable.

### Storage strategy (Cloudinary 25 GB free)
- **Auto-delete + block videos for Regular** — less friction than per-creator caps + meter
- **14/30/60/90-day retention** — bounded growth + upgrade lever
- **Lazy per-creator sweep**, not global cron
- **Total + video sub-cap** — headline stays one number, video sub-cap protects storage where it matters
- **Regular bumped 1→3 posts/day** after pushback; math still fits inside 25 GB

### Free trials / founding creators
- **3 months recommended over 6** — scarcity ("Founding 50") matters more than length
- **$0 subscriptions, not separate trial model** — reuses tier resolver / expiry / downgrade. Marker is `phoneNumber: "FOUNDING_GRANT"` + `amountCfa: 0`.
- **Default VIP+ for first batch** — top-tier cards make homepage look populated
- **Cancel + Change Tier** inline buttons added so a mistake costs one click. Cancel does NOT revert `verified` (that's a real-world ID check).
- **Audit logged as `SUBSCRIPTION_APPROVED`** with `metadata.foundingGrant: true` + `operation: cancel | changeTier | grant`

### MoMo/Orange API integration
- **Deferred to post-launch.** Manual proof flow is what every Cameroon platform launches with. Apply for MTN MoMo Collections API after ~50 paying creators.

### Blur feature
- **Lock and blur initially coupled, then decoupled** after creator asked for the choice. Default ON (preserves prior behavior).
- **Blur range 4..25** — raised from 16 because user wanted near-opaque option
- **Owner always sees own posts un-blurred** — never guess what your own content looks like to yourself; use incognito to verify visitor view
- **Live preview at 16:9 with actual video playback** — creators who can't open the face-tracking editor on HEVC still need to gauge blur intensity before submitting

### Dashboard UX
- **Setup Checklist replaces empty Conversion Rate KPI** — Stripe/Vercel pattern, turns "buyer's remorse at minute 1" into productive action
- **Tier theming extended to /dashboard/profile + /dashboard/media** — TIER_TOKENS extracted to shared module so server pages can use it

---

## What's broken / incomplete

### Migrations to run
- **`20260529200000_blur_and_reviews`** — Review table + ReviewStatus enum + `post.blurIntensity` column
- **`20260529210000_add_show_lock_to_post`** — `post.showLock Boolean @default(true)`

Run both with `npx prisma migrate dev`.

### Not yet built
- **Post-trial conversion flow** — founding grants auto-downgrade to Regular at endsAt, but no "your founding access ended" prompt. Add closer to first cohort's day-90.
- **Audit log filter for founding grants** — they show as generic `SUBSCRIPTION_APPROVED` rows; the `metadata.foundingGrant: true` flag is queryable but the audit page doesn't expose a filter
- **MoMo/Orange API integration** — manual proof only. Deferred.
- **Global cron for post-retention** — currently lazy per-creator. Inactive creators could theoretically hold old content forever. Not a real risk at launch scale.
- **Owner "Preview as visitor" toggle** — would let creators see how their own posts look to non-tier-matching visitors without needing incognito

### Known orphan / dead code
- **`/checkout/page.tsx`** — legacy, nothing links to it. Bogus client-side price stripped. Consider deleting after launch.

### Pre-existing gaps not addressed
- **Feed.tsx gating uses creator.tier instead of post.accessLevel** — means a Public post by a VIP+ creator is gated to VIP+ visitors. May or may not be intentional; matches "VIP+ content is exclusive" framing. Different from creator profile which gates by post.accessLevel. Not changed because behavioral implications are unclear.

---

## Exact next steps

1. **Run `npx prisma migrate dev`** to apply the two pending migrations.

2. **Verify the blur fix end-to-end:**
   - As Annatou: post a video with Blur preview ON + accessLevel Public
   - Logged-in owner view of `/feed` or `/creator/<id>` → see un-blurred (correct)
   - Incognito window same URLs → see tease blur with WhatsApp lock overlay
   - Untick "Show WhatsApp lock" on a new post → incognito should show blur with no lock, tap routes to profile

3. **Smoke-test founding-creator flow:**
   - Grant VIP+ for 90 days → confirm subscription created + creator tier updated
   - Click `→ VIP` button on the row → tier changes, end date preserved
   - Click `Cancel` → status flips to CANCELLED, creator drops to Regular

4. **Smoke-test quotas:**
   - Regular: try uploading a video → alert blocks before submit
   - Premium: upload 2 videos → third should reject server-side

5. **Identify your first founding creators** — pick 10-20 names you can personally vouch for, grant VIP+ for 90 days.

6. **Soft-launch.** Watch real usage for 4-8 weeks before adding features. Freeze applies again.

7. **Day ~75-90 of first founding cohort:** decide trial-end behavior — extend, soft-convert (50% off), or hard-convert.

8. **Post-revenue:** apply for MTN MoMo Collections API. ~2-4 week integration project once credentials arrive.

---

## Important file paths / function names

### Pricing / quotas / retention (single source of truth)
- [app/lib/plans.ts](client/app/lib/plans.ts) — `PLANS`, `DAILY_POST_QUOTA`, `DAILY_VIDEO_QUOTA`, `POST_RETENTION_DAYS`, helpers + format
- [app/lib/post-retention.ts](client/app/lib/post-retention.ts) — `expireOldPostsForCreator(creatorId, tier)`
- [app/lib/subscription.ts](client/app/lib/subscription.ts) — `refreshExpiredSubscriptions`, `enforceSubscriptionStatus`, `PAID_TIERS`

### Tier theming
- [app/lib/tier-tokens.ts](client/app/lib/tier-tokens.ts) — `TIER_TOKENS` (importable from server components)

### Media URL safety
- [app/lib/media-url.ts](client/app/lib/media-url.ts) — `browserSafeMediaUrl(url, kind)` (Cloudinary HEVC → MP4 H.264 transcode)

### Public surfaces
- [app/upgrade/page.tsx](client/app/upgrade/page.tsx) — tier picker
- [app/upgrade/checkout/](client/app/upgrade/checkout/) — manual proof checkout
- [app/boost/](client/app/boost/) — temporary spotlight product
- [app/page.tsx](client/app/page.tsx) — homepage; Latest Feed Strip shaping
- [app/feed/page.tsx](client/app/feed/page.tsx) → [components/feed/Feed.tsx](client/app/components/feed/Feed.tsx) → [FeedPost.tsx](client/app/components/feed/FeedPost.tsx)
- [app/creator/[id]/page.tsx](client/app/creator/[id]/page.tsx) → [components/creator/CreatorProfileContent.tsx](client/app/components/creator/CreatorProfileContent.tsx)
- [components/landing/LatestFeedStrip.tsx](client/app/components/landing/LatestFeedStrip.tsx) — homepage feed strip

### Dashboard
- [app/dashboard/actions/uploadsPost.ts](client/app/dashboard/actions/uploadsPost.ts) — `uploadPost(formData)` — quota + retention + video gates + blur + showLock all here
- [app/dashboard/components/UploadPostForm.tsx](client/app/dashboard/components/UploadPostForm.tsx) — `handleCancel`, blur state, live preview
- [app/dashboard/media/page.tsx](client/app/dashboard/media/page.tsx) — calls retention sweep before render; tier theming
- [app/dashboard/profile/page.tsx](client/app/dashboard/profile/page.tsx) — tier theming
- [app/dashboard/DashboardShell.tsx](client/app/dashboard/DashboardShell.tsx) — `SetupStatus` type, `TIER_TOKENS` re-export
- [app/dashboard/components/PostManagementCard.tsx](client/app/dashboard/components/PostManagementCard.tsx) — own posts management
- [app/components/dashboard/sections/IntentGrid.tsx](client/app/components/dashboard/sections/IntentGrid.tsx) — `SetupChecklistCard`

### Admin
- [app/admin/founding-creators/](client/app/admin/founding-creators/) — `grantFoundingTier`, `cancelFoundingGrant`, `changeFoundingGrantTier`
- [app/admin/subscriptions/approveSubscription.ts](client/app/admin/subscriptions/approveSubscription.ts) — `approveSubscriptionById`, `resolveTier`
- [app/admin/reviews/page.tsx](client/app/admin/reviews/page.tsx) — review moderation queue
- [app/admin/AdminSidebar.tsx](client/app/admin/AdminSidebar.tsx) — nav (now has Founding + Reviews)
- [app/admin/layout.tsx](client/app/admin/layout.tsx) — auth gate + sidebar counts

### Reviews
- [app/lib/reviews-config.ts](client/app/lib/reviews-config.ts), [reviews-server.ts](client/app/lib/reviews-server.ts) — constants + helpers
- [app/actions/reviews.ts](client/app/actions/reviews.ts) — `submitReview`, `getMyReviewForCreator`
- [app/actions/moderateReview.ts](client/app/actions/moderateReview.ts) — admin moderation actions
- [app/components/creator/](client/app/components/creator/) — `RatingStars`, `ReviewForm`, `ReviewList`

### Blur editor
- [app/components/blur-editor/VideoBlurEditor.tsx](client/app/components/blur-editor/VideoBlurEditor.tsx) — face-tracking editor; HEVC fail state has a "Close and continue uploading" CTA

### Markers in the data
- Founding grants in `Subscription`: `status: PAID`, `amountCfa: 0`, `phoneNumber: "FOUNDING_GRANT"`. Query that combination to find all promo grants.
- Audit log: `action: SUBSCRIPTION_APPROVED` with `metadata.foundingGrant: true` and `metadata.operation` ∈ {`grant`, `cancel`, `changeTier`}.

### Schema quirks worth remembering
- **`creatorprofile`** (lowercase) is the Prisma model name — not a typo. IDE spell-checker flags it; ignore.
- **`post.creatorId`** is the FK to creatorprofile (not `creatorprofileId`). The post model pre-dates the convention used on newer tables (Review, Report, Boost).
- **`creatorprofile.subscriptions`** is plural on the back-relation; the forward relation on `Subscription` is `creatorProfile` (camelCase).


---

## Session 2026-05-30 — Security audit, build fixes, production deployment

### What we built / changed

#### 16. Security audit — [middleware.ts](client/middleware.ts) + [media-url.ts](client/app/lib/media-url.ts)
A full security audit was run against the codebase. Two HIGH findings were fixed:

**H1 — Locked/blurred content was CSS-only (fixed)**
Blurred-tease posts previously shipped the original Cloudinary URL to the browser and hid it with CSS `blur()`. Any visitor could read the URL from the DOM and get the full-resolution original. Fixed by adding `lockedPreviewUrl(url, kind)` in [media-url.ts](client/app/lib/media-url.ts) which rewrites the delivery URL to bake `e_blur:2000,q_auto:low,w_400` into the delivered bytes. Applied at all four render surfaces: Feed.tsx, page.tsx (homepage strip), creator/[id]/page.tsx, api/post/route.ts.

**⚠️ ACTION REQUIRED:** In Cloudinary console → Settings → Security → enable "Strict transformations" to fully close the hole. Without it an attacker can strip the transform segment from the URL and request the original. The code fix raises the bar; the console setting closes it entirely.

**H2 — /api/post leaked all media URLs (fixed)**
The API returned raw `post.media` array for every post regardless of entitlement. Fixed with access-gated media sanitization + pagination.

**CSP header added** to [middleware.ts](client/middleware.ts) — but the initial version had no explicit `style-src` which blocked ALL inline styles and made the entire UI render as unstyled raw text. Fixed by adding:
- `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`
- `font-src 'self' https://fonts.gstatic.com data:`
- `script-src 'self' 'unsafe-inline' 'unsafe-eval'` (dev) / without `unsafe-eval` (prod)
- `connect-src 'self' https://res.cloudinary.com`
- `img-src` extended with `https://picsum.photos` for seed avatar URLs

Also added `form-action`, `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`.

**Post-launch follow-up:** migrate to nonce-based strict CSP to drop `'unsafe-inline'` on style/script. Tracked in SECURITY_AUDIT.md.

#### 17. Client/server module boundary fix — [passwords-rules.ts](client/app/lib/passwords-rules.ts)
`PasswordStrengthMeter` (client component) was importing from `passwords.ts` which imports `bcrypt` (a Node native module). Turbopack tried to bundle `bcrypt` for the browser → build error: `Module not found: Can't resolve 'fs'`. Fixed by extracting the client-safe constants (`MIN_PASSWORD_LENGTH`, `MAX_PASSWORD_LENGTH`, `isStrongEnough`) into `passwords-rules.ts` (no bcrypt). `PasswordStrengthMeter` now imports from there. `passwords.ts` re-exports from `passwords-rules.ts` for server callers.

#### 18. Production build TypeScript fixes
Multiple TypeScript errors surfaced during `npm run build` that didn't show in dev. All fixed:

- **`createHouseAd`** in [admin/ads/actions.ts](client/app/admin/ads/actions.ts) — returned `ad.id` (number) but form actions must return `void`. Dropped return value.
- **`changeFoundingGrantTier` + `cancelFoundingGrant`** — returned `Result` type. Added void-returning `cancelFoundingGrantForm` + `changeFoundingGrantTierForm` wrappers. Page binds to the wrappers; GrantForm still uses the Result-returning originals.
- **`approveReviewCommentForm` / `rejectReviewCommentForm` / `hideReviewForm`** — same fix, changed to explicit `Promise<void>` + `await` instead of `return`.
- **`CreatorGrid.tsx`** — `tierRank` missing `PREMIUM` key in `Record<AccessLevel, number>`. Added `PREMIUM: 1`.
- **`dashboard/page.tsx`** — `openBoost.status` typed as `BoostStatus` (full enum) not assignable to the three-value union the prop expects. Added `as "PENDING_PAYMENT" | "PENDING_REVIEW" | "ACTIVE"` cast (safe — query already filters to those values).
- **`page.tsx`** — `eligibleCreators` cast was resolving `tier` to `never`. Simplified to `as CreatorRow[]`.
- **`page.tsx`** — `latestFeedItems` map returned `LatestFeedItem | null` but TypeScript couldn't narrow it. Added explicit `(p): LatestFeedItem | null =>` return type annotation on the map callback.
- **`CreatorProfileContent.tsx`** — `feedReelPosts` map returned object-literal type, not `ReelPost`, so filter predicate `(p): p is ReelPost` failed. Added `(post): ReelPost | null =>` annotation on the map callback.

#### 19. Email + domain configuration
- [app/lib/email.ts](client/app/lib/email.ts) — `FROM_EMAIL` updated from `onboarding@resend.dev` to `Midnight <noreply@midnight24.cam>`. Domain `midnight24.cam` is verified in Resend (eu-west-1).
- `.env` updated: `NEXTAUTH_URL` → `https://midnight24.cam`, `NEXT_PUBLIC_BASE_URL` → `https://midnight24.cam`
- [app/layout.tsx](client/app/layout.tsx) — added `metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000")` to silence the metadataBase warning and fix OG image URLs in production.

#### 20. Production deployment
- Platform deployed to Vercel (project: `midnight-platform`, user: `akiy`)
- **Database:** Railway MySQL (free tier) — `zephyr.proxy.rlwy.net:56927`, database `railway`
- Database schema applied via `npx prisma db push --force-reset` (migration history had a gap from pre-Railway local development — could not use `migrate deploy`)
- Domain `midnight24.cam` purchased on Namecheap — needs DNS records added in Namecheap pointing to Vercel
- See [FUTURE_DATABASE.md](FUTURE_DATABASE.md) for Railway billing warning + migration plan

---

## What's incomplete / action required

### URGENT before launch
1. **Connect custom domain in Vercel** — Vercel → Settings → Domains → add `midnight24.cam` → copy DNS records → add to Namecheap Advanced DNS
2. **Add Railway payment method** — Railway dashboard → Billing → add card to prevent auto-pause when free credit runs out (~$5 credit = ~2-3 months at current scale)
3. **Cloudinary strict transformations** — console → Settings → Security → enable "Strict transformations" to fully close the H1 content-access bypass

### Post-launch follow-up
- Migrate CSP to nonce-based strict mode (drop `'unsafe-inline'`)
- Migrate seed avatar URLs from picsum.photos to Cloudinary (so picsum can be dropped from img-src)
- Rename `middleware.ts` → `proxy.ts` to silence the Next.js 16 deprecation warning
- Future database migration plan in [FUTURE_DATABASE.md](FUTURE_DATABASE.md)

---

## Exact next steps

1. Add DNS records in Namecheap for `midnight24.cam` → Vercel
2. Add payment method in Railway
3. Enable Cloudinary strict transformations
4. Onboard first founding creators via `/admin/founding-creators`
5. Run `npx prisma migrate deploy` for the two pending migrations (`blur_and_reviews` + `add_show_lock_to_post`) — these were NOT applied in the Railway push (db push doesn't use migration history). Run:
   ```powershell
   $env:DATABASE_URL="mysql://root:qeQBGSQFHZxKQHYhbKNuqicnVnXzESLf@zephyr.proxy.rlwy.net:56927/railway"; npx prisma db push
   ```
   (without --force-reset this time — just sync schema changes)

---

## Infrastructure / environment

| Item | Value |
|---|---|
| Production URL | https://midnight24.cam (pending DNS) |
| Vercel project | midnight-platform (akiy) |
| Railway DB | zephyr.proxy.rlwy.net:56927 / railway |
| Resend domain | midnight24.cam (verified, eu-west-1) |
| From email | noreply@midnight24.cam |
| Cloudinary | existing account (watermarks + media) |
| Domain registrar | Namecheap |