import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator, TextInput, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { useAppStore } from '../../store/useAppStore';
import { leaveGroup, removeGroupMember, makeGroupAdmin, updateGroupInfo, addGroupMember, uploadGroupPhoto, getUsersByUids, subscribeChat } from '../../firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { Modal as RNModal } from 'react-native';
import { Image } from 'expo-image';
import ZoomableImage from '../../components/common/ZoomableImage';
import type { ChatItem } from '../../store/useAppStore';

interface Props {
  chat: ChatItem;
  onClose: () => void;
  onLeft: () => void;
}

export default function GroupInfo({ chat, onClose, onLeft }: Props) {
  const { user, musicians } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [groupName, setGroupName] = useState(chat.name);
  const [showAddMember, setShowAddMember] = useState(false);
  const [photoURL, setPhotoURL] = useState(chat.photoURL ?? null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [showFullPhoto, setShowFullPhoto] = useState(false);
  const [fullPhotoLoading, setFullPhotoLoading] = useState(false);
  const [liveMembers, setLiveMembers] = useState<string[]>(chat.members ?? []);
  const [usersMap, setUsersMap] = useState<Record<string, { name: string; emoji: string }>>({});

  useEffect(() => {
    const unsub = subscribeChat(chat.id, (data) => {
      setLiveMembers(data.members ?? []);
    });
    return unsub;
  }, [chat.id]);

  useEffect(() => {
    if (!liveMembers.length) return;
    getUsersByUids(liveMembers).then(setUsersMap).catch(() => {});
  }, [JSON.stringify(liveMembers)]);

  const isAdmin = chat.admins?.includes(user?.uid ?? '') || chat.createdBy === user?.uid;
  const isCreator = chat.createdBy === user?.uid;

  // Get member details from musicians list
  const memberDetails = liveMembers.map(uid => {
    const isMe = uid === user?.uid;
    const fromMap = usersMap[uid];
    return {
      uid,
      name: isMe ? (user?.displayName ?? 'Siz') : (fromMap?.name ?? 'İstifadəçi'),
      emoji: fromMap?.emoji ?? '👤',
      isAdmin: chat.admins?.includes(uid) ?? false,
      isCreator: chat.createdBy === uid,
    };
  });

  // Users not in group
  const nonMembers = musicians.filter(m => {
    const uid = m.uid ?? m.id;
    return uid !== user?.uid && !liveMembers.includes(uid);
  });

  const handleLeave = useCallback(() => {
    Alert.alert('Qrupdan çıx', 'Əminsiniz?', [
      { text: 'Ləğv et', style: 'cancel' },
      {
        text: 'Çıx',
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          try {
            await leaveGroup(chat.id, user?.uid ?? '', user?.displayName ?? 'İstifadəçi');
            onLeft();
          } catch {
            Alert.alert('', 'Xəta baş verdi');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  }, [chat.id, user]);

  const handleRemove = useCallback((uid: string, name: string) => {
    Alert.alert(`${name} çıxar`, 'Əminsiniz?', [
      { text: 'Ləğv et', style: 'cancel' },
      {
        text: 'Çıxar',
        style: 'destructive',
        onPress: async () => {
          await removeGroupMember(chat.id, uid, name, user?.displayName ?? '', chat.name).catch(() => {});
        },
      },
    ]);
  }, [chat.id, user]);

  const handleMakeAdmin = useCallback((uid: string, name: string) => {
    Alert.alert(`${name} admin et`, 'Əminsiniz?', [
      { text: 'Ləğv et', style: 'cancel' },
      {
        text: 'Admin et',
        onPress: async () => {
          await makeGroupAdmin(chat.id, uid, name).catch(() => {});
        },
      },
    ]);
  }, [chat.id]);

  const handleSaveInfo = async () => {
    if (!groupName.trim()) return;
    setLoading(true);
    try {
      await updateGroupInfo(chat.id, groupName.trim(), chat.emoji);
      setEditMode(false);
    } catch {
      Alert.alert('', 'Xəta baş verdi');
    } finally {
      setLoading(false);
    }
  };

  const handlePickPhoto = async () => {
    console.log('handlePickPhoto called, isAdmin:', isAdmin);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('', 'Qalereya icazəsi lazımdır'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled) { console.log('canceled'); return; }
    console.log('photo selected:', result.assets[0].uri);
    const uri = result.assets[0].uri;
    setPhotoLoading(true);
    try {
      console.log('uploading photo, chatId:', chat.id, 'uri:', uri);
      const url = await uploadGroupPhoto(chat.id, uri);
      console.log('upload success, url:', url);
      setPhotoURL(url);
    } catch (e) {
      console.log('upload error:', e);
      Alert.alert('', 'Şəkil yüklənmədi');
    } finally {
      setPhotoLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.screen}>
      <View style={s.header}>
        <TouchableOpacity onPress={onClose}>
          <Text style={s.back}>←</Text>
        </TouchableOpacity>
        <Text style={s.title}>Qrup məlumatı</Text>
        {isAdmin && (
          <TouchableOpacity onPress={() => editMode ? handleSaveInfo() : setEditMode(true)}>
            {loading
              ? <ActivityIndicator size="small" color={Colors.gold} />
              : <Text style={s.edit}>{editMode ? 'Saxla' : 'Redaktə'}</Text>
            }
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={{ flex: 1 }}>
        {/* Group avatar & name */}
        <View style={s.groupTop}>
          <TouchableOpacity
            style={s.groupAva}
            onPress={() => { if (photoURL) { setFullPhotoLoading(true); setShowFullPhoto(true); } else if (isAdmin) handlePickPhoto(); }}
            onLongPress={isAdmin ? handlePickPhoto : undefined}
          >
            {photoURL ? (
              <Image source={{ uri: photoURL }} style={{ width: 110, height: 110, borderRadius: 30 }} cachePolicy="memory-disk" />
            ) : (
              <Text style={{ fontSize: 40 }}>{chat.emoji}</Text>
            )}
            {isAdmin && !photoLoading && (
              <TouchableOpacity style={s.cameraBtn} onPress={handlePickPhoto}>
                <Text style={{ fontSize: 26 }}>📷</Text>
              </TouchableOpacity>
            )}
            {photoLoading && (
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 28, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color={Colors.gold} />
              </View>
            )}
          </TouchableOpacity>
          {editMode ? (
            <TextInput
              style={s.nameInput}
              value={groupName}
              onChangeText={setGroupName}
              placeholder="Qrup adı..."
              placeholderTextColor={Colors.muted}
            />
          ) : (
            <Text style={s.groupName}>{chat.name}</Text>
          )}
          <Text style={s.groupSub}>{liveMembers.length} iştirakçı</Text>
        </View>

        {/* Members */}
        <Text style={s.sectionLabel}>İştirakçılar</Text>
        {memberDetails.map(m => (
          <View key={m.uid} style={s.memberItem}>
            <View style={s.memberAva}>
              <Text style={{ fontSize: 20 }}>{m.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.memberName}>
                {m.uid === user?.uid ? 'Siz' : m.name}
              </Text>
              {m.isCreator && <Text style={s.memberRole}>Yaradıcı</Text>}
              {!m.isCreator && m.isAdmin && <Text style={s.memberRole}>Admin</Text>}
            </View>
            {isAdmin && m.uid !== user?.uid && (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {!m.isAdmin && isCreator && (
                  <TouchableOpacity onPress={() => handleMakeAdmin(m.uid, m.name)}>
                    <Text style={s.adminBtn}>⭐</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => handleRemove(m.uid, m.name)}>
                  <Text style={s.removeBtn}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}

        {/* Add member */}
        {isAdmin && nonMembers.length > 0 && (
          <TouchableOpacity style={s.addMemberBtn} onPress={() => setShowAddMember(true)}>
            <Text style={s.addMemberText}>＋ İştirakçı əlavə et</Text>
          </TouchableOpacity>
        )}

        {/* Leave group */}
        <TouchableOpacity style={s.leaveBtn} onPress={handleLeave}>
          <Text style={s.leaveBtnText}>🚪 Qrupdan çıx</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Add member modal */}
      <Modal visible={showAddMember} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.screen}>
          <View style={s.header}>
            <TouchableOpacity onPress={() => setShowAddMember(false)}>
              <Text style={s.back}>←</Text>
            </TouchableOpacity>
            <Text style={s.title}>İştirakçı əlavə et</Text>
            <View style={{ width: 40 }} />
          </View>
          <ScrollView>
            {nonMembers.map(m => (
              <TouchableOpacity
                key={m.uid ?? m.id}
                style={s.memberItem}
                onPress={async () => {
                  await addGroupMember(chat.id, m.uid ?? m.id, m.name, user?.displayName ?? '', chat.name).catch(() => {});
                  setShowAddMember(false);
                }}
              >
                <View style={s.memberAva}>
                  <Text style={{ fontSize: 20 }}>{m.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.memberName}>{m.name}</Text>
                  <Text style={s.memberRole}>{m.instrument} · {m.city}</Text>
                </View>
                <Text style={{ color: Colors.gold, fontSize: 20 }}>＋</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
      <RNModal visible={showFullPhoto} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' }}>
          <TouchableOpacity
            style={{ position: 'absolute', top: 50, right: 20, zIndex: 10, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' }}
            onPress={() => setShowFullPhoto(false)}
          >
            <Text style={{ color: '#fff', fontSize: 20 }}>✕</Text>
          </TouchableOpacity>
          {photoURL && (
            <>
              <Image
                source={{ uri: photoURL }}
                style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
                onLoad={() => setFullPhotoLoading(false)}
              />
              <ZoomableImage uri={photoURL} />
              {fullPhotoLoading && (
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator size="large" color={Colors.gold} />
                </View>
              )}
            </>
          )}
        </View>
      </RNModal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: Colors.bg },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title:        { fontFamily: Typography.playfair700, fontSize: 16, color: Colors.text },
  back:         { fontSize: 24, color: Colors.text },
  edit:         { fontSize: 14, color: Colors.gold, fontFamily: Typography.nunito700 },
  groupTop:     { alignItems: 'center', paddingVertical: 24, gap: 8 },
  groupAva:     { width: 110, height: 110, borderRadius: 30, backgroundColor: Colors.bg3, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.gold },
  groupName:    { fontFamily: Typography.playfair700, fontSize: 20, color: Colors.text },
  groupSub:     { fontSize: 13, color: Colors.muted, fontFamily: Typography.nunito400 },
  nameInput:    { fontSize: 18, color: Colors.text, fontFamily: Typography.nunito400, borderBottomWidth: 1, borderBottomColor: Colors.gold, paddingVertical: 4, minWidth: 200, textAlign: 'center' },
  sectionLabel: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, fontSize: 11, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1.2, fontFamily: Typography.nunito700 },
  memberItem:   { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  memberAva:    { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.bg3, alignItems: 'center', justifyContent: 'center' },
  memberName:   { fontFamily: Typography.playfair700, fontSize: 14, color: Colors.text },
  memberRole:   { fontSize: 11, color: Colors.gold, fontFamily: Typography.nunito600 },
  adminBtn:     { fontSize: 18, padding: 4 },
  removeBtn:    { fontSize: 16, color: Colors.red, padding: 4 },
  addMemberBtn: { margin: 16, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: Colors.gold, alignItems: 'center' },
  addMemberText:{ color: Colors.gold, fontFamily: Typography.nunito700, fontSize: 14 },
  leaveBtn:     { margin: 16, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: Colors.red, alignItems: 'center' },
  leaveBtnText: { color: Colors.red, fontFamily: Typography.nunito700, fontSize: 14 },
  photoEdit:    { position: 'absolute', bottom: 0, right: 0, fontSize: 16, backgroundColor: Colors.card, borderRadius: 10, padding: 2 },
  cameraBtn:    { position: 'absolute', bottom: -18, right: -18, backgroundColor: Colors.gold, borderRadius: 28, width: 56, height: 56, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: Colors.bg },
});
