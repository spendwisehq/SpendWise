// frontend/src/pages/Challenges.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Trophy, Target, Flame, Users, Plus, RefreshCw, X, Clock,
  TrendingDown, TrendingUp, Star, ChevronRight, Award, Search,
  Calendar, Zap, Crown, Medal, Filter, ArrowLeft,
} from 'lucide-react';
import { challengeAPI } from '../api/social.api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import './Challenges.css';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (v, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency', currency, maximumFractionDigits: 0,
  }).format(v || 0);

const fmtNum = (v) => new Intl.NumberFormat('en-IN').format(v || 0);

const CHALLENGE_TYPES = [
  { value: 'no_spend',          label: 'No Spend',        icon: '🚫', desc: 'Zero spending in a category' },
  { value: 'savings_target',    label: 'Savings Target',  icon: '💰', desc: 'Save a specific amount' },
  { value: 'spend_limit',       label: 'Spend Limit',     icon: '📉', desc: 'Keep total spend under a limit' },
  { value: 'category_limit',    label: 'Category Limit',  icon: '🏷️', desc: 'Limit one category' },
  { value: 'transaction_count', label: 'Transaction Limit', icon: '🔢', desc: 'Limit number of transactions' },
];

const CATEGORIES = [
  'Food & Dining', 'Shopping', 'Entertainment', 'Transportation',
  'Health & Medical', 'Travel', 'Groceries', 'Utilities',
  'Education', 'Personal Care', 'Subscriptions', 'Other',
];

const STATUS_COLORS = {
  upcoming:  { bg: 'rgba(99,102,241,0.15)',  text: '#818cf8', border: 'rgba(99,102,241,0.3)' },
  active:    { bg: 'rgba(34,197,94,0.15)',   text: '#4ade80', border: 'rgba(34,197,94,0.3)' },
  completed: { bg: 'rgba(245,158,11,0.15)',  text: '#fbbf24', border: 'rgba(245,158,11,0.3)' },
  cancelled: { bg: 'rgba(239,68,68,0.15)',   text: '#f87171', border: 'rgba(239,68,68,0.3)' },
};

const TYPE_META = {
  no_spend:          { icon: '🚫', label: 'No Spend',      color: '#f87171', progressInverted: true  },
  savings_target:    { icon: '💰', label: 'Save Money',    color: '#4ade80', progressInverted: false },
  spend_limit:       { icon: '📉', label: 'Spend Limit',   color: '#818cf8', progressInverted: true  },
  category_limit:    { icon: '🏷️', label: 'Category Cap',  color: '#fb923c', progressInverted: true  },
  transaction_count: { icon: '🔢', label: 'Txn Limit',     color: '#22d3ee', progressInverted: true  },
};

const getRankIcon = (rank) => {
  if (rank === 1) return <Crown size={16} color="#fbbf24" />;
  if (rank === 2) return <Medal size={16} color="#94a3b8" />;
  if (rank === 3) return <Medal size={16} color="#f97316" />;
  return <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', minWidth: 16, textAlign: 'center' }}>{rank}</span>;
};

