-- CreateTable
CREATE TABLE `Ad` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kind` ENUM('HOUSE', 'PROMOTED_CREATOR') NOT NULL,
    `status` ENUM('ACTIVE', 'PAUSED') NOT NULL DEFAULT 'ACTIVE',
    `priority` INTEGER NOT NULL DEFAULT 0,
    `title` VARCHAR(191) NOT NULL,
    `body` VARCHAR(191) NULL,
    `imageUrl` VARCHAR(191) NULL,
    `ctaLabel` VARCHAR(191) NOT NULL,
    `ctaUrl` VARCHAR(191) NOT NULL,
    `startsAt` DATETIME(3) NULL,
    `endsAt` DATETIME(3) NULL,
    `city` VARCHAR(191) NULL,
    `creatorprofileId` INTEGER NULL,
    `impressions` INTEGER NOT NULL DEFAULT 0,
    `clicks` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Ad_status_priority_idx`(`status`, `priority`),
    INDEX `Ad_city_idx`(`city`),
    INDEX `Ad_creatorprofileId_idx`(`creatorprofileId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Ad` ADD CONSTRAINT `Ad_creatorprofileId_fkey` FOREIGN KEY (`creatorprofileId`) REFERENCES `creatorprofile`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
