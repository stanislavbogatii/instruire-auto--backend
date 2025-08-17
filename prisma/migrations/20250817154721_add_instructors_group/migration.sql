-- AlterTable
ALTER TABLE `Instructor` ADD COLUMN `instructorsGroupId` INTEGER NULL;

-- AlterTable
ALTER TABLE `Reservation` ADD COLUMN `instructorsGroupId` INTEGER NULL;

-- CreateTable
CREATE TABLE `InstructorsGroup` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Instructor_instructorsGroupId_idx` ON `Instructor`(`instructorsGroupId`);

-- CreateIndex
CREATE INDEX `Reservation_instructorsGroupId_idx` ON `Reservation`(`instructorsGroupId`);

-- AddForeignKey
ALTER TABLE `Reservation` ADD CONSTRAINT `Reservation_instructorsGroupId_fkey` FOREIGN KEY (`instructorsGroupId`) REFERENCES `InstructorsGroup`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Instructor` ADD CONSTRAINT `Instructor_instructorsGroupId_fkey` FOREIGN KEY (`instructorsGroupId`) REFERENCES `InstructorsGroup`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
