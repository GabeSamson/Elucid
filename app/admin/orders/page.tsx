'use client';

import { useState, useEffect, useMemo } from "react";
import { formatCurrency } from "@/lib/currency";

type OrderStatus = 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  priceAtPurchase: number;
  size?: string | null;
  color?: string | null;
}

interface Order {
  id: string;
  name: string;
  email?: string | null;
  total: number;
  subtotal: number;
  shipping: number;
  tax: number;
  discount?: number;
  promoCodeCode?: string | null;
  status: OrderStatus;
  trackingNumber: string | null;
  createdAt: string;
  items: OrderItem[];
  isInPerson: boolean;
}

interface ProfitPeriod {
  revenue: number;
  cost: number;
  profit: number;
}

type ProfitResponse = Record<'day' | 'week' | 'month' | 'year' | 'lifetime', ProfitPeriod>;

type OrderFilter = 'needs' | 'completed' | 'cancelled' | 'all';

const NEEDS_FULFILLMENT: OrderStatus[] = ['PENDING', 'PROCESSING'];
const COMPLETED_STATUSES: OrderStatus[] = ['SHIPPED', 'DELIVERED'];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [profits, setProfits] = useState<ProfitResponse | null>(null);
  const [profitsLoading, setProfitsLoading] = useState(true);
  const [profitsError, setProfitsError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<OrderFilter>('needs');
  const [trackingInput, setTrackingInput] = useState('');

  useEffect(() => {
    fetchOrders();
    fetchProfits();
  }, []);

  useEffect(() => {
    if (selectedOrder?.trackingNumber) {
      setTrackingInput(selectedOrder.trackingNumber);
    } else {
      setTrackingInput('');
    }
  }, [selectedOrder]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/orders', {
        cache: 'no-store',
      });
      const data = await res.json();
      if (res.ok) {
        setOrders(
          (data.orders || []).map((order: any) => ({
            ...order,
            discount: order.discount ?? 0,
          }))
        );
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfits = async () => {
    setProfitsLoading(true);
    setProfitsError(null);
    try {
      const res = await fetch('/api/admin/orders/profits', {
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load profits');
      }
      setProfits(data.periods as ProfitResponse);
    } catch (error) {
      console.error('Error fetching profits:', error);
      setProfitsError('Unable to load profit summary');
      setProfits(null);
    } finally {
      setProfitsLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus, trackingNumber?: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, trackingNumber }),
      });

      if (res.ok) {
        await fetchOrders();
        setSelectedOrder(null);
        alert('Order updated successfully');
      }
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Failed to update order');
    }
  };

  const deleteOrder = async (orderId: string) => {
    const confirmed = window.confirm('This will permanently delete the order and its analytics. Continue?');
    if (!confirmed) return;

    setDeletingOrderId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to delete order');
      }

      setOrders((prev) => prev.filter((order) => order.id !== orderId));
      await fetchOrders();
      setSelectedOrder(null);
      alert('Order deleted successfully');
    } catch (error) {
      console.error('Error deleting order:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete order');
    } finally {
      setDeletingOrderId(null);
    }
  };

  const needsFulfillmentOrders = useMemo(
    () => orders.filter((order) => NEEDS_FULFILLMENT.includes(order.status)),
    [orders]
  );
  const completedOrders = useMemo(
    () => orders.filter((order) => COMPLETED_STATUSES.includes(order.status)),
    [orders]
  );
  const cancelledOrders = useMemo(
    () => orders.filter((order) => order.status === 'CANCELLED'),
    [orders]
  );

  const filteredOrders = useMemo(() => {
    switch (activeFilter) {
      case 'needs':
        return needsFulfillmentOrders;
      case 'completed':
        return completedOrders;
      case 'cancelled':
        return cancelledOrders;
      default:
        return orders;
    }
  }, [activeFilter, orders, needsFulfillmentOrders, completedOrders, cancelledOrders]);

  const filterButtons: Array<{ key: OrderFilter; label: string; count: number }> = [
    { key: 'needs', label: 'Needs Shipping', count: needsFulfillmentOrders.length },
    { key: 'completed', label: 'Completed', count: completedOrders.length },
    { key: 'cancelled', label: 'Cancelled', count: cancelledOrders.length },
    { key: 'all', label: 'All Orders', count: orders.length },
  ];

  const profitCards: Array<{ key: keyof ProfitResponse; label: string; helper: string }> = [
    { key: 'day', label: 'Today', helper: 'Since midnight' },
    { key: 'week', label: 'This Week', helper: 'From Monday' },
    { key: 'month', label: 'This Month', helper: 'Calendar month' },
    { key: 'year', label: 'This Year', helper: `${new Date().getFullYear()} totals` },
    { key: 'lifetime', label: 'Lifetime', helper: 'All recorded orders' },
  ];

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <h1 className="font-serif text-4xl text-charcoal-dark">Orders</h1>
        <div className="flex gap-2">
          <button
            onClick={fetchOrders}
            className="px-4 py-2 text-sm bg-charcoal-dark text-cream rounded-lg hover:bg-charcoal transition-colors"
          >
            Refresh Orders
          </button>
          <button
            onClick={fetchProfits}
            className="px-4 py-2 text-sm border border-charcoal-dark text-charcoal-dark rounded-lg hover:bg-charcoal-dark hover:text-cream transition-colors"
          >
            Refresh Profit
          </button>
        </div>
      </div>

      <div className="bg-cream-light p-6 mb-8">
        <h2 className="font-serif text-2xl text-charcoal-dark mb-4">Profit Snapshot</h2>
        {profitsLoading ? (
          <p className="text-charcoal-light text-sm">Calculating profits…</p>
        ) : profitsError ? (
          <p className="text-sm text-red-700">{profitsError}</p>
        ) : profits ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {profitCards.map(({ key, label, helper }) => {
              const period = profits[key];
              return (
                <div key={key} className="bg-cream shadow-sm border border-charcoal/10 p-4 rounded-lg">
                  <div className="text-xs uppercase tracking-wider text-charcoal-light">{label}</div>
                  <div className="text-2xl font-serif text-charcoal-dark mt-1">
                    {formatCurrency(period.profit)}
                  </div>
                  <div className="text-xs text-charcoal/70 mt-3">
                    {helper}
                    <br />
                    Revenue {formatCurrency(period.revenue)} · Costs {formatCurrency(period.cost)}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-charcoal-light text-sm">No profit data available yet.</p>
        )}
      </div>

      <div className="bg-cream-light p-6">
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {filterButtons.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                activeFilter === key
                  ? 'bg-charcoal-dark text-cream border-charcoal-dark'
                  : 'border-charcoal/20 text-charcoal hover:border-charcoal/60'
              }`}
            >
              {label} ({count})
            </button>
          ))}
        </div>

        {filteredOrders.length === 0 ? (
          <p className="text-charcoal-light">No orders to show for this view.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-charcoal/10">
                  <th className="text-left py-3 text-sm uppercase tracking-wider text-charcoal-light">Ship</th>
                  <th className="text-left py-3 text-sm uppercase tracking-wider text-charcoal-light">ID</th>
                  <th className="text-left py-3 text-sm uppercase tracking-wider text-charcoal-light">Customer</th>
                  <th className="text-left py-3 text-sm uppercase tracking-wider text-charcoal-light">Total</th>
                  <th className="text-left py-3 text-sm uppercase tracking-wider text-charcoal-light">Status</th>
                  <th className="text-left py-3 text-sm uppercase tracking-wider text-charcoal-light">Placed</th>
                  <th className="text-left py-3 text-sm uppercase tracking-wider text-charcoal-light">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const isFulfilled = COMPLETED_STATUSES.includes(order.status);
                  return (
                    <tr key={order.id} className="border-b border-charcoal/10">
                      <td className="py-3 text-sm">
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-charcoal-dark"
                            checked={isFulfilled}
                            disabled={isFulfilled}
                            onChange={(event) => {
                              if (event.target.checked) {
                                updateOrderStatus(order.id, 'SHIPPED');
                              }
                            }}
                          />
                          <span className="text-xs uppercase tracking-wider text-charcoal-light">
                            {isFulfilled ? 'Fulfilled' : 'Mark shipped'}
                          </span>
                        </label>
                      </td>
                      <td className="py-3 text-sm text-charcoal">{order.id.slice(0, 8)}</td>
                      <td className="py-3 text-sm text-charcoal">
                        <div>{order.name}</div>
                        <div className="text-xs text-charcoal-light">{order.email ?? 'No email provided'}</div>
                      </td>
                      <td className="py-3 text-sm text-charcoal">{formatCurrency(order.total)}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-block px-2 py-1 text-xs uppercase tracking-wider rounded ${
                              order.status === 'DELIVERED'
                                ? 'bg-beige/40 text-charcoal-dark'
                                : order.status === 'SHIPPED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : order.status === 'PROCESSING'
                                ? 'bg-amber-100 text-amber-800'
                                : order.status === 'CANCELLED'
                                ? 'bg-red-900 text-cream'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {order.status}
                          </span>
                          <select
                            value={order.status}
                            onChange={(e) => updateOrderStatus(order.id, e.target.value as OrderStatus)}
                            className="select-modern-sm"
                          >
                            <option value="PENDING">Pending</option>
                            <option value="PROCESSING">Processing</option>
                            <option value="SHIPPED">Shipped</option>
                            <option value="DELIVERED">Delivered</option>
                            <option value="CANCELLED">Cancelled</option>
                          </select>
                        </div>
                      </td>
                      <td className="py-3 text-sm text-charcoal-light">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="text-sm text-charcoal hover:underline"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-charcoal-dark/80 flex items-center justify-center z-50 p-4">
          <div className="bg-cream max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h2 className="font-serif text-2xl text-charcoal-dark">Order Details</h2>
              <button onClick={() => setSelectedOrder(null)} className="text-charcoal hover:text-charcoal-dark">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <strong>Order ID:</strong> {selectedOrder.id}
              </div>
              <div>
                <strong>Customer:</strong> {selectedOrder.name} {selectedOrder.email ? `(${selectedOrder.email})` : ''}
              </div>
              <div className="flex items-center gap-3">
                <strong>Status:</strong>
                <select
                  value={selectedOrder.status}
                  onChange={(e) => updateOrderStatus(selectedOrder.id, e.target.value as OrderStatus)}
                  className="select-modern-sm"
                >
                  <option value="PENDING">Pending</option>
                  <option value="PROCESSING">Processing</option>
                  <option value="SHIPPED">Shipped</option>
                  <option value="DELIVERED">Delivered</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
              {selectedOrder.trackingNumber && (
                <div>
                  <strong>Tracking:</strong> {selectedOrder.trackingNumber}
                </div>
              )}
              <div>
                <strong>Subtotal:</strong> {formatCurrency(selectedOrder.subtotal)}
              </div>
              <div>
                <strong>Shipping:</strong> {formatCurrency(selectedOrder.shipping)}
              </div>
              {selectedOrder.tax > 0 && (
                <div>
                  <strong>Tax:</strong> {formatCurrency(selectedOrder.tax)}
                </div>
              )}
              {(selectedOrder.discount ?? 0) > 0 && (
                <div>
                  <strong>Discount:</strong> -{formatCurrency(selectedOrder.discount ?? 0)}
                  {selectedOrder.promoCodeCode ? ` (${selectedOrder.promoCodeCode})` : ''}
                </div>
              )}
              <div>
                <strong>Source:</strong> {selectedOrder.isInPerson ? 'In-Person Sale' : 'Online Order'}
              </div>

              <div className="pt-4 border-t">
                <strong className="block mb-2">Items:</strong>
                {selectedOrder.items.map((item, idx) => (
                  <div key={idx} className="ml-4 mb-2">
                    • {item.productName} x{item.quantity} - {formatCurrency(item.priceAtPurchase * item.quantity)}
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t">
                <strong>Total:</strong> {formatCurrency(selectedOrder.total)}
              </div>

              {!selectedOrder.isInPerson && selectedOrder.status !== 'CANCELLED' && (
                <div className="pt-4 border-t">
                  <label className="block mb-2"><strong>Mark as shipped / add tracking number</strong></label>
                  <p className="text-xs text-charcoal/60 mb-2">
                    Add an optional tracking reference to mark this order as shipped and share details with the customer.
                  </p>
                  <input
                    type="text"
                    value={trackingInput}
                    onChange={(event) => setTrackingInput(event.target.value)}
                    className="input-modern"
                    placeholder="Enter tracking number"
                  />
                  <button
                    onClick={() => updateOrderStatus(selectedOrder.id, 'SHIPPED', trackingInput)}
                    className="mt-3 px-7 py-3 bg-charcoal-dark text-cream rounded-lg hover:bg-charcoal transition-colors"
                  >
                    Save Tracking
                  </button>
                </div>
              )}

              <div className="pt-4 border-t">
                <button
                  onClick={() => deleteOrder(selectedOrder.id)}
                  disabled={deletingOrderId === selectedOrder.id}
                  className="px-7 py-3 bg-charcoal-dark text-cream rounded-lg hover:bg-charcoal transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {deletingOrderId === selectedOrder.id ? 'Deleting…' : 'Delete Order'}
                </button>
                <p className="mt-2 text-xs text-charcoal/60">
                  Deleting removes this order and updates analytics immediately.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
