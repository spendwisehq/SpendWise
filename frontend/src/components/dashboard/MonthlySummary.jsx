import React from 'react';
import { fmt } from '../../utils/format';

const MonthlySummary = ({ summary, currency, loading }) => {
  const s = summary || {};

  return (
    <div className="card">
      <div className="card__header"><h3 className="card__title">Monthly Summary</h3></div>
      {loading ? Array(4).fill(0).map((_,i) => <div key={i} className="skeleton skeleton--row"/>) : (
        <div className="summary-list">
          {[
            { label:'Total Income',    value:s.totalIncome   ||0, color:'var(--color-success)' },
            { label:'Total Expenses',  value:s.totalExpense  ||0, color:'var(--color-danger)' },
            { label:'Net Savings',     value:s.netSavings    ||0, color:'var(--color-info)' },
            { label:'Avg Transaction', value:s.avgTransaction||0, color:'var(--color-warning)' },
          ].map(({label,value,color}) => (
            <div key={label} className="summary-row">
              <span className="summary-row__label">{label}</span>
              <span className="summary-row__value" style={{color}}>{fmt(value,currency)}</span>
            </div>
          ))}
          {s.totalIncome > 0 && (
            <div className="savings-bar">
              <div className="savings-bar__header">
                <span>Savings Rate</span>
                <span>{Math.max(0,Math.round((s.netSavings/s.totalIncome)*100))}%</span>
              </div>
              <div className="savings-bar__track">
                <div className="savings-bar__fill" style={{
                  width:`${Math.min(100,Math.max(0,Math.round((s.netSavings/s.totalIncome)*100)))}%`,
                }}/>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MonthlySummary;
