import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { palette } from '../../theme/colors';
import { fonts, fontWeight } from '../../theme/typography';

export default function Chip({ children, active, onPress, accent }) {
  return (
    <Pressable onPress={onPress} style={[
      styles.chip,
      {
        backgroundColor: active ? (accent || 'rgba(104,219,174,0.14)') : 'rgba(255,255,255,0.04)',
        borderColor:     active ? 'rgba(104,219,174,0.3)' : 'rgba(255,255,255,0.06)',
      },
    ]}>
      <Text style={[
        styles.label,
        {
          color: active ? (accent ? '#fff' : palette.primary) : palette.textMuted,
          fontWeight: active ? fontWeight.bold : fontWeight.medium,
        },
      ]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 99,
    borderWidth: 1,
  },
  label: {
    fontFamily: fonts.body,
    fontSize: 12,
    letterSpacing: 0.3,
  },
});
