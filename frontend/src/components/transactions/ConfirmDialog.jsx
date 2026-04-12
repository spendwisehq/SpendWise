import React from 'react';
import { X } from 'lucide-react';

const ConfirmDialog = ({ message, onConfirm, onCancel }) => (
  <div className="modal-overlay" onClick={onCancel}>
    <div className="confirm-box" onClick={e => e.stopPropagation()}>
      <div className="confirm-box__icon">🗑️</div>
      <h3>Delete Transaction?</h3>
      <p>{message}</p>
      <div className="confirm-box__actions">
        <button className="btn btn--ghost" onClick={onCancel}>Cancel</button>
        <button className="btn btn--danger" onClick={onConfirm}>Delete</button>
      </div>
    </div>
  </div>
);

export default ConfirmDialog;
