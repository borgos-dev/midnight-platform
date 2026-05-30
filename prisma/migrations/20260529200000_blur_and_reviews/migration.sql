-- Two concurrent feature additions bundled into one migration so the
-- single `prisma migrate dev` run covers both: blur-intensity control on
-- posts (creator-set), and the visitor-authored Reviews table.

-- ─── 1) Per-post blur intensity ─────────────────────────────
-- Used to render gated VIP+ media with a "tease" blur that preserves
-- motion. Creators set this via a slider in the upload form. Default 8px
-- keeps movement visible while obscuring detail; the range goes 4..16.
ALTER TABLE `post`
    ADD COLUMN `blurIntensity` INTEGER NOT NULL DEFAULT 8;


-- ─── 2) Review status enum ──────────────────────────────────
-- Hybrid moderation: star ratings publish immediately, free-text
-- comments queue for admin approval. See ReviewStatus enum in schema.
-- (MySQL doesn't use named enum types — the values live as a column
-- constraint on the Review table below.)


-- ─── 3) Review table ────────────────────────────────────────
CREATE TABLE `Review` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `creatorprofileId` INTEGER NOT NULL,
    `visitorId` VARCHAR(64) NOT NULL,
    `rating` INTEGER NOT NULL,
    `comment` VARCHAR(800) NULL,
    `status` ENUM(
        'LIVE',
        'COMMENT_APPROVED',
        'COMMENT_REJECTED',
        'HIDDEN'
    ) NOT NULL DEFAULT 'LIVE',
    `moderatedAt` DATETIME(3) NULL,
    `moderatedByUserId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    -- Dedup: one review per (creator, visitor cookie).
    UNIQUE INDEX `Review_creatorprofileId_visitorId_key`(
        `creatorprofileId`, `visitorId`
    ),
    INDEX `Review_creatorprofileId_idx`(`creatorprofileId`),
    INDEX `Review_status_idx`(`status`),
    INDEX `Review_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;


-- ─── 4) FK from Review → creatorprofile ─────────────────────
ALTER TABLE `Review`
    ADD CONSTRAINT `Review_creatorprofileId_fkey`
        FOREIGN KEY (`creatorprofileId`)
        REFERENCES `creatorprofile`(`id`)
        ON DELETE CASCADE
        ON UPDATE CASCADE;
