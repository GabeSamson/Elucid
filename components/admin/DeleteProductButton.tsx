'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface DeleteProductButtonProps {
  productId: string;
  productName: string;
}

export default function DeleteProductButton({
  productId,
  productName,
}: DeleteProductButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteAnalytics, setDeleteAnalytics] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setDeleting(true);

    try {
      const url = deleteAnalytics
        ? `/api/admin/products/${productId}?deleteAnalytics=true`
        : `/api/admin/products/${productId}`;

      const response = await fetch(url, {
        method: 'DELETE',
      });

      const payload = await response.json();

      if (response.ok) {
        router.refresh();
        setShowConfirm(false);
        setDeleting(false);
        if (payload.archived) {
          alert('Product archived because it is linked to past orders. It will no longer appear in the catalogue.');
        }
      } else {
        alert(payload.error || 'Failed to delete product');
        setDeleting(false);
      }
    } catch (error) {
      alert('Failed to delete product');
      setDeleting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="text-sm text-charcoal-dark hover:underline"
      >
        Delete
      </button>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-cream p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="font-serif text-2xl text-charcoal mb-4">
              Delete Product?
            </h3>
            <p className="text-charcoal/80 mb-4">
              Are you sure you want to delete <strong>{productName}</strong>?
              This action cannot be undone.
            </p>

            <div className="mb-6 p-4 bg-cream-light border border-charcoal/10 rounded">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteAnalytics}
                  onChange={(e) => setDeleteAnalytics(e.target.checked)}
                  className="mt-1"
                />
                <div>
                  <div className="text-sm font-medium text-charcoal">
                    Also delete analytics data
                  </div>
                  <div className="text-xs text-charcoal/60 mt-1">
                    Remove this product from all historical sales data and analytics.
                    If unchecked, the product will be marked inactive but stats will be preserved.
                  </div>
                </div>
              </label>
            </div>

            <div className="flex flex-wrap gap-3 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={deleting}
                className="px-6 py-3 border border-charcoal/30 text-charcoal rounded-lg hover:bg-charcoal/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-6 py-3 bg-charcoal-dark text-cream rounded-lg hover:bg-charcoal transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
