// mobile/app/(tabs)/transactions.jsx
import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { useTransactions } from '../../src/hooks/useTransactions';
import TransactionItem from '../../src/components/TransactionItem';
import { spacing, fontSize, fontWeight } from '../../src/theme/spacing';

export default function TransactionsScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const currency = user?.currency || 'INR';

  const [page, setPage] = useState(1);
  const { data, isLoading, isRefetching, refetch } = useTransactions({}, page);

  const transactions = data?.transactions || [];
  const pagination = data?.pagination || {};
  const hasMore = page < (pagination.pages || 1);

  const loadMore = useCallback(() => {
    if (hasMore && !isLoading) {
      setPage(p => p + 1);
    }
  }, [hasMore, isLoading]);

  const onRefresh = useCallback(() => {
    setPage(1);
    refetch();
  }, [refetch]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Transactions</Text>
      </View>

      <FlatList
        data={transactions}
        keyExtractor={item => item._id}
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: spacing['2xl'] }}>
            <TransactionItem transaction={item} currency={currency} />
          </View>
        )}
        ListEmptyComponent={
          !isLoading && (
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No transactions yet
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          isLoading && page === 1 ? (
            <ActivityIndicator style={styles.loader} color={colors.primary} />
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
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
  list: {
    paddingBottom: spacing['3xl'],
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing['5xl'],
  },
  emptyText: {
    fontSize: fontSize.base,
  },
  loader: {
    paddingVertical: spacing['2xl'],
  },
});
