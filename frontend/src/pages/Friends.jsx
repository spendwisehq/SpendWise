// frontend/src/pages/Friends.jsx

import React, { useState, useEffect } from 'react';
import { Users, TrendingUp, TrendingDown, Search, UserPlus, X, Mail, Phone } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import './Friends.css';

const fmt = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

// ── Invite Modal ─────────────────────────────────────────────────────────────
const InviteModal = ({ groupId, groupName, onClose }) => {
  const [method,  setMethod]  = useState('email');
  const [value,   setValue]   = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Search effect for global friends
  useEffect(() => {
    if (groupId || value.length < 3 || method !== 'email') {
      setSearchResults([]);
      return;
    }
    
    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.get(`/friends/search?q=${encodeURIComponent(value)}`);
        setSearchResults(res.data?.data || []);
      } catch (err) {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [value, groupId, method]);

  const handleInvite = async (targetEmail = value) => {
    if (!targetEmail.trim()) { toast.error('Please enter an email or phone'); return; }
    setLoading(true);
    try {
      if (groupId) {
        await api.post(`/groups/${groupId}/members`, {
          email: method === 'email' ? targetEmail : undefined,
          phone: method === 'sms'   ? targetEmail : undefined,
          name:  targetEmail.split('@')[0],
        });
        toast.success(`Invitation sent to ${targetEmail}!`);
      } else {
        // Friend request or email invite
        const res = await api.post(`/friends/invite`, { email: targetEmail });
        toast.success(res.message || `Request sent to ${targetEmail}!`);
      }
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to send request');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <h2>Add Friend {groupName ? `to ${groupName}` : ''}</h2>
          <button className="modal__close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal__form">
          <div className="invite-method-tabs">
            <button className={`invite-tab ${method === 'email' ? 'active' : ''}`}
              onClick={() => setMethod('email')}>
              <Mail size={14} /> Email
            </button>
            <button className={`invite-tab ${method === 'sms' ? 'active' : ''}`}
              onClick={() => setMethod('sms')}>
              <Phone size={14} /> SMS
            </button>
          </div>

          <div className="form-group" style={{ position: 'relative' }}>
            <label>{method === 'email' ? (groupId ? 'Email Address' : 'Search Name or Email') : 'Phone Number'}</label>
            <input
              className="form-input"
              type={method === 'email' && groupId ? 'email' : 'text'}
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder={method === 'email' ? (groupId ? 'friend@example.com' : 'Search or enter email...') : '+91 9876543210'}
              onKeyDown={e => e.key === 'Enter' && handleInvite()}
              autoFocus
            />
            {isSearching && <div style={{ position: 'absolute', right: '10px', top: '35px', fontSize: '12px', color: 'gray' }}>Searching...</div>}
            
            {/* Search Results Dropdown */}
            {!groupId && searchResults.length > 0 && method === 'email' && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0,
                background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                borderRadius: '8px', marginTop: '4px', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                maxHeight: '200px', overflowY: 'auto'
              }}>
                {searchResults.map(u => (
                  <div key={u._id} 
                    style={{ padding: '10px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', borderBottom: '1px solid var(--color-border)' }}
                    onClick={() => handleInvite(u.email)}>
                    <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>
                      {u.initials || u.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: '600' }}>{u.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{u.email}</div>
                    </div>
                    <UserPlus size={16} color="var(--color-primary)" />
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="invite-note">
            {method === 'email'
              ? (groupId ? '📧 An invitation link will be sent to their email' : '📧 Search SpendWise users or enter an email to invite')
              : '📱 An SMS invitation will be sent to their phone'}
          </p>

          <div className="modal__footer">
            <button className="btn btn--ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn--primary" onClick={() => handleInvite(value)} disabled={loading}>
              {loading ? 'Sending...' : (searchResults.length > 0 && !groupId ? 'Invite by Email Instead' : 'Send Invitation')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Friends Page ─────────────────────────────────────────────────────────────
const Friends = () => {
  const { user } = useAuth();
  const [groups,   setGroups]   = useState([]);
  const [friends,  setFriends]  = useState([]); // derived from group balances
  const [search,   setSearch]   = useState('');
  const [loading,  setLoading]  = useState(true);
  const [showInvite, setShowInvite] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const groupsRes = await api.get('/groups');
        const groupList = groupsRes.data.groups || [];
        setGroups(groupList);

        // Fetch balances for each group and aggregate by friend
        const friendMap = {};
        await Promise.all(groupList.map(async (g) => {
          try {
            const balRes = await api.get(`/groups/${g._id}/balances`);
            const { iOwe = [], owedToMe = [] } = balRes.data;

            iOwe.forEach(d => {
              const key = d.to;
              if (!friendMap[key]) friendMap[key] = { name: key, owes: 0, owedToMe: 0, groups: [] };
              friendMap[key].owes += d.amount;
              if (!friendMap[key].groups.includes(g.name)) friendMap[key].groups.push(g.name);
            });

            owedToMe.forEach(d => {
              const key = d.from;
              if (!friendMap[key]) friendMap[key] = { name: key, owes: 0, owedToMe: 0, groups: [] };
              friendMap[key].owedToMe += d.amount;
              if (!friendMap[key].groups.includes(g.name)) friendMap[key].groups.push(g.name);
            });
          } catch (err) {
            console.warn(`Failed to fetch balances for group ${g.name}:`, err.message);
          }
        }));

        setFriends(Object.values(friendMap));
      } catch { toast.error('Failed to load friends'); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const filtered = friends.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalOwed   = friends.reduce((s, f) => s + f.owes, 0);
  const totalOwedMe = friends.reduce((s, f) => s + f.owedToMe, 0);

  return (
    <div className="friends-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Friends</h1>
          <p className="page-subtitle">Track shared expenses with friends</p>
        </div>
        <button className="btn btn--primary" onClick={() => setShowInvite(true)}>
          <UserPlus size={16} /> Add Friend
        </button>
      </div>

      {/* Summary */}
      <div className="friends-summary">
        <div className={`summary-card summary-card--${totalOwedMe > totalOwed ? 'positive' : 'negative'}`}>
          <div className="summary-card__icon">
            {totalOwedMe >= totalOwed ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
          </div>
          <div>
            <div className="summary-card__label">Overall Balance</div>
            <div className="summary-card__value">
              {totalOwedMe >= totalOwed
                ? `You are owed ${fmt(totalOwedMe - totalOwed)}`
                : `You owe ${fmt(totalOwed - totalOwedMe)}`
              }
            </div>
          </div>
        </div>

        <div className="summary-pills">
          <div className="summary-pill summary-pill--danger">
            <TrendingDown size={14} />
            <span>You owe {fmt(totalOwed)}</span>
          </div>
          <div className="summary-pill summary-pill--success">
            <TrendingUp size={14} />
            <span>Owed to you {fmt(totalOwedMe)}</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="search-box">
        <Search size={16} />
        <input placeholder="Search friends..."
          value={search} onChange={e => setSearch(e.target.value)} />
        {search && <button onClick={() => setSearch('')}><X size={14} /></button>}
      </div>

      {/* Friends List */}
      {loading ? (
        Array(4).fill(0).map((_, i) => <div key={i} className="friend-row skeleton-row" />)
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <Users size={32} />
          <h3>{search ? 'No friends found' : 'No friends yet'}</h3>
          <p>{search ? 'Try a different search' : 'Create groups and split expenses to see friends here'}</p>
          {!search && (
            <button className="btn btn--primary" onClick={() => setShowInvite(true)}>
              <UserPlus size={16} /> Add Friend
            </button>
          )}
        </div>
      ) : (
        <div className="friends-list">
          {filtered.map((friend, i) => {
            const net = friend.owedToMe - friend.owes;
            return (
              <div key={i} className="friend-row">
                <div className="friend-row__avatar">
                  {friend.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="friend-row__info">
                  <span className="friend-row__name">{friend.name}</span>
                  <span className="friend-row__groups">
                    {friend.groups.join(', ')}
                  </span>
                </div>
                <div className="friend-row__balance">
                  {net === 0 ? (
                    <span className="balance-settled">✓ Settled up</span>
                  ) : net > 0 ? (
                    <div>
                      <span className="balance-positive">owes you</span>
                      <span className="balance-amount balance-amount--positive">{fmt(net)}</span>
                    </div>
                  ) : (
                    <div>
                      <span className="balance-negative">you owe</span>
                      <span className="balance-amount balance-amount--negative">{fmt(Math.abs(net))}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Groups quick view */}
      {groups.length > 0 && !search && (
        <div className="groups-quick">
          <h3 className="section-title">Your Groups</h3>
          <div className="groups-quick-list">
            {groups.map(g => (
              <div key={g._id} className="group-quick-item">
                <span className="group-quick-icon">
                  {{ trip:'✈️', flat:'🏠', office:'💼', family:'👨‍👩‍👧', event:'🎉', other:'👥' }[g.type] || '👥'}
                </span>
                <div className="group-quick-info">
                  <span className="group-quick-name">{g.name}</span>
                  <span className="group-quick-members">{g.members?.length} members</span>
                </div>
                <button className="btn btn--ghost btn--sm"
                  onClick={() => setShowInvite({ groupId: g._id, groupName: g.name })}>
                  <UserPlus size={14} /> Invite
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showInvite && (
        <InviteModal
          groupId={typeof showInvite === 'object' ? showInvite.groupId : null}
          groupName={typeof showInvite === 'object' ? showInvite.groupName : null}
          onClose={() => setShowInvite(false)}
        />
      )}
    </div>
  );
};

export default Friends;