// Settings
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { palette, gradients } from '../src/theme/colors';
import { fonts, fontWeight, text } from '../src/theme/typography';
import { Icon } from '../src/components/ui/Icon';
import TopBar from '../src/components/ui/TopBar';
import { Avatar } from '../src/components/ui/TopBar';
import { useAuth } from '../src/context/AuthContext';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const [notif, setNotif]                 = useState(true);
  const [biometric, setBiometric]         = useState(true);
  const [haptics, setHaptics]             = useState(true);
  const [voice, setVoice]                 = useState(false);
  const [hideBal, setHideBal]             = useState(false);
  const [currency, setCurrency]           = useState('INR');

  const signOut = async () => {
    try { await logout(); } catch {}
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TopBar title="Settings" subtitle="PREFERENCES & ACCOUNT" onBack={() => router.back()}/>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Profile card */}
        <View style={styles.profile}>
          <LinearGradient colors={gradients.profileCard}
            start={{x:0,y:0}} end={{x:1,y:1}}
            style={StyleSheet.absoluteFill}/>
          <View style={styles.profileBlob}/>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <Avatar size={64} letter={(user?.name || 'S')[0].toUpperCase()}/>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.profName}>{user?.name || 'User'}</Text>
              <Text numberOfLines={1} style={styles.profEmail}>
                {user?.email || ''}
              </Text>
            </View>
            <View style={styles.profEdit}>
              <Icon.ChevRight size={18} color={palette.text}/>
            </View>
          </View>
        </View>

        <Group label="PREFERENCES">
          <Row icon={<Icon.Bell size={18} color={palette.primary}/>} accent={palette.primary}
               label="Notifications" sub="Budget, insights & AI nudges"
               right={<Toggle on={notif} onChange={setNotif}/>}/>
          <Row icon={<Icon.Lock size={18} color={palette.tertiary}/>} accent={palette.tertiary}
               label="Biometric Lock" sub="Face ID on app launch"
               right={<Toggle on={biometric} onChange={setBiometric}/>}/>
          <Row icon={<Icon.Flame size={18} color="#ffb684"/>} accent="#ffb684"
               label="Haptic Feedback" sub="Subtle taps on actions"
               right={<Toggle on={haptics} onChange={setHaptics}/>}/>
          <Row icon={<Icon.Sparkles size={18} color={palette.tertiary}/>} accent={palette.tertiary}
               label="Architect Voice" sub="Read AI insights aloud"
               right={<Toggle on={voice} onChange={setVoice}/>}/>
        </Group>

        <Group label="FINANCES">
          <Row icon={<Text style={{ fontSize: 18 }}>💰</Text>} accent={palette.primary}
               label="Currency" sub="Default transaction unit"
               right={<Stepper options={['INR','USD','EUR','GBP']} value={currency} onChange={setCurrency}/>}/>
          <Row icon={<Icon.Target size={18} color="#7eaaff"/>} accent="#7eaaff"
               label="Monthly Cap"
               sub={user?.monthlyBudget ? `₹${user.monthlyBudget.toLocaleString('en-IN')} · resets on the 1st` : 'Not set'}
               right={<Chev/>}/>
        </Group>

        <Group label="PRIVACY & DATA">
          <Row icon={<Icon.Eye size={18} color={palette.tertiary}/>} accent={palette.tertiary}
               label="Hide balances by default" sub="Blur amounts until tapped"
               right={<Toggle on={hideBal} onChange={setHideBal}/>}/>
          <Row icon={<Icon.Camera size={18} color="#ffb684"/>} accent="#ffb684"
               label="Receipts storage" sub="Auto-delete after 90 days"
               right={<Chev/>}/>
          <Row icon={<Icon.Scan size={18} color="#7eaaff"/>} accent="#7eaaff"
               label="Export data" sub="CSV, PDF or JSON"
               right={<Chev/>}/>
        </Group>

        <Group label="SUPPORT">
          <Row icon={<Icon.Sparkles size={18} color={palette.tertiary}/>} accent={palette.tertiary}
               label="Ask The Architect" sub="AI-guided walkthroughs" right={<Chev/>}/>
          <Row icon={<Icon.Mail size={18} color={palette.primary}/>} accent={palette.primary}
               label="Contact support" right={<Chev/>}/>
          <Row icon={<Icon.Settings size={18} color="#8794a0"/>} accent="#8794a0"
               label="About & version" sub="v2.4.1 · build 2026.04" right={<Chev/>}/>
        </Group>

        <Pressable onPress={signOut} style={styles.signOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>

        <Text style={styles.footerNote}>DESIGNED FOR DELIBERATE SPENDERS</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Group({ label, children }) {
  return (
    <View>
      <Text style={[text.eyebrow, { paddingLeft: 6, marginBottom: 10, color: palette.textMuted, letterSpacing: 2 }]}>
        {label}
      </Text>
      <View style={styles.group}>{children}</View>
    </View>
  );
}

function Row({ icon, accent, label, sub, right }) {
  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: `${accent}18` }]}>
        {icon}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sub ? <Text numberOfLines={1} style={styles.rowSub}>{sub}</Text> : null}
      </View>
      {right}
    </View>
  );
}

