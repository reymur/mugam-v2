import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Animated, Dimensions, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Colors }     from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { useAppStore } from '../../store/useAppStore';
import type { Musician, Invite } from '../../store/useAppStore';
import DirectChat from '../Chat/DirectChat';

const SCREEN_W = Dimensions.get('window').width;

const SERVICES = [
  { icon: '💍', label: 'Toy',      price: '200–400 AZN' },
  { icon: '🎭', label: 'Konsert',  price: '150–300 AZN' },
  { icon: '🍽', label: 'Restoran', price: '100–200 AZN / gecə' },
  { icon: '📸', label: 'Çəkiliş', price: '150–250 AZN' },
];

// ── Received Invite Card (shown on own profile) ───────────
function ReceivedInviteCard({
  invite,
  onOpenSender,
}: {
  invite: Invite;
  onOpenSender: (invite: Invite) => void;
}) {
  const { updateInviteStatus, showToast } = useAppStore();
  const [loading, setLoading] = useState(false);

  const statusColor = invite.status === 'accepted' ? Colors.green
    : invite.status === 'declined' ? Colors.red : Colors.gold;
  const statusLabel = invite.status === 'accepted' ? '✅ Qəbul edildi'
    : invite.status === 'declined' ? '❌ Rədd edildi' : '🔔 Yeni';

  return (
    <TouchableOpacity style={ic.card} onPress={() => onOpenSender(invite)} activeOpacity={0.85}>
      <View style={ic.top}>
        <View style={ic.ava}><Text style={{ fontSize: 18 }}>👤</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={ic.name}>{invite.fromName}</Text>
          {invite.fromCity ? <Text style={ic.city}>📍 {invite.fromCity}</Text> : null}
          <Text style={ic.time}>{invite.createdAtStr ?? 'Az əvvəl'}</Text>
        </View>
        <View style={[ic.badge, { borderColor: statusColor, backgroundColor: `${statusColor}20` }]}>
          <Text style={[ic.badgeText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>

      {invite.status === 'pending' && (
        <View style={ic.actions}>
          <TouchableOpacity
            style={[ic.btn, { backgroundColor: Colors.green }]}
            disabled={loading}
            onPress={async () => {
              setLoading(true);
              await updateInviteStatus(invite.id, 'accepted').catch(() => {});
              showToast(`✅ ${invite.fromName} — dəvəti qəbul etdiniz!`);
              setLoading(false);
            }}
          >
            {loading ? <ActivityIndicator color="white" size="small" />
              : <Text style={ic.btnText}>✅ Qəbul Et</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={[ic.btn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.red }]}
            disabled={loading}
            onPress={async () => {
              setLoading(true);
              await updateInviteStatus(invite.id, 'declined').catch(() => {});
              showToast('❌ Rədd edildi');
              setLoading(false);
            }}
          >
            <Text style={[ic.btnText, { color: Colors.red }]}>❌ Rədd Et</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Open sender profile button */}
      <TouchableOpacity style={ic.profileBtn} onPress={() => onOpenSender(invite)}>
        <Text style={ic.profileBtnText}>👤 Profilə bax →</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ── Main Profile Screen ───────────────────────────────────
interface Props {
  musician:  Musician;
  onClose:   () => void;
  // If opened from an invite — show "accept" button
  fromInvite?: Invite;
}

export default function MusicianProfileScreen({ musician, onClose, fromInvite }: Props) {
  const {
    showToast,
    invitedMusicianIds,
    acceptedMusicianIds,
    sendInvite,
    cancelInvite,
    receivedInvites,
    updateInviteStatus,
    user,
    hasAgreementWith,
  } = useAppStore();

  const slideAnim  = React.useRef(new Animated.Value(SCREEN_W)).current;
  const musicianId = musician.uid ?? musician.id;
  const navigation = useNavigation<any>();
  const agreed     = hasAgreementWith(musicianId);
  const agreements = useAppStore(s => s.agreements);
  const agreementCount = agreements.filter(a =>
    (a.fromUid === musicianId || a.toUid === musicianId)
  ).length;
  const isMyProfile = user?.uid && (user.uid === musician.uid);

  const [senderMusician, setSenderMusician] = useState<Musician | null>(null);
  const [showChat, setShowChat] = useState(false);

  React.useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0, damping: 26, stiffness: 300, useNativeDriver: true,
    }).start();
  }, []);

  const handleClose = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_W, duration: 250, useNativeDriver: true,
    }).start(onClose);
  }, [onClose]);

  const handleMessage = useCallback(() => {
    setShowChat(true);
  }, []);

  // Rəfaəl nажимает "Qəbul edirəm" — меняет статус в Firestore
  const handleAcceptFromInvite = useCallback(async () => {
    if (!fromInvite) return;
    await updateInviteStatus(fromInvite.id, 'accepted');
    showToast(`✅ ${fromInvite.fromName} — dəvəti qəbul etdiniz!`);
    onClose();
  }, [fromInvite, updateInviteStatus, showToast, onClose]);

  const handleOpenSender = useCallback((invite: Invite) => {
    const m: Musician = {
      id:         invite.fromUid,
      uid:        invite.fromUid,
      name:       invite.fromName,
      emoji:      '👤',
      instrument: '',
      city:       invite.fromCity ?? '',
      rating:     5,
      reviews:    0,
    };
    setSenderMusician(m);
  }, []);

  return (
    <Animated.View style={[
      StyleSheet.absoluteFillObject,
      { backgroundColor: Colors.bg, zIndex: 100, transform: [{ translateX: slideAnim }] },
    ]}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={handleClose} hitSlop={{ top:10, bottom:10, left:10, right:10 }}>
            <Text style={s.backText}>←</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Profil</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

          {/* Hero */}
          <View style={s.hero}>
            <View style={s.heroGlow} />
            <View style={[s.avatar, musician.goldRing && s.avatarGold]}>
              <Text style={{ fontSize: 48 }}>{musician.emoji}</Text>
              <View style={[s.onlineDot, { backgroundColor: musician.online ? Colors.green : Colors.muted }]} />
            </View>
            <Text style={s.name}>{musician.name}</Text>
            <Text style={s.instrument}>{musician.instrument}</Text>
            <View style={s.metaRow}>
              <Text style={s.city}>📍 {musician.city}</Text>
              <View style={[s.onlineBadge, { borderColor: musician.online ? Colors.green : Colors.muted, backgroundColor: musician.online ? 'rgba(39,174,96,0.15)' : 'rgba(128,128,128,0.1)' }]}>
                <Text style={[s.onlineBadgeText, { color: musician.online ? Colors.green : Colors.muted }]}>
                  {musician.online ? '● Onlayn' : '○ Oflayn'}
                </Text>
              </View>
              {musician.available && (
                <View style={s.availBadge}>
                  <Text style={s.availText}>✅ Hazırdır</Text>
                </View>
              )}
            </View>
            <View style={s.ratingRow}>
              <Text style={s.stars}>{'★'.repeat(musician.rating)}{'☆'.repeat(5 - musician.rating)}</Text>
              <Text style={s.reviewCount}>{musician.reviews} rəy</Text>
            </View>

            {/* Stats */}
            <View style={s.statsBox}>
              <View style={s.stat}>
                <Text style={s.statN}>{musician.reviews}</Text>
                <Text style={s.statL}>Tədbirlər</Text>
              </View>
              <View style={s.statDiv} />
              <View style={s.stat}>
                <Text style={s.statN}>{musician.rating}.0</Text>
                <Text style={s.statL}>Reytinq</Text>
              </View>
              <View style={s.statDiv} />
              <View style={s.stat}>
                <Text style={s.statN}>10+</Text>
                <Text style={s.statL}>İl</Text>
              </View>
            </View>

            {/* Action buttons — only when viewing someone else's profile */}
            {!isMyProfile && !fromInvite && (
              <View style={s.btns}>
                {/* Razılaşma — grey until agreed, then gold + clickable → Agreements */}
                {agreed ? (
                  <TouchableOpacity
                    style={[s.invBtn, s.invBtnAccepted]}
                    onPress={() => { onClose(); navigation.navigate('Agreements', { musicianUid: musicianId }); }}
                  >
                    <Text style={s.invBtnAcceptedText}>
                      🤝 Razılaşma ({agreementCount})
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={[s.invBtn, s.invBtnGrey]}>
                    <Text style={s.invBtnGreyText}>🤝 Razılaşma</Text>
                  </View>
                )}

                {/* Mesaj — always active */}
                <TouchableOpacity style={s.msgBtn} onPress={handleMessage}>
                  <Text style={s.msgBtnText}>✉️ Mesaj</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Accept button — shown when opened from invite */}
            {fromInvite && fromInvite.status === 'pending' && (
              <View style={s.btns}>
                <TouchableOpacity
                  style={[s.invBtn, s.invBtnAcceptGreen]}
                  onPress={handleAcceptFromInvite}
                >
                  <Text style={s.invBtnAcceptGreenText}>✅ Qəbul edirəm</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.msgBtn]}
                  onPress={async () => {
                    await updateInviteStatus(fromInvite.id, 'declined');
                    showToast('❌ Rədd edildi');
                    onClose();
                  }}
                >
                  <Text style={[s.msgBtnText, { color: Colors.red }]}>❌ Rədd Et</Text>
                </TouchableOpacity>
              </View>
            )}

            {fromInvite && fromInvite.status === 'accepted' && (
              <View style={[s.btns, { justifyContent: 'center' }]}>
                <View style={[s.invBtn, s.invBtnAccepted, { flex: 0, paddingHorizontal: 24 }]}>
                  <Text style={s.invBtnAcceptedText}>✅ Artıq qəbul etmisiniz</Text>
                </View>
              </View>
            )}
          </View>

          {/* About */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Haqqında</Text>
            <Text style={s.bioText}>
              {musician.bio ||
                `${musician.city} şəhərindən professional ${musician.instrument?.toLowerCase() || 'musiqiçi'}. 10+ il səhnə təcrübəsi.`}
            </Text>
          </View>

          {/* Services */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Xidmətlər və Qiymətlər</Text>
            {SERVICES.map(sv => (
              <View key={sv.label} style={s.serviceRow}>
                <Text style={s.serviceIcon}>{sv.icon} {sv.label}</Text>
                <Text style={s.servicePrice}>{sv.price}</Text>
              </View>
            ))}
          </View>

          {/* Received invites on own profile */}
          {isMyProfile && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Dəvətlər</Text>
              {receivedInvites.length === 0 ? (
                <Text style={s.emptyText}>Hələ dəvət yoxdur</Text>
              ) : (
                receivedInvites.map(inv => (
                  <ReceivedInviteCard
                    key={inv.id}
                    invite={inv}
                    onOpenSender={handleOpenSender}
                  />
                ))
              )}
            </View>
          )}

          {/* Reviews */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Rəylər ({musician.reviews})</Text>
            {[
              { id: 'r1', author: 'Əli Hüseynov',  text: 'Çox peşəkar ifa, toyumuz əfsanəvi oldu!', rating: 5, date: '12 May 2026' },
              { id: 'r2', author: 'Nigar Quliyeva', text: 'Vaxtında gəldi, hamı məmnun qaldı.',      rating: 5, date: '3 May 2026' },
              { id: 'r3', author: 'Tural Babayev',  text: 'Gözəl səs, professional davranış.',       rating: 4, date: '28 Apr 2026' },
            ].map(r => (
              <View key={r.id} style={s.reviewCard}>
                <View style={s.reviewTop}>
                  <View style={s.reviewAva}><Text style={{ fontSize: 16 }}>👤</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.reviewAuthor}>{r.author}</Text>
                    <Text style={s.reviewDate}>{r.date}</Text>
                  </View>
                  <Text style={s.reviewStars}>{'★'.repeat(r.rating)}</Text>
                </View>
                <Text style={s.reviewText}>{r.text}</Text>
              </View>
            ))}
          </View>

        </ScrollView>
      </SafeAreaView>

      {/* Nested sender profile */}
      {senderMusician && (
        <MusicianProfileScreen
          musician={senderMusician}
          onClose={() => setSenderMusician(null)}
          fromInvite={receivedInvites.find(i => i.fromUid === senderMusician.uid)}
        />
      )}

      {/* Direct chat overlay */}
      {showChat && (
        <DirectChat
          musician={musician}
          onClose={() => setShowChat(false)}
          fromInvite={receivedInvites.find(i => i.fromUid === musicianId)}
        />
      )}
    </Animated.View>
  );
}

