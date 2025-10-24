'use client';

import { useEffect, useState } from 'react';
import { formatCurrency } from '@/lib/currency';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
  orderCount: number;
  totalSpent: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      const payload = await res.json();

      if (res.ok) {
        setUsers(payload.users || []);
      } else {
        throw new Error(payload.error || 'Failed to load users');
      }
    } catch (error: any) {
      setFeedback({ type: 'error', message: error.message || 'Failed to load users' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  const handleRoleChange = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    const action = newRole === 'admin' ? 'promote to admin' : 'demote to user';

    const confirmed = window.confirm(`Are you sure you want to ${action}?`);
    if (!confirmed) return;

    setUpdatingUserId(userId);
    setFeedback(null);

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      const payload = await res.json();

      if (!res.ok) {
        throw new Error(payload.error || 'Failed to update user role');
      }

      setFeedback({ type: 'success', message: payload.message || 'User role updated' });
      await loadUsers();
    } catch (error: any) {
      setFeedback({ type: 'error', message: error.message || 'Failed to update user role' });
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${userEmail}? This action cannot be undone. Their orders will be kept for records.`
    );
    if (!confirmed) return;

    setUpdatingUserId(userId);
    setFeedback(null);

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      const payload = await res.json();

      if (!res.ok) {
        throw new Error(payload.error || 'Failed to delete user');
      }

      setFeedback({ type: 'success', message: 'User deleted successfully' });
      await loadUsers();
    } catch (error: any) {
      setFeedback({ type: 'error', message: error.message || 'Failed to delete user' });
    } finally {
      setUpdatingUserId(null);
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const adminCount = users.filter(u => u.role === 'admin').length;
  const totalRevenue = users.reduce((sum, user) => sum + user.totalSpent, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl text-charcoal-dark mb-2">Users</h1>
          <p className="text-charcoal/60">
            {users.length} total • {adminCount} admins • {formatCurrency(totalRevenue)} lifetime revenue
          </p>
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

      <div className="bg-cream p-6 border border-charcoal/10 space-y-4">
        <input
          type="text"
          placeholder="Search by email or name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 bg-cream-light border border-charcoal/20 focus:border-charcoal focus:outline-none transition-colors"
        />

        {loading ? (
          <p className="text-charcoal/60 text-sm">Loading users…</p>
        ) : filteredUsers.length === 0 ? (
          <p className="text-charcoal/60 text-sm">
            {searchTerm ? 'No users found matching your search.' : 'No users yet.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-charcoal/10 text-left text-xs uppercase tracking-wider text-charcoal/60">
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Orders</th>
                  <th className="py-3 px-4">Total Spent</th>
                  <th className="py-3 px-4">Joined</th>
                  <th className="py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-charcoal/10 last:border-0">
                    <td className="py-3 px-4 text-sm text-charcoal">{user.email}</td>
                    <td className="py-3 px-4 text-sm text-charcoal">{user.name || '—'}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-1 text-xs rounded uppercase tracking-wider ${
                          user.role === 'admin'
                            ? 'bg-charcoal text-cream'
                            : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-charcoal">{user.orderCount}</td>
                    <td className="py-3 px-4 text-sm text-charcoal font-medium">
                      {formatCurrency(user.totalSpent)}
                    </td>
                    <td className="py-3 px-4 text-sm text-charcoal">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleRoleChange(user.id, user.role)}
                          disabled={updatingUserId === user.id}
                          className="text-sm text-charcoal hover:underline disabled:opacity-50"
                        >
                          {updatingUserId === user.id
                            ? 'Updating…'
                            : user.role === 'admin'
                            ? 'Demote'
                            : 'Promote'}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id, user.email)}
                          disabled={updatingUserId === user.id}
                          className="text-sm text-charcoal-dark hover:underline disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
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
