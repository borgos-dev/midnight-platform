-- DropForeignKey
ALTER TABLE `subscription` DROP FOREIGN KEY `Subscription_creatorProfileId_fkey`;

-- AlterTable
ALTER TABLE `user` ADD COLUMN `deletedAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `BannedEmail` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `reason` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `BannedEmail_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `creatorprofile_location_profileViewsMonth_idx` ON `creatorprofile`(`location`, `profileViewsMonth`);

-- CreateIndex
CREATE INDEX `user_deletedAt_idx` ON `user`(`deletedAt`);

-- AddForeignKey
ALTER TABLE `Subscription` ADD CONSTRAINT `Subscription_creatorProfileId_fkey` FOREIGN KEY (`creatorProfileId`) REFERENCES `creatorprofile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
