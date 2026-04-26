// frontend/src/pages/Settings.jsx
// DPDP UPDATE: Added "Danger Zone" card with hard-delete account flow
// All original sections (Profile, Notifications, SMS, 2FA, Security) preserved

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  User, Bell, Shield, Smartphone, Save, Eye, EyeOff,
  Key, Clock, Monitor, Smartphone as PhoneIcon, Globe,
  AlertTriangle, CheckCircle, RefreshCw, LogOut, Trash2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import authAPI from '../api/auth.api';
import toast from 'react-hot-toast';
import './Settings.css';

// ── Tiny QR renderer ──────────────────────────────────────────────────────
const QRCode = ({ value }) => {
  const encoded = encodeURIComponent(value);
  return (
    <div style={{ textAlign: 'center', margin: '1rem 0' }}>
      <img
        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encoded}`}
        alt="QR Code for authenticator app"
        style={{ borderRadius: 8, border: '1px solid var(--color-border)' }}
        width={180} height={180}
      />
    </div>
  );
};

// ── 6-box TOTP input ──────────────────────────────────────────────────────
const TOTPInput = ({ value, onChange, disabled, autoFocus = true }) => {
  const refs   = useRef([]);
  const digits = value.split('');

  const handleKey = (i, e) => {
    if (e.key === 'Backspace') {
      if (digits[i]) { const n = [...digits]; n[i] = ''; onChange(n.join('')); }
      else if (i > 0) refs.current[i - 1]?.focus();
      return;
    }
    if (e.key === 'ArrowLeft'  && i > 0) { refs.current[i - 1]?.focus(); return; }
    if (e.key === 'ArrowRight' && i < 5) { refs.current[i + 1]?.focus(); return; }
    if (!/^\d$/.test(e.key)) return;
    const n = [...digits]; n[i] = e.key; onChange(n.join(''));
    if (i < 5) refs.current[i + 1]?.focus();
  };

  const handlePaste = (e) => {
    const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (p) { onChange(p.padEnd(6, '').slice(0, 6)); refs.current[Math.min(p.length, 5)]?.focus(); }
    e.preventDefault();
  };

  return (
    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', margin: '1rem 0' }}>
      {Array(6).fill(0).map((_, i) => (
        <input
          key={i}
          ref={el => refs.current[i] = el}
          type="text" inputMode="numeric" maxLength={1}
          value={digits[i] || ''}
          onChange={() => {}}
          onKeyDown={e => handleKey(i, e)}
          onPaste={handlePaste}
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          style={{
            width: 42, height: 48,
            textAlign: 'center',
            fontSize: '1.2rem', fontWeight: 700,
            background: digits[i] ? 'rgba(99,102,241,0.10)' : 'var(--color-surface)',
            border: `2px solid ${digits[i] ? 'var(--color-primary)' : 'var(--color-border-strong)'}`,
            borderRadius: 8,
            color: 'var(--color-text-primary)',
            outline: 'none',
            caretColor: 'transparent',
          }}
        />
      ))}
    </div>
  );
};

// ── Constants ─────────────────────────────────────────────────────────────
const CURRENCIES = [
  { code: 'INR', label: '₹ INR — Indian Rupee' },
  { code: 'USD', label: '$ USD — US Dollar' },
  { code: 'EUR', label: '€ EUR — Euro' },
  { code: 'GBP', label: '£ GBP — British Pound' },
  { code: 'AED', label: 'د.إ AED — UAE Dirham' },
];
const TIMEZONES = ['Asia/Kolkata', 'America/New_York', 'Europe/London', 'Asia/Dubai', 'Asia/Singapore'];

// ── 2FA Setup Flow ────────────────────────────────────────────────────────
const TwoFASetup = ({ user, onEnabled, onCancel }) => {
  const [step, setStep] = useState('init');
  const [qrData, setQrData]       = useState(null);
  const [manualKey, setManualKey]  = useState('');
  const [totp, setTotp]            = useState('');
  const [loading, setLoading]      = useState(false);
  const [backupCodes, setBackupCodes] = useState([]);
  const [showManual, setShowManual]   = useState(false);

  const startSetup = async () => {
    setLoading(true);
    try {
      const res = await authAPI.setup2FA();
      setQrData(res.data?.otpauthUrl || res.otpauthUrl);
      setManualKey(res.data?.manualKey || res.manualKey || '');
      setStep('qr');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start 2FA setup');
    } finally { setLoading(false); }
  };

  const confirmEnable = async () => {
    if (totp.replace(/\s/g, '').length < 6) { toast.error('Enter the 6-digit code'); return; }
    setLoading(true);
    try {
      const res = await authAPI.enable2FA({ totp: totp.replace(/\s/g, '') });
      setBackupCodes(res.data?.backupCodes || res.backupCodes || []);
      setStep('backup');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid code — check your device clock');
      setTotp('');
    } finally { setLoading(false); }
  };

  if (step === 'init') return (
    <div style={card}>
      <div style={{ textAlign: 'center', padding: '1rem 0' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔐</div>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', lineHeight: 1.6 }}>
          Two-factor authentication adds an extra layer of security. After setup, you'll need your phone to sign in.
        </p>
      </div>
      <div style={{ display: 'flex', gap: '10px', marginTop: '1rem' }}>
        <button className="btn btn--secondary" onClick={onCancel} style={{ flex: 1 }}>Cancel</button>
        <button className="btn btn--primary" onClick={startSetup} disabled={loading} style={{ flex: 2 }}>
          {loading ? 'Setting up...' : 'Set Up 2FA →'}
        </button>
      </div>
    </div>
  );

  if (step === 'qr') return (
    <div style={card}>
      <h3 style={stepTitle}>Step 1 — Scan QR code</h3>
      <p style={stepDesc}>Open Google Authenticator, Authy, or any TOTP app and scan this code.</p>
      {qrData && <QRCode value={qrData} />}
      <button onClick={() => setShowManual(s => !s)} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '13px', cursor: 'pointer', marginBottom: '0.5rem' }}>
        {showManual ? 'Hide' : "Can't scan? Enter key manually"}
      </button>
      {showManual && (
        <div style={{ background: 'var(--color-bg)', borderRadius: 8, padding: '10px 14px', marginBottom: '1rem', fontFamily: 'monospace', fontSize: '13px', wordBreak: 'break-all', color: 'var(--color-text-primary)' }}>
          {manualKey}
        </div>
      )}
      <button className="btn btn--primary" onClick={() => setStep('confirm')} style={{ width: '100%' }}>I've scanned it →</button>
      <button onClick={onCancel} style={cancelBtn}>Cancel setup</button>
    </div>
  );

  if (step === 'confirm') return (
    <div style={card}>
      <h3 style={stepTitle}>Step 2 — Confirm code</h3>
      <p style={stepDesc}>Enter the 6-digit code from your authenticator app.</p>
      <TOTPInput value={totp} onChange={setTotp} disabled={loading} />
      <div style={{ display: 'flex', gap: '10px', marginTop: '0.5rem' }}>
        <button className="btn btn--secondary" onClick={() => setStep('qr')} style={{ flex: 1 }}>Back</button>
        <button className="btn btn--primary" onClick={confirmEnable} disabled={loading || totp.replace(/\s/g, '').length < 6} style={{ flex: 2, opacity: (loading || totp.replace(/\s/g, '').length < 6) ? 0.6 : 1 }}>
          {loading ? 'Verifying...' : 'Enable 2FA'}
        </button>
      </div>
    </div>
  );

  if (step === 'backup') return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
        <CheckCircle size={20} color="var(--color-success, #22c55e)" />
        <h3 style={{ ...stepTitle, marginBottom: 0, color: 'var(--color-success, #22c55e)' }}>2FA enabled!</h3>
      </div>
      <p style={stepDesc}>Save these backup codes somewhere safe. Each can only be used once.</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', margin: '1rem 0', background: 'var(--color-bg)', borderRadius: 8, padding: '12px' }}>
        {backupCodes.map((code, i) => (
          <div key={i} style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)', padding: '4px 8px', background: 'var(--color-surface)', borderRadius: 6, textAlign: 'center' }}>
            {code}
          </div>
        ))}
      </div>
      <div style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: '1rem' }}>
        <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: 0 }}>⚠️ These codes will not be shown again. Screenshot or write them down now.</p>
      </div>
      <button className="btn btn--primary" onClick={onEnabled} style={{ width: '100%' }}>Done — I've saved my codes</button>
    </div>
  );
};

// ── Disable 2FA ───────────────────────────────────────────────────────────
const Disable2FA = ({ onDisabled, onCancel }) => {
  const [password, setPassword] = useState('');
  const [totp, setTotp]         = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPwd, setShowPwd]   = useState(false);

  const handleDisable = async () => {
    if (!password) { toast.error('Enter your current password'); return; }
    if (totp.replace(/\s/g, '').length < 6) { toast.error('Enter your TOTP code'); return; }
    setLoading(true);
    try {
      await authAPI.disable2FA({ password, totp: totp.replace(/\s/g, '') });
      toast.success('2FA disabled');
      onDisabled();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to disable 2FA');
    } finally { setLoading(false); }
  };

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
        <AlertTriangle size={18} color="var(--color-danger, #ef4444)" />
        <h3 style={{ ...stepTitle, color: 'var(--color-danger, #ef4444)', marginBottom: 0 }}>Disable 2FA</h3>
      </div>
      <p style={stepDesc}>Confirm with your password and TOTP code.</p>
      <div className="form-group form-group--full" style={{ margin: '1rem 0 0.75rem' }}>
        <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-secondary)' }}>Current Password</label>
        <div className="password-input">
          <input className="form-input" type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Your account password" />
          <button type="button" className="pwd-eye" onClick={() => setShowPwd(s => !s)}>{showPwd ? <EyeOff size={16} /> : <Eye size={16} />}</button>
        </div>
      </div>
      <div className="form-group form-group--full" style={{ marginBottom: '1rem' }}>
        <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-secondary)' }}>Authenticator Code</label>
        <TOTPInput value={totp} onChange={setTotp} disabled={loading} autoFocus={false} />
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button className="btn btn--secondary" onClick={onCancel} style={{ flex: 1 }}>Cancel</button>
        <button onClick={handleDisable} disabled={loading} style={{ flex: 2, background: 'var(--color-danger, #ef4444)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', padding: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}>
          {loading ? 'Disabling...' : 'Disable 2FA'}
        </button>
      </div>
    </div>
  );
};

// ── Security Log ──────────────────────────────────────────────────────────
const SecurityLog = () => {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [page,    setPage]    = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [revoking, setRevoking] = useState(null);

  const fetchLogs = useCallback(async (p = 1, append = false) => {
    setLoading(true);
    try {
      const res  = await authAPI.getLoginHistory({ page: p, limit: 10 });
      const data = res.data || res;
      const newLogs = data.data || data;
      setLogs(prev => append ? [...prev, ...newLogs] : newLogs);
      setHasMore(data.pagination?.hasNext ?? false);
    } catch { toast.error('Failed to load security log'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchLogs(1); }, [fetchLogs]);

  const loadMore = () => { const next = page + 1; setPage(next); fetchLogs(next, true); };

  const revoke = async (logId) => {
    setRevoking(logId);
    try {
      await authAPI.revokeSession({ logId });
      toast.success('Session revoked');
      setLogs(prev => prev.map(l => l._id === logId ? { ...l, status: 'revoked' } : l));
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to revoke session'); }
    finally { setRevoking(null); }
  };

  const revokeAll = async () => {
    if (!window.confirm('This will sign you out on all devices. Continue?')) return;
    try { await authAPI.revokeAllSessions(); toast.success('All sessions revoked'); fetchLogs(1); }
    catch { toast.error('Failed to revoke all sessions'); }
  };

  const statusBadge = (status) => {
    const map = {
      success:      { bg: 'rgba(34,197,94,0.12)',  color: '#16a34a', label: 'Success' },
      failed:       { bg: 'rgba(239,68,68,0.12)',   color: '#dc2626', label: 'Failed' },
      '2fa_pending':{ bg: 'rgba(234,179,8,0.12)',  color: '#ca8a04', label: '2FA step' },
      revoked:      { bg: 'rgba(107,114,128,0.12)', color: '#6b7280', label: 'Revoked' },
    };
    const s = map[status] || map.revoked;
    return <span style={{ fontSize: '11px', fontWeight: 500, padding: '2px 8px', borderRadius: 99, background: s.bg, color: s.color }}>{s.label}</span>;
  };

  if (loading && logs.length === 0) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '14px' }}>Loading login history...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0 }}>Last 90 days of login activity</p>
        <button onClick={revokeAll} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--color-danger, #ef4444)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
          <LogOut size={14} /> Sign out all devices
        </button>
      </div>
      {logs.length === 0
        ? <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '14px', padding: '1.5rem 0' }}>No login history yet.</p>
        : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {logs.map(log => (
              <div key={log._id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--color-bg)', borderRadius: 8, border: '1px solid var(--color-border)', gap: '12px', opacity: log.status === 'revoked' ? 0.6 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1, minWidth: 0 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-surface)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {log.isMobile ? <PhoneIcon size={14} /> : <Monitor size={14} />}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.device || 'Unknown device'}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}><Globe size={11} />{log.city !== 'Unknown' ? `${log.city}, ${log.country}` : log.ip}</span>
                      <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={11} />{new Date(log.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  {statusBadge(log.status)}
                  {log.status === 'success' && (
                    <button onClick={() => revoke(log._id)} disabled={revoking === log._id} style={{ fontSize: '12px', color: 'var(--color-danger, #ef4444)', background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }} title="Not you? Revoke this session">
                      {revoking === log._id ? '...' : 'Not me'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      }
      {hasMore && (
        <button onClick={loadMore} disabled={loading} style={{ width: '100%', marginTop: '1rem', padding: '10px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 8, color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <RefreshCw size={14} /> {loading ? 'Loading...' : 'Load more'}
        </button>
      )}
    </div>
  );
};

// ── Delete Account Modal — DPDP Act 2023 ─────────────────────────────────
const DeleteAccountModal = ({ onClose, onDeleted }) => {
  const [step, setStep]             = useState(1); // 1 = warning, 2 = confirm fields
  const [password, setPassword]     = useState('');
  const [confirmPhrase, setConfirmPhrase] = useState('');
  const [showPwd, setShowPwd]       = useState(false);
  const [loading, setLoading]       = useState(false);

  const canDelete =
    password.length >= 6 &&
    confirmPhrase === 'DELETE MY ACCOUNT';

  const handleDelete = async () => {
    if (!canDelete) return;
    setLoading(true);
    try {
      await authAPI.deleteAccount({ password, confirmPhrase });
      toast.success('Account permanently deleted.');
      onDeleted();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete account. Check your password.');
      setLoading(false);
    }
  };

  return (
    // Backdrop
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: 'var(--color-surface)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 14, padding: '2rem', maxWidth: 440, width: '100%', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Trash2 size={18} color="#ef4444" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)' }}>Delete Account</h3>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-secondary)' }}>This action is permanent and irreversible</p>
          </div>
        </div>

        {step === 1 && (
          <>
            {/* What gets deleted */}
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '1rem', marginBottom: '1.25rem' }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#ef4444', margin: '0 0 8px' }}>The following will be permanently deleted:</p>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.8 }}>
                <li>All transactions and financial data</li>
                <li>Budgets, categories, and goals</li>
                <li>Groups, splits, and balances</li>
                <li>AI reports and blockchain audit trail</li>
                <li>API keys and usage logs</li>
                <li>Your account and login history</li>
              </ul>
            </div>

            <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: '1.25rem' }}>
              <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: 0 }}>
                🛡️ Compliant with India's <strong>Digital Personal Data Protection Act, 2023</strong>. A confirmation email will be sent to your registered address.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={onClose} style={{ flex: 1, padding: '10px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}>
                Cancel
              </button>
              <button onClick={() => setStep(2)} style={{ flex: 1, padding: '10px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', color: '#ef4444', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
                I understand, continue →
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            {/* Password field */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                Confirm your password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your current password"
                  style={{ width: '100%', padding: '10px 40px 10px 12px', background: 'var(--color-bg)', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                />
                <button type="button" onClick={() => setShowPwd(s => !s)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirmation phrase */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                Type <span style={{ fontFamily: 'monospace', color: '#ef4444', fontWeight: 700 }}>DELETE MY ACCOUNT</span> to confirm
              </label>
              <input
                type="text"
                value={confirmPhrase}
                onChange={e => setConfirmPhrase(e.target.value)}
                placeholder="DELETE MY ACCOUNT"
                style={{ width: '100%', padding: '10px 12px', background: 'var(--color-bg)', border: `1px solid ${confirmPhrase === 'DELETE MY ACCOUNT' ? '#ef4444' : 'var(--color-border-strong)'}`, borderRadius: 'var(--radius-md)', color: confirmPhrase === 'DELETE MY ACCOUNT' ? '#ef4444' : 'var(--color-text-primary)', fontSize: '14px', outline: 'none', fontFamily: 'monospace', boxSizing: 'border-box' }}
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setStep(1)} style={{ flex: 1, padding: '10px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}>
                Back
              </button>
              <button
                onClick={handleDelete}
                disabled={!canDelete || loading}
                style={{ flex: 2, padding: '10px', background: canDelete ? '#ef4444' : 'rgba(239,68,68,0.2)', border: 'none', borderRadius: 'var(--radius-md)', color: canDelete ? '#fff' : 'rgba(255,255,255,0.4)', cursor: canDelete ? 'pointer' : 'not-allowed', fontSize: '14px', fontWeight: 700, transition: 'all .15s' }}
              >
                {loading ? 'Deleting...' : '🗑️ Permanently Delete Account'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ── Shared style helpers ──────────────────────────────────────────────────
const card = {
  background: 'var(--color-bg)',
  border: '1px solid var(--color-border)',
  borderRadius: 10,
  padding: '1.25rem',
  marginTop: '1rem',
};
const stepTitle = { fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.5rem' };
const stepDesc  = { fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: '0.75rem' };
const cancelBtn = { display: 'block', width: '100%', marginTop: '0.75rem', padding: '8px', background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: '13px', textAlign: 'center' };

// ── Main Settings Component ────────────────────────────────────────────────
const Settings = () => {
  const { user, updateUser, logout } = useAuth();

  const [profile, setProfile] = useState({
    name:          user?.name          || '',
    phone:         user?.phone         || '',
    currency:      user?.currency      || 'INR',
    language:      user?.language      || 'en',
    timezone:      user?.timezone      || 'Asia/Kolkata',
    monthlyIncome: user?.monthlyIncome || '',
  });
  const [notifications, setNotifications] = useState({
    email:        user?.notifications?.email         ?? true,
    budgetAlerts: user?.notifications?.budgetAlerts  ?? true,
    weeklyReport: user?.notifications?.weeklyReport  ?? true,
    anomalyAlerts:user?.notifications?.anomalyAlerts ?? true,
  });
  const [smsTracking, setSmsTracking] = useState({
    enabled: user?.smsTracking?.enabled ?? false,
    phone:   user?.smsTracking?.phone   || '',
  });
  const [passwords, setPasswords]   = useState({ current: '', newPass: '', confirm: '' });
  const [showPwd,   setShowPwd]     = useState(false);
  const [saving,    setSaving]      = useState('');

  const [twoFAEnabled, setTwoFAEnabled] = useState(user?.twoFAEnabled ?? false);
  const [twoFAView,    setTwoFAView]    = useState(null);
  const [securityTab,  setSecurityTab]  = useState('password');

  // Danger zone state
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const saveProfile = async () => {
    setSaving('profile');
    try {
      const res = await authAPI.updateProfile({
        ...profile,
        monthlyIncome: parseFloat(profile.monthlyIncome) || 0,
        notifications,
        smsTracking,
      });
      updateUser(res.data.user);
      toast.success('Profile updated!');
    } catch (err) { toast.error(err.message || 'Failed to update profile'); }
    finally { setSaving(''); }
  };

  const changePassword = async () => {
    if (passwords.newPass !== passwords.confirm) { toast.error('New passwords do not match'); return; }
    if (passwords.newPass.length < 6)             { toast.error('Password must be at least 6 characters'); return; }
    setSaving('password');
    try {
      await authAPI.changePassword({ currentPassword: passwords.current, newPassword: passwords.newPass });
      toast.success('Password changed!');
      setPasswords({ current: '', newPass: '', confirm: '' });
    } catch (err) { toast.error(err.message || 'Failed to change password'); }
    finally { setSaving(''); }
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your account preferences</p>
      </div>

      <div className="settings-layout">

        {/* ── Profile ──────────────────────────────────────────────────── */}
        <div className="settings-card">
          <div className="settings-card__header"><User size={18} /><h2>Profile</h2></div>
          <div className="settings-avatar">
            <div className="avatar-circle">{user?.initials || user?.name?.slice(0, 2).toUpperCase() || 'U'}</div>
            <div>
              <div className="avatar-name">{user?.name}</div>
              <div className="avatar-email">{user?.email}</div>
              <div className="avatar-plan">{user?.plan} plan</div>
            </div>
          </div>
          <div className="form-grid">
            <div className="form-group"><label>Full Name</label><input className="form-input" value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} /></div>
            <div className="form-group"><label>Phone</label><input className="form-input" value={profile.phone} placeholder="+91 9876543210" onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} /></div>
            <div className="form-group"><label>Currency</label><select className="form-input" value={profile.currency} onChange={e => setProfile(p => ({ ...p, currency: e.target.value }))}>{CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}</select></div>
            <div className="form-group"><label>Monthly Income</label><input className="form-input" type="number" value={profile.monthlyIncome} onChange={e => setProfile(p => ({ ...p, monthlyIncome: e.target.value }))} placeholder="0" /></div>
            <div className="form-group"><label>Timezone</label><select className="form-input" value={profile.timezone} onChange={e => setProfile(p => ({ ...p, timezone: e.target.value }))}>{TIMEZONES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
          </div>
          <button className="btn btn--primary" onClick={saveProfile} disabled={saving === 'profile'}><Save size={16} />{saving === 'profile' ? 'Saving...' : 'Save Profile'}</button>
        </div>

        {/* ── Notifications ─────────────────────────────────────────────── */}
        <div className="settings-card">
          <div className="settings-card__header"><Bell size={18} /><h2>Notifications</h2></div>
          <div className="toggle-list">
            {[
              { key: 'email',        label: 'Email Notifications',  desc: 'Receive updates via email' },
              { key: 'budgetAlerts', label: 'Budget Alerts',         desc: 'Alert when nearing budget limit' },
              { key: 'weeklyReport', label: 'Weekly Report',         desc: 'Weekly spending summary' },
              { key: 'anomalyAlerts',label: 'Anomaly Alerts',        desc: 'Alert for unusual transactions' },
            ].map(({ key, label, desc }) => (
              <div key={key} className="toggle-item">
                <div className="toggle-item__info"><span className="toggle-item__label">{label}</span><span className="toggle-item__desc">{desc}</span></div>
                <button className={`toggle-btn ${notifications[key] ? 'toggle-btn--on' : ''}`} onClick={() => setNotifications(n => ({ ...n, [key]: !n[key] }))}><span className="toggle-knob" /></button>
              </div>
            ))}
          </div>
          <button className="btn btn--primary" onClick={saveProfile} disabled={saving === 'profile'}><Save size={16} /> Save Notifications</button>
        </div>

        {/* ── SMS Tracking ──────────────────────────────────────────────── */}
        <div className="settings-card">
          <div className="settings-card__header"><Smartphone size={18} /><h2>SMS Auto-tracking</h2></div>
          <p className="settings-desc">Automatically detect UPI and bank transactions from SMS messages.</p>
          <div className="toggle-item" style={{ marginBottom: 'var(--space-4)' }}>
            <div className="toggle-item__info"><span className="toggle-item__label">Enable SMS Tracking</span><span className="toggle-item__desc">Auto-create transactions from bank SMS</span></div>
            <button className={`toggle-btn ${smsTracking.enabled ? 'toggle-btn--on' : ''}`} onClick={() => setSmsTracking(s => ({ ...s, enabled: !s.enabled }))}><span className="toggle-knob" /></button>
          </div>
          {smsTracking.enabled && (
            <div className="form-group"><label>Phone Number (10 digits)</label><input className="form-input" value={smsTracking.phone} onChange={e => setSmsTracking(s => ({ ...s, phone: e.target.value }))} placeholder="9876543210" maxLength={10} /></div>
          )}
          <button className="btn btn--primary" onClick={saveProfile} disabled={saving === 'profile'}><Save size={16} /> Save SMS Settings</button>
        </div>

        {/* ── Two-Factor Auth ───────────────────────────────────────────── */}
        <div className="settings-card">
          <div className="settings-card__header"><Key size={18} /><h2>Two-Factor Authentication</h2></div>
          <div className="toggle-item" style={{ marginBottom: '1rem' }}>
            <div className="toggle-item__info">
              <span className="toggle-item__label">{twoFAEnabled ? '2FA is active' : '2FA is disabled'}</span>
              <span className="toggle-item__desc">{twoFAEnabled ? 'Your account requires an authenticator code at login.' : 'Add an extra layer of security with an authenticator app.'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 500, color: twoFAEnabled ? '#16a34a' : 'var(--color-text-secondary)' }}>
              {twoFAEnabled ? <><CheckCircle size={14} /> Enabled</> : <><AlertTriangle size={14} /> Disabled</>}
            </div>
          </div>
          {!twoFAEnabled && twoFAView === 'setup' && (
            <TwoFASetup user={user} onEnabled={() => { setTwoFAEnabled(true); setTwoFAView(null); updateUser({ twoFAEnabled: true }); }} onCancel={() => setTwoFAView(null)} />
          )}
          {twoFAEnabled && twoFAView === 'disable' && (
            <Disable2FA onDisabled={() => { setTwoFAEnabled(false); setTwoFAView(null); updateUser({ twoFAEnabled: false }); }} onCancel={() => setTwoFAView(null)} />
          )}
          {!twoFAView && (
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {!twoFAEnabled
                ? <button className="btn btn--primary" onClick={() => setTwoFAView('setup')}><Key size={15} /> Set Up 2FA</button>
                : <button className="btn btn--secondary" onClick={() => setTwoFAView('disable')} style={{ color: 'var(--color-danger, #ef4444)' }}>Disable 2FA</button>
              }
            </div>
          )}
        </div>

        {/* ── Security ──────────────────────────────────────────────────── */}
        <div className="settings-card">
          <div className="settings-card__header"><Shield size={18} /><h2>Security</h2></div>
          <div style={{ display: 'flex', gap: '4px', marginBottom: '1.25rem', background: 'var(--color-bg)', borderRadius: 8, padding: '4px' }}>
            {[{ id: 'password', label: 'Change Password', icon: <Shield size={13} /> }, { id: 'log', label: 'Login Activity', icon: <Clock size={13} /> }].map(tab => (
              <button key={tab.id} onClick={() => setSecurityTab(tab.id)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 500, transition: 'all .15s', background: securityTab === tab.id ? 'var(--color-surface)' : 'transparent', color: securityTab === tab.id ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', boxShadow: securityTab === tab.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
                {tab.icon}{tab.label}
              </button>
            ))}
          </div>
          {securityTab === 'password' && (
            <>
              <div className="form-grid">
                <div className="form-group form-group--full">
                  <label>Current Password</label>
                  <div className="password-input">
                    <input className="form-input" type={showPwd ? 'text' : 'password'} value={passwords.current} onChange={e => setPasswords(p => ({ ...p, current: e.target.value }))} placeholder="Enter current password" />
                    <button type="button" className="pwd-eye" onClick={() => setShowPwd(s => !s)}>{showPwd ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                  </div>
                </div>
                <div className="form-group"><label>New Password</label><input className="form-input" type="password" value={passwords.newPass} onChange={e => setPasswords(p => ({ ...p, newPass: e.target.value }))} placeholder="Min 6 characters" /></div>
                <div className="form-group"><label>Confirm Password</label><input className="form-input" type="password" value={passwords.confirm} onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))} placeholder="Repeat new password" /></div>
              </div>
              <button className="btn btn--primary" onClick={changePassword} disabled={saving === 'password' || !passwords.current}>
                <Shield size={16} />{saving === 'password' ? 'Changing...' : 'Change Password'}
              </button>
            </>
          )}
          {securityTab === 'log' && <SecurityLog />}
        </div>

        {/* ── Danger Zone — DPDP Act 2023 ───────────────────────────────── */}
        <div className="settings-card" style={{ border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.03)' }}>
          <div className="settings-card__header" style={{ color: '#ef4444' }}>
            <AlertTriangle size={18} color="#ef4444" />
            <h2 style={{ color: '#ef4444' }}>Danger Zone</h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 4px' }}>
                Delete my account and all data
              </p>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>
                Permanently erases all transactions, budgets, groups, and account data. This cannot be undone.
                Compliant with India's DPDP Act 2023.
              </p>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 'var(--radius-md)', color: '#ef4444', cursor: 'pointer', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              <Trash2 size={14} /> Delete Account
            </button>
          </div>
        </div>

      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <DeleteAccountModal
          onClose={() => setShowDeleteModal(false)}
          onDeleted={() => {
            setShowDeleteModal(false);
            // Log the user out locally — server session is already gone
            if (logout) logout();
          }}
        />
      )}
    </div>
  );
};

export default Settings;