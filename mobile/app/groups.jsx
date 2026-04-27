// Groups & Splits
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { palette } from '../src/theme/colors';
import { fonts, fontWeight, text } from '../src/theme/typography';
import { Icon } from '../src/components/ui/Icon';
import TopBar, { IconButton } from '../src/components/ui/TopBar';
import { useGroups } from '../src/hooks/useGroups';
import { useFriends } from '../src/hooks/useFriends';

const ACCENT_COLORS = ['#cebdff', '#68dbae', '#ffb684', '#7eaaff', '#ff94c2', '#facc15'];

const normalizeGroup = (g, i) => ({
  id:       g._id,
  name:     g.name,
  emoji:    g.emoji || g.icon || '👥',
  members:  g.members?.length ?? g.memberCount ?? 0,
  total:    g.totalAmount ?? g.total ?? 0,
  youOwe:   g.balance < 0 ? Math.abs(g.balance) : 0,
  owesYou:  g.balance > 0 ? g.balance : 0,
  accent:   ACCENT_COLORS[i % ACCENT_COLORS.length],
});

const normalizeFriend = (f) => {
  const name    = f.friend?.name || f.name || 'Friend';
  const balance = f.balance ?? f.amount ?? 0;
  return {
    id:    f._id,
    n:     name,
    emoji: '👤',
    them:  balance > 0 ? balance : 0,
    you:   balance < 0 ? Math.abs(balance) : 0,
  };
};

