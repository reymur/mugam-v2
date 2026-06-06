import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import { useAppStore } from '../../store/useAppStore';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';

export default function ToastOverlay() {
  const toast = useAppStore(s => s.toast);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (toast) {
      Animated.spring(anim, { toValue: 1, useNativeDriver: true }).start();
    } else {
      Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }
  }, [toast]);

  if (!toast) return null;

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0,1], outputRange: [16,0] }) }],
        },
      ]}
      pointerEvents="none"
    >
      <Text style={styles.toastText}>{toast}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: Colors.navH + 18,
    alignSelf: 'center',
    backgroundColor: Colors.bg3,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: 24,
    paddingHorizontal: 20, paddingVertical: 10,
    zIndex: 999,
    maxWidth: '90%',
  },
  toastText: {
    color: Colors.text,
    fontSize: 13,
    fontFamily: Typography.nunito700,
    textAlign: 'center',
  },
});
