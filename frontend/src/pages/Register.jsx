// frontend/src/pages/Register.jsx

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const CURRENCIES = [
  { value: 'INR', label: '₹ INR — Indian Rupee' },
  { value: 'USD', label: '$ USD — US Dollar' },
  { value: 'EUR', label: '€ EUR — Euro' },
  { value: 'GBP', label: '£ GBP — British Pound' },
  { value: 'AED', label: 'AED — UAE Dirham' },
];

const Register = () => {
  const navigate    = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({
    name: '', email: '', password: '',
    confirmPassword: '', currency: 'INR', monthlyIncome: '',
  });
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors]     = useState({});

  const validate = () => {
    const e = {};
    if (!form.name || form.name.length < 2)
      e.name = 'Name must be at least 2 characters';
    if (!form.email)
      e.email = 'Email is required';
    if (!form.password || form.password.length < 6)
      e.password = 'Password must be at least 6 characters';
    if (!/\d/.test(form.password))
      e.password = 'Password must contain at least one number';
    if (form.password !== form.confirmPassword)
      e.confirmPassword = 'Passwords do not match';
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
      await register(
        form.name,
        form.email,
        form.password,
        form.currency,
        form.monthlyIncome ? Number(form.monthlyIncome) : 0
      );
      toast.success('Welcome to SpendWise!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (field) => ({
    padding: '10px 14px',
    border: `1px solid ${errors[field] ? 'var(--color-danger)' : 'var(--color-border-strong)'}`,
    borderRadius: 'var(--radius-md)',
    fontSize: '14px',
    background: 'var(--color-surface)',
    color: 'var(--color-text-primary)',
    width: '100%',
    outline: 'none',
  });

  return (
    <div style={styles.page}>
      <div style={styles.card}>

        {/* Logo */}
        <div style={styles.logoWrap}>
          <div style={styles.logoIcon}>SW</div>
          <h1 style={styles.logoText}>SpendWise</h1>
        </div>

        <h2 style={styles.title}>Create your account</h2>
        <p style={styles.sub}>Start tracking smarter today</p>

        <form onSubmit={handleSubmit} style={styles.form}>

          {/* Name */}
          <div style={styles.field}>
            <label style={styles.label}>Full Name</label>
            <input name="name" type="text" value={form.name}
              onChange={handleChange} placeholder="Rahul Sharma"
              style={inputStyle('name')} />
            {errors.name && <span style={styles.error}>{errors.name}</span>}
          </div>

          {/* Email */}
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input name="email" type="email" value={form.email}
              onChange={handleChange} placeholder="rahul@example.com"
              style={inputStyle('email')} autoComplete="email" />
            {errors.email && <span style={styles.error}>{errors.email}</span>}
          </div>

          {/* Password */}
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <div style={{ position: 'relative' }}>
              <input name="password" type={showPass ? 'text' : 'password'}
                value={form.password} onChange={handleChange}
                placeholder="Min 6 chars, 1 number"
                style={{ ...inputStyle('password'), paddingRight: '44px' }} />
              <button type="button" onClick={() => setShowPass(p => !p)}
                style={styles.eyeBtn}>
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
            {errors.password && <span style={styles.error}>{errors.password}</span>}
          </div>

          {/* Confirm Password */}
          <div style={styles.field}>
            <label style={styles.label}>Confirm Password</label>
            <input name="confirmPassword" type="password"
              value={form.confirmPassword} onChange={handleChange}
              placeholder="••••••••"
              style={inputStyle('confirmPassword')} />
            {errors.confirmPassword && (
              <span style={styles.error}>{errors.confirmPassword}</span>
            )}
          </div>

          {/* Currency + Income — 2 col grid */}
          <div style={styles.twoCol}>
            <div style={styles.field}>
              <label style={styles.label}>Currency</label>
              <select name="currency" value={form.currency}
                onChange={handleChange}
                style={{ ...inputStyle('currency'), cursor: 'pointer' }}>
                {CURRENCIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Monthly Income (optional)</label>
              <input name="monthlyIncome" type="number"
                value={form.monthlyIncome} onChange={handleChange}
                placeholder="50000" min="0"
                style={inputStyle('monthlyIncome')} />
            </div>
          </div>

          {/* Submit */}
          <button type="submit" disabled={loading}
            style={{
              ...styles.btn,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}>
            {loading ? (
              <span style={styles.btnInner}>
                <span style={styles.spinner} /> Creating account...
              </span>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <p style={styles.switchText}>
          Already have an account?{' '}
          <Link to="/login" style={styles.link}>Sign in</Link>
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
    maxWidth: '480px',
    boxShadow: 'var(--shadow-md)',
  },
  logoWrap: {
    display: 'flex', alignItems: 'center',
    gap: '10px', marginBottom: '1.5rem', justifyContent: 'center',
  },
  logoIcon: {
    width: 40, height: 40,
    background: 'var(--color-primary)',
    borderRadius: 'var(--radius-md)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontWeight: 600, fontSize: '14px',
  },
  logoText: {
    fontSize: '22px', fontWeight: 600,
    color: 'var(--color-text-primary)',
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
  twoCol: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  label: {
    fontSize: '13px', fontWeight: 500,
    color: 'var(--color-text-secondary)',
  },
  eyeBtn: {
    position: 'absolute', right: '12px',
    top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none',
    cursor: 'pointer', fontSize: '16px', padding: 0,
  },
  error: { fontSize: '12px', color: 'var(--color-danger)' },
  btn: {
    padding: '12px',
    background: 'var(--color-primary)',
    color: '#fff', border: 'none',
    borderRadius: 'var(--radius-md)',
    fontSize: '15px', fontWeight: 500, marginTop: '0.5rem',
  },
  btnInner: {
    display: 'flex', alignItems: 'center',
    justifyContent: 'center', gap: '8px',
  },
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
  link: { color: 'var(--color-primary)', fontWeight: 500 },
};

export default Register;