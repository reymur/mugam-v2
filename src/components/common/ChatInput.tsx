import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import AttachMenu from './AttachMenu';

interface ChatInputProps {
  value:             string;
  onChangeText:      (text: string) => void;
  onSend:            () => void;
  onStartRecording:  () => void;
  onStopRecording:   () => void;
  recording:         boolean;
  recDuration:       number;
  inputRef?:         React.RefObject<TextInput>;
  recordingMode?:    'hold' | 'toggle';
  onOpenGallery?:    () => void;
  onOpenCamera?:     () => void;
}

export default function ChatInput({
  value, onChangeText, onSend,
  onStartRecording, onStopRecording,
  recording, recDuration,
  inputRef,
  recordingMode = 'hold',
  onOpenGallery, onOpenCamera,
}: ChatInputProps) {
  const insets = useSafeAreaInsets();
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const hasText = value.trim().length > 0;
  const mins = String(Math.floor(recDuration / 60)).padStart(2, '0');
  const secs = String(recDuration % 60).padStart(2, '0');

  return (
    <View>
      {recording && (
        <View style={s.recBar}>
          <View style={s.recDot} />
          <Text style={s.recTime}>{mins}:{secs}</Text>
          <Text style={s.recHint}>Səs yazılır...</Text>
          <TouchableOpacity onPress={onStopRecording}>
            <Text style={s.recCancel}>Ləğv et</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={[s.row, { paddingBottom: insets.bottom > 0 ? insets.bottom : 8 }]}>
        <TouchableOpacity style={s.sideBtn} onPress={() => setShowAttachMenu(true)}>
          <Text style={s.sideBtnText}>＋</Text>
        </TouchableOpacity>

        <View style={s.inputBubble}>
          <TextInput
            ref={inputRef}
            style={s.input}
            placeholder="Mesaj yaz..."
            placeholderTextColor={Colors.muted}
            value={value}
            onChangeText={onChangeText}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={onSend}
          />
          <TouchableOpacity style={s.emojiBtn} onPress={() => Alert.alert('', 'Tezliklə')}>
            <Text style={{ fontSize: 18 }}>🙂</Text>
          </TouchableOpacity>
        </View>

        {hasText ? (
          <TouchableOpacity style={s.sendBtn} onPress={onSend}>
            <Text style={s.sendText}>➤</Text>
          </TouchableOpacity>
        ) : (
          <View style={s.rightGroup}>
            <TouchableOpacity style={s.micBtn} onPress={onOpenCamera}>
              <Text style={s.micIcon}>📷</Text>
            </TouchableOpacity>
            {recordingMode === 'hold' ? (
              <TouchableOpacity
                style={[s.micBtn, recording && s.micBtnActive]}
                onPressIn={onStartRecording}
                onPressOut={onStopRecording}
              >
                <Text style={s.micIcon}>🎙</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[s.micBtn, recording && s.micBtnActive]}
                onPress={recording ? onStopRecording : onStartRecording}
              >
                <Text style={s.micIcon}>{recording ? '⏹' : '🎙'}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      <AttachMenu
        visible={showAttachMenu}
        onClose={() => setShowAttachMenu(false)}
        onDismiss={() => setShowAttachMenu(false)}
        onOpenGallery={onOpenGallery}
        onOpenCamera={onOpenCamera}
      />
    </View>
  );
}

const s = StyleSheet.create({
  recBar:       { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: 'rgba(192,57,43,0.1)', borderTopWidth: 1, borderTopColor: Colors.border },
  recDot:       { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.red },
  recTime:      { fontSize: 14, color: Colors.red, fontWeight: 'bold' },
  recHint:      { flex: 1, fontSize: 13, color: Colors.muted },
  recCancel:    { color: Colors.red, fontSize: 13 },
  row:          { flexDirection: 'row', alignItems: 'flex-end', gap: 6, paddingHorizontal: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.bg },
  sideBtn:      { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  sideBtnText:  { fontSize: 22, color: Colors.muted },
  inputBubble:  { flex: 1, flexDirection: 'row', alignItems: 'flex-end', backgroundColor: Colors.card, borderRadius: 22, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 6, minHeight: 40 },
  input:        { flex: 1, color: Colors.text, fontSize: 15, fontFamily: Typography.nunito400, maxHeight: 120, paddingVertical: 2 },
  emojiBtn:     { paddingBottom: 4, paddingLeft: 6 },
  sendBtn:      { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.gold, alignItems: 'center', justifyContent: 'center' },
  sendText:     { color: '#1a0e00', fontSize: 16, fontFamily: Typography.nunito700 },
  micBtn:       { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  micBtnActive: { opacity: 0.5 },
  micIcon:      { fontSize: 26 },
  rightGroup:   { flexDirection: 'row', alignItems: 'center', gap: 2 },
});
