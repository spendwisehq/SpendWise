// frontend/src/pages/Login.jsx
// STAGE 2 UPDATE: Handles twoFARequired=true from backend.
// When 2FA is enabled, login returns a tempToken and we show a TOTP input screen.
// On success /2fa/verify returns full tokens → same AuthContext.login flow.

import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import authAPI from '../api/auth.api';
import toast from 'react-hot-toast';

// ── Tiny 6-box OTP input (reused from Register) ───────────────────────────
const TOTPInput = ({ value, onChange, disabled }) => {
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
    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', margin: '1.25rem 0' }}>
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
          autoFocus={i === 0}
          style={{
            width: 46, height: 54,
            textAlign: 'center',
            fontSize: '1.3rem', fontWeight: 700,
            background: digits[i] ? 'rgba(99,102,241,0.10)' : 'var(--color-surface)',
            border: `2px solid ${digits[i] ? 'var(--color-primary)' : 'var(--color-border-strong)'}`,
            borderRadius: 10,
            color: 'var(--color-text-primary)',
            outline: 'none',
            transition: 'all 0.15s',
            caretColor: 'transparent',
          }}
        />
      ))}
    </div>
  );
};

// ── 2FA screen shown after password is accepted ────────────────────────────
const TwoFAScreen = ({ tempToken, onSuccess, onBack }) => {
  const [totp,    setTotp]    = useState('');
  const [loading, setLoading] = useState(false);

  const verify = async () => {
    if (totp.replace(/\s/g, '').length < 6) {
      toast.error('Enter the 6-digit code from your authenticator app');
      return;
    }
    setLoading(true);
    try {
      const res = await authAPI.verify2FALogin({ tempToken, totp: totp.replace(/\s/g, '') });
      onSuccess(res.data ?? res);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid code. Try again.');
      setTotp('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.card}>
      <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔐</div>
        <h2 style={S.title}>Two-factor authentication</h2>
        <p style={S.sub}>Enter the 6-digit code from your authenticator app</p>
      </div>

      <TOTPInput value={totp} onChange={setTotp} disabled={loading} />

      <button
        onClick={verify}
        disabled={loading || totp.replace(/\s/g, '').length < 6}
        style={{
          ...S.btn,
          opacity: (loading || totp.replace(/\s/g, '').length < 6) ? 0.6 : 1,
          cursor:  (loading || totp.replace(/\s/g, '').length < 6) ? 'not-allowed' : 'pointer',
          width: '100%',
        }}
      >
        {loading
          ? <span style={S.btnInner}><span style={S.spinner} /> Verifying...</span>
          : 'Verify & Sign In'}
      </button>

      <p style={{ ...S.sub, fontSize: '12px', marginTop: '1rem', textAlign: 'center' }}>
        Lost your device? Use a backup code instead of the 6-digit code.
      </p>

      <button onClick={onBack} style={S.textBtn}>← Back to login</button>
    </div>
  );
};

// ── Main Login component ───────────────────────────────────────────────────
const Login = () => {
  const navigate  = useNavigate();
  const { login } = useAuth();

  const emailRef    = useRef(null);
  const passwordRef = useRef(null);

  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [loading,   setLoading]   = useState(false);
  const [showPass,  setShowPass]  = useState(false);
  const [errors,    setErrors]    = useState({});

  // 2FA state
  const [twoFAStep,  setTwoFAStep]  = useState(false);
  const [tempToken,  setTempToken]  = useState(null);

  useEffect(() => {
    setEmail(''); setPassword('');
    const t = setTimeout(() => {
      if (emailRef.current)    emailRef.current.value    = '';
      if (passwordRef.current) passwordRef.current.value = '';
    }, 50);
    return () => clearTimeout(t);
  }, []);

  const validate = (em, pw) => {
    const e = {};
    if (!em) e.email    = 'Email is required';
    if (!pw) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const finalEmail    = emailRef.current?.value?.trim()    || email.trim();
    const finalPassword = passwordRef.current?.value?.trim() || password.trim();
    if (!validate(finalEmail, finalPassword)) return;

    setLoading(true);
    try {
      const res = await authAPI.login({ email: finalEmail, password: finalPassword });

      // ── 2FA gate ─────────────────────────────────────────────────────────
      if (res.twoFARequired) {
        setTempToken(res.data?.tempToken);
        setTwoFAStep(true);
        return;
      }
      // ─────────────────────────────────────────────────────────────────────

      // Normal login — res.data contains { user, accessToken, refreshToken }
      const payload = res.data ?? res;
      await login(payload.user?.email || finalEmail, finalPassword);
      toast.success('Welcome back to SpendWise!');
      navigate('/dashboard');
      const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  try {
    const res  = await api.post('/auth/login', { email, password });
    const data = res.data?.data ?? res.data;
 
    if (res.data?.twoFARequired) {
      // Existing 2FA flow — keep as-is
      setTempToken(data.tempToken);
      setStep('2fa');
      return;
    }
 
    // ✅ NEW: Normal login success
    authLogin(data);
    toast.success('Welcome back! 👋');
    navigate('/dashboard', { replace: true });
 
  } catch (err) {
    const resData = err.response?.data;
 
    // ✅ NEW: Account exists but email not verified
    // Backend returns 403 with emailUnverified: true and sends a fresh OTP
    if (resData?.emailUnverified) {
      toast('Please verify your email first. A new OTP was sent.', { icon: '📧' });
      navigate('/register', {
        state: {
          pendingEmail: resData.data?.email || email,
          showOTP:      true,
        },
      });
      return;
    }
 
    toast.error(resData?.message || resData?.error || 'Login failed. Check your credentials.');
  } finally {
    setLoading(false);
  }
};
    } finally {
      setLoading(false);
    }
  };

  // Called after 2FA is verified — payload has { user, accessToken, refreshToken }
  const handle2FASuccess = async (payload) => {
    try {
      localStorage.setItem('spendwise_token',  payload.accessToken);
      localStorage.setItem('spendwise_user',   JSON.stringify(payload.user));
      // Trigger AuthContext state update via a lightweight re-fetch approach
      window.dispatchEvent(new Event('spendwise:auth'));
      toast.success('Welcome back to SpendWise!');
      navigate('/dashboard');
    } catch {
      toast.error('Something went wrong. Please try again.');
    }
  };

  // ── Render 2FA step ──────────────────────────────────────────────────────
  if (twoFAStep) {
    return (
      <div style={S.page}>
        <TwoFAScreen
          tempToken={tempToken}
          onSuccess={handle2FASuccess}
          onBack={() => { setTwoFAStep(false); setTempToken(null); }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Render normal login ──────────────────────────────────────────────────
  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.logoWrap}>
          <div style={S.logoIcon}>SW</div>
          <h1 style={S.logoText}>SpendWise</h1>
        </div>

        <h2 style={S.title}>Welcome back</h2>
        <p style={S.sub}>Sign in to your account</p>

        <form onSubmit={handleSubmit} style={S.form} autoComplete="off">
          <input type="text"     style={{ display: 'none' }} readOnly tabIndex={-1} aria-hidden />
          <input type="password" style={{ display: 'none' }} readOnly tabIndex={-1} aria-hidden />

          <div style={S.field}>
            <label style={S.label}>Email</label>
            <input
              ref={emailRef}
              name="username" type="email" value={email}
              onChange={e => { setEmail(e.target.value); if (errors.email) setErrors(p => ({ ...p, email: '' })); }}
              placeholder="you@example.com"
              style={{ ...S.input, borderColor: errors.email ? 'var(--color-danger)' : 'var(--color-border-strong)' }}
              autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false"
            />
            {errors.email && <span style={S.error}>{errors.email}</span>}
          </div>

          <div style={S.field}>
            <label style={S.label}>Password</label>
            <div style={S.passWrap}>
              <input
                ref={passwordRef}
                name="pwd" type={showPass ? 'text' : 'password'} value={password}
                onChange={e => { setPassword(e.target.value); if (errors.password) setErrors(p => ({ ...p, password: '' })); }}
                placeholder="••••••••"
                style={{ ...S.input, paddingRight: '44px', borderColor: errors.password ? 'var(--color-danger)' : 'var(--color-border-strong)' }}
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowPass(p => !p)} style={S.eyeBtn}>
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
            {errors.password && <span style={S.error}>{errors.password}</span>}
          </div>

          <button type="submit" disabled={loading}
            style={{ ...S.btn, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading
              ? <span style={S.btnInner}><span style={S.spinner} /> Signing in...</span>
              : 'Sign In'}
          </button>
        </form>

        <p style={S.switchText}>
          Don't have an account?{' '}
          <Link to="/register" style={S.link}>Create one</Link>
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

const S = {
  page:     { minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' },
  card:     { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: '2.5rem', width: '100%', maxWidth: '420px', boxShadow: 'var(--shadow-md)' },
  logoWrap: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem', justifyContent: 'center' },
  logoIcon: { width: 40, height: 40, background: 'var(--color-primary)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 600, fontSize: '14px' },
  logoText: { fontSize: '22px', fontWeight: 600, color: 'var(--color-text-primary)' },
  title:    { fontSize: '20px', fontWeight: 600, color: 'var(--color-text-primary)', textAlign: 'center', marginBottom: '4px' },
  sub:      { fontSize: '14px', color: 'var(--color-text-secondary)', textAlign: 'center', marginBottom: '1.5rem' },
  form:     { display: 'flex', flexDirection: 'column', gap: '1rem' },
  field:    { display: 'flex', flexDirection: 'column', gap: '6px' },
  label:    { fontSize: '13px', fontWeight: 500, color: 'var(--color-text-secondary)' },
  input:    { padding: '10px 14px', border: '1px solid', borderRadius: 'var(--radius-md)', fontSize: '14px', background: 'var(--color-surface)', color: 'var(--color-text-primary)', width: '100%', outline: 'none', transition: 'border-color 0.15s', boxSizing: 'border-box' },
  passWrap: { position: 'relative' },
  eyeBtn:   { position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', padding: 0, lineHeight: 1 },
  error:    { fontSize: '12px', color: 'var(--color-danger)' },
  btn:      { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontSize: '15px', fontWeight: 500, marginTop: '0.5rem', width: '100%' },
  btnInner: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
  spinner:  { display: 'inline-block', width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  textBtn:  { display: 'block', width: '100%', marginTop: '0.75rem', padding: '8px', background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: '13px', textAlign: 'center' },
  switchText:{ textAlign: 'center', fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '1.25rem' },
  link:     { color: 'var(--color-primary)', fontWeight: 500, textDecoration: 'none' },
};

export default Login;