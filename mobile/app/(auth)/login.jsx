// Login screen — "Fiscal Architect" dark UI.
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, Pressable, ActivityIndicator,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../src/context/AuthContext';
import { palette } from '../../src/theme/colors';
import { fonts, fontSize, fontWeight, text } from '../../src/theme/typography';
import AuthGlows from '../../src/components/ui/AuthGlows';
import AuthHeader from '../../src/components/ui/AuthHeader';
import Field from '../../src/components/ui/Field';
import PrimaryButton from '../../src/components/ui/PrimaryButton';
import { Icon } from '../../src/components/ui/Icon';

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail]   = useState('');
  const [pw, setPw]         = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email.trim() || !pw) {
      Toast.show({ type: 'error', text1: 'Please fill in all fields' });
      return;
    }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), pw);
      router.replace('/(tabs)/dashboard');
    } catch (err) {
      const msg = err.message || 'Login failed';
      Toast.show({
        type: msg.includes('verify your email') ? 'info' : 'error',
        text1: msg,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <AuthGlows/>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <AuthHeader tagline="Elevate your financial architecture"/>

          <View style={styles.form}>
            <Field
              label="EMAIL ADDRESS"
              value={email}
              onChangeText={setEmail}
              placeholder="name@company.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              leading={<Icon.Mail size={18} color={palette.textMuted}/>}
            />
            <Field
              label="PASSWORD"
              value={pw}
              onChangeText={setPw}
              placeholder="••••••••"
              secureTextEntry={!showPw}
              textContentType="password"
              autoComplete="password"
              leading={<Icon.Lock size={18} color={palette.textMuted}/>}
              trailing={
                <Pressable onPress={() => setShowPw(s => !s)}
                  style={{ paddingHorizontal: 18, paddingVertical: 12 }}>
                  {showPw
                    ? <Icon.EyeOff size={18} color={palette.textMuted}/>
                    : <Icon.Eye size={18} color={palette.textMuted}/>}
                </Pressable>
              }
            />

            <Pressable
              style={{ alignSelf: 'flex-end' }}
              onPress={() => Toast.show({ type: 'info', text1: 'Password reset coming soon' })}
            >
              <Text style={styles.forgot}>Forgot Password?</Text>
            </Pressable>
          </View>

          <View style={{ marginTop: 22 }}>
            <PrimaryButton full onPress={submit} disabled={loading}>
              {loading ? <ActivityIndicator color={palette.primaryInk}/> : 'Sign In'}
            </PrimaryButton>
          </View>

          <View style={{ flex: 1 }}/>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Link href="/(auth)/register" asChild>
              <Pressable>
                <Text style={styles.link}>Sign Up</Text>
              </Pressable>
            </Link>
          </View>
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
    paddingVertical: 32,
  },
  form: {
    marginTop: 40,
    gap: 16,
  },
  forgot: {
    color: palette.primary,
    fontFamily: fonts.body,
    fontWeight: fontWeight.bold,
    fontSize: 13,
    marginTop: 4,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  footerText: {
    color: palette.textMuted,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  link: {
    color: palette.primary,
    fontFamily: fonts.body,
    fontWeight: fontWeight.bold,
    fontSize: 13,
  },
});
