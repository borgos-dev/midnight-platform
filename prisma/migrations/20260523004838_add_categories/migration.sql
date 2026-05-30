-- CreateTable
CREATE TABLE `Category` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `slug` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Category_slug_key`(`slug`),
    INDEX `Category_displayOrder_idx`(`displayOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CreatorCategory` (
    `creatorprofileId` INTEGER NOT NULL,
    `categoryId` INTEGER NOT NULL,

    INDEX `CreatorCategory_categoryId_idx`(`categoryId`),
    PRIMARY KEY (`creatorprofileId`, `categoryId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CreatorCategory` ADD CONSTRAINT `CreatorCategory_creatorprofileId_fkey` FOREIGN KEY (`creatorprofileId`) REFERENCES `creatorprofile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CreatorCategory` ADD CONSTRAINT `CreatorCategory_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
