-- CreateTable
CREATE TABLE `user` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `role` ENUM('CREATOR', 'ADMIN') NOT NULL DEFAULT 'CREATOR',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `creatorprofile` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `displayName` VARCHAR(191) NOT NULL,
    `bio` VARCHAR(191) NULL,
    `avatarUrl` VARCHAR(191) NULL,
    `location` VARCHAR(191) NULL,
    `userId` INTEGER NOT NULL,
    `tier` ENUM('REGULAR', 'VIP', 'VIP_PLUS') NOT NULL DEFAULT 'REGULAR',
    `status` ENUM('PENDING', 'APPROVED', 'SUSPENDED') NOT NULL DEFAULT 'PENDING',
    `subscriptionEndsAt` DATETIME(3) NULL,
    `whatsappNumber` VARCHAR(191) NULL,
    `profileViewsToday` INTEGER NOT NULL DEFAULT 0,
    `whatsappClicksToday` INTEGER NOT NULL DEFAULT 0,
    `profileViewsWeek` INTEGER NOT NULL DEFAULT 0,
    `whatsappClicksWeek` INTEGER NOT NULL DEFAULT 0,
    `profileViewsMonth` INTEGER NOT NULL DEFAULT 0,
    `whatsappClicksMonth` INTEGER NOT NULL DEFAULT 0,
    `bestDay` VARCHAR(191) NULL,
    `bestTime` VARCHAR(191) NULL,
    `whatsappCTR` DOUBLE NULL,
    `externalLinksCount` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `creatorprofile_userId_key`(`userId`),
    INDEX `creatorprofile_status_idx`(`status`),
    INDEX `creatorprofile_location_idx`(`location`),
    INDEX `creatorprofile_tier_idx`(`tier`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `post` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `creatorId` INTEGER NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `content` VARCHAR(191) NULL,
    `accessLevel` ENUM('REGULAR', 'VIP', 'VIP_PLUS') NOT NULL DEFAULT 'REGULAR',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `post_creatorId_idx`(`creatorId`),
    INDEX `post_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `media` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `creatorId` INTEGER NOT NULL,
    `postId` INTEGER NULL,
    `kind` VARCHAR(191) NOT NULL,
    `filePath` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `sizeBytes` INTEGER NOT NULL,

    INDEX `media_creatorId_idx`(`creatorId`),
    INDEX `media_postId_idx`(`postId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `postlike` (
    `postId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `postlike_userId_idx`(`userId`),
    PRIMARY KEY (`postId`, `userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Subscription` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `creatorProfileId` INTEGER NOT NULL,
    `plan` ENUM('REGULAR', 'VIP', 'VIP_PLUS') NOT NULL,
    `durationDays` INTEGER NOT NULL,
    `provider` ENUM('MTN_MOMO', 'ORANGE_MONEY') NOT NULL,
    `status` ENUM('PENDING', 'PAID', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `amountCfa` INTEGER NOT NULL,
    `startsAt` DATETIME(3) NOT NULL,
    `endsAt` DATETIME(3) NOT NULL,
    `phoneNumber` VARCHAR(191) NULL,
    `screenshotUrl` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Subscription_creatorProfileId_idx`(`creatorProfileId`),
    INDEX `Subscription_status_idx`(`status`),
    INDEX `Subscription_endsAt_idx`(`endsAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `creatorprofile` ADD CONSTRAINT `creatorprofile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `post` ADD CONSTRAINT `post_creatorId_fkey` FOREIGN KEY (`creatorId`) REFERENCES `creatorprofile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `media` ADD CONSTRAINT `media_creatorId_fkey` FOREIGN KEY (`creatorId`) REFERENCES `creatorprofile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `media` ADD CONSTRAINT `media_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `postlike` ADD CONSTRAINT `postlike_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `postlike` ADD CONSTRAINT `postlike_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Subscription` ADD CONSTRAINT `Subscription_creatorProfileId_fkey` FOREIGN KEY (`creatorProfileId`) REFERENCES `creatorprofile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
