import { useRef, useState, useCallback } from 'react';
import { Audio } from 'expo-av';

interface UseVoiceRecorderResult {
  recording:    boolean;
  recDuration:  number;
  startRecording:   () => Promise<void>;
  stopAndGetUri:    () => Promise<string | null>;
}

export function useVoiceRecorder(onPermissionDenied?: () => void): UseVoiceRecorderResult {
  const [recording,   setRecording]   = useState(false);
  const [recDuration, setRecDuration] = useState(0);
  const recRef      = useRef<Audio.Recording | null>(null);
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationRef = useRef(0);

  const startRecording = useCallback(async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        onPermissionDenied?.();
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      recRef.current    = rec;
      durationRef.current = 0;
      setRecording(true);
      setRecDuration(0);
      timerRef.current = setInterval(() => {
        durationRef.current += 1;
        setRecDuration(d => d + 1);
      }, 1000);
    } catch {
      // ignore
    }
  }, [onPermissionDenied]);

  const stopAndGetUri = useCallback(async (): Promise<string | null> => {
    if (!recRef.current) return null;
    if (timerRef.current) clearInterval(timerRef.current);
    const duration = durationRef.current;
    setRecording(false);
    setRecDuration(0);
    durationRef.current = 0;
    try {
      await recRef.current.stopAndUnloadAsync();
      const uri = recRef.current.getURI() ?? null;
      recRef.current = null;
      if (duration < 1) return null; // слишком короткое
      return uri;
    } catch {
      recRef.current = null;
      return null;
    }
  }, []);

  return { recording, recDuration, startRecording, stopAndGetUri };
}
