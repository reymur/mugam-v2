import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, ActivityIndicator, Alert,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { useAppStore } from '../../store/useAppStore';
import { createGroupChat } from '../../firebase/firestore';

interface Props {
  onClose: () => void;
  onCreated: (chatId: string) => void;
}

export default function CreateGroup({ onClose, onCreated }: Props) {
  const { user, musicians } = useAppStore();
  const [groupName, setGroupName] = useState('');
  const [emoji, setEmoji] = useState('👥');
  const [selectedUids, setSelectedUids] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // All users except current user and guests
  const allUsers = useAppStore(s => s.musicians).filter(
    m => (m.uid ?? m.id) !== user?.uid
  );

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
            : <Text style={s.create}>Yarat</Text>
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

      <Text style={s.sectionLabel}>İştirakçılar ({selectedUids.length} seçildi)</Text>

      <ScrollView style={{ flex: 1 }}>
        {allUsers.map(m => {
          const uid = m.uid ?? m.id;
          const selected = selectedUids.includes(uid);
          return (
            <TouchableOpacity
              key={uid}
              style={s.userItem}
              onPress={() => toggleUser(uid)}
              activeOpacity={0.8}
            >
              <View style={[s.userAva, selected && s.userAvaSelected]}>
                <Text style={{ fontSize: 20 }}>{m.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.userName}>{m.name}</Text>
                <Text style={s.userSub}>{m.instrument} · {m.city}</Text>
              </View>
              <View style={[s.checkbox, selected && s.checkboxSelected]}>
                {selected && <Text style={{ color: '#1a0e00', fontSize: 14 }}>✓</Text>}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen:      { flex: 1, backgroundColor: Colors.bg },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title:       { fontFamily: Typography.playfair700, fontSize: 16, color: Colors.text },
  cancel:      { fontSize: 14, color: Colors.muted, fontFamily: Typography.nunito600 },
  create:      { fontSize: 14, color: Colors.gold, fontFamily: Typography.nunito700 },
  nameRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  emojiBtn:    { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.bg3, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  nameInput:   { flex: 1, color: Colors.text, fontSize: 16, fontFamily: Typography.nunito400, borderBottomWidth: 1, borderBottomColor: Colors.border, paddingVertical: 8 },
  sectionLabel:{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, fontSize: 11, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1.2, fontFamily: Typography.nunito700 },
  userItem:    { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  userAva:     { width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.bg3, alignItems: 'center', justifyContent: 'center' },
  userAvaSelected: { borderWidth: 2, borderColor: Colors.gold },
  userName:    { fontFamily: Typography.playfair700, fontSize: 14, color: Colors.text },
  userSub:     { fontSize: 12, color: Colors.muted, fontFamily: Typography.nunito400 },
  checkbox:    { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxSelected: { backgroundColor: Colors.gold, borderColor: Colors.gold },
});
