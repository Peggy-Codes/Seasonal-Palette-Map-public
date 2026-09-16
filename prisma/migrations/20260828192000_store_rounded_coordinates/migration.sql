-- Old Pin rows only contain a municipality code, so their original coordinates
-- cannot be recovered at the new three-decimal precision.
TRUNCATE TABLE "Pin";

-- DropIndex
DROP INDEX "Pin_muniCd_idx";

-- AlterTable
ALTER TABLE "Pin"
DROP COLUMN "muniCd",
ADD COLUMN "lat" DOUBLE PRECISION NOT NULL,
ADD COLUMN "lng" DOUBLE PRECISION NOT NULL;
