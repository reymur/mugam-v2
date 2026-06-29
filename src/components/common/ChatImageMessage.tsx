import React from 'react';
import { TouchableOpacity, Image, StyleSheet, View, ActivityIndicator } from 'react-native';

interface Props {
  uri:          string;
  onPress:      () => void;
  onLongPress:  () => void;
  isUploading?: boolean;
}

export default function ChatImageMessage({ uri, onPress, onLongPress, isUploading }: Props) {
  console.log('[IMG_MSG] uri:', uri.slice(0,40), 'isUploading:', isUploading);
  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      activeOpacity={0.9}
    >
      <View style={s.container}>
        <Image source={{ uri }} style={s.image} resizeMode="cover" />
        {isUploading && (
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
