-- CreateTable
CREATE TABLE `Report` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `creatorprofileId` INTEGER NOT NULL,
    `reporterUserId` INTEGER NULL,
    `reason` VARCHAR(191) NOT NULL,
    `category` ENUM('TRAFFICKING_OR_MINORS', 'IMPERSONATION', 'STOLEN_CONTENT', 'HARASSMENT', 'ILLEGAL_SERVICES', 'OTHER') NULL,
    `status` ENUM('PENDING_REVIEW', 'RESOLVED_REMOVED', 'RESOLVED_NO_ACTION', 'DISMISSED') NOT NULL DEFAULT 'PENDING_REVIEW',
    `reviewedBy` INTEGER NULL,
    `reviewedAt` DATETIME(3) NULL,
    `reviewNote` VARCHAR(191) NULL,
    `reporterIpHash` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Report_status_idx`(`status`),
    INDEX `Report_creatorprofileId_idx`(`creatorprofileId`),
    INDEX `Report_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Report` ADD CONSTRAINT `Report_creatorprofileId_fkey` FOREIGN KEY (`creatorprofileId`) REFERENCES `creatorprofile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Report` ADD CONSTRAINT `Report_reporterUserId_fkey` FOREIGN KEY (`reporterUserId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
