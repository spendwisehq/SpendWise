// Savings goals
import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { palette } from '../src/theme/colors';
import { fonts, fontWeight, text } from '../src/theme/typography';
import { Icon } from '../src/components/ui/Icon';
import TopBar, { IconButton } from '../src/components/ui/TopBar';
import ProgressBar from '../src/components/ui/ProgressBar';
import SectionLabel from '../src/components/ui/SectionLabel';
import { useGoals } from '../src/hooks/useGoals';

const GOAL_COLORS = ['#68dbae', '#cebdff', '#ffb684', '#7eaaff', '#ff94c2', '#facc15'];

const normalizeGoal = (g, i) => ({
  id:     g._id,
  title:  g.title || g.name || 'Goal',
  emoji:  g.emoji || g.icon || '🎯',
  saved:  g.savedAmount  ?? g.currentAmount ?? g.saved  ?? 0,
  target: g.targetAmount ?? g.target        ?? g.amount ?? 0,
  eta:    g.deadline
    ? new Date(g.deadline).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
    : g.eta || 'Ongoing',
  color: g.color || GOAL_COLORS[i % GOAL_COLORS.length],
});

export default function GoalsScreen() {
  const router = useRouter();
  const { data: rawData, isLoading, isRefetching, refetch } = useGoals();

  const goals = (rawData?.goals ?? rawData ?? []).map(normalizeGoal);

  const nearestGoal = goals.reduce((best, g) => {
    const pct = g.target > 0 ? (g.saved / g.target) : 0;
    if (!best || pct > (best.saved / best.target)) return g;
    return best;
  }, null);

  const remaining = nearestGoal && nearestGoal.target > 0
    ? nearestGoal.target - nearestGoal.saved
    : 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TopBar title="Savings Goals" subtitle="ARCHITECT FUTURE ASSETS"
        onBack={() => router.back()}
        right={<IconButton onPress={() => {}}><Icon.Plus size={18} color={palette.textMuted}/></IconButton>}/>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={palette.primary}/>
        }
      >
        {/* Forecast banner — only when goals exist */}
        {nearestGoal && (
          <View style={styles.forecast}>
            <View style={styles.forecastBlob}/>
            <View style={styles.forecastIcon}>
              <Icon.Sparkles size={24} color={palette.tertiary}/>
            </View>
            <Text style={[text.eyebrow, { color: palette.tertiary, letterSpacing: 1.8, textAlign: 'center' }]}>
              ARCHITECT'S FORECAST
            </Text>
            <Text style={styles.forecastText}>
              Save{' '}
              <Text style={{ fontWeight: fontWeight.bold, color: palette.tertiary }}>
                ₹{remaining.toLocaleString('en-IN')} more
              </Text>
              {' '}to reach your{' '}
              <Text style={{ fontWeight: fontWeight.bold }}>{nearestGoal.title}</Text>
              {' '}goal.
            </Text>
            <Pressable style={styles.boost} onPress={() => {}}>
              <Text style={styles.boostText}>Boost Goal</Text>
            </Pressable>
          </View>
        )}

        <SectionLabel right={
          <Text style={[text.eyebrow, { color: palette.textDim, letterSpacing: 1 }]}>
            {goals.length} ACTIVE
          </Text>
        }>Your Goals</SectionLabel>

        {isLoading ? (
          <ActivityIndicator color={palette.primary} style={{ marginTop: 40 }}/>
        ) : goals.length === 0 ? (
          <View style={styles.empty}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>🎯</Text>
            <Text style={styles.emptyText}>No goals yet. Tap + to create one.</Text>
          </View>
        ) : (
          goals.map(g => <GoalCard key={g.id} g={g}/>)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function GoalCard({ g }) {
  const pct = g.target > 0 ? Math.min(Math.round((g.saved / g.target) * 100), 100) : 0;
  return (
    <View style={styles.goal}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 18 }}>
        <View style={[styles.goalIcon, { backgroundColor: `${g.color}1f` }]}>
          <Text style={{ fontSize: 22 }}>{g.emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.goalTitle}>{g.title}</Text>
          <Text style={styles.goalSub}>Target · {g.eta}</Text>
        </View>
        <Text style={[styles.goalPct, { color: g.color }]}>{pct}%</Text>
      </View>
      <ProgressBar pct={pct} colors={[g.color, g.color + 'aa']}/>
      <View style={styles.goalFoot}>
        <Text style={{ color: palette.textMuted, fontFamily: fonts.body, fontSize: 12 }}>
          <Text style={{ color: palette.text, fontWeight: fontWeight.bold }}>
            ₹{g.saved.toLocaleString('en-IN')}
          </Text>{' '}saved
        </Text>
        <Text style={{ color: palette.textDim, fontSize: 12, fontFamily: fonts.body }}>
          of ₹{g.target.toLocaleString('en-IN')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg },
  scroll: { paddingHorizontal: 22, paddingTop: 6, paddingBottom: 60, gap: 20 },
  forecast: {
    overflow: 'hidden',
    borderRadius: 28,
    padding: 24,
    paddingTop: 28,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: 'rgba(206,189,255,0.3)',
    alignItems: 'center',
  },
  forecastBlob: {
    position: 'absolute', right: -30, top: -40,
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(206,189,255,0.12)',
  },
  forecastIcon: {
    width: 52, height: 52, borderRadius: 99,
    backgroundColor: 'rgba(206,189,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  forecastText: {
    fontFamily: fonts.body,
    fontSize: 17, lineHeight: 26,
    color: palette.text,
    marginTop: 10, marginBottom: 18,
    textAlign: 'center',
  },
  boost: {
    paddingVertical: 10, paddingHorizontal: 24,
    borderRadius: 99, backgroundColor: palette.tertiary,
  },
  boostText: {
    color: palette.tertiaryInk,
    fontFamily: fonts.body,
    fontWeight: fontWeight.bold,
    fontSize: 13,
  },
  goal: {
    borderRadius: 28,
    padding: 22,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  goalIcon: {
    width: 48, height: 48, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  goalTitle: {
    fontFamily: fonts.display,
    fontWeight: fontWeight.bold,
    fontSize: 17,
    color: palette.text,
  },
  goalSub: {
    fontSize: 12, color: palette.textDim, marginTop: 2, fontFamily: fonts.body,
  },
  goalPct: {
    fontFamily: fonts.display,
    fontWeight: fontWeight.heavy,
    fontSize: 20,
  },
  goalFoot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  empty: {
    alignItems: 'center', paddingTop: 60,
  },
  emptyText: {
    fontFamily: fonts.body, fontSize: 14,
    color: palette.textDim, textAlign: 'center',
  },
});
