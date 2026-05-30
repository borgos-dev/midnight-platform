-- AlterTable
ALTER TABLE `analyticsevent` ADD COLUMN `variant` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `creatorprofile` ADD COLUMN `neighborhood` VARCHAR(191) NULL,
    ADD COLUMN `priceCfaFrom` INTEGER NULL,
    ADD COLUMN `services` JSON NULL;

-- CreateIndex
CREATE INDEX `AnalyticsEvent_eventType_variant_idx` ON `AnalyticsEvent`(`eventType`, `variant`);
