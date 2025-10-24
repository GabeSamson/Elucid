'use client';

import { useState } from 'react';
import { formatCurrency } from '@/lib/currency';

type DiscountType = 'PERCENTAGE' | 'FIXED';

interface PromoCodeListItem {
  id: string;
  code: string;
  description?: string | null;
  discountType: DiscountType;
  amount: number;
  active: boolean;
  minimumOrderValue?: number | null;
  maxRedemptions?: number | null;
  redemptions: number;
  startsAt?: string | null;
  endsAt?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

interface PromoCodesManagerProps {
  initialPromos: PromoCodeListItem[];
}

interface FormState {
  code: string;
  description: string;
  discountType: DiscountType;
  amount: string;
  minimumOrderValue: string;
  maxRedemptions: string;
  startsAt: string;
  endsAt: string;
  active: boolean;
}

const defaultFormState: FormState = {
  code: '',
  description: '',
  discountType: 'PERCENTAGE',
  amount: '',
  minimumOrderValue: '',
  maxRedemptions: '',
  startsAt: '',
  endsAt: '',
  active: true,
};

export default function PromoCodesManager({ initialPromos }: PromoCodesManagerProps) {
  const [promos, setPromos] = useState<PromoCodeListItem[]>(initialPromos);
  const [formState, setFormState] = useState<FormState>(defaultFormState);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormState, setEditFormState] = useState<FormState>(defaultFormState);

  const handleInputChange = (field: keyof FormState, value: string | boolean) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleEditInputChange = (field: keyof FormState, value: string | boolean) => {
    setEditFormState((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const toDatetimeLocalValue = (date?: Date | string | null): string => {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    const iso = d.toISOString();
    return iso.slice(0, 16);
  };

  const startEdit = (promo: PromoCodeListItem) => {
    setEditingId(promo.id);
    setEditFormState({
      code: promo.code,
      description: promo.description || '',
      discountType: promo.discountType,
      amount: String(promo.amount),
      minimumOrderValue: promo.minimumOrderValue ? String(promo.minimumOrderValue) : '',
      maxRedemptions: promo.maxRedemptions ? String(promo.maxRedemptions) : '',
      startsAt: toDatetimeLocalValue(promo.startsAt),
      endsAt: toDatetimeLocalValue(promo.endsAt),
      active: promo.active,
    });
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditFormState(defaultFormState);
    setError(null);
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setCreating(true);

    try {
      const payload = {
        code: formState.code,
        description: formState.description || undefined,
        discountType: formState.discountType,
        amount: Number(formState.amount),
        minimumOrderValue: formState.minimumOrderValue ? Number(formState.minimumOrderValue) : undefined,
        maxRedemptions: formState.maxRedemptions ? Number(formState.maxRedemptions) : undefined,
        startsAt: formState.startsAt || undefined,
        endsAt: formState.endsAt || undefined,
        active: formState.active,
      };

      const response = await fetch('/api/admin/promocodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create promo code');
      }

      setPromos((prev) => [data.promo, ...prev]);
      setFormState(defaultFormState);
    } catch (err) {
      console.error('Create promo code error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create promo code');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    try {
      const response = await fetch('/api/admin/promocodes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, active }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update promo code');
      }

      setPromos((prev) => prev.map((promo) => (promo.id === id ? data.promo : promo)));
    } catch (err) {
      console.error('Toggle promo code error:', err);
      setError(err instanceof Error ? err.message : 'Failed to update promo code');
    }
  };

  const handleUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingId) return;

    setError(null);

    try {
      const payload = {
        id: editingId,
        code: editFormState.code,
        description: editFormState.description || undefined,
        discountType: editFormState.discountType,
        amount: Number(editFormState.amount),
        minimumOrderValue: editFormState.minimumOrderValue ? Number(editFormState.minimumOrderValue) : null,
        maxRedemptions: editFormState.maxRedemptions ? Number(editFormState.maxRedemptions) : null,
        startsAt: editFormState.startsAt || null,
        endsAt: editFormState.endsAt || null,
        active: editFormState.active,
      };

      const response = await fetch('/api/admin/promocodes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update promo code');
      }

      setPromos((prev) => prev.map((promo) => (promo.id === editingId ? data.promo : promo)));
      cancelEdit();
    } catch (err) {
      console.error('Update promo code error:', err);
      setError(err instanceof Error ? err.message : 'Failed to update promo code');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promo code? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/promocodes?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete promo code');
      }

