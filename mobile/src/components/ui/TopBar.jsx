// Top app bar with optional back, avatar, subtitle eyebrow, right slot.
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { palette } from '../../theme/colors';
import { fonts, fontWeight, fontSize, text } from '../../theme/typography';
import { Icon } from './Icon';

export function Avatar({ size = 44, letter = 'S' }) {
  return (
    <View style={{
      width: size, height: size, borderRadius: 99, padding: 2,
    }}>
      <LinearGradient colors={['#68dbae', '#cebdff']} start={{x:0,y:0}} end={{x:1,y:1}}
        style={{ flex: 1, borderRadius: 99 }}>
        <View style={{
          flex: 1, borderRadius: 99, borderWidth: 2, borderColor: palette.bg,
          backgroundColor: '#2a3439',
          alignItems:'center', justifyContent:'center',
        }}>
          <Text style={{
            color: palette.text, fontFamily: fonts.display, fontWeight: fontWeight.heavy,
            fontSize: size * 0.32,
          }}>{letter}</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

export function IconButton({ children, onPress, subtle, style }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [
      styles.iconBtn,
      {
        backgroundColor: subtle ? 'rgba(255,255,255,0.04)' : 'rgba(39,42,45,0.8)',
        opacity: pressed ? 0.7 : 1,
      },
      style,
    ]}>
      {children}
    </Pressable>
  );
}

export default function TopBar({ title, subtitle, onBack, right, leftAvatar = true, glass = true }) {
  const Inner = (
    <View style={styles.row}>
      <View style={styles.left}>
        {onBack ? (
          <Pressable onPress={onBack} style={styles.backBtn}>
            <Icon.ChevLeft size={18} color={palette.text}/>
          </Pressable>
        ) : leftAvatar ? <Avatar/> : null}
        <View style={{ flex: 1, minWidth: 0 }}>
          {subtitle ? (
            <Text style={[text.eyebrow, { color: palette.textMuted, marginBottom: 2 }]}>
              {subtitle}
            </Text>
          ) : null}
          <Text numberOfLines={1} style={styles.title}>{title}</Text>
        </View>
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );

  if (glass) {
    return (
      <BlurView intensity={40} tint="dark" style={styles.bar}>
        <View style={styles.tint}/>
        {Inner}
      </BlurView>
    );
  }
  return <View style={styles.bar}>{Inner}</View>;
}

const styles = StyleSheet.create({
  bar: {
    paddingTop: 14,
    paddingBottom: 14,
    paddingHorizontal: 22,
    overflow: 'hidden',
  },
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17,20,22,0.5)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
    minWidth: 0,
  },
  right: {
    flexDirection: 'row',
    gap: 8,
  },
  title: {
    fontFamily: fonts.display,
    fontWeight: fontWeight.bold,
    fontSize: 20,
    letterSpacing: -0.4,
    color: palette.text,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems:'center',
    justifyContent:'center',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems:'center',
    justifyContent:'center',
  },
});
