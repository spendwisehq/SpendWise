// Typography scale. Manrope for display/headlines, Inter for body.
// System fonts on RN until custom fonts loaded — match weights/sizes.

import { Platform } from 'react-native';

const sys = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'System',
});

export const fonts = {
  display: sys,  // Manrope substitute
  body:    sys,  // Inter substitute
  mono:    Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
};

export const fontSize = {
  xs:     10,
  sm:     11,
  base:   13,
  md:     14,
  lg:     15,
  xl:     17,
  '2xl':  20,
  '3xl':  24,
  '4xl':  28,
  '5xl':  34,
  display:48,
  hero:   64,
};

export const fontWeight = {
  regular:  '400',
  medium:   '500',
  semibold: '600',
  bold:     '700',
  heavy:    '800',
};

export const text = {
  display: {
    fontFamily: fonts.display,
    fontWeight: fontWeight.heavy,
    letterSpacing: -1.6,
  },
  headline: {
    fontFamily: fonts.display,
    fontWeight: fontWeight.bold,
    letterSpacing: -0.4,
  },
  title: {
    fontFamily: fonts.display,
    fontWeight: fontWeight.bold,
    letterSpacing: -0.2,
  },
  body: {
    fontFamily: fonts.body,
    fontWeight: fontWeight.regular,
  },
  label: {
    fontFamily: fonts.body,
    fontWeight: fontWeight.semibold,
  },
  eyebrow: {
    fontFamily: fonts.body,
    fontWeight: fontWeight.bold,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    fontSize: fontSize.xs,
  },
};
