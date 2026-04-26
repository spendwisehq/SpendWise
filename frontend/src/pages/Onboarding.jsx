// frontend/src/pages/Onboarding.jsx
// STAGE 5 — Feature 1: 4-step onboarding wizard
// Step 1: Set monthly income
// Step 2: Add first transaction
// Step 3: Set spending budget cap
// Step 4: Invite a friend (share link)
//
// After completion, sets onboardingComplete=true in localStorage
// and navigates to /dashboard.

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const STEPS = [
  { id: 'income',      title: 'Set Your Income',       emoji: '💰', subtitle: 'We\'ll help you save the right percentage' },
  { id: 'transaction', title: 'Add Your First Spend',  emoji: '🛍️', subtitle: 'Log something you bought recently' },
  { id: 'budget',      title: 'Set a Spending Cap',    emoji: '🎯', subtitle: 'Get alerts when you\'re close to the limit' },
  { id: 'invite',      title: 'Invite a Friend',       emoji: '🤝', subtitle: 'Split bills and track together' },
];

const CATEGORIES = [
  '📦 Uncategorized','📚 Education','🎬 Entertainment','🍔 Food & Dining',
  '🛒 Groceries','🏥 Health & Medical','📈 Investment','🏠 Rent & Housing',
  '🛍️ Shopping','🚗 Transportation','✈️ Travel','💡 Utilities','💰 Salary','💻 Freelance',
];

export default function Onboarding() {
  const navigate   = useNavigate();
  const { updateUser } = useAuth();

  const [step,    setStep]    = useState(0);
  const [loading, setLoading] = useState(false);
  const [animOut, setAnimOut] = useState(false);

  // Step 1 state
  const [income, setIncome] = useState('');

  // Step 2 state
  const [txName,   setTxName]   = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txCat,    setTxCat]    = useState('Food & Dining');
  const [txType,   setTxType]   = useState('expense');

  // Step 3 state
  const [budget, setBudget] = useState('');

  const transition = (next) => {
    setAnimOut(true);
    setTimeout(() => { setStep(next); setAnimOut(false); }, 220);
  };

  // ── Step handlers ──────────────────────────────────────────────────────────

  const handleIncome = async () => {
    if (!income || Number(income) <= 0) return toast.error('Enter a valid income amount');
    setLoading(true);
    try {
      await api.put('/auth/profile', { monthlyIncome: Number(income) });
      updateUser({ monthlyIncome: Number(income) });
      transition(1);
    } catch {
      toast.error('Failed to save income');
    } finally {
      setLoading(false);
    }
  };

  const handleTransaction = async () => {
    if (!txName.trim())                        return toast.error('Enter a transaction name');
    if (!txAmount || Number(txAmount) <= 0)   return toast.error('Enter a valid amount');
    setLoading(true);
    try {
      const catName = txCat.replace(/^[^\s]+\s/, ''); // strip emoji
      await api.post('/transactions', {
        type:          txType,
        amount:        Number(txAmount),
        merchant:      txName.trim(),
        description:   txName.trim(),
        categoryName:  catName,
        date:          new Date().toISOString().split('T')[0],
        paymentMethod: 'upi',
      });
      toast.success('First transaction logged! 🎉');
      transition(2);
    } catch {
      toast.error('Failed to save transaction');
    } finally {
      setLoading(false);
    }
  };

  const handleBudget = async () => {
    if (!budget || Number(budget) <= 0) return toast.error('Enter a valid budget amount');
    setLoading(true);
    try {
      const now = new Date();
      await api.post('/notifications/set-budget', {
        totalBudget: Number(budget),
        month: now.getMonth() + 1,
        year:  now.getFullYear(),
      });
      toast.success('Spending cap set!');
      transition(3);
    } catch {
      toast.error('Failed to set budget');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    if (step < STEPS.length - 1) transition(step + 1);
    else handleFinish();
  };

  const handleInvite = async () => {
    const text = `Hey! I'm using SpendWise to track my expenses with AI 🤖💸\n\nJoin me: https://spendwise.app`;
    if (navigator.share) {
      await navigator.share({ title: 'Join SpendWise', text });
    } else {
      await navigator.clipboard.writeText(text);
      toast.success('Invite link copied!');
    }
  };

  const handleFinish = () => {
    localStorage.setItem('spendwise_onboarding_done', 'true');
    navigate('/dashboard');
  };

  const currentStep = STEPS[step];

  return (
    <div style={S.bg}>
      {/* Logo */}
      <div style={S.logo}>
        <span style={{ fontSize: 22, fontWeight: 900, color: '#1D9E75' }}>SpendWise</span>
        <span style={{ fontSize: 13, color: '#888', marginLeft: 8 }}>Setup</span>
      </div>

      {/* Progress bar */}
      <div style={S.progressWrap}>
        <div style={{ ...S.progressBar, width: `${((step + 1) / STEPS.length) * 100}%` }} />
      </div>

      {/* Card */}
      <div style={{
        ...S.card,
        opacity:   animOut ? 0   : 1,
        transform: animOut ? 'translateY(20px) scale(0.97)' : 'translateY(0) scale(1)',
        transition: 'all 0.22s ease',
      }}>
        {/* Step indicator */}
        <div style={S.stepRow}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              ...S.stepDot,
              background: i <= step ? '#1D9E75' : 'var(--color-border)',
              transform:  i === step ? 'scale(1.3)' : 'scale(1)',
            }} />
          ))}
        </div>

        {/* Emoji + Title */}
        <div style={S.emojiWrap}>{currentStep.emoji}</div>
        <h2 style={S.title}>{currentStep.title}</h2>
        <p style={S.subtitle}>{currentStep.subtitle}</p>

        {/* Step content */}
        {step === 0 && (
          <StepIncome
            income={income} setIncome={setIncome}
            onNext={handleIncome} onSkip={handleSkip} loading={loading}
          />
        )}
        {step === 1 && (
          <StepTransaction
            name={txName} setName={setTxName}
            amount={txAmount} setAmount={setTxAmount}
            cat={txCat} setCat={setTxCat}
            type={txType} setType={setTxType}
            categories={CATEGORIES}
            onNext={handleTransaction} onSkip={handleSkip} loading={loading}
          />
        )}
        {step === 2 && (
          <StepBudget
            income={income} budget={budget} setBudget={setBudget}
            onNext={handleBudget} onSkip={handleSkip} loading={loading}
          />
        )}
        {step === 3 && (
          <StepInvite
            onInvite={handleInvite} onFinish={handleFinish}
          />
        )}
      </div>

      <style>{`
        @keyframes obFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        input:focus { border-color: #1D9E75 !important; outline: none; }
        select:focus { border-color: #1D9E75 !important; outline: none; }
      `}</style>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StepIncome({ income, setIncome, onNext, onSkip, loading }) {
  return (
    <div style={S.fields}>
      <div style={S.inputWrap}>
        <span style={S.prefix}>₹</span>
        <input
          type="number" value={income} onChange={e => setIncome(e.target.value)}
          placeholder="e.g. 50000"
          style={{ ...S.input, paddingLeft: '2.2rem' }}
          autoFocus
        />
      </div>
      <p style={S.hint}>Your income stays private and is only used to calculate your savings rate.</p>
      <button onClick={onNext} disabled={loading} style={S.btnPrimary}>
        {loading ? 'Saving...' : 'Continue →'}
      </button>
      <button onClick={onSkip} style={S.btnSkip}>Skip for now</button>
    </div>
  );
}

