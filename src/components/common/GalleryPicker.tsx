import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  ScrollView, Image, Dimensions, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as MediaLibrary from 'expo-media-library';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';

const SCREEN_W = Dimensions.get('window').width;
const NUM_COLS = 4;
const THUMB = (SCREEN_W - NUM_COLS + 1) / NUM_COLS;

interface Props {
  visible:   boolean;
  onClose:   () => void;
  onSelect:  (uri: string) => void;
}

type Tab = 'photos' | 'albums';

interface AlbumItem {
  id:         string;
  title:      string;
  assetCount: number;
  thumbUri?:  string;
  album:      MediaLibrary.Album;
}

interface PhotoItem {
  id:  string;
  uri: string;
}

export default function GalleryPicker({ visible, onClose, onSelect }: Props) {
  const [tab, setTab]       = useState<Tab>('photos');
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [albums, setAlbums] = useState<AlbumItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setTab('photos');
    loadPhotos();
    loadAlbums();
  }, [visible]);

  const resolveLocalUri = async (asset: MediaLibrary.Asset): Promise<string> => {
    const info = await MediaLibrary.getAssetInfoAsync(asset, { shouldDownloadFromNetwork: false });
    return info.localUri ?? asset.uri;
  };

  const loadPhotos = async (album?: MediaLibrary.Album) => {
    setLoading(true);
    setPhotos([]);
    const { assets } = await MediaLibrary.getAssetsAsync({
      ...(album ? { album } : {}),
      mediaType: MediaLibrary.MediaType.photo,
      first: 40,
      sortBy: MediaLibrary.SortBy.creationTime,
    });

    // Загружаем localUri батчами по 5 — только file:// URI
    const BATCH = 5;
    const resolved: PhotoItem[] = [];
    for (let i = 0; i < assets.length; i += BATCH) {
      const batch = assets.slice(i, i + BATCH);
      const uris = await Promise.all(batch.map((a) => resolveLocalUri(a)));
      batch.forEach((a, j) => { resolved.push({ id: a.id, uri: uris[j] }); });
      setPhotos([...resolved]);
      if (i === 0) setLoading(false);
    }
    if (resolved.length === 0) setLoading(false);
  };

  const loadAlbums = async () => {
    const list = await MediaLibrary.getAlbumsAsync({ includeSmartAlbums: true });
    const items: AlbumItem[] = await Promise.all(
      list.map(async (album) => {
        const { assets } = await MediaLibrary.getAssetsAsync({
          album,
          mediaType: MediaLibrary.MediaType.photo,
          first: 1,
          sortBy: MediaLibrary.SortBy.creationTime,
        });
        let thumbUri: string | undefined;
        if (assets[0]) {
          thumbUri = await resolveLocalUri(assets[0]);
        }
        return {
          id:         album.id,
          title:      album.title,
          assetCount: album.assetCount,
          thumbUri,
          album,
        };
      })
    );
    setAlbums(items);
  };

  const handleSelect = (uri: string) => {
    onClose();
    onSelect(uri);
  };

  const handleAlbumPress = (item: AlbumItem) => {
    setTab('photos');
    loadPhotos(item.album);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <SafeAreaView style={s.container}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={s.cancel}>Ləğv et</Text>
          </TouchableOpacity>
          <View style={s.tabs}>
            <TouchableOpacity
              style={[s.tab, tab === 'photos' && s.tabActive]}
              onPress={() => setTab('photos')}
            >
              <Text style={[s.tabText, tab === 'photos' && s.tabTextActive]}>Foto</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.tab, tab === 'albums' && s.tabActive]}
              onPress={() => setTab('albums')}
            >
              <Text style={[s.tabText, tab === 'albums' && s.tabTextActive]}>Albomlar</Text>
            </TouchableOpacity>
          </View>
          <View style={{ width: 60 }} />
        </View>

        {loading ? (
          <View style={s.loader}>
            <ActivityIndicator color={Colors.gold} size="large" />
          </View>
        ) : tab === 'photos' ? (
          <ScrollView>
            <View style={s.photoGrid}>
              {photos.map((item) => (
                <TouchableOpacity key={item.id} onPress={() => handleSelect(item.uri)}>
                  <Image source={{ uri: item.uri }} style={s.thumb} />
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        ) : (
          <ScrollView>
            <View style={s.albumGrid}>
              {albums.map((item) => (
                <TouchableOpacity key={item.id} style={s.albumItem} onPress={() => handleAlbumPress(item)}>
                  {item.thumbUri ? (
                    <Image source={{ uri: item.thumbUri }} style={s.albumThumb} />
                  ) : (
                    <View style={[s.albumThumb, s.albumEmpty]} />
                  )}
                  <Text style={s.albumName} numberOfLines={1}>{item.title}</Text>
                  <Text style={s.albumCount}>{item.assetCount}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  container:     { flex: 1, backgroundColor: Colors.bg },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  cancel:        { fontSize: 15, color: Colors.gold, fontFamily: Typography.nunito400, width: 60 },
  tabs:          { flexDirection: 'row', backgroundColor: Colors.bg3, borderRadius: 8, padding: 2 },
  tab:           { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 6 },
  tabActive:     { backgroundColor: Colors.gold },
  tabText:       { fontSize: 14, color: Colors.muted, fontFamily: Typography.nunito600 },
  tabTextActive: { color: '#1a0e00' },
  loader:        { flex: 1, alignItems: 'center', justifyContent: 'center' },
  thumb:         { width: THUMB - 1, height: THUMB - 1, margin: 0.5 },
  albumItem:     { width: (SCREEN_W - 24) / 2, margin: 4 },
  albumThumb:    { width: '100%', height: (SCREEN_W - 24) / 2, borderRadius: 8 },
  albumEmpty:    { backgroundColor: Colors.bg3 },
  albumName:     { color: Colors.text, fontSize: 13, fontFamily: Typography.nunito500, marginTop: 6 },
  albumCount:    { color: Colors.muted, fontSize: 12, fontFamily: Typography.nunito400 },
  photoGrid:     { flexDirection: 'row', flexWrap: 'wrap', width: '100%' },
  albumGrid:     { flexDirection: 'row', flexWrap: 'wrap', padding: 4 },
});
