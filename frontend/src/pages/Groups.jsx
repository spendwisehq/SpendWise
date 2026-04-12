import React, { useState } from 'react';
import { Plus, Users, X, ChevronRight, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useGroups, useCreateGroup, useDeleteGroup } from '../hooks/useGroups';
import { fmt } from '../utils/format';
import { TYPE_ICONS, GROUP_TYPES } from '../components/groups/constants';
import GroupDetail from '../components/groups/GroupDetail';
import GroupConfirm from '../components/groups/GroupConfirm';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import './Groups.css';

const Groups = () => {
  const { data: groups = [], isLoading: loading } = useGroups();
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [showCreate,    setShowCreate]    = useState(false);
  const [confirmDel,    setConfirmDel]    = useState(null);
  const [newGroup,      setNewGroup]      = useState({ name: '', type: 'other', description: '' });
  const [formErrors,    setFormErrors]    = useState({});

  const createGroupMutation = useCreateGroup();
  const deleteGroupMutation = useDeleteGroup();

  const createGroup = (e) => {
    e.preventDefault();
    const errs = {};
    if (!newGroup.name || newGroup.name.trim().length < 2) {
      errs.name = 'Group name must be at least 2 characters';
    }
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) return;

    createGroupMutation.mutate(newGroup, {
      onSuccess: () => {
        setShowCreate(false);
        setNewGroup({ name: '', type: 'other', description: '' });
        setFormErrors({});
      },
    });
  };

  const deleteGroup = () => {
    deleteGroupMutation.mutate(confirmDel, {
      onSuccess: () => setConfirmDel(null),
    });
  };

  if (activeGroupId) return <GroupDetail groupId={activeGroupId} onBack={() => setActiveGroupId(null)} />;

  return (
    <div className="g-page">
      <div className="g-page__hdr">
        <div><h1 className="g-title">Groups</h1><p className="g-sub">Manage shared expenses</p></div>
        <button className="g-btn g-btn--primary" onClick={() => setShowCreate(true)}><Plus size={15}/> New Group</button>
      </div>

      {loading ? (
        <div className="g-grid">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="g-group-card" style={{ padding: 'var(--space-5)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                <Skeleton shape="circle" width="36px" height="36px" />
                <Skeleton shape="text" width="60px" />
              </div>
              <Skeleton shape="text" width="70%" height="18px" />
              <div style={{ marginTop: 'var(--space-3)' }}>
                <Skeleton shape="text" width="100%" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-4)' }}>
                <Skeleton shape="text" width="80px" />
                <Skeleton shape="text" width="60px" />
              </div>
            </div>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={<Users size={36} />}
          title="No groups yet"
          description="Create a group to split expenses with friends"
          action={
            <Button variant="primary" icon={Plus} onClick={() => setShowCreate(true)}>
              Create First Group
            </Button>
          }
        />
      ) : (
        <div className="g-grid">
          {groups.map(group => (
            <div key={group._id} className="g-group-card">
              <div className="g-group-card__body" onClick={() => setActiveGroupId(group._id)}>
                <div className="g-group-card__hdr">
                  <span className="g-group-card__icon">{TYPE_ICONS[group.type]}</span>
                  <span className="g-group-card__type">{group.type}</span>
                </div>
                <h3 className="g-group-card__name">{group.name}</h3>
                {group.description && <p className="g-group-card__desc">{group.description}</p>}
                <div className="g-group-card__footer">
                  <span>{group.members?.length||0} members</span>
                  <span>{fmt(group.totalExpenses||0)}</span>
                  <ChevronRight size={13}/>
                </div>
              </div>
              <button className="g-group-card__del" onClick={() => setConfirmDel(group._id)} title="Delete"><Trash2 size={13}/></button>
            </div>
          ))}
        </div>
      )}

      {/* Create Group Modal */}
      {showCreate && (
        <div className="g-overlay" onClick={() => setShowCreate(false)}>
          <div className="g-modal" onClick={e => e.stopPropagation()}>
            <div className="g-modal__hdr"><h2>Create Group</h2><button className="g-icon-btn" onClick={() => setShowCreate(false)}><X size={16}/></button></div>
            <form onSubmit={createGroup} className="g-modal__body">
              <div className="g-field">
                <label>Group Name</label>
                <input className={`g-input ${formErrors.name ? 'g-input--error' : ''}`} value={newGroup.name} onChange={e => { setNewGroup(p=>({...p,name:e.target.value})); if (formErrors.name) setFormErrors(p=>({...p,name:''})); }} placeholder="e.g. Goa Trip 2026" aria-invalid={formErrors.name ? true : undefined} />
                {formErrors.name && <span className="g-field-error" role="alert">{formErrors.name}</span>}
              </div>
              <div className="g-field">
                <label>Type</label>
                <div className="g-type-grid">
                  {GROUP_TYPES.map(t => (
                    <button key={t} type="button" className={`g-type-chip ${newGroup.type===t?'active':''}`} onClick={() => setNewGroup(p=>({...p,type:t}))}>
                      {TYPE_ICONS[t]} {t.charAt(0).toUpperCase()+t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="g-field">
                <label>Description (optional)</label>
                <input className="g-input" value={newGroup.description} onChange={e => setNewGroup(p=>({...p,description:e.target.value}))} placeholder="What's this group for?" />
              </div>
              <div className="g-modal__ftr">
                <button type="button" className="g-btn g-btn--ghost" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="g-btn g-btn--primary" disabled={createGroupMutation.isPending}>{createGroupMutation.isPending?'Creating...':'Create Group'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDel && <GroupConfirm msg="Delete this group? All expenses will be lost." onYes={deleteGroup} onNo={() => setConfirmDel(null)}/>}
    </div>
  );
};

export default Groups;
