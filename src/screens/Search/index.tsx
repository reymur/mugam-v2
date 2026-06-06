import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  StyleSheet, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors }     from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { useT }       from '../../i18n';
import { useAppStore } from '../../store/useAppStore';
import type { Musician } from '../../store/useAppStore';
import Topbar from '../../components/common/Topbar';
import MusicianProfileScreen from '../Musician/MusicianProfileScreen';

const FILTERS = [
  { key: 'filterAll',     value: '' },
  { key: 'filterKaman',   value: 'Kaman' },
  { key: 'filterSinger',  value: 'Müğənni' },
  { key: 'filterGarmon',  value: 'Qarmon' },
  { key: 'filterTar',     value: 'Tar' },
  { key: 'filterBalaban', value: 'Balaban' },
  { key: 'filterZerb',    value: 'Zərb' },
  { key: 'filterGuitar',  value: 'Gitara' },
  { key: 'filterPiano',   value: 'Fortepiano' },
  { key: 'filterBaku',    value: 'Bakı' },
  { key: 'filterGence',   value: 'Gəncə' },
] as const;

function MusicianListItem({
  musician,
  onPress,
  invited,
  onToggleInvite,
}: {
  musician: Musician;
  onPress: () => void;
  invited: boolean;
  onToggleInvite: () => void;
}) {
  const { t }         = useT();
  const { showToast } = useAppStore();

  const handleInvite = useCallback(() => {
    onToggleInvite();
    showToast(invited
      ? `❌ ${musician.name} — dəvət ləğv edildi`
      : `✅ ${musician.name} — dəvət göndərildi!`
    );
  }, [invited, musician.name, onToggleInvite, showToast]);

  return (
    <TouchableOpacity style={s.mliItem} onPress={onPress} activeOpacity={0.8}>
      <View style={[s.mliAva, musician.online && s.mliAvaOnline]}>
        <Text style={{ fontSize: 22 }}>{musician.emoji}</Text>
        {musician.online && <View style={s.mliOnlineDot} />}
      </View>
      <View style={s.mliInfo}>
        <Text style={s.mliName}>{musician.name}</Text>
        <Text style={s.mliRole}>{musician.instrument}</Text>
        <Text style={s.mliLoc}>📍 {musician.city}</Text>
      </View>
      <View style={s.mliActions}>
        <Text style={s.mliRate}>{'★'.repeat(musician.rating)}</Text>
        <TouchableOpacity
          style={[s.mliHireBtn, invited && s.mliHireBtnCancel]}
          onPress={handleInvite}
        >
          <Text style={[s.mliHireTxt, invited && s.mliHireTxtCancel]}>
            {invited ? '❌' : t('hireBtn')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.mliMsgBtn} onPress={onPress}>
          <Text style={s.mliMsgTxt}>👤</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function SearchScreen() {
  const { t }      = useT();
  const allMusicians = useAppStore(st => st.musicians);
  const currentUser  = useAppStore(st => st.user);

  // Don't show current user's own card
  const musicians = allMusicians.filter(m => m.uid !== currentUser?.uid && m.id !== currentUser?.uid);
  const [query,         setQuery]         = useState('');
  const [activeFilter,  setActiveFilter]  = useState('');
  const [selectedMusician, setSelectedMusician] = useState<Musician | null>(null);
  const invitedMusicianIds = useAppStore(st => st.invitedMusicianIds);
  const storeSendInvite    = useAppStore(st => st.sendInvite);
  const storeCancelInvite  = useAppStore(st => st.cancelInvite);

  const filtered = musicians.filter(m => {
    const q = query.toLowerCase();
    const matchQuery  = !q || m.name.toLowerCase().includes(q) || m.instrument.toLowerCase().includes(q) || m.city.toLowerCase().includes(q);
    const matchFilter = !activeFilter || m.instrument.includes(activeFilter) || m.city.includes(activeFilter);
    return matchQuery && matchFilter;
  });

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <Topbar showLogo={false} title={t('navAxtar')} />

      <View style={s.searchWrap}>
        <TextInput
          style={s.searchField}
          placeholder={t('searchPlaceholder')}
          placeholderTextColor={Colors.muted}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={m => m.id}
        contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={FILTERS}
            keyExtractor={f => f.key}
            contentContainerStyle={{ gap: 8, paddingBottom: 12 }}
            renderItem={({ item: f }) => (
              <TouchableOpacity
                style={[s.ftag, activeFilter === f.value && s.ftagActive]}
                onPress={() => setActiveFilter(f.value)}
              >
                <Text style={[s.ftagText, activeFilter === f.value && s.ftagTextActive]}>
                  {t(f.key as Parameters<typeof t>[0])}
                </Text>
              </TouchableOpacity>
            )}
          />
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>🔍</Text>
            <Text style={s.emptyText}>Heç nə tapılmadı</Text>
          </View>
        }
        renderItem={({ item }) => (
          <MusicianListItem
            musician={item}
            onPress={() => setSelectedMusician(item)}
            invited={invitedMusicianIds.has(item.uid ?? item.id)}
            onToggleInvite={() => { const id = item.uid ?? item.id; invitedMusicianIds.has(id) ? storeCancelInvite(id) : storeSendInvite(item); }}
          />
        )}
      />

      {selectedMusician && (
        <MusicianProfileScreen
          musician={selectedMusician}
          onClose={() => setSelectedMusician(null)}

        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen:      { flex: 1, backgroundColor: Colors.bg },
  searchWrap:  { paddingHorizontal: 14, paddingBottom: 8 },
  searchField: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, color: Colors.text, fontSize: 14, fontFamily: Typography.nunito400 },
  ftag:        { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: Colors.border },
  ftagActive:  { backgroundColor: Colors.gold, borderColor: Colors.gold },
  ftagText:    { color: Colors.muted, fontSize: 12, fontFamily: Typography.nunito700 },
  ftagTextActive: { color: '#1a0e00' },
  mliItem:     { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  mliAva:      { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.bg3, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.border, flexShrink: 0 },
  mliAvaOnline:{ borderColor: Colors.green },
  mliOnlineDot:{ position: 'absolute', bottom: 1, right: 1, width: 12, height: 12, backgroundColor: Colors.green, borderRadius: 6, borderWidth: 2, borderColor: Colors.bg },
  mliInfo:     { flex: 1, minWidth: 0 },
  mliName:     { fontFamily: Typography.playfair700, fontSize: 15, color: Colors.text, marginBottom: 2 },
  mliRole:     { fontSize: 12, color: Colors.gold, fontFamily: Typography.nunito700, marginBottom: 2 },
  mliLoc:      { fontSize: 11, color: Colors.muted, fontFamily: Typography.nunito400 },
  mliActions:  { alignItems: 'flex-end', gap: 6, flexShrink: 0 },
  mliRate:     { fontSize: 12, color: Colors.gold },
  mliHireBtn:  { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: Colors.gold },
  mliHireBtnCancel: { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.red },
  mliHireTxt:  { color: '#1a0e00', fontSize: 11, fontFamily: Typography.nunito700 },
  mliHireTxtCancel: { color: Colors.red },
  mliMsgBtn:   { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: Colors.border },
  mliMsgTxt:   { fontSize: 13 },
  empty:       { alignItems: 'center', marginTop: 60, gap: 12 },
  emptyEmoji:  { fontSize: 40 },
  emptyText:   { color: Colors.muted, fontSize: 14, fontFamily: Typography.nunito400 },
});
