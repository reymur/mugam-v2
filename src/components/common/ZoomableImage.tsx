import React, { useState } from 'react';
import { Dimensions, View, ActivityIndicator } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');
const SPRING = { damping: 15, stiffness: 150 };

interface Props {
  uri: string;
}

export default function ZoomableImage({ uri }: Props) {
  const [loading, setLoading] = useState(true);

  const scale      = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  // Persisted state between gestures — updated in onEnd so the next gesture starts correctly
  const savedScale = useSharedValue(1);
  const savedTx    = useSharedValue(0);
  const savedTy    = useSharedValue(0);

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((e) => {
      scale.value = Math.max(1, Math.min(5, savedScale.value * e.scale));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value <= 1.01) {
        scale.value      = withSpring(1, SPRING);
        translateX.value = withSpring(0, SPRING);
        translateY.value = withSpring(0, SPRING);
        savedScale.value = 1;
        savedTx.value    = 0;
        savedTy.value    = 0;
      }
    });

  const panGesture = Gesture.Pan()
    .onStart(() => {
      savedTx.value = translateX.value;
      savedTy.value = translateY.value;
    })
    .onUpdate((e) => {
      if (scale.value > 1) {
        translateX.value = savedTx.value + e.translationX;
        translateY.value = savedTy.value + e.translationY;
      }
    })
    .onEnd(() => {
      savedTx.value = translateX.value;
      savedTy.value = translateY.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDelay(300)
    .onEnd((e) => {
      if (scale.value > 1) {
        scale.value      = withSpring(1, SPRING);
        translateX.value = withSpring(0, SPRING);
        translateY.value = withSpring(0, SPRING);
        savedScale.value = 1;
        savedTx.value    = 0;
        savedTy.value    = 0;
      } else {
        const cx = e.x - width / 2;
        const cy = e.y - height / 2;
        const ns = 2.5;
        const tx = (-cx * (ns - 1)) / ns;
        const ty = (-cy * (ns - 1)) / ns;
        scale.value      = withSpring(ns, SPRING);
        translateX.value = withSpring(tx, SPRING);
        translateY.value = withSpring(ty, SPRING);
        savedScale.value = ns;
        savedTx.value    = tx;
        savedTy.value    = ty;
      }
    });

  // Race: doubleTap competes with pinch+pan. Pan's movement threshold resolves
  // the race immediately, so panning never waits for a second tap to time out.
  const gesture = Gesture.Race(
    doubleTap,
    Gesture.Simultaneous(pinchGesture, panGesture),
  );

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <Animated.View style={animStyle}>
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
    </GestureDetector>
  );
}
