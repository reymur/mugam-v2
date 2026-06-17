import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Animated, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getDocs, query, collection, orderBy as fbOrderBy } from 'firebase/firestore';
import { fbFirestore, COLLECTIONS } from '../../firebase/config';
import { Colors }     from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { useAppStore } from '../../store/useAppStore';
import type { Agreement } from '../../store/useAppStore';
import MusicianProfileScreen from '../Musician/MusicianProfileScreen';

const SCREEN_W = Dimensions.get('window').width;

// ── Agreement Detail Screen ───────────────────────────────
function AgreementDetail({ agreement, onClose }: { agreement: Agreement; onClose: () => void }) {
  const { user, musicians } = useAppStore();
  const [chatMessages,    setChatMessages]    = React.useState<any[]>([]);
  const [selectedMusician, setSelectedMusician] = React.useState<any>(null);
  const slideAnim = React.useRef(new Animated.Value(SCREEN_W)).current;

  // Check online status from musicians list
  const fromMusician = musicians.find(m => (m.uid ?? m.id) === agreement.fromUid);
  const toMusician   = musicians.find(m => (m.uid ?? m.id) === agreement.toUid);
  const fromOnline   = fromMusician?.online ?? false;

  const openMusician = (uid: string, name: string) => {
    const found = musicians.find(m => (m.uid ?? m.id) === uid);
    setSelectedMusician(found ?? {
      id: uid, uid, name, emoji: '👤',
      instrument: '', city: '', rating: 5, reviews: 0,
    });
  };
  const toOnline     = toMusician?.online ?? false;

  React.useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0, damping: 26, stiffness: 300, useNativeDriver: true,
    }).start();
  }, []);

  // Load chat messages
  React.useEffect(() => {
    if (!agreement.chatId) return;
    const load = async () => {
      try {
        const snap = await getDocs(query(
          collection(fbFirestore, COLLECTIONS.CHATS, agreement.chatId!, COLLECTIONS.MESSAGES),
          fbOrderBy('createdAt', 'asc'),
        ));
        const msgs = snap.docs.map(d => {
          const data = d.data();
          const ts = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
          return {
            id:         d.id,
            text:       data.text ?? '',
            senderId:   data.senderId ?? '',
            senderName: data.senderName ?? '',
            time:       ts.toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' }),
            date:       ts.toLocaleDateString('az-AZ', { day: 'numeric', month: 'short' }),
          };
        });
        setChatMessages(msgs);
      } catch { /* ignore */ }
    };
    load();
  }, [agreement.chatId]);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_W, duration: 220, useNativeDriver: true,
    }).start(onClose);
  };

  const dateObj2 = agreement.createdAt?.toDate ? agreement.createdAt.toDate() : null;
  const date = dateObj2
    ? dateObj2.toLocaleDateString('az-AZ', { day: 'numeric', month: 'long', year: 'numeric' }) +
      ' ' + dateObj2.toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })
    : 'Bilinmir';

  return (
    <Animated.View style={[
      StyleSheet.absoluteFillObject,
      { backgroundColor: Colors.bg, zIndex: 100, transform: [{ translateX: slideAnim }] },
    ]}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={d.header}>
          <TouchableOpacity style={d.backBtn} onPress={handleClose} hitSlop={{ top:10, bottom:10, left:10, right:10 }}>
            <Text style={d.backText}>←</Text>
          </TouchableOpacity>
          <Text style={d.headerTitle}>Müqavilə</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={d.container}>
          {/* Status badge */}
          <View style={d.statusWrap}>
            <View style={[(ag => (ag as any).status === 'cancelled')(agreement) ? d.statusBadgeCancelled : d.statusBadge]}>
              <Text style={[(ag => (ag as any).status === 'cancelled')(agreement) ? d.statusTextCancelled : d.statusText]}>
                {(agreement as any).status === 'cancelled'
                  ? (agreement as any).cancelledBy === user?.uid
                    ? '✖ Siz imtina etdiniz'
                    : `✖ ${(agreement as any).cancelledByName ?? ''} imtina etdi`
                  : '✅ Razılaşma qəbul edildi'}
              </Text>
            </View>
            <Text style={d.dateText}>{date}</Text>
          </View>

          {/* Parties — clickable to open profile */}
          <View style={d.card}>
            <Text style={d.cardTitle}>Tərəflər</Text>
            <TouchableOpacity
              style={d.party}
              onPress={() => openMusician(agreement.fromUid, agreement.fromName)}
              activeOpacity={0.7}
            >
              <View style={d.partyAvaWrap}>
                <View style={d.partyAva}><Text style={{ fontSize: 22 }}>👤</Text></View>
                <View style={[d.onlineDot, { backgroundColor: fromOnline ? Colors.green : Colors.muted }]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={d.partyName}>{agreement.fromName}</Text>
                <Text style={d.partyRole}>Göndərən (Təklif edən)</Text>
              </View>
              <Text style={[d.onlineLabel, { color: fromOnline ? Colors.green : Colors.muted }]}>
                {fromOnline ? '● Onlayn' : '○ Oflayn'}
              </Text>
              <Text style={d.partyArrow}>›</Text>
            </TouchableOpacity>
            <View style={d.divider} />
            <TouchableOpacity
              style={d.party}
              onPress={() => openMusician(agreement.toUid, agreement.toName)}
              activeOpacity={0.7}
            >
              <View style={d.partyAvaWrap}>
                <View style={d.partyAva}><Text style={{ fontSize: 22 }}>👤</Text></View>
                <View style={[d.onlineDot, { backgroundColor: toOnline ? Colors.green : Colors.muted }]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={d.partyName}>{agreement.toName}</Text>
                <Text style={d.partyRole}>Qəbul edən</Text>
              </View>
              <Text style={[d.onlineLabel, { color: toOnline ? Colors.green : Colors.muted }]}>
                {toOnline ? '● Onlayn' : '○ Oflayn'}
              </Text>
              <Text style={d.partyArrow}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Agreement details card removed — number and date shown in chat history footer */}

          {/* Chat history */}
          {chatMessages.length > 0 && (
            <View style={d.card}>
              <Text style={d.cardTitle}>💬 Yazışma tarixi</Text>
              {chatMessages.map((msg, i) => {
                const isVoice = msg.text?.startsWith('🎤 VOICE:');
                const isMine  = msg.senderId === user?.uid;
                return (
                  <View key={msg.id ?? i} style={d.msgRow}>
                    <View style={[d.msgAva, { backgroundColor: isMine ? Colors.gold + '33' : Colors.bg3 }]}>
                      <Text style={{ fontSize: 12 }}>👤</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={d.msgHeader}>
                        <Text style={[d.msgSender, { color: isMine ? Colors.gold : Colors.text }]}>
                          {msg.senderName}
                        </Text>
                        <Text style={d.msgTime}>{msg.date} {msg.time}</Text>
                      </View>
                      <Text style={d.msgText}>
                        {isVoice ? '🎤 Səs mesajı' : msg.text}
                      </Text>
                    </View>
                  </View>
                );
              })}
              {/* Number and date at bottom */}
              <View style={d.chatFooter}>
                <Text style={d.chatFooterText}>№ {agreement.id.slice(0, 8).toUpperCase()}</Text>
                <Text style={d.chatFooterText}>{date}</Text>
              </View>
            </View>
          )}

          {/* If no messages yet — still show number and date */}
          {chatMessages.length === 0 && (
            <View style={d.card}>
              <Text style={d.cardTitle}>💬 Yazışma tarixi</Text>
              <Text style={[d.msgText, { color: Colors.muted, paddingVertical: 8 }]}>
                Yazışma yoxdur
              </Text>
              <View style={d.chatFooter}>
                <Text style={d.chatFooterText}>№ {agreement.id.slice(0, 8).toUpperCase()}</Text>
                <Text style={d.chatFooterText}>{date}</Text>
              </View>
            </View>
          )}

          {/* Note */}
          <View style={d.noteCard}>
            <Text style={d.noteText}>
              Bu müqavilə {agreement.fromName} və {agreement.toName} arasında
              qarşılıqlı razılıq əsasında bağlanmışdır.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Open musician profile on party tap */}
      {selectedMusician && (
        <MusicianProfileScreen
          musician={selectedMusician}
          onClose={() => setSelectedMusician(null)}
        />
      )}
    </Animated.View>
  );
}

