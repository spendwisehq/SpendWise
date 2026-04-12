import React, { useState } from 'react';
import { X, Mail, Phone } from 'lucide-react';
import { useAddMember } from '../../hooks/useGroups';
import toast from 'react-hot-toast';

const AddMemberModal = ({ groupId, onClose }) => {
  const [method, setMethod] = useState('email');
  const [value,  setValue]  = useState('');
  const [name,   setName]   = useState('');
  const addMember = useAddMember(groupId);

  const send = () => {
    if (!value.trim()) { toast.error('Enter email or phone'); return; }
    addMember.mutate({
      email: method === 'email' ? value.trim() : undefined,
      phone: method === 'sms'   ? value.trim() : undefined,
      name:  name.trim() || value.split('@')[0],
    }, {
      onSuccess: () => onClose(),
    });
  };

  return (
    <div className="g-overlay" onClick={onClose}>
      <div className="g-modal" onClick={e => e.stopPropagation()}>
        <div className="g-modal__hdr"><h2>Add Member</h2><button className="g-icon-btn" onClick={onClose}><X size={16}/></button></div>
        <div className="g-modal__body">
          <div className="g-tabs">
            <button className={`g-tab ${method==='email'?'active':''}`} onClick={() => setMethod('email')}><Mail size={13}/> Email</button>
            <button className={`g-tab ${method==='sms'?'active':''}`} onClick={() => setMethod('sms')}><Phone size={13}/> SMS</button>
          </div>
          <div className="g-field">
            <label>{method==='email'?'Email Address':'Phone Number'}</label>
            <input className="g-input" type={method==='email'?'email':'tel'} value={value} onChange={e => setValue(e.target.value)}
              placeholder={method==='email'?'friend@gmail.com':'+91 9876543210'} autoFocus
              onKeyDown={e => e.key==='Enter' && send()} />
          </div>
          <div className="g-field">
            <label>Name (optional)</label>
            <input className="g-input" value={name} onChange={e => setName(e.target.value)} placeholder="Friend's name" />
          </div>
          <p className="g-note">{method==='email'?'An invitation will be sent to their email':'An SMS invitation will be sent to their phone'}</p>
        </div>
        <div className="g-modal__ftr">
          <button className="g-btn g-btn--ghost" onClick={onClose}>Cancel</button>
          <button className="g-btn g-btn--primary" onClick={send} disabled={addMember.isPending}>{addMember.isPending?'Sending...':'Send Invite'}</button>
        </div>
      </div>
    </div>
  );
};

export default AddMemberModal;
