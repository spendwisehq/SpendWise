// frontend/src/pages/JoinGroup.jsx
// Handles /join/:token — works for both new users and existing users

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const TYPE_ICONS = { trip: '✈️', flat: '🏠', office: '💼', family: '👨‍👩‍👧', event: '🎉', other: '👥' };

export default function JoinGroup() {
  const { token }    = useParams();
  const navigate     = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const [preview,  setPreview]  = useState(null);   // group preview
  const [loading,  setLoading]  = useState(true);
  const [joining,  setJoining]  = useState(false);
  const [error,    setError]    = useState(null);
  const [joined,   setJoined]   = useState(false);

  // ── Fetch group preview (public, no auth) ─────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/groups/join/${token}`);
        setPreview(res.data?.data?.group ?? res.data?.group);
      } catch (err) {
        setError(err.response?.data?.message || 'Invalid or expired invite link.');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  // ── Join the group ─────────────────────────────────────────────────────────
  const handleJoin = async () => {
    if (!isAuthenticated) {
      // Save token so we can auto-join after login/register
      sessionStorage.setItem('pendingInviteToken', token);
      navigate(`/register?invite=${token}`);
      return;
    }
    setJoining(true);
    try {
      const res = await api.post(`/groups/join/${token}`);
      const msg = res.data?.message || 'Joined!';
      setJoined(true);
      setTimeout(() => navigate('/groups'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to join group.');
    } finally {
      setJoining(false);
    }
  };

  // ── Styles (inline — no extra CSS file needed) ─────────────────────────────
  const S = {
    page:    { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', padding: '1.5rem' },
    card:    { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 24, padding: '2.5rem 2rem', maxWidth: 420, width: '100%', textAlign: 'center', boxShadow: 'var(--shadow-lg)' },
    logo:    { fontSize: '2rem', fontWeight: 900, color: 'var(--color-primary)', marginBottom: '2rem', display: 'block' },
    icon:    { fontSize: '3.5rem', marginBottom: '0.75rem', display: 'block' },
    title:   { fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-text-primary)', margin: '0 0 0.4rem' },
    sub:     { fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: '0 0 0.5rem' },
    info:    { background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, padding: '1rem', margin: '1.5rem 0', fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.7 },
    members: { display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', margin: '0.75rem 0' },
    chip:    { padding: '0.25rem 0.65rem', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 20, fontSize: '0.78rem', color: 'var(--color-text-secondary)' },
    btn:     { width: '100%', padding: '0.85rem', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: '1rem', cursor: 'pointer', marginTop: '0.75rem', transition: 'opacity 0.15s' },
    ghost:   { width: '100%', padding: '0.75rem', background: 'none', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)', borderRadius: 12, fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', marginTop: '0.5rem' },
    error:   { color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '0.75rem', fontSize: '0.875rem', marginTop: '1rem' },
    success: { color: '#22c55e', fontSize: '1rem', fontWeight: 700, marginTop: '1rem' },
    spinner: { width: 28, height: 28, border: '3px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto' },
  };

  if (loading) return (
    <div style={S.page}>
      <div style={S.card}>
        <span style={S.logo}>💰 SpendWise</span>
        <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>Loading invite…</div>
      </div>
    </div>
  );

  if (error && !preview) return (
    <div style={S.page}>
      <div style={S.card}>
        <span style={S.logo}>💰 SpendWise</span>
        <span style={{ fontSize: '3rem', display: 'block', marginBottom: '0.75rem' }}>🔗</span>
        <h2 style={S.title}>Invalid Invite Link</h2>
        <p style={S.sub}>This link may have expired or been revoked.</p>
        <div style={S.error}>{error}</div>
        <button style={{ ...S.btn, marginTop: '1.5rem' }} onClick={() => navigate('/groups')}>
          Go to Groups
        </button>
      </div>
    </div>
  );

  if (joined) return (
    <div style={S.page}>
      <div style={S.card}>
        <span style={S.logo}>💰 SpendWise</span>
        <span style={{ fontSize: '3.5rem', display: 'block', marginBottom: '0.75rem' }}>🎉</span>
        <h2 style={S.title}>You joined!</h2>
        <p style={{ ...S.sub, color: '#22c55e', fontWeight: 600 }}>Welcome to {preview?.name}! Redirecting…</p>
      </div>
    </div>
  );

  return (
    <div style={S.page}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={S.card}>
        <span style={S.logo}>💰 SpendWise</span>

        <span style={S.icon}>{TYPE_ICONS[preview?.type] || '👥'}</span>
        <h2 style={S.title}>{preview?.name}</h2>
        <p style={S.sub}>{preview?.type?.charAt(0).toUpperCase() + preview?.type?.slice(1)} group</p>

        <div style={S.info}>
          <strong style={{ color: 'var(--color-text-primary)' }}>{preview?.createdBy}</strong> invited you to join this group on SpendWise.
          <br />
          <span style={{ fontSize: '0.8rem' }}>{preview?.memberCount} member{preview?.memberCount !== 1 ? 's' : ''} already inside</span>
          {preview?.memberNames?.length > 0 && (
            <div style={S.members}>
              {preview.memberNames.map((n, i) => <span key={i} style={S.chip}>{n}</span>)}
              {preview.memberCount > 3 && <span style={S.chip}>+{preview.memberCount - 3} more</span>}
            </div>
          )}
        </div>

        {isAuthenticated ? (
          <>
            <p style={{ fontSize: '0.83rem', color: 'var(--color-text-secondary)', marginBottom: 4 }}>
              Joining as <strong style={{ color: 'var(--color-text-primary)' }}>{user?.name}</strong>
            </p>
            <button style={S.btn} onClick={handleJoin} disabled={joining}>
              {joining ? <div style={S.spinner} /> : `Join "${preview?.name}" →`}
            </button>
            <button style={S.ghost} onClick={() => navigate('/groups')}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <p style={{ fontSize: '0.83rem', color: 'var(--color-text-secondary)', marginBottom: 4 }}>
              Create a free account or log in to join this group.
            </p>
            <button style={S.btn} onClick={() => { sessionStorage.setItem('pendingInviteToken', token); navigate(`/register?invite=${token}`); }}>
              Create Account & Join →
            </button>
            <button style={{ ...S.ghost, marginTop: '0.5rem' }} onClick={() => { sessionStorage.setItem('pendingInviteToken', token); navigate(`/login?invite=${token}`); }}>
              Already have an account? Log in
            </button>
          </>
        )}

        {error && <div style={S.error}>{error}</div>}
      </div>
    </div>
  );
}