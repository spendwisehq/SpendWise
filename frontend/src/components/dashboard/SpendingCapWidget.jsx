import React, { useState } from 'react';
import { Target, AlertTriangle, X } from 'lucide-react';
import { useBudget } from '../../hooks/useBudget';
import { fmt } from '../../utils/format';
import toast from 'react-hot-toast';

const SpendingCapWidget = ({ currency }) => {
  const { budget, setBudget } = useBudget();
  const [capInput, setCapInput] = useState('');
  const [editing,  setEditing]  = useState(false);

  const startEditing = () => {
    setCapInput(budget?.totalBudget || '');
    setEditing(true);
  };

  const saveCap = () => {
    const val = parseFloat(capInput);
    if (!val || val <= 0) { toast.error('Enter a valid amount'); return; }
    setBudget.mutate(val, {
      onSuccess: () => setEditing(false),
    });
  };

  const pct     = budget ? Math.min((budget.totalSpent / budget.totalBudget) * 100, 100) : 0;
  const symbol  = { INR:'₹', USD:'$', EUR:'€', GBP:'£' }[currency] || '₹';
  const barColor = pct >= 100 ? 'var(--color-danger)' : pct >= 80 ? 'var(--color-warning)' : 'var(--color-primary)';

  return (
    <div className="cap-widget">
      <div className="cap-widget__header">
        <div className="cap-widget__title">
          <Target size={16} color="var(--color-primary)" />
          <span>Monthly Spending Cap</span>
        </div>
        <button className="cap-edit-btn" onClick={() => editing ? setEditing(false) : startEditing()}>
          {editing ? <X size={14} /> : budget ? 'Edit' : 'Set Cap'}
        </button>
      </div>

      {editing ? (
        <div className="cap-widget__edit">
          <div className="cap-input-wrap">
            <span className="cap-symbol">{symbol}</span>
            <input type="number" className="cap-input" value={capInput}
              onChange={e => setCapInput(e.target.value)}
              placeholder="e.g. 13000" autoFocus
              onKeyDown={e => e.key === 'Enter' && saveCap()} />
          </div>
          <button className="btn btn--primary btn--sm" onClick={saveCap} disabled={setBudget.isPending}>
            {setBudget.isPending ? 'Saving...' : 'Save Cap'}
          </button>
        </div>
      ) : budget ? (
        <div className="cap-widget__progress">
          <div className="cap-progress-bar">
            <div className="cap-progress-fill" style={{ width: `${pct}%`, background: barColor }} />
          </div>
          <div className="cap-progress-labels">
            <span style={{ color: barColor, fontWeight: 700 }}>
              {pct >= 100 ? '🚨 Cap Exceeded!' : pct >= 80 ? '⚠️ ' : ''}{fmt(budget.totalSpent, currency)} spent
            </span>
            <span style={{ color: 'var(--color-text-muted)' }}>
              of {fmt(budget.totalBudget, currency)} cap
            </span>
          </div>
          {pct >= 80 && (
            <div className="cap-alert" style={{ background: pct >= 100 ? 'rgba(255,107,107,0.1)' : 'rgba(255,181,71,0.1)', color: pct >= 100 ? 'var(--color-danger)' : 'var(--color-warning)' }}>
              <AlertTriangle size={12} />
              {pct >= 100 ? 'You have exceeded your spending cap!' : `${Math.round(100-pct)}% of budget remaining`}
            </div>
          )}
        </div>
      ) : (
        <p className="cap-empty">No spending cap set. Set a limit to stay on track! 🎯</p>
      )}
    </div>
  );
};

export default SpendingCapWidget;
