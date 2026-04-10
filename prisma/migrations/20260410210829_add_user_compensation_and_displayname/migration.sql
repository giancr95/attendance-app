-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deviceName" TEXT,
ADD COLUMN     "hourlyRate" DECIMAL(10,2),
ADD COLUMN     "monthlySalary" DECIMAL(10,2);
