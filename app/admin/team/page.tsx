'use client';

import { useEffect, useState } from 'react';

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
}

export default function AdminTeamPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);

  const loadAdmins = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/admin-users');
      const payload = await res.json();

      if (res.ok) {
        setAdmins(payload.admins || []);
      } else {
        throw new Error(payload.error || 'Failed to load admin users');
      }
    } catch (error: any) {
      setFeedback({ type: 'error', message: error.message || 'Failed to load admin users' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    setTemporaryPassword(null);

    try {
      const res = await fetch('/api/admin/admin-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim() || undefined,
          password: password.trim() || undefined,
        }),
      });

      const payload = await res.json();

      if (!res.ok) {
        throw new Error(payload.error || 'Failed to add admin');
      }

      setFeedback({ type: 'success', message: payload.message || 'Admin updated.' });
      if (payload.temporaryPassword) {
        setTemporaryPassword(payload.temporaryPassword);
      }
      setEmail('');
      setName('');
      setPassword('');
      await loadAdmins();
    } catch (error: any) {
      setFeedback({ type: 'error', message: error.message || 'Failed to add admin' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="font-serif text-4xl text-charcoal-dark">Admin Access</h1>
        <p className="text-sm text-charcoal/70">
          Invite or promote teammates to manage the store.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-cream p-6 border border-charcoal/10 space-y-4">
        <h2 className="font-serif text-2xl text-charcoal">Add Admin</h2>
        <p className="text-sm text-charcoal/70">
          Existing users will be promoted. New users require a password (or one will be generated).
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-charcoal/70 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-4 py-3 bg-cream-light border border-charcoal/20 focus:border-charcoal focus:outline-none transition-colors"
              placeholder="user@example.com"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-charcoal/70 mb-2">
              Name (optional)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              className="w-full px-4 py-3 bg-cream-light border border-charcoal/20 focus:border-charcoal focus:outline-none transition-colors"
              placeholder="Teammate name"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-charcoal/70 mb-2">
            Password (optional - auto-generated if empty)
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            className="w-full px-4 py-3 bg-cream-light border border-charcoal/20 focus:border-charcoal focus:outline-none transition-colors"
            placeholder="Leave empty to auto-generate"
          />
          {password && password.length < 8 && (
            <p className="text-xs text-beige mt-1">
              Password should be at least 8 characters
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center px-6 py-3 bg-charcoal text-cream uppercase tracking-wider text-sm disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {submitting ? 'Saving…' : 'Save Admin Access'}
        </button>
      </form>

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

      {temporaryPassword && (
        <div className="border border-beige bg-beige/20 px-4 py-3 text-sm text-charcoal-dark">
          <strong>Temporary password:</strong> {temporaryPassword}
          <p className="mt-2">
            Share this password with the new admin. They can change it after signing in.
          </p>
        </div>
      )}

      <div className="bg-cream p-6 border border-charcoal/10">
        <h2 className="font-serif text-2xl text-charcoal mb-4">Current Admins</h2>

        {loading ? (
          <p className="text-charcoal/60 text-sm">Loading admin list…</p>
        ) : admins.length === 0 ? (
          <p className="text-charcoal/60 text-sm">No admins found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-charcoal/10 text-left text-xs uppercase tracking-wider text-charcoal/60">
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Added</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <tr key={admin.id} className="border-b border-charcoal/10 last:border-0">
                    <td className="py-3 px-4 text-sm text-charcoal">{admin.email}</td>
                    <td className="py-3 px-4 text-sm text-charcoal">{admin.name || '—'}</td>
                    <td className="py-3 px-4 text-sm text-charcoal">
                      {new Date(admin.createdAt).toLocaleDateString()}
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
