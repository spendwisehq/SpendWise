// Tabs layout with custom notched bottom nav.
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { palette } from '../../src/theme/colors';
import BottomNav from '../../src/components/ui/BottomNav';

function CustomTabBar({ state, navigation }) {
  const active = state.routes[state.index]?.name;

  const onSelect = (key) => {
    if (key === 'add') {
      navigation.navigate('add');
      return;
    }
    navigation.navigate(key);
  };

  return <BottomNav active={active} onSelect={onSelect}/>;
}

export default function TabLayout() {
  return (
    <View style={styles.bg}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' },
          sceneStyle: { backgroundColor: palette.bg },
        }}
        tabBar={(props) => <CustomTabBar {...props}/>}
      >
        <Tabs.Screen name="dashboard"/>
        <Tabs.Screen name="transactions"/>
        <Tabs.Screen name="add"/>
        <Tabs.Screen name="analytics"/>
        <Tabs.Screen name="ai"/>
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: palette.bg },
});
