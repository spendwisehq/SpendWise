import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { fmt } from '../../utils/format';

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__label">{label}</p>
      {payload.map((p,i) => <p key={i} style={{ color: p.color, margin:0, fontSize:12 }}>{p.name}: {fmt(p.value)}</p>)}
    </div>
  );
};

const DailyTrendChart = ({ data, loading }) => (
  <div className="chart-card chart-card--wide">
    <div className="chart-card__header">
      <h3 className="chart-card__title">Daily Spending Trend</h3>
      <div className="chart-legend">
        <span className="chart-legend__item chart-legend__item--expense">Expense</span>
        <span className="chart-legend__item chart-legend__item--income">Income</span>
      </div>
    </div>
    {loading ? <div className="skeleton skeleton--chart"/> : data.length === 0 ? (
      <div className="chart-empty">No data for this month yet</div>
    ) : (
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false}/>
          <XAxis dataKey="date" tick={{fontSize:11,fill:'var(--color-text-muted)'}} axisLine={false} tickLine={false}/>
          <YAxis tick={{fontSize:11,fill:'var(--color-text-muted)'}} axisLine={false} tickLine={false} tickFormatter={v=>`₹${v>=1000?`${(v/1000).toFixed(0)}k`:v}`}/>
          <Tooltip content={<ChartTooltip/>}/>
          <Bar dataKey="Expense" fill="var(--color-danger)"  radius={[3,3,0,0]} maxBarSize={24}/>
          <Bar dataKey="Income"  fill="var(--color-success)" radius={[3,3,0,0]} maxBarSize={24}/>
        </BarChart>
      </ResponsiveContainer>
    )}
  </div>
);

export default DailyTrendChart;
