// frontend/src/pages/Register.jsx

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import authAPI from '../api/auth.api';
import toast from 'react-hot-toast';

const CURRENCIES = [
  { value: 'INR', label: '₹ INR — Indian Rupee' },
  { value: 'USD', label: '$ USD — US Dollar' },
  { value: 'EUR', label: '€ EUR — Euro' },
  { value: 'GBP', label: '£ GBP — British Pound' },
  { value: 'AED', label: 'AED — UAE Dirham' },
];

// ── OTP Input Component ───────────────────────────────────────────────────────
const OTPInput = ({ otp, setOtp }) => {
  const refs = Array(6).fill(0).map(() => React.createRef());

  const handleChange = (i, val) => {
    if (!/^\d*$/.test(val)) return;
    const newOtp = otp.split('');
    newOtp[i] = val.slice(-1);
    setOtp(newOtp.join(''));
    if (val && i < 5) refs[i + 1].current?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) refs[i - 1].current?.focus();
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    setOtp(pasted.padEnd(6, ''));
    refs[Math.min(pasted.length, 5)].current?.focus();
  };

  return (
    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', margin: '20px 0' }}>
      {Array(6).fill(0).map((_, i) => (
        <input key={i} ref={refs[i]}
          type="text" inputMode="numeric" maxLength={1}
          value={otp[i] || ''}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
          style={{
            width: 44, height: 52,
            textAlign: 'center',
            fontSize: 22, fontWeight: 700,
            border: `2px solid ${otp[i] ? 'var(--color-primary)' : 'var(--color-border-strong)'}`,
            borderRadius: 10,
            background: 'var(--color-surface)',
            color: 'var(--color-text-primary)',
            outline: 'none',
            transition: 'border-color 0.15s',
          }}
        />
      ))}
    </div>
  );
};

