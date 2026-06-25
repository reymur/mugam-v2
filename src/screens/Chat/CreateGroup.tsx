import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, ActivityIndicator, Alert,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { useAppStore } from '../../store/useAppStore';
import { createGroupChat } from '../../firebase/firestore';
import UserPicker from '../../components/common/UserPicker';

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

  const handleCreate = async () => {
    if (!groupName.trim()) { Alert.alert('', 'Qrup adı daxil edin'); return; }
    if (selectedUids.length === 0) { Alert.alert('', 'Ən az 1 iştirakçı seçin'); return; }
    if (!user?.uid) return;
    setLoading(true);
    try {
      const chatId = await createGroupChat(
        user.uid, user.displayName ?? 'İstifadəçi',
        groupName.trim(), selectedUids, emoji,
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

      <View style={s.nameRow}>
        <TouchableOpacity style={s.emojiBtn}>
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

      <UserPicker
        selectedUids={selectedUids}
        onSelectionChange={(uids) => setSelectedUids(uids)}
        excludeUids={user?.uid ? [user.uid] : []}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen:    { flex: 1, backgroundColor: Colors.bg },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title:     { fontFamily: Typography.playfair700, fontSize: 16, color: Colors.text },
  cancel:    { fontSize: 14, color: Colors.muted, fontFamily: Typography.nunito600 },
  create:    { fontSize: 14, color: Colors.gold, fontFamily: Typography.nunito700 },
  nameRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  emojiBtn:  { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.bg3, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  nameInput: { flex: 1, color: Colors.text, fontSize: 16, fontFamily: Typography.nunito400, borderBottomWidth: 1, borderBottomColor: Colors.border, paddingVertical: 8 },
});
