import React from 'react';
import { TrendingUp, TrendingDown, ArrowLeftRight, Edit2, Trash2, Plus, Tag, Calendar } from 'lucide-react';
import { fmt } from '../../utils/format';
import Skeleton from '../ui/Skeleton';
import EmptyState from '../ui/EmptyState';
import Button from '../ui/Button';

const typeIcon = (type) => {
  if (type === 'income')  return <TrendingUp size={14} />;
  if (type === 'expense') return <TrendingDown size={14} />;
  return <ArrowLeftRight size={14} />;
};

const TransactionList = ({ transactions, loading, currency, onEdit, onDelete, onAdd }) => (
  <div className="txn-table">
    {loading ? (
      <div className="txn-skeleton-list">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="txn-skeleton-row">
            <Skeleton shape="circle" width="36px" height="36px" />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Skeleton shape="text" width={i % 2 === 0 ? '60%' : '45%'} />
              <Skeleton shape="text" width="80%" height="10px" />
            </div>
            <Skeleton shape="text" width="70px" />
          </div>
        ))}
      </div>
    ) : transactions.length === 0 ? (
      <EmptyState
        icon={<ArrowLeftRight size={36} />}
        title="No transactions yet"
        description="Add your first transaction to start tracking your spending"
        action={
          <Button variant="primary" icon={Plus} onClick={onAdd}>
            Add Transaction
          </Button>
        }
      />
    ) : transactions.map(txn => (
      <div key={txn._id} className={`txn-row txn-row--${txn.type}`}>
        <div className="txn-row__icon" style={{
          background: txn.type === 'income' ? 'rgba(29,158,117,0.12)' : txn.type === 'expense' ? 'rgba(216,90,48,0.12)' : 'rgba(55,138,221,0.12)',
          color: txn.type === 'income' ? 'var(--color-success)' : txn.type === 'expense' ? 'var(--color-danger)' : 'var(--color-info)',
        }}>
          {typeIcon(txn.type)}
        </div>

        <div className="txn-row__info">
          <span className="txn-row__name">{txn.merchant || txn.description || 'Transaction'}</span>
          <span className="txn-row__meta">
            <Tag size={10} /> {txn.categoryName}
            &nbsp;&middot;&nbsp;
            <Calendar size={10} /> {new Date(txn.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            &nbsp;&middot;&nbsp; {txn.paymentMethod?.toUpperCase()}
          </span>
        </div>

        <div className="txn-row__amount">
          <span className={`amount amount--${txn.type}`}>
            {txn.type === 'income' ? '+' : txn.type === 'expense' ? '-' : ''}{fmt(txn.amount, currency)}
          </span>
          {txn.source !== 'manual' && (
            <span className="source-badge">{txn.source}</span>
          )}
        </div>

        <div className="txn-row__actions">
          <button className="icon-btn" onClick={() => onEdit(txn)} title="Edit">
            <Edit2 size={14} />
          </button>
          <button className="icon-btn icon-btn--danger" onClick={() => onDelete(txn._id)} title="Delete">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    ))}
  </div>
);

export default TransactionList;
