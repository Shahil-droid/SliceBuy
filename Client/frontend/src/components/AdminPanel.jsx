import { useEffect, useState } from 'react';
import api from '../api/axios';
import './AdminPanel.css';
import { Shield, Trash2, CheckCircle, XCircle, Loader2, Search } from 'lucide-react';

/**
 * AdminPanel – premium dashboard for staff users.
 *
 * Features:
 *  • Fetches all users with admin‑level fields.
 *  • Displays a responsive table with avatars, roles, status, and timestamps.
 *  • Allows staff to delete a user (except superusers and self).
 *  • Shows toast notifications for success / error.
 *  • Includes search & role‑filtering for quick navigation.
 */
const AdminPanel = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [deletingId, setDeletingId] = useState(null);
  const [toast, setToast] = useState(null);

  // Fetch users on mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get('/users/admin/users/');
        setUsers(res.data);
      } catch (err) {
        setError('Failed to load users.');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleDelete = async (id, username) => {
    if (!window.confirm(`Delete user "${username}"? This action cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await api.delete(`/users/admin/users/${id}/`);
      setUsers(prev => prev.filter(u => u.id !== id));
      setToast({ type: 'success', message: `User "${username}" deleted.` });
    } catch (err) {
      const msg = err.response?.data?.error || 'Deletion failed.';
      setToast({ type: 'error', message: msg });
    } finally {
      setDeletingId(null);
    }
  };

  // Filtered list based on search & role
  const filtered = users.filter(u => {
    const matchesSearch =
      u.username?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    const matchesRole =
      roleFilter === 'all' ||
      (roleFilter === 'seller' && u.is_seller) ||
      (roleFilter === 'buyer' && !u.is_seller) ||
      (roleFilter === 'staff' && u.is_staff) ||
      (roleFilter === 'super' && u.is_superuser);
    return matchesSearch && matchesRole;
  });

  // Auto‑dismiss toast after 4s
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  return (
    <section className="admin-panel">
      <div className="admin-panel__inner">
        {/* Header */}
        <header className="admin-panel__header">
          <div className="admin-panel__header-row">
            <div className="admin-panel__title-group">
              <div className="admin-panel__icon"><Shield size={28} /></div>
              <h1 className="admin-panel__title">Admin Dashboard</h1>
            </div>
            <p className="admin-panel__subtitle">Manage users, monitor activity, and keep the marketplace safe.</p>
          </div>
        </header>

        {/* Stats */}
        <div className="admin-panel__stats">
          <div className="admin-stat-card">
            <div className="admin-stat-card__icon admin-stat-card__icon--purple"><Shield size={20} /></div>
            <div>
              <div className="admin-stat-card__value">{users.length}</div>
              <div className="admin-stat-card__label">Total Users</div>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-card__icon admin-stat-card__icon--teal"><CheckCircle size={20} /></div>
            <div>
              <div className="admin-stat-card__value">{users.filter(u => u.is_active).length}</div>
              <div className="admin-stat-card__label">Active</div>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-card__icon admin-stat-card__icon--rose"><XCircle size={20} /></div>
            <div>
              <div className="admin-stat-card__value">{users.filter(u => !u.is_active).length}</div>
              <div className="admin-stat-card__label">Inactive</div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="admin-panel__toolbar">
          <div className="admin-panel__search">
            <span className="admin-panel__search-icon"><Search size={18} /></span>
            <input
              type="text"
              placeholder="Search by username or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="admin-panel__filters">
            {['all', 'seller', 'buyer', 'staff', 'super'].map(f => (
              <button
                key={f}
                className={`admin-panel__filter-btn ${roleFilter === f ? 'admin-panel__filter-btn--active' : ''}`}
                onClick={() => setRoleFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="admin-panel__table-wrap">
          {loading ? (
            <div className="admin-panel__loading">
              <div className="admin-panel__spinner" />
              <p>Loading users…</p>
            </div>
          ) : error ? (
            <div className="admin-panel__empty">
              <p>{error}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="admin-panel__empty">
              <p>No users match your criteria.</p>
            </div>
          ) : (
            <table className="admin-panel__table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Last login</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div className="admin-user-cell">
                        <div className="admin-user-cell__avatar">
                          {u.username?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div className="admin-user-cell__info">
                          <span className="admin-user-cell__name">{u.username}</span>
                          <span className="admin-user-cell__email">{u.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      {u.is_superuser && <span className="admin-badge admin-badge--superuser">Superuser</span>}
                      {u.is_staff && !u.is_superuser && <span className="admin-badge admin-badge--staff">Staff</span>}
                      {u.is_seller && <span className="admin-badge admin-badge--seller">Seller</span>}
                      {!u.is_seller && <span className="admin-badge admin-badge--buyer">Buyer</span>}
                    </td>
                    <td>
                      {u.is_active ? (
                        <span className="admin-badge admin-badge--active">Active</span>
                      ) : (
                        <span className="admin-badge admin-badge--inactive">Inactive</span>
                      )}
                    </td>
                    <td>
                      <div className="admin-date">
                        {new Date(u.date_joined).toLocaleDateString()}
                        <span className="admin-date__time">{new Date(u.date_joined).toLocaleTimeString()}</span>
                      </div>
                    </td>
                    <td>
                      <div className="admin-date">
                        {u.last_login ? new Date(u.last_login).toLocaleDateString() : '—'}
                        {u.last_login && (
                          <span className="admin-date__time">{new Date(u.last_login).toLocaleTimeString()}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <button
                        className="admin-delete-btn"
                        disabled={deletingId === u.id || u.is_superuser || u.id === /* current user id placeholder */ 0}
                        onClick={() => handleDelete(u.id, u.username)}
                      >
                        <Trash2 size={16} /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Toast */}
        {toast && (
          <div className={`admin-toast admin-toast--${toast.type}`}>{toast.message}</div>
        )}
      </div>
    </section>
  );
};

export default AdminPanel;