      setPromos((prev) => prev.filter((promo) => promo.id !== id));
    } catch (err) {
      console.error('Delete promo code error:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete promo code');
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-cream p-6 rounded-lg border border-charcoal/20">
        <h2 className="font-serif text-2xl text-charcoal mb-4">Create Promo Code</h2>
        {error && (
          <div className="mb-4 rounded border border-charcoal bg-cream-dark px-4 py-2 text-sm text-charcoal-dark">
            {error}
          </div>
        )}
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Code *</label>
            <input
              value={formState.code}
              onChange={(event) => handleInputChange('code', event.target.value)}
              placeholder="e.g., SUMMER25"
              className="input-modern"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Discount Type *</label>
            <select
              value={formState.discountType}
              onChange={(event) => handleInputChange('discountType', event.target.value as DiscountType)}
              className="select-modern"
            >
              <option value="PERCENTAGE">Percentage</option>
              <option value="FIXED">Fixed Amount</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">
              {formState.discountType === 'PERCENTAGE' ? 'Percent Off *' : 'Amount Off *'}
            </label>
            <input
              type="number"
              min="0"
              max={formState.discountType === 'PERCENTAGE' ? 100 : undefined}
              step="0.01"
              value={formState.amount}
              onChange={(event) => handleInputChange('amount', event.target.value)}
              placeholder={formState.discountType === 'PERCENTAGE' ? 'e.g., 15' : 'e.g., 10'}
              className="input-modern"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Minimum Order Value</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formState.minimumOrderValue}
              onChange={(event) => handleInputChange('minimumOrderValue', event.target.value)}
              placeholder="Optional"
              className="input-modern"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Usage Limit</label>
            <input
              type="number"
              min="1"
              step="1"
              value={formState.maxRedemptions}
              onChange={(event) => handleInputChange('maxRedemptions', event.target.value)}
              placeholder="Optional"
              className="input-modern"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-charcoal mb-1">Description</label>
            <textarea
              value={formState.description}
              onChange={(event) => handleInputChange('description', event.target.value)}
              rows={2}
              placeholder="Optional description"
              className="input-modern"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Starts At</label>
            <input
              type="datetime-local"
              value={formState.startsAt}
              onChange={(event) => handleInputChange('startsAt', event.target.value)}
              className="input-modern"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Ends At</label>
            <input
              type="datetime-local"
              value={formState.endsAt}
              onChange={(event) => handleInputChange('endsAt', event.target.value)}
              className="input-modern"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-charcoal">
            <input
              type="checkbox"
              checked={formState.active}
              onChange={(event) => handleInputChange('active', event.target.checked)}
              className="w-4 h-4"
            />
            Active on creation
          </label>

          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={creating}
              className="px-6 py-3 bg-charcoal text-cream rounded-lg hover:bg-charcoal/90 transition-colors disabled:opacity-50"
            >
              {creating ? 'Creating…' : 'Create Promo Code'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-cream p-6 rounded-lg border border-charcoal/20">
        <h2 className="font-serif text-2xl text-charcoal mb-6">Existing Promo Codes</h2>
        {promos.length === 0 ? (
          <p className="text-charcoal/60">No promo codes yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-charcoal/10">
                  <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-charcoal/60">Code</th>
                  <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-charcoal/60">Type</th>
                  <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-charcoal/60">Amount</th>
                  <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-charcoal/60">Usage</th>
                  <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-charcoal/60">Status</th>
                  <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-charcoal/60">Actions</th>
                </tr>
              </thead>
              <tbody>
                {promos.map((promo) => {
                  const usageLabel = promo.maxRedemptions
                    ? `${promo.redemptions}/${promo.maxRedemptions}`
                    : `${promo.redemptions}`;

                  if (editingId === promo.id) {
                    return (
                      <tr key={promo.id} className="border-b border-charcoal/10">
                        <td colSpan={6} className="p-4">
                          <form onSubmit={handleUpdate} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-charcoal mb-1">Code *</label>
                                <input
                                  value={editFormState.code}
                                  onChange={(e) => handleEditInputChange('code', e.target.value)}
                                  className="input-modern"
                                  required
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-charcoal mb-1">Discount Type *</label>
                                <select
                                  value={editFormState.discountType}
                                  onChange={(e) => handleEditInputChange('discountType', e.target.value as DiscountType)}
                                  className="select-modern"
                                >
                                  <option value="PERCENTAGE">Percentage</option>
                                  <option value="FIXED">Fixed Amount</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-charcoal mb-1">
                                  {editFormState.discountType === 'PERCENTAGE' ? 'Percent Off *' : 'Amount Off *'}
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  max={editFormState.discountType === 'PERCENTAGE' ? 100 : undefined}
                                  step="0.01"
                                  value={editFormState.amount}
                                  onChange={(e) => handleEditInputChange('amount', e.target.value)}
                                  className="input-modern"
                                  required
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-charcoal mb-1">Minimum Order Value</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={editFormState.minimumOrderValue}
                                  onChange={(e) => handleEditInputChange('minimumOrderValue', e.target.value)}
                                  className="input-modern"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-charcoal mb-1">Usage Limit</label>
                                <input
                                  type="number"
                                  min="1"
                                  step="1"
                                  value={editFormState.maxRedemptions}
                                  onChange={(e) => handleEditInputChange('maxRedemptions', e.target.value)}
                                  className="input-modern"
                                />
                              </div>
                              <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-charcoal mb-1">Description</label>
                                <textarea
                                  value={editFormState.description}
                                  onChange={(e) => handleEditInputChange('description', e.target.value)}
                                  rows={2}
                                  className="input-modern"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-charcoal mb-1">Starts At</label>
                                <input
                                  type="datetime-local"
                                  value={editFormState.startsAt}
                                  onChange={(e) => handleEditInputChange('startsAt', e.target.value)}
                                  className="input-modern"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-charcoal mb-1">Ends At</label>
                                <input
                                  type="datetime-local"
                                  value={editFormState.endsAt}
                                  onChange={(e) => handleEditInputChange('endsAt', e.target.value)}
                                  className="input-modern"
                                />
                              </div>
                              <label className="flex items-center gap-2 text-sm text-charcoal">
                                <input
                                  type="checkbox"
                                  checked={editFormState.active}
                                  onChange={(e) => handleEditInputChange('active', e.target.checked)}
                                  className="w-4 h-4"
                                />
                                Active
                              </label>
                            </div>
                            <div className="flex gap-2 justify-end">
                              <button
                                type="button"
                                onClick={cancelEdit}
                                className="px-5 py-2 border border-charcoal/30 rounded-lg hover:border-charcoal transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                className="px-5 py-2 bg-charcoal text-cream rounded-lg hover:bg-charcoal/90 transition-colors"
                              >
                                Save Changes
                              </button>
                            </div>
                          </form>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={promo.id} className="border-b border-charcoal/10">
                      <td className="py-3 px-4 text-sm font-medium text-charcoal">{promo.code}</td>
                      <td className="py-3 px-4 text-sm text-charcoal">
                        {promo.discountType === 'PERCENTAGE' ? 'Percentage' : 'Fixed'}
                      </td>
                      <td className="py-3 px-4 text-sm text-charcoal">
                        {promo.discountType === 'PERCENTAGE'
                          ? `${promo.amount}%`
                          : formatCurrency(promo.amount)}
                      </td>
                      <td className="py-3 px-4 text-sm text-charcoal">{usageLabel}</td>
                      <td className="py-3 px-4 text-sm">
                        <span
                          className={`inline-flex items-center px-3 py-1.5 text-xs rounded-lg uppercase tracking-wider ${
                            promo.active ? 'bg-beige/30 text-charcoal-dark' : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {promo.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEdit(promo)}
                            className="px-4 py-2 border border-charcoal/30 rounded-lg hover:border-charcoal transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleToggleActive(promo.id, !promo.active)}
                            className="px-4 py-2 border border-charcoal/30 rounded-lg hover:border-charcoal transition-colors"
                          >
                            {promo.active ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            onClick={() => handleDelete(promo.id)}
                            className="px-4 py-2 border border-charcoal text-charcoal-dark rounded-lg hover:border-charcoal-dark hover:bg-cream-dark transition-colors"
                          >
                            Delete
                          </button>
                        </div>
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
