// Transaction row used in lists.
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { palette } from '../../theme/colors';
import { fonts, fontWeight, fontSize, text } from '../../theme/typography';
import { fmtINR } from '../../utils/format';

export default function TxRow({ tx, onPress, onLongPress }) {
  const isIncome = tx.amount > 0;
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} style={({ pressed }) => [
      styles.row,
      { backgroundColor: pressed ? 'rgba(39,42,45,1)' : 'rgba(25,28,31,1)' },
    ]}>
      <View style={[
        styles.icon,
        { backgroundColor: isIncome ? 'rgba(104,219,174,0.12)' : 'rgba(255,255,255,0.05)' },
      ]}>
        <Text style={{ fontSize: 20 }}>{tx.emoji || '💸'}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={styles.title}>{tx.title}</Text>
        <View style={styles.meta}>
          <Text style={[text.eyebrow, { color: palette.textMuted, fontSize: 10 }]}>
            {tx.category}
          </Text>
          <Text style={{ color: palette.textDim, marginHorizontal: 6 }}>•</Text>
          <Text style={{ fontSize: 11, color: palette.textDim, fontFamily: fonts.body }}>
            {tx.time || ''}
          </Text>
        </View>
      </View>
      <Text style={[
        styles.amount,
        { color: isIncome ? palette.primary : palette.text },
      ]}>
        {isIncome ? '+' : ''}{fmtINR(Math.abs(tx.amount))}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.display,
    fontWeight: fontWeight.bold,
    fontSize: fontSize.lg,
    color: palette.text,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  amount: {
    fontFamily: fonts.display,
    fontWeight: fontWeight.bold,
    fontSize: fontSize.xl,
    letterSpacing: -0.2,
  },
});
