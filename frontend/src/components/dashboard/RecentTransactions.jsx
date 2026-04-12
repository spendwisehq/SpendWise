import React from 'react';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fmt } from '../../utils/format';

const RecentTransactions = ({ transactions, currency, loading }) => {
  const navigate = useNavigate();

  return (
    <div className="card">
      <div className="card__header">
        <h3 className="card__title">Recent Transactions</h3>
        <button className="card__link" onClick={() => navigate('/transactions')}>View all</button>
      </div>
      {loading ? Array(5).fill(0).map((_,i) => <div key={i} className="skeleton skeleton--row"/>) :
        transactions.length === 0 ? (
          <div className="empty-state">
            <Plus size={24}/>
            <p>No transactions yet</p>
            <button className="btn btn--primary btn--sm" onClick={() => navigate('/transactions')}>Add your first</button>
          </div>
        ) : (
          <div className="txn-list">
            {transactions.map(txn => (
              <div key={txn._id} className="txn-item">
                <div className="txn-item__icon" style={{
                  background: txn.type==='income'?'rgba(29,158,117,0.12)':'rgba(255,107,107,0.12)',
                  color: txn.type==='income'?'var(--color-success)':'var(--color-danger)',
                }}>
                  {txn.categoryId?.icon||(txn.type==='income'?'💰':'💸')}
                </div>
                <div className="txn-item__info">
                  <span className="txn-item__name">{txn.merchant||txn.description||'Transaction'}</span>
                  <span className="txn-item__cat">{txn.categoryName}</span>
                </div>
                <div className="txn-item__right">
                  <span className={`txn-item__amount txn-item__amount--${txn.type}`}>
                    {txn.type==='income'?'+':'-'}{fmt(txn.amount,currency)}
                  </span>
                  <span className="txn-item__date">
                    {new Date(txn.date).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )
      }
    </div>
  );
};

export default RecentTransactions;
