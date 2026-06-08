import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors }     from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { useT }       from '../../i18n';
import { useAppStore } from '../../store/useAppStore';
import type { Musician, Event, Room } from '../../store/useAppStore';
import Topbar from '../../components/common/Topbar';
import MusicianProfileScreen from '../Musician/MusicianProfileScreen';

// ── Hero Banner ───────────────────────────────────────────
function HeroBanner() {
  const { t } = useT();
  return (
    <View style={s.hero}>
      <View style={s.heroHighlight} />
      <Text style={s.heroTag}>{t('heroTag')}</Text>
      <Text style={s.heroTitle}>{t('heroTitle')}</Text>
      <Text style={s.heroDesc}>{t('heroDesc')}</Text>
      <Text style={s.heroOrnament}>♦ ◆ ♦ ◆ ♦</Text>
      <View style={s.heroActions}>
        <TouchableOpacity style={s.btnGold}>
          <Text style={s.btnGoldText}>{t('heroBtnTicket')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.btnOutline}>
          <Text style={s.btnOutlineText}>{t('heroBtnMore')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Musician Card ─────────────────────────────────────────
const MusicianCard = React.memo(function MusicianCard({
  musician,
  onPress,
  invited,
  accepted,
  onToggleInvite,
}: {
  musician: Musician;
  onPress: () => void;
  invited: boolean;
  accepted: boolean;
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
    <TouchableOpacity
      style={[s.musCard, musician.goldRing && s.musCardGold]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {musician.available && <View style={s.availableDot} />}
      <View style={[s.musAva, musician.goldRing && s.musAvaGold]}>
        <Text style={{ fontSize: 26 }}>{musician.emoji}</Text>
      </View>
      <Text style={s.musName} numberOfLines={1}>{musician.name}</Text>
      <Text style={s.musInstrument}>{musician.instrument}</Text>
      <Text style={s.musCity}>{musician.city}</Text>
      <Text style={s.musRate}>
        {'★'.repeat(musician.rating)}{'☆'.repeat(5 - musician.rating)} ({musician.reviews})
      </Text>

    </TouchableOpacity>
  );
});

// ── Event Card ────────────────────────────────────────────
const EventCard = React.memo(function EventCard({ event }: { event: Event }) {
  return (
    <TouchableOpacity style={s.eventCard} activeOpacity={0.8}>
      <View style={s.eventDateBox}>
        <Text style={s.eventDay}>{event.day}</Text>
        <Text style={s.eventMon}>{event.month}</Text>
      </View>
      <View style={s.eventInfo}>
        <Text style={s.eventTitle} numberOfLines={2}>{event.title}</Text>
        <Text style={s.eventLoc}>{event.location}</Text>
        <View style={s.eventTags}>
          {event.tags.map((tag, i) => (
            <View
              key={`${event.id}-tag-${i}`}
              style={[s.etag, i === 1 ? s.etagGreen : s.etagGold]}
            >
              <Text style={[s.etagText, { color: i === 1 ? Colors.green : Colors.gold }]}>{tag}</Text>
            </View>
          ))}
        </View>
        {event.spots ? <Text style={s.eventSpots}>{event.spots}</Text> : null}
      </View>
    </TouchableOpacity>
  );
});

// ── Room Card ─────────────────────────────────────────────
const RoomCard = React.memo(function RoomCard({ room }: { room: Room }) {
  return (
    <TouchableOpacity style={s.roomCard} activeOpacity={0.8}>
      <View style={s.roomHeader}>
        <View style={s.roomIcon}><Text style={{ fontSize: 20 }}>{room.emoji}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={s.roomName}>{room.name}</Text>
          <Text style={s.roomMembers}>{room.members}</Text>
        </View>
        {room.live && (
          <View style={s.roomLive}>
            <View style={s.liveDot} />
            <Text style={s.liveText}>Canlı</Text>
          </View>
        )}
      </View>
      <Text style={s.roomPreview} numberOfLines={2}>{room.preview}</Text>
      <View style={s.roomAvatars}>
        {(room.avatars ?? []).slice(0, 4).map((av, i) => (
          <View key={`${room.id}-ava-${i}`} style={[s.roomAvaSmall, { marginLeft: i === 0 ? 0 : -6 }]}>
            <Text style={{ fontSize: 12 }}>{av}</Text>
          </View>
        ))}
        {room.avatars && room.avatars.length > 4 && (
          <Text style={s.roomMore}>+{room.avatars.length - 4}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
});

function SectionHeader({ title, link }: { title: string; link?: string }) {
  return (
    <View style={s.secHdr}>
      <Text style={s.secTitle}>{title}</Text>
      {link && <Text style={s.secLink}>{link} →</Text>}
    </View>
  );
}

function Ornament() {
  return <Text style={s.ornament}>♦ ◆ ♦ ◆ ♦</Text>;
}

// ── Home Screen ───────────────────────────────────────────
export default function HomeScreen() {
  const { t }      = useT();
  const allMusicians = useAppStore(st => st.musicians);
  const currentUser  = useAppStore(st => st.user);
  const events       = useAppStore(st => st.events);
  const rooms        = useAppStore(st => st.rooms);

  // Don't show current user's own card
  const musicians = allMusicians.filter(m => m.uid !== currentUser?.uid && m.id !== currentUser?.uid);

  // Selected musician for profile view
  const [selectedMusician, setSelectedMusician] = useState<Musician | null>(null);
  // Use store invites — synced with Firestore
  const invitedMusicianIds  = useAppStore(st => st.invitedMusicianIds);
  const acceptedMusicianIds = useAppStore(st => st.acceptedMusicianIds);
  const storeSendInvite     = useAppStore(st => st.sendInvite);
  const storeCancelInvite   = useAppStore(st => st.cancelInvite);

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <Topbar />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <HeroBanner />
        <Ornament />

        <SectionHeader title={t('secMusicians')} link={t('secSeeAll')} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -14 }}
          contentContainerStyle={{ paddingHorizontal: 14, gap: 12, paddingBottom: 4 }}
        >
          {musicians.map(m => (
            <MusicianCard
              key={m.id}
              musician={m}
              onPress={() => setSelectedMusician(m)}
              invited={invitedMusicianIds.has(m.uid ?? m.id)}
              accepted={acceptedMusicianIds.has(m.uid ?? m.id)}
              onToggleInvite={() => { const id = m.uid ?? m.id; invitedMusicianIds.has(id) ? storeCancelInvite(id) : storeSendInvite(m); }}
            />
          ))}
        </ScrollView>

        <Ornament />

        <SectionHeader title={t('secEvents')} link={t('secSeeAll')} />
        {events.map(e => <EventCard key={e.id} event={e} />)}

        <Ornament />

        <SectionHeader title={t('secRooms')} link={t('secSeeAll')} />
        {rooms.map(r => <RoomCard key={r.id} room={r} />)}
      </ScrollView>

      {/* Musician profile overlay */}
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
  screen: { flex: 1, backgroundColor: Colors.bg },
  hero: { marginVertical: 8, backgroundColor: '#1c1408', borderWidth: 1, borderColor: Colors.border, borderRadius: 20, padding: 20, overflow: 'hidden' },
  heroHighlight: { position: 'absolute', top: 0, right: 0, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(212,160,60,0.12)' },
  heroTag: { fontSize: 11, color: Colors.gold, letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: Typography.nunito700, marginBottom: 8 },
  heroTitle: { fontFamily: Typography.playfair700, fontSize: 22, color: Colors.text, lineHeight: 30, marginBottom: 8 },
  heroDesc: { fontSize: 13, color: Colors.muted, lineHeight: 20, marginBottom: 8, fontFamily: Typography.nunito400 },
  heroOrnament: { color: Colors.gold, opacity: 0.4, letterSpacing: 4, marginBottom: 4, fontSize: 14 },
  heroActions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  btnGold: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 24, backgroundColor: Colors.gold },
  btnGoldText: { color: '#1a0e00', fontSize: 13, fontFamily: Typography.nunito700 },
  btnOutline: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 24, borderWidth: 1, borderColor: Colors.border },
  btnOutlineText: { color: Colors.text, fontSize: 13, fontFamily: Typography.nunito700 },
  ornament: { textAlign: 'center', color: Colors.gold, opacity: 0.4, fontSize: 16, letterSpacing: 4, marginVertical: 10 },
  secHdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, marginBottom: 12 },
  secTitle: { fontFamily: Typography.playfair700, fontSize: 18, color: Colors.text },
  secLink: { fontSize: 12, color: Colors.gold, fontFamily: Typography.nunito700 },
  musCard: { width: 140, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 18, padding: 16, alignItems: 'center', gap: 5, flexShrink: 0 },
  musCardGold: { borderColor: Colors.gold },
  availableDot: { position: 'absolute', top: 10, right: 10, width: 10, height: 10, backgroundColor: Colors.green, borderRadius: 5, borderWidth: 2, borderColor: Colors.card },
  musAva: { width: 58, height: 58, borderRadius: 29, backgroundColor: Colors.bg3, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.border },
  musAvaGold: { borderColor: Colors.gold },
  musName: { fontFamily: Typography.playfair700, fontSize: 13, color: Colors.text, textAlign: 'center' },
  musInstrument: { fontSize: 11, color: Colors.gold, fontFamily: Typography.nunito700, textAlign: 'center' },
  musCity: { fontSize: 11, color: Colors.muted, fontFamily: Typography.nunito400, textAlign: 'center' },
  musRate: { fontSize: 10, color: Colors.muted, fontFamily: Typography.nunito400 },
  hireBtn: { width: '100%', paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: Colors.gold, alignItems: 'center', marginTop: 2 },
  hireBtnHired: { backgroundColor: Colors.red, borderColor: Colors.red },
  hireBtnAccepted: { backgroundColor: 'rgba(39,174,96,0.15)', borderColor: Colors.green },
  hireBtnTextAccepted: { color: Colors.green },
  hireBtnText: { color: Colors.gold, fontSize: 11, fontFamily: Typography.nunito700 },
  hireBtnTextHired: { color: 'white' },
  eventCard: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 18, padding: 16, flexDirection: 'row', gap: 14, marginBottom: 12 },
  eventDateBox: { width: 50, backgroundColor: Colors.gold, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, flexShrink: 0 },
  eventDay: { fontFamily: Typography.playfair800, fontSize: 22, color: '#1a0e00' },
  eventMon: { fontSize: 10, fontFamily: Typography.nunito700, color: '#1a0e00', textTransform: 'uppercase' },
  eventInfo: { flex: 1 },
  eventTitle: { fontFamily: Typography.playfair700, fontSize: 15, color: Colors.text, marginBottom: 4, lineHeight: 20 },
  eventLoc: { fontSize: 12, color: Colors.muted, marginBottom: 6, fontFamily: Typography.nunito400 },
  eventTags: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  etag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  etagGold: { backgroundColor: 'rgba(212,160,60,0.12)', borderColor: 'rgba(212,160,60,0.25)' },
  etagGreen: { backgroundColor: 'rgba(39,174,96,0.12)', borderColor: 'rgba(39,174,96,0.25)' },
  etagText: { fontSize: 10, fontFamily: Typography.nunito700 },
  eventSpots: { fontSize: 11, color: Colors.muted, marginTop: 6, fontFamily: Typography.nunito400 },
  roomCard: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 18, padding: 16, marginBottom: 12 },
  roomHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  roomIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.bg3, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  roomName: { fontFamily: Typography.playfair700, fontSize: 15, color: Colors.text },
  roomMembers: { fontSize: 12, color: Colors.muted, fontFamily: Typography.nunito400 },
  roomLive: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  liveDot: { width: 7, height: 7, backgroundColor: Colors.green, borderRadius: 4 },
  liveText: { fontSize: 11, color: Colors.green, fontFamily: Typography.nunito700 },
  roomPreview: { fontSize: 13, color: Colors.muted, lineHeight: 20, borderLeftWidth: 2, borderLeftColor: Colors.border, paddingLeft: 10, marginBottom: 10, fontFamily: Typography.nunito400 },
  roomAvatars: { flexDirection: 'row', alignItems: 'center' },
  roomAvaSmall: { width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.bg3, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.card },
  roomMore: { fontSize: 11, color: Colors.muted, marginLeft: 8, fontFamily: Typography.nunito400 },
});
