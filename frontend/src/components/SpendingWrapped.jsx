// frontend/src/components/SpendingWrapped.jsx
// STAGE 5 — Feature 4: Annual Spending Wrapped
// A Spotify-Wrapped-style shareable card with year-end financial highlights.
// Usage: <SpendingWrapped year={2026} onClose={() => setShowWrapped(false)} />

import React, { useState, useEffect, useRef } from 'react';
import api from '../api/axios';

const fmt = n => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0,
}).format(n);

const SLIDES = [
  'intro', 'spending', 'category', 'merchant', 'savings', 'score', 'finale',
];

// Gradient palettes per slide
const PALETTES = {
  intro:    ['#0f0c29', '#302b63', '#24243e'],
  spending: ['#1a1a2e', '#16213e', '#0f3460'],
  category: ['#0d0d0d', '#1a0533', '#2d1b69'],
  merchant: ['#003d1a', '#006633', '#00994d'],
  savings:  ['#1a0a00', '#4d1f00', '#8b3300'],
  score:    ['#0a1628', '#112244', '#1e3a5f'],
  finale:   ['#0f0c29', '#24243e', '#302b63'],
};

export default function SpendingWrapped({ year, onClose }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [slide,   setSlide]   = useState(0);
  const [animIn,  setAnimIn]  = useState(true);
  const cardRef = useRef(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get(`/transactions/wrapped?year=${year}`);
        setData(res.data?.wrapped || res.wrapped || null);
      } catch (e) {
        console.error('Wrapped fetch error', e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [year]);

  const goNext = () => {
    if (slide >= SLIDES.length - 1) return;
    setAnimIn(false);
    setTimeout(() => { setSlide(s => s + 1); setAnimIn(true); }, 200);
  };

  const goPrev = () => {
    if (slide === 0) return;
    setAnimIn(false);
    setTimeout(() => { setSlide(s => s - 1); setAnimIn(true); }, 200);
  };

  // Share as image using canvas (fallback: copy text)
  const handleShare = async () => {
    const text =
      `🎉 My ${year} SpendWise Wrapped!\n\n` +
      `💸 Total Spent: ${fmt(data.totalExpense)}\n` +
      `💰 Saved: ${data.savingsRate}% of income\n` +
      `🏆 Top Category: ${data.biggestCategory?.name}\n` +
      `🔥 Fav Merchant: ${data.topMerchant?.name} (${data.topMerchant?.count}x)\n` +
      `📊 Financial Score: ${data.financialScore || 'N/A'}/100\n\n` +
      `Track yours at SpendWise! 💚`;

    if (navigator.share) {
      await navigator.share({ title: 'My SpendWise Wrapped', text });
    } else {
      await navigator.clipboard.writeText(text);
      alert('Copied to clipboard! Share it anywhere 🎉');
    }
  };

  if (loading) {
    return (
      <div style={S.overlay}>
        <div style={S.card}>
          <div style={S.loader}>
            <div style={S.spinnerRing} />
            <p style={{ color: '#fff', marginTop: 16, fontSize: 14 }}>Building your Wrapped...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={S.overlay}>
        <div style={{ ...S.card, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <div style={{ fontSize: 48 }}>📭</div>
          <p style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>No data for {year}</p>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>Add transactions to see your Wrapped</p>
          <button onClick={onClose} style={S.closeBtn}>Close</button>
        </div>
      </div>
    );
  }

  const palette = PALETTES[SLIDES[slide]];
  const bg = `linear-gradient(135deg, ${palette[0]} 0%, ${palette[1]} 50%, ${palette[2]} 100%)`;

  return (
    <div style={S.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div ref={cardRef} style={{ ...S.card, background: bg, opacity: animIn ? 1 : 0, transform: animIn ? 'scale(1)' : 'scale(0.96)', transition: 'all 0.2s ease' }}>

        {/* Close */}
        <button onClick={onClose} style={S.xBtn}>✕</button>

        {/* Progress dots */}
        <div style={S.dots}>
          {SLIDES.map((_, i) => (
            <div key={i} style={{
              ...S.dot,
              background: i === slide ? '#fff' : 'rgba(255,255,255,0.3)',
              width: i === slide ? 24 : 8,
            }} />
          ))}
        </div>

        {/* Slide content */}
        <div style={S.content}>
          {slide === 0 && <SlideIntro data={data} year={year} />}
          {slide === 1 && <SlideSpending data={data} />}
          {slide === 2 && <SlideCategory data={data} />}
          {slide === 3 && <SlideMerchant data={data} />}
          {slide === 4 && <SlideSavings data={data} />}
          {slide === 5 && <SlideScore data={data} />}
          {slide === 6 && <SlideFinale data={data} year={year} onShare={handleShare} />}
        </div>

        {/* Nav arrows */}
        <div style={S.nav}>
          <button onClick={goPrev} disabled={slide === 0} style={{ ...S.navBtn, opacity: slide === 0 ? 0.2 : 1 }}>←</button>
          {slide < SLIDES.length - 1
            ? <button onClick={goNext} style={S.navBtnPrimary}>Next →</button>
            : <button onClick={handleShare} style={S.navBtnPrimary}>Share 🎉</button>
          }
        </div>
      </div>

      <style>{`
        @keyframes wrappedFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes wrappedSpin  { to{transform:rotate(360deg)} }
        @keyframes wrappedPop   { 0%{transform:scale(0)} 60%{transform:scale(1.1)} 100%{transform:scale(1)} }
      `}</style>
    </div>
  );
}

// ── Individual slides ──────────────────────────────────────────────────────────

const SlideIntro = ({ data, year }) => (
  <div style={{ textAlign: 'center' }}>
    <div style={{ fontSize: 72, animation: 'wrappedFloat 2s ease-in-out infinite' }}>🎊</div>
    <p style={S.eyebrow}>{year} in Review</p>
    <h1 style={{ ...S.headline, fontSize: 36 }}>{data.userName?.split(' ')[0]}'s</h1>
    <h1 style={{ ...S.headline, fontSize: 48, color: '#1D9E75' }}>SpendWise Wrapped</h1>
    <p style={S.sub}>Your financial year, beautifully summarised</p>
    <div style={S.statRow}>
      <div style={S.statPill}><span style={S.statNum}>{data.transactionCount}</span><span style={S.statLbl}>transactions</span></div>
      <div style={S.statPill}><span style={S.statNum}>{data.activeDays}</span><span style={S.statLbl}>active days</span></div>
    </div>
  </div>
);

const SlideSpending = ({ data }) => (
  <div style={{ textAlign: 'center' }}>
    <div style={{ fontSize: 56 }}>💸</div>
    <p style={S.eyebrow}>You spent a total of</p>
    <h1 style={{ ...S.headline, fontSize: 42, color: '#ff6b6b' }}>{fmt(data.totalExpense)}</h1>
    <p style={S.sub}>in {new Date().getFullYear()}</p>
    <div style={{ margin: '24px 0', padding: '16px 24px', background: 'rgba(255,255,255,0.08)', borderRadius: 16 }}>
      <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: 0 }}>That's roughly</p>
      <p style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: '4px 0' }}>{fmt(data.dailyAverage)}</p>
      <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: 0 }}>per day on average</p>
    </div>
    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>Income received: {fmt(data.totalIncome)}</p>
  </div>
);

