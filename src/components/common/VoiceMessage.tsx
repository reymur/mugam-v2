import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Audio } from 'expo-av';
import { Colors } from '../../theme/colors';

type PlayState = 'idle' | 'speaker' | 'earpiece';

interface VoicePlayerProps {
  uri:  string;
  mine: boolean;
}

export function VoicePlayer({ uri, mine }: VoicePlayerProps) {
  const [sound,     setSound]     = useState<Audio.Sound | null>(null);
  const [playState, setPlayState] = useState<PlayState>('idle');
  const [loading,   setLoading]   = useState(false);

  useEffect(() => {
    return () => { sound?.unloadAsync().catch(() => {}); };
  }, [sound]);

  const handlePlay = async () => {
    try {
      // idle → speaker
      if (playState === 'idle') {
        setLoading(true);
        await Audio.setAudioModeAsync({
          allowsRecordingIOS:      false,
          playsInSilentModeIOS:    true,
          playThroughEarpieceAndroid: false,
        });
        if (sound) await sound.unloadAsync();
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: true },
          (status) => { if (status.isLoaded && status.didJustFinish) setPlayState('idle'); }
        );
        setSound(newSound);
        setPlayState('speaker');
        return;
      }

      // speaker → earpiece
      if (playState === 'speaker' && sound) {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS:      false,
          playsInSilentModeIOS:    true,
          playThroughEarpieceAndroid: true,
        });
        setPlayState('earpiece');
        return;
      }

      // earpiece → idle (stop)
      if (playState === 'earpiece' && sound) {
        await sound.stopAsync();
        await Audio.setAudioModeAsync({
          allowsRecordingIOS:      false,
          playsInSilentModeIOS:    true,
          playThroughEarpieceAndroid: false,
        });
        setPlayState('idle');
        return;
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const icon = playState === 'idle' ? '▶' : playState === 'speaker' ? '🔊' : '🔉';

  return (
    <TouchableOpacity style={[vs.wrap, mine ? vs.wrapMine : vs.wrapTheirs]} onPress={handlePlay}>
      {loading
        ? <ActivityIndicator size="small" color={mine ? '#1a0e00' : Colors.gold} />
        : <Text style={[vs.icon, { color: mine ? '#1a0e00' : Colors.gold }]}>{icon}</Text>
      }
      <View style={vs.bars}>
        {Array.from({ length: 16 }).map((_, i) => (
          <View key={i} style={[vs.bar, { height: 4 + Math.sin(i * 0.8) * 8 + 4 }, playState !== 'idle' && { backgroundColor: mine ? '#1a0e00' : Colors.gold }]} />
        ))}
      </View>
      <Text style={[vs.label, { color: mine ? '#1a0e00' : Colors.muted }]}>🎤</Text>
    </TouchableOpacity>
  );
}

export function VoiceRecorderBar({ recording, duration, onStop }: {
  recording: boolean;
  duration: number;
  onStop: () => void;
}) {
  if (!recording) return null;
  const mins = Math.floor(duration / 60).toString().padStart(2, '0');
  const secs = (duration % 60).toString().padStart(2, '0');
  return (
    <View style={vs.recBar}>
      <View style={vs.recDot} />
      <Text style={vs.recTime}>{mins}:{secs}</Text>
      <Text style={vs.recHint}>Səs yazılır...</Text>
      <TouchableOpacity onPress={onStop} style={vs.recStop}>
        <Text style={{ color: Colors.red, fontSize: 13 }}>Ləğv et</Text>
      </TouchableOpacity>
    </View>
  );
}

const vs = StyleSheet.create({
  wrap:       { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, maxWidth: '75%' },
  wrapMine:   { backgroundColor: Colors.gold, borderBottomRightRadius: 4 },
  wrapTheirs: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderBottomLeftRadius: 4 },
  icon:       { fontSize: 20 },
  bars:       { flexDirection: 'row', alignItems: 'center', gap: 2, height: 24 },
  bar:        { width: 3, borderRadius: 2, backgroundColor: 'rgba(128,128,128,0.4)' },
  label:      { fontSize: 14 },
  recBar:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: 'rgba(192,57,43,0.1)', borderTopWidth: 1, borderTopColor: Colors.border },
  recDot:     { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.red },
  recTime:    { fontSize: 14, color: Colors.red, fontWeight: 'bold' },
  recHint:    { flex: 1, fontSize: 13, color: Colors.muted },
  recStop:    { paddingHorizontal: 8 },
});
