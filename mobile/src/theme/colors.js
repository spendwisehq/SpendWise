// SpendWise design tokens — "Fiscal Architect" dark palette.
// Editorial fintech: warm charcoal foundation, mint primary, AI purple accent.

export const palette = {
  bg:          '#111416',
  bgDeep:      '#0a0c0d',
  surface:     'rgba(25,28,31,1)',
  surfaceAlpha:'rgba(25,28,31,0.6)',
  surfaceLow:  'rgba(25,28,31,0.85)',
  surfaceMed:  'rgba(29,32,35,1)',
  surfaceHigh: 'rgba(39,42,45,1)',
  surfaceBright:'rgba(39,42,45,0.9)',
  navTop:      '#1a1d20',
  navBot:      '#0f1214',

  primary:      '#68dbae',
  primaryDeep:  '#26a37a',
  primaryGlow:  '#6fe3b5',
  primaryInk:   '#003827',
  primaryInkAlt:'#003327',

  tertiary:     '#cebdff',
  tertiaryDeep: '#9b7fed',
  tertiaryInk:  '#2a1866',

  amber:        '#ffb684',
  amberDeep:    '#e68a4a',
  azure:        '#7eaaff',
  pink:         '#ff94c2',
  yellow:       '#facc15',
  red:          '#ff8b6b',
  redSoft:      '#ff9b9b',

  text:         '#e6f6ef',
  textMuted:    'rgba(188,202,193,0.78)',
  textDim:      'rgba(188,202,193,0.45)',

  // back-compat aliases used by leftover code
  bg2:          '#0a0c0d',
  surface2:     'rgba(29,32,35,1)',
  surface3:     'rgba(39,42,45,1)',
  border:       'rgba(255,255,255,0.06)',
  borderStrong: 'rgba(255,255,255,0.1)',
  textPrimary:  '#e6f6ef',
  textSecondary:'rgba(188,202,193,0.78)',
  primaryLight: 'rgba(104,219,174,0.12)',
  success:      '#68dbae',
  danger:       '#ff8b6b',
  warning:      '#ffb684',
  info:         '#7eaaff',
};

export const gradients = {
  primary:    ['#68dbae', '#26a37a'],
  primaryFab: ['#6fe3b5', '#26a37a'],
  ai:         ['#cebdff', '#9b7fed'],
  hero:       ['rgba(38,163,122,0.22)', 'rgba(155,127,237,0.18)'],
  navPill:    ['#1a1d20', '#0f1214'],
  sheet:      ['#15181a', '#0a0c0d'],
  budget:     ['#68dbae', '#facc15', '#ef4444'],
  avatarRing: ['#68dbae', '#cebdff'],
  profileCard:['rgba(104,219,174,0.18)', 'rgba(206,189,255,0.12)'],
};

export const colors = palette;

// Theme adapter (kept for backwards compatibility with ThemeContext consumers).
export const getThemeColors = () => ({
  ...palette,
  bg:           palette.bg,
  surface:      palette.surface,
  textPrimary:  palette.text,
  textSecondary:palette.textMuted,
  textMuted:    palette.textDim,
  primary:      palette.primary,
  primaryDark:  palette.primaryDeep,
  primaryLight: palette.primaryLight,
  border:       palette.border,
  borderStrong: palette.borderStrong,
});
