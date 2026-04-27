import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function ProgressBar({ pct, colors = ['#68dbae', '#26a37a'], height = 10 }) {
  const w = Math.max(4, Math.min(100, pct));
  return (
    <View style={[styles.track, { height }]}>
      <View style={{ width: `${w}%`, height: '100%' }}>
        <LinearGradient colors={colors} start={{x:0,y:0}} end={{x:1,y:0}}
          style={styles.fill}/>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    borderRadius: 99,
    backgroundColor: 'rgba(50,53,56,0.5)',
    overflow: 'hidden',
  },
  fill: {
    flex: 1,
    borderRadius: 99,
  },
});
