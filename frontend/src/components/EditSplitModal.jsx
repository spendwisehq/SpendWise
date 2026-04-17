// frontend/src/components/EditSplitModal.jsx

import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';

// ── inline Avatar so this file is self-contained ────────────────────────────
const AvatarLocal = ({ name = '', size = 38, you = false }) => {
  const initials = (name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const colors = [
    ['#6366f1', '#8b5cf6'], ['#ec4899', '#f43f5e'], ['#f97316', '#fb923c'],
    ['#22c55e', '#16a34a'], ['#06b6d4', '#0891b2'], ['#a855f7', '#9333ea'],
  ];
  const [c1, c2] = colors[(name?.charCodeAt(0) || 0) % colors.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `linear-gradient(135deg,${c1},${c2})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.32, fontWeight: 800, color: '#fff',
      border: you ? '2px solid #6366f1' : 'none',
      boxShadow: you ? '0 0 0 2px rgba(99,102,241,0.3)' : 'none',
    }}>{initials}</div>
  );
};

const fmt = (v) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(v || 0);

const CATEGORIES = [
  'General', 'Food & Dining', 'Transport', 'Shopping',
  'Entertainment', 'Utilities', 'Accommodation', 'Medical', 'Other',
];

// ─────────────────────────────────────────────────────────────────────────────
// EditSplitModal
//
// Props:
//   split       – the existing split object
//   group       – the group object (needs group._id and group.members)
//   currentUser – { _id, name, … }
//   onClose()   – close without saving
//   onSaved(updatedSplit) – called with the fresh split from the server
// ─────────────────────────────────────────────────────────────────────────────
const EditSplitModal = ({ split, group, currentUser, onClose, onSaved }) => {
  const members = group?.members || [];

  const [form, setForm] = useState({
    title:       split.title                            || '',
    totalAmount: split.totalAmount?.toString()          || '',
    category:    split.category                         || 'General',
    splitType:   split.splitType                        || 'equal',
    paidBy:      split.paidBy?.toString()               || currentUser._id?.toString(),
    notes:       split.notes                            || '',
  });

  // ── selectedMembers: which members are included in the split ──────────────
  const [selectedMembers, setSelectedMembers] = useState(() => {
    // Prefer the existing split's shares; fall back to all members
    if (split.shares?.length > 0) {
      return split.shares.map(s => s.userId?.toString()).filter(Boolean);
    }
    return members.map(m => m.userId?.toString());
  });

  // Derived: only the members currently selected
  const activeMembers = members.filter(m =>
    selectedMembers.includes(m.userId?.toString())
  );

  // Toggle a member in/out of the split.
  // The payer (paidBy) can never be deselected.
  const toggleMember = (uid) => {
    if (uid === form.paidBy) return; // payer is always in
    setSelectedMembers(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  // Build initial shares preserving existing per-member amounts
  const buildShares = (type, total) => {
    const count = activeMembers.length || 1;
    const amt   = parseFloat(total) || 0;
    return activeMembers.map(m => {
      const existing = split.shares?.find(s => s.userId?.toString() === m.userId?.toString());
      return {
        userId:     m.userId,
        name:       m.name,
        amount:     existing?.amount?.toString()     ?? (type === 'custom'     ? (amt / count).toFixed(2)  : ''),
        percentage: existing?.percentage?.toString() ?? (type === 'percentage' ? (100  / count).toFixed(1) : ''),
      };
    });
  };

  const [shares, setShares] = useState(() =>
    form.splitType === 'equal' ? [] : buildShares(form.splitType, form.totalAmount)
  );
  const [saving, setSaving] = useState(false);

  // ── Ensure payer is always in selectedMembers when paidBy changes ─────────
  useEffect(() => {
    setSelectedMembers(prev =>
      prev.includes(form.paidBy) ? prev : [...prev, form.paidBy]
    );
  }, [form.paidBy]);

  // ── Rebuild shares when splitType OR activeMembers changes ────────────────
  useEffect(() => {
    if (form.splitType === 'equal') {
      setShares([]);
      return;
    }
    const count = activeMembers.length || 1;
    const total = parseFloat(form.totalAmount) || 0;
    setShares(prev => activeMembers.map((m) => {
      const existing = prev.find(p => p.userId?.toString() === m.userId?.toString());
      return {
        userId:     m.userId,
        name:       m.name,
        amount:     existing?.amount     ?? (form.splitType === 'custom'     ? (total / count).toFixed(2)  : ''),
        percentage: existing?.percentage ?? (form.splitType === 'percentage' ? (100  / count).toFixed(1)   : ''),
      };
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.splitType, selectedMembers.join(',')]);

  const total       = parseFloat(form.totalAmount) || 0;
  const sharesTotal = shares.reduce((s, sh) => s + (parseFloat(sh.amount)     || 0), 0);
  const pctTotal    = shares.reduce((s, sh) => s + (parseFloat(sh.percentage) || 0), 0);

  const isValid =
    form.splitType === 'equal'      ? true :
    form.splitType === 'custom'     ? Math.abs(sharesTotal - total) < 0.5 :
    form.splitType === 'percentage' ? Math.abs(pctTotal    - 100)   < 0.1 :
    true;

  const submit = async (e) => {
    e.preventDefault();

    if (!form.title.trim()) {
      toast.error('Title is required'); return;
    }
    if (!form.totalAmount || total <= 0) {
      toast.error('Enter a valid amount'); return;
    }
    if (activeMembers.length === 0) {
      toast.error('Select at least one member to split with'); return;
    }
    if (form.splitType === 'custom' && Math.abs(sharesTotal - total) > 0.5) {
      toast.error(`Shares total ₹${sharesTotal.toFixed(0)} ≠ total ₹${total.toFixed(0)}`); return;
    }
    if (form.splitType === 'percentage' && Math.abs(pctTotal - 100) > 0.1) {
      toast.error(`Percentages total ${pctTotal.toFixed(1)}% ≠ 100%`); return;
    }

    setSaving(true);
    try {
      const payload = {
        title:       form.title.trim(),
        totalAmount: total,
        category:    form.category.trim(),
        splitType:   form.splitType,
        paidBy:      form.paidBy,
        notes:       form.notes,
      };

      if (form.splitType === 'equal') {
        // Send only the selected members so backend recalculates equal shares correctly
        payload.shares = activeMembers.map(m => ({
          userId: m.userId,
          name:   m.name,
        }));
      } else {
        payload.shares = shares.map(s => ({
          userId:     s.userId,
          name:       s.name,
          amount:     form.splitType === 'custom'     ? parseFloat(s.amount)     : undefined,
          percentage: form.splitType === 'percentage' ? parseFloat(s.percentage) : undefined,
        }));
      }

      const res = await api.put(`/groups/${group._id}/splits/${split._id}`, payload);

      const updated =
        res?.data?.split       ??
        res?.data?.data?.split ??
        res?.data;

      if (!updated || typeof updated !== 'object' || Array.isArray(updated) || !updated.title) {
        console.error('[EditSplitModal] Unexpected response shape:', res?.data);
        throw new Error('Unexpected response from server');
      }

      toast.success('Expense updated!');
      onSaved(updated);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to update expense');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="g-overlay" onClick={onClose}>
      <div className="g-modal g-modal--lg" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="g-modal__hdr">
          <h2>✏️ Edit Expense</h2>
          <button className="g-icon-btn" onClick={onClose} disabled={saving}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={submit} className="g-modal__body">

          {/* Title */}
          <div className="g-field">
            <label>Title</label>
            <input
              required
              className="g-input"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              autoFocus
            />
          </div>

          {/* Amount + Category */}
          <div className="g-row">
            <div className="g-field">
              <label>Total Amount (₹)</label>
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                className="g-input"
                value={form.totalAmount}
                onChange={e => setForm(f => ({ ...f, totalAmount: e.target.value }))}
              />
            </div>
            <div className="g-field">
              <label>Category</label>
              <select
                className="g-input"
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Paid By + Split Type */}
          <div className="g-splitwise-row">
            <span className="g-splitwise-row__label">Paid by</span>
            <div className="g-splitwise-select-wrap">
              <select
                className="g-splitwise-select"
                value={form.paidBy}
                onChange={e => setForm(f => ({ ...f, paidBy: e.target.value }))}
              >
                {members.map(m => (
                  <option key={m.userId} value={m.userId?.toString()}>
                    {m.userId?.toString() === currentUser._id?.toString() ? 'you' : m.name}
                  </option>
                ))}
              </select>
            </div>
            <span className="g-splitwise-row__label">and split</span>
            <div className="g-splitwise-select-wrap">
              <select
                className="g-splitwise-select"
                value={form.splitType}
                onChange={e => setForm(f => ({ ...f, splitType: e.target.value }))}
              >
                <option value="equal">equally</option>
                <option value="custom">by exact amounts</option>
                <option value="percentage">by percentages</option>
              </select>
            </div>
          </div>

          {/* ── Member Selector ─────────────────────────────────────────────── */}
          <div className="g-field">
            <label style={{ marginBottom: '8px', display: 'block' }}>
              Split with
              <span style={{
                marginLeft: '8px',
                fontSize: '11px',
                fontWeight: 500,
                color: 'rgba(255,255,255,0.4)',
                textTransform: 'none',
                letterSpacing: 0,
              }}>
                {activeMembers.length} of {members.length} selected
              </span>
            </label>
            <div style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              overflow: 'hidden',
            }}>
              {members.map((m, i) => {
                const uid    = m.userId?.toString();
                const isYou  = uid === currentUser._id?.toString();
                const isPayer = uid === form.paidBy;
                const checked = selectedMembers.includes(uid);

                return (
                  <div
                    key={uid}
                    onClick={() => toggleMember(uid)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 14px',
                      cursor: isPayer ? 'default' : 'pointer',
                      borderBottom: i < members.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                      background: checked
                        ? 'rgba(99,102,241,0.08)'
                        : 'transparent',
                      transition: 'background 0.15s ease',
                      userSelect: 'none',
                    }}
                  >
                    <AvatarLocal name={m.name} size={30} you={isYou} />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: checked ? '#fff' : 'rgba(255,255,255,0.6)',
                        transition: 'color 0.15s',
                      }}>
                        {isYou ? 'You' : m.name}
                      </div>
                      {isPayer && (
                        <div style={{
                          fontSize: '11px',
                          color: '#6366f1',
                          fontWeight: 500,
                          marginTop: '1px',
                        }}>
                          Paid · always included
                        </div>
                      )}
                    </div>

                    {/* Custom checkbox */}
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '6px',
                      border: checked
                        ? '2px solid #6366f1'
                        : '2px solid rgba(255,255,255,0.2)',
                      background: checked ? '#6366f1' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'all 0.15s ease',
                      opacity: isPayer ? 0.5 : 1,
                    }}>
                      {checked && <Check size={12} color="#fff" strokeWidth={3} />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Equal split preview */}
          {form.splitType === 'equal' && activeMembers.length > 0 && total > 0 && (
            <div className="g-equal-preview">
              {activeMembers.map((m, i) => (
                <div key={i} className="g-equal-preview__row">
                  <AvatarLocal
                    name={m.name}
                    size={24}
                    you={m.userId?.toString() === currentUser._id?.toString()}
                  />
                  <span>
                    {m.userId?.toString() === currentUser._id?.toString() ? 'You' : m.name}
                  </span>
                  <span className="g-equal-preview__amt">
                    {fmt(total / activeMembers.length)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Custom / Percentage shares */}
          {form.splitType !== 'equal' && shares.length > 0 && (
            <div className="g-shares">
              <div className="g-shares__hdr">
                <span>Member Shares</span>
                <span className={`g-shares__total ${isValid ? 'valid' : 'invalid'}`}>
                  {form.splitType === 'custom'
                    ? `₹${sharesTotal.toFixed(0)} / ₹${total.toFixed(0)}`
                    : `${pctTotal.toFixed(1)}% / 100%`}
                </span>
              </div>
              {shares.map((s, i) => (
                <div key={i} className="g-share-row">
                  <AvatarLocal
                    name={s.name}
                    size={28}
                    you={s.userId?.toString() === currentUser._id?.toString()}
                  />
                  <span className="g-share-name">
                    {s.userId?.toString() === currentUser._id?.toString() ? 'You' : s.name}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="g-input g-input--sm"
                    value={form.splitType === 'custom' ? s.amount : s.percentage}
                    onChange={e => {
                      const ns = [...shares];
                      if (form.splitType === 'custom') ns[i] = { ...ns[i], amount: e.target.value };
                      else                             ns[i] = { ...ns[i], percentage: e.target.value };
                      setShares(ns);
                    }}
                    placeholder={form.splitType === 'percentage' ? '%' : '₹'}
                  />
                  <span className="g-share-suffix">
                    {form.splitType === 'percentage' ? '%' : '₹'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Notes */}
          <div className="g-field">
            <label>Notes</label>
            <textarea
              className="g-input"
              rows={2}
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Add a note…"
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className="g-modal__ftr">
            <button
              type="button"
              className="g-btn g-btn--ghost"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="g-btn g-btn--primary"
              disabled={saving || !isValid || activeMembers.length === 0}
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditSplitModal;