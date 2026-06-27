import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';

interface VoicePlayerProps {
  uri:  string;
  mine: boolean;
}

const BARS = 30;

function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60).toString().padStart(2, '0');
  const s = (total % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function VoicePlayer({ uri, mine }: VoicePlayerProps) {
  const soundRef             = useRef<Audio.Sound | null>(null);
  const [playing,   setPlaying]   = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [duration,  setDuration]  = useState(0);
  const [position, setPosition]   = useState(0);

  const onPlaybackStatus = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    const dur = status.durationMillis ?? 0;
    const pos = status.positionMillis ?? 0;
    setDuration(dur);
    setPosition(pos);
    setProgress(dur > 0 ? pos / dur : 0);
    if (status.didJustFinish) {
      setPlaying(false);
      setProgress(0);
      setPosition(0);
    }
  }, []);

  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  const handlePress = async () => {
    try {
      if (playing) {
        await soundRef.current?.pauseAsync();
        setPlaying(false);
        return;
      }

      if (soundRef.current) {
        await soundRef.current.playAsync();
        setPlaying(true);
        return;
      }

      setLoading(true);
      await Audio.setAudioModeAsync({
        allowsRecordingIOS:         false,
        playsInSilentModeIOS:       true,
        playThroughEarpieceAndroid: false,
      });
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true },
        onPlaybackStatus,
      );
      soundRef.current = sound;
      setPlaying(true);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  const filledBars = Math.round(progress * BARS);
  const timeLabel  = playing || progress > 0
    ? formatTime(position)
    : formatTime(duration);

  const barColor        = mine ? 'rgba(26,14,0,0.35)' : 'rgba(128,128,128,0.35)';
  const barColorFilled  = mine ? '#1a0e00' : Colors.gold;

  return (
    <View style={[vs.wrap, mine ? vs.wrapMine : vs.wrapTheirs]}>
      <TouchableOpacity style={vs.playBtn} onPress={handlePress} activeOpacity={0.7}>
        {loading
          ? <ActivityIndicator size="small" color={mine ? '#1a0e00' : Colors.gold} />
          : <Text style={[vs.playIcon, { color: mine ? '#1a0e00' : Colors.gold }]}>
              {playing ? '⏸' : '▶'}
            </Text>
        }
      </TouchableOpacity>

      <View style={vs.waveform}>
        {Array.from({ length: BARS }).map((_, i) => {
          const heightFactor = 0.3 + Math.abs(Math.sin(i * 0.7 + 1)) * 0.7;
          const h = Math.round(6 + heightFactor * 18);
          return (
            <View
              key={i}
              style={[
                vs.bar,
                { height: h, backgroundColor: i < filledBars ? barColorFilled : barColor },
              ]}
            />
          );
        })}
      </View>

      <Text style={[vs.time, { color: mine ? '#1a0e00' : Colors.muted }]}>
        {timeLabel || '0:00'}
      </Text>
    </View>
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
  wrap:       { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 20, maxWidth: '80%' },
  wrapMine:   { backgroundColor: Colors.gold, borderBottomRightRadius: 4 },
  wrapTheirs: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderBottomLeftRadius: 4 },
  playBtn:    { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  playIcon:   { fontSize: 18 },
  waveform:   { flexDirection: 'row', alignItems: 'center', gap: 2, flex: 1, height: 28 },
  bar:        { width: 3, borderRadius: 2 },
  time:       { fontSize: 11, fontFamily: Typography.nunito700, minWidth: 32, textAlign: 'right', flexShrink: 0 },
  recBar:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: 'rgba(192,57,43,0.1)', borderTopWidth: 1, borderTopColor: Colors.border },
  recDot:     { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.red },
  recTime:    { fontSize: 14, color: Colors.red, fontWeight: 'bold' },
  recHint:    { flex: 1, fontSize: 13, color: Colors.muted },
  recStop:    { paddingHorizontal: 8 },
});
