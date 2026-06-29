import React, { useEffect, useState } from 'react';
import { TouchableOpacity, StyleSheet, View, ActivityIndicator } from 'react-native';
import { Image as ExpoImage } from 'expo-image';

interface Props {
  uri:          string;
  onPress:      () => void;
  onLongPress:  () => void;
  isUploading?: boolean;
}

export default function ChatImageMessage({ uri, onPress, onLongPress, isUploading }: Props) {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!isUploading) {
      setTimedOut(false);
      return;
    }
    const t = setTimeout(() => setTimedOut(true), 10_000);
    return () => clearTimeout(t);
  }, [isUploading]);

  const showSpinner = isUploading && !timedOut;

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      activeOpacity={0.9}
    >
      <View style={s.container}>
        <ExpoImage source={{ uri }} style={s.image} contentFit="cover" />
        {showSpinner && (
          <View style={s.overlay}>
            <View style={s.spinnerBox}>
              <ActivityIndicator size="large" color="#fff" />
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  container:  { width: 220, height: 220, borderRadius: 12, overflow: 'hidden' },
  image:      { width: 220, height: 220 },
  overlay:    { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  spinnerBox: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
});
