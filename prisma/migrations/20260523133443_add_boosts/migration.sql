-- CreateTable
CREATE TABLE `Boost` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `creatorprofileId` INTEGER NOT NULL,
    `durationDays` INTEGER NOT NULL,
    `amountCfa` INTEGER NOT NULL,
    `provider` ENUM('MTN_MOMO', 'ORANGE_MONEY') NOT NULL,
    `status` ENUM('PENDING_PAYMENT', 'PENDING_REVIEW', 'ACTIVE', 'EXPIRED', 'REJECTED') NOT NULL DEFAULT 'PENDING_PAYMENT',
    `phoneNumber` VARCHAR(191) NULL,
    `startsAt` DATETIME(3) NULL,
    `endsAt` DATETIME(3) NULL,
    `adId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Boost_adId_key`(`adId`),
    INDEX `Boost_creatorprofileId_idx`(`creatorprofileId`),
    INDEX `Boost_status_idx`(`status`),
    INDEX `Boost_endsAt_idx`(`endsAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Boost` ADD CONSTRAINT `Boost_creatorprofileId_fkey` FOREIGN KEY (`creatorprofileId`) REFERENCES `creatorprofile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Boost` ADD CONSTRAINT `Boost_adId_fkey` FOREIGN KEY (`adId`) REFERENCES `Ad`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