function StepTransaction({ name, setName, amount, setAmount, cat, setCat, type, setType, categories, onNext, onSkip, loading }) {
  return (
    <div style={S.fields}>
      {/* Type toggle */}
      <div style={{ display: 'flex', gap: 8 }}>
        {['expense', 'income'].map(t => (
          <button key={t} onClick={() => setType(t)} style={{
            flex: 1, padding: '8px', borderRadius: 10, border: '1.5px solid',
            borderColor: type === t ? '#1D9E75' : 'var(--color-border)',
            background:  type === t ? 'rgba(29,158,117,0.1)' : 'transparent',
            color:       type === t ? '#1D9E75' : 'var(--color-text-secondary)',
            fontWeight: 600, cursor: 'pointer', fontSize: 13,
          }}>{t === 'expense' ? '↓ Expense' : '↑ Income'}</button>
        ))}
      </div>

      <input
        value={name} onChange={e => setName(e.target.value)}
        placeholder="What did you buy? (e.g. Swiggy)"
        style={S.input} autoFocus
      />

      <div style={S.inputWrap}>
        <span style={S.prefix}>₹</span>
        <input
          type="number" value={amount} onChange={e => setAmount(e.target.value)}
          placeholder="Amount"
          style={{ ...S.input, paddingLeft: '2.2rem' }}
        />
      </div>

      <select value={cat} onChange={e => setCat(e.target.value)} style={S.select}>
        {categories.map(c => <option key={c} value={c.replace(/^[^\s]+\s/, '')}>{c}</option>)}
      </select>

      <button onClick={onNext} disabled={loading} style={S.btnPrimary}>
        {loading ? 'Logging...' : 'Log & Continue →'}
      </button>
      <button onClick={onSkip} style={S.btnSkip}>Skip for now</button>
    </div>
  );
}

