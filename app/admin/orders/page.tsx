"use client";

import { useState, useEffect } from "react";
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

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

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

  const updateOrderStatus = async (orderId: string, status: OrderStatus, trackingNumber?: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, trackingNumber }),
      });

      if (res.ok) {
        fetchOrders();
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

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1 className="font-serif text-4xl text-charcoal-dark mb-8">Orders</h1>

      <div className="bg-cream-light p-6">
        {orders.length === 0 ? (
          <p className="text-charcoal-light">No orders yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-charcoal/10">
                  <th className="text-left py-3 text-sm uppercase tracking-wider text-charcoal-light">ID</th>
                  <th className="text-left py-3 text-sm uppercase tracking-wider text-charcoal-light">Customer</th>
                  <th className="text-left py-3 text-sm uppercase tracking-wider text-charcoal-light">Total</th>
                  <th className="text-left py-3 text-sm uppercase tracking-wider text-charcoal-light">Status</th>
                  <th className="text-left py-3 text-sm uppercase tracking-wider text-charcoal-light">Date</th>
                  <th className="text-left py-3 text-sm uppercase tracking-wider text-charcoal-light">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-charcoal/10">
                    <td className="py-3 text-sm text-charcoal">{order.id.slice(0, 8)}</td>
                    <td className="py-3 text-sm text-charcoal">
                      <div>{order.name}</div>
                      <div className="text-xs text-charcoal-light">{order.email ?? 'No email provided'}</div>
                    </td>
                    <td className="py-3 text-sm text-charcoal">{formatCurrency(order.total)}</td>
                    <td className="py-3">
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
                ))}
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
              <div>
                <strong>Status:</strong> {selectedOrder.status}
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

              {!selectedOrder.trackingNumber && !selectedOrder.isInPerson && selectedOrder.status !== 'CANCELLED' && (
                <div className="pt-4 border-t">
                  <label className="block mb-2"><strong>Mark as shipped / add tracking number</strong></label>
                  <p className="text-xs text-charcoal/60 mb-2">
                    Add an optional tracking reference to mark this order as shipped and share details with the customer.
                  </p>
                  <input
                    type="text"
                    id="tracking"
                    className="input-modern"
                    placeholder="Enter tracking number"
                  />
                  <button
                    onClick={() => {
                      const input = document.getElementById('tracking') as HTMLInputElement;
                      updateOrderStatus(selectedOrder.id, 'SHIPPED', input.value);
                    }}
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
