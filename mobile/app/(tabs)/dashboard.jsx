// Home Dashboard
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { palette, gradients } from '../../src/theme/colors';
import { fonts, fontWeight, fontSize, text } from '../../src/theme/typography';
import { Icon } from '../../src/components/ui/Icon';
import TopBar, { IconButton } from '../../src/components/ui/TopBar';
import ProgressBar from '../../src/components/ui/ProgressBar';
import SectionLabel from '../../src/components/ui/SectionLabel';
import TxRow from '../../src/components/ui/TxRow';
import SwipeableRow from '../../src/components/ui/SwipeableRow';
import { useAuth } from '../../src/context/AuthContext';
import { useDashboardStats } from '../../src/hooks/useDashboardStats';
import { useTransactions, useDeleteTransaction } from '../../src/hooks/useTransactions';
import { useAIInsights } from '../../src/hooks/useAIChat';

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

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [hideBalance, setHideBalance]     = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const now = new Date();
  const { stats, summary, isLoading: statsLoading, refetch: refetchStats } = useDashboardStats(
    now.getMonth() + 1,
    now.getFullYear(),
  );
  const { data: txData, isRefetching, refetch: refetchTx } = useTransactions({ limit: 3 }, 1);
  const deleteMutation = useDeleteTransaction();

  const refetch = () => { refetchStats(); refetchTx(); };

  const handleDelete = (tx) => {
    deleteMutation.mutate(tx.id);
  };

  const recent  = (txData?.transactions ?? []).slice(0, 3).map(adaptTx);
  const inflow  = summary?.totalIncome   ?? 0;
  const outflow = summary?.totalExpense  ?? 0;
  const balance = stats?.netSavings ?? stats?.balance ?? stats?.currentBalance ?? (inflow - outflow);
  const growth  = inflow ? Math.round(((inflow - outflow) / inflow) * 100) : 0;

  const spent = summary?.totalExpense ?? 0;
  const cap   = user?.monthlyBudget ?? 0;
  const pct   = cap > 0 ? Math.min(Math.round((spent / cap) * 100), 100) : 0;

  const firstName  = user?.name?.split(' ')[0] ?? 'Loading';
  const insightTip = 'Ask the AI assistant for personalised spending insights.';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TopBar
        title={firstName}
        subtitle="GOOD MORNING,"
        right={
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <IconButton>
              <Icon.Bell size={18} color={palette.textMuted}/>
            </IconButton>
            <IconButton onPress={() => router.push('/settings')}>
              <Icon.Settings size={18} color={palette.textMuted}/>
            </IconButton>
          </View>
        }
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        scrollEnabled={scrollEnabled}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={palette.primary}/>
        }
      >

        {/* Hero balance */}
        <View style={styles.hero}>
          <LinearGradient
            colors={gradients.hero}
            start={{x:0,y:0}} end={{x:1,y:1}}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroBlob}/>
          <View>
            <View style={styles.heroTop}>
              <Text style={[text.eyebrow, { color: palette.textMuted, letterSpacing: 2.2 }]}>
                TOTAL LIQUIDITY
              </Text>
              <Pressable onPress={() => setHideBalance(v => !v)}>
                {hideBalance
                  ? <Icon.EyeOff size={18} color="rgba(255,255,255,0.6)"/>
                  : <Icon.Eye    size={18} color="rgba(255,255,255,0.6)"/>}
              </Pressable>
            </View>
            <View style={styles.balRow}>
              {statsLoading ? (
                <ActivityIndicator color={palette.primary} style={{ marginTop: 10 }}/>
              ) : (
                <>
                  <Text style={styles.balance}>
                    {hideBalance ? '₹••••••' : '₹' + Math.abs(balance).toLocaleString('en-IN')}
                  </Text>
                  {!hideBalance && <Text style={styles.balDecimal}>.00</Text>}
                </>
              )}
            </View>

            <View style={styles.statRow}>
              <StatCol label="INFLOW"  value={'₹' + inflow.toLocaleString('en-IN')}  color={palette.primary}/>
              <StatCol label="OUTFLOW" value={'₹' + outflow.toLocaleString('en-IN')} color="#fff"/>
              <StatCol label="GROWTH"  value={growth + '%'} color="#a5d0ba" arrow/>
            </View>
          </View>
        </View>

        {/* Quick actions */}
        <View style={styles.qaRow}>
          <QuickAction Ico={Icon.Plus}     label="ADD"    onPress={() => router.push('/(tabs)/add')}/>
          <QuickAction Ico={Icon.Scan}     label="SCAN"   onPress={() => {}}/>
          <QuickAction Ico={Icon.Split}    label="SPLIT"  onPress={() => router.push('/groups')}/>
          <QuickAction Ico={Icon.Sparkles} label="AI BOT" accent="ai" onPress={() => router.push('/(tabs)/ai')}/>
        </View>

        {/* AI insight banner */}
        <Pressable onPress={() => router.push('/(tabs)/ai')} style={styles.insight}>
          <LinearGradient
            colors={['#68dbae', '#cebdff']}
            start={{x:0,y:0}} end={{x:1,y:1}}
            style={[StyleSheet.absoluteFill, { opacity: 0.15 }]}
          />
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <View style={styles.insightIcon}>
              <Icon.Sparkles size={20} color={palette.tertiary}/>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[text.eyebrow, { color: palette.tertiary, letterSpacing: 2.2 }]}>
                THE ARCHITECT'S INSIGHT
              </Text>
              <Text style={styles.insightText}>{insightTip}</Text>
            </View>
          </View>
        </Pressable>

        {/* Budget card — only show when budget is set */}
        {cap > 0 && (
          <View style={styles.budget}>
            <View style={styles.budgetRow}>
              <View>
                <Text style={styles.budgetTitle}>Monthly Cap</Text>
                <Text style={styles.budgetSub}>
                  Remaining: ₹{Math.max(0, cap - spent).toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.budgetPct}>{pct}%</Text>
                <Text style={[text.eyebrow, { fontSize: 9, color: palette.textDim, letterSpacing: 1 }]}>
                  UTILIZED
                </Text>
              </View>
            </View>
            <ProgressBar pct={pct} colors={['#68dbae', '#facc15', '#ef4444']}/>
            <View style={styles.budgetFoot}>
              <Text style={styles.budgetMeta}>₹{spent.toLocaleString('en-IN')} SPENT</Text>
              <Text style={styles.budgetMeta}>LIMIT: ₹{cap.toLocaleString('en-IN')}</Text>
            </View>
          </View>
        )}

        {/* Recent transactions */}
        <View>
          <SectionLabel right={
            <Pressable onPress={() => router.push('/(tabs)/transactions')}
              style={styles.viewAll}>
              <Text style={styles.viewAllText}>VIEW ALL</Text>
            </Pressable>
          }>Recent Transactions</SectionLabel>

          {recent.length === 0 && !statsLoading ? (
            <View style={styles.emptyTx}>
              <Text style={styles.emptyTxText}>No transactions yet. Add your first one!</Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {recent.map((tx) => (
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
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function StatCol({ label, value, color, arrow }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={[text.eyebrow, { fontSize: 9, color: 'rgba(188,202,193,0.7)', letterSpacing: 0.8 }]}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
        <Text style={{ fontFamily: fonts.body, fontWeight: fontWeight.bold, fontSize: 17, color }}>
          {value}
        </Text>
        {arrow ? <Icon.TrendUp size={12} stroke={2.5} color={color}/> : null}
      </View>
    </View>
  );
}

function QuickAction({ Ico, label, onPress, accent }) {
  const color = accent === 'ai' ? palette.tertiary : palette.primary;
  const bg    = accent === 'ai' ? 'rgba(206,189,255,0.1)' : 'rgba(104,219,174,0.08)';
  return (
    <Pressable onPress={onPress} style={styles.qa}>
      <View style={[styles.qaIcon, { backgroundColor: bg }]}>
        <Ico size={20} color={color}/>
      </View>
      <Text style={[text.eyebrow, { color: palette.textMuted, fontSize: 10 }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg },
  scroll: {
    paddingHorizontal: 22,
    paddingTop: 6,
    paddingBottom: 140,
    gap: 28,
  },
  hero: {
    overflow: 'hidden',
    borderRadius: 24,
    padding: 28,
    paddingBottom: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 20 },
  },
  heroBlob: {
    position: 'absolute', right: -40, top: -40,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(104,219,174,0.35)',
    opacity: 0.5,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  balRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 8,
    minHeight: 60,
  },
  balance: {
    fontFamily: fonts.display,
    fontWeight: fontWeight.heavy,
    fontSize: 48,
    color: palette.text,
    letterSpacing: -2,
  },
  balDecimal: {
    fontFamily: fonts.display,
    fontWeight: fontWeight.heavy,
    fontSize: 28,
    color: palette.primary,
    letterSpacing: -1,
  },
  statRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 28,
  },
  qaRow: {
    flexDirection: 'row',
    gap: 10,
  },
  qa: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderRadius: 20,
    backgroundColor: palette.surfaceAlpha,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  qaIcon: {
    width: 40, height: 40, borderRadius: 99,
    alignItems: 'center', justifyContent: 'center',
  },
  insight: {
    overflow: 'hidden',
    borderRadius: 24,
    padding: 22,
    backgroundColor: 'rgba(25,28,31,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(206,189,255,0.12)',
  },
  insightIcon: {
    width: 40, height: 40, borderRadius: 99,
    backgroundColor: 'rgba(206,189,255,0.14)',
    alignItems: 'center', justifyContent: 'center',
  },
  insightText: {
    marginTop: 8,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 22,
    color: palette.textMuted,
  },
  budget: {
    borderRadius: 24,
    padding: 24,
    backgroundColor: palette.surfaceAlpha,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  budgetTitle: {
    fontFamily: fonts.display,
    fontWeight: fontWeight.bold,
    fontSize: 18,
    color: palette.text,
  },
  budgetSub: {
    fontSize: 12,
    color: 'rgba(188,202,193,0.7)',
    marginTop: 2,
  },
  budgetPct: {
    fontFamily: fonts.display,
    fontWeight: fontWeight.bold,
    fontSize: 20,
    color: palette.text,
  },
  budgetFoot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  budgetMeta: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: palette.textDim,
    letterSpacing: 0.5,
  },
  viewAll: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
    backgroundColor: 'rgba(104,219,174,0.08)',
  },
  viewAllText: {
    fontFamily: fonts.body,
    fontWeight: fontWeight.bold,
    fontSize: 11,
    color: palette.primary,
    letterSpacing: 1,
  },
  emptyTx: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  emptyTxText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: palette.textDim,
  },
});
