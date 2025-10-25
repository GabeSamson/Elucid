import { prisma } from '@/lib/prisma';
import PromoCodesManager from '@/components/admin/PromoCodesManager';

export const dynamic = 'force-dynamic';

export default async function AdminPromoCodesPage() {
  const promos = await (prisma as any).promoCode.findMany({
    orderBy: { createdAt: 'desc' },
  });

  const serializedPromos = promos.map((promo: any) => ({
    ...promo,
    createdAt: promo.createdAt.toISOString(),
    updatedAt: promo.updatedAt.toISOString(),
    startsAt: promo.startsAt ? promo.startsAt.toISOString() : null,
    endsAt: promo.endsAt ? promo.endsAt.toISOString() : null,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-4xl text-charcoal-dark mb-4">Promo Codes</h1>
        <p className="text-charcoal/60">
          Create and manage discount codes for online checkout.
        </p>
      </div>
      <PromoCodesManager initialPromos={serializedPromos} />
    </div>
  );
}
