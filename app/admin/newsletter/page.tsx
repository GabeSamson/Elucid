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
  const [showComposer, setShowComposer] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailContent, setEmailContent] = useState('');
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [includeAllUsers, setIncludeAllUsers] = useState(false);

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

  const handleSendNewsletter = async () => {
    if (!emailSubject.trim() || !emailContent.trim()) {
      setFeedback({ type: 'error', message: 'Subject and content are required' });
      return;
    }

    const activeSubscribers = subscribers.filter(sub => sub.active);

    const recipientMessage = includeAllUsers
      ? 'all verified account holders and newsletter subscribers'
      : `${activeSubscribers.length} active newsletter subscriber(s)`;

    const confirmed = window.confirm(
      `Send newsletter to ${recipientMessage}?`
    );
    if (!confirmed) return;

    setSending(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/admin/newsletter/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: emailSubject,
          content: emailContent,
          includeAllUsers,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send newsletter');
      }

      setFeedback({
        type: 'success',
        message: `Newsletter sent successfully to ${data.sentCount} recipient(s)!`,
      });

      // Delay closing the modal to show success message
      setTimeout(() => {
        setShowComposer(false);
        setEmailSubject('');
        setEmailContent('');
        setIncludeAllUsers(false);
        setSending(false);
      }, 2000);
    } catch (error: any) {
      setFeedback({ type: 'error', message: error.message || 'Failed to send newsletter' });
      setSending(false);
    }
  };

  const activeCount = subscribers.filter(sub => sub.active).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl text-charcoal-dark mb-2">Newsletter Subscribers</h1>
          <p className="text-charcoal/60">
            {subscribers.length} verified • {activeCount} active
          </p>
          <p className="text-charcoal/60 text-sm mt-1">
            Only verified subscribers are shown
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowComposer(true)}
            disabled={activeCount === 0}
            className="inline-flex items-center justify-center px-6 py-3 bg-charcoal-dark text-cream hover:bg-charcoal uppercase tracking-wider text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Compose Email
          </button>
          <button
            onClick={exportToCSV}
            disabled={subscribers.length === 0}
            className="inline-flex items-center justify-center px-6 py-3 bg-charcoal text-cream uppercase tracking-wider text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Export to CSV
          </button>
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

      {/* Email Composer Modal */}
      {showComposer && (
        <div className="fixed inset-0 bg-charcoal-dark/80 flex items-center justify-center z-50 p-4">
          <div className="bg-cream max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-serif text-3xl text-charcoal-dark">Compose Newsletter</h2>
              <button
                onClick={() => {
                  setShowComposer(false);
                  setFeedback(null);
                }}
                disabled={sending}
                className="text-charcoal/60 hover:text-charcoal disabled:opacity-50"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {feedback && (
              <div
                className={`border px-4 py-3 text-sm mb-6 ${
                  feedback.type === 'success'
                    ? 'bg-beige/20 border-beige text-charcoal'
                    : 'bg-cream-dark border-charcoal text-charcoal-dark'
                }`}
              >
                {feedback.message}
              </div>
            )}

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm text-charcoal mb-2">Subject *</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Newsletter subject line"
                  className="w-full px-4 py-2 border border-charcoal/20 focus:border-charcoal focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-charcoal mb-2">Content (HTML) *</label>
                <textarea
                  value={emailContent}
                  onChange={(e) => setEmailContent(e.target.value)}
                  placeholder="<h1>Welcome!</h1><p>Your newsletter content here...</p>"
                  rows={12}
                  className="w-full px-4 py-2 border border-charcoal/20 focus:border-charcoal focus:outline-none font-mono text-sm"
                />
                <p className="text-xs text-charcoal/60 mt-1">
                  You can use HTML tags for formatting
                </p>
              </div>

              <div className="pt-4 border-t border-charcoal/10">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeAllUsers}
                    onChange={(e) => setIncludeAllUsers(e.target.checked)}
                    className="w-4 h-4 rounded border-charcoal/30 text-charcoal focus:ring-charcoal"
                  />
                  <div>
                    <span className="text-sm font-medium text-charcoal">
                      Send to all account holders
                    </span>
                    <p className="text-xs text-charcoal/60 mt-1">
                      Include all verified users with accounts (not just newsletter subscribers)
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="px-6 py-3 border border-charcoal/20 text-charcoal hover:border-charcoal uppercase tracking-wider text-sm"
              >
                {showPreview ? 'Hide Preview' : 'Show Preview'}
              </button>
              <button
                onClick={() => {
                  setShowComposer(false);
                  setFeedback(null);
                }}
                disabled={sending}
                className="px-6 py-3 border border-charcoal/20 text-charcoal hover:border-charcoal uppercase tracking-wider text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSendNewsletter}
                disabled={sending || !emailSubject.trim() || !emailContent.trim()}
                className="px-6 py-3 bg-charcoal-dark text-cream hover:bg-charcoal uppercase tracking-wider text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? 'Sending...' : `Send to ${activeCount} Subscriber(s)`}
              </button>
            </div>

            {/* Email Preview */}
            {showPreview && (
              <div className="mt-6 border-t border-charcoal/20 pt-6">
                <h3 className="font-serif text-xl text-charcoal-dark mb-4">Preview</h3>
                <div className="bg-white p-6 border border-charcoal/20">
                  <div className="mb-4 pb-4 border-b border-charcoal/10">
                    <p className="text-sm text-charcoal/60">Subject:</p>
                    <p className="text-lg font-medium text-charcoal-dark">
                      {emailSubject || '(No subject)'}
                    </p>
                  </div>
                  <div
                    className="prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: emailContent }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
