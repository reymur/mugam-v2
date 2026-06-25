import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { useT } from '../../i18n';
import { useAppStore } from '../../store/useAppStore';
import type { Musician, ChatItem } from '../../store/useAppStore';
import { Image } from 'expo-image';
import DirectChat from './DirectChat';
import CreateGroup from './CreateGroup';
import GroupChat from './GroupChat';

// ── Musician List Item ────────────────────────────────────
const MusicianItem = React.memo(function MusicianItem({
  musician, onPress,
}: { musician: Musician; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.cliItem} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cliAva}>
        <Text style={{ fontSize: 21 }}>{musician.emoji}</Text>
        {musician.online && <View style={styles.cliOnline} />}
      </View>
      <View style={styles.cliInfo}>
        <Text style={styles.cliName} numberOfLines={1}>{musician.name}</Text>
        <Text style={styles.cliPreview} numberOfLines={1}>{musician.instrument} · {musician.city}</Text>
      </View>
    </TouchableOpacity>
  );
});

// ── Group List Item ───────────────────────────────────────
const GroupItem = React.memo(function GroupItem({
  chat, onPress,
}: { chat: ChatItem; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.cliItem} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.cliAva, { borderRadius: 14 }]}>
        {chat.photoURL
          ? <Image source={{ uri: chat.photoURL }} style={[StyleSheet.absoluteFill, { borderRadius: 14 }]} />
          : <Text style={{ fontSize: 21 }}>{chat.emoji}</Text>
        }
      </View>
      <View style={styles.cliInfo}>
        <Text style={styles.cliName} numberOfLines={1}>{chat.name}</Text>
        <Text style={styles.cliPreview} numberOfLines={1}>{chat.preview || 'Qrup çatı'}</Text>
      </View>
      {(chat.unread ?? 0) > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{chat.unread}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

// ── Chats Screen ──────────────────────────────────────────
export default function ChatsScreen() {
  const { t } = useT();
  const musicians = useAppStore(s => s.musicians);
  const chats = useAppStore(s => s.chats);
  const user = useAppStore(s => s.user);

  const pendingGroupChatId = useAppStore(s => s.pendingGroupChatId);
  const setPendingGroupChatId = useAppStore(s => s.setPendingGroupChatId);
  const removedFromGroup = useAppStore(s => s.removedFromGroup);
  const setRemovedFromGroup = useAppStore(s => s.setRemovedFromGroup);

  const [activeMusician, setActiveMusician] = useState<Musician | null>(null);
  const [activeGroup, setActiveGroup] = useState<ChatItem | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  const filteredMusicians = musicians.filter(m => (m.uid ?? m.id) !== user?.uid);
  const groups = chats.filter(c => c.isGroup);

  useEffect(() => {
    if (!pendingGroupChatId) return;
    const chat = chats.find(c => c.id === pendingGroupChatId);
    if (chat && chat.members?.includes(user?.uid ?? '')) {
      setActiveGroup(chat);
      setPendingGroupChatId(null);
    } else if (!chat) {
      // chat not found yet, keep waiting
    } else {
      // user not in members — close any open chat and clear
      setActiveGroup(null);
      setPendingGroupChatId(null);
    }
  }, [pendingGroupChatId, chats]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.topRow}>
        <Text style={styles.screenTitle}>{t('chatsTitle')}</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setShowCreateGroup(true)}
        >
          <Text style={{ fontSize: 20, color: Colors.gold }}>＋</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {groups.length > 0 && (
          <>
            <Text style={styles.sectionLbl}>Qruplar</Text>
            {groups.map(c => (
              <GroupItem key={c.id} chat={c} onPress={() => setActiveGroup(c)} />
            ))}
          </>
        )}

        <Text style={styles.sectionLbl}>Musiqiçilər</Text>
        {filteredMusicians.length === 0 && (
          <Text style={styles.emptyText}>Musiqiçi tapılmadı</Text>
        )}
        {filteredMusicians.map(m => (
          <MusicianItem key={m.uid ?? m.id} musician={m} onPress={() => setActiveMusician(m)} />
        ))}
      </ScrollView>

      {activeMusician && (
        <DirectChat musician={activeMusician} onClose={() => setActiveMusician(null)} />
      )}

      {activeGroup && (
        <GroupChat chat={activeGroup} onClose={() => setActiveGroup(null)} />
      )}

      <Modal visible={!!removedFromGroup} transparent animationType="fade">
        <View style={styles.removedOverlay}>
          <View style={styles.removedModal}>
            <Text style={styles.removedTitle}>Qrupdan çıxarıldınız</Text>
            <Text style={styles.removedText}>
              {removedFromGroup?.removedByName
                ? `${removedFromGroup.removedByName} sizi ${removedFromGroup.chatName} qrupundan çıxardı`
                : `Siz ${removedFromGroup?.chatName} qrupundan çıxarıldınız`
              }
            </Text>
            <TouchableOpacity style={styles.removedBtn} onPress={() => setRemovedFromGroup(null)}>
              <Text style={styles.removedBtnText}>Bağla</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showCreateGroup} animationType="slide" presentationStyle="pageSheet">
        <CreateGroup
          onClose={() => setShowCreateGroup(false)}
          onCreated={() => setShowCreateGroup(false)}
        />
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen:      { flex: 1, backgroundColor: Colors.bg },
  topRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingTop: 16, paddingBottom: 10 },
  screenTitle: { fontFamily: Typography.playfair700, fontSize: 18, color: Colors.text },
  addBtn:      { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  sectionLbl:  { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4, fontSize: 11, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1.2, fontFamily: Typography.nunito700 },
  emptyText:   { textAlign: 'center', color: Colors.muted, fontSize: 13, marginTop: 40, fontFamily: Typography.nunito400 },
  cliItem:     { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  cliAva:      { width: 50, height: 50, borderRadius: 25, backgroundColor: Colors.bg3, alignItems: 'center', justifyContent: 'center', position: 'relative', flexShrink: 0 },
  cliOnline:   { position: 'absolute', bottom: 1, right: 1, width: 12, height: 12, backgroundColor: Colors.green, borderRadius: 6, borderWidth: 2, borderColor: Colors.bg },
  cliInfo:     { flex: 1, minWidth: 0 },
  cliName:     { fontFamily: Typography.playfair700, fontSize: 14, color: Colors.text, marginBottom: 3 },
  cliPreview:  { fontSize: 12, color: Colors.muted, fontFamily: Typography.nunito400 },
  badge:       { backgroundColor: Colors.gold, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, minWidth: 20, alignItems: 'center' },
  badgeText:   { color: '#1a0e00', fontSize: 11, fontFamily: Typography.nunito700 },
  removedOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  removedModal:   { backgroundColor: Colors.card, borderRadius: 16, padding: 24, marginHorizontal: 32, borderWidth: 1, borderColor: Colors.border },
  removedTitle:   { fontFamily: Typography.playfair700, fontSize: 16, color: Colors.text, marginBottom: 10, textAlign: 'center' },
  removedText:    { fontFamily: Typography.nunito400, fontSize: 14, color: Colors.muted, marginBottom: 20, textAlign: 'center', lineHeight: 20 },
  removedBtn:     { backgroundColor: Colors.gold, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  removedBtnText: { color: '#1a0e00', fontFamily: Typography.nunito700, fontSize: 14 },
});
