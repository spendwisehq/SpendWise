// mobile/app/(tabs)/dashboard.jsx
import React from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { useDashboardStats } from '../../src/hooks/useDashboardStats';
import { fmt } from '../../src/utils/format';
import StatCard from '../../src/components/StatCard';
import TransactionItem from '../../src/components/TransactionItem';
import { spacing, fontSize, fontWeight } from '../../src/theme/spacing';

export default function DashboardScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const currency = user?.currency || 'INR';

  const { stats, isLoading, isRefetching, refetch } = useDashboardStats(month, year);

  const thisMonth = stats?.thisMonth || {};
  const recent = stats?.recentTransactions || [];

  const greeting = now.getHours() < 12 ? 'morning' : now.getHours() < 17 ? 'afternoon' : 'evening';
  const firstName = user?.name?.split(' ')[0] || 'there';

  const statCards = [
    { title: 'Expenses', value: fmt(thisMonth.totalExpense || 0, currency), icon: 'arrow-up-outline', iconColor: colors.danger },
    { title: 'Income', value: fmt(thisMonth.totalIncome || 0, currency), icon: 'arrow-down-outline', iconColor: colors.success },
    { title: 'Net Savings', value: fmt((thisMonth.totalIncome || 0) - (thisMonth.totalExpense || 0), currency), icon: 'wallet-outline', iconColor: colors.primary },
    { title: 'Transactions', value: `${thisMonth.count || 0}`, icon: 'receipt-outline', iconColor: colors.info },
  ];

  const ListHeader = () => (
    <View>
      {/* Greeting */}
      <View style={styles.header}>
        <Text style={[styles.greeting, { color: colors.textPrimary }]}>
          Good {greeting}, {firstName}
        </Text>
        <Text style={[styles.dateText, { color: colors.textSecondary }]}>
          {now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
        </Text>
      </View>

      {/* Stat Cards — 2x2 grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statsRow}>
          <StatCard {...statCards[0]} loading={isLoading} />
          <StatCard {...statCards[1]} loading={isLoading} />
        </View>
        <View style={styles.statsRow}>
          <StatCard {...statCards[2]} loading={isLoading} />
          <StatCard {...statCards[3]} loading={isLoading} />
        </View>
      </View>

      {/* Recent Transactions header */}
      {recent.length > 0 && (
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Recent Transactions
        </Text>
      )}
    </View>
  );

  const ListEmpty = () => (
    !isLoading && (
      <View style={styles.empty}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          No transactions yet. Tap + to add one.
        </Text>
      </View>
    )
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <FlatList
        data={recent.slice(0, 5)}
        keyExtractor={item => item._id}
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: spacing['2xl'] }}>
            <TransactionItem transaction={item} currency={currency} />
          </View>
        )}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  listContent: {
    paddingBottom: spacing['3xl'],
  },
  header: {
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  greeting: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
  },
  dateText: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  statsGrid: {
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    paddingHorizontal: spacing['2xl'],
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing['4xl'],
  },
  emptyText: {
    fontSize: fontSize.base,
  },
});
