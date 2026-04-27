// Transactions list
import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TextInput, StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { palette } from '../../src/theme/colors';
import { fonts, fontWeight, text } from '../../src/theme/typography';
import { Icon } from '../../src/components/ui/Icon';
import TopBar, { IconButton } from '../../src/components/ui/TopBar';
import Chip from '../../src/components/ui/Chip';
import TxRow from '../../src/components/ui/TxRow';
import SwipeableRow from '../../src/components/ui/SwipeableRow';
import { useTransactions, useDeleteTransaction } from '../../src/hooks/useTransactions';

const FILTERS = ['All', 'Expenses', 'Income'];

const dateLabel = (iso) => {
  if (!iso) return 'Unknown';
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const adaptTx = (tx) => ({
  id:       tx._id,
  title:    tx.description || tx.title || 'Transaction',
  category: tx.category?.name || (typeof tx.category === 'string' ? tx.category : 'Other'),
  emoji:    tx.category?.icon || '💸',
  amount:   tx.type === 'income' ? Math.abs(tx.amount) : -Math.abs(tx.amount),
  date:     dateLabel(tx.date),
  time:     tx.date
    ? new Date(tx.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
    : '',
  note: tx.notes || '',
});

export default function TransactionsScreen() {
  const [query, setQuery]         = useState('');
  const [filter, setFilter]       = useState('All');
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const { data, isLoading, isRefetching, refetch } = useTransactions({}, 1);
  const deleteMutation = useDeleteTransaction();

  const handleDelete = (tx) => deleteMutation.mutate(tx.id);
  const allTxs = useMemo(() => (data?.transactions ?? []).map(adaptTx), [data]);

  const groups = useMemo(() => {
    const filtered = allTxs.filter(t => {
      if (query && !(
        t.title.toLowerCase().includes(query.toLowerCase()) ||
        t.category.toLowerCase().includes(query.toLowerCase())
      )) return false;
      if (filter === 'Expenses' && t.amount > 0) return false;
      if (filter === 'Income'   && t.amount < 0) return false;
      return true;
    });
    const out = {};
    filtered.forEach(t => { (out[t.date] = out[t.date] || []).push(t); });
    return out;
  }, [allTxs, query, filter]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TopBar title="Transactions" subtitle="REVIEWING LATEST ACTIVITY"
        right={<IconButton><Icon.Filter size={18} color={palette.textMuted}/></IconButton>}/>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        scrollEnabled={scrollEnabled}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={palette.primary}
          />
        }
      >
        <View style={styles.search}>
          <Icon.Search size={18} color={palette.textMuted}/>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search merchant, category…"
            placeholderTextColor={palette.textDim}
            style={styles.searchInput}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}>
          {FILTERS.map(f => (
            <Chip key={f} active={filter === f} onPress={() => setFilter(f)}>
              {f}
            </Chip>
          ))}
        </ScrollView>

        {isLoading ? (
          <ActivityIndicator color={palette.primary} style={{ marginTop: 40 }}/>
        ) : Object.keys(groups).length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.empty}>
              {allTxs.length === 0 ? 'No transactions yet.' : 'No transactions match.'}
            </Text>
          </View>
        ) : (
          Object.entries(groups).map(([date, list]) => (
            <View key={date} style={{ marginBottom: 28 }}>
              <Text style={[text.eyebrow, styles.dateLabel]}>{date.toUpperCase()}</Text>
              <View style={{ gap: 10 }}>
                {list.map(tx => (
                  <SwipeableRow
                    key={tx.id}
                    onDelete={() => handleDelete(tx)}
                    onSwipeStart={() => setScrollEnabled(false)}
                    onSwipeEnd={() => setScrollEnabled(true)}
                  >
                    <TxRow tx={tx} />
                  </SwipeableRow>
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg },
  scroll: {
    paddingHorizontal: 22,
    paddingTop: 6,
    paddingBottom: 140,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderRadius: 16,
    height: 52,
    paddingHorizontal: 18,
    gap: 12,
    marginBottom: 18,
  },
  searchInput: {
    flex: 1,
    color: palette.text,
    fontFamily: fonts.body,
    fontSize: 15,
  },
  chipRow: {
    gap: 8,
    paddingBottom: 4,
    marginBottom: 20,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 12,
  },
  empty: {
    textAlign: 'center',
    fontFamily: fonts.body,
    color: palette.textDim,
    fontSize: 14,
  },
  dateLabel: {
    fontSize: 11,
    letterSpacing: 2,
    color: palette.textMuted,
    paddingHorizontal: 8,
    paddingBottom: 12,
  },
});
