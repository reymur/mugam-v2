import React, { useRef, useState } from 'react';
import { Animated, Dimensions, PanResponder, View, ActivityIndicator } from 'react-native';
import { Image as ExpoImage } from 'expo-image';

const { width, height } = Dimensions.get('window');

interface Props {
  uri: string;
}

export default function ZoomableImage({ uri }: Props) {
  const [loading, setLoading] = useState(true);
  const scale      = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const scaleValue   = useRef(1);
  const txValue      = useRef(0);
  const tyValue      = useRef(0);
  const initialDist  = useRef(0);
  const initialScale = useRef(1);
  const isPinching   = useRef(false);
  const lastTapTime  = useRef(0);
  const pinchStarted = useRef(false);

  const getDistance = (touches: any[]) =>
    Math.hypot(
      touches[1].pageX - touches[0].pageX,
      touches[1].pageY - touches[0].pageY
    );

  const resetZoom = () => {
    Animated.parallel([
      Animated.spring(scale,      { toValue: 1, useNativeDriver: true, tension: 100, friction: 8 }),
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true, tension: 100, friction: 8 }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 100, friction: 8 }),
    ]).start();
    scaleValue.current = 1;
    txValue.current    = 0;
    tyValue.current    = 0;
  };

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder:        () => true,
    onStartShouldSetPanResponderCapture: () => true,
    onMoveShouldSetPanResponder:         () => true,
    onMoveShouldSetPanResponderCapture:  () => true,
    onPanResponderTerminationRequest:    () => false,

    onPanResponderGrant: (e) => {
      const touches = e.nativeEvent.touches;
      if (touches.length === 1) {
        pinchStarted.current = false;
      }
    },

    onPanResponderMove: (e, g) => {
      const touches = e.nativeEvent.touches;

      if (touches.length === 2) {
        const dist = getDistance(touches);
        // Инициализируем pinch при первом движении двумя пальцами
        if (!pinchStarted.current) {
          pinchStarted.current = true;
          isPinching.current   = true;
          initialDist.current  = dist;
          initialScale.current = scaleValue.current;
          return;
        }
        if (initialDist.current > 0) {
          const newScale = Math.max(1, Math.min(5,
            initialScale.current * (dist / initialDist.current)
          ));
          scale.setValue(newScale);
          scaleValue.current = newScale;
        }
      } else if (touches.length === 1 && !isPinching.current && scaleValue.current > 1) {
        translateX.setValue(txValue.current + g.dx);
        translateY.setValue(tyValue.current + g.dy);
      }
    },

    onPanResponderRelease: (e, g) => {
      const remaining = e.nativeEvent.touches.length;

      if (remaining === 0) {
        isPinching.current   = false;
        pinchStarted.current = false;
        initialDist.current  = 0;
      } else if (remaining === 1) {
        pinchStarted.current = false;
        isPinching.current   = false;
        initialDist.current  = 0;
      }
      scaleValue.current = (scale as any)._value;
      txValue.current    = (translateX as any)._value;
      tyValue.current    = (translateY as any)._value;
      if (scaleValue.current <= 1) resetZoom();
    },

    onPanResponderTerminate: () => {
      isPinching.current   = false;
      pinchStarted.current = false;
      initialDist.current  = 0;
    },
  })).current;

  const handleDoubleTap = (e: any) => {
    const now = Date.now();
    if (now - lastTapTime.current < 300) {
      lastTapTime.current = 0;
      if (scaleValue.current > 1) {
        resetZoom();
      } else {
        const cx = e.nativeEvent.locationX - width / 2;
        const cy = e.nativeEvent.locationY - height / 2;
        const ns = 2.5;
        Animated.parallel([
          Animated.spring(scale,      { toValue: ns, useNativeDriver: true }),
          Animated.spring(translateX, { toValue: (-cx * (ns - 1)) / ns, useNativeDriver: true }),
          Animated.spring(translateY, { toValue: (-cy * (ns - 1)) / ns, useNativeDriver: true }),
        ]).start();
        scaleValue.current = ns;
        txValue.current    = (-cx * (ns - 1)) / ns;
        tyValue.current    = (-cy * (ns - 1)) / ns;
      }
    } else {
      lastTapTime.current = now;
    }
  };

  return (
    <View
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
      {...panResponder.panHandlers}
    >
      <Animated.View style={{ transform: [{ scale }, { translateX }, { translateY }] }}>
        <ExpoImage
          source={{ uri }}
          style={{ width, height: height * 0.75 }}
          contentFit="contain"
          cachePolicy="memory-disk"
          transition={200}
          onTouchEnd={handleDoubleTap}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
        />
        {loading && (
          <ActivityIndicator
            size="large"
            color="#D4A03C"
            style={{ position: 'absolute' }}
          />
        )}
      </Animated.View>
    </View>
  );
}
