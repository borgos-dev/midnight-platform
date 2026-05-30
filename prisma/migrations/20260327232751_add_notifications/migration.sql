-- CreateTable
CREATE TABLE `Notification` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `creatorId` INTEGER NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `message` VARCHAR(191) NOT NULL,
    `read` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Notification_creatorId_read_idx`(`creatorId`, `read`),
    INDEX `Notification_creatorId_createdAt_idx`(`creatorId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_creatorId_fkey` FOREIGN KEY (`creatorId`) REFERENCES `creatorprofile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
