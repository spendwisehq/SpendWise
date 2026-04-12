// mobile/src/components/ToastConfig.jsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as themeColors } from '../theme/colors';
import { spacing, radius, fontSize, fontWeight } from '../theme/spacing';

const toastBase = (borderColor, iconName, iconColor) => ({ text1, text2 }) => (
  <View style={[styles.toast, { borderLeftColor: borderColor, backgroundColor: '#FFFFFF' }]}>
    <Ionicons name={iconName} size={20} color={iconColor} style={styles.icon} />
    <View style={styles.textWrap}>
      {text1 && <Text style={styles.text1}>{text1}</Text>}
      {text2 && <Text style={styles.text2}>{text2}</Text>}
    </View>
  </View>
);

export const toastConfig = {
  success: toastBase(themeColors.success, 'checkmark-circle', themeColors.success),
  error:   toastBase(themeColors.danger,  'close-circle',     themeColors.danger),
  info:    toastBase(themeColors.primary, 'information-circle', themeColors.primary),
};

const styles = StyleSheet.create({
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderLeftWidth: 4,
    marginHorizontal: spacing.lg,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    minWidth: '80%',
  },
  icon: {
    marginRight: spacing.md,
  },
  textWrap: {
    flex: 1,
  },
  text1: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: '#0F172A',
  },
  text2: {
    fontSize: fontSize.sm,
    color: '#475569',
    marginTop: 2,
  },
});
