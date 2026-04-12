// mobile/app/(tabs)/more.jsx
import React from 'react';
import { View, Text, Pressable, StyleSheet, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { spacing, radius, fontSize, fontWeight } from '../../src/theme/spacing';

export default function MoreScreen() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, colors } = useTheme();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const MenuItem = ({ icon, label, right, onPress, danger }) => (
    <Pressable
      style={[styles.menuItem, { borderBottomColor: colors.border }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <Ionicons name={icon} size={20} color={danger ? colors.danger : colors.textSecondary} />
      <Text style={[styles.menuLabel, { color: danger ? colors.danger : colors.textPrimary }]}>
        {label}
      </Text>
      <View style={styles.menuRight}>{right}</View>
    </Pressable>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Settings</Text>
      </View>

      {/* User Info */}
      <View style={[styles.userCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>
            {user?.name?.charAt(0)?.toUpperCase() || '?'}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: colors.textPrimary }]}>{user?.name || 'User'}</Text>
          <Text style={[styles.userEmail, { color: colors.textMuted }]}>{user?.email || ''}</Text>
        </View>
      </View>

      {/* Menu Items */}
      <View style={[styles.menuSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <MenuItem
          icon="moon-outline"
          label="Dark Mode"
          right={
            <Switch
              value={theme === 'dark'}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.primary + '50' }}
              thumbColor={theme === 'dark' ? colors.primary : colors.textMuted}
            />
          }
        />
        <MenuItem
          icon="wallet-outline"
          label="Currency"
          right={
            <Text style={[styles.menuValue, { color: colors.textMuted }]}>
              {user?.currency || 'INR'}
            </Text>
          }
        />
        <MenuItem
          icon="shield-checkmark-outline"
          label="Plan"
          right={
            <Text style={[styles.menuValue, { color: colors.primary }]}>
              {user?.plan || 'Free'}
            </Text>
          }
        />
      </View>

      <View style={[styles.menuSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <MenuItem
          icon="log-out-outline"
          label="Sign Out"
          onPress={handleLogout}
          danger
        />
      </View>

      {/* Version */}
      <Text style={[styles.version, { color: colors.textMuted }]}>
        SpendWise Mobile v1.0.0
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing['2xl'],
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
  userName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  userEmail: {
    fontSize: fontSize.sm,
  },
  menuSection: {
    marginHorizontal: spacing['2xl'],
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    gap: spacing.md,
  },
  menuLabel: {
    flex: 1,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  version: {
    textAlign: 'center',
    fontSize: fontSize.xs,
    marginTop: spacing['2xl'],
  },
});
