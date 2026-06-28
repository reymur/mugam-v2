import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ScrollView, Image, Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { uploadChatImage } from '../../firebase/firestore';
import BottomSheet from '../modals/BottomSheet';

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
  chatId?:           string;
  senderId?:         string;
  onSendMessage?:    (text: string) => void;
  onOpenGallery?:    () => void;
}

const SCREEN_W = Dimensions.get('window').width;
const THUMB_SIZE = (SCREEN_W - 4) / 4;

export default function ChatInput({
  value, onChangeText, onSend,
  onStartRecording, onStopRecording,
  recording, recDuration,
  inputRef,
  recordingMode = 'hold',
  chatId, senderId, onSendMessage, onOpenGallery,
}: ChatInputProps) {
  const insets = useSafeAreaInsets();
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [recentPhotos, setRecentPhotos]     = useState<MediaLibrary.Asset[]>([]);
  const hasText = value.trim().length > 0;

  const mins = String(Math.floor(recDuration / 60)).padStart(2, '0');
  const secs = String(recDuration % 60).padStart(2, '0');

  useEffect(() => {
    if (!showAttachMenu) return;
    (async () => {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') return;
      const { assets } = await MediaLibrary.getAssetsAsync({
        mediaType: MediaLibrary.MediaType.photo,
        first: 20,
        sortBy: MediaLibrary.SortBy.creationTime,
      });
      const withLocalUri = await Promise.all(
        assets.map(async (asset) => {
          const info = await MediaLibrary.getAssetInfoAsync(asset, { shouldDownloadFromNetwork: false });
          return { ...asset, uri: info.localUri ?? asset.uri };
        })
      );
      setRecentPhotos(withLocalUri);
    })();
  }, [showAttachMenu]);

  const uploadAndSend = async (uri: string) => {
    if (!chatId || !senderId) return;
    try {
      const url = await uploadChatImage(chatId, uri, senderId);
      onSendMessage?.(`📷 IMAGE:${url}`);
    } catch {
      Alert.alert('', 'Şəkil göndərilmədi');
    }
  };

  const handlePickImage = async () => {
    setShowAttachMenu(false);
    if (!chatId || !senderId) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('', 'Qalereya icazəsi lazımdır'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType.Images,
      allowsEditing: false,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    await uploadAndSend(result.assets[0].uri);
  };

  const handleOpenCamera = async () => {
    setShowAttachMenu(false);
    if (!chatId || !senderId) return;
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert('', 'Kamera icazəsi lazımdır'); return; }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaType.Images,
      allowsEditing: false,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    await uploadAndSend(result.assets[0].uri);
  };

  const handlePhotoTap = async (asset: MediaLibrary.Asset) => {
    setShowAttachMenu(false);
    if (!asset.uri) { Alert.alert('', 'Şəkil tapılmadı'); return; }
    await uploadAndSend(asset.uri);
  };

  const handleOpenGallery = () => {
    setShowAttachMenu(false);
    setTimeout(() => onOpenGallery?.(), 300);
  };

  const ATTACH_ITEMS = [
    { icon: '🖼',  label: 'Foto',     color: '#1565C0', onPress: handlePickImage },
    { icon: '📷',  label: 'Kamera',   color: '#424242', onPress: handleOpenCamera },
    { icon: '📍',  label: 'Məkan',    color: '#00695C', onPress: () => { setShowAttachMenu(false); Alert.alert('', 'Tezliklə'); } },
    { icon: '👤',  label: 'Kontakt',  color: '#4A148C', onPress: () => { setShowAttachMenu(false); Alert.alert('', 'Tezliklə'); } },
    { icon: '📄',  label: 'Sənəd',    color: '#E65100', onPress: () => { setShowAttachMenu(false); Alert.alert('', 'Tezliklə'); } },
    { icon: '📊',  label: 'Sorğu',    color: '#F9A825', onPress: () => { setShowAttachMenu(false); Alert.alert('', 'Tezliklə'); } },
  ];

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
            <TouchableOpacity style={s.sideBtn} onPress={handleOpenCamera}>
              <Text style={s.sideBtnText}>📷</Text>
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

      <BottomSheet visible={showAttachMenu} onClose={() => setShowAttachMenu(false)}>
        {/* 2 ряда иконок */}
        <View style={s.menuGrid}>
          {ATTACH_ITEMS.map((item) => (
            <TouchableOpacity key={item.label} style={s.menuItem} onPress={item.onPress}>
              <View style={[s.menuIconBox, { backgroundColor: item.color }]}>
                <Text style={s.menuIcon}>{item.icon}</Text>
              </View>
              <Text style={s.menuLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Последние фото + кнопка открыть галерею */}
        {recentPhotos.length > 0 && (
          <View style={s.photosSection}>
            <TouchableOpacity style={s.swipeUpBtn} onPress={handleOpenGallery}>
              <Text style={s.swipeUpArrow}>⌃</Text>
              <Text style={s.swipeUpText}>Bütün fotoları göstər</Text>
            </TouchableOpacity>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.photosScroll}>
              {recentPhotos.map((asset) => (
                <TouchableOpacity key={asset.id} onPress={() => handlePhotoTap(asset)}>
                  <Image source={{ uri: asset.uri }} style={s.photoThumb} />
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={s.showAllBtn} onPress={handleOpenGallery}>
                <Text style={s.showAllIcon}>▶</Text>
                <Text style={s.showAllText}>Hamısı</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}
      </BottomSheet>

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
  rightGroup:   { flexDirection: 'row', alignItems: 'center', gap: 2 },
  micBtn:       { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  micBtnActive: { opacity: 0.5 },
  micIcon:      { fontSize: 26 },
  menuGrid:     { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', paddingBottom: 16 },
  menuItem:     { width: '25%', alignItems: 'center', gap: 8, marginBottom: 20 },
  menuIconBox:  { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  menuIcon:     { fontSize: 26 },
  menuLabel:    { fontSize: 12, color: Colors.text, fontFamily: Typography.nunito400, textAlign: 'center' },
  photosSection:{ borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 12 },
  photosScroll: { marginHorizontal: -20 },
  photoThumb:   { width: THUMB_SIZE, height: THUMB_SIZE, margin: 1 },
  showAllBtn:   { width: THUMB_SIZE, height: THUMB_SIZE, margin: 1, backgroundColor: Colors.bg3, alignItems: 'center', justifyContent: 'center', gap: 4 },
  showAllIcon:  { fontSize: 20, color: Colors.gold },
  showAllText:  { fontSize: 11, color: Colors.muted, fontFamily: Typography.nunito400 },
  swipeUpBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8 },
  swipeUpArrow: { fontSize: 16, color: Colors.gold },
  swipeUpText:  { fontSize: 13, color: Colors.gold, fontFamily: Typography.nunito500 },
});
