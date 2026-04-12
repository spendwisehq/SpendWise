import React from 'react';
import { TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { fmt } from '../../utils/format';

const AnalyticsCards = ({ summary, currency, loading }) => {
  const s = summary || {};

  const cards = [
    { label: 'Total Income',  value: s.totalIncome  || 0, icon: TrendingUp,   color: 'var(--color-success)' },
    { label: 'Total Expense', value: s.totalExpense || 0, icon: TrendingDown,  color: 'var(--color-danger)' },
    { label: 'Net Savings',   value: s.netSavings   || 0, icon: TrendingUp,   color: 'var(--color-info)' },
    { label: 'Transactions',  value: s.count        || 0, icon: Calendar,     color: 'var(--color-warning)', noFmt: true },
  ];

  return (
    <div className="analytics-cards">
      {cards.map(({ label, value, icon: Icon, color, noFmt }) => (
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
  );
};

export default AnalyticsCards;
