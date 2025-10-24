type PromoDiscountType = 'PERCENTAGE' | 'FIXED';

export interface PromoCodeRecord {
  id: string;
  code: string;
  description?: string | null;
  discountType: PromoDiscountType;
  amount: number;
  active: boolean;
  minimumOrderValue?: number | null;
  maxRedemptions?: number | null;
  redemptions: number;
  startsAt?: Date | null;
  endsAt?: Date | null;
}

export const normalizePromoCode = (code: string): string => code.trim().toUpperCase();

export const isPromoActive = (promo: PromoCodeRecord, subtotal: number, now = new Date()) => {
  if (!promo.active) {
    return { valid: false, reason: 'This promo code is inactive.' };
  }

  if (promo.startsAt && now < promo.startsAt) {
    return { valid: false, reason: 'This promo code is not active yet.' };
  }

  if (promo.endsAt && now > promo.endsAt) {
    return { valid: false, reason: 'This promo code has expired.' };
  }

  if (promo.minimumOrderValue && subtotal < promo.minimumOrderValue) {
    return {
      valid: false,
      reason: `Minimum order value of ${promo.minimumOrderValue.toFixed(2)} required.`,
    };
  }

  if (promo.maxRedemptions && promo.redemptions >= promo.maxRedemptions) {
    return { valid: false, reason: 'This promo code has reached its usage limit.' };
  }

  return { valid: true, reason: null };
};

export const getPromoDiscountAmount = (promo: PromoCodeRecord, subtotal: number): number => {
  if (subtotal <= 0) return 0;

  let discount = 0;

  if (promo.discountType === 'PERCENTAGE') {
    discount = subtotal * (promo.amount / 100);
  } else {
    discount = promo.amount;
  }

  if (!Number.isFinite(discount) || discount < 0) {
    return 0;
  }

  return Math.min(discount, subtotal);
};

export interface PromoValidationResult {
  valid: boolean;
  reason: string | null;
  discountAmount: number;
}

export const validatePromo = (promo: PromoCodeRecord | null, subtotal: number): PromoValidationResult => {
  if (!promo) {
    return { valid: false, reason: 'Promo code not found.', discountAmount: 0 };
  }

  const { valid, reason } = isPromoActive(promo, subtotal);

  if (!valid) {
    return { valid: false, reason, discountAmount: 0 };
  }

  const discountAmount = getPromoDiscountAmount(promo, subtotal);

  if (discountAmount <= 0) {
    return { valid: false, reason: 'Promo code does not apply to this order.', discountAmount: 0 };
  }

  return { valid: true, reason: null, discountAmount };
};
