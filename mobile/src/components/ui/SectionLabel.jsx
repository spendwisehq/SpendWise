import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { palette } from '../../theme/colors';
import { fonts, fontWeight } from '../../theme/typography';

export default function SectionLabel({ children, right }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{children}</Text>
      {right || null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  label: {
    fontFamily: fonts.display,
    fontWeight: fontWeight.bold,
    fontSize: 18,
    letterSpacing: -0.4,
    color: palette.text,
  },
});
