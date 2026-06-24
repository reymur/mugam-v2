import React, { useRef } from 'react';
import { Animated, Dimensions, PanResponder, Pressable, View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';

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
  const isPinching = useRef(false);

  const tapCount = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getDistance = (touches: any[]) =>
    Math.hypot(touches[1].pageX - touches[0].pageX, touches[1].pageY - touches[0].pageY);

  const resetZoom = () => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
    ]).start();
    scaleValue.current = 1;
    txValue.current = 0;
    tyValue.current = 0;
  };

  const handlePress = (e: any) => {
    tapCount.current += 1;
    if (tapTimer.current) clearTimeout(tapTimer.current);

    if (tapCount.current >= 2) {
      tapCount.current = 0;
      if (scaleValue.current > 1) {
        resetZoom();
      } else {
        const { locationX, locationY } = e.nativeEvent;
        const cx = locationX - width / 2;
        const cy = locationY - height / 2;
        const ns = 2.5;
        Animated.parallel([
          Animated.spring(scale, { toValue: ns, useNativeDriver: true }),
          Animated.spring(translateX, { toValue: (-cx * (ns - 1)) / ns, useNativeDriver: true }),
          Animated.spring(translateY, { toValue: (-cy * (ns - 1)) / ns, useNativeDriver: true }),
        ]).start();
        scaleValue.current = ns;
        txValue.current = (-cx * (ns - 1)) / ns;
        tyValue.current = (-cy * (ns - 1)) / ns;
      }
    } else {
      tapTimer.current = setTimeout(() => { tapCount.current = 0; }, 300);
    }
  };

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: (e) => e.nativeEvent.touches.length >= 2,
    onStartShouldSetPanResponderCapture: (e) => e.nativeEvent.touches.length >= 2,
    onMoveShouldSetPanResponder: (e, g) =>
      e.nativeEvent.touches.length >= 2 ||
      (scaleValue.current > 1 && (Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3)),
    onMoveShouldSetPanResponderCapture: (e) => e.nativeEvent.touches.length >= 2,

    onPanResponderGrant: (e) => {
      const touches = e.nativeEvent.touches;
      if (touches.length === 2) {
        isPinching.current = true;
        initialDistance.current = getDistance(touches);
        initialScale.current = scaleValue.current;
      }
    },

    onPanResponderMove: (e, g) => {
      const touches = e.nativeEvent.touches;
      if (touches.length === 2 && initialDistance.current > 0) {
        isPinching.current = true;
        const newScale = Math.max(1, Math.min(5, initialScale.current * (getDistance(touches) / initialDistance.current)));
        scale.setValue(newScale);
        scaleValue.current = newScale;
      } else if (touches.length === 1 && !isPinching.current && scaleValue.current > 1) {
        translateX.setValue(txValue.current + g.dx);
        translateY.setValue(tyValue.current + g.dy);
      }
    },

    onPanResponderRelease: () => {
      isPinching.current = false;
      scaleValue.current = (scale as any)._value;
      txValue.current = (translateX as any)._value;
      tyValue.current = (translateY as any)._value;
      if (scaleValue.current <= 1) resetZoom();
      initialDistance.current = 0;
    },

    onPanResponderTerminate: () => {
      isPinching.current = false;
      initialDistance.current = 0;
    },
  })).current;

  return (
    <Pressable onPress={handlePress} style={{ flex: 1 }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <Animated.View {...panResponder.panHandlers} style={{ transform: [{ scale }, { translateX }, { translateY }] }}>
          <ExpoImage
            source={{ uri }}
            style={{ width, height: height * 0.75 }}
            contentFit="contain"
            cachePolicy="memory-disk"
            transition={200}
          />
        </Animated.View>
      </View>
    </Pressable>
  );
}
