-- Drop three zombie columns on creatorprofile that no code path ever
-- reads or writes.
--
--   - whatsappCTR        — implied "click-through %", but real CTR comes
--                          from calculateConversionRate() over AnalyticsEvent.
--   - bestDay / bestTime — superseded by calculateBestDayAndTime() which
--                          aggregates AnalyticsEvent on the dashboard.
--
-- `externalLinksCount` is intentionally kept for now — the platform plans
-- to add an external-links feature on creator profiles. Note when that
-- feature lands the right data model is a separate `creator_external_link`
-- table (one row per link), and this Int column should also be dropped at
-- that point since you can derive the count via prisma count() on the
-- join table.

ALTER TABLE `creatorprofile`
    DROP COLUMN `bestDay`,
    DROP COLUMN `bestTime`,
    DROP COLUMN `whatsappCTR`;
