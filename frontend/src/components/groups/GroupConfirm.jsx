import React from 'react';

const GroupConfirm = ({ msg, onYes, onNo }) => (
  <div className="g-overlay" onClick={onNo}>
    <div className="g-confirm" onClick={e => e.stopPropagation()}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>🗑️</div>
      <h3>Are you sure?</h3>
      <p>{msg}</p>
      <div className="g-confirm__btns">
        <button className="g-btn g-btn--ghost" onClick={onNo}>Cancel</button>
        <button className="g-btn g-btn--danger" onClick={onYes}>Delete</button>
      </div>
    </div>
  </div>
);

export default GroupConfirm;
