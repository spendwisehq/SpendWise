import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const CHORD_TIMEOUT = 800;

const isInputFocused = () => {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
};

export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const pendingRef = useRef(null);
  const timerRef = useRef(null);

  const clearPending = useCallback(() => {
    pendingRef.current = null;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isInputFocused()) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // Check for modal open
      if (document.querySelector('[role="dialog"]')) return;

      const key = e.key.toLowerCase();

      // Handle chord sequences (G + something)
      if (pendingRef.current === 'g') {
        clearPending();
        switch (key) {
          case 'd':
            e.preventDefault();
            navigate('/dashboard');
            return;
          case 't':
            e.preventDefault();
            navigate('/transactions');
            return;
          case 'a':
            e.preventDefault();
            navigate('/analytics');
            return;
          case 'g':
            e.preventDefault();
            navigate('/goals');
            return;
          case 'f':
            e.preventDefault();
            navigate('/friends');
            return;
          case 's':
            e.preventDefault();
            navigate('/settings');
            return;
          default:
            return;
        }
      }

      // Start chord sequence
      if (key === 'g') {
        e.preventDefault();
        pendingRef.current = 'g';
        timerRef.current = setTimeout(clearPending, CHORD_TIMEOUT);
        return;
      }

      // Single key shortcuts
      switch (key) {
        case 'n':
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('spendwise:new-transaction'));
          break;
        case '/':
          e.preventDefault();
          const searchInput = document.querySelector('[data-search-input]');
          if (searchInput) searchInput.focus();
          break;
        case '?':
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('spendwise:toggle-shortcuts-help'));
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearPending();
    };
  }, [navigate, clearPending]);
}

export default useKeyboardShortcuts;
