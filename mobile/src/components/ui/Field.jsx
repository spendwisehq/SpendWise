// Text field with eyebrow label, leading/trailing slot, focus glow.
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { palette } from '../../theme/colors';
import { fontSize, fontWeight, fonts, text } from '../../theme/typography';

export default function Field({
  label, value, onChangeText, placeholder, secureTextEntry,
  leading, trailing, keyboardType, autoCapitalize, autoComplete, textContentType,
  onSubmitEditing, returnKeyType, autoFocus,
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View>
      {label ? (
        <Text style={[text.eyebrow, styles.label, { color: palette.textMuted }]}>
          {label}
        </Text>
      ) : null}
      <View style={[
        styles.wrap,
        { backgroundColor: focused ? palette.surfaceBright : palette.surface },
      ]}>
        {leading ? <View style={styles.lead}>{leading}</View> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={palette.textDim}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          textContentType={textContentType}
          onSubmitEditing={onSubmitEditing}
          returnKeyType={returnKeyType}
          autoFocus={autoFocus}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[
            styles.input,
            { paddingLeft: leading ? 8 : 18 },
          ]}
        />
        {trailing ? <View style={styles.trail}>{trailing}</View> : null}
        {focused ? (
          <LinearGradient
            colors={['transparent', palette.primary, 'transparent']}
            start={{x:0,y:0.5}} end={{x:1,y:0.5}}
            style={styles.glow}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    marginBottom: 8,
    paddingLeft: 4,
    letterSpacing: 1.6,
  },
  wrap: {
    borderRadius: 16,
    height: 55,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  lead: {
    paddingLeft: 18,
    paddingRight: 4,
  },
  trail: {
    paddingRight: 4,
  },
  input: {
    flex: 1,
    height: '100%',
    paddingRight: 16,
    color: palette.text,
    fontFamily: fonts.body,
    fontSize: fontSize.lg,
  },
  glow: {
    position: 'absolute',
    left: 12, right: 12, bottom: 0,
    height: 2,
    borderRadius: 2,
  },
});
