// frontend/src/pages/NotFound.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
const NotFound = () => {
  const navigate = useNavigate();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '16px', background: 'var(--color-bg)' }}>
      <h1 style={{ fontSize: '48px', fontWeight: 500, color: 'var(--color-primary)' }}>404</h1>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '15px' }}>Page not found</p>
      <button onClick={() => navigate('/dashboard')} style={{ padding: '10px 24px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontSize: '14px', cursor: 'pointer' }}>
        Go to Dashboard
      </button>
    </div>
  );
};
export default NotFound;