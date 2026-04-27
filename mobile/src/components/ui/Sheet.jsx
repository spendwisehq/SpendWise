// Bottom sheet modal with grab handle.
import React from 'react';
import { Modal, View, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients } from '../../theme/colors';

export default function Sheet({ open, onClose, children, height = '92%' }) {
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose}>
        <Pressable onPress={() => {}} style={[styles.sheetWrap, { height }]}>
          <LinearGradient colors={gradients.sheet} start={{x:0,y:0}} end={{x:0,y:1}}
            style={styles.sheet}>
            <View style={styles.handle}/>
            {children}
          </LinearGradient>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheetWrap: {
    width: '100%',
  },
  sheet: {
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: 10,
  },
});
