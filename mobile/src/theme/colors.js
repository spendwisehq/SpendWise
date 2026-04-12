// Design tokens extracted from frontend/src/styles/variables.css

export const colors = {
  // Brand (same in both themes)
  primary:      '#6366F1',
  primaryDark:  '#4F46E5',
  primaryLight: 'rgba(99,102,241,0.1)',

  // Semantic (same in both themes)
  success: '#10B981',
  danger:  '#EF4444',
  warning: '#F59E0B',
  info:    '#3B82F6',

  light: {
    bg:             '#F8FAFC',
    bg2:            '#F1F5F9',
    surface:        '#FFFFFF',
    surface2:       '#F8FAFC',
    surface3:       '#F1F5F9',
    border:         'rgba(0,0,0,0.07)',
    borderStrong:   'rgba(0,0,0,0.13)',
    textPrimary:    '#0F172A',
    textSecondary:  '#475569',
    textMuted:      '#94A3B8',
    primaryLight:   'rgba(99,102,241,0.1)',
  },

  dark: {
    bg:             '#030712',
    bg2:            '#0D1117',
    surface:        '#0F172A',
    surface2:       '#1E293B',
    surface3:       '#293548',
    border:         'rgba(255,255,255,0.07)',
    borderStrong:   'rgba(255,255,255,0.13)',
    textPrimary:    '#F1F5F9',
    textSecondary:  '#94A3B8',
    textMuted:      '#475569',
    primaryLight:   'rgba(99,102,241,0.15)',
  },
};

export const getThemeColors = (theme) => ({
  ...colors[theme],
  primary:      colors.primary,
  primaryDark:  colors.primaryDark,
  primaryLight: colors[theme].primaryLight,
  success:      colors.success,
  danger:       colors.danger,
  warning:      colors.warning,
  info:         colors.info,
});
