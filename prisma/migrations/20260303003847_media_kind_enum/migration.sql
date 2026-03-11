/*
  Warnings:

  - You are about to alter the column `kind` on the `media` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Enum(EnumId(4))`.

*/
-- AlterTable
ALTER TABLE `media` MODIFY `kind` ENUM('IMAGE', 'VIDEO') NOT NULL;
