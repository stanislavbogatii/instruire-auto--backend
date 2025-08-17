/*
  Warnings:

  - You are about to drop the `Car` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `Car` DROP FOREIGN KEY `Car_instructorId_fkey`;

-- DropTable
DROP TABLE `Car`;
