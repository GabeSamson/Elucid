"use client";

import { useEffect, useMemo, useState } from "react";
import { formatCurrency } from "@/lib/currency";

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  sizes: string[];
  colors: Array<{ name: string; hexCode: string }>;
}

interface SelectedItem {
  product: Product;
  quantity: number;
  size?: string;
  color?: string;
}

interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  priceAtPurchase: number;
  size?: string | null;
  color?: string | null;
}

interface SaleSummary {
  id: string;
  name: string;
  email?: string | null;
  total: number;
  createdAt: string;
  items: SaleItem[];
}

export default function InPersonSalesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerLocation, setCustomerLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [sales, setSales] = useState<SaleSummary[]>([]);
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [deletingSaleId, setDeletingSaleId] = useState<string | null>(null);

  const isEditing = Boolean(editingSaleId);

  useEffect(() => {
    fetchProducts();
    fetchSales();
  }, []);

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (res.ok) {
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchSales = async () => {
    try {
      const res = await fetch('/api/admin/in-person-sale');
      const data = await res.json();
      if (res.ok) {
        setSales((data.orders || []).map((order: any) => ({
          ...order,
          createdAt: order.createdAt,
        })));
      }
    } catch (error) {
      console.error('Error fetching in-person sales:', error);
    }
  };

  const addItem = (product: Product) => {
    setSelectedItems((prev) => [...prev, { product, quantity: 1 }]);
  };

  const removeItem = (index: number) => {
    setSelectedItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updateQuantity = (index: number, quantity: number) => {
    setSelectedItems((prev) =>
      prev
        .map((item, idx) => (idx === index ? { ...item, quantity } : item))
        .filter((item) => item.quantity > 0)
    );
  };

  const total = useMemo(
    () => selectedItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [selectedItems]
  );

  const resetForm = () => {
    setSelectedItems([]);
    setCustomerName("");
    setCustomerEmail("");
    setCustomerLocation("");
    setEditingSaleId(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!customerName.trim() || selectedItems.length === 0) {
      setFeedback({ type: 'error', message: 'Add a customer name and at least one product.' });
      return;
    }

    setLoading(true);
    setFeedback(null);

    try {
      const payload = {
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim() || undefined,
        customerLocation: customerLocation.trim() || undefined,
        items: selectedItems.map((item) => ({
          productId: item.product.id,
          productName: item.product.name,
          quantity: item.quantity,
          size: item.size || undefined,
          color: item.color || undefined,
        })),
      };

      const endpoint = isEditing ? `/api/admin/in-person-sale/${editingSaleId}` : '/api/admin/in-person-sale';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save sale');
      }

      await Promise.all([fetchProducts(), fetchSales()]);
      setFeedback({ type: 'success', message: isEditing ? 'Sale updated.' : 'Sale recorded.' });
      resetForm();
    } catch (error) {
      console.error('Error saving in-person sale:', error);
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Failed to save sale.' });
    } finally {
      setLoading(false);
    }
  };

  const startEditingSale = (sale: SaleSummary) => {
    setEditingSaleId(sale.id);
    setCustomerName(sale.name);
    setCustomerEmail(sale.email ?? "");
    // Note: location not stored in sale summary yet, will be once API is updated
    setCustomerLocation("");

    const nextItems: SelectedItem[] = sale.items.map((item) => {
      const existingProduct = products.find((p) => p.id === item.productId);
      return {
        product: existingProduct || {
          id: item.productId,
          name: item.productName,
          price: item.priceAtPurchase,
          stock: 0,
          sizes: [],
          colors: [],
        },
        quantity: item.quantity,
        size: item.size || undefined,
        color: item.color || undefined,
      };
    });

    setSelectedItems(nextItems);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteSale = async (saleId: string) => {
    const confirmed = window.confirm('Remove this recorded sale? Inventory will be restocked.');
    if (!confirmed) return;

    setDeletingSaleId(saleId);
    setFeedback(null);

    try {
      const res = await fetch(`/api/admin/in-person-sale/${saleId}`, { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete sale');
      }

      if (editingSaleId === saleId) {
        resetForm();
      }

      await Promise.all([fetchProducts(), fetchSales()]);
      setFeedback({ type: 'success', message: 'Sale removed and inventory restored.' });
    } catch (error) {
      console.error('Error deleting in-person sale:', error);
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Failed to delete sale.' });
    } finally {
      setDeletingSaleId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-4xl text-charcoal-dark mb-2">In-Person Sale</h1>
          <p className="text-charcoal/60">Build a custom basket for walk-in customers and keep stock levels in sync.</p>
        </div>
        {isEditing && (
          <span className="px-3 py-1 rounded-full bg-charcoal text-cream text-xs uppercase tracking-wider">
            Editing Sale
          </span>
        )}
      </div>

      {feedback && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            feedback.type === 'success'
              ? 'border-beige bg-beige/20 text-charcoal'
              : 'border-charcoal bg-cream-dark text-charcoal-dark'
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Left: Product Selection */}
        <div className="bg-cream-light p-6 rounded-xl border border-charcoal/10">
          <h2 className="font-serif text-2xl text-charcoal-dark mb-4">Select Products</h2>
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {products.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => addItem(product)}
                disabled={product.stock === 0}
                className="w-full text-left p-3 border border-charcoal/15 hover:border-charcoal transition-colors rounded-lg disabled:opacity-40"
              >
                <div className="font-medium text-charcoal">{product.name}</div>
                <div className="text-sm text-charcoal/60">
                  {formatCurrency(product.price)} • Stock: {product.stock}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Sale Summary */}
        <form onSubmit={handleSubmit} className="bg-cream-light p-6 rounded-xl border border-charcoal/10 space-y-6">
          <div className="space-y-4">
            <input
              type="text"
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              placeholder="Customer Name"
              className="input-modern"
              required
            />
            <input
              type="email"
              value={customerEmail}
              onChange={(event) => setCustomerEmail(event.target.value)}
              placeholder="Customer Email (optional)"
              className="input-modern"
            />
            <input
              type="text"
              value={customerLocation}
              onChange={(event) => setCustomerLocation(event.target.value)}
              placeholder="Location (e.g., London, UK) - Optional"
              className="input-modern"
            />
          </div>

          <div>
            <h3 className="font-medium mb-3">Items</h3>
            {selectedItems.length === 0 ? (
              <p className="text-sm text-charcoal/60">No items added yet</p>
            ) : (
              <div className="space-y-3">
                {selectedItems.map((item, idx) => (
                  <div key={`${item.product.id}-${idx}`} className="rounded-lg border border-charcoal/10 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-charcoal">{item.product.name}</p>
                        <p className="text-xs text-charcoal/60">{formatCurrency(item.product.price)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateQuantity(idx, item.quantity - 1)}
                          className="w-8 h-8 border border-charcoal/20 rounded hover:border-charcoal flex items-center justify-center"
                        >
                          -
                        </button>
                        <span className="w-8 text-center text-sm">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(idx, item.quantity + 1)}
                          className="w-8 h-8 border border-charcoal/20 rounded hover:border-charcoal flex items-center justify-center"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="text-xs text-charcoal-dark hover:underline ml-2"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    {/* Size and Color Selection */}
                    <div className="flex gap-2">
                      {item.product.sizes && item.product.sizes.length > 0 && (
                        <select
                          value={item.size || ''}
                          onChange={(e) => {
                            setSelectedItems((prev) =>
                              prev.map((i, index) =>
                                index === idx ? { ...i, size: e.target.value || undefined } : i
                              )
                            );
                          }}
                          className="flex-1 text-xs px-2 py-1.5 border border-charcoal/20 rounded"
                        >
                          <option value="">Size (Optional)</option>
                          {item.product.sizes.map((size) => (
                            <option key={size} value={size}>{size}</option>
                          ))}
                        </select>
                      )}

                      {item.product.colors && item.product.colors.length > 0 && (
                        <select
                          value={item.color || ''}
                          onChange={(e) => {
                            setSelectedItems((prev) =>
                              prev.map((i, index) =>
                                index === idx ? { ...i, color: e.target.value || undefined } : i
                              )
                            );
                          }}
                          className="flex-1 text-xs px-2 py-1.5 border border-charcoal/20 rounded"
                        >
                          <option value="">Color (Optional)</option>
                          {item.product.colors.map((color) => (
                            <option key={color.name} value={color.name}>{color.name}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-charcoal/10 flex items-center justify-between text-lg font-medium">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={loading || selectedItems.length === 0}
              className="px-6 py-3 bg-charcoal text-cream rounded-lg hover:bg-charcoal/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : isEditing ? 'Update Sale' : 'Record Sale'}
            </button>
            {(isEditing || selectedItems.length > 0 || customerName || customerEmail) && (
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-3 border border-charcoal/30 rounded-lg hover:border-charcoal transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="bg-cream-light p-6 rounded-xl border border-charcoal/10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-2xl text-charcoal-dark">Recent In-Person Sales</h2>
          <button
            type="button"
            onClick={fetchSales}
            className="text-sm text-charcoal hover:underline"
          >
            Refresh
          </button>
        </div>

        {sales.length === 0 ? (
          <p className="text-charcoal/60">No in-person sales recorded yet.</p>
        ) : (
          <div className="space-y-4">
            {sales.map((sale) => (
              <div
                key={sale.id}
                className={`border border-charcoal/15 rounded-lg p-4 ${
                  editingSaleId === sale.id ? 'ring-2 ring-charcoal' : ''
                }`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <div>
                    <p className="text-charcoal font-medium">{sale.name}</p>
                    <p className="text-xs text-charcoal/60">{sale.email ?? 'No email provided'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-charcoal font-semibold">{formatCurrency(sale.total)}</p>
                    <p className="text-xs text-charcoal/50">
                      {new Date(sale.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="mt-3 space-y-1 text-sm text-charcoal/70">
                  {sale.items.map((item, itemIdx) => (
                    <div key={`${sale.id}-${item.productId}-${itemIdx}`}>
                      • {item.productName} ×{item.quantity}
                      {(item.size || item.color) && (
                        <span className="text-xs text-charcoal/50 ml-1">
                          ({[item.size, item.color].filter(Boolean).join(', ')})
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => startEditingSale(sale)}
                    className="px-6 py-3 border border-charcoal/30 rounded-lg hover:border-charcoal transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSale(sale.id)}
                    disabled={deletingSaleId === sale.id}
                    className="px-6 py-3 bg-charcoal-dark text-cream rounded-lg hover:bg-charcoal transition-colors disabled:opacity-50"
                  >
                    {deletingSaleId === sale.id ? 'Removing…' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
