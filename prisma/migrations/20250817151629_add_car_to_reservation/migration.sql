-- AlterTable
ALTER TABLE `Reservation` ADD COLUMN `carId` INTEGER NULL;

-- CreateIndex
CREATE INDEX `Reservation_carId_fkey` ON `Reservation`(`carId`);

-- AddForeignKey
ALTER TABLE `Reservation` ADD CONSTRAINT `Reservation_carId_fkey` FOREIGN KEY (`carId`) REFERENCES `Car`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
