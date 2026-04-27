// Custom notched pill bottom nav with elevated FAB.
import React from 'react';
import { View, Pressable, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Defs, LinearGradient as SvgLG, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { palette, gradients } from '../../theme/colors';
import { fonts, fontWeight } from '../../theme/typography';
import { Icon } from './Icon';

const NAV_ITEMS = [
  { key: 'dashboard',   label: 'OVERVIEW', Ico: Icon.Grid },
  { key: 'transactions',label: 'ASSETS',   Ico: Icon.Wallet },
  { key: 'add',         add: true },
  { key: 'analytics',   label: 'INSIGHTS', Ico: Icon.ChartSearch },
  { key: 'ai',          label: 'VAULT',    Ico: Icon.Lock },
];

export default function BottomNav({ active, onSelect }) {
  const W = 340, H = 76, R = 38, CX = W / 2, NR = 40;
  const path = `M ${R} 0 L ${CX - NR} 0 A ${NR} ${NR} 0 0 0 ${CX + NR} 0 L ${W - R} 0 A ${R} ${R} 0 0 1 ${W} ${R} L ${W} ${H - R} A ${R} ${R} 0 0 1 ${W - R} ${H} L ${R} ${H} A ${R} ${R} 0 0 1 0 ${H - R} L 0 ${R} A ${R} ${R} 0 0 1 ${R} 0 Z`;

  return (
    <View pointerEvents="box-none" style={styles.outer}>
      <View style={styles.wrap}>
        <Svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none"
             style={StyleSheet.absoluteFill}>
          <Defs>
            <SvgLG id="navGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={palette.navTop}/>
              <Stop offset="100%" stopColor={palette.navBot}/>
            </SvgLG>
          </Defs>
          <Path d={path} fill="url(#navGrad)"/>
        </Svg>

        <View style={styles.items} pointerEvents="box-none">
          {NAV_ITEMS.map((item) => {
            if (item.add) {
              return (
                <View key="add" style={styles.fabSlot}>
                  <Pressable onPress={() => onSelect('add')} style={({ pressed }) => [
                    styles.fab,
                    { transform: [{ translateY: -22 }, { scale: pressed ? 0.94 : 1 }] },
                  ]}>
                    <LinearGradient colors={gradients.primaryFab} start={{x:0,y:0}} end={{x:1,y:1}}
                      style={styles.fabGrad}>
                      <Icon.Plus size={28} stroke={2.8} color={palette.primaryInk}/>
                    </LinearGradient>
                  </Pressable>
                </View>
              );
            }
            const isActive = active === item.key;
            const I = item.Ico;
            return (
              <Pressable key={item.key} onPress={() => onSelect(item.key)} style={styles.tab}>
                <I size={22} stroke={isActive ? 2.3 : 1.9}
                   color={isActive ? palette.primaryGlow : 'rgba(200,210,205,0.55)'}/>
                <Text style={[styles.tabLabel, {
                  color: isActive ? palette.primaryGlow : 'rgba(200,210,205,0.55)',
                  fontWeight: isActive ? fontWeight.bold : fontWeight.semibold,
                }]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    paddingHorizontal: 16,
    paddingBottom: 18,
    zIndex: 30,
  },
  wrap: {
    width: '100%',
    maxWidth: 340,
    alignSelf: 'center',
    height: 76,
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 12 },
  },
  items: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tab: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  tabLabel: {
    fontFamily: fonts.display,
    fontSize: 9.5,
    letterSpacing: 1.2,
  },
  fabSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    width: 60, height: 60, borderRadius: 99,
    shadowColor: '#68dbae',
    shadowOpacity: 0.55,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 14 },
    borderWidth: 6,
    borderColor: palette.bg,
  },
  fabGrad: {
    flex: 1,
    borderRadius: 99,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
