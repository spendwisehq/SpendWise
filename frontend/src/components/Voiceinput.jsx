// frontend/src/components/VoiceInput.jsx
// Web Speech API → transcript string → passed to parent via onTranscript()
// No dependencies. Works in Chrome/Edge/Safari (check browser compat).

import React, { useState, useRef, useEffect, useCallback } from 'react';

const isSupported = typeof window !== 'undefined' &&
  ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

/**
 * VoiceInput button.
 *
 * Props:
 *   onTranscript(text)  — called with the final recognised text
 *   disabled            — disables the button (e.g. while saving)
 *   style               — extra inline styles on the outer button
 *   label               — optional tooltip / aria-label override
 */
export default function VoiceInput({ onTranscript, disabled = false, style = {}, label }) {
  const [state,      setState]      = useState('idle');   // idle | listening | processing | error
  const [interim,    setInterim]    = useState('');
  const recognitionRef              = useRef(null);
  const timeoutRef                  = useRef(null);

  // Clean up on unmount
  useEffect(() => () => {
    recognitionRef.current?.abort();
    clearTimeout(timeoutRef.current);
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    clearTimeout(timeoutRef.current);
    setState('idle');
    setInterim('');
  }, []);

  const start = useCallback(() => {
    if (!isSupported || disabled) return;

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognitionRef.current = recognition;

    recognition.lang           = 'en-IN';   // Indian English — handles amounts well
    recognition.continuous     = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setState('listening');
      setInterim('');
      // Auto-stop after 8 seconds silence
      timeoutRef.current = setTimeout(() => recognition.stop(), 8000);
    };

    recognition.onresult = (event) => {
      let interimText = '';
      let finalText   = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += t;
        else interimText += t;
      }
      setInterim(interimText || finalText);
      if (finalText) {
        clearTimeout(timeoutRef.current);
        setState('processing');
        onTranscript(finalText.trim());
        setTimeout(() => { setState('idle'); setInterim(''); }, 600);
      }
    };

    recognition.onerror = (event) => {
      // 'no-speech' is common — not a real error
      if (event.error !== 'no-speech') setState('error');
      else setState('idle');
      setInterim('');
      clearTimeout(timeoutRef.current);
      setTimeout(() => setState('idle'), 1500);
    };

    recognition.onend = () => {
      clearTimeout(timeoutRef.current);
      if (state !== 'processing') { setState('idle'); setInterim(''); }
    };

    recognition.start();
  }, [disabled, onTranscript, state]);

  const toggle = () => state === 'listening' ? stop() : start();

  if (!isSupported) {
    return (
      <button
        disabled
        title="Voice input not supported in this browser"
        style={{ ...btnBase, opacity: 0.35, cursor: 'not-allowed', ...style }}
        aria-label="Voice input not supported"
      >
        🎙️
      </button>
    );
  }

  const icon =
    state === 'listening'   ? '⏹' :
    state === 'processing'  ? '⏳' :
    state === 'error'       ? '❌' : '🎙️';

  const title =
    state === 'listening'  ? 'Stop recording' :
    state === 'processing' ? 'Processing...'  :
    state === 'error'      ? 'Try again'      :
    label || 'Speak transaction name';

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={toggle}
        disabled={disabled || state === 'processing'}
        title={title}
        aria-label={title}
        style={{
          ...btnBase,
          background:   state === 'listening' ? 'rgba(239,68,68,0.15)' :
                        state === 'error'     ? 'rgba(239,68,68,0.08)' :
                        'var(--color-bg-tertiary)',
          borderColor:  state === 'listening' ? '#ef4444' :
                        state === 'error'     ? '#ef4444' :
                        'var(--color-border)',
          boxShadow:    state === 'listening' ? '0 0 0 3px rgba(239,68,68,0.18)' : 'none',
          animation:    state === 'listening' ? 'voicePulse 1.2s ease-in-out infinite' : 'none',
          ...style,
        }}
      >
        <span style={{ fontSize: '1rem', lineHeight: 1 }}>{icon}</span>
      </button>

      {/* Interim transcript tooltip */}
      {interim && (
        <div style={tooltip}>
          <span style={{ color: '#6366f1', fontWeight: 700, marginRight: 4 }}>🎙</span>
          {interim}
        </div>
      )}

      {/* Inject keyframe once */}
      <style>{`
        @keyframes voicePulse {
          0%,100% { box-shadow: 0 0 0 3px rgba(239,68,68,0.18); }
          50%      { box-shadow: 0 0 0 6px rgba(239,68,68,0.06); }
        }
      `}</style>
    </div>
  );
}

const btnBase = {
  display:       'inline-flex',
  alignItems:    'center',
  justifyContent:'center',
  width:         38,
  height:        38,
  borderRadius:  10,
  border:        '1.5px solid var(--color-border)',
  cursor:        'pointer',
  transition:    'all 0.18s',
  flexShrink:    0,
  padding:       0,
};

const tooltip = {
  position:   'absolute',
  bottom:     '110%',
  left:       '50%',
  transform:  'translateX(-50%)',
  background: 'var(--color-bg-secondary)',
  border:     '1px solid var(--color-border)',
  borderRadius: 8,
  padding:    '0.35rem 0.65rem',
  fontSize:   '0.75rem',
  color:      'var(--color-text-primary)',
  whiteSpace: 'nowrap',
  maxWidth:   220,
  overflow:   'hidden',
  textOverflow: 'ellipsis',
  zIndex:     10,
  boxShadow:  '0 4px 12px rgba(0,0,0,0.25)',
  pointerEvents: 'none',
};