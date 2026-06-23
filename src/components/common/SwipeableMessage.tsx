import React, { useRef } from 'react';
import { Animated, View, Text, PanResponder, Dimensions } from 'react-native';

const SCREEN_W = Dimensions.get('window').width;

interface Props {
  children: React.ReactNode;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}

export default function SwipeableMessage({ children, onSwipeLeft, onSwipeRight }: Props) {
  const translateX = useRef(new Animated.Value(0)).current;
  const replyIconScale = useRef(new Animated.Value(0)).current;
  const replyIconOpacity = useRef(new Animated.Value(0)).current;
  const replyTriggered = useRef(false);

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, g) =>
      Math.abs(g.dx) > Math.abs(g.dy) * 1.5 && Math.abs(g.dx) > 10,
    onPanResponderTerminationRequest: () => false,
    onPanResponderMove: (_, g) => {
      if (g.dx < 0) {
        translateX.setValue(g.dx);
        replyIconOpacity.setValue(0);
      } else if (g.dx > 0) {
        const clamped = Math.min(g.dx, 80);
        translateX.setValue(clamped);
        const progress = clamped / 80;
        replyIconOpacity.setValue(progress);
        replyIconScale.setValue(0.5 + progress * 0.5);
        if (clamped >= 70 && !replyTriggered.current) {
          replyTriggered.current = true;
          Animated.spring(replyIconScale, { toValue: 1.3, useNativeDriver: true }).start(() => {
            Animated.spring(replyIconScale, { toValue: 1, useNativeDriver: true }).start();
          });
        }
      }
    },
    onPanResponderRelease: (_, g) => {
      replyTriggered.current = false;
      if (g.dx < -60) {
        Animated.timing(translateX, { toValue: -SCREEN_W, duration: 200, useNativeDriver: true }).start(() => {
          onSwipeLeft();
          translateX.setValue(0);
        });
      } else if (g.dx >= 60) {
        onSwipeRight();
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        Animated.timing(replyIconOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      } else {
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        Animated.timing(replyIconOpacity, { toValue: 0, duration: 150, useNativeDriver: true }).start();
      }
    },
  })).current;

  return (
    <View style={{ position: 'relative' }}>
      <Animated.View style={{
        position: 'absolute', left: 8, top: '50%',
        opacity: replyIconOpacity,
        transform: [{ scale: replyIconScale }, { translateY: -12 }],
        zIndex: 1,
      }}>
        <Text style={{ fontSize: 20 }}>↩️</Text>
      </Animated.View>
      <Animated.View {...panResponder.panHandlers} style={{ transform: [{ translateX }] }}>
        {children}
      </Animated.View>
    </View>
  );
}
