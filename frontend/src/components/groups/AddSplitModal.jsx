import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAddSplit } from '../../hooks/useGroups';

const AddSplitModal = ({ group, onClose }) => {
  const [form,   setForm]   = useState({ title: '', totalAmount: '', splitType: 'equal', category: 'General' });
  const [shares, setShares] = useState([]);
  const addSplit = useAddSplit(group._id);

  useEffect(() => {
    if (form.splitType !== 'equal' && group?.members?.length > 0) {
      const count = group.members.length;
      setShares(group.members.map(m => ({
        userId: m.userId, name: m.name,
        amount: form.splitType === 'custom' ? ((parseFloat(form.totalAmount) || 0) / count).toFixed(2) : '',
        percentage: form.splitType === 'percentage' ? (100 / count).toFixed(1) : '',
      })));
    }
  }, [form.splitType, form.totalAmount, group]);

  const submit = (e) => {
    e.preventDefault();
    const payload = { title: form.title, totalAmount: parseFloat(form.totalAmount), splitType: form.splitType, category: form.category };
    if (form.splitType !== 'equal') {
      payload.shares = shares.map(s => ({
        userId: s.userId, name: s.name,
        amount: form.splitType === 'custom' ? parseFloat(s.amount) : undefined,
        percentage: form.splitType === 'percentage' ? parseFloat(s.percentage) : undefined,
      }));
    }
    addSplit.mutate(payload, { onSuccess: () => onClose() });
  };

  const total = parseFloat(form.totalAmount) || 0;
  const sharesTotal = shares.reduce((s, sh) => s + (parseFloat(sh.amount) || 0), 0);
  const pctTotal    = shares.reduce((s, sh) => s + (parseFloat(sh.percentage) || 0), 0);

  return (
    <div className="g-overlay" onClick={onClose}>
      <div className="g-modal g-modal--lg" onClick={e => e.stopPropagation()}>
        <div className="g-modal__hdr"><h2>Add Expense</h2><button className="g-icon-btn" onClick={onClose}><X size={16}/></button></div>
        <form onSubmit={submit} className="g-modal__body">
          <div className="g-field">
            <label>Title</label>
            <input required className="g-input" value={form.title} onChange={e => setForm(f=>({...f,title:e.target.value}))} placeholder="e.g. Hotel Booking" />
          </div>
          <div className="g-row">
            <div className="g-field">
              <label>Total Amount (₹)</label>
              <input required type="number" min="1" step="0.01" className="g-input" value={form.totalAmount} onChange={e => setForm(f=>({...f,totalAmount:e.target.value}))} placeholder="0" />
            </div>
            <div className="g-field">
              <label>Category</label>
              <input className="g-input" value={form.category} onChange={e => setForm(f=>({...f,category:e.target.value}))} placeholder="General" />
            </div>
          </div>
          <div className="g-field">
            <label>Split Type</label>
            <div className="g-tabs">
              {['equal','custom','percentage'].map(t => (
                <button key={t} type="button" className={`g-tab ${form.splitType===t?'active':''}`} onClick={() => setForm(f=>({...f,splitType:t}))}>
                  {t==='equal'?'Equal':t==='custom'?'Custom':'% Percentage'}
                </button>
              ))}
            </div>
          </div>
          {form.splitType !== 'equal' && shares.length > 0 && (
            <div className="g-shares">
              <div className="g-shares__hdr">
                <span>Member Shares</span>
                <span className={`g-shares__total ${(form.splitType==='custom'?Math.abs(sharesTotal-total)<0.5:Math.abs(pctTotal-100)<0.1)?'valid':'invalid'}`}>
                  {form.splitType==='custom'?`₹${sharesTotal.toFixed(0)} / ₹${total.toFixed(0)}`:`${pctTotal.toFixed(1)}% / 100%`}
                </span>
              </div>
              {shares.map((s, i) => (
                <div key={i} className="g-share-row">
                  <span className="g-share-name">{s.name}</span>
                  <input type="number" min="0" step="0.01" className="g-input g-input--sm"
                    value={form.splitType==='custom'?s.amount:s.percentage}
                    onChange={e => { const ns=[...shares]; if(form.splitType==='custom')ns[i].amount=e.target.value; else ns[i].percentage=e.target.value; setShares(ns); }}
                    placeholder={form.splitType==='percentage'?'%':'₹'} />
                  <span className="g-share-suffix">{form.splitType==='percentage'?'%':'₹'}</span>
                </div>
              ))}
            </div>
          )}
          <div className="g-modal__ftr">
            <button type="button" className="g-btn g-btn--ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="g-btn g-btn--primary" disabled={addSplit.isPending}>{addSplit.isPending?'Adding...':'Add Expense'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddSplitModal;
