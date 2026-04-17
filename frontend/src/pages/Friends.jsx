// frontend/src/pages/Friends.jsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, TrendingUp, TrendingDown, Search, UserPlus,
  X, Check, UserMinus, Clock, RefreshCw,
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import '../styles/Friends.css';

const fmt = (v) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(v || 0);

// ── Add Friend Modal ──────────────────────────────────────────────────────────
const AddFriendModal = ({ onClose, onRequestSent }) => {
  const [query,    setQuery]    = useState('');
  const [results,  setResults]  = useState([]);
  const [email,    setEmail]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [sending,  setSending]  = useState(null);
  const [tab,      setTab]      = useState('search');

  const searchUsers = useCallback(async (q) => {
    if (!q || q.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      // FIX: axios interceptor already unwraps response.data,
      // so the result IS the response body directly.
      const res = await api.get(`/friends/search?q=${encodeURIComponent(q.trim())}`);
      setResults(res?.data?.users || res?.users || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchUsers(query), 400);
    return () => clearTimeout(t);
  }, [query, searchUsers]);

  const sendByUserId = async (userId, name) => {
    setSending(userId);
    try {
      const userEmail = results.find(r => r._id === userId)?.email;
      await api.post('/friends/invite/email', { email: userEmail });
      toast.success(`Friend request sent to ${name}!`);
      setResults(prev => prev.map(r => r._id === userId ? { ...r, friendStatus: 'pending' } : r));
      onRequestSent?.();
    } catch (err) {
      toast.error(err.message || 'Failed to send request');
    } finally {
      setSending(null);
    }
  };

  const sendByEmail = async () => {
    if (!email.trim()) { toast.error('Enter an email address'); return; }
    setSending('email');
    try {
      const res = await api.post('/friends/invite/email', { email: email.trim() });
      toast.success(res.data.message || 'Friend request sent!');
      setEmail('');
      onRequestSent?.();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to send request');
    } finally {
      setSending(null);
    }
  };

  return (
    <div className="fr-overlay" onClick={onClose}>
      <div className="fr-modal" onClick={e => e.stopPropagation()}>
        <div className="fr-modal__hdr">
          <h2>Add Friend</h2>
          <button className="fr-icon-btn" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="fr-tabs">
          <button
            className={`fr-tab ${tab === 'search' ? 'active' : ''}`}
            onClick={() => setTab('search')}
          >
            🔍 Search Users
          </button>
          <button
            className={`fr-tab ${tab === 'email' ? 'active' : ''}`}
            onClick={() => setTab('email')}
          >
            📧 Send by Email
          </button>
        </div>

        <div className="fr-modal__body">
          {tab === 'search' ? (
            <>
              <div className="fr-search-wrap">
                <Search size={15} className="fr-search-ico" />
                <input
                  className="fr-search-input"
                  placeholder="Search by name or email..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  autoFocus
                />
                {loading && <div className="fr-spin-sm" />}
              </div>
              <div className="fr-results">
                {results.length === 0 && query.length >= 2 && !loading && (
                  <div className="fr-empty-sm">
                    No users found. Try sending by email instead.
                  </div>
                )}
                {results.map(u => (
                  <div key={u._id} className="fr-result-row">
                    <div className="fr-avatar">
                      {u.initials || u.name?.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="fr-result-info">
                      <span className="fr-result-name">{u.name}</span>
                      <span className="fr-result-email">{u.email}</span>
                    </div>
                    {u.friendStatus === 'accepted' ? (
                      <span className="fr-badge fr-badge--friend">✓ Friends</span>
                    ) : u.friendStatus === 'pending' ? (
                      <span className="fr-badge fr-badge--pending"><Clock size={11}/> Sent</span>
                    ) : (
                      <button
                        className="fr-btn fr-btn--primary fr-btn--sm"
                        disabled={sending === u._id}
                        onClick={() => sendByUserId(u._id, u.name)}
                      >
                        {sending === u._id ? '...' : <><UserPlus size={13} /> Add</>}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="fr-field">
                <label>Email Address</label>
                <input
                  className="fr-input"
                  type="email"
                  placeholder="friend@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendByEmail()}
                  autoFocus
                />
              </div>
              <p className="fr-note">
                📧 A friend request notification will be sent to their email
              </p>
              <button
                className="fr-btn fr-btn--primary"
                style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}
                onClick={sendByEmail}
                disabled={sending === 'email'}
              >
                {sending === 'email' ? 'Sending...' : 'Send Friend Request'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Main Friends Page ─────────────────────────────────────────────────────────
const Friends = () => {
  const { user }   = useAuth();
  const [tab,      setTab]      = useState('friends');
  const [friends,  setFriends]  = useState([]);
  const [requests, setRequests] = useState({ received: [], sent: [] });
  const [balances, setBalances] = useState([]);
  const [search,   setSearch]   = useState('');
  const [loading,  setLoading]  = useState(true);
  const [showAdd,  setShowAdd]  = useState(false);
  const [acting,   setActing]   = useState(null);
  const [errors,   setErrors]   = useState({ friends: false, requests: false, balances: false });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setErrors({ friends: false, requests: false, balances: false });

    // FIX: GET /friends returns everything in one call.
    // axios interceptor unwraps response.data, so result IS the body.
    // Body shape: { success, data: { friends, pendingReceived, pendingSent } }
    const [friendsRes] = await Promise.allSettled([
      api.get('/friends'),
    ]);

    if (friendsRes.status === 'fulfilled') {
      // Handle both wrapped { data: { friends } } and flat { friends } shapes
      const payload = friendsRes.value?.data ?? friendsRes.value ?? {};

      // Friends list: each item has a nested .friend object from the controller
      const rawFriends = payload.friends || [];
      // Flatten so the rest of the UI can use f._id, f.name, f.email directly
      setFriends(rawFriends.map(r => ({
        _id:   r._id,           // friendship document id (used for remove)
        name:  r.friend?.name  || r.name  || '',
        email: r.friend?.email || r.email || '',
        since: r.since,
      })));

      // Requests: pendingReceived / pendingSent from the same endpoint
      setRequests({
        received: (payload.pendingReceived || []).map(r => ({
          _id:  r._id,
          from: r.friend || { _id: r._id, name: r.name, email: r.email },
        })),
        sent: (payload.pendingSent || []).map(r => ({
          _id: r._id,
          to:  r.friend || { _id: r._id, name: r.name, email: r.email },
        })),
      });
    } else {
      setErrors(e => ({ ...e, friends: true, requests: true }));
      toast.error('Failed to load friends list');
    }

    // Aggregate balances from groups — independent, non-blocking
    try {
      const groupsRes = await api.get('/groups');
      const groupList =
        groupsRes?.data?.groups ??
        groupsRes?.groups       ??
        [];


      const balanceMap = {};

      await Promise.allSettled(
        groupList.map(async (g) => {
          try {
            const b = await api.get(`/groups/${g._id}/balances`);
            const payload  = b?.data ?? b ?? {};
            const iOwe     = payload.iOwe     || [];
            const owedToMe = payload.owedToMe || [];

            iOwe.forEach(d => {
              const key = d.to;
              if (!balanceMap[key]) balanceMap[key] = { name: d.to, owes: 0, owedToMe: 0, groups: [] };
              balanceMap[key].owes += d.amount;
              if (!balanceMap[key].groups.includes(g.name)) balanceMap[key].groups.push(g.name);
            });

            owedToMe.forEach(d => {
              const key = d.from;
              if (!balanceMap[key]) balanceMap[key] = { name: d.from, owes: 0, owedToMe: 0, groups: [] };
              balanceMap[key].owedToMe += d.amount;
              if (!balanceMap[key].groups.includes(g.name)) balanceMap[key].groups.push(g.name);
            });
          } catch {
            // Silently skip groups where balances can't be loaded
          }
        })
      );

      setBalances(Object.values(balanceMap));
    } catch {
      setErrors(e => ({ ...e, balances: true }));
    }

    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const accept = async (docId, name) => {
    setActing(docId);
    try {
      await api.put(`/friends/${docId}/accept`);
      toast.success(`You are now friends with ${name}! 🎉`);
      fetchAll();
    } catch (err) {
      toast.error(err.message || 'Failed to accept request');
    } finally {
      setActing(null);
    }
  };

  const reject = async (friendshipId) => {
    setActing(friendshipId);
    try {
      await api.put(`/friends/${friendshipId}/decline`);
      toast.success('Request declined');
      fetchAll();
    } catch (err) {
      toast.error(err.message || 'Failed to decline request');
    } finally {
      setActing(null);
    }
  };

  const removeFriend = async (docId, name) => {
    if (!window.confirm(`Remove ${name} from friends?`)) return;
    setActing(docId);
    try {
      await api.delete(`/friends/${docId}`);
      toast.success(`${name} removed from friends`);
      fetchAll();
    } catch (err) {
      toast.error(err.message || 'Failed to remove friend');
    } finally {
      setActing(null);
    }
  };

  const filteredFriends = friends.filter(f =>
    f.name?.toLowerCase().includes(search.toLowerCase())
  );
  const totalOwed   = balances.reduce((s, b) => s + (b.owes     || 0), 0);
  const totalOwedMe = balances.reduce((s, b) => s + (b.owedToMe || 0), 0);
  const pendingCount = requests.received?.length || 0;

  return (
    <div className="fr-page">
      <div className="fr-page__hdr">
        <div>
          <h1 className="fr-title">Friends</h1>
          <p className="fr-sub">Connect and split expenses with friends</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="fr-btn fr-btn--ghost fr-btn--sm" onClick={fetchAll} title="Refresh">
            <RefreshCw size={14} />
          </button>
          <button className="fr-btn fr-btn--primary" onClick={() => setShowAdd(true)}>
            <UserPlus size={15} /> Add Friend
          </button>
        </div>
      </div>

      <div className="fr-summary-row">
        <div className={`fr-sum-card ${totalOwedMe >= totalOwed ? 'fr-sum-card--pos' : 'fr-sum-card--neg'}`}>
          <div className="fr-sum-card__icon">
            {totalOwedMe >= totalOwed
              ? <TrendingUp size={20} />
              : <TrendingDown size={20} />}
          </div>
          <div>
            <div className="fr-sum-card__lbl">Overall Balance</div>
            <div className="fr-sum-card__val">
              {totalOwedMe >= totalOwed
                ? `You are owed ${fmt(totalOwedMe - totalOwed)}`
                : `You owe ${fmt(totalOwed - totalOwedMe)}`}
            </div>
          </div>
        </div>
        <div className="fr-sum-pills">
          <div className="fr-pill fr-pill--neg">
            <TrendingDown size={13} /> You owe {fmt(totalOwed)}
          </div>
          <div className="fr-pill fr-pill--pos">
            <TrendingUp size={13} /> Owed to you {fmt(totalOwedMe)}
          </div>
        </div>
      </div>

      <div className="fr-tabs fr-tabs--page">
        <button
          className={`fr-tab-page ${tab === 'friends' ? 'active' : ''}`}
          onClick={() => setTab('friends')}
        >
          👥 Friends ({friends.length})
        </button>
        <button
          className={`fr-tab-page ${tab === 'requests' ? 'active' : ''}`}
          onClick={() => setTab('requests')}
        >
          🔔 Requests
          {pendingCount > 0 && (
            <span className="fr-badge-count">{pendingCount}</span>
          )}
        </button>
        <button
          className={`fr-tab-page ${tab === 'balances' ? 'active' : ''}`}
          onClick={() => setTab('balances')}
        >
          ⚖️ Balances
        </button>
      </div>

      {tab === 'friends' && (
        <>
          {friends.length > 0 && (
            <div className="fr-search-wrap" style={{ marginBottom: '0.75rem' }}>
              <Search size={15} className="fr-search-ico" />
              <input
                className="fr-search-input"
                placeholder="Search friends..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--color-text-secondary)',
                  }}
                  onClick={() => setSearch('')}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )}
          <div className="fr-card">
            {loading ? (
              Array(3).fill(0).map((_, i) => <div key={i} className="fr-skeleton" />)
            ) : errors.friends ? (
              <div className="fr-empty">
                <p style={{ color: 'var(--color-error, #ef4444)' }}>
                  Could not load friends. Check your connection and try refreshing.
                </p>
                <button className="fr-btn fr-btn--ghost fr-btn--sm" onClick={fetchAll}>
                  <RefreshCw size={13} /> Retry
                </button>
              </div>
            ) : filteredFriends.length === 0 ? (
              <div className="fr-empty">
                <Users size={32} />
                <h3>{search ? 'No friends match your search' : 'No friends yet'}</h3>
                <p>
                  {search
                    ? 'Try a different name'
                    : 'Add friends to split expenses together'}
                </p>
                {!search && (
                  <button
                    className="fr-btn fr-btn--primary"
                    onClick={() => setShowAdd(true)}
                  >
                    <UserPlus size={15} /> Add Your First Friend
                  </button>
                )}
              </div>
            ) : (
              filteredFriends.map(f => (
                <div key={f._id} className="fr-friend-row">
                  <div className="fr-avatar">
                    {f.name?.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="fr-friend-info">
                    <span className="fr-friend-name">{f.name}</span>
                    <span className="fr-friend-email">{f.email}</span>
                  </div>
                  <div className="fr-friend-actions">
                    <span className="fr-badge fr-badge--friend">✓ Friends</span>
                    <button
                      className="fr-icon-btn fr-icon-btn--danger"
                      title="Remove friend"
                      disabled={acting === f._id}
                      onClick={() => removeFriend(f._id, f.name)}
                    >
                      <UserMinus size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {tab === 'requests' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="fr-card">
            <h3 className="fr-section-title">
              Received ({requests.received?.length || 0})
            </h3>
            {errors.requests ? (
              <div className="fr-empty-sm" style={{ color: 'var(--color-error, #ef4444)' }}>
                Could not load requests.{' '}
                <button
                  className="fr-btn fr-btn--ghost fr-btn--sm"
                  style={{ display: 'inline-flex', marginLeft: 8 }}
                  onClick={fetchAll}
                >
                  Retry
                </button>
              </div>
            ) : !requests.received?.length ? (
              <div className="fr-empty-sm">No pending friend requests</div>
            ) : (
              requests.received.map(r => (
                <div key={r._id} className="fr-friend-row">
                  <div className="fr-avatar">
                    {r.from?.name?.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="fr-friend-info">
                    <span className="fr-friend-name">{r.from?.name}</span>
                    <span className="fr-friend-email">{r.from?.email}</span>
                  </div>
                  <div className="fr-friend-actions">
                    <button
                      className="fr-btn fr-btn--primary fr-btn--sm"
                      disabled={acting === r._id}
                      onClick={() => accept(r._id, r.from?.name)}
                    >
                      <Check size={13} /> Accept
                    </button>
                    <button
                      className="fr-btn fr-btn--ghost fr-btn--sm"
                      disabled={acting === r._id}
                      onClick={() => reject(r._id)}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="fr-card">
            <h3 className="fr-section-title">
              Sent ({requests.sent?.length || 0})
            </h3>
            {!requests.sent?.length ? (
              <div className="fr-empty-sm">No outgoing requests</div>
            ) : (
              requests.sent.map(r => (
                <div key={r._id} className="fr-friend-row">
                  <div className="fr-avatar">
                    {r.to?.name?.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="fr-friend-info">
                    <span className="fr-friend-name">{r.to?.name}</span>
                    <span className="fr-friend-email">{r.to?.email}</span>
                  </div>
                  <span className="fr-badge fr-badge--pending">
                    <Clock size={11} /> Pending
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {tab === 'balances' && (
        <div className="fr-card">
          <h3 className="fr-section-title">Balances from all groups</h3>
          {loading ? (
            Array(2).fill(0).map((_, i) => <div key={i} className="fr-skeleton" />)
          ) : balances.length === 0 ? (
            <div className="fr-empty-sm">
              No group balances yet. Create groups and add expenses.
            </div>
          ) : (
            balances.map((b, i) => {
              const net = (b.owedToMe || 0) - (b.owes || 0);
              return (
                <div key={i} className="fr-balance-row">
                  <div className="fr-avatar">{b.name.slice(0, 2).toUpperCase()}</div>
                  <div className="fr-friend-info">
                    <span className="fr-friend-name">{b.name}</span>
                    <span className="fr-friend-email">{b.groups.join(', ')}</span>
                  </div>
                  <div className="fr-balance-val">
                    {net === 0 ? (
                      <span className="fr-badge fr-badge--friend">✓ Settled</span>
                    ) : net > 0 ? (
                      <div style={{ textAlign: 'right' }}>
                        <div className="fr-bal-label pos">owes you</div>
                        <div className="fr-bal-amount pos">{fmt(net)}</div>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'right' }}>
                        <div className="fr-bal-label neg">you owe</div>
                        <div className="fr-bal-amount neg">{fmt(Math.abs(net))}</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {showAdd && (
        <AddFriendModal
          onClose={() => setShowAdd(false)}
          onRequestSent={() => fetchAll()}
        />
      )}
    </div>
  );
};

export default Friends;
