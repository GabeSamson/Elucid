'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email');

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!email) {
      setMessage({ type: 'error', text: 'No email provided. Please sign up again.' });
    }
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setMessage({ type: 'error', text: 'No email provided. Please sign up again.' });
      return;
    }

    if (code.trim().length !== 6) {
      setMessage({ type: 'error', text: 'Verification code must be 6 digits' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/auth/verify-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: code.trim() }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: 'Account verified! Signing you in...' });

        // Get the password from sessionStorage (set during signup)
        const tempPassword = sessionStorage.getItem('signup_password');
        sessionStorage.removeItem('signup_password');

        // Auto sign in
        setTimeout(async () => {
          if (tempPassword) {
            const result = await signIn('credentials', {
              email,
              password: tempPassword,
              redirect: false,
            });

            if (result?.error) {
              router.push('/account');
            } else {
              router.push('/');
            }
          } else {
            router.push('/account');
          }
        }, 1500);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to verify code' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;

    setLoading(true);
    setMessage(null);

    try {
      // Would need to implement a resend endpoint
      setMessage({ type: 'error', text: 'Please sign up again to receive a new code' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to resend code' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-serif text-4xl text-charcoal-dark mb-3">Verify Your Email</h1>
          <p className="text-charcoal/70 mb-2">
            We sent a 6-digit code to <strong>{email}</strong>
          </p>
          <p className="text-xs text-charcoal/60">
            Don't see it? Check your spam/junk folder.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-cream-light p-8 border border-charcoal/10 space-y-6">
          <div>
            <label htmlFor="code" className="block text-xs uppercase tracking-wider text-charcoal/70 mb-2">
              Verification Code
            </label>
            <input
              id="code"
              type="text"
              value={code}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setCode(value);
              }}
              required
              disabled={loading || !email}
              maxLength={6}
              className="w-full px-4 py-3 bg-cream border border-charcoal/20 focus:border-charcoal focus:outline-none transition-colors disabled:opacity-50 text-center text-2xl tracking-widest font-mono"
              placeholder="000000"
              autoComplete="off"
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
            disabled={loading || !email || code.length !== 6}
            className="w-full px-6 py-3 bg-charcoal-dark text-cream uppercase tracking-wider text-sm hover:bg-charcoal transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Verifying...' : 'Verify Email'}
          </button>

          <div className="text-center pt-4 border-t border-charcoal/10">
            <p className="text-sm text-charcoal/60 mb-2">
              Didn't receive a code?
            </p>
            <button
              type="button"
              onClick={() => router.push('/account')}
              className="text-sm text-charcoal hover:underline"
            >
              Sign up again
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-cream flex items-center justify-center">Loading...</div>}>
      <VerifyEmailForm />
    </Suspense>
  );
}
