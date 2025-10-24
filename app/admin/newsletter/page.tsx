'use client';

import { useEffect, useState } from 'react';

interface Subscriber {
  id: string;
  email: string;
  active: boolean;
  createdAt: string;
}

export default function AdminNewsletterPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [deletingEmail, setDeletingEmail] = useState<string | null>(null);

  const loadSubscribers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/newsletter');
      const payload = await res.json();

      if (res.ok) {
        setSubscribers(payload.subscribers || []);
      } else {
        throw new Error(payload.error || 'Failed to load subscribers');
      }
    } catch (error: any) {
      setFeedback({ type: 'error', message: error.message || 'Failed to load subscribers' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscribers();
  }, []);

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  const handleDelete = async (email: string) => {
    const confirmed = window.confirm(`Remove ${email} from newsletter?`);
    if (!confirmed) return;

    setDeletingEmail(email);
    setFeedback(null);

    try {
      const res = await fetch(`/api/admin/newsletter?email=${encodeURIComponent(email)}`, {
        method: 'DELETE',
      });

      const payload = await res.json();

      if (!res.ok) {
        throw new Error(payload.error || 'Failed to remove subscriber');
      }

      setFeedback({ type: 'success', message: 'Subscriber removed successfully' });
      await loadSubscribers();
    } catch (error: any) {
      setFeedback({ type: 'error', message: error.message || 'Failed to remove subscriber' });
    } finally {
      setDeletingEmail(null);
    }
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Email', 'Active', 'Subscribed Date'],
      ...subscribers.map(sub => [
        sub.email,
        sub.active ? 'Yes' : 'No',
        new Date(sub.createdAt).toLocaleDateString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `newsletter-subscribers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const activeCount = subscribers.filter(sub => sub.active).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl text-charcoal-dark mb-2">Newsletter Subscribers</h1>
          <p className="text-charcoal/60">
            {subscribers.length} total • {activeCount} active
          </p>
        </div>
        <button
          onClick={exportToCSV}
          disabled={subscribers.length === 0}
          className="inline-flex items-center justify-center px-6 py-3 bg-charcoal text-cream uppercase tracking-wider text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Export to CSV
        </button>
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

      <div className="bg-cream p-6 border border-charcoal/10">
        {loading ? (
          <p className="text-charcoal/60 text-sm">Loading subscribers…</p>
        ) : subscribers.length === 0 ? (
          <p className="text-charcoal/60 text-sm">No subscribers yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-charcoal/10 text-left text-xs uppercase tracking-wider text-charcoal/60">
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Subscribed</th>
                  <th className="py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.map((subscriber) => (
                  <tr key={subscriber.id} className="border-b border-charcoal/10 last:border-0">
                    <td className="py-3 px-4 text-sm text-charcoal">{subscriber.email}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-1 text-xs rounded ${
                          subscriber.active
                            ? 'bg-beige/30 text-charcoal-dark'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {subscriber.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-charcoal">
                      {new Date(subscriber.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleDelete(subscriber.email)}
                        disabled={deletingEmail === subscriber.email}
                        className="text-sm text-charcoal-dark hover:underline disabled:opacity-50"
                      >
                        {deletingEmail === subscriber.email ? 'Removing…' : 'Remove'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
