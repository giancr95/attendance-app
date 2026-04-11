-- AlterTable
ALTER TABLE "Permit" ADD COLUMN     "hours" DECIMAL(5,2),
ADD COLUMN     "paid" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lateCutoffMin" INTEGER;

-- AlterTable
ALTER TABLE "Vacation" ADD COLUMN     "paid" BOOLEAN NOT NULL DEFAULT true;
