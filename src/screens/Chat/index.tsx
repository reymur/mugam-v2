import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { useT } from '../../i18n';
import { useAppStore } from '../../store/useAppStore';
import type { Musician } from '../../store/useAppStore';
import DirectChat from './DirectChat';

// ── Musician List Item ────────────────────────────────────
const MusicianItem = React.memo(function MusicianItem({
  musician,
  onPress,
}: {
  musician: Musician;
  onPress: () => void;
}) {
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
      <View style={styles.cliMeta}>
        <Text style={styles.cliTime}>{'⭐'.repeat(Math.round(musician.rating ?? 0))}</Text>
      </View>
    </TouchableOpacity>
  );
});

// ── Chats Screen ──────────────────────────────────────────
export default function ChatsScreen() {
  const { t } = useT();
  const musicians = useAppStore(s => s.musicians);
  const user = useAppStore(s => s.user);

  const [activeMusician, setActiveMusician] = useState<Musician | null>(null);

  const openChat = useCallback((musician: Musician) => setActiveMusician(musician), []);
  const closeChat = useCallback(() => setActiveMusician(null), []);

  // Filter out current user from list
  const filteredMusicians = musicians.filter(
    m => (m.uid ?? m.id) !== user?.uid
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.topRow}>
        <Text style={styles.screenTitle}>{t('chatsTitle')}</Text>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLbl}>Musiqiçilər</Text>
        {filteredMusicians.length === 0 && (
          <Text style={styles.emptyText}>Musiqiçi tapılmadı</Text>
        )}
        {filteredMusicians.map(m => (
          <MusicianItem key={m.uid ?? m.id} musician={m} onPress={() => openChat(m)} />
        ))}
      </ScrollView>

      {activeMusician && (
        <DirectChat
          musician={activeMusician}
          onClose={closeChat}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  topRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 18,
    paddingTop: 16, paddingBottom: 10,
  },
  screenTitle: { fontFamily: Typography.playfair700, fontSize: 18, color: Colors.text },
  sectionLbl: {
    paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4,
    fontSize: 11, color: Colors.muted,
    textTransform: 'uppercase', letterSpacing: 1.2,
    fontFamily: Typography.nunito700,
  },
  emptyText: {
    textAlign: 'center', color: Colors.muted,
    fontSize: 13, marginTop: 40, fontFamily: Typography.nunito400,
  },
  cliItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  cliAva: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: Colors.bg3,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative', flexShrink: 0,
  },
  cliOnline: {
    position: 'absolute', bottom: 1, right: 1,
    width: 12, height: 12, backgroundColor: Colors.green,
    borderRadius: 6, borderWidth: 2, borderColor: Colors.bg,
  },
  cliInfo: { flex: 1, minWidth: 0 },
  cliName: { fontFamily: Typography.playfair700, fontSize: 14, color: Colors.text, marginBottom: 3 },
  cliPreview: { fontSize: 12, color: Colors.muted, fontFamily: Typography.nunito400 },
  cliMeta: { alignItems: 'flex-end', gap: 5, flexShrink: 0 },
  cliTime: { fontSize: 11, color: Colors.muted, fontFamily: Typography.nunito400 },
});
