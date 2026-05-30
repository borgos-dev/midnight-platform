-- New per-creator external-links feature.
--
-- Replaces the `externalLinksCount` Int column on creatorprofile that used
-- to imply a counter feature that was never built. The proper data model
-- is one row per link with kind + url + displayOrder; counts are derived
-- via prisma.count() when needed.

-- DropColumn
ALTER TABLE `creatorprofile` DROP COLUMN `externalLinksCount`;

-- CreateTable
CREATE TABLE `CreatorExternalLink` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `creatorprofileId` INTEGER NOT NULL,
    `kind` ENUM(
        'INSTAGRAM',
        'TIKTOK',
        'SNAPCHAT',
        'ONLYFANS',
        'TELEGRAM',
        'TWITTER',
        'YOUTUBE',
        'WEBSITE'
    ) NOT NULL,
    `url` VARCHAR(500) NOT NULL,
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `totalClicks` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CreatorExternalLink_creatorprofileId_displayOrder_idx`(`creatorprofileId`, `displayOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CreatorExternalLink`
    ADD CONSTRAINT `CreatorExternalLink_creatorprofileId_fkey`
    FOREIGN KEY (`creatorprofileId`)
    REFERENCES `creatorprofile`(`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE;
