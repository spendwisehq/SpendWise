// mobile/src/components/TransactionItem.jsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { fmt } from '../utils/format';
import { spacing, radius, fontSize, fontWeight } from '../theme/spacing';
import { format } from 'date-fns';

export default function TransactionItem({ transaction, currency = 'INR' }) {
  const { colors } = useTheme();
  const isExpense = transaction.type === 'expense';
  const amountColor = isExpense ? colors.danger : colors.success;
  const amountPrefix = isExpense ? '-' : '+';

  return (
    <View style={[styles.container, { borderBottomColor: colors.border }]}>
      <View style={[styles.iconWrap, { backgroundColor: isExpense ? colors.danger + '15' : colors.success + '15' }]}>
        <Ionicons
          name={isExpense ? 'arrow-up-outline' : 'arrow-down-outline'}
          size={18}
          color={amountColor}
        />
      </View>
      <View style={styles.details}>
        <Text style={[styles.description, { color: colors.textPrimary }]} numberOfLines={1}>
          {transaction.description || 'Untitled'}
        </Text>
        <Text style={[styles.meta, { color: colors.textMuted }]}>
          {transaction.categoryName || transaction.category || 'Uncategorized'}
          {transaction.date ? ` \u00b7 ${format(new Date(transaction.date), 'dd MMM')}` : ''}
        </Text>
      </View>
      <Text style={[styles.amount, { color: amountColor }]}>
        {amountPrefix}{fmt(Math.abs(transaction.amount), currency)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    gap: spacing.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  details: {
    flex: 1,
    gap: 2,
  },
  description: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  meta: {
    fontSize: fontSize.xs,
  },
  amount: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
});
