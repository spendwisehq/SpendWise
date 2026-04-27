// Signup + OTP — "Fiscal Architect" dark UI.
import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, Pressable, ActivityIndicator,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../src/context/AuthContext';
import authAPI from '../../src/api/auth.api';
import { palette } from '../../src/theme/colors';
import { fonts, fontSize, fontWeight, text } from '../../src/theme/typography';
import AuthGlows from '../../src/components/ui/AuthGlows';
import Field from '../../src/components/ui/Field';
import PrimaryButton from '../../src/components/ui/PrimaryButton';
import { Icon } from '../../src/components/ui/Icon';
import OTPInput from '../../src/components/OTPInput';

const STRENGTH = [
  { label: 'ENTER A PASSWORD', color: 'rgba(255,255,255,0.08)' },
  { label: 'WEAK',             color: '#ff8b6b' },
  { label: 'FAIR',             color: '#ffb684' },
  { label: 'STRONG',           color: '#facc15' },
  { label: 'ARCHITECTED',      color: '#68dbae' },
];

export default function RegisterScreen() {
  const { register, verifyOTP } = useAuth();
  const router = useRouter();

  const [step, setStep]         = useState(1);
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [pw, setPw]             = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [agree, setAgree]       = useState(false);
  const [loading, setLoading]   = useState(false);

  const [otp, setOtp]                   = useState('');
  const [verifying, setVerifying]       = useState(false);
  const [resendTimer, setResendTimer]   = useState(0);

  const strength = useMemo(() => {
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/\d/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
  }, [pw]);
  const meta = STRENGTH[strength];
  const canSubmit = name && email && pw.length >= 8 && agree;

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setInterval(() => setResendTimer(v => v - 1), 1000);
    return () => clearInterval(t);
  }, [resendTimer]);

  const submit = async () => {
    if (!canSubmit) {
      Toast.show({ type: 'error', text1: 'Complete all fields and accept terms' });
      return;
    }
    setLoading(true);
    try {
      const response = await register(name.trim(), email.trim().toLowerCase(), pw, 'INR');
      setStep(2);
      setResendTimer(60);
      if (response?.devMode && response?.otp) {
        Toast.show({ type: 'info', text1: `Dev mode — OTP: ${response.otp}`, visibilityTime: 10000 });
      } else {
        Toast.show({ type: 'success', text1: 'Verification code sent' });
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: err.message || 'Registration failed' });
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    if (otp.length !== 6) {
      Toast.show({ type: 'error', text1: 'Enter the 6-digit code' });
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

  const resend = async () => {
    if (resendTimer > 0) return;
    try {
      const response = await authAPI.resendOTP({ email: email.trim().toLowerCase() });
      setResendTimer(60);
      if (response?.devMode && response?.otp) {
        Toast.show({ type: 'info', text1: `Dev mode — OTP: ${response.otp}`, visibilityTime: 10000 });
      } else {
        Toast.show({ type: 'success', text1: 'New code sent' });
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: err.message || 'Failed to resend' });
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <AuthGlows/>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Back */}
          <Pressable
            onPress={() => step === 2 ? setStep(1) : router.back()}
            style={styles.backBtn}>
            <Icon.ChevLeft size={18} color={palette.text}/>
          </Pressable>

          {step === 1 ? (
            <>
              <View style={{ marginTop: 10 }}>
                <Text style={[text.eyebrow, { color: palette.primary, letterSpacing: 2.2 }]}>
                  BEGIN THE BLUEPRINT
                </Text>
                <Text style={styles.title}>{`Create your\nfinancial architecture.`}</Text>
                <Text style={styles.sub}>Two minutes to set up. Lifetime of precision.</Text>
              </View>

              <View style={{ marginTop: 28, gap: 14 }}>
                <Field label="FULL NAME" value={name} onChangeText={setName}
                       placeholder="Your Name" autoComplete="name"
                       leading={<Icon.Users size={18} color={palette.textMuted}/>}/>
                <Field label="EMAIL ADDRESS" value={email} onChangeText={setEmail}
                       placeholder="name@example.com" keyboardType="email-address"
                       autoCapitalize="none" autoComplete="email" textContentType="emailAddress"
                       leading={<Icon.Mail size={18} color={palette.textMuted}/>}/>
                <View>
                  <Field label="PASSWORD" value={pw} onChangeText={setPw}
                         placeholder="Min. 8 characters" secureTextEntry={!showPw}
                         autoComplete="new-password" textContentType="newPassword"
                         leading={<Icon.Lock size={18} color={palette.textMuted}/>}
                         trailing={
                           <Pressable onPress={() => setShowPw(s => !s)}
                             style={{ paddingHorizontal: 18, paddingVertical: 12 }}>
                             {showPw
                               ? <Icon.EyeOff size={18} color={palette.textMuted}/>
                               : <Icon.Eye size={18} color={palette.textMuted}/>}
                           </Pressable>
                         }/>
                  <View style={styles.strengthRow}>
                    {[0,1,2,3].map(i => (
                      <View key={i} style={[
                        styles.strengthBar,
                        { backgroundColor: i < strength ? meta.color : 'rgba(255,255,255,0.06)' },
                      ]}/>
                    ))}
                    <Text style={[styles.strengthLabel, {
                      color: strength ? meta.color : palette.textDim,
                    }]}>{meta.label}</Text>
                  </View>
                </View>
              </View>

              {/* Terms */}
              <Pressable onPress={() => setAgree(a => !a)} style={styles.terms}>
                <View style={[styles.checkbox, agree ? null : styles.checkboxOff]}>
                  {agree ? (
                    <LinearGradient colors={['#68dbae', '#26a37a']}
                      start={{x:0,y:0}} end={{x:1,y:1}}
                      style={[StyleSheet.absoluteFill, { borderRadius: 6 }]}/>
                  ) : null}
                  {agree ? <Icon.Check size={14} stroke={3} color={palette.primaryInk}/> : null}
                </View>
                <Text style={styles.termsText}>
                  I agree to SpendWise's <Text style={styles.termsLink}>Terms of Service</Text>{' '}
                  and acknowledge the <Text style={styles.termsLink}>Privacy Policy</Text>.
                </Text>
              </Pressable>

              <View style={{ marginTop: 20 }}>
                <PrimaryButton full onPress={submit} disabled={!canSubmit || loading}>
                  {loading ? <ActivityIndicator color={palette.primaryInk}/> : 'Create Account'}
                </PrimaryButton>
              </View>

              <View style={{ flex: 1 }}/>

              <View style={styles.footer}>
                <Text style={styles.footerText}>Already have an account? </Text>
                <Link href="/(auth)/login" asChild>
                  <Pressable>
                    <Text style={styles.link}>Sign In</Text>
                  </Pressable>
                </Link>
              </View>
            </>
          ) : (
            <>
              <View style={{ marginTop: 20 }}>
                <Text style={[text.eyebrow, { color: palette.primary, letterSpacing: 2.2 }]}>
                  VERIFY EMAIL
                </Text>
                <Text style={[styles.title, { fontSize: 30 }]}>{`Six digits.\nThen you're in.`}</Text>
                <Text style={styles.sub}>{`Code sent to ${email}.`}</Text>
              </View>

              <View style={{ marginTop: 32, gap: 18 }}>
                <OTPInput length={6} value={otp} onChange={setOtp}/>
                <PrimaryButton full onPress={verify} disabled={verifying || otp.length !== 6}>
                  {verifying ? <ActivityIndicator color={palette.primaryInk}/> : 'Verify'}
                </PrimaryButton>
                <Pressable onPress={resend} disabled={resendTimer > 0}>
                  <Text style={[styles.resend, {
                    color: resendTimer > 0 ? palette.textDim : palette.primary,
                  }]}>
                    {resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend code'}
                  </Text>
                </Pressable>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingVertical: 24,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: {
    color: palette.text,
    fontFamily: fonts.display,
    fontWeight: fontWeight.heavy,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -1.4,
    marginTop: 10,
  },
  sub: {
    color: palette.textMuted,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 10,
  },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 99,
  },
  strengthLabel: {
    fontFamily: fonts.body,
    fontSize: 10,
    fontWeight: fontWeight.bold,
    letterSpacing: 1.2,
    minWidth: 80,
    textAlign: 'right',
  },
  terms: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 20, height: 20, borderRadius: 6,
    marginTop: 1,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  checkboxOff: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  termsText: {
    flex: 1,
    color: palette.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
  },
  termsLink: {
    color: palette.primary,
    fontWeight: fontWeight.semibold,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 22,
  },
  footerText: { color: palette.textMuted, fontSize: 13 },
  link: {
    color: palette.primary,
    fontFamily: fonts.body,
    fontWeight: fontWeight.bold,
    fontSize: 13,
  },
  resend: {
    textAlign: 'center',
    fontFamily: fonts.body,
    fontWeight: fontWeight.semibold,
    fontSize: 14,
  },
});
