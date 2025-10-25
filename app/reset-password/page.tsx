'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!token) {
      setMessage({ type: 'error', text: 'Invalid reset link. Please request a new one.' });
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      return;
    }

    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    if (password.length < 5) {
      setMessage({ type: 'error', text: 'Password must be at least 5 characters' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: 'Password reset successfully! Redirecting to login...' });
        setTimeout(() => {
          router.push('/account');
        }, 2000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to reset password' });
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
          <h1 className="font-serif text-4xl text-charcoal-dark mb-3">Set New Password</h1>
          <p className="text-charcoal/70">
            Enter your new password below.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-cream-light p-8 border border-charcoal/10 space-y-6">
          <div>
            <label htmlFor="password" className="block text-xs uppercase tracking-wider text-charcoal/70 mb-2">
              New Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading || !token}
              className="w-full px-4 py-3 bg-cream border border-charcoal/20 focus:border-charcoal focus:outline-none transition-colors disabled:opacity-50"
              placeholder="At least 5 characters"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-xs uppercase tracking-wider text-charcoal/70 mb-2">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading || !token}
              className="w-full px-4 py-3 bg-cream border border-charcoal/20 focus:border-charcoal focus:outline-none transition-colors disabled:opacity-50"
              placeholder="Re-enter your password"
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
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !token}
            className="w-full px-6 py-3 bg-charcoal-dark text-cream uppercase tracking-wider text-sm hover:bg-charcoal transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Resetting...' : 'Reset Password'}
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-cream flex items-center justify-center">Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
