import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, PanResponder, LayoutChangeEvent,
} from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';

interface VoicePlayerProps {
  uri:       string;
  mine:      boolean;
  onLongPress?: () => void;
}

const BARS = 40;
const BAR_HEIGHTS = Array.from({ length: BARS }, (_, i) =>
  Math.max(0.15, Math.abs(Math.sin(i * 0.47 + 1.2) * Math.cos(i * 0.31)) * 0.85 + 0.15)
);

function formatTime(ms: number): string {
  if (!ms || ms <= 0) return '0:00';
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = (total % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function VoicePlayer({ uri, mine, onLongPress }: VoicePlayerProps) {
  const soundRef    = useRef<Audio.Sound | null>(null);
  const widthRef    = useRef(0);
  const isSeeking   = useRef(false);
  const progressRef = useRef(0);
  const durationRef = useRef(0);

  const [playing,  setPlaying]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);

  // 1. onPlaybackStatus — объявляем ПЕРВЫМ
  const onPlaybackStatus = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    const dur = status.durationMillis ?? 0;
    const pos = status.positionMillis ?? 0;
    if (dur > 0) {
      durationRef.current = dur;
      setDuration(dur);
    }
    if (!isSeeking.current) {
      setPosition(pos);
      const p = dur > 0 ? pos / dur : 0;
      progressRef.current = p;
      setProgress(p);
    }
    if (status.didJustFinish) {
      setPlaying(false);
      progressRef.current = 0;
      setProgress(0);
      setPosition(0);
      soundRef.current?.setStatusAsync({ shouldPlay: false, positionMillis: 0 }).catch(() => {});
    }
  }, []);

  // 2. useEffect — ПОСЛЕ onPlaybackStatus
  useEffect(() => {
    const load = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS:         false,
          playsInSilentModeIOS:       true,
          playThroughEarpieceAndroid: false,
        });
        const sound = new Audio.Sound();
        sound.setOnPlaybackStatusUpdate(onPlaybackStatus);
        const status = await sound.loadAsync({ uri }, { shouldPlay: false, progressUpdateIntervalMillis: 100 });
        soundRef.current = sound;
        if (status.isLoaded && status.durationMillis) {
          durationRef.current = status.durationMillis;
          setDuration(status.durationMillis);
        }
      } catch { /* ignore */ }
    };
    load();
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
      soundRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uri]);

  const seekTo = useCallback(async (value: number) => {
    const clamped = Math.max(0, Math.min(1, value));
    progressRef.current = clamped;
    setProgress(clamped);
    if (soundRef.current && durationRef.current > 0) {
      await soundRef.current.setStatusAsync({ positionMillis: Math.round(clamped * durationRef.current) });
    }
  }, []);

  const pageXRef = useRef(0);

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onStartShouldSetPanResponderCapture: () => true,
    onMoveShouldSetPanResponder:  () => true,
    onMoveShouldSetPanResponderCapture: () => true,
    onPanResponderGrant: (e) => {
      isSeeking.current = true;
      pageXRef.current = e.nativeEvent.pageX - e.nativeEvent.locationX;
      const x = e.nativeEvent.locationX;
      seekTo(widthRef.current > 0 ? x / widthRef.current : 0);
    },
    onPanResponderMove: (e) => {
      const x = e.nativeEvent.pageX - pageXRef.current;
      const clamped = Math.max(0, Math.min(x, widthRef.current));
      seekTo(widthRef.current > 0 ? clamped / widthRef.current : 0);
    },
    onPanResponderRelease: () => {
      isSeeking.current = false;
    },
  })).current;

  const handlePress = async () => {
    try {
      setLoading(true);
      console.log('[Voice] handlePress, playing:', playing, 'soundRef:', !!soundRef.current);
      if (playing) {
        await soundRef.current?.setStatusAsync({ shouldPlay: false });
        setPlaying(false);
        return;
      }
      if (soundRef.current) {
        await soundRef.current.setStatusAsync({ shouldPlay: true });
        setPlaying(true);
        return;
      }
      console.warn('[Voice] soundRef is null - sound not loaded');
    } catch (e) { console.warn('[Voice] error:', e); }
    finally { setLoading(false); }
  };

  const onLayout = (e: LayoutChangeEvent) => {
    widthRef.current = e.nativeEvent.layout.width;
  };

  const thumbPos    = progress * 100;
  const timeLabel   = formatTime(playing || progress > 0 ? position : duration);
  const colorFilled = mine ? 'rgba(26,14,0,0.8)' : Colors.gold;
  const colorEmpty  = mine ? 'rgba(26,14,0,0.25)' : 'rgba(180,180,180,0.35)';
  const thumbColor  = mine ? '#1a0e00' : Colors.gold;

  return (
    <TouchableOpacity onLongPress={onLongPress} delayLongPress={500} activeOpacity={1} style={[vs.wrap, mine ? vs.wrapMine : vs.wrapTheirs]}>
      <TouchableOpacity style={vs.playBtn} onPress={handlePress} activeOpacity={0.7}>
        {loading
          ? <ActivityIndicator size="small" color={thumbColor} />
          : <Text style={[vs.playIcon, { color: thumbColor }]}>
              {playing ? '⏸' : '▶'}
            </Text>
        }
      </TouchableOpacity>

      <View style={vs.middle}>
        <View
          style={vs.waveform}
          onLayout={onLayout}
          {...panResponder.panHandlers}
        >
          {BAR_HEIGHTS.map((h, i) => {
            const filled = (i / BARS) < progress;
            return (
              <View
                key={i}
                style={[
                  vs.bar,
                  {
                    height: Math.round(h * 26),
                    backgroundColor: filled ? colorFilled : colorEmpty,
                  },
                ]}
              />
            );
          })}
          <View
            style={[
              vs.thumb,
              { left: `${thumbPos}%`, backgroundColor: thumbColor },
            ]}
          />
        </View>
      </View>

      <Text style={[vs.time, { color: mine ? '#1a0e00' : Colors.muted }]}>
        {timeLabel}
      </Text>
    </TouchableOpacity>
  );
}

