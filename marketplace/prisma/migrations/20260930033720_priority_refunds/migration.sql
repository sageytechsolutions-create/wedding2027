-- AlterTable
ALTER TABLE "VendorOrder" ADD COLUMN     "payoutReversed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "priorityFee" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "priorityRefundedAt" TIMESTAMP(3),
ADD COLUMN     "stripePriorityRefundId" TEXT;
