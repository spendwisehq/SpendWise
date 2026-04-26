// frontend/src/pages/Analytics.jsx
// STAGE 5: Added Wrapped card trigger, CSV export, PDF export buttons

import React, { useState, useEffect } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, Lightbulb, RefreshCw, Calendar, Download, Gift } from 'lucide-react';
import transactionAPI from '../api/transaction.api';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import SpendingWrapped from '../components/SpendingWrapped';
import './Analytics.css';

const fmt = (v, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(v);

const COLORS = ['#1D9E75','#E85D24','#378ADD','#EF9F27','#7F77DD','#D4537E','#3B6D11','#993556'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '10px 14px', fontSize: '12px' }}>
      <p style={{ margin: '0 0 4px', color: 'var(--color-text-muted)', fontWeight: 600 }}>{label}</p>
      {payload.map((p, i) => <p key={i} style={{ margin: 0, color: p.color }}>{p.name}: {fmt(p.value)}</p>)}
    </div>
  );
};

const Analytics = () => {
  const { user } = useAuth();
  const currency = user?.currency || 'INR';
  const now = new Date();

  const [month,        setMonth]        = useState(now.getMonth() + 1);
  const [year,         setYear]         = useState(now.getFullYear());
  const [summary,      setSummary]      = useState(null);
  const [analysis,     setAnalysis]     = useState(null);
  const [insights,     setInsights]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [aiLoading,    setAILoading]    = useState(false);
  const [showWrapped,  setShowWrapped]  = useState(false);
  const [exportLoading, setExportLoading] = useState('');  // 'csv' | 'pdf' | ''

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await transactionAPI.getSummary({ month, year });
        setSummary(res.data);
      } catch {
        toast.error('Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [month, year]);

  const fetchAIInsights = async () => {
    setAILoading(true);
    try {
      const [analysisRes, insightsRes] = await Promise.all([
        api.get(`/ai/analysis?month=${month}&year=${year}`),
        api.get('/ai/insights'),
      ]);
      setAnalysis(analysisRes.data);
      setInsights(insightsRes.data.insights || []);
    } catch {
      toast.error('Failed to load AI insights');
    } finally {
      setAILoading(false);
    }
  };

  // ── STAGE 5: Export handlers ─────────────────────────────────────────────
  const handleExportCSV = async () => {
    setExportLoading('csv');
    try {
      // Use fetch directly so we can handle blob download
      const token = localStorage.getItem('spendwise_token');
      const res   = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/transactions/export/csv?month=${month}&year=${year}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `SpendWise_${year}-${String(month).padStart(2,'0')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('CSV downloaded!');
    } catch {
      toast.error('CSV export failed');
    } finally {
      setExportLoading('');
    }
  };

  const handleExportPDF = async () => {
    setExportLoading('pdf');
    try {
      const token = localStorage.getItem('spendwise_token');
      const res   = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/transactions/export/pdf?month=${month}&year=${year}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `SpendWise_Statement_${year}-${String(month).padStart(2,'0')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF statement downloaded!');
    } catch {
      toast.error('PDF export failed');
    } finally {
      setExportLoading('');
    }
  };

  const pieData = (summary?.categoryBreakdown || []).slice(0, 7).map((b, i) => ({
    name: b._id || 'Other', value: b.total, color: COLORS[i % COLORS.length],
  }));

  const trendData = (summary?.dailyTrend || []).map(d => ({
    date: d._id?.slice(5), Expense: d.expense, Income: d.income,
  }));

  const s      = summary?.summary || {};
  const months = [];
  for (let i = 1; i <= 12; i++) months.push(i);
  const years = [now.getFullYear() - 1, now.getFullYear()];

  const insightColors = { warning: '#EF9F27', tip: '#1D9E75', achievement: '#378ADD', alert: '#E85D24' };

  return (
    <div className="analytics-page">

      {/* Wrapped modal */}
      {showWrapped && (
        <SpendingWrapped year={year} onClose={() => setShowWrapped(false)} />
      )}

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Spending insights and trends</p>
        </div>
        <div className="page-actions" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
          <select value={month} onChange={e => setMonth(parseInt(e.target.value))} className="period-select">
            {months.map(m => <option key={m} value={m}>{new Date(2026, m-1).toLocaleString('en-IN', { month: 'long' })}</option>)}
          </select>
          <select value={year} onChange={e => setYear(parseInt(e.target.value))} className="period-select">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          {/* STAGE 5 — Export buttons */}
          <button
            className="btn btn--ghost btn--sm"
            onClick={handleExportCSV}
            disabled={exportLoading === 'csv'}
            title="Download CSV for tax purposes"
          >
            {exportLoading === 'csv' ? <RefreshCw size={14} className="spin" /> : <Download size={14} />}
            CSV
          </button>
          <button
            className="btn btn--ghost btn--sm"
            onClick={handleExportPDF}
            disabled={exportLoading === 'pdf'}
            title="Download PDF statement"
          >
            {exportLoading === 'pdf' ? <RefreshCw size={14} className="spin" /> : <Download size={14} />}
            PDF
          </button>

          {/* STAGE 5 — Wrapped button */}
          <button
            className="btn btn--wrapped"
            onClick={() => setShowWrapped(true)}
            title={`See your ${year} Spending Wrapped`}
          >
            <Gift size={14} />
            {year} Wrapped 🎉
          </button>

          <button className="btn btn--primary" onClick={fetchAIInsights} disabled={aiLoading}>
            {aiLoading ? <RefreshCw size={16} className="spin" /> : <Lightbulb size={16} />}
            AI Insights
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="analytics-cards">
        {[
          { label: 'Total Income',  value: s.totalIncome  || 0, icon: TrendingUp,   color: 'var(--color-success)' },
          { label: 'Total Expense', value: s.totalExpense || 0, icon: TrendingDown,  color: 'var(--color-danger)' },
          { label: 'Net Savings',   value: s.netSavings   || 0, icon: TrendingUp,   color: 'var(--color-info)' },
          { label: 'Transactions',  value: s.count        || 0, icon: Calendar,     color: 'var(--color-warning)', noFmt: true },
        ].map(({ label, value, icon: Icon, color, noFmt }) => (
          <div key={label} className="analytics-card">
            <div className="analytics-card__icon" style={{ background: `${color}18`, color }}>
              <Icon size={18} />
            </div>
            <div className="analytics-card__value">
              {loading ? <div className="skeleton-line" /> : noFmt ? value : fmt(value, currency)}
            </div>
            <div className="analytics-card__label">{label}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="analytics-charts">
        <div className="chart-card chart-card--wide">
          <h3 className="chart-title">Daily Trend</h3>
          {loading ? <div className="skeleton-chart" /> : trendData.length === 0 ? (
            <div className="chart-empty">No data for this period</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={trendData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false}
                  tickFormatter={v => `₹${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="Expense" fill="var(--color-danger)"  radius={[3,3,0,0]} maxBarSize={20} />
                <Bar dataKey="Income"  fill="var(--color-success)" radius={[3,3,0,0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="chart-card">
          <h3 className="chart-title">By Category</h3>
          {loading ? <div className="skeleton-chart" /> : pieData.length === 0 ? (
            <div className="chart-empty">No expenses yet</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={v => fmt(v, currency)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pie-legend">
                {pieData.map((item, i) => (
                  <div key={i} className="pie-legend-item">
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, flexShrink: 0, display: 'inline-block' }} />
                    <span style={{ flex: 1, fontSize: 12, color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)' }}>{fmt(item.value, currency)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* AI Analysis */}
      {analysis && (
        <div className="ai-analysis">
          <div className="ai-analysis__header">
            <Lightbulb size={18} color="var(--color-warning)" />
            <h3>AI Analysis</h3>
            <span className={`health-badge health-badge--${analysis.analysis?.spendingHealth}`}>
              {analysis.analysis?.spendingHealth}
            </span>
          </div>
          <p className="ai-analysis__summary">{analysis.analysis?.summary}</p>
          <div className="ai-findings">
            {(analysis.analysis?.keyFindings || []).map((f, i) => (
              <div key={i} className="finding-item">
                <span className="finding-num">{i + 1}</span>
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Insights */}
      {insights.length > 0 && (
        <div className="insights-grid">
          {insights.map((insight, i) => (
            <div key={i} className="insight-card" style={{ borderLeftColor: insightColors[insight.type] || '#888' }}>
              <div className="insight-card__header">
                <span className="insight-type" style={{ color: insightColors[insight.type] }}>
                  {insight.type?.toUpperCase()}
                </span>
                <span className={`priority-badge priority-badge--${insight.priority}`}>{insight.priority}</span>
              </div>
              <h4 className="insight-title">{insight.title}</h4>
              <p className="insight-msg">{insight.message}</p>
              {insight.potentialSaving > 0 && (
                <div className="insight-saving">
                  💰 Save up to {fmt(insight.potentialSaving, currency)}/month
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* STAGE 5 — Wrapped CTA banner (shown when no Wrapped clicked yet) */}
      <div className="wrapped-banner" onClick={() => setShowWrapped(true)}>
        <span style={{ fontSize: 24 }}>🎊</span>
        <div>
          <div style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>Your {year} Spending Wrapped is ready!</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>See your biggest category, top merchant, savings rate and more</div>
        </div>
        <span style={{ marginLeft: 'auto', color: 'var(--color-primary)', fontWeight: 700 }}>View →</span>
      </div>

      <style>{`
        .btn--wrapped {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 0.5rem 1rem;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: #fff;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 700;
          font-size: 0.8rem;
          transition: opacity 0.15s;
        }
        .btn--wrapped:hover { opacity: 0.88; }
        .wrapped-banner {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 16px 20px;
          background: linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08));
          border: 1px solid rgba(99,102,241,0.25);
          border-radius: 14px;
          cursor: pointer;
          transition: background 0.15s;
          margin-top: 8px;
        }
        .wrapped-banner:hover { background: linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.15)); }
      `}</style>
    </div>
  );
};

export default Analytics;