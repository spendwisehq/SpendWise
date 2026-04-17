// frontend/src/hooks/usePendingInvite.js
// Call this hook once inside App.jsx or Dashboard.jsx after auth is confirmed.
// It auto-joins any pending group invite that was saved before login.

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export function usePendingInvite() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) return;

    const token = sessionStorage.getItem('pendingInviteToken');
    if (!token) return;

    // Clear immediately so we don't retry on every render
    sessionStorage.removeItem('pendingInviteToken');

    (async () => {
      try {
        const res = await api.post(`/groups/join/${token}`);
        const msg = res.data?.message || 'Joined group!';
        toast.success(msg + ' 🎉');
        navigate('/groups');
      } catch (err) {
        // Non-fatal — user is already logged in, just couldn't auto-join
        console.warn('Pending invite join failed:', err.message);
        // Redirect to join page so they can try manually
        navigate(`/join/${token}`);
      }
    })();
  }, [isAuthenticated]);
}