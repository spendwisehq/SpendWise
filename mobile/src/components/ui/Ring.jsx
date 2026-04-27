import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

export default function Ring({ size = 120, stroke = 10, pct, color = '#68dbae',
                              track = 'rgba(255,255,255,0.08)', children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(1, Math.max(0, pct / 100)));
  return (
    <View style={{ width: size, height: size, alignItems:'center', justifyContent:'center' }}>
      <Svg width={size} height={size} style={{ position:'absolute', transform:[{ rotate:'-90deg' }] }}>
        <Circle cx={size/2} cy={size/2} r={r} stroke={track} strokeWidth={stroke} fill="none"/>
        <Circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth={stroke} fill="none"
                strokeLinecap="round" strokeDasharray={`${c}`} strokeDashoffset={offset}/>
      </Svg>
      {children}
    </View>
  );
}
