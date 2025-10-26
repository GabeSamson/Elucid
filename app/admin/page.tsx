import { prisma } from '@/lib/prisma';
import { formatCurrency } from '@/lib/currency';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  // Get statistics
  const [totalProducts, totalOrders, pendingOrders, totalRevenue, recentOrders] = await Promise.all([
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
  ]);

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