// ── Avatar ────────────────────────────────────────────────────────────────────
const Avatar = ({ name = '', size = 32 }) => {
  const initials = (name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const PALETTES = [
    ['#6366f1','#8b5cf6'], ['#ec4899','#f43f5e'], ['#f97316','#fb923c'],
    ['#22c55e','#16a34a'], ['#06b6d4','#0891b2'], ['#a855f7','#9333ea'],
  ];
  const [c1, c2] = PALETTES[(name?.charCodeAt(0) || 0) % PALETTES.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `linear-gradient(135deg,${c1},${c2})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px',
    }}>{initials}</div>
  );
};

// ── Progress Bar ──────────────────────────────────────────────────────────────
const ProgressBar = ({ current, target, type, color }) => {
  const inverted = TYPE_META[type]?.progressInverted;
  let pct;
  if (target === 0) {
    pct = type === 'no_spend' ? (current === 0 ? 100 : 0) : 0;
  } else {
    pct = inverted
      ? Math.max(0, Math.min(100, 100 - (current / target) * 100))
      : Math.min(100, (current / target) * 100);
  }
  const barColor = pct >= 80 ? '#4ade80' : pct >= 40 ? color || '#818cf8' : '#f87171';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div className="ch-progress-track">
        <div className="ch-progress-fill" style={{ width: `${pct}%`, background: barColor }} />
      </div>
      <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', flexShrink: 0 }}>{Math.round(pct)}%</span>
    </div>
  );
};

// ── Create Challenge Modal ────────────────────────────────────────────────────
const CreateModal = ({ onClose, onCreate }) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', type: '', targetCategory: '',
    targetValue: '', currency: user?.currency || 'INR',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    visibility: 'public', maxParticipants: '',
    badge: { name: 'Challenge Champion', icon: '🏆', color: '#f59e0b', description: '' },
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setBadge = (k, v) => setForm(f => ({ ...f, badge: { ...f.badge, [k]: v } }));

  const needsCategory = ['no_spend', 'category_limit'].includes(form.type);
  const needsTarget   = form.type && form.type !== 'no_spend';

  const submit = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    if (!form.type)          { toast.error('Select a challenge type'); return; }
    if (!form.startDate || !form.endDate) { toast.error('Set start and end dates'); return; }
    if (needsCategory && !form.targetCategory) { toast.error('Select a category'); return; }
    if (needsTarget && !form.targetValue) { toast.error('Set a target value'); return; }

    setLoading(true);
    try {
      const payload = {
        ...form,
        targetValue:     form.targetValue ? Number(form.targetValue) : 0,
        maxParticipants: form.maxParticipants ? Number(form.maxParticipants) : null,
      };
      const res = await challengeAPI.create(payload);
      toast.success('Challenge created! 🎯');
      onCreate(res.data?.data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create challenge');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ch-overlay" onClick={onClose}>
      <div className="ch-modal ch-modal--create" onClick={e => e.stopPropagation()}>
        <div className="ch-modal__hdr">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {step > 1 && (
              <button className="ch-icon-btn" onClick={() => setStep(s => s - 1)}>
                <ArrowLeft size={16} />
              </button>
            )}
            <h2>Create Challenge <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 400 }}>Step {step}/3</span></h2>
          </div>
          <button className="ch-icon-btn" onClick={onClose}><X size={16} /></button>
        </div>

        {/* Step indicator */}
        <div className="ch-steps">
          {[1,2,3].map(s => (
            <div key={s} className={`ch-step ${step === s ? 'active' : step > s ? 'done' : ''}`}>
              <div className="ch-step__dot">{step > s ? '✓' : s}</div>
              <span>{['Basics','Rules','Badge'][s-1]}</span>
            </div>
          ))}
        </div>

        <div className="ch-modal__body">
          {/* Step 1: Basics */}
          {step === 1 && (
            <div className="ch-form-grid">
              <div className="ch-field">
                <label>Challenge Title *</label>
                <input className="ch-input" placeholder="e.g. 30-Day No Coffee Challenge"
                  value={form.title} onChange={e => set('title', e.target.value)} autoFocus />
              </div>
              <div className="ch-field">
                <label>Description</label>
                <textarea className="ch-input ch-textarea" placeholder="What is this challenge about?"
                  value={form.description} onChange={e => set('description', e.target.value)} rows={2} />
              </div>
              <div className="ch-field-row">
                <div className="ch-field">
                  <label>Start Date *</label>
                  <input className="ch-input" type="date" value={form.startDate}
                    onChange={e => set('startDate', e.target.value)} />
                </div>
                <div className="ch-field">
                  <label>End Date *</label>
                  <input className="ch-input" type="date" value={form.endDate}
                    onChange={e => set('endDate', e.target.value)} />
                </div>
              </div>
              <div className="ch-field-row">
                <div className="ch-field">
                  <label>Visibility</label>
                  <select className="ch-input" value={form.visibility} onChange={e => set('visibility', e.target.value)}>
                    <option value="public">🌐 Public</option>
                    <option value="private">🔒 Private</option>
                  </select>
                </div>
                <div className="ch-field">
                  <label>Max Participants</label>
                  <input className="ch-input" type="number" placeholder="Unlimited"
                    value={form.maxParticipants} onChange={e => set('maxParticipants', e.target.value)} min="2" />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Rules */}
          {step === 2 && (
            <div className="ch-form-grid">
              <div className="ch-field">
                <label>Challenge Type *</label>
                <div className="ch-type-grid">
                  {CHALLENGE_TYPES.map(t => (
                    <button
                      key={t.value}
                      className={`ch-type-card ${form.type === t.value ? 'selected' : ''}`}
                      onClick={() => set('type', t.value)}
                    >
                      <span className="ch-type-card__icon">{t.icon}</span>
                      <span className="ch-type-card__label">{t.label}</span>
                      <span className="ch-type-card__desc">{t.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
              {needsCategory && (
                <div className="ch-field">
                  <label>Category *</label>
                  <select className="ch-input" value={form.targetCategory}
                    onChange={e => set('targetCategory', e.target.value)}>
                    <option value="">Select category</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}
              {needsTarget && (
                <div className="ch-field">
                  <label>Target {form.type === 'transaction_count' ? 'Count' : `Amount (${form.currency})`} *</label>
                  <input className="ch-input" type="number" min="0"
                    placeholder={form.type === 'transaction_count' ? 'e.g. 10 transactions' : 'e.g. 5000'}
                    value={form.targetValue} onChange={e => set('targetValue', e.target.value)} />
                </div>
              )}
            </div>
          )}

          {/* Step 3: Badge */}
          {step === 3 && (
            <div className="ch-form-grid">
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
                Customize the badge winners will earn 🏅
              </p>
              <div className="ch-field">
                <label>Badge Name</label>
                <input className="ch-input" placeholder="e.g. Savings Hero"
                  value={form.badge.name} onChange={e => setBadge('name', e.target.value)} />
              </div>
              <div className="ch-field-row">
                <div className="ch-field">
                  <label>Badge Icon (emoji)</label>
                  <input className="ch-input" placeholder="🏆" maxLength={4}
                    value={form.badge.icon} onChange={e => setBadge('icon', e.target.value)} />
                </div>
                <div className="ch-field">
                  <label>Badge Colour</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="color" value={form.badge.color}
                      onChange={e => setBadge('color', e.target.value)}
                      style={{ width: 40, height: 40, border: 'none', background: 'none', cursor: 'pointer', borderRadius: 8 }} />
                    <span className="ch-badge-preview" style={{ background: form.badge.color + '22', border: `1px solid ${form.badge.color}55`, color: form.badge.color }}>
                      {form.badge.icon} {form.badge.name}
                    </span>
                  </div>
                </div>
              </div>
              <div className="ch-field">
                <label>Badge Description</label>
                <input className="ch-input" placeholder="What this badge represents"
                  value={form.badge.description} onChange={e => setBadge('description', e.target.value)} />
              </div>
            </div>
          )}
        </div>

        <div className="ch-modal__footer">
          {step < 3 ? (
            <button className="ch-btn ch-btn--primary" onClick={() => setStep(s => s + 1)}
              disabled={step === 1 && !form.title.trim()}>
              Next <ChevronRight size={15} />
            </button>
          ) : (
            <button className="ch-btn ch-btn--primary" onClick={submit} disabled={loading}>
              {loading ? <span className="ch-spin" /> : <Trophy size={15} />}
              {loading ? 'Creating...' : 'Create Challenge'}
            </button>
          )}
          <button className="ch-btn ch-btn--ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

// ── Leaderboard Drawer ────────────────────────────────────────────────────────
const LeaderboardDrawer = ({ challenge, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    (async () => {
      try {
        const res = await challengeAPI.leaderboard(challenge._id);
        setData(res.data?.data);
      } catch {
        toast.error('Failed to load leaderboard');
      } finally {
        setLoading(false);
      }
    })();
  }, [challenge._id]);

  const meta = TYPE_META[challenge.type] || {};

  return (
    <div className="ch-overlay" onClick={onClose}>
      <div className="ch-drawer" onClick={e => e.stopPropagation()}>
        <div className="ch-modal__hdr">
          <div>
            <h2>🏆 Leaderboard</h2>
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>{challenge.title}</p>
          </div>
          <button className="ch-icon-btn" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="ch-drawer__body">
          {loading ? (
            Array(4).fill(0).map((_, i) => <div key={i} className="ch-skeleton" />)
          ) : !data?.leaderboard?.length ? (
            <div className="ch-empty"><Users size={28} /><p>No participants yet</p></div>
          ) : (
            <>
              {data.myRank && (
                <div className="ch-my-rank">
                  Your rank: <strong>#{data.myRank}</strong> of {data.totalPlayers}
                </div>
              )}
              {data.leaderboard.map((p) => (
                <div key={p.userId}
                  className={`ch-lb-row ${p.userId?.toString() === user?._id?.toString() ? 'ch-lb-row--me' : ''}`}>
                  <div className="ch-lb-rank">{getRankIcon(p.rank)}</div>
                  <Avatar name={p.name} size={36} />
                  <div className="ch-lb-info">
                    <span className="ch-lb-name">{p.name} {p.userId?.toString() === user?._id?.toString() && '(you)'}</span>
                    <span className="ch-lb-val" style={{ color: meta.color }}>
                      {challenge.type === 'transaction_count'
                        ? `${fmtNum(p.currentValue)} txns`
                        : fmt(p.currentValue, challenge.currency)}
                    </span>
                  </div>
                  {p.completed && (
                    <span className="ch-badge-chip" style={{ background: '#fbbf2422', color: '#fbbf24', border: '1px solid #fbbf2444' }}>
                      ✓ Done
                    </span>
                  )}
                  {p.badgeEarned && <span title="Badge earned">🏅</span>}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Challenge Card ────────────────────────────────────────────────────────────
const ChallengeCard = ({ challenge, onJoin, onLeave, onRefresh, onLeaderboard, currentUserId }) => {
  const meta      = TYPE_META[challenge.type] || { icon: '🎯', label: 'Challenge', color: '#818cf8' };
  const statusCol = STATUS_COLORS[challenge.status] || STATUS_COLORS.active;
  const isMe      = challenge.isParticipant;
  const myP       = challenge.myProgress;
  const daysLeft  = challenge.daysLeft ?? 0;
  const total     = challenge.daysTotal ?? 1;
  const timeBarPct = Math.max(0, Math.min(100, ((total - daysLeft) / total) * 100));

  return (
    <div className={`ch-card ${isMe ? 'ch-card--joined' : ''}`}>
      <div className="ch-card__head">
        <div className="ch-card__type-badge" style={{ background: meta.color + '22', color: meta.color, border: `1px solid ${meta.color}44` }}>
          {meta.icon} {meta.label}
        </div>
        <div className="ch-card__status" style={{ background: statusCol.bg, color: statusCol.text, border: `1px solid ${statusCol.border}` }}>
          {challenge.status}
        </div>
      </div>

      <h3 className="ch-card__title">{challenge.title}</h3>
      {challenge.description && <p className="ch-card__desc">{challenge.description}</p>}

      {/* Target info */}
      <div className="ch-card__target">
        {challenge.type !== 'no_spend' && challenge.targetValue > 0 && (
          <span>
            Target: <strong style={{ color: meta.color }}>
              {challenge.type === 'transaction_count'
                ? `${challenge.targetValue} txns`
                : fmt(challenge.targetValue, challenge.currency)}
            </strong>
          </span>
        )}
        {challenge.targetCategory && <span>📁 {challenge.targetCategory}</span>}
      </div>

      {/* Time bar */}
      <div className="ch-time-row">
        <Calendar size={12} style={{ color: 'var(--color-text-secondary)' }} />
        <div className="ch-time-bar">
          <div className="ch-time-fill" style={{ width: `${timeBarPct}%` }} />
        </div>
        <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', flexShrink: 0 }}>
          {daysLeft}d left
        </span>
      </div>

      {/* My progress */}
      {isMe && myP && challenge.type !== 'no_spend' && (
        <div className="ch-my-progress">
          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>My progress</span>
          <ProgressBar current={myP.currentValue} target={challenge.targetValue} type={challenge.type} color={meta.color} />
          <span style={{ fontSize: 12, color: meta.color, fontWeight: 700 }}>
            {challenge.type === 'transaction_count'
              ? `${fmtNum(myP.currentValue)} txns`
              : fmt(myP.currentValue, challenge.currency)}
          </span>
        </div>
      )}
      {isMe && myP && challenge.type === 'no_spend' && (
        <div className="ch-my-progress">
          <span style={{ fontSize: 11, color: myP.currentValue === 0 ? '#4ade80' : '#f87171', fontWeight: 600 }}>
            {myP.currentValue === 0 ? '✅ Zero spend! Keep it up' : `⚠️ ${fmt(myP.currentValue, challenge.currency)} spent`}
          </span>
        </div>
      )}

      {/* Stats row */}
      <div className="ch-card__stats">
        <span><Users size={12} /> {challenge.participants?.length || 0} joined</span>
        {challenge.badge && (
          <span style={{ color: challenge.badge.color }}>
            {challenge.badge.icon} {challenge.badge.name}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="ch-card__actions">
        <button className="ch-btn ch-btn--ghost ch-btn--sm" onClick={() => onLeaderboard(challenge)}>
          <Trophy size={13} /> Board
        </button>
        {isMe ? (
          <>
            <button className="ch-btn ch-btn--ghost ch-btn--sm" onClick={() => onRefresh(challenge._id)}>
              <RefreshCw size={13} /> Sync
            </button>
            {!challenge.isCreator && (
              <button className="ch-btn ch-btn--danger ch-btn--sm" onClick={() => onLeave(challenge._id)}>
                Leave
              </button>
            )}
          </>
        ) : (
          challenge.status !== 'completed' && challenge.status !== 'cancelled' && (
            <button className="ch-btn ch-btn--primary ch-btn--sm" onClick={() => onJoin(challenge._id)}>
              <Zap size={13} /> Join
            </button>
          )
        )}
      </div>
    </div>
  );
};

// ── Main Challenges Page ──────────────────────────────────────────────────────
const Challenges = () => {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [lbChallenge, setLbChallenge] = useState(null);
  const [tab,   setTab]   = useState('all');
  const [search,setSearch]= useState('');
  const [filter,setFilter]= useState('');
  const [acting,setActing]= useState(null);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });

  const fetchChallenges = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 12 };
      if (filter) params.type = filter;
      if (tab === 'mine') params.status = undefined; // all statuses but filter in UI
      const res = await challengeAPI.list(params);
      const { challenges: list = [], pagination: pag } = res.data?.data || {};
      setChallenges(list);
      if (pag) setPagination(pag);
    } catch {
      toast.error('Failed to load challenges');
    } finally {
      setLoading(false);
    }
  }, [filter, tab]);

  useEffect(() => { fetchChallenges(); }, [fetchChallenges]);

  const handleJoin = async (id) => {
    setActing(id);
    try {
      await challengeAPI.join(id);
      toast.success('Joined challenge! 🎯');
      fetchChallenges();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to join');
    } finally { setActing(null); }
  };

  const handleLeave = async (id) => {
    if (!window.confirm('Leave this challenge?')) return;
    setActing(id);
    try {
      await challengeAPI.leave(id);
      toast.success('Left challenge');
      fetchChallenges();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to leave');
    } finally { setActing(null); }
  };

  const handleRefresh = async (id) => {
    setActing(id);
    try {
      const res = await challengeAPI.refreshProgress(id);
      const { currentValue, completed } = res.data?.data || {};
      toast.success(`Progress updated! ${completed ? '🎉 Challenge complete!' : ''}`);
      fetchChallenges();
    } catch {
      toast.error('Failed to refresh progress');
    } finally { setActing(null); }
  };

  const userId = user?._id?.toString();

  // Filter
  let filtered = challenges;
  if (tab === 'mine')   filtered = challenges.filter(c => c.isParticipant || c.isCreator);
  if (tab === 'active') filtered = challenges.filter(c => c.status === 'active');
  if (search.trim())    filtered = filtered.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    (c.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const myBadges = challenges
    .filter(c => c.isParticipant && c.myProgress?.badgeEarned)
    .map(c => ({ ...c.badge, challengeTitle: c.title }));

  const stats = {
    total:    challenges.length,
    joined:   challenges.filter(c => c.isParticipant).length,
    completed:challenges.filter(c => c.isParticipant && c.myProgress?.completed).length,
  };

  return (
    <div className="ch-page">
      {/* Header */}
      <div className="ch-page__hdr">
        <div>
          <h1 className="ch-title">Challenges</h1>
          <p className="ch-sub">Compete with friends on financial goals</p>
        </div>
        <button className="ch-btn ch-btn--primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> Create Challenge
        </button>
      </div>

      {/* Stats row */}
      <div className="ch-stat-row">
        <div className="ch-stat"><div className="ch-stat__val">{stats.total}</div><div className="ch-stat__lbl">Total</div></div>
        <div className="ch-stat"><div className="ch-stat__val" style={{ color: '#4ade80' }}>{stats.joined}</div><div className="ch-stat__lbl">Joined</div></div>
        <div className="ch-stat"><div className="ch-stat__val" style={{ color: '#fbbf24' }}>{stats.completed}</div><div className="ch-stat__lbl">Completed</div></div>
        <div className="ch-stat"><div className="ch-stat__val" style={{ color: '#818cf8' }}>{myBadges.length}</div><div className="ch-stat__lbl">Badges</div></div>
      </div>

      {/* My badges */}
      {myBadges.length > 0 && (
        <div className="ch-badges-row">
          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 600 }}>MY BADGES</span>
          {myBadges.map((b, i) => (
            <span key={i} className="ch-badge-chip" style={{ background: (b.color || '#f59e0b') + '22', color: b.color || '#f59e0b', border: `1px solid ${(b.color || '#f59e0b')}44` }}>
              {b.icon} {b.name}
            </span>
          ))}
        </div>
      )}

      {/* Tabs + Search + Filter */}
      <div className="ch-toolbar">
        <div className="ch-tabs">
          {[['all','All'],['mine','My Challenges'],['active','Active']].map(([v,l]) => (
            <button key={v} className={`ch-tab ${tab === v ? 'active' : ''}`} onClick={() => setTab(v)}>{l}</button>
          ))}
        </div>
        <div className="ch-toolbar__right">
          <div className="ch-search-wrap">
            <Search size={13} className="ch-search-ico" />
            <input className="ch-search-input" placeholder="Search…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="ch-select" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="">All Types</option>
            {CHALLENGE_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
          </select>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="ch-grid">
          {Array(6).fill(0).map((_, i) => <div key={i} className="ch-skeleton-card" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="ch-empty ch-empty--full">
          <Target size={40} />
          <h3>{tab === 'mine' ? "You haven't joined any challenges yet" : 'No challenges found'}</h3>
          <p>{tab === 'mine' ? 'Create one or join a public challenge' : 'Be the first to create a challenge!'}</p>
          <button className="ch-btn ch-btn--primary" onClick={() => setShowCreate(true)}>
            <Plus size={15} /> Create Challenge
          </button>
        </div>
      ) : (
        <div className="ch-grid">
          {filtered.map(c => (
            <ChallengeCard
              key={c._id}
              challenge={c}
              onJoin={handleJoin}
              onLeave={handleLeave}
              onRefresh={handleRefresh}
              onLeaderboard={setLbChallenge}
              currentUserId={userId}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="ch-pagination">
          {Array.from({ length: pagination.pages }, (_, i) => (
            <button key={i} className={`ch-page-btn ${pagination.page === i+1 ? 'active' : ''}`}
              onClick={() => fetchChallenges(i + 1)}>{i + 1}</button>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreate={(c) => { if (c) setChallenges(prev => [c, ...prev]); }}
        />
      )}
      {lbChallenge && (
        <LeaderboardDrawer challenge={lbChallenge} onClose={() => setLbChallenge(null)} />
      )}
    </div>
  );
};

export default Challenges;