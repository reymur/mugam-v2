import React, { useEffect, useState } from 'react';
import { TouchableOpacity, StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import * as FileSystem from 'expo-file-system/legacy';
import Svg, { Circle } from 'react-native-svg';

const RADIUS = 28;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const memoryCache = new Map<string, string>();
const getCacheKey = (url: string) => url.split('?')[0];
const IMAGES_DIR = 'chat_images/';

interface Props {
  uri:          string;
  onPress:      () => void;
  onLongPress:  () => void;
  isUploading?: boolean;
}

export default function ChatImageMessage({ uri, onPress, onLongPress, isUploading }: Props) {
  const [timedOut,         setTimedOut]         = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [cachedUri,        setCachedUri]        = useState<string | null>(() => memoryCache.get(getCacheKey(uri)) ?? null);
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

  // Download to permanent documentDirectory storage with real progress
  useEffect(() => {
    if (!uri.startsWith('https://') || isUploading) {
      setCachedUri(null);
      setIsDownloading(false);
      setDownloadProgress(0);
      setDownloadFailed(false);
      return;
    }

    const key = getCacheKey(uri);

    // Level 1: memory cache — instant, zero I/O
    const memoryCached = memoryCache.get(key);
    if (memoryCached) {
      setCachedUri(memoryCached);
      return;
    }

    setCachedUri(null);
    setIsDownloading(false);
    setDownloadProgress(0);
    setDownloadFailed(false);

    const rawPath = uri.split('?')[0];
    const filename = rawPath.split('%2F').pop() ?? rawPath.split('/').pop() ?? `img_${Date.now()}`;
    const localPath = (FileSystem.documentDirectory ?? '') + IMAGES_DIR + filename;

    let dl: ReturnType<typeof FileSystem.createDownloadResumable> | null = null;
    let cancelled = false;

    const run = async () => {
      try {
        // Level 2: permanent storage — survives app restart
        const info = await FileSystem.getInfoAsync(localPath);
        if (info.exists) {
          memoryCache.set(key, localPath);
          if (!cancelled) setCachedUri(localPath);
          return;
        }
        if (cancelled) return;

        // Level 3: download with real progress
        await FileSystem.makeDirectoryAsync(
          (FileSystem.documentDirectory ?? '') + IMAGES_DIR,
          { intermediates: true },
        );
        setIsDownloading(true);

        dl = FileSystem.createDownloadResumable(
          uri,
          localPath,
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
            memoryCache.set(key, result.uri);
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
  const strokeDashoffset = CIRCUMFERENCE * (1 - downloadProgress / 100);

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      activeOpacity={0.9}
    >
      <View style={s.container}>
        {showSpinner || showProgress ? (
          <View style={s.placeholder} />
        ) : cachedUri ? (
          <ExpoImage source={{ uri: cachedUri }} style={s.image} contentFit="cover" />
        ) : downloadFailed ? (
          <ExpoImage source={{ uri }} style={s.image} contentFit="cover" />
        ) : (
          <View style={s.placeholder} />
        )}

        {/* Upload spinner */}
        {showSpinner && (
          <View style={s.overlay}>
            <View style={s.spinnerBox}>
              <ActivityIndicator size="large" color="#fff" />
            </View>
          </View>
        )}

        {/* Download progress arc */}
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
