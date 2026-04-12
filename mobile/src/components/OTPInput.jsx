// mobile/src/components/OTPInput.jsx
import React, { useRef, useEffect } from 'react';
import { View, TextInput, StyleSheet, Keyboard } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { spacing, radius, fontSize, fontWeight } from '../theme/spacing';

export default function OTPInput({ length = 6, value, onChange }) {
  const { colors } = useTheme();
  const inputRefs = useRef([]);
  const digits = value.split('').concat(Array(length - value.length).fill(''));

  useEffect(() => {
    // Auto-focus the first empty input
    const nextEmpty = digits.findIndex(d => d === '');
    if (nextEmpty >= 0 && inputRefs.current[nextEmpty]) {
      inputRefs.current[nextEmpty].focus();
    }
  }, []);

  const handleChange = (text, index) => {
    // Handle paste — if user pastes full OTP
    if (text.length > 1) {
      const pasted = text.replace(/\D/g, '').slice(0, length);
      onChange(pasted);
      if (pasted.length === length) {
        Keyboard.dismiss();
      }
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = text.replace(/\D/g, '');
    const newValue = newDigits.join('').slice(0, length);
    onChange(newValue);

    // Auto-advance to next input
    if (text && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
    if (newValue.length === length) {
      Keyboard.dismiss();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const newDigits = [...digits];
      newDigits[index - 1] = '';
      onChange(newDigits.join(''));
    }
  };

  return (
    <View style={styles.container}>
      {digits.map((digit, i) => (
        <TextInput
          key={i}
          ref={el => inputRefs.current[i] = el}
          style={[
            styles.input,
            {
              backgroundColor: colors.surface,
              borderColor: digit ? colors.primary : colors.border,
              color: colors.textPrimary,
            },
          ]}
          value={digit}
          onChangeText={text => handleChange(text, i)}
          onKeyPress={e => handleKeyPress(e, i)}
          keyboardType="number-pad"
          maxLength={i === 0 ? length : 1}  // first input accepts paste
          selectTextOnFocus
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  input: {
    width: 46,
    height: 54,
    borderRadius: radius.md,
    borderWidth: 2,
    textAlign: 'center',
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
});
