-- Anonymous likes — make userId nullable, add visitorId for cookie-based
-- dedup, swap the compound PK for an autoincrement id, add the new
-- unique constraints and indexes.
--
-- Rationale: the platform's business model treats visitors as the primary
-- engagement audience and doesn't require accounts. Forcing a login at
-- the like moment was a friction tax that's now removed. Anonymous likes
-- dedup via the `vid` cookie the analytics endpoint already uses; signed-
-- in likes continue to dedup via userId.

-- 1. Drop the existing foreign keys so we can restructure the table.
ALTER TABLE `postlike` DROP FOREIGN KEY `postlike_userId_fkey`;
ALTER TABLE `postlike` DROP FOREIGN KEY `postlike_postId_fkey`;

-- 2. Drop the existing composite primary key (postId, userId).
ALTER TABLE `postlike` DROP PRIMARY KEY;

-- 3. Allow userId to be NULL (visitor likes set it null + use visitorId).
ALTER TABLE `postlike` MODIFY COLUMN `userId` INTEGER NULL;

-- 4. Add the new autoincrement `id` column as the primary key, plus the
--    `visitorId` column for the cookie-based anonymous dedup.
ALTER TABLE `postlike`
    ADD COLUMN `id` INTEGER NOT NULL AUTO_INCREMENT PRIMARY KEY FIRST,
    ADD COLUMN `visitorId` VARCHAR(64) NULL;

-- 5. Re-create the foreign keys (no cascade behavior changes).
ALTER TABLE `postlike`
    ADD CONSTRAINT `postlike_postId_fkey`
        FOREIGN KEY (`postId`) REFERENCES `post`(`id`)
        ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `postlike`
    ADD CONSTRAINT `postlike_userId_fkey`
        FOREIGN KEY (`userId`) REFERENCES `user`(`id`)
        ON DELETE CASCADE ON UPDATE CASCADE;

-- 6. Uniqueness — one like per (post, actor). MySQL allows multiple NULLs
--    through a unique index, which is exactly what we want here:
--    anonymous likes dedup via visitorId, signed-in likes via userId, and
--    a row has exactly one of the two set so collisions are impossible.
CREATE UNIQUE INDEX `postlike_postId_userId_key`    ON `postlike`(`postId`, `userId`);
CREATE UNIQUE INDEX `postlike_postId_visitorId_key` ON `postlike`(`postId`, `visitorId`);

-- 7. Lookup index on visitorId — the like API queries by it on every
--    anonymous toggle.
CREATE INDEX `postlike_visitorId_idx` ON `postlike`(`visitorId`);
