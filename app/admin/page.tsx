import { prisma } from '@/lib/prisma';
import { formatCurrency } from '@/lib/currency';

export const dynamic = 'force-dynamic';

type ProfitRange = 'day' | 'week' | 'month' | 'year' | 'lifetime';

interface AdminDashboardProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminDashboard({ searchParams }: AdminDashboardProps) {
  // Get statistics
  const [totalProducts, totalOrders, pendingOrders, totalRevenue, recentOrders, ordersForProfit] = await Promise.all([
    prisma.product.count(),
    prisma.order.count(),
    prisma.order.count({ where: { status: { in: ['PENDING', 'PROCESSING'] } } }),
    prisma.order.aggregate({ _sum: { total: true } }),
    prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      where: { status: { in: ['PENDING', 'PROCESSING'] } },
      include: { items: true },
    }),
    prisma.order.findMany({
      where: { status: { not: 'CANCELLED' } },
      include: {
        items: {
          select: {
            quantity: true,
            priceAtPurchase: true,
            product: {
              select: {
                costPrice: true,
                shippingCost: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  // Build profit buckets for different ranges
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const startOfWeek = new Date(startOfDay);
  const dayOfWeek = startOfWeek.getDay();
  const diffToMonday = (dayOfWeek + 6) % 7;
  startOfWeek.setDate(startOfWeek.getDate() - diffToMonday);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const profitBuckets: Record<'day' | 'week' | 'month' | 'year' | 'lifetime', { start: Date | null; revenue: number; cost: number }> = {
    day: { start: startOfDay, revenue: 0, cost: 0 },
    week: { start: startOfWeek, revenue: 0, cost: 0 },
    month: { start: startOfMonth, revenue: 0, cost: 0 },
    year: { start: startOfYear, revenue: 0, cost: 0 },
    lifetime: { start: null, revenue: 0, cost: 0 },
  };

  ordersForProfit.forEach((order) => {
    const revenue = order.total;
    const cost = order.items.reduce((acc, item) => {
      const unitCost = item.product?.costPrice ?? 0;
      const shippingCost = item.product?.shippingCost ?? 0;
      return acc + (unitCost + shippingCost) * item.quantity;
    }, 0);

    (Object.keys(profitBuckets) as Array<keyof typeof profitBuckets>).forEach((bucketKey) => {
      const bucket = profitBuckets[bucketKey];
      if (bucket.start && order.createdAt < bucket.start) {
        return;
      }
      bucket.revenue += revenue;
      bucket.cost += cost;
    });
  });

  const profitOptions: Record<ProfitRange, { label: string; helper: string }> = {
    day: { label: 'Today', helper: 'Since midnight' },
    week: { label: 'This Week', helper: 'From Monday' },
    month: { label: 'This Month', helper: 'Calendar month' },
    year: { label: 'This Year', helper: `${now.getFullYear()} totals` },
    lifetime: { label: 'Lifetime', helper: 'All recorded orders' },
  };

  const resolvedSearchParams = await searchParams;
  const requestedRange = typeof resolvedSearchParams?.range === 'string' ? resolvedSearchParams.range : undefined;
  const selectedRange: ProfitRange = requestedRange && requestedRange in profitBuckets ? (requestedRange as ProfitRange) : 'week';
  const selectedSummary = profitBuckets[selectedRange];
  const profitValue = selectedSummary.revenue - selectedSummary.cost;

  return (
    <div>
      <h1 className="font-serif text-4xl text-charcoal-dark mb-8">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-cream-light p-6">
          <div className="text-sm uppercase tracking-wider text-charcoal-light mb-2">
            Total Products
          </div>
          <div className="text-3xl font-serif text-charcoal-dark">
            {totalProducts}
          </div>
        </div>

        <div className="bg-cream-light p-6">
          <div className="text-sm uppercase tracking-wider text-charcoal-light mb-2">
            Total Orders
          </div>
          <div className="text-3xl font-serif text-charcoal-dark">
            {totalOrders}
          </div>
        </div>

        <div className="bg-cream-light p-6">
          <div className="text-sm uppercase tracking-wider text-charcoal-light mb-2">
            Orders Awaiting Shipment
          </div>
          <div className="text-3xl font-serif text-charcoal-dark">
            {pendingOrders}
          </div>
        </div>

        <div className="bg-cream-light p-6">
          <div className="text-sm uppercase tracking-wider text-charcoal-light mb-2">
            Total Revenue
          </div>
          <div className="text-3xl font-serif text-charcoal-dark">
            {formatCurrency(totalRevenue._sum.total || 0)}
          </div>
        </div>
      </div>

      <div className="bg-cream-light p-6 mb-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-serif text-2xl text-charcoal-dark">Profit</h2>
            <p className="text-sm text-charcoal/70">
              {profitOptions[selectedRange].helper}
            </p>
          </div>
          <form className="flex items-center gap-3">
            <label htmlFor="profit-range" className="text-xs uppercase tracking-wider text-charcoal/70">
              Range
            </label>
            <select
              id="profit-range"
              name="range"
              defaultValue={selectedRange}
              className="select-modern-sm bg-white"
            >
              {(Object.keys(profitOptions) as ProfitRange[]).map((rangeKey) => (
                <option key={rangeKey} value={rangeKey}>
                  {profitOptions[rangeKey].label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-lg border border-charcoal/20 px-3 py-2 text-xs uppercase tracking-wider text-charcoal hover:bg-charcoal/5 transition-colors"
            >
              Update
            </button>
          </form>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="bg-cream shadow-sm border border-charcoal/10 p-5 rounded-lg">
            <div className="text-xs uppercase tracking-wider text-charcoal-light">Profit</div>
            <div className="text-3xl font-serif text-charcoal-dark mt-2">
              {formatCurrency(profitValue)}
            </div>
          </div>
          <div className="bg-cream shadow-sm border border-charcoal/10 p-5 rounded-lg">
            <div className="text-xs uppercase tracking-wider text-charcoal-light">Revenue</div>
            <div className="text-xl font-serif text-charcoal-dark mt-2">
              {formatCurrency(selectedSummary.revenue)}
            </div>
          </div>
          <div className="bg-cream shadow-sm border border-charcoal/10 p-5 rounded-lg">
            <div className="text-xs uppercase tracking-wider text-charcoal-light">Costs</div>
            <div className="text-xl font-serif text-charcoal-dark mt-2">
              {formatCurrency(selectedSummary.cost)}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-cream-light p-6">
        <h2 className="font-serif text-2xl text-charcoal-dark mb-4">Needs Fulfillment</h2>

        {recentOrders.length === 0 ? (
          <p className="text-charcoal-light">All caught up — no unshipped orders right now.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-charcoal/10">
                  <th className="text-left py-3 text-sm uppercase tracking-wider text-charcoal-light">Order ID</th>
                  <th className="text-left py-3 text-sm uppercase tracking-wider text-charcoal-light">Customer</th>
                  <th className="text-left py-3 text-sm uppercase tracking-wider text-charcoal-light">Total</th>
                  <th className="text-left py-3 text-sm uppercase tracking-wider text-charcoal-light">Status</th>
                  <th className="text-left py-3 text-sm uppercase tracking-wider text-charcoal-light">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-b border-charcoal/10">
                    <td className="py-3 text-sm text-charcoal">{order.id.slice(0, 8)}</td>
                    <td className="py-3 text-sm text-charcoal">{order.name}</td>
                    <td className="py-3 text-sm text-charcoal">{formatCurrency(order.total)}</td>
                    <td className="py-3">
                      <span className={`inline-block px-2 py-1 text-xs uppercase tracking-wider ${
                        order.status === 'DELIVERED' ? 'bg-beige/30 text-charcoal-dark' :
                        order.status === 'SHIPPED' ? 'bg-beige text-charcoal' :
                        order.status === 'PROCESSING' ? 'bg-cream-dark text-charcoal' :
                        order.status === 'CANCELLED' ? 'bg-charcoal-dark text-cream' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3 text-sm text-charcoal-light">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
