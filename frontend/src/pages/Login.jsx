// frontend/src/pages/Login.jsx

import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Login = () => {
  const navigate  = useNavigate();
  const { login } = useAuth();

  // Use refs to read actual DOM values at submit time — bypasses autofill overwrite
  const emailRef    = useRef(null);
  const passwordRef = useRef(null);

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [errors,   setErrors]   = useState({});

  // Clear fields on mount so browser autofill from a previous session can't persist
  useEffect(() => {
    setEmail('');
    setPassword('');
    // Also clear the DOM value directly after a tick — some browsers fill after React renders
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

    // Read directly from DOM refs at submit time — guaranteed to be what user typed
    const finalEmail    = emailRef.current?.value?.trim()    || email.trim();
    const finalPassword = passwordRef.current?.value?.trim() || password.trim();

    if (!validate(finalEmail, finalPassword)) return;

    setLoading(true);
    try {
      await login(finalEmail, finalPassword);
      toast.success('Welcome back to SpendWise!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>

        {/* Logo */}
        <div style={styles.logoWrap}>
          <div style={styles.logoIcon}>SW</div>
          <h1 style={styles.logoText}>SpendWise</h1>
        </div>

        <h2 style={styles.title}>Welcome back</h2>
        <p style={styles.sub}>Sign in to your account</p>

        {/* autocomplete="off" on the form tells browsers not to autofill any field */}
        <form onSubmit={handleSubmit} style={styles.form} autoComplete="off">

          {/* Hidden dummy fields — trick browsers that ignore autoComplete="off" */}
          <input type="text"     style={{ display: 'none' }} readOnly tabIndex={-1} aria-hidden />
          <input type="password" style={{ display: 'none' }} readOnly tabIndex={-1} aria-hidden />

          {/* Email */}
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              ref={emailRef}
              name="username"          /* non-"email" name confuses autofill heuristics */
              type="email"
              value={email}
              onChange={e => {
                setEmail(e.target.value);
                if (errors.email) setErrors(p => ({ ...p, email: '' }));
              }}
              placeholder="you@example.com"
              style={{
                ...styles.input,
                borderColor: errors.email ? 'var(--color-danger)' : 'var(--color-border-strong)',
              }}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
            />
            {errors.email && <span style={styles.error}>{errors.email}</span>}
          </div>

          {/* Password */}
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <div style={styles.passWrap}>
              <input
                ref={passwordRef}
                name="pwd"               /* non-"password" name further confuses autofill */
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors(p => ({ ...p, password: '' }));
                }}
                placeholder="••••••••"
                style={{
                  ...styles.input,
                  paddingRight: '44px',
                  borderColor: errors.password ? 'var(--color-danger)' : 'var(--color-border-strong)',
                }}
                autoComplete="new-password"  /* "new-password" stops Chrome credential autofill */
              />
              <button
                type="button"
                onClick={() => setShowPass(p => !p)}
                style={styles.eyeBtn}
              >
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
            {errors.password && <span style={styles.error}>{errors.password}</span>}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.btn,
              opacity: loading ? 0.7 : 1,
              cursor:  loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? (
              <span style={styles.btnInner}>
                <span style={styles.spinner} /> Signing in...
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <p style={styles.switchText}>
          Don't have an account?{' '}
          <Link to="/register" style={styles.link}>Create one</Link>
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

const styles = {
  page: {
    minHeight: '100vh',
    background: 'var(--color-bg)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
  },
  card: {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-xl)',
    padding: '2.5rem',
    width: '100%',
    maxWidth: '420px',
    boxShadow: 'var(--shadow-md)',
  },
  logoWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '1.5rem',
    justifyContent: 'center',
  },
  logoIcon: {
    width: 40, height: 40,
    background: 'var(--color-primary)',
    borderRadius: 'var(--radius-md)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontWeight: 600, fontSize: '14px',
  },
  logoText: {
    fontSize: '22px', fontWeight: 600, color: 'var(--color-text-primary)',
  },
  title: {
    fontSize: '20px', fontWeight: 600,
    color: 'var(--color-text-primary)',
    textAlign: 'center', marginBottom: '4px',
  },
  sub: {
    fontSize: '14px', color: 'var(--color-text-secondary)',
    textAlign: 'center', marginBottom: '1.5rem',
  },
  form: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', fontWeight: 500, color: 'var(--color-text-secondary)' },
  input: {
    padding: '10px 14px',
    border: '1px solid',
    borderRadius: 'var(--radius-md)',
    fontSize: '14px',
    background: 'var(--color-surface)',
    color: 'var(--color-text-primary)',
    width: '100%', outline: 'none',
    transition: 'border-color 0.15s',
    boxSizing: 'border-box',
  },
  passWrap: { position: 'relative' },
  eyeBtn: {
    position: 'absolute', right: '12px', top: '50%',
    transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: '16px', padding: 0, lineHeight: 1,
  },
  error: { fontSize: '12px', color: 'var(--color-danger)' },
  btn: {
    padding: '12px',
    background: 'var(--color-primary)',
    color: '#fff', border: 'none',
    borderRadius: 'var(--radius-md)',
    fontSize: '15px', fontWeight: 500,
    marginTop: '0.5rem', transition: 'opacity 0.15s',
    width: '100%',
  },
  btnInner: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
  spinner: {
    display: 'inline-block', width: '16px', height: '16px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff', borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  switchText: {
    textAlign: 'center', fontSize: '13px',
    color: 'var(--color-text-secondary)', marginTop: '1.25rem',
  },
  link: { color: 'var(--color-primary)', fontWeight: 500, textDecoration: 'none' },
};

export default Login;