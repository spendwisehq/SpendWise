// frontend/src/pages/Household.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Heart, Link, Unlink, BarChart2, RefreshCw, X, Plus,
  TrendingUp, TrendingDown, Users, PieChart, Calendar,
  Edit2, Check, Wallet, AlertCircle, Copy, Clock,
} from 'lucide-react';
import {
  PieChart as RePie, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { householdAPI } from '../api/social.api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import './Household.css';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (v, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(v || 0);

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const PIE_COLORS = ['#6366f1','#ec4899','#f97316','#22c55e','#06b6d4','#a855f7','#f59e0b','#ef4444'];

const Avatar = ({ name = '', size = 44 }) => {
  const initials = (name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const PALETTES = [
    ['#6366f1','#8b5cf6'],['#ec4899','#f43f5e'],['#f97316','#fb923c'],
    ['#22c55e','#16a34a'],['#06b6d4','#0891b2'],['#a855f7','#9333ea'],
  ];
  const [c1,c2] = PALETTES[(name?.charCodeAt(0)||0) % PALETTES.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `linear-gradient(135deg,${c1},${c2})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 800, color: '#fff',
    }}>{initials}</div>
  );
};

// ── Custom Tooltip ────────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label, currency = 'INR' }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
      borderRadius: 8, padding: '8px 12px', fontSize: 12,
    }}>
      {label && <div style={{ color: 'var(--color-text-secondary)', marginBottom: 4 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontWeight: 700 }}>
          {p.name}: {fmt(p.value, currency)}
        </div>
      ))}
    </div>
  );
};

// ── Link / Create Household Panel ─────────────────────────────────────────────
const LinkHouseholdPanel = ({ onLinked }) => {
  const [tab,    setTab]    = useState('create'); // 'create' | 'accept'
  const [email,  setEmail]  = useState('');
  const [name,   setName]   = useState('');
  const [token,  setToken]  = useState('');
  const [loading,setLoading]= useState(false);
  const [invited, setInvited]= useState(null); // { inviteToken, partner }

  const handleCreate = async () => {
    if (!email.trim()) { toast.error('Enter partner email'); return; }
    setLoading(true);
    try {
      const res = await householdAPI.create({ partnerEmail: email.trim(), name: name.trim() || undefined });
      const data = res.data?.data;
      setInvited(data);
      toast.success(`Invite sent to ${data.partner.name}!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send invite');
    } finally { setLoading(false); }
  };

  const handleAccept = async () => {
    if (!token.trim()) { toast.error('Enter invite token'); return; }
    setLoading(true);
    try {
      await householdAPI.accept(token.trim());
      toast.success('Household linked! 💕');
      onLinked();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid or expired token');
    } finally { setLoading(false); }
  };

  const copyToken = () => {
    navigator.clipboard?.writeText(invited.inviteToken);
    toast.success('Token copied!');
  };

  return (
    <div className="hh-link-panel">
      <div className="hh-link-hero">
        <div className="hh-hearts">❤️</div>
        <h2>Link Your Household</h2>
        <p>Track finances together with your partner or housemate</p>
      </div>

      <div className="hh-link-tabs">
        <button className={`hh-tab ${tab === 'create' ? 'active' : ''}`} onClick={() => setTab('create')}>
          Send Invite
        </button>
        <button className={`hh-tab ${tab === 'accept' ? 'active' : ''}`} onClick={() => setTab('accept')}>
          Accept Invite
        </button>
      </div>

      {tab === 'create' && !invited && (
        <div className="hh-form">
          <div className="hh-field">
            <label>Partner's Email *</label>
            <input className="hh-input" type="email" placeholder="partner@example.com"
              value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()} autoFocus />
          </div>
          <div className="hh-field">
            <label>Household Name (optional)</label>
            <input className="hh-input" placeholder="e.g. Minaz & Priya"
              value={name} onChange={e => setName(e.target.value)} />
          </div>
          <button className="hh-btn hh-btn--primary" onClick={handleCreate} disabled={loading}>
            {loading ? <span className="hh-spin" /> : <Link size={16} />}
            {loading ? 'Sending...' : 'Send Invite'}
          </button>
        </div>
      )}

      {tab === 'create' && invited && (
        <div className="hh-invited">
          <div className="hh-invited__icon">✅</div>
          <h3>Invite sent to {invited.partner.name}!</h3>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
            Share this token with them so they can accept:
          </p>
          <div className="hh-token-box">
            <code>{invited.inviteToken}</code>
            <button className="hh-icon-btn" onClick={copyToken} title="Copy token">
              <Copy size={14} />
            </button>
          </div>
          <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 8 }}>
            <Clock size={11} style={{ verticalAlign: 'middle', marginRight: 3 }} />
            Token expires in 7 days
          </p>
        </div>
      )}

      {tab === 'accept' && (
        <div className="hh-form">
          <div className="hh-field">
            <label>Invite Token *</label>
            <input className="hh-input" placeholder="Paste the invite token here"
              value={token} onChange={e => setToken(e.target.value)} autoFocus />
          </div>
          <button className="hh-btn hh-btn--primary" onClick={handleAccept} disabled={loading}>
            {loading ? <span className="hh-spin" /> : <Heart size={16} />}
            {loading ? 'Linking...' : 'Accept & Link'}
          </button>
        </div>
      )}
    </div>
  );
};

