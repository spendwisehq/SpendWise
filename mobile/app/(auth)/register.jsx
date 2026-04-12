// mobile/app/(auth)/register.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import OTPInput from '../../src/components/OTPInput';
import { spacing, radius, fontSize, fontWeight } from '../../src/theme/spacing';

const CURRENCIES = [
  { value: 'INR', label: 'INR (\u20b9)' },
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (\u20ac)' },
  { value: 'GBP', label: 'GBP (\u00a3)' },
];

export default function RegisterScreen() {
  const { register, verifyOTP } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();

  const [step, setStep] = useState(1);

  // Step 1 fields
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [loading, setLoading]   = useState(false);

  // Step 2 fields
  const [otp, setOtp]             = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // Resend countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => setResendTimer(t => t - 1), 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password) {
      Toast.show({ type: 'error', text1: 'Please fill in all fields' });
      return;
    }
    if (password.length < 6) {
      Toast.show({ type: 'error', text1: 'Password must be at least 6 characters' });
      return;
    }

    setLoading(true);
    try {
      await register(name.trim(), email.trim().toLowerCase(), password, currency);
      setStep(2);
      setResendTimer(60);
      Toast.show({ type: 'success', text1: 'Verification code sent to your email' });
    } catch (err) {
      Toast.show({ type: 'error', text1: err.message || 'Registration failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (otp.length !== 6) {
      Toast.show({ type: 'error', text1: 'Please enter the 6-digit code' });
      return;
    }

    setVerifying(true);
    try {
      await verifyOTP(email.trim().toLowerCase(), otp);
      Toast.show({ type: 'success', text1: 'Welcome to SpendWise!' });
      router.replace('/(tabs)/dashboard');
    } catch (err) {
      Toast.show({ type: 'error', text1: err.message || 'Verification failed' });
      setOtp('');
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    try {
      await register(name.trim(), email.trim().toLowerCase(), password, currency);
      setResendTimer(60);
      Toast.show({ type: 'success', text1: 'New code sent!' });
    } catch (err) {
      Toast.show({ type: 'error', text1: err.message || 'Failed to resend' });
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.logo, { backgroundColor: colors.primary }]}>
              <Text style={styles.logoText}>S</Text>
            </View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {step === 1 ? 'Create account' : 'Verify email'}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {step === 1
                ? 'Start tracking your expenses with SpendWise'
                : `Enter the code sent to ${email}`}
            </Text>
          </View>

          {step === 1 ? (
            /* Step 1: Registration Form */
            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Full Name</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                  value={name}
                  onChangeText={setName}
                  placeholder="John Doe"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="words"
                  textContentType="name"
                  autoComplete="name"
                />
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="emailAddress"
                  autoComplete="email"
                />
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Password</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Min. 6 characters"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry
                  textContentType="newPassword"
                  autoComplete="new-password"
                />
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Currency</Text>
                <View style={styles.currencyRow}>
                  {CURRENCIES.map(c => (
                    <Pressable
                      key={c.value}
                      onPress={() => setCurrency(c.value)}
                      style={[
                        styles.currencyChip,
                        {
                          backgroundColor: currency === c.value ? colors.primary : colors.surface,
                          borderColor: currency === c.value ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text style={{
                        color: currency === c.value ? '#FFFFFF' : colors.textSecondary,
                        fontSize: fontSize.sm,
                        fontWeight: fontWeight.medium,
                      }}>
                        {c.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <Pressable
                style={[styles.button, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
                onPress={handleRegister}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.buttonText}>Create Account</Text>
                )}
              </Pressable>
            </View>
          ) : (
            /* Step 2: OTP Verification */
            <View style={styles.form}>
              <OTPInput length={6} value={otp} onChange={setOtp} />

              <Pressable
                style={[styles.button, { backgroundColor: colors.primary, opacity: verifying ? 0.7 : 1 }]}
                onPress={handleVerify}
                disabled={verifying || otp.length !== 6}
              >
                {verifying ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.buttonText}>Verify</Text>
                )}
              </Pressable>

              <Pressable onPress={handleResend} disabled={resendTimer > 0}>
                <Text style={[styles.resendText, { color: resendTimer > 0 ? colors.textMuted : colors.primary }]}>
                  {resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend code'}
                </Text>
              </Pressable>

              <Pressable onPress={() => { setStep(1); setOtp(''); }}>
                <Text style={[styles.backText, { color: colors.textSecondary }]}>
                  Back to registration
                </Text>
              </Pressable>
            </View>
          )}

          {/* Footer (step 1 only) */}
          {step === 1 && (
            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: colors.textMuted }]}>
                Already have an account?{' '}
              </Text>
              <Link href="/(auth)/login" asChild>
                <Pressable>
                  <Text style={[styles.link, { color: colors.primary }]}>Sign in</Text>
                </Pressable>
              </Link>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing['3xl'],
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing['3xl'],
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
  },
  form: {
    gap: spacing.lg,
  },
  field: {
    gap: spacing.sm,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: spacing.lg,
    fontSize: 15,
  },
  currencyRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  currencyChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  button: {
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  resendText: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
  backText: {
    textAlign: 'center',
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing['3xl'],
  },
  footerText: {
    fontSize: 13,
  },
  link: {
    fontSize: 13,
    fontWeight: '600',
  },
});
