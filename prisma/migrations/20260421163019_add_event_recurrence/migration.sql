-- CreateEnum
CREATE TYPE "EventRecurrence" AS ENUM ('NONE', 'YEARLY');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "recurrence" "EventRecurrence" NOT NULL DEFAULT 'NONE';

-- CreateIndex
CREATE INDEX "Event_recurrence_idx" ON "Event"("recurrence");
