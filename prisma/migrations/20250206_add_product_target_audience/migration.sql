-- CreateEnum
CREATE TYPE "ProductAudience" AS ENUM ('MALE', 'FEMALE', 'UNISEX');

-- AlterTable
ALTER TABLE "products"
ADD COLUMN "target_audience" "ProductAudience" NOT NULL DEFAULT 'UNISEX';
