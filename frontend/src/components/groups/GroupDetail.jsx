import React, { useState } from 'react';
import {
  Plus, ArrowLeftRight, ChevronRight,
  TrendingUp, TrendingDown, Trash2, CheckCircle,
  UserPlus, BarChart2,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { useGroupDetail, useSettleSplit, useDeleteGroup } from '../../hooks/useGroups';
import { fmt } from '../../utils/format';
import { TYPE_ICONS } from './constants';
import AddSplitModal from './AddSplitModal';
import AddMemberModal from './AddMemberModal';
import GroupConfirm from './GroupConfirm';

const GroupDetail = ({ groupId, onBack, onGroupDeleted }) => {
  const { user } = useAuth();
  const { group, splits, balances, isLoading: loading } = useGroupDetail(groupId);
  const settleSplit = useSettleSplit(groupId);
  const deleteGroupMutation = useDeleteGroup();

  const [tab,          setTab]          = useState('expenses');
  const [showAdd,      setShowAdd]      = useState(false);
  const [showMember,   setShowMember]   = useState(false);
  const [confirmDel,   setConfirmDel]   = useState(false);
  const [totalsPeriod, setTotalsPeriod] = useState('all');

  const handleSettle = (splitId) => {
    settleSplit.mutate({ splitId, userId: user._id });
  };

  const handleDeleteGroup = () => {
    deleteGroupMutation.mutate(groupId, {
      onSuccess: () => {
        onGroupDeleted?.(groupId);
        onBack();
      },
    });
  };

  if (!group) {
    if (loading) return <div className="g-page">{Array(3).fill(0).map((_, i) => <div key={i} className="g-skeleton"/>)}</div>;
    return null;
  }

  const totalsData = (() => {
    const now = new Date();
    return splits
      .filter(s => {
        if (totalsPeriod === 'month') return new Date(s.date).getMonth() === now.getMonth() && new Date(s.date).getFullYear() === now.getFullYear();
        if (totalsPeriod === 'year')  return new Date(s.date).getFullYear() === now.getFullYear();
        return true;
      })
      .reduce((acc, s) => {
        const key = s.category || 'General';
        const ex = acc.find(a => a.name === key);
        if (ex) ex.amount += s.totalAmount;
        else acc.push({ name: key, amount: s.totalAmount });
        return acc;
      }, [])
      .sort((a, b) => b.amount - a.amount);
  })();

  const totalSpent = splits.reduce((s, sp) => s + (sp.totalAmount || 0), 0);

  return (
    <div className="g-page">
      {/* Header */}
      <div className="g-page__hdr">
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button className="g-btn g-btn--ghost g-btn--sm" onClick={onBack}>← Back</button>
          <div>
            <h1 className="g-title">{TYPE_ICONS[group.type]} {group.name}</h1>
            <p className="g-sub">{group.members?.length} members · {fmt(group.totalExpenses || totalSpent)} total</p>
          </div>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <button className="g-btn g-btn--ghost g-btn--sm" onClick={() => setShowMember(true)}><UserPlus size={14}/> Add Member</button>
          <button className="g-btn g-btn--primary" onClick={() => setShowAdd(true)}><Plus size={14}/> Add Expense</button>
          <button className="g-btn g-btn--danger-ghost g-btn--sm" onClick={() => setConfirmDel(true)}><Trash2 size={14}/></button>
        </div>
      </div>

      {/* Tabs */}
      <div className="g-tabs g-tabs--page">
        {['expenses','balances','totals'].map(t => (
          <button key={t} className={`g-tab-page ${tab===t?'active':''}`} onClick={() => setTab(t)}>
            {t==='expenses'?'Expenses':t==='balances'?'Balances':'Totals'}
          </button>
        ))}
      </div>

      {/* Expenses Tab */}
      {tab === 'expenses' && (
        <div className="g-card">
          {loading ? Array(3).fill(0).map((_, i) => <div key={i} className="g-skeleton"/>) :
            splits.length === 0 ? (
              <div className="g-empty"><ArrowLeftRight size={24}/><p>No expenses yet. Add the first one!</p><button className="g-btn g-btn--primary" onClick={() => setShowAdd(true)}><Plus size={14}/> Add Expense</button></div>
            ) : splits.map(split => {
              const myShare = split.shares?.find(s => s.userId?.toString() === user._id?.toString());
              const myPaid  = myShare?.isPaid || split.paidBy?.toString() === user._id?.toString() || split.isSettled;
              return (
                <div key={split._id} className={`g-split-row ${split.isSettled?'g-split-row--settled':''}`}>
                  <div className="g-split-row__info">
                    <span className="g-split-row__title">{split.title}</span>
                    <span className="g-split-row__meta">{split.category} · {new Date(split.date).toLocaleDateString('en-IN',{day:'numeric',month:'short'})} · {split.splitType}</span>
                    {split.shares?.length > 0 && (
                      <div className="g-shares-list">
                        {split.shares.map((s, i) => (
                          <span key={i} className={`g-share-chip ${s.isPaid?'g-share-chip--paid':''}`}>
                            {s.isPaid?'✓ ':''}{s.name}: {fmt(s.amount)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="g-split-row__right">
                    <span className="g-split-row__amt">{fmt(split.totalAmount)}</span>
                    {split.isSettled ? <span className="g-settled-badge"><CheckCircle size={11}/> Settled</span> :
                      myPaid ? <span className="g-paid-badge">Your share paid</span> :
                      <button className="g-btn g-btn--primary g-btn--sm" onClick={() => handleSettle(split._id)}>Settle Up</button>
                    }
                  </div>
                </div>
              );
            })
          }
        </div>
      )}

      {/* Balances Tab */}
      {tab === 'balances' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {balances && (
            <div className={`g-balance-card ${(balances.myBalance||0)>=0?'g-balance-card--pos':'g-balance-card--neg'}`}>
              <div className="g-balance-card__icon">
                {(balances.myBalance||0)>=0?<TrendingUp size={22}/>:<TrendingDown size={22}/>}
              </div>
              <div>
                <div className="g-balance-card__amt">{(balances.myBalance||0)>=0?'+':''}{fmt(balances.myBalance)}</div>
                <div className="g-balance-card__lbl">{(balances.myBalance||0)>=0?'You are owed':'You owe'}</div>
              </div>
            </div>
          )}

          {balances?.memberBalances?.length > 0 && (
            <div className="g-card">
              <h3 className="g-section-title">All Balances</h3>
              {balances.memberBalances.map((m, i) => (
                <div key={i} className="g-member-balance">
                  <div className="g-member-balance__avatar">{m.name?.slice(0,2).toUpperCase()}</div>
                  <span className="g-member-balance__name">{m.name}</span>
                  <span className={`g-member-balance__amt ${m.netBalance>=0?'pos':'neg'}`}>
                    {m.netBalance===0?'Settled':m.netBalance>0?`gets back ${fmt(m.netBalance)}`:`owes ${fmt(Math.abs(m.netBalance))}`}
                  </span>
                </div>
              ))}
            </div>
          )}

          {balances?.iOwe?.length > 0 && (
            <div className="g-card">
              <h3 className="g-section-title">You Owe</h3>
              {balances.iOwe.map((d, i) => (
                <div key={i} className="g-debt-row">
                  <span>To <strong>{d.to}</strong></span>
                  <span className="g-debt-row__amt neg">{fmt(d.amount)}</span>
                </div>
              ))}
            </div>
          )}
          {balances?.owedToMe?.length > 0 && (
            <div className="g-card">
              <h3 className="g-section-title">Owed To You</h3>
              {balances.owedToMe.map((d, i) => (
                <div key={i} className="g-debt-row">
                  <span>From <strong>{d.from}</strong></span>
                  <span className="g-debt-row__amt pos">{fmt(d.amount)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="g-card">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <h3 className="g-section-title" style={{ margin:0 }}>Members ({group.members?.length})</h3>
              <button className="g-btn g-btn--ghost g-btn--sm" onClick={() => setShowMember(true)}><UserPlus size={13}/> Add</button>
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {group.members?.map((m, i) => (
                <div key={i} className="g-member-chip">
                  <div className="g-member-chip__av">{m.name?.slice(0,2).toUpperCase()}</div>
                  <span>{m.name}</span>
                  {m.role==='admin'&&<span className="g-admin-badge">Admin</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Totals Tab */}
      {tab === 'totals' && (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div className="g-tabs">
            {['month','year','all'].map(p => (
              <button key={p} className={`g-tab ${totalsPeriod===p?'active':''}`} onClick={() => setTotalsPeriod(p)}>
                {p==='month'?'This Month':p==='year'?'This Year':'All Time'}
              </button>
            ))}
          </div>

          <div className="g-totals-grid">
            <div className="g-total-card">
              <span className="g-total-card__lbl">Total Spent</span>
              <span className="g-total-card__val">{fmt(totalsData.reduce((s, d) => s + d.amount, 0))}</span>
            </div>
            <div className="g-total-card">
              <span className="g-total-card__lbl">Transactions</span>
              <span className="g-total-card__val">{splits.filter(s => {
                const now = new Date();
                if (totalsPeriod==='month') return new Date(s.date).getMonth()===now.getMonth()&&new Date(s.date).getFullYear()===now.getFullYear();
                if (totalsPeriod==='year') return new Date(s.date).getFullYear()===now.getFullYear();
                return true;
              }).length}</span>
            </div>
            <div className="g-total-card">
              <span className="g-total-card__lbl">Members</span>
              <span className="g-total-card__val">{group.members?.length}</span>
            </div>
            <div className="g-total-card">
              <span className="g-total-card__lbl">Per Person (avg)</span>
              <span className="g-total-card__val">{fmt((totalsData.reduce((s, d) => s + d.amount, 0)) / (group.members?.length || 1))}</span>
            </div>
          </div>

          {totalsData.length > 0 && (
            <div className="g-card">
              <h3 className="g-section-title">Spending by Category</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={totalsData} layout="vertical" margin={{ left:60, right:20, top:5, bottom:5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false}/>
                  <XAxis type="number" tick={{ fontSize:11, fill:'var(--color-text-muted)' }} axisLine={false} tickLine={false}
                    tickFormatter={v => `₹${v>=1000?`${(v/1000).toFixed(0)}k`:v}`}/>
                  <YAxis type="category" dataKey="name" tick={{ fontSize:11, fill:'var(--color-text-muted)' }} axisLine={false} tickLine={false} width={58}/>
                  <Tooltip formatter={v => [fmt(v), 'Amount']} contentStyle={{ background:'var(--color-surface)', border:'1px solid var(--color-border)', borderRadius:8, fontSize:12 }}/>
                  <Bar dataKey="amount" fill="var(--color-primary)" radius={[0,4,4,0]} maxBarSize={22}/>
                </BarChart>
              </ResponsiveContainer>

              <div style={{ marginTop: 12 }}>
                {totalsData.map((d, i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid var(--color-border)', fontSize:13 }}>
                    <span style={{ color:'var(--color-text-secondary)' }}>{d.name}</span>
                    <span style={{ fontWeight:700, color:'var(--color-text-primary)' }}>{fmt(d.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {totalsData.length === 0 && (
            <div className="g-empty"><BarChart2 size={24}/><p>No expenses in this period</p></div>
          )}
        </div>
      )}

      {/* Modals */}
      {showAdd    && <AddSplitModal  group={group} onClose={() => setShowAdd(false)}/>}
      {showMember && <AddMemberModal groupId={group._id} onClose={() => setShowMember(false)}/>}
      {confirmDel && <GroupConfirm msg={`Delete "${group.name}"? This cannot be undone.`} onYes={handleDeleteGroup} onNo={() => setConfirmDel(false)}/>}
    </div>
  );
};

export default GroupDetail;