// ── Agreement Card with messages ─────────────────────────
function AgreementCard({ ag, onPress, isUnread }: { ag: Agreement; onPress: () => void; isUnread: boolean }) {
  const { user } = useAppStore();
  const isSender    = ag.fromUid === user?.uid;
  const otherName   = isSender ? ag.toName : ag.fromName;
  const isCancelled = (ag as any).status === 'cancelled';
  const cancelledByMe = (ag as any).cancelledBy === user?.uid;
  const cancelledByName = (ag as any).cancelledByName ?? otherName;
  const dateObj = ag.createdAt?.toDate ? ag.createdAt.toDate() : null;
  const date = dateObj
    ? dateObj.toLocaleDateString('az-AZ', { day: 'numeric', month: 'long', year: 'numeric' }) +
      ' ' + dateObj.toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })
    : '';

  const roleText = isCancelled
    ? cancelledByMe
      ? 'Siz imtina etdiniz'
      : `${cancelledByName} imtina etdi`
    : isSender ? 'Siz göndərdiniz' : 'Sizə göndərildi';

  return (
    <TouchableOpacity
      style={[s.card, isCancelled ? (isUnread ? s.cardCancelledUnread : s.cardCancelled) : isUnread ? s.cardUnread : s.cardRead]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={s.cardLeft}>
        <View style={s.cardAva}>
          <Text style={{ fontSize: 22 }}>{isCancelled ? '✖️' : '📋'}</Text>
          {isUnread && !isCancelled && <View style={s.unreadDot} />}
          {isUnread && isCancelled && <View style={s.unreadDotCancelled} />}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.cardName, isUnread ? s.cardNameUnread : s.cardNameRead]}>{otherName}</Text>
          <Text style={[s.cardRole, isUnread ? (isCancelled ? s.cardRoleCancelled : s.cardRoleUnread) : s.cardRoleRead]}>
            {roleText}
          </Text>
          <Text style={[s.cardDate, !isUnread && s.cardDateRead]}>{date}</Text>
        </View>
        <View style={s.cardRight}>
          {isUnread && !isCancelled && <View style={s.unreadCircle} />}
          {isUnread && isCancelled && <View style={s.unreadCircleCancelled} />}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Agreements List Screen ────────────────────────────────