export function VoiceRecorderBar({ recording, duration, onStop }: {
  recording: boolean;
  duration:  number;
  onStop:    () => void;
}) {
  if (!recording) return null;
  const mins = Math.floor(duration / 60).toString().padStart(2, '0');
  const secs = (duration % 60).toString().padStart(2, '0');
  return (
    <View style={vs.recBar}>
      <View style={vs.recDot} />
      <Text style={vs.recTime}>{mins}:{secs}</Text>
      <Text style={vs.recHint}>Ses yazilir...</Text>
      <TouchableOpacity onPress={onStop} style={vs.recStop}>
        <Text style={{ color: Colors.red, fontSize: 13 }}>Legv et</Text>
      </TouchableOpacity>
    </View>
  );
}

const vs = StyleSheet.create({
  wrap:       { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 22, minWidth: 220, maxWidth: '80%' },
  wrapMine:   { backgroundColor: Colors.gold, borderBottomRightRadius: 4 },
  wrapTheirs: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderBottomLeftRadius: 4 },
  playBtn:    { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  playIcon:   { fontSize: 18 },
  middle:     { flex: 1, justifyContent: 'center' },
  waveform:   { flexDirection: 'row', alignItems: 'center', gap: 2, height: 34, position: 'relative' },
  bar:        { width: 3, borderRadius: 2 },
  thumb:      { position: 'absolute', width: 14, height: 14, borderRadius: 7, top: '50%', marginTop: -7, marginLeft: -7 },
  time:       { fontSize: 11, fontFamily: Typography.nunito700, minWidth: 36, textAlign: 'right', flexShrink: 0 },
  recBar:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: 'rgba(192,57,43,0.1)', borderTopWidth: 1, borderTopColor: Colors.border },
  recDot:     { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.red },
  recTime:    { fontSize: 14, color: Colors.red, fontWeight: 'bold' },
  recHint:    { flex: 1, fontSize: 13, color: Colors.muted },
  recStop:    { paddingHorizontal: 8 },
});
