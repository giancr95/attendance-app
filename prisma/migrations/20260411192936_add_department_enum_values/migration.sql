-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Department" ADD VALUE 'VENTAS';
ALTER TYPE "Department" ADD VALUE 'CAJAS';
ALTER TYPE "Department" ADD VALUE 'BODEGA';
ALTER TYPE "Department" ADD VALUE 'LIMPIEZA';
ALTER TYPE "Department" ADD VALUE 'MANTENIMIENTO';
