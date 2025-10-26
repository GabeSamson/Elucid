-- Add coming-soon support to products
ALTER TABLE "products"
ADD COLUMN IF NOT EXISTS "coming_soon" BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE "products"
ADD COLUMN IF NOT EXISTS "release_date" TIMESTAMP WITH TIME ZONE;
