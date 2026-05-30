-- CreateTable
CREATE TABLE `AnalyticsEvent` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `creatorId` INTEGER NOT NULL,
    `eventType` VARCHAR(191) NOT NULL,
    `country` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `device` VARCHAR(191) NULL,
    `source` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AnalyticsEvent_creatorId_idx`(`creatorId`),
    INDEX `AnalyticsEvent_eventType_idx`(`eventType`),
    INDEX `AnalyticsEvent_createdAt_idx`(`createdAt`),
    INDEX `AnalyticsEvent_creatorId_eventType_createdAt_idx`(`creatorId`, `eventType`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PageView` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `creatorId` INTEGER NOT NULL,
    `country` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `device` VARCHAR(191) NULL,
    `source` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PageView_creatorId_idx`(`creatorId`),
    INDEX `PageView_createdAt_idx`(`createdAt`),
    INDEX `PageView_country_idx`(`country`),
    INDEX `PageView_creatorId_createdAt_idx`(`creatorId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AnalyticsEvent` ADD CONSTRAINT `AnalyticsEvent_creatorId_fkey` FOREIGN KEY (`creatorId`) REFERENCES `creatorprofile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PageView` ADD CONSTRAINT `PageView_creatorId_fkey` FOREIGN KEY (`creatorId`) REFERENCES `creatorprofile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
