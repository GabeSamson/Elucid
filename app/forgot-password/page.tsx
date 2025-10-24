'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: data.message });
        setEmail('');
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to send reset email' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-serif text-4xl text-charcoal-dark mb-3">Reset Password</h1>
          <p className="text-charcoal/70">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-cream-light p-8 border border-charcoal/10 space-y-6">
          <div>
            <label htmlFor="email" className="block text-xs uppercase tracking-wider text-charcoal/70 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="w-full px-4 py-3 bg-cream border border-charcoal/20 focus:border-charcoal focus:outline-none transition-colors disabled:opacity-50"
              placeholder="you@example.com"
            />
          </div>

          {message && (
            <div
              className={`px-4 py-3 border text-sm ${
                message.type === 'success'
                  ? 'bg-beige/20 border-beige text-charcoal-dark'
                  : 'bg-cream-dark border-charcoal/30 text-charcoal-dark'
              }`}
            >
              <div>{message.text}</div>
              {message.type === 'success' && (
                <div className="text-xs mt-2 text-charcoal">
                  Don't see the email? Check your spam/junk folder.
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 bg-charcoal-dark text-cream uppercase tracking-wider text-sm hover:bg-charcoal transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>

          <div className="text-center pt-4 border-t border-charcoal/10">
            <Link href="/account" className="text-sm text-charcoal hover:underline">
              Back to Sign In
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
