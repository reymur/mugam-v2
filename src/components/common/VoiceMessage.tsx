import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, PanResponder, LayoutChangeEvent,
} from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';

interface VoicePlayerProps {
  uri:          string;
  mine:         boolean;
  senderEmoji?: string;
  onLongPress?: () => void;
}

const BARS = 38;
const BAR_HEIGHTS = Array.from({ length: BARS }, (_, i) => {
  const v = Math.abs(Math.sin(i * 0.61 + 0.9) * Math.cos(i * 0.29 + 0.4));
  const bump = (i % 5 === 2) ? 0.25 : (i % 3 === 0) ? 0.1 : 0;
  return Math.max(0.1, Math.min(1, v * 0.7 + bump + 0.12));
});

function formatTime(ms: number): string {
  if (!ms || ms <= 0) return '0:00';
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = (total % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function VoicePlayer({ uri, mine, senderEmoji, onLongPress }: VoicePlayerProps) {
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

  const onPlaybackStatus = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    const dur = status.durationMillis ?? 0;
    const pos = status.positionMillis ?? 0;
    if (dur > 0) { durationRef.current = dur; setDuration(dur); }
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

  useEffect(() => {
    const load = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
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
      } catch { }
    };
    load();
    return () => { soundRef.current?.unloadAsync().catch(() => {}); soundRef.current = null; };
  }, [uri]);

  const seekTo = useCallback(async (value: number) => {
    const clamped = Math.max(0, Math.min(1, value));
    progressRef.current = clamped;
    setProgress(clamped);
    if (soundRef.current && durationRef.current > 0) {
      await soundRef.current.setStatusAsync({ positionMillis: Math.round(clamped * durationRef.current) });
    }
  }, []);

  const pageXRef       = useRef(0);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didMove        = useRef(false);

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder:        () => true,
    onStartShouldSetPanResponderCapture: () => true,
    onMoveShouldSetPanResponder:         () => true,
    onMoveShouldSetPanResponderCapture:  () => true,
    onPanResponderTerminationRequest:    () => false,
    onPanResponderGrant: (e) => {
      isSeeking.current = true;
      didMove.current = false;
      pageXRef.current = e.nativeEvent.pageX - e.nativeEvent.locationX;
      longPressTimer.current = setTimeout(() => {
        if (!didMove.current) onLongPress?.();
      }, 500);
    },
    onPanResponderMove: (e) => {
      didMove.current = true;
      if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
      const x = e.nativeEvent.pageX - pageXRef.current;
      const clamped = Math.max(0, Math.min(x, widthRef.current));
      seekTo(widthRef.current > 0 ? clamped / widthRef.current : 0);
    },
    onPanResponderRelease: () => {
      isSeeking.current = false;
      if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    },
  })).current;

  const handlePress = async () => {
    try {
      setLoading(true);
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
    } catch (e) { console.warn('[Voice] error:', e); }
    finally { setLoading(false); }
  };

  const onLayout = (e: LayoutChangeEvent) => { widthRef.current = e.nativeEvent.layout.width; };

  const thumbPos = progress * 100;
  const colorFilled = mine ? 'rgba(0,0,0,0.55)' : Colors.gold;
  const colorEmpty  = mine ? 'rgba(0,0,0,0.2)'  : 'rgba(212,160,60,0.2)';
  const thumbColor  = mine ? '#3a2000'           : Colors.gold;
  const playColor   = mine ? '#1a0e00'           : Colors.gold;
  const timeColor   = mine ? 'rgba(0,0,0,0.5)'  : Colors.muted;

  return (
    <TouchableOpacity style={[vs.wrap, mine ? vs.wrapMine : vs.wrapTheirs]} onLongPress={onLongPress} delayLongPress={400} activeOpacity={1}>

      {/* ЛЕВАЯ ЧАСТЬ: аватарка с mic badge */}
      <View style={vs.avatarWrap}>
        <View style={[vs.avatar, mine ? vs.avatarMine : vs.avatarTheirs]}>
          <Text style={vs.avatarEmoji}>{senderEmoji ?? (mine ? '👤' : '🎵')}</Text>
        </View>
        <View style={vs.micBadge}>
          <Text style={vs.micEmoji}>🎤</Text>
        </View>
      </View>

      {/* ПРАВАЯ ЧАСТЬ: [play] [волна+время] в одну строку */}
      <View style={vs.right}>

        {/* Верхний ряд: play + волна */}
        <View style={vs.topRow}>
          <TouchableOpacity
            style={vs.playBtn}
            onPress={handlePress}
            onLongPress={onLongPress}
            delayLongPress={500}
            activeOpacity={0.6}
          >
            {loading
              ? <ActivityIndicator size="small" color={playColor} />
              : <Text style={[vs.playIcon, { color: playColor }]}>{playing ? '⏸' : '▶'}</Text>
            }
          </TouchableOpacity>

          {/* Волновая форма */}
          <View style={vs.waveform} onLayout={onLayout} {...panResponder.panHandlers}>
            {BAR_HEIGHTS.map((h, i) => {
              const filled = (i / BARS) < progress;
              return (
                <View
                  key={i}
                  style={[vs.bar, { height: Math.round(h * 26), backgroundColor: filled ? colorFilled : colorEmpty }]}
                />
              );
            })}
            <View style={[vs.thumb, { left: `${thumbPos}%`, backgroundColor: thumbColor }]} />
          </View>
        </View>

        {/* Нижний ряд: два времени */}
        <View style={vs.timeRow}>
          <Text style={[vs.timeText, { color: timeColor }]}>
            {formatTime(playing || progress > 0 ? position : 0)}
          </Text>
          <Text style={[vs.timeText, { color: timeColor }]}>
            {formatTime(duration)}
          </Text>
        </View>

      </View>
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
  // Пузырь
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 20,
    minWidth: 210,
    maxWidth: '82%',
    gap: 16,
  },
  wrapMine: {
    backgroundColor: Colors.gold,
    borderBottomRightRadius: 4,
  },
  wrapTheirs: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderBottomLeftRadius: 4,
  },

  // Аватарка
  avatarWrap: {
    width: 53,
    height: 53,
    flexShrink: 0,
    position: 'relative',
    marginLeft: -12,
  },
  avatar: {
    width: 53,
    height: 53,
    borderRadius: 26,
    alignItems: 'center', transform: [{ scale: 1.25 }],
    justifyContent: 'center',
  },
  avatarMine: {
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  avatarTheirs: {
    backgroundColor: Colors.bg3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatarEmoji: { fontSize: 24 },
  micBadge: {
    position: 'absolute',
    bottom: -2,
    right: -3,
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micEmoji: { fontSize: 7 },

  // Правая часть
  right: {
    flex: 1,
    flexDirection: 'column',
    gap: 3,
  },

  // Верхний ряд: play + волна
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  // Play кнопка
  playBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0, transform: [{ scale: 1.25 }, { translateY: 5 }, { translateX: 6 }], alignSelf: 'flex-end',
  },
  playIcon: {
    fontSize: 22,
    marginLeft: -12,
  },

  // Волна
  waveform: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
    height: 28,
    position: 'relative', transform: [{ translateY: 6 }, { translateX: 6 }],
  },
  bar: {
    width: 2.5,
    borderRadius: 1.5,
    flexShrink: 0,
  },
  thumb: {
    position: 'absolute',
    width: 11,
    height: 11,
    borderRadius: 6,
    top: '50%',
    marginTop: -5, transform: [{ translateY: -1 }],
    marginLeft: -5,
  },

  // Времена
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between', transform: [{ translateY: 5 }],
    paddingLeft: 30,
  },
  timeText: {
    fontSize: 10,
    fontFamily: Typography.nunito600,
  },

  // Запись
  recBar:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: 'rgba(192,57,43,0.1)', borderTopWidth: 1, borderTopColor: Colors.border },
  recDot:  { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.red },
  recTime: { fontSize: 14, color: Colors.red, fontWeight: 'bold' },
  recHint: { flex: 1, fontSize: 13, color: Colors.muted },
  recStop: { paddingHorizontal: 8 },
});