export default function GroupsScreen() {
  const router = useRouter();
  const [tab, setTab] = useState('Groups');

  const { data: groupData, isLoading: gLoading, isRefetching: gRefetch, refetch: refetchGroups } = useGroups();
  const { data: friendData, isLoading: fLoading, isRefetching: fRefetch, refetch: refetchFriends } = useFriends();

  const groups  = (groupData?.groups  ?? groupData  ?? []).map(normalizeGroup);
  const friends = (friendData?.friends ?? friendData ?? []).map(normalizeFriend);

  const isLoading    = tab === 'Groups' ? gLoading  : fLoading;
  const isRefetching = tab === 'Groups' ? gRefetch  : fRefetch;
  const refetch      = tab === 'Groups' ? refetchGroups : refetchFriends;

  const totalOwed = friends.reduce((s, f) => s + f.them, 0);
  const totalOwe  = friends.reduce((s, f) => s + f.you, 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TopBar title="Groups" subtitle="SHARED LEDGER" onBack={() => router.back()}
        right={<IconButton onPress={() => {}}><Icon.Plus size={18} color={palette.textMuted}/></IconButton>}/>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={palette.primary}/>
        }
      >
        <View style={styles.tabs}>
          {['Friends', 'Groups'].map(t => {
            const active = tab === t;
            return (
              <Pressable key={t} onPress={() => setTab(t)} style={[
                styles.tab,
                { backgroundColor: active ? '#26a37a' : 'transparent', shadowOpacity: active ? 0.5 : 0 },
              ]}>
                <Text style={[styles.tabText, { color: active ? '#003327' : palette.textMuted }]}>{t}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Summary insight */}
        {(totalOwed > 0 || totalOwe > 0) && (
          <View style={styles.insight}>
            <View style={styles.insightBlob}/>
            <View style={{ flexDirection: 'row', gap: 14 }}>
              <View style={styles.insightIcon}>
                <Icon.Sparkles size={20} color={palette.tertiary}/>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[text.eyebrow, { color: palette.tertiary, letterSpacing: 1.8 }]}>
                  ARCHITECT'S SUMMARY
                </Text>
                <Text style={styles.insightText}>
                  {totalOwed > 0 && (
                    <>
                      You're owed{' '}
                      <Text style={{ color: palette.primary, fontWeight: fontWeight.bold }}>
                        ₹{totalOwed.toLocaleString('en-IN')}
                      </Text>
                    </>
                  )}
                  {totalOwed > 0 && totalOwe > 0 ? ' and owe ' : ''}
                  {totalOwe > 0 && (
                    <Text style={{ color: '#ffb684', fontWeight: fontWeight.bold }}>
                      ₹{totalOwe.toLocaleString('en-IN')}
                    </Text>
                  )}
                  {totalOwed === 0 && totalOwe === 0 ? 'All settled up.' : ' across your groups.'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {isLoading ? (
          <ActivityIndicator color={palette.primary} style={{ marginTop: 40 }}/>
        ) : tab === 'Groups' ? (
          groups.length === 0 ? (
            <EmptyState icon="👥" message="No groups yet. Tap + to create one."/>
          ) : (
            <View style={{ gap: 14 }}>
              {groups.map(g => <GroupCard key={g.id} g={g}/>)}
            </View>
          )
        ) : (
          friends.length === 0 ? (
            <EmptyState icon="🤝" message="No friends added yet."/>
          ) : (
            <View style={{ gap: 10 }}>
              {friends.map(f => (
                <View key={f.id} style={styles.friendRow}>
                  <View style={styles.friendIcon}>
                    <Text style={{ fontSize: 20 }}>{f.emoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.friendName}>{f.n}</Text>
                    <Text style={styles.friendSub}>
                      {f.them > 0 ? 'Owes you' : f.you > 0 ? 'You owe' : 'Settled'}
                    </Text>
                  </View>
                  {(f.them > 0 || f.you > 0) && (
                    <Text style={[styles.friendVal, {
                      color: f.them > 0 ? palette.primary : '#ffb684',
                    }]}>
                      ₹{(f.them || f.you).toLocaleString('en-IN')}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function GroupCard({ g }) {
  return (
    <View style={styles.groupCard}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={[styles.groupIcon, { backgroundColor: `${g.accent}1a` }]}>
          <Text style={{ fontSize: 22 }}>{g.emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.groupName}>{g.name}</Text>
          <Text style={styles.groupSub}>
            {g.members} members · ₹{g.total.toLocaleString('en-IN')} total
          </Text>
        </View>
        <Icon.ChevRight size={18} color={palette.textDim}/>
      </View>
      <View style={styles.pillRow}>
        <Pill label="YOU OWE"  value={g.youOwe}  color="#ffb684"/>
        <Pill label="OWES YOU" value={g.owesYou} color={palette.primary}/>
      </View>
    </View>
  );
}

function Pill({ label, value, color }) {
  const zero = value === 0;
  return (
    <View style={[
      styles.pill,
      {
        backgroundColor: zero ? 'rgba(255,255,255,0.03)' : `${color}10`,
        borderColor:     zero ? 'rgba(255,255,255,0.04)' : color + '25',
      },
    ]}>
      <Text style={[text.eyebrow, {
        fontSize: 9, letterSpacing: 1.2,
        color: zero ? palette.textDim : color,
      }]}>{label}</Text>
      <Text style={[styles.pillVal, { color: zero ? palette.textDim : color }]}>
        ₹{value.toLocaleString('en-IN')}
      </Text>
    </View>
  );
}

function EmptyState({ icon, message }) {
  return (
    <View style={styles.empty}>
      <Text style={{ fontSize: 40, marginBottom: 12 }}>{icon}</Text>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg },
  scroll: { paddingHorizontal: 22, paddingTop: 6, paddingBottom: 60, gap: 20 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: palette.surface,
    borderRadius: 99,
    padding: 6,
    gap: 6,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 99,
    alignItems: 'center',
    shadowColor: '#26a37a',
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  tabText: {
    fontFamily: fonts.body,
    fontWeight: fontWeight.bold,
    fontSize: 14,
  },
  insight: {
    overflow: 'hidden',
    borderRadius: 28,
    padding: 22,
    backgroundColor: palette.surfaceMed,
  },
  insightBlob: {
    position: 'absolute', right: -48, top: -48,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(206,189,255,0.12)',
  },
  insightIcon: {
    width: 40, height: 40, borderRadius: 99,
    backgroundColor: 'rgba(206,189,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  insightText: {
    fontFamily: fonts.body,
    fontSize: 14, lineHeight: 22,
    color: palette.textMuted,
    marginTop: 6,
  },
  groupCard: {
    borderRadius: 24,
    padding: 20,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  groupIcon: {
    width: 48, height: 48, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  groupName: {
    fontFamily: fonts.display,
    fontWeight: fontWeight.bold,
    fontSize: 16,
    color: palette.text,
  },
  groupSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: palette.textDim,
    marginTop: 2,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  pill: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
  },
  pillVal: {
    fontFamily: fonts.display,
    fontWeight: fontWeight.bold,
    fontSize: 15,
    marginTop: 4,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 20,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  friendIcon: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center', justifyContent: 'center',
  },
  friendName: {
    fontFamily: fonts.body,
    fontWeight: fontWeight.semibold,
    fontSize: 15,
    color: palette.text,
  },
  friendSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: palette.textDim,
    marginTop: 2,
  },
  friendVal: {
    fontFamily: fonts.body,
    fontWeight: fontWeight.bold,
    fontSize: 15,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: palette.textDim,
    textAlign: 'center',
  },
});
