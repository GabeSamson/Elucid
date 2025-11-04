'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CustomPaymentPage() {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/payment/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amountNum }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create payment session');
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="bg-cream-light border border-charcoal/10 p-8 max-w-md w-full">
        <h1 className="font-serif text-3xl text-charcoal-dark mb-2">Custom Payment</h1>
        <p className="text-charcoal/60 mb-6 text-sm">Enter the amount you'd like to pay</p>

        {error && (
          <div className="bg-cream-dark border border-charcoal text-charcoal-dark px-4 py-3 text-sm mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-charcoal mb-2">
              Amount (£)
            </label>
            <input
              type="number"
              id="amount"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py-3 bg-cream border border-charcoal/20 focus:border-charcoal focus:outline-none transition-colors text-lg"
              disabled={loading}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !amount}
            className="w-full bg-charcoal text-cream py-4 px-6 hover:bg-charcoal-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Continue to Payment'}
          </button>
        </form>

        <p className="text-xs text-charcoal/40 mt-6 text-center">
          Secure payment powered by Stripe
        </p>
      </div>
    </div>
  );
}