function StepBudget({ income, budget, setBudget, onNext, onSkip, loading }) {
  const suggested = income ? Math.round(Number(income) * 0.7) : null;
  return (
    <div style={S.fields}>
      {suggested && (
        <div style={S.suggestion} onClick={() => setBudget(String(suggested))}>
          💡 Suggested: ₹{suggested.toLocaleString('en-IN')}
          <span style={{ color: '#888', fontSize: 12, marginLeft: 6 }}>(70% of income)</span>
        </div>
      )}
      <div style={S.inputWrap}>
        <span style={S.prefix}>₹</span>
        <input
          type="number" value={budget} onChange={e => setBudget(e.target.value)}
          placeholder="Monthly spending cap"
          style={{ ...S.input, paddingLeft: '2.2rem' }}
          autoFocus
        />
      </div>
      <p style={S.hint}>You'll get alerts at 50%, 80%, and 100% of this limit.</p>
      <button onClick={onNext} disabled={loading} style={S.btnPrimary}>
        {loading ? 'Setting...' : 'Set Cap & Continue →'}
      </button>
      <button onClick={onSkip} style={S.btnSkip}>Skip for now</button>
    </div>
  );
}

function StepInvite({ onInvite, onFinish }) {
  return (
    <div style={S.fields}>
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <div style={{ fontSize: 48, marginBottom: 8, animation: 'obFloat 2s ease-in-out infinite' }}>🎉</div>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
          You're all set! Split bills, track shared expenses, and challenge friends to save more.
        </p>
      </div>
      <button onClick={onInvite} style={{ ...S.btnPrimary, background: '#6366f1' }}>
        📨 Invite a Friend
      </button>
      <button onClick={onFinish} style={S.btnPrimary}>
        Go to Dashboard →
      </button>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const S = {
  bg: {
    minHeight: '100vh',
    background: 'var(--color-bg-primary, #F5F5F0)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '24px 16px 48px',
  },
  logo: {
    display: 'flex',
    alignItems: 'baseline',
    marginBottom: 24,
    alignSelf: 'flex-start',
    maxWidth: 480,
    width: '100%',
  },
  progressWrap: {
    width: '100%',
    maxWidth: 480,
    height: 4,
    background: 'rgba(0,0,0,0.08)',
    borderRadius: 2,
    marginBottom: 32,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    background: '#1D9E75',
    borderRadius: 2,
    transition: 'width 0.4s ease',
  },
  card: {
    width: '100%',
    maxWidth: 480,
    background: 'var(--color-bg-secondary, #fff)',
    borderRadius: 24,
    border: '1px solid var(--color-border, #e5e5e5)',
    padding: '32px 28px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
  },
  stepRow: {
    display: 'flex',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 28,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    transition: 'all 0.3s',
  },
  emojiWrap: {
    fontSize: 52,
    textAlign: 'center',
    marginBottom: 12,
    animation: 'obFloat 2.5s ease-in-out infinite',
  },
  title: {
    textAlign: 'center',
    color: 'var(--color-text-primary, #1a1a1a)',
    fontSize: 22,
    fontWeight: 800,
    margin: '0 0 6px',
  },
  subtitle: {
    textAlign: 'center',
    color: 'var(--color-text-secondary, #666)',
    fontSize: 14,
    margin: '0 0 28px',
  },
  fields: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  inputWrap: {
    position: 'relative',
  },
  prefix: {
    position: 'absolute',
    left: '0.85rem',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--color-text-secondary, #888)',
    fontSize: 15,
    fontWeight: 600,
    pointerEvents: 'none',
  },
  input: {
    width: '100%',
    padding: '0.75rem 0.85rem',
    background: 'var(--color-bg-tertiary, #f8f8f6)',
    border: '1.5px solid var(--color-border, #e5e5e5)',
    borderRadius: 12,
    color: 'var(--color-text-primary, #1a1a1a)',
    fontSize: 15,
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  },
  select: {
    width: '100%',
    padding: '0.75rem 0.85rem',
    background: 'var(--color-bg-tertiary, #f8f8f6)',
    border: '1.5px solid var(--color-border, #e5e5e5)',
    borderRadius: 12,
    color: 'var(--color-text-primary, #1a1a1a)',
    fontSize: 14,
    cursor: 'pointer',
    appearance: 'none',
  },
  btnPrimary: {
    width: '100%',
    padding: '14px',
    background: '#1D9E75',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
  btnSkip: {
    width: '100%',
    padding: '10px',
    background: 'none',
    color: 'var(--color-text-secondary, #888)',
    border: 'none',
    fontSize: 13,
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  hint: {
    fontSize: 12,
    color: 'var(--color-text-secondary, #888)',
    margin: 0,
    lineHeight: 1.5,
  },
  suggestion: {
    padding: '10px 14px',
    background: 'rgba(29,158,117,0.08)',
    border: '1px solid rgba(29,158,117,0.25)',
    borderRadius: 10,
    fontSize: 14,
    color: '#1D9E75',
    cursor: 'pointer',
    fontWeight: 600,
  },
};