const ic = StyleSheet.create({
  card:       { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 14, padding: 14, marginBottom: 10 },
  top:        { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  ava:        { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.bg3, alignItems: 'center', justifyContent: 'center' },
  name:       { fontFamily: Typography.nunito700, fontSize: 14, color: Colors.text, marginBottom: 2 },
  city:       { fontSize: 11, color: Colors.muted, fontFamily: Typography.nunito400 },
  time:       { fontSize: 10, color: Colors.muted, fontFamily: Typography.nunito400, marginTop: 2 },
  badge:      { borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText:  { fontSize: 10, fontFamily: Typography.nunito700 },
  actions:    { flexDirection: 'row', gap: 8, marginBottom: 8 },
  btn:        { flex: 1, paddingVertical: 9, borderRadius: 20, alignItems: 'center' },
  btnText:    { fontSize: 12, fontFamily: Typography.nunito700, color: 'white' },
  profileBtn: { alignItems: 'center', paddingVertical: 6 },
  profileBtnText: { color: Colors.gold, fontSize: 12, fontFamily: Typography.nunito700 },
});

const s = StyleSheet.create({
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn:     { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backText:    { fontSize: 24, color: Colors.text },
  headerTitle: { fontFamily: Typography.playfair700, fontSize: 18, color: Colors.text },
  hero:        { backgroundColor: '#15100a', padding: 24, alignItems: 'center', overflow: 'hidden' },
  heroGlow:    { position: 'absolute', top: 0, right: 0, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(212,160,60,0.15)' },
  avatar:      { width: 96, height: 96, borderRadius: 48, backgroundColor: Colors.bg3, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: Colors.border, marginBottom: 14 },
  avatarGold:  { borderColor: Colors.gold },
  onlineDot:   { position: 'absolute', bottom: 4, right: 4, width: 18, height: 18, backgroundColor: Colors.green, borderRadius: 9, borderWidth: 3, borderColor: '#15100a' },
  name:        { fontFamily: Typography.playfair800, fontSize: 24, color: Colors.text, marginBottom: 4 },
  instrument:  { fontSize: 15, color: Colors.gold, fontFamily: Typography.nunito700, marginBottom: 8 },
  metaRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  city:        { fontSize: 13, color: Colors.muted, fontFamily: Typography.nunito400 },
  availBadge:  { backgroundColor: 'rgba(39,174,96,0.15)', borderWidth: 1, borderColor: 'rgba(39,174,96,0.3)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  availText:   { color: Colors.green, fontSize: 11, fontFamily: Typography.nunito700 },
  onlineBadge: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  onlineBadgeText: { fontSize: 11, fontFamily: Typography.nunito700 },
  availText:   { color: Colors.green, fontSize: 11, fontFamily: Typography.nunito700 },
  ratingRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  stars:       { fontSize: 16, color: Colors.gold },
  reviewCount: { fontSize: 12, color: Colors.muted, fontFamily: Typography.nunito400 },
  statsBox:    { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, paddingVertical: 14, paddingHorizontal: 20, width: '100%', marginBottom: 18 },
  stat:        { flex: 1, alignItems: 'center' },
  statN:       { fontFamily: Typography.playfair700, fontSize: 20, color: Colors.gold2, marginBottom: 2 },
  statL:       { fontSize: 11, color: Colors.muted, fontFamily: Typography.nunito700 },
  statDiv:     { width: 1, height: 36, backgroundColor: Colors.border },
  btns:        { flexDirection: 'row', gap: 10, width: '100%' },
  invBtn:      { flex: 1, backgroundColor: Colors.gold, borderRadius: 28, paddingVertical: 14, alignItems: 'center' },
  invBtnGrey:       { backgroundColor: Colors.bg3, borderWidth: 1, borderColor: Colors.border },
  invBtnCancel:     { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Colors.red },
  invBtnAccepted:   { backgroundColor: Colors.gold, borderWidth: 1.5, borderColor: Colors.gold },
  invBtnAcceptGreen:{ flex: 1, backgroundColor: Colors.green, borderRadius: 28, paddingVertical: 14, alignItems: 'center' },
  invBtnText:           { color: '#1a0e00', fontSize: 15, fontFamily: Typography.nunito700 },
  invBtnGreyText:       { color: Colors.muted, fontSize: 15, fontFamily: Typography.nunito700 },
  invBtnCancelText:     { color: Colors.red },
  invBtnAcceptedText:   { color: '#1a0e00', fontSize: 15, fontFamily: Typography.nunito700 },
  invBtnAcceptGreenText:{ color: 'white', fontSize: 15, fontFamily: Typography.nunito700 },
  msgBtn:      { paddingHorizontal: 20, borderRadius: 28, borderWidth: 1, borderColor: Colors.border, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  msgBtnText:  { color: Colors.text, fontSize: 15, fontFamily: Typography.nunito700 },
  section:      { paddingHorizontal: 18, paddingTop: 22 },
  sectionTitle: { fontFamily: Typography.playfair700, fontSize: 18, color: Colors.text, marginBottom: 14 },
  bioText:      { fontSize: 14, color: '#b0a080', lineHeight: 22, fontFamily: Typography.nunito400 },
  emptyText:    { fontSize: 13, color: Colors.muted, fontFamily: Typography.nunito400 },
  serviceRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  serviceIcon:  { fontSize: 14, color: Colors.text, fontFamily: Typography.nunito600 },
  servicePrice: { fontSize: 14, color: Colors.gold, fontFamily: Typography.nunito700 },
  reviewCard:   { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 14, padding: 14, marginBottom: 10 },
  reviewTop:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  reviewAva:    { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.bg3, alignItems: 'center', justifyContent: 'center' },
  reviewAuthor: { fontFamily: Typography.nunito700, fontSize: 14, color: Colors.text },
  reviewDate:   { fontSize: 11, color: Colors.muted, fontFamily: Typography.nunito400 },
  reviewStars:  { fontSize: 13, color: Colors.gold },
  reviewText:   { fontSize: 13, color: Colors.muted, lineHeight: 20, fontFamily: Typography.nunito400 },
});
