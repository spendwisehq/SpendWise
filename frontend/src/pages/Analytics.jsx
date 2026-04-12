import React, { useState } from 'react';
import { Lightbulb, RefreshCw, BarChart3 } from 'lucide-react';
import { useTransactionSummary } from '../hooks/useDashboardStats';
import { useAIAnalysis } from '../hooks/useAIAnalysis';
import { useAuth } from '../context/AuthContext';
import AnalyticsCards from '../components/analytics/AnalyticsCards';
import AnalyticsTrendChart from '../components/analytics/AnalyticsTrendChart';
import CategoryBreakdown from '../components/analytics/CategoryBreakdown';
import AIAnalysisPanel from '../components/analytics/AIAnalysisPanel';
import EmptyState from '../components/ui/EmptyState';
import './Analytics.css';

const COLORS = ['#1D9E75','#E85D24','#378ADD','#EF9F27','#7F77DD','#D4537E','#3B6D11','#993556'];

const Analytics = () => {
  const { user } = useAuth();
  const currency = user?.currency || 'INR';
  const now = new Date();

  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());

  const { data: summary, isLoading: loading } = useTransactionSummary(month, year);
  const { analysis, insights, isLoading: aiLoading, fetchAIInsights } = useAIAnalysis(month, year);

  const pieData = (summary?.categoryBreakdown || []).slice(0, 7).map((b, i) => ({
    name: b._id || 'Other', value: b.total, color: COLORS[i % COLORS.length],
  }));

  const trendData = (summary?.dailyTrend || []).map(d => ({
    date: d._id?.slice(5), Expense: d.expense, Income: d.income,
  }));

  const months = [];
  for (let i = 1; i <= 12; i++) months.push(i);
  const years = [now.getFullYear() - 1, now.getFullYear()];

  return (
    <div className="analytics-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Spending insights and trends</p>
        </div>
        <div className="page-actions">
          <select value={month} onChange={e => setMonth(parseInt(e.target.value))} className="period-select">
            {months.map(m => <option key={m} value={m}>{new Date(2026, m-1).toLocaleString('en-IN', { month: 'long' })}</option>)}
          </select>
          <select value={year} onChange={e => setYear(parseInt(e.target.value))} className="period-select">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="btn btn--primary" onClick={fetchAIInsights} disabled={aiLoading}>
            {aiLoading ? <RefreshCw size={16} className="spin" /> : <Lightbulb size={16} />}
            AI Insights
          </button>
        </div>
      </div>

      <AnalyticsCards summary={summary?.summary} currency={currency} loading={loading} />

      {!loading && trendData.length === 0 && pieData.length === 0 ? (
        <EmptyState
          icon={<BarChart3 size={36} />}
          title="No data yet"
          description="Add some transactions to see your spending insights"
        />
      ) : (
        <div className="analytics-charts">
          <AnalyticsTrendChart data={trendData} loading={loading} />
          <CategoryBreakdown data={pieData} currency={currency} loading={loading} />
        </div>
      )}

      <AIAnalysisPanel analysis={analysis} insights={insights} currency={currency} />
    </div>
  );
};

export default Analytics;
