import React, { useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  TextInput, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors }     from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { useAppStore } from '../../store/useAppStore';
import type { Musician } from '../../store/useAppStore';
import MusicianProfileScreen from '../Musician/MusicianProfileScreen';

function MusicianListItem({
  musician,
  onPress,
  agreementCount,
}: {
  musician: Musician;
  onPress: () => void;
  agreementCount: number;
}) {
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
        {agreementCount > 0 && (
          <View style={s.mliAgreementBadge}>
            <Text style={{ fontSize: 12 }}>🤝</Text>
            <Text style={s.mliAgreementText}>{agreementCount}</Text>
          </View>
        )}
        <TouchableOpacity style={s.mliMsgBtn} onPress={onPress}>
          <Text style={s.mliMsgTxt}>👤</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function SearchScreen() {
  const st           = useAppStore();
  const allMusicians = st.musicians;
  const currentUser  = st.user;
  const agreements   = st.agreements;
  const lang         = st.lang;

  const az_trans = require('../../i18n/az').default;
  const ru_trans = require('../../i18n/ru').default;
  const t = (key: string) => (lang === 'ru' ? ru_trans : az_trans)[key] ?? az_trans[key] ?? key;

  const musicians = allMusicians.filter(m =>
    m.uid !== currentUser?.uid && m.id !== currentUser?.uid
  );

  const [query,            setQuery]            = useState('');
  const [activeFilter,     setActiveFilter]      = useState('');
  const [selectedMusician, setSelectedMusician]  = useState<Musician | null>(null);

  const agreementCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    agreements.forEach(a => {
      map[a.fromUid] = (map[a.fromUid] ?? 0) + 1;
      map[a.toUid]   = (map[a.toUid]   ?? 0) + 1;
    });
    return map;
  }, [agreements]);

  const FILTERS = ['🎻 Kaman','🎤 Müğənni','🪗 Qarmon','🎵 Tar','🎷 Balaban','🥁 Zərb','🎸 Gitara','🎹 Piano','🎺 Zurna'];

  const filtered = musicians.filter(m => {
    const q = query.toLowerCase();
    const matchQ = !q || m.name.toLowerCase().includes(q) || m.instrument?.toLowerCase().includes(q) || m.city?.toLowerCase().includes(q);
    const matchF = !activeFilter || m.instrument === activeFilter;
    return matchQ && matchF;
  });

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      {/* Search bar */}
      <View style={s.searchRow}>
        <View style={s.searchBox}>
          <Text style={s.searchIcon}>🔍</Text>
          <TextInput
            style={s.searchInput}
            placeholder={t('searchPlaceholder')}
            placeholderTextColor={Colors.muted}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} style={s.clearBtn}>
              <Text style={{ color: Colors.muted, fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter chips */}
      <View style={s.filtersRow}>
        <TouchableOpacity
          style={[s.filterChip, !activeFilter && s.filterChipActive]}
          onPress={() => setActiveFilter('')}
        >
          <Text style={[s.filterChipText, !activeFilter && s.filterChipTextActive]}>
            {t('filterAll')}
          </Text>
        </TouchableOpacity>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[s.filterChip, activeFilter === f && s.filterChipActive]}
            onPress={() => setActiveFilter(activeFilter === f ? '' : f)}
          >
            <Text style={[s.filterChipText, activeFilter === f && s.filterChipTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Results count */}
      <Text style={s.resultCount}>
        {filtered.length} {t('searchResults')}
      </Text>

      <ScrollView
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {filtered.length === 0 ? (
          <View style={s.emptyWrap}>
            <Text style={s.emptyText}>Heç nə tapılmadı</Text>
          </View>
        ) : (
          filtered.map(item => (
            <MusicianListItem
              key={item.id}
              musician={item}
              onPress={() => setSelectedMusician(item)}
              agreementCount={agreementCountMap[item.uid ?? item.id] ?? 0}
            />
          ))
        )}
      </ScrollView>

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
  searchRow:   { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 8 },
  searchBox:   { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 14, paddingHorizontal: 12, height: 46 },
  searchIcon:  { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, color: Colors.text, fontSize: 15, fontFamily: Typography.nunito400 },
  clearBtn:    { padding: 4 },
  filtersRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 14, paddingBottom: 10 },
  filterChip:  { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: Colors.bg3, borderWidth: 1, borderColor: Colors.border },
  filterChipActive: { backgroundColor: 'rgba(212,160,60,0.15)', borderColor: Colors.gold },
  filterChipText:   { color: Colors.muted, fontSize: 12, fontFamily: Typography.nunito700 },
  filterChipTextActive: { color: Colors.gold },
  resultCount: { paddingHorizontal: 14, paddingBottom: 6, fontSize: 12, color: Colors.muted, fontFamily: Typography.nunito400 },
  listContent: { paddingHorizontal: 14, paddingBottom: 20 },
  emptyWrap:   { alignItems: 'center', paddingTop: 40 },
  emptyText:   { color: Colors.muted, fontSize: 14, fontFamily: Typography.nunito400 },
  mliItem:     { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  mliAva:      { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.bg3, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border, position: 'relative' },
  mliAvaOnline:{ borderColor: Colors.green },
  mliOnlineDot:{ position: 'absolute', bottom: 1, right: 1, width: 12, height: 12, backgroundColor: Colors.green, borderRadius: 6, borderWidth: 2, borderColor: Colors.bg },
  mliInfo:     { flex: 1 },
  mliName:     { fontFamily: Typography.playfair700, fontSize: 15, color: Colors.text, marginBottom: 2 },
  mliRole:     { fontSize: 12, color: Colors.gold, fontFamily: Typography.nunito600, marginBottom: 1 },
  mliLoc:      { fontSize: 11, color: Colors.muted, fontFamily: Typography.nunito400 },
  mliActions:  { alignItems: 'center', gap: 6 },
  mliRate:     { fontSize: 11, color: Colors.gold, fontFamily: Typography.nunito400 },
  mliMsgBtn:   { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: Colors.border },
  mliMsgTxt:   { fontSize: 14 },
  mliAgreementBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: Colors.gold, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  mliAgreementText:  { fontSize: 10, color: '#1a0e00', fontFamily: Typography.nunito700 },
  mliHireBtnAccepted: { backgroundColor: 'rgba(39,174,96,0.15)', borderWidth: 1, borderColor: Colors.green },
  mliHireTxtAccepted: { color: Colors.green },
});
