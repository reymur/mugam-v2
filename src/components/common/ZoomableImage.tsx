import React, { useRef } from 'react';
import { Animated, Dimensions, PanResponder, View } from 'react-native';

const { width, height } = Dimensions.get('window');

interface Props {
  uri: string;
}

export default function ZoomableImage({ uri }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const scaleValue = useRef(1);
  const txValue = useRef(0);
  const tyValue = useRef(0);
  const initialDistance = useRef(0);
  const initialScale = useRef(1);
  const lastTap = useRef(0);
  const isPinching = useRef(false);

  const getDistance = (touches: any[]) =>
    Math.hypot(touches[1].pageX - touches[0].pageX, touches[1].pageY - touches[0].pageY);

  const getMid = (touches: any[]) => ({
    x: (touches[0].pageX + touches[1].pageX) / 2,
    y: (touches[0].pageY + touches[1].pageY) / 2,
  });

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onStartShouldSetPanResponderCapture: () => true,
    onMoveShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponderCapture: () => true,

    onPanResponderGrant: (e) => {
      const touches = e.nativeEvent.touches;
      const now = Date.now();

      if (touches.length === 2) {
        isPinching.current = true;
        initialDistance.current = getDistance(touches);
        initialScale.current = scaleValue.current;
      } else if (touches.length === 1) {
        // Double tap check
        if (now - lastTap.current < 300) {
          if (scaleValue.current > 1) {
            Animated.parallel([
              Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
              Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
              Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
            ]).start();
            scaleValue.current = 1;
            txValue.current = 0;
            tyValue.current = 0;
          } else {
            const cx = touches[0].pageX - width / 2;
            const cy = touches[0].pageY - height / 2;
            const ns = 2.5;
            const nx = -cx * (ns - 1) / ns;
            const ny = -cy * (ns - 1) / ns;
            Animated.parallel([
              Animated.spring(scale, { toValue: ns, useNativeDriver: true }),
              Animated.spring(translateX, { toValue: nx, useNativeDriver: true }),
              Animated.spring(translateY, { toValue: ny, useNativeDriver: true }),
            ]).start();
            scaleValue.current = ns;
            txValue.current = nx;
            tyValue.current = ny;
          }
        }
        lastTap.current = now;
      }
    },

    onPanResponderMove: (e, g) => {
      const touches = e.nativeEvent.touches;

      if (touches.length === 2 && initialDistance.current > 0) {
        isPinching.current = true;
        const dist = getDistance(touches);
        const newScale = Math.max(1, Math.min(5, initialScale.current * (dist / initialDistance.current)));
        scale.setValue(newScale);
        scaleValue.current = newScale;
      } else if (touches.length === 1 && !isPinching.current && scaleValue.current > 1) {
        translateX.setValue(txValue.current + g.dx);
        translateY.setValue(tyValue.current + g.dy);
      }
    },

    onPanResponderRelease: (_, g) => {
      isPinching.current = false;
      scaleValue.current = (scale as any)._value;
      txValue.current = (translateX as any)._value;
      tyValue.current = (translateY as any)._value;

      if (scaleValue.current <= 1) {
        Animated.parallel([
          Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
        ]).start();
        scaleValue.current = 1;
        txValue.current = 0;
        tyValue.current = 0;
      }
      initialDistance.current = 0;
    },

    onPanResponderTerminate: () => {
      isPinching.current = false;
      initialDistance.current = 0;
    },
  })).current;

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <Animated.Image
        {...panResponder.panHandlers}
        source={{ uri }}
        style={{
          width,
          height: height * 0.75,
          resizeMode: 'contain',
          transform: [{ scale }, { translateX }, { translateY }],
        }}
      />
    </View>
  );
}
