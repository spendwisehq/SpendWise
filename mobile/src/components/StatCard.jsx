// mobile/src/components/StatCard.jsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { spacing, radius, fontSize, fontWeight } from '../theme/spacing';

export default function StatCard({ title, value, icon, iconColor, subtitle, loading }) {
  const { colors } = useTheme();

  if (loading) {
    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.skeleton, { backgroundColor: colors.surface3 }]} />
        <View style={[styles.skeletonSmall, { backgroundColor: colors.surface3 }]} />
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textSecondary }]}>{title}</Text>
        <View style={[styles.iconContainer, { backgroundColor: (iconColor || colors.primary) + '15' }]}>
          <Ionicons name={icon || 'wallet-outline'} size={16} color={iconColor || colors.primary} />
        </View>
      </View>
      <Text style={[styles.value, { color: colors.textPrimary }]} numberOfLines={1}>
        {value}
      </Text>
      {subtitle && (
        <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={1}>
          {subtitle}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    minWidth: '45%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  value: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  subtitle: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  skeleton: {
    height: 14,
    width: '60%',
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
  },
  skeletonSmall: {
    height: 24,
    width: '80%',
    borderRadius: radius.sm,
  },
});
