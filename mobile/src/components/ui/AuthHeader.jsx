// Logo + app name + tagline header on login screen.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { palette, gradients } from '../../theme/colors';
import { fonts, fontWeight } from '../../theme/typography';
import { Icon } from './Icon';

export default function AuthHeader({ tagline }) {
  return (
    <View style={styles.wrap}>
      <LinearGradient colors={gradients.primary} start={{x:0,y:0}} end={{x:1,y:1}}
        style={styles.logo}>
        <Icon.Logo size={44}/>
      </LinearGradient>
      <View style={{ alignItems:'center' }}>
        <Text style={styles.brand}>SpendWise</Text>
        <Text style={styles.tagline}>{tagline}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 16,
    marginTop: 20,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#68dbae',
    shadowOpacity: 0.4,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 14 },
  },
  brand: {
    fontFamily: fonts.display,
    fontWeight: fontWeight.heavy,
    fontSize: 38,
    letterSpacing: -1.5,
    color: palette.text,
  },
  tagline: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: palette.textMuted,
    marginTop: 4,
  },
});

export function AuthDivider({ label = 'OR CONTINUE WITH' }) {
  return (
    <View style={dividerStyles.row}>
      <View style={dividerStyles.line}/>
      <Text style={dividerStyles.label}>{label}</Text>
      <View style={dividerStyles.line}/>
    </View>
  );
}

const dividerStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 22,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  label: {
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.textDim,
    fontFamily: fonts.body,
    fontWeight: fontWeight.bold,
  },
});
