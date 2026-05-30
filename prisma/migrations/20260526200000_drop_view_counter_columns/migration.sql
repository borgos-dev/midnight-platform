-- Drop the six accumulating counter columns on creatorprofile. They were
-- mislabeled "today/week/month" but had no rollover logic — once incremented,
-- the values lived forever, so the labels lied about the time window they
-- represented. All read sites now compute windowed counts from
-- AnalyticsEvent on demand (see lib/analytics.ts).
--
-- Also drops the composite index that referenced profileViewsMonth.

-- DropIndex
DROP INDEX `creatorprofile_location_profileViewsMonth_idx` ON `creatorprofile`;

-- AlterTable
ALTER TABLE `creatorprofile`
    DROP COLUMN `profileViewsToday`,
    DROP COLUMN `profileViewsWeek`,
    DROP COLUMN `profileViewsMonth`,
    DROP COLUMN `whatsappClicksToday`,
    DROP COLUMN `whatsappClicksWeek`,
    DROP COLUMN `whatsappClicksMonth`;
