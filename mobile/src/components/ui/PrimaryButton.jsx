// Pill-shaped gradient CTA. Primary = mint, ai = purple.
import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients, palette } from '../../theme/colors';
import { fontSize, fontWeight, fonts } from '../../theme/typography';

export default function PrimaryButton({
  children, onPress, full, accent = 'primary', disabled, style,
}) {
  const grad = accent === 'ai' ? gradients.ai : gradients.primary;
  const ink  = accent === 'ai' ? palette.tertiaryInk : palette.primaryInk;

  return (
    <Pressable onPress={onPress} disabled={disabled}
      style={({ pressed }) => [
        styles.wrap,
        full && { alignSelf: 'stretch' },
        { opacity: disabled ? 0.5 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        style,
      ]}>
      <LinearGradient colors={grad} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.grad}>
        <Text style={[styles.label, { color: ink }]}>{children}</Text>
      </LinearGradient>
    </Pressable>
  );
}

export function GhostButton({ children, onPress, full, style, textStyle, disabled }) {
  return (
    <Pressable onPress={onPress} disabled={disabled}
      style={({ pressed }) => [
        styles.ghost,
        full && { alignSelf: 'stretch' },
        { opacity: disabled ? 0.5 : (pressed ? 0.7 : 1) },
        style,
      ]}>
      <Text style={[styles.ghostLabel, textStyle]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 99,
    overflow: 'hidden',
    shadowColor: '#68dbae',
    shadowOpacity: 0.45,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 12 },
  },
  grad: {
    paddingVertical: 16,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 99,
  },
  label: {
    fontFamily: fonts.display,
    fontWeight: fontWeight.bold,
    fontSize: fontSize.lg,
    letterSpacing: -0.2,
  },
  ghost: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostLabel: {
    color: palette.text,
    fontFamily: fonts.body,
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.md,
  },
});
