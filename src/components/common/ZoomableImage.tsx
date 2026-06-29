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
  const pinchStarted = useRef(false);
  const lastTapTime  = useRef(0);

  const getDistance = (touches: any[]) =>
    Math.hypot(
      touches[1].pageX - touches[0].pageX,
      touches[1].pageY - touches[0].pageY,
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
      console.log('[ZI] Grant touches:', e.nativeEvent.touches.length, 'scale:', scaleValue.current.toFixed(2));
      if (e.nativeEvent.touches.length === 1) {
        pinchStarted.current = false;
      }
    },

    onPanResponderMove: (e, g) => {
      const touches = e.nativeEvent.touches;

      if (touches.length === 2) {
        const dist = getDistance(touches);
        if (!pinchStarted.current) {
          console.log('[ZI] Pinch START dist:', dist.toFixed(0), 'initialScale:', scaleValue.current.toFixed(2));
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
          console.log('[ZI] Pinch MOVE newScale:', newScale.toFixed(2));
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
      console.log('[ZI] Release remaining:', remaining, 'isPinching:', isPinching.current, 'scale:', scaleValue.current.toFixed(2));

      if (remaining === 0) {
        if (isPinching.current) {
          // Pinch ended — reset flags and block any double-tap that fires after
          isPinching.current   = false;
          pinchStarted.current = false;
          initialDist.current  = 0;
          lastTapTime.current  = 0;  // block phantom double-tap from finger lifts
          if (scaleValue.current <= 1.01) {
            console.log('[ZI] Pinch end: resetZoom (scale near 1)');
            resetZoom();
          }
        } else {
          // Pan or single-tap ended — detect double-tap here, not in onTouchEnd
          const now    = Date.now();
          const wasTap = Math.abs(g.dx) < 10 && Math.abs(g.dy) < 10;
          console.log('[ZI] Pan/tap release dx:', g.dx.toFixed(0), 'dy:', g.dy.toFixed(0), 'timeSinceLast:', now - lastTapTime.current);

          if (wasTap && now - lastTapTime.current < 300) {
            console.log('[ZI] DOUBLE TAP → scale:', scaleValue.current.toFixed(2));
            lastTapTime.current = 0;
            if (scaleValue.current > 1) {
              resetZoom();
            } else {
              const cx = e.nativeEvent.locationX - width / 2;
              const cy = e.nativeEvent.locationY - height / 2;
              const ns = 2.5;
              const tx = (-cx * (ns - 1)) / ns;
              const ty = (-cy * (ns - 1)) / ns;
              Animated.parallel([
                Animated.spring(scale,      { toValue: ns, useNativeDriver: true, tension: 100, friction: 8 }),
                Animated.spring(translateX, { toValue: tx, useNativeDriver: true, tension: 100, friction: 8 }),
                Animated.spring(translateY, { toValue: ty, useNativeDriver: true, tension: 100, friction: 8 }),
              ]).start();
              scaleValue.current = ns;
              txValue.current    = tx;
              tyValue.current    = ty;
            }
          } else if (wasTap) {
            console.log('[ZI] Single tap recorded');
            lastTapTime.current = now;
          } else {
            // Pure pan — commit accumulated translate
            console.log('[ZI] Pan commit dx:', g.dx.toFixed(0), 'dy:', g.dy.toFixed(0));
            txValue.current    += g.dx;
            tyValue.current    += g.dy;
            lastTapTime.current = 0;
          }
        }
      } else if (remaining === 1) {
        // First finger of a pinch lifted — keep isPinching true, reset tap tracking
        pinchStarted.current = false;
        initialDist.current  = 0;
        if (isPinching.current) {
          lastTapTime.current = 0;  // prevent the first finger lift from starting a tap sequence
          console.log('[ZI] First pinch finger lifted, isPinching stays true');
        }
      }
    },

    onPanResponderTerminate: () => {
      console.log('[ZI] TERMINATE fired! scale:', scaleValue.current.toFixed(2));
      isPinching.current   = false;
      pinchStarted.current = false;
      initialDist.current  = 0;
      lastTapTime.current  = 0;
    },
  })).current;

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
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
        />
        {loading && (
          <ActivityIndicator
            size="large"
            color="#D4A03C"
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
        )}
      </Animated.View>
    </View>
  );
}