const SlideCategory = ({ data }) => (
  <div style={{ textAlign: 'center' }}>
    <div style={{ fontSize: 56, animation: 'wrappedPop 0.5s ease-out' }}>🏆</div>
    <p style={S.eyebrow}>Your top spending category was</p>
    <h1 style={{ ...S.headline, fontSize: 38 }}>{data.biggestCategory?.name || 'N/A'}</h1>
    <div style={{ margin: '20px 0', padding: '20px', background: 'rgba(255,255,255,0.1)', borderRadius: 20 }}>
      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, margin: '0 0 8px' }}>You spent</p>
      <p style={{ color: '#FFD700', fontSize: 32, fontWeight: 800, margin: 0 }}>
        {fmt(data.biggestCategory?.amount || 0)}
      </p>
      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, margin: '8px 0 0' }}>in this category alone</p>
    </div>
    <p style={S.sub}>No judgment — just data 😄</p>
  </div>
);

const SlideMerchant = ({ data }) => (
  <div style={{ textAlign: 'center' }}>
    <div style={{ fontSize: 56 }}>🔥</div>
    <p style={S.eyebrow}>Your most visited merchant</p>
    <h1 style={{ ...S.headline, fontSize: 38, color: '#00ff88' }}>{data.topMerchant?.name || 'N/A'}</h1>
    <div style={{ margin: '20px auto', width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: 42, fontWeight: 900, color: '#fff' }}>{data.topMerchant?.count || 0}</span>
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>visits</span>
    </div>
    {data.mostExpensive && (
      <div style={{ marginTop: 16, padding: '12px 20px', background: 'rgba(255,255,255,0.08)', borderRadius: 14 }}>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, margin: '0 0 4px' }}>💎 Biggest single spend</p>
        <p style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: 0 }}>
          {fmt(data.mostExpensive.amount)} at {data.mostExpensive.merchant}
        </p>
      </div>
    )}
  </div>
);

