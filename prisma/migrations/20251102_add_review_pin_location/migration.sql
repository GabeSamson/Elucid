-- Create enum type and column for review pin location
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'ReviewPinLocation'
  ) THEN
    CREATE TYPE "ReviewPinLocation" AS ENUM ('AUTO', 'HOME', 'PRODUCT');
  END IF;
END $$;

ALTER TABLE "reviews"
ADD COLUMN IF NOT EXISTS "pin_location" "ReviewPinLocation" NOT NULL DEFAULT 'AUTO';
