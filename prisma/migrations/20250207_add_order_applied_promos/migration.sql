-- Create table to track multiple promo codes applied to an order
CREATE TABLE "order_applied_promo_codes" (
  "id" TEXT NOT NULL,
  "order_id" TEXT NOT NULL,
  "promo_code_id" TEXT,
  "code" TEXT NOT NULL,
  "discount_type" "PromoDiscountType" NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "discount_applied" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "order_applied_promo_codes_pkey" PRIMARY KEY ("id")
);

-- Maintain referential integrity back to orders and promo codes
ALTER TABLE "order_applied_promo_codes"
  ADD CONSTRAINT "order_applied_promo_codes_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "order_applied_promo_codes"
  ADD CONSTRAINT "order_applied_promo_codes_promo_code_id_fkey"
  FOREIGN KEY ("promo_code_id") REFERENCES "promo_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Speed up lookups of promos for a specific order
CREATE INDEX "order_applied_promo_codes_order_id_idx"
  ON "order_applied_promo_codes"("order_id");
