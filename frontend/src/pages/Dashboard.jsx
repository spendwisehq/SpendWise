import React from 'react';
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, RefreshCw, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { fmt, CHART_COLORS } from '../utils/format';
import SpendingCapWidget from '../components/dashboard/SpendingCapWidget';
import StatCard from '../components/dashboard/StatCard';
import DailyTrendChart from '../components/dashboard/DailyTrendChart';
import SpendingChart from '../components/dashboard/SpendingChart';
import RecentTransactions from '../components/dashboard/RecentTransactions';
import MonthlySummary from '../components/dashboard/MonthlySummary';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const now   = new Date();
  const month = now.getMonth() + 1;
  const year  = now.getFullYear();
  const currency = user?.currency || 'INR';

  const { stats, summary, isLoading: loading, isRefetching: refreshing, refetch } = useDashboardStats(month, year);

  const thisMonth     = stats?.thisMonth     || {};
  const comparison    = stats?.comparison    || {};
  const recent        = stats?.recentTransactions || [];
  const breakdown     = summary?.categoryBreakdown || [];
  const dailyTrend    = summary?.dailyTrend   || [];
  const periodSummary = summary?.summary      || {};

  const trendData = dailyTrend.map(d => ({
    date: d._id?.slice(5), Expense: d.expense, Income: d.income,
  }));

  const pieData = breakdown.slice(0,6).map((b,i) => ({
    name: b._id || 'Other', value: b.total, color: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const incomeSubtitle = !thisMonth.totalIncome && user?.monthlyIncome
    ? `Declared: ${fmt(user.monthlyIncome, currency)}` : null;

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard__header">
        <div>
          <h1 className="dashboard__title">
            Good {now.getHours()<12?'morning':now.getHours()<17?'afternoon':'evening'}, {user?.name?.split(' ')[0]||'there'} 👋
          </h1>
          <p className="dashboard__subtitle">
            <Calendar size={14}/>
            {now.toLocaleDateString('en-IN',{month:'long',year:'numeric'})}
          </p>
        </div>
        <button className={`dashboard__refresh ${refreshing?'dashboard__refresh--spinning':''}`}
          onClick={() => refetch()} disabled={refreshing}>
          <RefreshCw size={16}/><span>Refresh</span>
        </button>
      </div>

      <SpendingCapWidget currency={currency} />

      {/* Stats */}
      <div className="stats-grid">
        <StatCard title="Total Expenses" value={fmt(thisMonth.totalExpense||0,currency)} icon={TrendingDown}
          trend={comparison.expenseChange} trendLabel="vs last month" color="var(--color-danger)" loading={loading}/>
        <StatCard title="Total Income" value={fmt(thisMonth.totalIncome||0,currency)} icon={TrendingUp}
          subtitle={incomeSubtitle} color="var(--color-success)" loading={loading}/>
        <StatCard title="Net Savings" value={fmt(thisMonth.netSavings||0,currency)} icon={Wallet}
          color="var(--color-info)" loading={loading}/>
        <StatCard title="Transactions" value={thisMonth.transactionCount||0} icon={ArrowUpRight}
          color="var(--color-warning)" loading={loading}/>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <DailyTrendChart data={trendData} loading={loading} />
        <SpendingChart data={pieData} currency={currency} loading={loading} />
      </div>

      {/* Bottom Row */}
      <div className="bottom-grid">
        <RecentTransactions transactions={recent} currency={currency} loading={loading} />
        <MonthlySummary summary={periodSummary} currency={currency} loading={loading} />
      </div>
    </div>
  );
};

export default Dashboard;
