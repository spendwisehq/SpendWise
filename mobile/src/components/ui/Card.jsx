import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { palette } from '../../theme/colors';

const TONE_BG = {
  low:  'rgba(25,28,31,0.6)',
  med:  'rgba(29,32,35,1)',
  high: 'rgba(39,42,45,1)',
  flat: 'rgba(25,28,31,1)',
};

export default function Card({ children, tone = 'low', style, onPress, padding = 20 }) {
  const inner = (
    <View style={[styles.card, { backgroundColor: TONE_BG[tone], padding }, style]}>
      {children}
    </View>
  );
  if (onPress) {
    return <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>{inner}</Pressable>;
  }
  return inner;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
});
