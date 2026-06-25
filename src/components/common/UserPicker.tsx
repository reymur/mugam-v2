import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { fetchAllUsers } from '../../firebase/firestore';
import type { UserProfile } from '../../types';
import type { Musician } from '../../store/useAppStore';
import MusicianProfileScreen from '../../screens/Musician/MusicianProfileScreen';

interface UserPickerProps {
  selectedUids:      string[];
  onSelectionChange: (uids: string[], users: UserProfile[]) => void;
  excludeUids?:      string[];
  users?:            UserProfile[];
}

export default function UserPicker({
  selectedUids,
  onSelectionChange,
  excludeUids = [],
  users,
}: UserPickerProps) {
  const [allUsers, setAllUsers]       = useState<UserProfile[]>(users ?? []);
  const [searchText, setSearchText]   = useState('');
  const [loading, setLoading]         = useState(!users);
  const [profileUser, setProfileUser] = useState<Musician | null>(null);

  useEffect(() => {
    if (users) { setAllUsers(users); return; }
    fetchAllUsers()
      .then(u => setAllUsers(u.filter(x => !excludeUids.includes(x.uid))))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredUsers = searchText.trim()
    ? allUsers.filter(u =>
        u.displayName?.toLowerCase().includes(searchText.toLowerCase()) ||
        u.instrument?.toLowerCase().includes(searchText.toLowerCase()) ||
        u.city?.toLowerCase().includes(searchText.toLowerCase())
      )
    : allUsers;

  const selectedUsers = allUsers.filter(u => selectedUids.includes(u.uid));

  const toggleUser = useCallback((uid: string) => {
    const newUids = selectedUids.includes(uid)
      ? selectedUids.filter(u => u !== uid)
      : [...selectedUids, uid];
    const newUsers = allUsers.filter(u => newUids.includes(u.uid));
    onSelectionChange(newUids, newUsers);
  }, [selectedUids, allUsers, onSelectionChange]);

  const openProfile = (u: UserProfile) => {
    setProfileUser({
      id: u.uid, uid: u.uid,
      name: u.displayName ?? '',
      emoji: u.emoji ?? '🎵',
      instrument: u.instrument ?? '',
      city: u.city ?? '',
      rating: u.rating ?? 0,
      reviews: u.reviews ?? 0,
    });
  };

  return (
    <View style={{ flex: 1 }}>
      {selectedUsers.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipsRow} contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}>
          {selectedUsers.map(u => (
            <TouchableOpacity key={u.uid} style={s.chip} onPress={() => toggleUser(u.uid)}>
              <Text style={s.chipEmoji}>{u.emoji ?? '🎵'}</Text>
              <Text style={s.chipName} numberOfLines={1}>{u.displayName}</Text>
              <Text style={s.chipRemove}>✕</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <View style={s.searchRow}>
        <TextInput
          style={s.searchInput}
          placeholder="Axtar..."
          placeholderTextColor={Colors.muted}
          value={searchText}
          onChangeText={setSearchText}
          autoCorrect={false}
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText('')} style={s.clearBtn}>
            <Text style={{ color: Colors.muted, fontSize: 16 }}>×</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={s.sectionLabel}>İştirakçılar ({selectedUids.length} seçildi)</Text>

      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
        {loading ? (
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
                  onPress={() => openProfile(u)}
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
    </View>
  );
}

const s = StyleSheet.create({
  chipsRow:         { maxHeight: 52, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  chip:             { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.bg3, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: Colors.border },
  chipEmoji:        { fontSize: 14 },
  chipName:         { fontSize: 12, color: Colors.text, fontFamily: Typography.nunito600, maxWidth: 80 },
  chipRemove:       { fontSize: 10, color: Colors.muted, marginLeft: 2 },
  searchRow:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  searchInput:      { flex: 1, backgroundColor: Colors.bg3, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, color: Colors.text, fontFamily: Typography.nunito400, fontSize: 14 },
  clearBtn:         { paddingHorizontal: 8 },
  sectionLabel:     { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, fontSize: 11, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1.2, fontFamily: Typography.nunito700 },
  userItem:         { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  userAva:          { width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.bg3, alignItems: 'center', justifyContent: 'center' },
  userAvaSelected:  { borderWidth: 2, borderColor: Colors.gold },
  userName:         { fontFamily: Typography.playfair700, fontSize: 14, color: Colors.text },
  userSub:          { fontSize: 12, color: Colors.muted, fontFamily: Typography.nunito400 },
  checkbox:         { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxSelected: { backgroundColor: Colors.gold, borderColor: Colors.gold },
  emptyText:        { textAlign: 'center', color: Colors.muted, fontFamily: Typography.nunito400, marginTop: 32 },
});
