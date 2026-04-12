import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { fmt } from '../../utils/format';

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '10px 14px', fontSize: '12px' }}>
      <p style={{ margin: '0 0 4px', color: 'var(--color-text-muted)', fontWeight: 600 }}>{label}</p>
      {payload.map((p, i) => <p key={i} style={{ margin: 0, color: p.color }}>{p.name}: {fmt(p.value)}</p>)}
    </div>
  );
};

const AnalyticsTrendChart = ({ data, loading }) => (
  <div className="chart-card chart-card--wide">
    <h3 className="chart-title">Daily Trend</h3>
    {loading ? <div className="skeleton-chart" /> : data.length === 0 ? (
      <div className="chart-empty">No data for this period</div>
    ) : (
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false}
            tickFormatter={v => `₹${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
          <Tooltip content={<ChartTooltip />} />
          <Legend />
          <Bar dataKey="Expense" fill="var(--color-danger)"  radius={[3,3,0,0]} maxBarSize={20} />
          <Bar dataKey="Income"  fill="var(--color-success)" radius={[3,3,0,0]} maxBarSize={20} />
        </BarChart>
      </ResponsiveContainer>
    )}
  </div>
);

export default AnalyticsTrendChart;
