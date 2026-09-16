-- CreateEnum
CREATE TYPE "Season" AS ENUM ('SPRING', 'SUMMER', 'AUTUMN', 'WINTER');

-- CreateTable
CREATE TABLE "Pin" (
    "id" TEXT NOT NULL,
    "season" "Season" NOT NULL,
    "comment" VARCHAR(50) NOT NULL,
    "muniCd" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Pin_muniCd_idx" ON "Pin"("muniCd");

-- CreateIndex
CREATE INDEX "Pin_expiresAt_idx" ON "Pin"("expiresAt");
