-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO');

-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "mpRefreshToken" TEXT,
ADD COLUMN     "mpTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "mpUserId" TEXT,
ADD COLUMN     "plan" "Plan" NOT NULL DEFAULT 'FREE',
ADD COLUMN     "proSubscriptionId" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "feeCents" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "Business_proSubscriptionId_key" ON "Business"("proSubscriptionId");
