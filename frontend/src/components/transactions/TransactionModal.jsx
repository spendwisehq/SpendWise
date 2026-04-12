import React, { useState } from 'react';
import { TrendingUp, TrendingDown, ArrowLeftRight, X } from 'lucide-react';

const PAYMENT_METHODS = ['upi', 'cash', 'card', 'netbanking', 'wallet', 'cheque', 'other'];

const TransactionModal = ({ transaction, categories, currency, onClose, onSave, isSaving }) => {
  const [form, setForm] = useState({
    type:          transaction?.type          || 'expense',
    amount:        transaction?.amount        || '',
    merchant:      transaction?.merchant      || '',
    description:   transaction?.description   || '',
    categoryId:    transaction?.categoryId?._id || transaction?.categoryId || '',
    paymentMethod: transaction?.paymentMethod || 'upi',
    date:          transaction?.date
      ? new Date(transaction.date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    notes: transaction?.notes || '',
  });

  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.amount || parseFloat(form.amount) <= 0) {
      e.amount = 'Enter a valid amount greater than 0';
    }
    if (!form.date) {
      e.date = 'Date is required';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: '' }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSave({ ...form, amount: parseFloat(form.amount) });
  };

  const filteredCategories = categories.filter(c =>
    c.type === form.type || c.type === 'both'
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <h2>{transaction ? 'Edit Transaction' : 'Add Transaction'}</h2>
          <button className="modal__close" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="modal__form">
          <div className="type-tabs">
            {['expense', 'income', 'transfer'].map(t => (
              <button key={t} type="button"
                className={`type-tab type-tab--${t} ${form.type === t ? 'active' : ''}`}
                onClick={() => handleChange('type', t)}>
                {t === 'expense' ? <TrendingDown size={14} /> : t === 'income' ? <TrendingUp size={14} /> : <ArrowLeftRight size={14} />}
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          <div className="form-group">
            <label>Amount ({currency})</label>
            <input type="number" step="0.01" min="0.01"
              value={form.amount} onChange={e => handleChange('amount', e.target.value)}
              placeholder="0.00"
              className={`form-input form-input--amount ${errors.amount ? 'form-input--error' : ''}`}
              aria-invalid={errors.amount ? true : undefined} />
            {errors.amount && <span className="form-error" role="alert">{errors.amount}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Merchant / Name</label>
              <input type="text" value={form.merchant}
                onChange={e => handleChange('merchant', e.target.value)}
                placeholder="e.g. Swiggy" className="form-input" />
            </div>
            <div className="form-group">
              <label>Date</label>
              <input type="date" value={form.date}
                onChange={e => handleChange('date', e.target.value)}
                className={`form-input ${errors.date ? 'form-input--error' : ''}`}
                aria-invalid={errors.date ? true : undefined} />
              {errors.date && <span className="form-error" role="alert">{errors.date}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Category</label>
              <select value={form.categoryId}
                onChange={e => handleChange('categoryId', e.target.value)}
                className="form-input">
                <option value="">Uncategorized</option>
                {filteredCategories.map(c => (
                  <option key={c._id} value={c._id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Payment Method</label>
              <select value={form.paymentMethod}
                onChange={e => handleChange('paymentMethod', e.target.value)}
                className="form-input">
                {PAYMENT_METHODS.map(m => (
                  <option key={m} value={m}>{m.toUpperCase()}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Notes (optional)</label>
            <textarea value={form.notes}
              onChange={e => handleChange('notes', e.target.value)}
              placeholder="Add a note..." className="form-input form-input--textarea" rows={2} />
          </div>

          <div className="modal__footer">
            <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn--primary" disabled={isSaving}>
              {isSaving ? 'Saving...' : transaction ? 'Update' : 'Add Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionModal;
