import React, { useEffect, useState } from 'react';
import { TouchableOpacity, StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import * as FileSystem from 'expo-file-system/legacy';
import Svg, { Circle } from 'react-native-svg';

const RADIUS = 28;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface Props {
  uri:          string;
  onPress:      () => void;
  onLongPress:  () => void;
  isUploading?: boolean;
}

export default function ChatImageMessage({ uri, onPress, onLongPress, isUploading }: Props) {
  const [timedOut,         setTimedOut]         = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [cachedUri,        setCachedUri]        = useState<string | null>(null);
  const [isDownloading,    setIsDownloading]    = useState(false);
  const [downloadFailed,   setDownloadFailed]   = useState(false);

  // Upload timeout — keeps spinner visible for up to 10 s
  useEffect(() => {
    if (!isUploading) {
      setTimedOut(false);
      return;
    }
    const t = setTimeout(() => setTimedOut(true), 10_000);
    return () => clearTimeout(t);
  }, [isUploading]);

  // Download to cache and track real progress for https:// URIs
  useEffect(() => {
    setCachedUri(null);
    setIsDownloading(false);
    setDownloadProgress(0);
    setDownloadFailed(false);

    if (!uri.startsWith('https://') || isUploading) return;

    // Derive a stable filename from the URL (works for Firebase Storage URLs)
    const rawPath = uri.split('?')[0];
    const filename = rawPath.split('%2F').pop() ?? rawPath.split('/').pop() ?? 'cached_img';
    const cacheUri = (FileSystem.cacheDirectory ?? '') + filename;

    let dl: ReturnType<typeof FileSystem.createDownloadResumable> | null = null;
    let cancelled = false;

    const run = async () => {
      try {
        const info = await FileSystem.getInfoAsync(cacheUri);
        if (info.exists) {
          if (!cancelled) setCachedUri(cacheUri);
          return;
        }
        if (cancelled) return;

        setIsDownloading(true);
        dl = FileSystem.createDownloadResumable(
          uri,
          cacheUri,
          {},
          (progressData) => {
            if (cancelled) return;
            const pct = progressData.totalBytesExpectedToWrite > 0
              ? (progressData.totalBytesWritten / progressData.totalBytesExpectedToWrite) * 100
              : 0;
            setDownloadProgress(Math.min(pct, 99));
          },
        );

        const result = await dl.downloadAsync();
        if (!cancelled) {
          if (result?.uri) {
            setCachedUri(result.uri);
            setDownloadProgress(100);
          } else {
            setDownloadFailed(true);
          }
          setIsDownloading(false);
        }
      } catch {
        if (!cancelled) {
          setDownloadFailed(true);
          setIsDownloading(false);
        }
      }
    };

    run();
    return () => {
      cancelled = true;
      dl?.pauseAsync().catch(() => {});
    };
  }, [uri, isUploading]);

  const showSpinner      = isUploading && !timedOut;
  const showProgress     = isDownloading;
  const displayUri       = isUploading ? uri : (cachedUri ?? (downloadFailed ? uri : null));
  const strokeDashoffset = CIRCUMFERENCE * (1 - downloadProgress / 100);

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      activeOpacity={0.9}
    >
      <View style={s.container}>
        {!showSpinner && !showProgress && displayUri ? (
          <ExpoImage source={{ uri: displayUri }} style={s.image} contentFit="cover" />
        ) : (
          <View style={s.placeholder} />
        )}

        {showSpinner && (
          <View style={s.overlay}>
            <View style={s.spinnerBox}>
              <ActivityIndicator size="large" color="#fff" />
            </View>
          </View>
        )}

        {showProgress && (
          <View style={s.overlay}>
            <Svg width={72} height={72}>
              <Circle
                cx={36} cy={36} r={RADIUS}
                stroke="rgba(255,255,255,0.3)"
                strokeWidth={4}
                fill="none"
              />
              <Circle
                cx={36} cy={36} r={RADIUS}
                stroke="#ffffff"
                strokeWidth={4}
                fill="none"
                strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                rotation={-90}
                origin="36,36"
              />
            </Svg>
            <Text style={s.progressText}>{Math.round(downloadProgress)}%</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  container:    { width: 220, height: 220, borderRadius: 12, overflow: 'hidden', backgroundColor: '#111' },
  image:        { width: 220, height: 220, backgroundColor: '#111' },
  placeholder:  { width: 220, height: 220, backgroundColor: '#111' },
  overlay:      { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  spinnerBox:   { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  progressText: { color: '#ffffff', fontSize: 12, marginTop: 6, fontWeight: '600' },
});
