'use client';

import { useEffect, useState } from 'react';
import { formatCurrency } from '@/lib/currency';

interface InventoryVariant {
  id: string;
  productId: string;
  size: string;
  color: string;
  stock: number;
  sku: string | null;
  product: {
    id: string;
    name: string;
    price: number;
    active: boolean;
    reservedStock: number;
  };
}

export default function AdminInventoryPage() {
  const [variants, setVariants] = useState<InventoryVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState('all'); // all, low, out, ok
  const [activeFilter, setActiveFilter] = useState('all'); // all, active, inactive
  const [updating, setUpdating] = useState<string | null>(null);
  const [releasing, setReleasing] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchInventory();
  }, []);

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/inventory');
      const data = await res.json();

      if (res.ok) {
        setVariants(data.variants || []);
      } else {
        throw new Error(data.error || 'Failed to load inventory');
      }
    } catch (error: any) {
      setFeedback({ type: 'error', message: error.message || 'Failed to load inventory' });
    } finally {
      setLoading(false);
    }
  };

  const handleStockUpdate = async (variantId: string, newStock: number) => {
    setUpdating(variantId);
    setFeedback(null);

    try {
      const res = await fetch('/api/admin/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variantId, stock: newStock }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update stock');
      }

      setFeedback({ type: 'success', message: 'Stock updated successfully' });
      await fetchInventory();
    } catch (error: any) {
      setFeedback({ type: 'error', message: error.message || 'Failed to update stock' });
    } finally {
      setUpdating(null);
    }
  };

  const handleReleaseReservedStock = async (productId: string) => {
    if (!confirm('Are you sure you want to release all reserved stock for this product? This will move reserved stock back to available stock.')) {
      return;
    }

    setReleasing(productId);
    setFeedback(null);

    try {
      const res = await fetch('/api/admin/inventory', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, action: 'release' }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to release reserved stock');
      }

      setFeedback({
        type: 'success',
        message: `Released ${data.released} reserved units`
      });
      await fetchInventory();
    } catch (error: any) {
      setFeedback({ type: 'error', message: error.message || 'Failed to release reserved stock' });
    } finally {
      setReleasing(null);
    }
  };

  const exportToCSV = () => {
    const headers = ['Product', 'Color', 'Size', 'SKU', 'Stock', 'Reserved Stock', 'Value', 'Status'];
    const rows = filteredVariants.map((v) => [
      v.product.name,
      v.color,
      v.size,
      v.sku || 'N/A',
      v.stock,
      v.product.reservedStock || 0,
      formatCurrency(v.stock * v.product.price),
      v.product.active ? 'Active' : 'Inactive',
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredVariants = variants.filter((v) => {
    // Search filter
    const matchesSearch =
      v.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.color.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.size.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.sku && v.sku.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    // Stock filter
    if (stockFilter === 'out' && v.stock !== 0) return false;
    if (stockFilter === 'low' && (v.stock === 0 || v.stock > 5)) return false;
    if (stockFilter === 'ok' && v.stock <= 5) return false;

    // Active filter
    if (activeFilter === 'active' && !v.product.active) return false;
    if (activeFilter === 'inactive' && v.product.active) return false;

    return true;
  });

  // Group variants by product to get accurate reserved stock totals
  const productMap = new Map<string, typeof variants[0]['product']>();
  variants.forEach(v => {
    if (!productMap.has(v.product.id)) {
      productMap.set(v.product.id, v.product);
    }
  });

  const totalItems = variants.length;
  const outOfStock = variants.filter((v) => v.stock === 0).length;
  const lowStock = variants.filter((v) => v.stock > 0 && v.stock <= 5).length;
  const totalUnits = variants.reduce((sum, v) => sum + v.stock, 0);
  const totalReserved = Array.from(productMap.values()).reduce((sum, p) => sum + (p.reservedStock || 0), 0);
  const totalValue = variants.reduce((sum, v) => sum + v.stock * v.product.price, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl text-charcoal-dark mb-2">Inventory Management</h1>
          <p className="text-charcoal/60">
            {totalItems} variants • {outOfStock} out of stock • {lowStock} low stock • {formatCurrency(totalValue)} total value
          </p>
        </div>
        <button
          onClick={exportToCSV}
          className="px-6 py-3 bg-charcoal-dark text-cream hover:bg-charcoal text-sm uppercase tracking-wider rounded-lg transition-colors"
        >
          Export to CSV
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-2xl border border-charcoal/10 bg-cream p-5">
          <p className="text-xs uppercase tracking-wider text-charcoal/50">
            Total inventory value
          </p>
          <p className="mt-2 text-2xl font-semibold text-charcoal">
            {formatCurrency(totalValue)}
          </p>
        </div>
        <div className="rounded-2xl border border-charcoal/10 bg-cream p-5">
          <p className="text-xs uppercase tracking-wider text-charcoal/50">
            Units on hand
          </p>
          <p className="mt-2 text-2xl font-semibold text-charcoal">
            {totalUnits}
          </p>
        </div>
        <div className="rounded-2xl border border-charcoal/10 bg-cream p-5">
          <p className="text-xs uppercase tracking-wider text-charcoal/50">
            Reserved units
          </p>
          <p className="mt-2 text-2xl font-semibold text-charcoal">
            {totalReserved}
          </p>
        </div>
        <div className="rounded-2xl border border-charcoal/10 bg-cream p-5">
          <p className="text-xs uppercase tracking-wider text-charcoal/50">
            Low stock variants
          </p>
          <p className="mt-2 text-2xl font-semibold text-charcoal">
            {lowStock}
          </p>
        </div>
        <div className="rounded-2xl border border-charcoal/10 bg-cream p-5">
          <p className="text-xs uppercase tracking-wider text-charcoal/50">
            Out of stock variants
          </p>
          <p className="mt-2 text-2xl font-semibold text-charcoal">
            {outOfStock}
          </p>
        </div>
      </div>

      {feedback && (
        <div
          className={`border px-4 py-3 text-sm ${
            feedback.type === 'success'
              ? 'bg-beige/20 border-beige text-charcoal'
              : 'bg-cream-dark border-charcoal text-charcoal-dark'
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="bg-cream p-6 border border-charcoal/10 space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Search by product, color, size, or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="md:col-span-2 px-4 py-3 bg-cream-light border border-charcoal/20 focus:border-charcoal focus:outline-none transition-colors"
          />

          <div className="relative">
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="w-full px-4 py-3 pr-10 bg-cream border border-charcoal/20 focus:border-charcoal focus:outline-none transition-colors appearance-none cursor-pointer text-charcoal"
            >
              <option value="all">All Stock Levels</option>
              <option value="ok">In Stock (6+)</option>
              <option value="low">Low Stock (1-5)</option>
              <option value="out">Out of Stock</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-charcoal/60">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          <div className="relative">
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className="w-full px-4 py-3 pr-10 bg-cream border border-charcoal/20 focus:border-charcoal focus:outline-none transition-colors appearance-none cursor-pointer text-charcoal"
            >
              <option value="all">All Products</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-charcoal/60">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {loading ? (
          <p className="text-charcoal/60 text-sm py-8 text-center">Loading inventory...</p>
        ) : filteredVariants.length === 0 ? (
          <p className="text-charcoal/60 text-sm py-8 text-center">
            {searchTerm || stockFilter !== 'all' || activeFilter !== 'all'
              ? 'No variants match your filters.'
              : 'No variants found.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-charcoal/10 text-left text-xs uppercase tracking-wider text-charcoal/60">
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Color</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4">Stock</th>
                  <th className="py-3 px-4">Reserved</th>
                  <th className="py-3 px-4">Value</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Update Stock</th>
                  <th className="py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVariants.map((variant) => {
                  const isLowStock = variant.stock > 0 && variant.stock <= 5;
                  const isOutOfStock = variant.stock === 0;
                  const hasReservedStock = (variant.product.reservedStock || 0) > 0;

                  return (
                    <tr key={variant.id} className="border-b border-charcoal/10 last:border-0">
                      <td className="py-3 px-4 text-sm text-charcoal">{variant.product.name}</td>
                      <td className="py-3 px-4 text-sm text-charcoal">{variant.color}</td>
                      <td className="py-3 px-4 text-sm text-charcoal">{variant.size}</td>
                      <td className="py-3 px-4 text-sm text-charcoal/60">{variant.sku || '—'}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-sm font-medium ${
                            isOutOfStock
                              ? 'text-charcoal-dark'
                              : isLowStock
                              ? 'text-beige'
                              : 'text-charcoal'
                          }`}
                        >
                          {variant.stock}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {hasReservedStock ? (
                          <span className="text-sm font-medium text-beige">
                            {variant.product.reservedStock}
                          </span>
                        ) : (
                          <span className="text-sm text-charcoal/40">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-charcoal">
                        {formatCurrency(variant.stock * variant.product.price)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-1 text-xs rounded uppercase ${
                            variant.product.active
                              ? 'bg-beige/30 text-charcoal-dark'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {variant.product.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          min="0"
                          defaultValue={variant.stock}
                          onBlur={(e) => {
                            const newStock = parseInt(e.target.value);
                            if (newStock !== variant.stock && !isNaN(newStock) && newStock >= 0) {
                              handleStockUpdate(variant.id, newStock);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const newStock = parseInt((e.target as HTMLInputElement).value);
                              if (newStock !== variant.stock && !isNaN(newStock) && newStock >= 0) {
                                handleStockUpdate(variant.id, newStock);
                              }
                            }
                          }}
                          disabled={updating === variant.id}
                          className="w-20 px-2 py-1 text-sm border border-charcoal/20 focus:border-charcoal focus:outline-none disabled:opacity-50"
                        />
                      </td>
                      <td className="py-3 px-4">
                        {hasReservedStock && (
                          <button
                            onClick={() => handleReleaseReservedStock(variant.product.id)}
                            disabled={releasing === variant.product.id}
                            className="text-xs px-3 py-1.5 bg-charcoal-dark text-cream hover:bg-charcoal disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
                          >
                            {releasing === variant.product.id ? 'Releasing...' : 'Release Reserved'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
