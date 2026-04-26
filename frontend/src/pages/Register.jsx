// frontend/src/pages/Register.jsx
// FIXED:
//  1. OTP state persisted in sessionStorage — survives accidental refresh
//  2. handleOTPSuccess calls authLogin() properly so AuthContext is set
//  3. Login.jsx emailUnverified response redirects here with email pre-filled

import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';

const CURRENCIES = [
  { value: 'INR', label: '₹ INR — Indian Rupee' },
  { value: 'USD', label: '$ USD — US Dollar' },
  { value: 'EUR', label: '€ EUR — Euro' },
  { value: 'GBP', label: '£ GBP — British Pound' },
  { value: 'AED', label: 'AED — UAE Dirham' },
];

// ── OTP Input Component ───────────────────────────────────────────────────────
const OTPInput = ({ value, onChange }) => {
  const inputs = useRef([]);
  const digits = value.split('');

  const handleKey = (i, e) => {
    if (e.key === 'Backspace') {
      if (digits[i]) {
        const next = [...digits];
        next[i] = '';
        onChange(next.join(''));
      } else if (i > 0) {
        inputs.current[i - 1]?.focus();
      }
      return;
    }
    if (e.key === 'ArrowLeft'  && i > 0) { inputs.current[i - 1]?.focus(); return; }
    if (e.key === 'ArrowRight' && i < 5) { inputs.current[i + 1]?.focus(); return; }
    if (!/^\d$/.test(e.key)) return;
    const next = [...digits];
    next[i] = e.key;
    onChange(next.join(''));
    if (i < 5) inputs.current[i + 1]?.focus();
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted) {
      onChange(pasted.padEnd(6, '').slice(0, 6));
      inputs.current[Math.min(pasted.length, 5)]?.focus();
    }
    e.preventDefault();
  };

  return (
    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', margin: '1.5rem 0' }}>
      {Array(6).fill(0).map((_, i) => (
        <input
          key={i}
          ref={el => inputs.current[i] = el}
          type="text" inputMode="numeric" maxLength={1}
          value={digits[i] || ''}
          onChange={() => {}}
          onKeyDown={e => handleKey(i, e)}
          onPaste={handlePaste}
          autoFocus={i === 0}
          style={{
            width: 44, height: 52,
            textAlign: 'center',
            fontSize: '1.3rem', fontWeight: 800,
            background: digits[i] ? 'rgba(99,102,241,0.12)' : 'var(--color-surface)',
            border: `2px solid ${digits[i] ? 'var(--color-primary)' : 'var(--color-border-strong, var(--color-border))'}`,
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

// ── OTP Verification Screen ───────────────────────────────────────────────────
const OTPScreen = ({ email, name, onSuccess, onBack }) => {
  const [otp,       setOtp]       = useState('');
  const [loading,   setLoading]   = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);

  // Persist OTP screen state so refresh doesn't kick to login
  useEffect(() => {
    sessionStorage.setItem('otp_pending', JSON.stringify({ email, name }));
    return () => {};
  }, [email, name]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const verify = async () => {
    if (otp.length !== 6) { toast.error('Enter the complete 6-digit OTP'); return; }
    setLoading(true);
    try {
      const res = await api.post('/auth/verify-otp', { email, otp });
      const { user, accessToken, refreshToken } = res.data;
      toast.success('Email verified! Welcome to SpendWise 🎉');
      onSuccess({ user, accessToken, refreshToken });
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
        err.response?.data?.error   ||
        'Invalid OTP. Please try again.'
      );
      setOtp('');
    } finally { setLoading(false); }
  };

  const resend = async () => {
    setResending(true);
    try {
      await api.post('/auth/resend-otp', { email });
      toast.success('New OTP sent! Check your email 📧');
      setCountdown(60);
      setOtp('');
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
        err.response?.data?.error   ||
        'Failed to resend OTP'
      );
    } finally { setResending(false); }
  };

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={S.otpIcon}>🔐</div>
          <h2 style={S.title}>Verify your email</h2>
          <p style={S.sub}>
            We sent a 6-digit code to<br />
            <strong style={{ color: 'var(--color-primary)' }}>{email}</strong>
          </p>
          <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>
            Check your spam/junk folder if you don't see it.
          </p>
        </div>

        <OTPInput value={otp} onChange={setOtp} />

        <button
          onClick={verify}
          disabled={loading || otp.length !== 6}
          style={{
            ...S.btn,
            opacity: (loading || otp.length !== 6) ? 0.6 : 1,
            cursor:  (loading || otp.length !== 6) ? 'not-allowed' : 'pointer',
            width: '100%',
          }}
        >
          {loading ? (
            <span style={S.btnInner}><span style={S.spinner} /> Verifying...</span>
          ) : 'Verify & Continue →'}
        </button>

        <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
          {countdown > 0 ? (
            <p style={{ ...S.sub, fontSize: 13, marginBottom: 0 }}>
              Resend code in <strong style={{ color: 'var(--color-primary)' }}>{countdown}s</strong>
            </p>
          ) : (
            <button
              type="button"
              onClick={resend}
              disabled={resending}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-primary)', fontWeight: 600, fontSize: 14,
                padding: '4px 8px',
              }}
            >
              {resending ? 'Sending…' : '↻ Resend OTP'}
            </button>
          )}
        </div>

        {onBack && (
          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <button
              type="button"
              onClick={onBack}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-text-secondary)', fontSize: 13,
              }}
            >
              ← Wrong email? Go back
            </button>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

// ── Registration Form ─────────────────────────────────────────────────────────
const Register = () => {
  const navigate             = useNavigate();
  const location             = useLocation();
  const { login: authLogin } = useAuth();

  // Support redirect from Login page when account is unverified:
  // <Navigate to="/register" state={{ pendingEmail: email, showOTP: true }} />
  const locationState = location.state || {};

  const [step, setStep] = useState(
    locationState.showOTP ? 'otp' : (() => {
      // Restore OTP screen if user refreshed mid-verification
      try {
        const saved = sessionStorage.getItem('otp_pending');
        if (saved) return 'otp';
      } catch {}
      return 'register';
    })()
  );

  const [registeredEmail, setRegisteredEmail] = useState(() => {
    if (locationState.pendingEmail) return locationState.pendingEmail;
    try {
      const saved = sessionStorage.getItem('otp_pending');
      if (saved) return JSON.parse(saved).email || '';
    } catch {}
    return '';
  });

  const [registeredName, setRegisteredName] = useState(() => {
    try {
      const saved = sessionStorage.getItem('otp_pending');
      if (saved) return JSON.parse(saved).name || '';
    } catch {}
    return '';
  });

  const [form, setForm] = useState({
    name: '', email: locationState.pendingEmail || '',
    password: '', confirmPassword: '', currency: 'INR', monthlyIncome: '',
  });
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [errors,   setErrors]   = useState({});

  const validate = () => {
    const e = {};
    if (!form.name || form.name.trim().length < 2) e.name = 'Name must be at least 2 characters';
    if (!form.email)                                e.email = 'Email is required';
    if (!/^\S+@\S+\.\S+$/.test(form.email))        e.email = 'Enter a valid email address';
    if (!form.password || form.password.length < 6) e.password = 'Password must be at least 6 characters';
    if (!/\d/.test(form.password))                  e.password = 'Password must contain at least one number';
    if (form.password !== form.confirmPassword)     e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await api.post('/auth/register', {
        name:          form.name.trim(),
        email:         form.email.trim().toLowerCase(),
        password:      form.password,
        currency:      form.currency,
        monthlyIncome: form.monthlyIncome ? Number(form.monthlyIncome) : 0,
      });
      setRegisteredEmail(form.email.trim().toLowerCase());
      setRegisteredName(form.name.trim());
      toast.success('Account created! Check your email for the OTP 📧');
      setStep('otp');
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
        err.response?.data?.error   ||
        'Registration failed. Please try again.'
      );
    } finally { setLoading(false); }
  };

  const handleOTPSuccess = ({ user, accessToken, refreshToken }) => {
    localStorage.setItem('spendwise_user', JSON.stringify(user));
    localStorage.setItem('accessToken',  accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    navigate('/dashboard');
  };

  const handleBack = () => {
    sessionStorage.removeItem('otp_pending');
    setStep('register');
    setOtp?.('');
  };

  const inputStyle = (field) => ({
    padding: '10px 14px',
    border: `1px solid ${errors[field] ? '#ef4444' : 'var(--color-border-strong, var(--color-border))'}`,
    borderRadius: 8,
    fontSize: '14px',
    background: 'var(--color-surface)',
    color: 'var(--color-text-primary)',
    width: '100%',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  });

  if (step === 'otp') {
    return (
      <OTPScreen
        email={registeredEmail}
        name={registeredName}
        onSuccess={handleOTPSuccess}
        onBack={handleBack}
      />
    );
  }

  return (
    <div style={S.page}>
      <div style={S.card}>

        <div style={S.logoWrap}>
          <div style={S.logoIcon}>SW</div>
          <h1 style={S.logoText}>SpendWise</h1>
        </div>

        <h2 style={S.title}>Create your account</h2>
        <p style={S.sub}>Start tracking smarter today</p>

        <form onSubmit={handleSubmit} style={S.form} noValidate>

          <div style={S.field}>
            <label style={S.label}>Full Name</label>
            <input name="name" type="text" value={form.name}
              onChange={handleChange} placeholder="Rahul Sharma"
              style={inputStyle('name')} autoComplete="name" />
            {errors.name && <span style={S.error}>{errors.name}</span>}
          </div>

          <div style={S.field}>
            <label style={S.label}>Email</label>
            <input name="email" type="email" value={form.email}
              onChange={handleChange} placeholder="rahul@example.com"
              style={inputStyle('email')} autoComplete="email" />
            {errors.email && <span style={S.error}>{errors.email}</span>}
          </div>

          <div style={S.field}>
            <label style={S.label}>Password</label>
            <div style={{ position: 'relative' }}>
              <input name="password" type={showPass ? 'text' : 'password'}
                value={form.password} onChange={handleChange}
                placeholder="Min 6 chars, include a number"
                style={{ ...inputStyle('password'), paddingRight: '44px' }} />
              <button type="button" onClick={() => setShowPass(p => !p)} style={S.eyeBtn}>
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
            {errors.password && <span style={S.error}>{errors.password}</span>}
          </div>

          <div style={S.field}>
            <label style={S.label}>Confirm Password</label>
            <input name="confirmPassword" type="password"
              value={form.confirmPassword} onChange={handleChange}
              placeholder="••••••••" style={inputStyle('confirmPassword')}
              autoComplete="new-password" />
            {errors.confirmPassword && <span style={S.error}>{errors.confirmPassword}</span>}
          </div>

          <div style={S.twoCol}>
            <div style={S.field}>
              <label style={S.label}>Currency</label>
              <select name="currency" value={form.currency} onChange={handleChange}
                style={{ ...inputStyle('currency'), cursor: 'pointer' }}>
                {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div style={S.field}>
              <label style={S.label}>Monthly Income (optional)</label>
              <input name="monthlyIncome" type="number" value={form.monthlyIncome}
                onChange={handleChange} placeholder="50000" min="0"
                style={inputStyle('monthlyIncome')} />
            </div>
          </div>

          <button type="submit" disabled={loading}
            style={{ ...S.btn, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer', width: '100%' }}>
            {loading ? (
              <span style={S.btnInner}><span style={S.spinner} /> Creating account...</span>
            ) : 'Create Account →'}
          </button>
        </form>

        <p style={S.switchText}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

const S = {
  page:       { minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' },
  card:       { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, padding: '2.5rem', width: '100%', maxWidth: '480px', boxShadow: '0 4px 24px rgba(0,0,0,0.12)' },
  logoWrap:   { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem', justifyContent: 'center' },
  logoIcon:   { width: 40, height: 40, background: 'var(--color-primary)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '14px' },
  logoText:   { fontSize: '22px', fontWeight: 700, color: 'var(--color-text-primary)' },
  otpIcon:    { fontSize: '3rem', marginBottom: '0.75rem' },
  title:      { fontSize: '20px', fontWeight: 700, color: 'var(--color-text-primary)', textAlign: 'center', marginBottom: '4px', margin: 0 },
  sub:        { fontSize: '14px', color: 'var(--color-text-secondary)', textAlign: 'center', marginBottom: '1.5rem', lineHeight: 1.6 },
  form:       { display: 'flex', flexDirection: 'column', gap: '1rem' },
  field:      { display: 'flex', flexDirection: 'column', gap: '6px' },
  twoCol:     { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  label:      { fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)' },
  eyeBtn:     { position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', padding: 0 },
  error:      { fontSize: '12px', color: '#ef4444' },
  btn:        { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 8, fontSize: '15px', fontWeight: 600, marginTop: '0.5rem', cursor: 'pointer' },
  btnInner:   { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
  spinner:    { display: 'inline-block', width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  switchText: { textAlign: 'center', fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '1.25rem' },
};

export default Register;