function Toggle({ on, onChange }) {
  return (
    <Pressable onPress={() => onChange(!on)} style={styles.toggle}>
      {on ? (
        <LinearGradient colors={['#68dbae', '#26a37a']} start={{x:0,y:0}} end={{x:1,y:1}}
          style={[StyleSheet.absoluteFill, { borderRadius: 99 }]}/>
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 99 }]}/>
      )}
      <View style={[styles.knob, {
        left: on ? 21 : 3,
        backgroundColor: on ? '#003827' : '#e1e2e6',
      }]}/>
    </Pressable>
  );
}

function Stepper({ options, value, onChange }) {
  return (
    <View style={styles.stepper}>
      {options.map(o => (
        <Pressable key={o} onPress={() => onChange(o)} style={[
          styles.stepBtn,
          { backgroundColor: value === o ? '#26a37a' : 'transparent' },
        ]}>
          <Text style={[styles.stepText, {
            color: value === o ? '#003327' : palette.textDim,
          }]}>{o}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Chev() {
  return <Icon.ChevRight size={16} color={palette.textDim}/>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg },
  scroll: { paddingHorizontal: 22, paddingTop: 6, paddingBottom: 60, gap: 22 },
  profile: {
    overflow: 'hidden',
    borderRadius: 28,
    padding: 22,
    paddingVertical: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  profileBlob: {
    position: 'absolute', right: -40, top: -40,
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(104,219,174,0.22)',
  },
  profName: {
    fontFamily: fonts.display,
    fontWeight: fontWeight.bold,
    fontSize: 20,
    color: palette.text,
    letterSpacing: -0.4,
  },
  profEmail: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: palette.textMuted,
    marginTop: 2,
  },
  tier: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 99,
    backgroundColor: 'rgba(206,189,255,0.18)',
    alignSelf: 'flex-start',
  },
  tierText: {
    color: palette.tertiary,
    fontFamily: fonts.body,
    fontWeight: fontWeight.bold,
    fontSize: 10,
    letterSpacing: 1.6,
  },
  profEdit: {
    width: 40, height: 40, borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  group: {
    backgroundColor: palette.surfaceLow,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.03)',
  },
  rowIcon: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  rowLabel: {
    fontFamily: fonts.display,
    fontWeight: fontWeight.bold,
    fontSize: 14.5,
    color: palette.text,
  },
  rowSub: {
    fontSize: 11.5,
    color: palette.textDim,
    marginTop: 2,
    fontFamily: fonts.body,
  },
  toggle: {
    width: 46, height: 28,
    borderRadius: 99,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  knob: {
    position: 'absolute',
    top: 3,
    width: 22, height: 22, borderRadius: 99,
  },
  stepper: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  stepBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 99,
  },
  stepText: {
    fontFamily: fonts.body,
    fontWeight: fontWeight.bold,
    fontSize: 11,
    letterSpacing: 0.4,
  },
  signOut: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 20,
    backgroundColor: 'rgba(255,120,120,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,120,120,0.15)',
    alignItems: 'center',
  },
  signOutText: {
    color: '#ff9b9b',
    fontFamily: fonts.display,
    fontWeight: fontWeight.bold,
    fontSize: 15,
  },
  footerNote: {
    textAlign: 'center',
    fontSize: 11,
    color: palette.textDim,
    fontFamily: fonts.body,
    fontWeight: fontWeight.semibold,
    letterSpacing: 1.5,
    marginTop: -8,
  },
});
