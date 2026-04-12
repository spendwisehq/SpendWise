import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { fmt } from '../../utils/format';

const CategoryBreakdown = ({ data, currency, loading }) => (
  <div className="chart-card">
    <h3 className="chart-title">By Category</h3>
    {loading ? <div className="skeleton-chart" /> : data.length === 0 ? (
      <div className="chart-empty">No expenses yet</div>
    ) : (
      <>
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
              {data.map((e, i) => <Cell key={i} fill={e.color} />)}
            </Pie>
            <Tooltip formatter={v => fmt(v, currency)} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pie-legend">
          {data.map((item, i) => (
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
);

export default CategoryBreakdown;
