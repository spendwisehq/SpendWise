import React, { useRef } from 'react';
import {
  Animated, PanResponder, View, Text, TouchableOpacity, StyleSheet, Dimensions,
} from 'react-native';

const SCREEN_W  = Dimensions.get('window').width;
const REVEAL_W  = 80;    // px: resting "open" snap position
const FAST_VX   = -0.6; // velocity shortcut for delete

export default function SwipeableRow({ children, onDelete, onSwipeStart, onSwipeEnd }) {
  const translateX      = useRef(new Animated.Value(0)).current;
  const opacity         = useRef(new Animated.Value(1)).current;
  const restingX        = useRef(0);     // 0 = closed | -REVEAL_W = open
  const deleting        = useRef(false);
  const directionLocked = useRef(null);  // null | 'h' | 'v'
  const rowW            = useRef(SCREEN_W); // updated by onLayout

  // ─── animation helpers ─────────────────────────────────────────────────────

  const spring = (toValue, cb) => {
    Animated.spring(translateX, {
      toValue,
      useNativeDriver: true,
      tension: 130,
      friction: 18,
      overshootClamping: true,
    }).start(cb);
  };

  const animateDelete = () => {
    if (deleting.current) return;
    deleting.current = true;
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: -SCREEN_W,
        duration: 240,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onDelete?.());
  };

  const resetGesture = () => {
    onSwipeEnd?.();
    directionLocked.current = null;
  };

  // ─── pan responder ─────────────────────────────────────────────────────────

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => {
        directionLocked.current = null; // reset on every new touch
        return false;
      },
      onStartShouldSetPanResponderCapture: () => false,

      onMoveShouldSetPanResponder: (_, g) => {
        if (deleting.current) return false;
        if (directionLocked.current === 'v') return false;
        if (directionLocked.current === 'h') return true;

        const absX = Math.abs(g.dx);
        const absY = Math.abs(g.dy);

        // Wait for meaningful movement before deciding
        if (absX < 4 && absY < 4) return false;

        if (absX > absY * 1.1 && absX > 4) {
          directionLocked.current = 'h';
          return true;
        }
        if (absY > absX && absY > 4) {
          directionLocked.current = 'v';
          return false;
        }
        return false;
      },

      // Capture phase: only claim if very clearly horizontal (prevents scroll jank)
      onMoveShouldSetPanResponderCapture: (_, g) => {
        if (deleting.current) return false;
        return Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 2.5;
      },

      onPanResponderGrant: () => {
        onSwipeStart?.(); // disable parent scroll
        translateX.setOffset(restingX.current);
        translateX.setValue(0);
      },

      onPanResponderMove: (_, g) => {
        if (g.dx > 0) {
          // Right drag: elastic resistance (can't swipe right past 0)
          translateX.setValue(Math.min(g.dx * 0.06, 5));
          return;
        }

        const deleteThresh = rowW.current * 0.37;
        const rawDrag = Math.abs(g.dx);

        if (rawDrag > deleteThresh) {
          // Resistance past delete threshold — heavier feel = clear feedback
          const excess = rawDrag - deleteThresh;
          translateX.setValue(-(deleteThresh + excess * 0.3));
        } else {
          translateX.setValue(g.dx);
        }
      },

      onPanResponderRelease: (_, g) => {
        translateX.flattenOffset();
        resetGesture();

        // Use raw g.dx for threshold logic (not resistance-clamped animation value)
        const finalPos   = restingX.current + g.dx;
        const openThresh   = rowW.current * 0.22;
        const deleteThresh = rowW.current * 0.37;
        const isFast       = g.vx < FAST_VX && g.dx < -10;

        if (isFast || -finalPos > deleteThresh) {
          restingX.current = -SCREEN_W;
          animateDelete();
        } else if (-finalPos > openThresh) {
          restingX.current = -REVEAL_W;
          spring(-REVEAL_W);
        } else {
          restingX.current = 0;
          spring(0);
        }
      },

      onPanResponderTerminate: () => {
        translateX.flattenOffset();
        resetGesture();
        restingX.current = 0;
        spring(0);
      },
    })
  ).current;

  // ─── interpolations ────────────────────────────────────────────────────────

  const trashTranslateX = translateX.interpolate({
    inputRange: [-SCREEN_W, -REVEAL_W, 0],
    outputRange: [0, 0, REVEAL_W],
    extrapolate: 'clamp',
  });

  const bgColor = translateX.interpolate({
    inputRange: [-SCREEN_W * 0.4, -REVEAL_W, -8, 0],
    outputRange: ['#FF2D2D', '#FF4D4F', 'rgba(255,77,79,0)', 'rgba(255,77,79,0)'],
    extrapolate: 'clamp',
  });

  const trashScale = translateX.interpolate({
    inputRange: [-SCREEN_W * 0.4, -REVEAL_W, -20, 0],
    outputRange: [1.3, 1.0, 0.85, 0.7],
    extrapolate: 'clamp',
  });

  // ─── render ────────────────────────────────────────────────────────────────

  return (
    <View
      style={styles.container}
      onLayout={e => { rowW.current = e.nativeEvent.layout.width; }}
    >
      {/* Delete zone revealed behind sliding row */}
      <Animated.View style={[styles.deleteBack, { backgroundColor: bgColor }]}>
        <TouchableOpacity
          style={styles.actionArea}
          onPress={animateDelete}
          activeOpacity={0.75}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Animated.View style={[
            styles.trashContent,
            { transform: [{ translateX: trashTranslateX }, { scale: trashScale }] },
          ]}>
            <Text style={styles.trashIcon}>🗑️</Text>
            <Text style={styles.deleteLabel}>Delete</Text>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>

      {/* Sliding row */}
      <Animated.View
        style={{ transform: [{ translateX }], opacity }}
        {...pan.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    borderRadius: 20,
    overflow: 'hidden',
  },
  deleteBack: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  actionArea: {
    width: REVEAL_W + 16,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trashContent: {
    alignItems: 'center',
    gap: 3,
  },
  trashIcon: {
    fontSize: 22,
  },
  deleteLabel: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
