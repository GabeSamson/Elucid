'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface PageProps {
  params: Promise<{ token: string }>;
}

export default function ResetWebsitePage({ params }: PageProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [confirmCheck, setConfirmCheck] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadParams = async () => {
      const resolvedParams = await params;
      setToken(resolvedParams.token);
      setLoading(false);
    };
    loadParams();
  }, [params]);

  // Redirect if not admin
  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated' || (session && session.user?.role !== 'admin')) {
      router.push('/admin');
    }
  }, [status, session, router]);

  const handleReset = async () => {
    if (!confirmCheck) {
      alert('You must check the confirmation box');
      return;
    }

    if (confirmText !== 'DELETE EVERYTHING') {
      alert('You must type "DELETE EVERYTHING" exactly');
      return;
    }

    const finalConfirm = window.confirm(
      'FINAL WARNING\n\n' +
      'This will PERMANENTLY DELETE:\n' +
      '• All products and variants\n' +
      '• All orders and sales history\n' +
      '• All collections\n' +
      '• All promo codes\n' +
      '• All users (except you)\n' +
      '• All calendar events and tasks\n' +
      '• Everything except your admin account\n\n' +
      'THIS CANNOT BE UNDONE.\n\n' +
      'Are you ABSOLUTELY SURE?'
    );

    if (!finalConfirm) return;

    setResetting(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/reset-website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (res.ok) {
        alert('Website has been completely reset.\n\nAll data has been deleted except your admin account.\n\nRedirecting to admin dashboard...');
        router.push('/admin');
      } else {
        setError(data.error || 'Failed to reset website');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setResetting(false);
    }
  };

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-charcoal/60">Loading...</div>
      </div>
    );
  }

  if (status === 'unauthenticated' || (session && session.user?.role !== 'admin')) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        {/* Warning Header */}
        <div className="bg-charcoal-dark text-cream p-8 text-center mb-6">
          <div className="text-6xl mb-4">!</div>
          <h1 className="font-serif text-4xl mb-2">DANGER ZONE</h1>
          <p className="text-xl">Nuclear Website Reset</p>
        </div>

        {/* Main Content */}
        <div className="bg-cream border-4 border-charcoal-dark p-8 space-y-6">
          <div className="space-y-4">
            <h2 className="font-serif text-3xl text-charcoal-dark">What This Does:</h2>
            <div className="bg-beige/20 border-2 border-charcoal/30 p-4 space-y-2">
              <p className="font-bold text-charcoal-dark">This will PERMANENTLY DELETE:</p>
              <ul className="list-disc list-inside space-y-1 text-charcoal ml-4">
                <li>All products, variants, and collections</li>
                <li>All orders and sales history</li>
                <li>All promo codes</li>
                <li>All users (except your admin account)</li>
                <li>All calendar events and tasks</li>
                <li>All pending signups and password resets</li>
                <li>Literally EVERYTHING except your admin account</li>
              </ul>
              <p className="font-bold text-charcoal-dark pt-4 border-t-2 border-charcoal/30 mt-4">
                THIS ACTION CANNOT BE UNDONE
              </p>
            </div>
          </div>

          {error && (
            <div className="bg-cream-dark border-2 border-charcoal/30 text-charcoal-dark p-4">
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Confirmation Steps */}
          <div className="space-y-6 pt-6 border-t-2 border-charcoal/20">
            <h3 className="font-serif text-2xl text-charcoal-dark">Confirmation Required:</h3>

            {/* Step 1: Checkbox */}
            <label className="flex items-start gap-3 cursor-pointer p-4 bg-cream-light border-2 border-beige hover:bg-beige/20 transition-colors">
              <input
                type="checkbox"
                checked={confirmCheck}
                onChange={(e) => setConfirmCheck(e.target.checked)}
                className="mt-1 w-5 h-5"
              />
              <div>
                <div className="font-medium text-charcoal-dark">
                  I understand this will delete all data and cannot be undone
                </div>
                <div className="text-sm text-charcoal/70 mt-1">
                  Only your admin account will remain
                </div>
              </div>
            </label>

            {/* Step 2: Type confirmation */}
            <div>
              <label className="block font-medium text-charcoal-dark mb-2">
                Type <span className="font-mono bg-beige px-2 py-1">DELETE EVERYTHING</span> to confirm:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type here..."
                disabled={resetting}
                className="w-full px-4 py-3 border-2 border-beige focus:border-charcoal-dark focus:outline-none text-lg font-mono disabled:opacity-50"
              />
            </div>

            {/* Step 3: Final button */}
            <button
              onClick={handleReset}
              disabled={resetting || !confirmCheck || confirmText !== 'DELETE EVERYTHING'}
              className="w-full py-4 bg-charcoal-dark text-cream font-bold text-lg uppercase tracking-wider hover:bg-charcoal transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resetting ? 'DELETING EVERYTHING...' : 'RESET ENTIRE WEBSITE'}
            </button>

            {/* Cancel button */}
            <button
              onClick={() => router.push('/admin')}
              disabled={resetting}
              className="w-full py-3 border-2 border-charcoal/30 text-charcoal hover:bg-charcoal/5 transition-colors disabled:opacity-50"
            >
              Cancel (Go Back to Safety)
            </button>
          </div>
        </div>

        {/* Footer Warning */}
        <div className="bg-yellow-100 border-2 border-yellow-400 p-4 text-center mt-6">
          <p className="text-yellow-900 font-medium">
            🔐 This page is hidden and can only be accessed via direct URL with the secure token
          </p>
        </div>
      </div>
    </div>
  );
}
