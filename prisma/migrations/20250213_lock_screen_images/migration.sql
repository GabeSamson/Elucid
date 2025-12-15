-- Add lock screen image support
ALTER TABLE "homepage_config"
ADD COLUMN IF NOT EXISTS "lock_images" TEXT,
ADD COLUMN IF NOT EXISTS "lock_slideshow" BOOLEAN NOT NULL DEFAULT false;
