// Google / Apple social login button.
import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { fonts, fontWeight, fontSize } from '../../theme/typography';

function GoogleG() {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18">
      <Path d="M17.64 9.2c0-.64-.06-1.25-.17-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" fill="#4285F4"/>
      <Path d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.92v2.33A9 9 0 0 0 9 18z" fill="#34A853"/>
      <Path d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.92A9 9 0 0 0 0 9c0 1.45.35 2.82.92 4.05l3.05-2.33z" fill="#FBBC05"/>
      <Path d="M9 3.58c1.32 0 2.5.45 3.44 1.35L15.02 2.34A9 9 0 0 0 9 0 9 9 0 0 0 .92 4.95l3.05 2.33C4.68 5.16 6.66 3.58 9 3.58z" fill="#EA4335"/>
    </Svg>
  );
}
function AppleMark() {
  return (
    <Svg width={16} height={18} viewBox="0 0 16 18">
      <Path fill="#111416" d="M13.1 9.5c0-2.4 2-3.5 2.1-3.5-1.1-1.6-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.6.9-.8 0-1.9-.9-3.1-.8-1.6 0-3 .9-3.8 2.3-1.6 2.8-.4 6.9 1.2 9.2.8 1.1 1.7 2.3 3 2.3 1.2 0 1.6-.8 3.1-.8 1.4 0 1.9.8 3.1.8 1.3 0 2.1-1.1 2.9-2.3.9-1.3 1.3-2.5 1.3-2.6-.1 0-2.5-.9-2.5-3.6zM10.7 2.5c.7-.8 1.1-1.9 1-3-1 0-2.2.6-2.9 1.4-.7.7-1.2 1.8-1.1 2.9 1.1.1 2.3-.5 3-1.3z"/>
    </Svg>
  );
}

export default function SocialBtn({ label, onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [
      styles.btn,
      { opacity: pressed ? 0.85 : 1 },
    ]}>
      {label === 'Google' ? <GoogleG/> : <AppleMark/>}
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(225,226,230,0.95)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  label: {
    color: '#111416',
    fontFamily: fonts.body,
    fontWeight: fontWeight.bold,
    fontSize: fontSize.lg,
  },
});