// ── Main Register Component ───────────────────────────────────────────────────
const Register = () => {
  const navigate     = useNavigate();
  const { login }    = useAuth();

  // Step 1 = registration form, Step 2 = OTP verification
  const [step,    setStep]    = useState(1);
  const [form,    setForm]    = useState({ name:'', email:'', password:'', confirmPassword:'', currency:'INR' });
  const [otp,     setOtp]     = useState('');
  const [loading, setLoading] = useState(false);
  const [errors,  setErrors]  = useState({});
  const [showPass,setShowPass]= useState(false);
  const [devOtp,  setDevOtp]  = useState(null); // Dev mode OTP display
  const [resendCountdown, setResendCountdown] = useState(0);

  const validate = () => {
    const e = {};
    if (!form.name || form.name.length < 2) e.name = 'Name must be at least 2 characters';
    if (!form.email || !/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email address';
    if (!form.password || form.password.length < 6) e.password = 'Password must be at least 6 characters';
    if (!/\d/.test(form.password)) e.password = 'Password must contain at least one number';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    if (errors[name]) setErrors(p => ({ ...p, [name]: '' }));
  };

  // Step 1: Submit registration → sends OTP
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await authAPI.register({ name: form.name, email: form.email, password: form.password, currency: form.currency });
      if (res?.devMode) {
        setDevOtp(res.otp);
        toast.success('Dev mode: OTP shown below');
      } else {
        toast.success(`Verification code sent to ${form.email}`);
      }
      setStep(2);
      startResendCountdown();
    } catch (err) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerify = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) { toast.error('Enter the 6-digit code'); return; }
    setLoading(true);
    try {
      const res = await authAPI.verifyOTP({ email: form.email, otp });
      const { user } = res;
      // Token is set as httpOnly cookie by backend
      localStorage.setItem('spendwise_user', JSON.stringify(user));
      toast.success('Email verified! Welcome to SpendWise');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Invalid verification code');
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCountdown > 0) return;
    try {
      await authAPI.resendOTP({ email: form.email });
      toast.success('New code sent!');
      startResendCountdown();
    } catch (err) {
      toast.error(err.message || 'Failed to resend');
    }
  };

  const startResendCountdown = () => {
    setResendCountdown(30);
    const interval = setInterval(() => {
      setResendCountdown(c => { if (c <= 1) { clearInterval(interval); return 0; } return c - 1; });
    }, 1000);
  };

  const inp = (field) => ({
    padding: '10px 14px',
    border: `1.5px solid ${errors[field] ? 'var(--color-danger)' : 'var(--color-border-strong)'}`,
    borderRadius: 8, fontSize: 14,
    background: 'var(--color-surface-2)',
    color: 'var(--color-text-primary)',
    width: '100%', outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  });

  return (
    <div style={{ minHeight:'100vh', background:'var(--color-bg)', display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
      <div style={{ background:'var(--color-surface)', border:'1px solid var(--color-border)', borderRadius:16, padding:'2.5rem', width:'100%', maxWidth: step === 2 ? 400 : 480, boxShadow:'var(--shadow-md)' }}>

        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:24, justifyContent:'center' }}>
          <div style={{ width:36,height:36, background:'var(--color-primary)', borderRadius:9, display:'flex',alignItems:'center',justifyContent:'center', color:'#fff',fontWeight:700,fontSize:13 }}>SW</div>
          <span style={{ fontSize:20,fontWeight:700,color:'var(--color-text-primary)' }}>SpendWise</span>
        </div>

        {/* ── STEP 1: Registration Form ── */}
        {step === 1 && (
          <>
            <h2 style={{ fontSize:20,fontWeight:700,color:'var(--color-text-primary)',textAlign:'center',margin:'0 0 4px' }}>Create your account</h2>
            <p style={{ fontSize:13,color:'var(--color-text-muted)',textAlign:'center',margin:'0 0 24px' }}>Start tracking your finances smarter</p>

            <form onSubmit={handleRegister} style={{ display:'flex',flexDirection:'column',gap:14 }}>
              {/* Name */}
              <div>
                <label style={{ display:'block',fontSize:12,fontWeight:600,color:'var(--color-text-secondary)',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.4px' }}>Full Name</label>
                <input name="name" type="text" value={form.name} onChange={handleChange} placeholder="Rahul Sharma" style={inp('name')} />
                {errors.name && <span style={{ fontSize:11,color:'var(--color-danger)',marginTop:3,display:'block' }}>{errors.name}</span>}
              </div>

              {/* Email */}
              <div>
                <label style={{ display:'block',fontSize:12,fontWeight:600,color:'var(--color-text-secondary)',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.4px' }}>Email Address</label>
                <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="rahul@gmail.com" style={inp('email')} autoComplete="email" />
                {errors.email && <span style={{ fontSize:11,color:'var(--color-danger)',marginTop:3,display:'block' }}>{errors.email}</span>}
                <span style={{ fontSize:11,color:'var(--color-text-muted)',marginTop:3,display:'block' }}>A verification code will be sent to this email</span>
              </div>

              {/* Password */}
              <div>
                <label style={{ display:'block',fontSize:12,fontWeight:600,color:'var(--color-text-secondary)',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.4px' }}>Password</label>
                <div style={{ position:'relative' }}>
                  <input name="password" type={showPass?'text':'password'} value={form.password} onChange={handleChange} placeholder="Min 6 chars with a number" style={{ ...inp('password'),paddingRight:44 }} />
                  <button type="button" onClick={() => setShowPass(p=>!p)} style={{ position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',fontSize:15,color:'var(--color-text-muted)' }}>
                    {showPass ? '🙈' : '👁️'}
                  </button>
                </div>
                {errors.password && <span style={{ fontSize:11,color:'var(--color-danger)',marginTop:3,display:'block' }}>{errors.password}</span>}
              </div>

              {/* Confirm Password */}
              <div>
                <label style={{ display:'block',fontSize:12,fontWeight:600,color:'var(--color-text-secondary)',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.4px' }}>Confirm Password</label>
                <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} placeholder="••••••••" style={inp('confirmPassword')} />
                {errors.confirmPassword && <span style={{ fontSize:11,color:'var(--color-danger)',marginTop:3,display:'block' }}>{errors.confirmPassword}</span>}
              </div>

              {/* Currency */}
              <div>
                <label style={{ display:'block',fontSize:12,fontWeight:600,color:'var(--color-text-secondary)',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.4px' }}>Currency</label>
                <select name="currency" value={form.currency} onChange={handleChange} style={{ ...inp('currency'),cursor:'pointer',height:40 }}>
                  {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>

              <button type="submit" disabled={loading} style={{ padding:'12px',background:'var(--color-primary)',color:'#fff',border:'none',borderRadius:9,fontSize:14,fontWeight:600,cursor:loading?'not-allowed':'pointer',opacity:loading?0.7:1,marginTop:4,display:'flex',alignItems:'center',justifyContent:'center',gap:8,fontFamily:'inherit' }}>
                {loading ? <><span style={{ width:16,height:16,border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin 0.8s linear infinite',display:'inline-block' }} /> Sending code...</> : 'Create Account →'}
              </button>
            </form>

            <p style={{ textAlign:'center',fontSize:13,color:'var(--color-text-muted)',marginTop:20 }}>
              Already have an account? <Link to="/login" style={{ color:'var(--color-primary)',fontWeight:600 }}>Sign in</Link>
            </p>
          </>
        )}

        {/* ── STEP 2: OTP Verification ── */}
        {step === 2 && (
          <>
            <div style={{ textAlign:'center',marginBottom:16 }}>
              <div style={{ fontSize:40,marginBottom:12 }}>📧</div>
              <h2 style={{ fontSize:20,fontWeight:700,color:'var(--color-text-primary)',margin:'0 0 6px' }}>Verify your email</h2>
              <p style={{ fontSize:13,color:'var(--color-text-muted)',margin:0 }}>
                We sent a 6-digit code to<br/>
                <strong style={{ color:'var(--color-text-primary)' }}>{form.email}</strong>
              </p>
            </div>

            {/* Dev mode OTP display */}
            {devOtp && (
              <div style={{ background:'rgba(99,102,241,0.1)',border:'1px solid var(--color-primary)',borderRadius:8,padding:'10px 14px',marginBottom:12,textAlign:'center' }}>
                <span style={{ fontSize:12,color:'var(--color-primary)',fontWeight:600 }}>Dev Mode — Your OTP: </span>
                <span style={{ fontSize:18,fontWeight:800,color:'var(--color-primary)',letterSpacing:4 }}>{devOtp}</span>
              </div>
            )}

            <form onSubmit={handleVerify}>
              <OTPInput otp={otp} setOtp={setOtp} />

              <button type="submit" disabled={loading || otp.length !== 6} style={{ width:'100%',padding:'12px',background:'var(--color-primary)',color:'#fff',border:'none',borderRadius:9,fontSize:14,fontWeight:600,cursor:(loading||otp.length!==6)?'not-allowed':'pointer',opacity:(loading||otp.length!==6)?0.6:1,display:'flex',alignItems:'center',justifyContent:'center',gap:8,fontFamily:'inherit' }}>
                {loading ? <><span style={{ width:16,height:16,border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin 0.8s linear infinite',display:'inline-block' }} /> Verifying...</> : 'Verify Email ✓'}
              </button>
            </form>

            <div style={{ textAlign:'center',marginTop:16 }}>
              <button onClick={handleResend} disabled={resendCountdown > 0} style={{ background:'none',border:'none',cursor:resendCountdown>0?'not-allowed':'pointer',fontSize:13,color:resendCountdown>0?'var(--color-text-muted)':'var(--color-primary)',fontWeight:500,fontFamily:'inherit' }}>
                {resendCountdown > 0 ? `Resend code in ${resendCountdown}s` : "Didn't receive it? Resend code"}
              </button>
            </div>

            <div style={{ textAlign:'center',marginTop:12 }}>
              <button onClick={() => { setStep(1); setOtp(''); setDevOtp(null); }} style={{ background:'none',border:'none',cursor:'pointer',fontSize:12,color:'var(--color-text-muted)',fontFamily:'inherit' }}>
                ← Change email address
              </button>
            </div>
          </>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default Register;