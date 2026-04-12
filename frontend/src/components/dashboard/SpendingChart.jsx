import React from 'react';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';
import { ResponsiveContainer } from 'recharts';
import { fmt } from '../../utils/format';

const SpendingChart = ({ data, currency, loading }) => (
  <div className="chart-card">
    <div className="chart-card__header"><h3 className="chart-card__title">By Category</h3></div>
    {loading ? <div className="skeleton skeleton--chart"/> : data.length === 0 ? (
      <div className="chart-empty">No expenses yet</div>
    ) : (
      <div className="pie-wrapper">
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
              {data.map((e,i) => <Cell key={i} fill={e.color}/>)}
            </Pie>
            <Tooltip formatter={v => fmt(v,currency)}/>
          </PieChart>
        </ResponsiveContainer>
        <div className="pie-legend">
          {data.map((item,i) => (
            <div key={i} className="pie-legend__item">
              <span className="pie-legend__dot" style={{background:item.color}}/>
              <span className="pie-legend__name">{item.name}</span>
              <span className="pie-legend__value">{fmt(item.value,currency)}</span>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);

export default SpendingChart;
