// mobile/app/(tabs)/analytics.jsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeContext';
import { spacing, fontSize, fontWeight } from '../../src/theme/spacing';

export default function AnalyticsScreen() {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Analytics</Text>
      </View>
      <View style={styles.placeholder}>
        <Ionicons name="bar-chart-outline" size={64} color={colors.textMuted} />
        <Text style={[styles.placeholderTitle, { color: colors.textSecondary }]}>
          Coming Soon
        </Text>
        <Text style={[styles.placeholderText, { color: colors.textMuted }]}>
          Charts and spending insights will be available in the next update.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing['3xl'],
    gap: spacing.md,
  },
  placeholderTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  placeholderText: {
    fontSize: fontSize.base,
    textAlign: 'center',
    lineHeight: 22,
  },
});