export default function AgreementsScreen({ route }: { route?: any }) {
  const { agreements, user, markAgreementAsRead } = useAppStore();
  const readAgreementIds: string[] = useAppStore(s => (s as any).readAgreementIds ?? []);
  const autoOpenUid = route?.params?.musicianUid ?? null;
  const initialTab = route?.params?.tab ?? 'outgoing';
  const [activeTab, setActiveTab] = React.useState<'outgoing' | 'incoming' | 'cancelled'>(initialTab);

  const outgoing  = agreements.filter((a: any) => a.fromUid === user?.uid && a.status !== 'cancelled');
  const incoming  = agreements.filter((a: any) => a.toUid === user?.uid && a.status !== 'cancelled');
  const cancelled = agreements.filter((a: any) => a.status === 'cancelled' && (a.fromUid === user?.uid || a.toUid === user?.uid));
  const sortAndGroup = (list: any[]) => {
    const unread = list.filter((a: any) => !readAgreementIds.includes(a.id))
      .sort((a: any, b: any) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
    const read = list.filter((a: any) => readAgreementIds.includes(a.id))
      .sort((a: any, b: any) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
    return [...unread, ...read];
  };
  const filtered = sortAndGroup(
    activeTab === 'outgoing' ? outgoing : activeTab === 'incoming' ? incoming : cancelled
  );

  // Mark all as seen when screen opens (clears badge)
  React.useEffect(() => {
  }, []);

  // Auto-open agreement with specific musician
  const autoAgreement = autoOpenUid
    ? agreements.find(a => a.fromUid === autoOpenUid || a.toUid === autoOpenUid) ?? null
    : null;

  const [selected, setSelected] = useState<Agreement | null>(autoAgreement);

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>📋 Müqavilələr</Text>
        <Text style={s.subtitle}>{agreements.length} müqavilə</Text>
      </View>

      <View style={s.tabRow}>
        <TouchableOpacity style={[s.tab, activeTab === 'outgoing' && s.tabActive]} onPress={() => setActiveTab('outgoing')}>
          <Text style={[s.tabText, activeTab === 'outgoing' && s.tabTextActive]}>Göndərilən ({outgoing.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tab, activeTab === 'incoming' && s.tabActive]} onPress={() => setActiveTab('incoming')}>
          <Text style={[s.tabText, activeTab === 'incoming' && s.tabTextActive]}>Gələnlər ({incoming.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tab, activeTab === 'cancelled' && s.tabCancelledActive]} onPress={() => setActiveTab('cancelled')}>
          <Text style={[s.tabText, activeTab === 'cancelled' && s.tabCancelledText]}>Ləğv edilən ({cancelled.length})</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
      >
        {agreements.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>📋</Text>
            <Text style={s.emptyTitle}>Hələ müqavilə yoxdur</Text>
            <Text style={s.emptyDesc}>
              Musiqiçi ilə razılaşdıqda müqavilə burada görünəcək
            </Text>
          </View>
        ) : (
          filtered.map(ag => (
            <AgreementCard
              key={ag.id}
              ag={ag}
              isUnread={!readAgreementIds.includes(ag.id)}
              onPress={() => {
                markAgreementAsRead?.(ag.id);
                setSelected(ag);
              }}
            />
          ))
        )}
      </ScrollView>

      {selected && (
        <AgreementDetail
          agreement={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </SafeAreaView>
  );
}

const d = StyleSheet.create({
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn:     { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backText:    { fontSize: 24, color: Colors.text },
  headerTitle: { fontFamily: Typography.playfair700, fontSize: 18, color: Colors.text },
  container:   { padding: 18, gap: 16, paddingBottom: 40 },
  statusWrap:  { alignItems: 'center', paddingVertical: 20, gap: 8 },
  statusBadge:           { backgroundColor: 'rgba(39,174,96,0.15)', borderWidth: 1, borderColor: Colors.green, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  statusText:            { color: Colors.green, fontSize: 15, fontFamily: Typography.nunito700 },
  statusBadgeCancelled:  { backgroundColor: 'rgba(192,57,43,0.15)', borderWidth: 1, borderColor: Colors.red, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  statusTextCancelled:   { color: Colors.red, fontSize: 15, fontFamily: Typography.nunito700 },
  dateText:    { color: Colors.muted, fontSize: 12, fontFamily: Typography.nunito400 },
  card:        { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 16, padding: 16, gap: 12 },
  cardTitle:   { fontFamily: Typography.playfair700, fontSize: 16, color: Colors.text, marginBottom: 4 },
  party:       { flexDirection: 'row', alignItems: 'center', gap: 12 },
  partyAvaWrap:{ position: 'relative' },
  partyAva:    { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.bg3, alignItems: 'center', justifyContent: 'center' },
  onlineDot:   { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: Colors.card },
  onlineLabel: { fontSize: 11, fontFamily: Typography.nunito700 },
  partyArrow:  { fontSize: 20, color: Colors.muted, marginLeft: 4 },
  partyName:   { fontFamily: Typography.nunito700, fontSize: 15, color: Colors.text },
  partyRole:   { fontSize: 12, color: Colors.gold, fontFamily: Typography.nunito600 },
  divider:     { height: 1, backgroundColor: Colors.border },
  row:         { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowLabel:    { fontSize: 13, color: Colors.muted, fontFamily: Typography.nunito400 },
  rowValue:    { fontSize: 13, color: Colors.text, fontFamily: Typography.nunito700 },
  noteCard:    { backgroundColor: Colors.bg3, borderRadius: 12, padding: 14 },
  msgRow:      { flexDirection: 'row', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  msgAva:      { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  msgHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  msgSender:   { fontFamily: Typography.nunito700, fontSize: 12 },
  msgTime:     { fontSize: 10, color: Colors.muted, fontFamily: Typography.nunito400 },
  msgText:     { fontSize: 13, color: Colors.text, lineHeight: 18, fontFamily: Typography.nunito400 },
  noteText:    { fontSize: 13, color: Colors.muted, lineHeight: 20, fontFamily: Typography.nunito400 },
  chatFooter:  { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.border },
  chatFooterText: { fontSize: 11, color: Colors.muted, fontFamily: Typography.nunito600 },
});

const s = StyleSheet.create({
  screen:      { flex: 1, backgroundColor: Colors.bg },
  header:      { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 8 },
  title:       { fontFamily: Typography.playfair700, fontSize: 22, color: Colors.text },
  subtitle:    { fontSize: 12, color: Colors.muted, fontFamily: Typography.nunito400, marginTop: 2 },
  list:        { padding: 14, gap: 10, paddingBottom: 20 },
  tabRow:        { flexDirection: 'row', marginHorizontal: 14, marginBottom: 8, borderRadius: 12, backgroundColor: Colors.bg3, padding: 4 },
  tab:           { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  tabActive:          { backgroundColor: Colors.gold },
  tabCancelledActive: { backgroundColor: Colors.red },
  tabCancelledText:   { color: '#fff', fontFamily: Typography.nunito700 },
  tabText:       { fontSize: 13, color: Colors.muted, fontFamily: Typography.nunito600 },
  tabTextActive: { color: '#1a0e00', fontFamily: Typography.nunito700 },
  empty:       { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyEmoji:  { fontSize: 52 },
  emptyTitle:  { fontFamily: Typography.playfair700, fontSize: 20, color: Colors.text },
  emptyDesc:   { fontSize: 13, color: Colors.muted, textAlign: 'center', lineHeight: 20, fontFamily: Typography.nunito400, paddingHorizontal: 20 },
  card:        { borderRadius: 16, padding: 14, marginBottom: 10 },
  cardUnread:  { borderWidth: 1, borderColor: Colors.gold, backgroundColor: 'rgba(212,160,60,0.08)' },
  cardRead:             { backgroundColor: 'rgba(255,255,255,0.03)' },
  cardCancelled:        { borderWidth: 1, borderColor: 'rgba(192,57,43,0.3)', backgroundColor: 'rgba(255,255,255,0.01)' },
  cardCancelledUnread:  { borderWidth: 1, borderColor: Colors.red, backgroundColor: 'rgba(192,57,43,0.08)' },
  cardLeft:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardAva:     { width: 46, height: 46, borderRadius: 14, backgroundColor: Colors.bg3, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border, position: 'relative' },
  unreadDot:   { position: 'absolute', top: -3, right: -3, width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.gold, borderWidth: 2, borderColor: Colors.bg },
  cardName:     { fontFamily: Typography.playfair700, fontSize: 15, marginBottom: 2 },
  cardNameUnread: { color: '#ffffff' },
  cardNameRead: { color: Colors.muted },
  cardRole:     { fontSize: 12, fontFamily: Typography.nunito600, marginBottom: 2 },
  cardRoleUnread:     { color: Colors.gold2 },
  cardRoleCancelled:  { color: Colors.red, fontSize: 12, fontFamily: Typography.nunito600, marginBottom: 2 },
  cardRoleRead: { color: Colors.muted },
  cardDate:     { fontSize: 11, color: Colors.muted, fontFamily: Typography.nunito400 },
  cardDateRead: { color: Colors.muted },
  cardRight:    { alignItems: 'center', gap: 6 },
  unreadCircle:           { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.green },
  unreadCircleCancelled:  { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.red },
  unreadDotCancelled:     { position: 'absolute', top: -3, right: -3, width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.red, borderWidth: 2, borderColor: Colors.bg },
  cardArrow:    { fontSize: 20, color: Colors.muted },
  msgsWrap:    { marginTop: 10, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10, gap: 6 },
  msgLine:     { flexDirection: 'row', alignItems: 'flex-start', gap: 4, flexWrap: 'wrap' },
  msgLineName: { fontSize: 12, color: Colors.gold, fontFamily: Typography.nunito700, flexShrink: 0 },
  msgLineText: { fontSize: 12, color: Colors.text, fontFamily: Typography.nunito400, flex: 1 },
  msgLineTime: { fontSize: 10, color: Colors.muted, fontFamily: Typography.nunito400, flexShrink: 0 },
});