const SlideSavings = ({ data }) => {
  const rate = data.savingsRate || 0;
  const emoji = rate >= 30 ? '🌟' : rate >= 20 ? '💪' : rate >= 10 ? '📈' : '💡';
  const msg   = rate >= 30 ? 'Outstanding saver!' : rate >= 20 ? 'Great discipline!' : rate >= 10 ? 'Getting there!' : 'Room to grow!';
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 56 }}>{emoji}</div>
      <p style={S.eyebrow}>Your savings rate this year</p>
      <h1 style={{ ...S.headline, fontSize: 64, color: rate >= 20 ? '#00ff88' : '#FFD700' }}>{rate}%</h1>
      <p style={{ ...S.sub, color: '#fff', fontSize: 18, fontWeight: 700 }}>{msg}</p>
      {data.bestSavingMonth && (
        <div style={{ margin: '20px 0', padding: '16px', background: 'rgba(255,255,255,0.1)', borderRadius: 16 }}>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, margin: '0 0 6px' }}>Best saving month</p>
          <p style={{ color: '#00ff88', fontSize: 22, fontWeight: 800, margin: 0 }}>
            {data.bestSavingMonth.name} — saved {fmt(data.bestSavingMonth.savings)}
          </p>
        </div>
      )}
    </div>
  );
};

const SlideScore = ({ data }) => {
  const score = data.financialScore;
  const grade = data.scoreGrade;
  const color = !score ? '#888' : score >= 80 ? '#00ff88' : score >= 60 ? '#FFD700' : '#ff6b6b';
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 48 }}>📊</div>
      <p style={S.eyebrow}>Your financial health score</p>
      {score ? (
        <>
          <div style={{ margin: '16px auto', width: 140, height: 140, borderRadius: '50%', border: `6px solid ${color}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 30px ${color}44` }}>
            <span style={{ fontSize: 48, fontWeight: 900, color }}>{score}</span>
            <span style={{ fontSize: 20, fontWeight: 700, color }}>{grade}</span>
          </div>
          <p style={S.sub}>out of 100</p>
        </>
      ) : (
        <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: 24 }}>
          Run AI Analysis in Goals to calculate your score
        </p>
      )}
    </div>
  );
};

const SlideFinale = ({ data, year, onShare }) => (
  <div style={{ textAlign: 'center' }}>
    <div style={{ fontSize: 64, animation: 'wrappedFloat 1.5s ease-in-out infinite' }}>🎉</div>
    <h1 style={{ ...S.headline, fontSize: 32 }}>That's a wrap on {year}!</h1>
    <p style={S.sub}>Keep tracking, keep growing 💚</p>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '24px 0' }}>
      {[
        [`💸`, `Spent`, fmt(data.totalExpense)],
        [`💰`, `Saved`, `${data.savingsRate}%`],
        [`🏆`, `Top Category`, data.biggestCategory?.name],
        [`📍`, `Transactions`, data.transactionCount],
      ].map(([icon, label, value]) => (
        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', background: 'rgba(255,255,255,0.08)', borderRadius: 12 }}>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>{icon} {label}</span>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{value}</span>
        </div>
      ))}
    </div>
    <button onClick={onShare} style={{ ...S.navBtnPrimary, width: '100%', fontSize: 16, padding: '14px' }}>
      Share My Wrapped 🚀
    </button>
  </div>
);

// ── Styles ─────────────────────────────────────────────────────────────────────
const S = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 16 },
  card:    { position: 'relative', width: '100%', maxWidth: 400, minHeight: 580, borderRadius: 28, padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', boxShadow: '0 32px 80px rgba(0,0,0,0.6)', overflow: 'hidden' },
  xBtn:    { position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  dots:    { display: 'flex', gap: 5, justifyContent: 'center', marginBottom: 24 },
  dot:     { height: 5, borderRadius: 3, transition: 'all 0.3s' },
  content: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 8px' },
  nav:     { display: 'flex', gap: 10, marginTop: 24 },
  navBtn:  { flex: 1, padding: '12px', background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', borderRadius: 14, cursor: 'pointer', fontSize: 15, fontWeight: 600 },
  navBtnPrimary: { flex: 2, padding: '12px', background: '#1D9E75', border: 'none', color: '#fff', borderRadius: 14, cursor: 'pointer', fontSize: 15, fontWeight: 700 },
  headline: { color: '#fff', fontWeight: 900, margin: '8px 0', lineHeight: 1.1, fontFamily: 'sans-serif' },
  eyebrow:  { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 8px' },
  sub:      { color: 'rgba(255,255,255,0.65)', fontSize: 14, margin: '8px 0 0' },
  statRow:  { display: 'flex', gap: 12, marginTop: 24, justifyContent: 'center' },
  statPill: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 20px', background: 'rgba(255,255,255,0.1)', borderRadius: 16 },
  statNum:  { color: '#fff', fontSize: 28, fontWeight: 900, lineHeight: 1 },
  statLbl:  { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 4 },
  closeBtn: { padding: '12px 28px', background: '#1D9E75', border: 'none', color: '#fff', borderRadius: 12, cursor: 'pointer', fontWeight: 700, fontSize: 15 },
  loader:   { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' },
  spinnerRing: { width: 44, height: 44, border: '4px solid rgba(255,255,255,0.2)', borderTopColor: '#1D9E75', borderRadius: '50%', animation: 'wrappedSpin 0.8s linear infinite' },
};