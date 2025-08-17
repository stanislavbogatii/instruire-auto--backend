/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `Instructor` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `Instructor` ADD COLUMN `userId` INTEGER NULL;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `userId` INTEGER NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Instructor_userId_key` ON `Instructor`(`userId`);

-- CreateIndex
CREATE INDEX `Instructor_userId_fkey` ON `Instructor`(`userId`);

-- CreateIndex
CREATE UNIQUE INDEX `User_userId_key` ON `User`(`userId`);

-- CreateIndex
CREATE INDEX `User_userId_fkey` ON `User`(`userId`);

-- AddForeignKey
ALTER TABLE `Instructor` ADD CONSTRAINT `Instructor_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