// ── Budget Editor ─────────────────────────────────────────────────────────────
const BudgetEditor = ({ budget, currency, onSave, onClose }) => {
  const [totalLimit, setTotal] = useState(budget?.totalLimit || 0);
  const [cats, setCats] = useState(budget?.categoryBudgets || []);
  const [loading, setLoading] = useState(false);

  const addCat = () => setCats(prev => [
    ...prev, { categoryName: '', monthlyLimit: 0, icon: '📦', color: '#6366f1' }
  ]);
  const removeCat = (i) => setCats(prev => prev.filter((_, idx) => idx !== i));
  const updateCat = (i, k, v) => setCats(prev => prev.map((c, idx) => idx === i ? { ...c, [k]: v } : c));

  const save = async () => {
    setLoading(true);
    try {
      await householdAPI.updateBudget({ totalLimit: Number(totalLimit), currency, categoryBudgets: cats });
      toast.success('Shared budget saved!');
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save budget');
    } finally { setLoading(false); }
  };

  return (
    <div className="hh-overlay" onClick={onClose}>
      <div className="hh-modal" onClick={e => e.stopPropagation()}>
        <div className="hh-modal__hdr">
          <h2>Shared Budget</h2>
          <button className="hh-icon-btn" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="hh-modal__body">
          <div className="hh-field">
            <label>Total Monthly Limit ({currency})</label>
            <input className="hh-input" type="number" min="0"
              value={totalLimit} onChange={e => setTotal(e.target.value)} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '1rem 0 0.5rem' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Category Budgets</label>
            <button className="hh-btn hh-btn--ghost hh-btn--sm" onClick={addCat}><Plus size={13} /> Add</button>
          </div>
          {cats.map((c, i) => (
            <div key={i} className="hh-cat-row">
              <input className="hh-input" placeholder="Category name" style={{ flex: 2 }}
                value={c.categoryName} onChange={e => updateCat(i, 'categoryName', e.target.value)} />
              <input className="hh-input" type="number" min="0" placeholder="Limit" style={{ flex: 1 }}
                value={c.monthlyLimit} onChange={e => updateCat(i, 'monthlyLimit', e.target.value)} />
              <button className="hh-icon-btn hh-icon-btn--danger" onClick={() => removeCat(i)}><X size={13} /></button>
            </div>
          ))}
        </div>
        <div className="hh-modal__footer">
          <button className="hh-btn hh-btn--primary" onClick={save} disabled={loading}>
            {loading ? <span className="hh-spin" /> : <Check size={15} />} Save Budget
          </button>
          <button className="hh-btn hh-btn--ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

// ── Main Household Page ───────────────────────────────────────────────────────
const Household = () => {
  const { user } = useAuth();
  const [household,  setHousehold]  = useState(null);     // null = no household
  const [dashboard,  setDashboard]  = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [dashLoading,setDashLoading]= useState(false);
  const [months,     setMonths]     = useState(1);
  const [showBudget, setShowBudget] = useState(false);
  const [tab,        setTab]        = useState('overview');
  const currency = user?.currency || 'INR';

  const fetchHousehold = useCallback(async () => {
    setLoading(true);
    try {
      const res = await householdAPI.get();
      setHousehold(res.data?.data || null);
    } catch {
      setHousehold(null);
    } finally { setLoading(false); }
  }, []);

  const fetchDashboard = useCallback(async () => {
    setDashLoading(true);
    try {
      const res = await householdAPI.dashboard(months);
      setDashboard(res.data?.data);
    } catch {
      toast.error('Failed to load combined dashboard');
    } finally { setDashLoading(false); }
  }, [months]);

  useEffect(() => { fetchHousehold(); }, [fetchHousehold]);
  useEffect(() => { if (household?.status === 'active') fetchDashboard(); }, [household, fetchDashboard]);

  const handleUnlink = async () => {
    if (!window.confirm('Unlink this household? Both members will lose access to the combined view.')) return;
    try {
      await householdAPI.unlink();
      toast.success('Household unlinked');
      setHousehold(null);
      setDashboard(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to unlink');
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="hh-page">
      <div className="hh-skeleton-full" />
    </div>
  );

  // ── No Household ───────────────────────────────────────────────────────────
  if (!household) return (
    <div className="hh-page">
      <LinkHouseholdPanel onLinked={fetchHousehold} />
    </div>
  );

  // ── Pending ────────────────────────────────────────────────────────────────
  if (household.status === 'pending') {
    const partner = household.members?.find(m => m._id?.toString() !== user?._id?.toString());
    return (
      <div className="hh-page">
        <div className="hh-pending">
          <div className="hh-pending__icon">⏳</div>
          <h2>Waiting for {partner?.name || 'your partner'}</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
            Share the invite token with them so they can accept the household link.
          </p>
          <div className="hh-pending__members">
            {household.members?.map(m => (
              <div key={m._id} className="hh-pending__member">
                <Avatar name={m.name} size={48} />
                <span>{m.name}</span>
                {m._id?.toString() === user?._id?.toString()
                  ? <span className="hh-chip hh-chip--ok">You ✓</span>
                  : <span className="hh-chip hh-chip--pending">Pending</span>}
              </div>
            ))}
          </div>
          <button className="hh-btn hh-btn--ghost hh-btn--sm" style={{ marginTop: '1rem' }} onClick={handleUnlink}>
            <Unlink size={14} /> Cancel Invite
          </button>
        </div>
      </div>
    );
  }

  // ── Active Household Dashboard ─────────────────────────────────────────────
  const s = dashboard?.summary;
  const members = household.members || [];
  const partner = members.find(m => m._id?.toString() !== user?._id?.toString());
  const myId    = user?._id?.toString();

  // Pie data from byCategory
  const pieData = s
    ? Object.entries(s.byCategory || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, value]) => ({ name, value }))
    : [];

  // Area chart data
  const areaData = (s?.dailyTrend || []).map(d => ({
    date:   d.date.slice(5),
    amount: d.amount,
  }));

  // Per-member comparison
  const memberData = s
    ? members.map(m => {
        const key = m._id?.toString();
        const pm  = s.perMember?.[key] || { expense: 0, income: 0 };
        return { ...m, ...pm };
      })
    : [];

  const savingsRate = s?.totalMonthlyIncome > 0
    ? Math.round(((s.totalIncome - s.totalExpense) / s.totalMonthlyIncome) * 100)
    : 0;

  const budgetUsed = household.sharedBudget?.totalLimit > 0
    ? Math.min(100, Math.round((s?.totalExpense / household.sharedBudget.totalLimit) * 100))
    : null;

  return (
    <div className="hh-page">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="hh-page__hdr">
        <div className="hh-members-row">
          {members.map((m, i) => (
            <React.Fragment key={m._id}>
              {i > 0 && <Heart size={16} color="#ec4899" style={{ flexShrink: 0 }} />}
              <Avatar name={m.name} size={38} />
              <span className="hh-member-name">{m.name}</span>
            </React.Fragment>
          ))}
          <span className="hh-chip hh-chip--ok" style={{ marginLeft: 4 }}>Linked</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="hh-btn hh-btn--ghost hh-btn--sm" onClick={() => setShowBudget(true)}>
            <Wallet size={14} /> Budget
          </button>
          <button className="hh-btn hh-btn--ghost hh-btn--sm" onClick={fetchDashboard} disabled={dashLoading}>
            <RefreshCw size={13} className={dashLoading ? 'hh-spin-icon' : ''} />
          </button>
          <button className="hh-btn hh-btn--danger hh-btn--sm" onClick={handleUnlink}>
            <Unlink size={14} /> Unlink
          </button>
        </div>
      </div>

      {/* Household name */}
      <div className="hh-name-row">
        <h1 className="hh-title">{household.name}</h1>
        <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
          Linked {fmtDate(household.linkedAt)}
        </span>
      </div>

      {/* Month selector */}
      <div className="hh-month-row">
        {[1,3,6].map(m => (
          <button key={m} className={`hh-tab ${months === m ? 'active' : ''}`}
            onClick={() => setMonths(m)}>
            {m === 1 ? 'This Month' : `${m} Months`}
          </button>
        ))}
      </div>

      {/* ── Summary Stats ───────────────────────────────────────────────────── */}
      <div className="hh-stats-grid">
        {[
          { label: 'Combined Expense', value: fmt(s?.totalExpense, currency), icon: <TrendingDown size={16} />, color: '#f87171' },
          { label: 'Combined Income',  value: fmt(s?.totalIncome,  currency), icon: <TrendingUp  size={16} />, color: '#4ade80' },
          { label: 'Net Savings',      value: fmt((s?.totalIncome||0)-(s?.totalExpense||0), currency), icon: <BarChart2 size={16} />, color: '#818cf8' },
          { label: 'Savings Rate',     value: `${savingsRate}%`, icon: <PieChart size={16} />, color: savingsRate >= 20 ? '#4ade80' : savingsRate >= 10 ? '#fbbf24' : '#f87171' },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="hh-stat-card">
            <div className="hh-stat-card__icon" style={{ color, background: color + '22' }}>{icon}</div>
            <div className="hh-stat-card__val" style={{ color }}>{dashLoading ? '…' : value}</div>
            <div className="hh-stat-card__lbl">{label}</div>
          </div>
        ))}
      </div>

      {/* Budget progress */}
      {budgetUsed !== null && (
        <div className="hh-budget-bar">
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Shared Budget</span>
            <span style={{ fontWeight: 700, color: budgetUsed >= 100 ? '#f87171' : budgetUsed >= 80 ? '#fbbf24' : '#4ade80' }}>
              {fmt(s?.totalExpense, currency)} / {fmt(household.sharedBudget.totalLimit, currency)} ({budgetUsed}%)
            </span>
          </div>
          <div className="hh-bar-track">
            <div className="hh-bar-fill" style={{
              width: `${budgetUsed}%`,
              background: budgetUsed >= 100 ? '#f87171' : budgetUsed >= 80 ? '#fbbf24' : '#4ade80',
            }} />
          </div>
          {budgetUsed >= 80 && (
            <p style={{ fontSize: 12, color: budgetUsed >= 100 ? '#f87171' : '#fbbf24', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <AlertCircle size={11} /> {budgetUsed >= 100 ? 'Budget exceeded!' : 'Approaching budget limit'}
            </p>
          )}
        </div>
      )}

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <div className="hh-tabs-row">
        {[['overview','Overview'],['spending','Spending'],['transactions','Recent']].map(([v,l]) => (
          <button key={v} className={`hh-tab ${tab === v ? 'active' : ''}`} onClick={() => setTab(v)}>{l}</button>
        ))}
      </div>

      {/* ── Overview tab ────────────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="hh-two-col">
          {/* Per-member breakdown */}
          <div className="hh-card">
            <h3 className="hh-card__title">Member Breakdown</h3>
            {dashLoading ? <div className="hh-skeleton" /> : (
              memberData.map(m => {
                const pct = s?.totalExpense > 0 ? Math.round((m.expense / s.totalExpense) * 100) : 0;
                return (
                  <div key={m._id} className="hh-member-breakdown">
                    <Avatar name={m.name} size={36} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{m.name} {m._id?.toString() === myId && '(you)'}</span>
                        <span style={{ fontSize: 13, color: '#f87171', fontWeight: 700 }}>{fmt(m.expense, currency)}</span>
                      </div>
                      <div className="hh-bar-track" style={{ height: 5 }}>
                        <div className="hh-bar-fill" style={{ width: `${pct}%`, background: '#6366f1' }} />
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                        {pct}% of combined spend
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Category pie */}
          {pieData.length > 0 && (
            <div className="hh-card">
              <h3 className="hh-card__title">Spending by Category</h3>
              <ResponsiveContainer width="100%" height={200}>
                <RePie>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                    dataKey="value" paddingAngle={2}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => fmt(v, currency)} />
                </RePie>
              </ResponsiveContainer>
              <div className="hh-pie-legend">
                {pieData.slice(0, 6).map((d, i) => (
                  <div key={d.name} className="hh-pie-item">
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                    <span style={{ fontSize: 11, fontWeight: 700 }}>{fmt(d.value, currency)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Spending tab ────────────────────────────────────────────────────── */}
      {tab === 'spending' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {areaData.length > 0 && (
            <div className="hh-card">
              <h3 className="hh-card__title">Daily Spending (last 30 days)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={areaData}>
                  <defs>
                    <linearGradient id="hhGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"   stopColor="#6366f1" stopOpacity={0.25} />
                      <stop offset="95%"  stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }} width={55}
                    tickFormatter={v => `₹${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
                  <Tooltip content={<ChartTooltip currency={currency} />} />
                  <Area type="monotone" dataKey="amount" stroke="#6366f1" fill="url(#hhGrad)"
                    strokeWidth={2} name="Spent" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Category breakdown table */}
          <div className="hh-card">
            <h3 className="hh-card__title">Category Breakdown</h3>
            {dashLoading ? <div className="hh-skeleton" /> :
              Object.entries(s?.byCategory || {}).sort((a,b) => b[1]-a[1]).map(([cat, amt], i) => {
                const pct = s.totalExpense > 0 ? Math.round((amt / s.totalExpense) * 100) : 0;
                const budgetItem = household.sharedBudget?.categoryBudgets?.find(
                  cb => cb.categoryName?.toLowerCase() === cat.toLowerCase()
                );
                return (
                  <div key={cat} className="hh-cat-breakdown">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{cat}</span>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {budgetItem && (
                          <span style={{ fontSize: 11, color: amt > budgetItem.monthlyLimit ? '#f87171' : 'var(--color-text-secondary)' }}>
                            / {fmt(budgetItem.monthlyLimit, currency)}
                          </span>
                        )}
                        <span style={{ fontSize: 13, fontWeight: 700, color: PIE_COLORS[i % PIE_COLORS.length] }}>{fmt(amt, currency)}</span>
                      </div>
                    </div>
                    <div className="hh-bar-track" style={{ height: 4 }}>
                      <div className="hh-bar-fill" style={{
                        width: `${pct}%`,
                        background: PIE_COLORS[i % PIE_COLORS.length],
                      }} />
                    </div>
                  </div>
                );
              })
            }
          </div>
        </div>
      )}

      {/* ── Recent Transactions tab ──────────────────────────────────────────── */}
      {tab === 'transactions' && (
        <div className="hh-card">
          <h3 className="hh-card__title">Recent Combined Transactions</h3>
          {dashLoading ? <div className="hh-skeleton" /> :
            !s?.recentTransactions?.length ? (
              <div className="hh-empty">
                <Calendar size={24} />
                <p>No transactions found for this period</p>
              </div>
            ) : (
              s.recentTransactions.map(txn => {
                const owner = members.find(m => m._id?.toString() === txn.userId?.toString());
                return (
                  <div key={txn._id} className="hh-txn-row">
                    <div className="hh-txn-icon" style={{ background: txn.type === 'expense' ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)' }}>
                      {txn.type === 'expense' ? <TrendingDown size={14} color="#f87171" /> : <TrendingUp size={14} color="#4ade80" />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                          {txn.merchant || txn.description || 'Transaction'}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: txn.type === 'expense' ? '#f87171' : '#4ade80', flexShrink: 0, marginLeft: 8 }}>
                          {txn.type === 'expense' ? '-' : '+'}{fmt(txn.amount, txn.currency || currency)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                        <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                          {txn.categoryName || 'Uncategorized'}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>·</span>
                        <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                          {owner?.name || ''}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>·</span>
                        <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                          {new Date(txn.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )
          }
        </div>
      )}

      {showBudget && (
        <BudgetEditor
          budget={household.sharedBudget}
          currency={currency}
          onSave={() => { setShowBudget(false); fetchDashboard(); fetchHousehold(); }}
          onClose={() => setShowBudget(false)}
        />
      )}
    </div>
  );
};

export default Household;