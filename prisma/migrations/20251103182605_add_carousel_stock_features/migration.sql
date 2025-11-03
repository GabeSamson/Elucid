-- AlterTable
ALTER TABLE "products" ADD COLUMN "reserved_stock" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "homepage_config" ADD COLUMN "rotate_homepage_reviews" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "homepage_config" ADD COLUMN "auto_deduct_stock" BOOLEAN NOT NULL DEFAULT false;
