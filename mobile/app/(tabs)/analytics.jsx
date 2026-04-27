// Analytics / Insights
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import Svg, { Circle, Path, Defs, LinearGradient as SvgLG, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { palette } from '../../src/theme/colors';
import { fonts, fontWeight, text } from '../../src/theme/typography';
import { Icon } from '../../src/components/ui/Icon';
import TopBar, { IconButton } from '../../src/components/ui/TopBar';
import Ring from '../../src/components/ui/Ring';
import { useTransactionSummary } from '../../src/hooks/useDashboardStats';
import { useAIScore } from '../../src/hooks/useAIChat';

const CAT_COLORS = [
  '#68dbae', '#cebdff', '#ffb684', '#7eaaff',
  '#ff94c2', '#facc15', '#f97316', '#34d399',
];

const monthLabel = (m, y) => {
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }).toUpperCase();
};

export default function AnalyticsScreen() {
  const [tab, setTab] = useState('Overview');

  const now = new Date();
  const month = now.getMonth() + 1;
  const year  = now.getFullYear();

  const { data: summary, isLoading, isRefetching, refetch } = useTransactionSummary(month, year);
  const { data: scoreData, isLoading: scoreLoading } = useAIScore();

  const total      = summary?.totalExpense ?? 0;
  const categories = (summary?.byCategory ?? []).map((c, i) => ({
    key:   c.name || c._id || 'Other',
    color: c.color || CAT_COLORS[i % CAT_COLORS.length],
    share: Math.round(c.percentage ?? 0),
    value: c.total ?? 0,
  })).filter(c => c.share > 0);

  const scoreVal  = scoreData?.score ?? scoreData?.healthScore ?? 0;
  const scoreNote = scoreData?.summary ?? scoreData?.note ?? 'Ask the AI for a personalised health score.';

  const size = 220, stroke = 28;
  const r = (size - stroke) / 2;
  const cx = size / 2, cy = size / 2;
  const C = 2 * Math.PI * r;
  let off = 0;
  const arcs = categories.map(c => {
    const arc = { ...c, dash: (c.share / 100) * C, offset: off };
    off += arc.dash + 2;
    return arc;
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TopBar title="Insights" subtitle="ARCHITECT'S PANEL"
        right={<IconButton><Icon.Settings size={18} color={palette.textMuted}/></IconButton>}/>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={palette.primary}/>
        }
      >
        {/* Tab nav */}
        <View style={styles.tabRow}>
          {['Overview', 'Categories', 'Trends'].map(t => (
            <Pressable key={t} onPress={() => setTab(t)} style={styles.tabBtn}>
              <Text style={[styles.tabText, { color: tab === t ? palette.text : palette.textDim }]}>
                {t}
              </Text>
              {tab === t ? <View style={styles.tabUnderline}/> : null}
            </Pressable>
          ))}
        </View>

        {/* Donut card */}
        <View style={styles.card}>
          <Text style={[text.eyebrow, { color: palette.textMuted }]}>MONTHLY SPENDING</Text>

          {isLoading ? (
            <ActivityIndicator color={palette.primary} style={{ marginVertical: 40 }}/>
          ) : (
            <>
              <View style={{ alignItems: 'center', marginTop: 20, marginBottom: 24 }}>
                <View style={{ width: size, height: size }}>
                  <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
                    <Circle cx={cx} cy={cy} r={r} stroke="rgba(255,255,255,0.04)"
                      strokeWidth={stroke} fill="none"/>
                    {arcs.map((a, i) => (
                      <Circle key={i} cx={cx} cy={cy} r={r} stroke={a.color}
                        strokeWidth={stroke} fill="none"
                        strokeDasharray={`${a.dash} ${C - a.dash}`}
                        strokeDashoffset={-a.offset}
                      />
                    ))}
                  </Svg>
                  <View style={[StyleSheet.absoluteFill, { alignItems:'center', justifyContent:'center' }]}>
                    <Text style={{ fontSize: 12, color: palette.textMuted, fontFamily: fonts.body }}>
                      Total Spent
                    </Text>
                    <Text style={styles.donutTotal}>
                      ₹{total.toLocaleString('en-IN')}
                    </Text>
                    <Text style={[text.eyebrow, { color: palette.primary, letterSpacing: 1.5 }]}>
                      {monthLabel(month, year)}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={{ gap: 14 }}>
                {categories.slice(0, 5).map(c => (
                  <View key={c.key} style={styles.breakdownRow}>
                    <View style={[styles.dot, { backgroundColor: c.color }]}/>
                    <Text style={styles.breakdownName}>{c.key}</Text>
                    <Text style={styles.breakdownVal}>
                      ₹{c.value.toLocaleString('en-IN')}
                    </Text>
                    <Text style={[text.eyebrow, {
                      color: c.color, fontSize: 10, minWidth: 32, textAlign: 'right',
                    }]}>
                      {c.share}%
                    </Text>
                  </View>
                ))}
                {categories.length === 0 && (
                  <Text style={styles.noData}>No spending data for this month yet.</Text>
                )}
              </View>
            </>
          )}
        </View>

        {/* Health score */}
        <View style={styles.healthCard}>
          <LinearGradient
            colors={['rgba(206,189,255,0.12)', 'rgba(25,28,31,1)']}
            start={{x:0,y:0}} end={{x:1,y:1}}
            style={StyleSheet.absoluteFill}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
            <View style={{ flex: 1 }}>
              <Text style={[text.eyebrow, { color: palette.tertiary, letterSpacing: 2 }]}>
                AI HEALTH SCORE
              </Text>
              {scoreLoading ? (
                <ActivityIndicator color={palette.tertiary} style={{ marginTop: 12 }}/>
              ) : (
                <>
                  <Text style={styles.scoreValue}>
                    {scoreVal}<Text style={{ fontSize: 22, color: palette.textDim }}>/100</Text>
                  </Text>
                  <Text style={styles.scoreNote}>{scoreNote}</Text>
                </>
              )}
            </View>
            <Ring size={100} stroke={8} pct={scoreVal} color={palette.tertiary}>
              <Icon.Sparkles size={28} color={palette.tertiary}/>
            </Ring>
          </View>
        </View>

        {/* Top categories table */}
        {categories.length > 0 && (
          <View style={styles.card}>
            <Text style={[text.eyebrow, { color: palette.textMuted, marginBottom: 16 }]}>
              TOP CATEGORIES
            </Text>
            {categories.slice(0, 5).map((c, i) => (
              <View key={c.key} style={[
                styles.merchantRow,
                i ? { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.03)' } : null,
              ]}>
                <View style={[styles.merchantIcon, { backgroundColor: `${c.color}18` }]}>
                  <Text style={{ fontSize: 16 }}>📊</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.merchantName}>{c.key}</Text>
                  <Text style={styles.merchantSub}>{c.share}% of spending</Text>
                </View>
                <Text style={styles.merchantVal}>₹{c.value.toLocaleString('en-IN')}</Text>
              </View>
            ))}
          </View>
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
    gap: 20,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 24,
  },
  tabBtn: {
    paddingBottom: 10,
    alignItems: 'center',
  },
  tabText: {
    fontFamily: fonts.body,
    fontWeight: fontWeight.semibold,
    fontSize: 15,
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    width: '80%',
    height: 2,
    borderRadius: 99,
    backgroundColor: palette.primary,
  },
  card: {
    borderRadius: 28,
    padding: 24,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  donutTotal: {
    fontFamily: fonts.display,
    fontWeight: fontWeight.heavy,
    fontSize: 28,
    color: palette.text,
    letterSpacing: -1,
    marginTop: 4,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    width: 8, height: 8, borderRadius: 4,
  },
  breakdownName: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    color: palette.textMuted,
  },
  breakdownVal: {
    fontFamily: fonts.body,
    fontWeight: fontWeight.bold,
    fontSize: 14,
    color: palette.text,
  },
  noData: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: palette.textDim,
    textAlign: 'center',
    paddingVertical: 16,
  },
  healthCard: {
    overflow: 'hidden',
    borderRadius: 28,
    padding: 24,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: 'rgba(206,189,255,0.15)',
  },
  scoreValue: {
    fontFamily: fonts.display,
    fontWeight: fontWeight.heavy,
    fontSize: 52,
    color: palette.tertiary,
    letterSpacing: -2,
    marginTop: 8,
  },
  scoreNote: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 20,
    color: palette.textMuted,
    marginTop: 8,
  },
  merchantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
  },
  merchantIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  merchantName: {
    fontFamily: fonts.body,
    fontWeight: fontWeight.semibold,
    fontSize: 14,
    color: palette.text,
  },
  merchantSub: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: palette.textDim,
    marginTop: 2,
  },
  merchantVal: {
    fontFamily: fonts.body,
    fontWeight: fontWeight.bold,
    fontSize: 14,
    color: palette.text,
  },
  cardHeadline: {
    fontFamily: fonts.display,
    fontWeight: fontWeight.bold,
    fontSize: 18,
    color: palette.text,
    marginTop: 4,
  },
});
