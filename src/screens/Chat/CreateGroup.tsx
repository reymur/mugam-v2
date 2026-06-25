import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, ActivityIndicator, Alert,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { useAppStore } from '../../store/useAppStore';
import { createGroupChat, fetchAllUsers } from '../../firebase/firestore';
import type { UserProfile } from '../../types';
import type { Musician } from '../../store/useAppStore';
import MusicianProfileScreen from '../Musician/MusicianProfileScreen';

interface Props {
  onClose: () => void;
  onCreated: (chatId: string) => void;
}

export default function CreateGroup({ onClose, onCreated }: Props) {
  const { user } = useAppStore();
  const [groupName, setGroupName] = useState('');
  const [emoji, setEmoji] = useState('👥');
  const [selectedUids, setSelectedUids] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [profileUser, setProfileUser] = useState<Musician | null>(null);

  // Load all users once
  useEffect(() => {
    fetchAllUsers()
      .then(users => setAllUsers(users.filter(u => u.uid !== user?.uid)))
      .catch(() => {})
      .finally(() => setLoadingUsers(false));
  }, []);

  // Filter locally by search text
  const filteredUsers = searchText.trim()
    ? allUsers.filter(u =>
        u.displayName?.toLowerCase().includes(searchText.toLowerCase()) ||
        u.instrument?.toLowerCase().includes(searchText.toLowerCase()) ||
        u.city?.toLowerCase().includes(searchText.toLowerCase())
      )
    : allUsers;

  const selectedUsers = allUsers.filter(u => selectedUids.includes(u.uid));

  const toggleUser = useCallback((uid: string) => {
    setSelectedUids(prev =>
      prev.includes(uid) ? prev.filter(u => u !== uid) : [...prev, uid]
    );
  }, []);

  const handleCreate = async () => {
    if (!groupName.trim()) {
      Alert.alert('', 'Qrup adı daxil edin');
      return;
    }
    if (selectedUids.length === 0) {
      Alert.alert('', 'Ən az 1 iştirakçı seçin');
      return;
    }
    if (!user?.uid) return;
    setLoading(true);
    try {
      const chatId = await createGroupChat(
        user.uid,
        user.displayName ?? 'İstifadəçi',
        groupName.trim(),
        selectedUids,
        emoji,
      );
      onCreated(chatId);
    } catch {
      Alert.alert('', 'Qrup yaradılmadı');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.screen}>
      <View style={s.header}>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={s.cancel}>Ləğv et</Text>
        </TouchableOpacity>
        <Text style={s.title}>Yeni qrup</Text>
        <TouchableOpacity onPress={handleCreate} disabled={loading} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          {loading
            ? <ActivityIndicator size="small" color={Colors.gold} />
            : <Text style={[s.create, selectedUids.length === 0 && { opacity: 0.4 }]}>Yarat</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Group name & emoji */}
      <View style={s.nameRow}>
        <TouchableOpacity style={s.emojiBtn} onPress={() => {}}>
          <Text style={{ fontSize: 28 }}>{emoji}</Text>
        </TouchableOpacity>
        <TextInput
          style={s.nameInput}
          placeholder="Qrup adı..."
          placeholderTextColor={Colors.muted}
          value={groupName}
          onChangeText={setGroupName}
          maxLength={50}
        />
      </View>

      {/* Selected users chips */}
      {selectedUsers.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipsRow} contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}>
          {selectedUsers.map(u => (
            <TouchableOpacity key={u.uid} style={s.chip} onPress={() => toggleUser(u.uid)}>
              <Text style={s.chipEmoji}>{u.emoji ?? '🎵'}</Text>
              <Text style={s.chipName}>{u.displayName}</Text>
              <Text style={s.chipRemove}>✕</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Search */}
      <View style={s.searchRow}>
        <TextInput
          style={s.searchInput}
          placeholder="Axtar..."
          placeholderTextColor={Colors.muted}
          value={searchText}
          onChangeText={setSearchText}
          autoCorrect={false}
        />
      </View>

      <Text style={s.sectionLabel}>İştirakçılar ({selectedUids.length} seçildi)</Text>

      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
        {loadingUsers ? (
          <ActivityIndicator color={Colors.gold} style={{ marginTop: 32 }} />
        ) : filteredUsers.length === 0 ? (
          <Text style={s.emptyText}>Nəticə tapılmadı</Text>
        ) : (
          filteredUsers.map(u => {
            const selected = selectedUids.includes(u.uid);
            return (
              <View key={u.uid} style={s.userItem}>
                <TouchableOpacity
                  style={[s.userAva, selected && s.userAvaSelected]}
                  onPress={() => setProfileUser({ id: u.uid, uid: u.uid, name: u.displayName ?? '', emoji: u.emoji ?? '🎵', instrument: u.instrument ?? '', city: u.city ?? '', rating: u.rating ?? 0, reviews: u.reviews ?? 0 })}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 20 }}>{u.emoji ?? '🎵'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ flex: 1 }} onPress={() => toggleUser(u.uid)} activeOpacity={0.8}>
                  <Text style={s.userName}>{u.displayName}</Text>
                  <Text style={s.userSub}>{u.instrument} · {u.city}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => toggleUser(u.uid)} activeOpacity={0.8}>
                  <View style={[s.checkbox, selected && s.checkboxSelected]}>
                    {selected && <Text style={{ color: '#1a0e00', fontSize: 14 }}>✓</Text>}
                  </View>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>
      {profileUser && (
        <MusicianProfileScreen musician={profileUser} onClose={() => setProfileUser(null)} />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: Colors.bg },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title:        { fontFamily: Typography.playfair700, fontSize: 16, color: Colors.text },
  cancel:       { fontSize: 14, color: Colors.muted, fontFamily: Typography.nunito600 },
  create:       { fontSize: 14, color: Colors.gold, fontFamily: Typography.nunito700 },
  nameRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  emojiBtn:     { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.bg3, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  nameInput:    { flex: 1, color: Colors.text, fontSize: 16, fontFamily: Typography.nunito400, borderBottomWidth: 1, borderBottomColor: Colors.border, paddingVertical: 8 },
  chipsRow:     { maxHeight: 52, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  chip:         { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.bg3, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: Colors.border },
  chipEmoji:    { fontSize: 14 },
  chipName:     { fontSize: 12, color: Colors.text, fontFamily: Typography.nunito600, maxWidth: 80 },
  chipRemove:   { fontSize: 10, color: Colors.muted, marginLeft: 2 },
  searchRow:    { paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  searchInput:  { backgroundColor: Colors.bg3, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, color: Colors.text, fontFamily: Typography.nunito400, fontSize: 14 },
  sectionLabel: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, fontSize: 11, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1.2, fontFamily: Typography.nunito700 },
  userItem:     { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  userAva:      { width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.bg3, alignItems: 'center', justifyContent: 'center' },
  userAvaSelected: { borderWidth: 2, borderColor: Colors.gold },
  userName:     { fontFamily: Typography.playfair700, fontSize: 14, color: Colors.text },
  userSub:      { fontSize: 12, color: Colors.muted, fontFamily: Typography.nunito400 },
  checkbox:     { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxSelected: { backgroundColor: Colors.gold, borderColor: Colors.gold },
  emptyText:    { textAlign: 'center', color: Colors.muted, fontFamily: Typography.nunito400, marginTop: 32 },
});
