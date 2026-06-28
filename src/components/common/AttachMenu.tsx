import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ScrollView, Image, Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { uploadChatImage } from '../../firebase/firestore';
import BottomSheet from '../modals/BottomSheet';

interface AttachMenuProps {
  visible:              boolean;
  onClose:              () => void;
  onDismiss:            () => void;
  chatId?:              string;
  senderId?:            string;
  onSendMessage?:       (text: string) => void;
  onOpenGallery?:       () => void;
  onSendOptimistic?:    (text: string) => Promise<string>;
  onUpdateMessage?:     (tempId: string, newText: string) => void;
}

const SCREEN_W  = Dimensions.get('window').width;
const THUMB_SIZE = (SCREEN_W - 4) / 4;

export default function AttachMenu({
  visible, onClose, onDismiss,
  chatId, senderId, onSendMessage, onOpenGallery,
  onSendOptimistic, onUpdateMessage,
}: AttachMenuProps) {
  const [recentPhotos, setRecentPhotos] = useState<MediaLibrary.Asset[]>([]);

  useEffect(() => {
    if (!visible) return;
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
  }, [visible]);

  const uploadAndSend = async (uri: string) => {
    if (!chatId || !senderId) return;
    try {
      if (onSendOptimistic && onUpdateMessage) {
        // Optimistic: показываем фото сразу с локальным URI
        const tempId = await onSendOptimistic(`📷 IMAGE:${uri}`);
        const url = await uploadChatImage(chatId, uri, senderId);
        onUpdateMessage(tempId, `📷 IMAGE:${url}`);
      } else {
        // Fallback: обычная отправка
        const url = await uploadChatImage(chatId, uri, senderId);
        onSendMessage?.(`📷 IMAGE:${url}`);
      }
    } catch {
      Alert.alert('', 'Şəkil göndərilmədi');
    }
  };

  const handlePickImage = async () => {
    onClose();
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
    onClose();
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
    if (!asset.uri) { Alert.alert('', 'Şəkil tapılmadı'); return; }
    onClose();
    uploadAndSend(asset.uri);
  };

  const ATTACH_ITEMS = [
    { icon: '🖼',  label: 'Foto',     color: '#1565C0', onPress: handlePickImage },
    { icon: '📷',  label: 'Kamera',   color: '#424242', onPress: handleOpenCamera },
    { icon: '📍',  label: 'Məkan',    color: '#00695C', onPress: () => { onClose(); Alert.alert('', 'Tezliklə'); } },
    { icon: '👤',  label: 'Kontakt',  color: '#4A148C', onPress: () => { onClose(); Alert.alert('', 'Tezliklə'); } },
    { icon: '📄',  label: 'Sənəd',    color: '#E65100', onPress: () => { onClose(); Alert.alert('', 'Tezliklə'); } },
    { icon: '📊',  label: 'Sorğu',    color: '#F9A825', onPress: () => { onClose(); Alert.alert('', 'Tezliklə'); } },
  ];

  return (
    <BottomSheet visible={visible} onClose={onClose} onDismiss={onDismiss}>
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

      {recentPhotos.length > 0 && (
        <View style={s.photosSection}>
          <TouchableOpacity style={s.swipeUpBtn} onPress={onOpenGallery}>
            <Text style={s.swipeUpArrow}>⌃</Text>
            <Text style={s.swipeUpText}>Bütün fotoları göstər</Text>
          </TouchableOpacity>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.photosScroll}>
            {recentPhotos.map((asset) => (
              <TouchableOpacity key={asset.id} onPress={() => handlePhotoTap(asset)}>
                <Image source={{ uri: asset.uri }} style={s.photoThumb} />
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={s.showAllBtn} onPress={onOpenGallery}>
              <Text style={s.showAllIcon}>▶</Text>
              <Text style={s.showAllText}>Hamısı</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}
    </BottomSheet>
  );
}

const s = StyleSheet.create({
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
