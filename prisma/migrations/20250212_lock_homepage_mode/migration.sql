-- Add lock_homepage flag to restrict the public homepage to countdown/images
ALTER TABLE "homepage_config" ADD COLUMN IF NOT EXISTS "lock_homepage" BOOLEAN NOT NULL DEFAULT false;
