import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors }     from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { useAppStore } from '../../store/useAppStore';
import { useT }        from '../../i18n';
import type { Invite, ChatItem } from '../../store/useAppStore';
import MusicianProfileScreen from '../../screens/Musician/MusicianProfileScreen';
import DirectChat from '../../screens/Chat/DirectChat';

const SCREEN_W = Dimensions.get('window').width;

// ── Incoming invite card ──────────────────────────────────
function IncomingCard({ invite, onPress }: { invite: Invite; onPress: () => void }) {
  const { updateInviteStatus, showToast } = useAppStore();
  const [loading, setLoading] = React.useState(false);

  const statusColor = invite.status === 'accepted' ? Colors.green
    : invite.status === 'declined' ? Colors.red : Colors.gold;
  const statusLabel = invite.status === 'accepted' ? '✅ Qəbul edildi'
    : invite.status === 'declined' ? '❌ Rədd edildi' : '🔔 Yeni dəvət';

  return (
    <TouchableOpacity style={nc.card} onPress={onPress} activeOpacity={0.85}>
      <View style={nc.top}>
        <View style={nc.ava}><Text style={{ fontSize: 20 }}>👤</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={nc.name} numberOfLines={1}>{invite.fromName}</Text>
          <Text style={nc.sub}>{invite.fromCity ? `📍 ${invite.fromCity}` : 'Dəvət göndərdi'}</Text>
        </View>
        <View style={[nc.badge, { borderColor: statusColor, backgroundColor: `${statusColor}25` }]}>
          <Text style={[nc.badgeText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>
      {invite.status === 'pending' && (
        <View style={nc.btns}>
          <TouchableOpacity
            style={[nc.btn, { backgroundColor: Colors.green }]}
            disabled={loading}
            onPress={async () => {
              setLoading(true);
              await updateInviteStatus(invite.id, 'accepted').catch(() => {});
              showToast(`✅ ${invite.fromName} — dəvəti qəbul etdiniz!`);
              setLoading(false);
            }}
          >
            {loading ? <ActivityIndicator color="white" size="small" />
              : <Text style={nc.btnText}>✅ Qəbul Et</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={[nc.btn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.red }]}
            disabled={loading}
            onPress={async () => {
              setLoading(true);
              await updateInviteStatus(invite.id, 'declined').catch(() => {});
              showToast('❌ Rədd edildi');
              setLoading(false);
            }}
          >
            <Text style={[nc.btnText, { color: Colors.red }]}>❌ Rədd Et</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── Unread message card ───────────────────────────────────
function UnreadChatCard({ chat, onPress }: { chat: ChatItem; onPress: () => void }) {
  return (
    <TouchableOpacity style={nc.card} onPress={onPress} activeOpacity={0.85}>
      <View style={nc.top}>
        <View style={nc.ava}><Text style={{ fontSize: 20 }}>{chat.emoji}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={nc.name} numberOfLines={1}>{chat.name}</Text>
          <Text style={nc.sub}>💬 Yeni mesaj</Text>
        </View>
        <View style={[nc.badge, { borderColor: Colors.gold, backgroundColor: `${Colors.gold}25` }]}>
          <Text style={[nc.badgeText, { color: Colors.gold }]}>💬 {chat.unread}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Notifications Panel ───────────────────────────────────
function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const { receivedInvites, chats, musicians, user } = useAppStore();
  const [selectedInvite,  setSelectedInvite]  = React.useState<Invite | null>(null);
  const [selectedChat,    setSelectedChat]    = React.useState<ChatItem | null>(null);

  // Chats with unread messages
  const unreadChats = chats.filter(c => c.unread > 0);

  const slideAnim = React.useRef(new Animated.Value(SCREEN_W)).current;

  React.useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0, damping: 26, stiffness: 280, useNativeDriver: true,
    }).start();
  }, []);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_W, duration: 220, useNativeDriver: true,
    }).start(onClose);
  };

  const getMusicianFromInvite = (invite: Invite) => {
    const found = musicians.find(m => (m.uid ?? m.id) === invite.fromUid);
    if (found) return found;
    return {
      id:         invite.fromUid,
      uid:        invite.fromUid,
      name:       invite.fromName,
      emoji:      '👤',
      instrument: '',
      city:       invite.fromCity ?? '',
      rating:     5,
      reviews:    0,
    };
  };

  // Build musician from chat for DirectChat
  const getMusicianFromChat = (chat: ChatItem) => {
    const otherId = chat.members?.find(m => m !== user?.uid) ?? '';
    const found = musicians.find(m => (m.uid ?? m.id) === otherId);
    if (found) return found;
    return {
      id:         otherId,
      uid:        otherId,
      name:       chat.name,
      emoji:      chat.emoji,
      instrument: '',
      city:       '',
      rating:     5,
      reviews:    0,
    };
  };

  const hasNotifs = unreadChats.length > 0;

  return (
    <Animated.View style={[p.panel, { transform: [{ translateX: slideAnim }] }]}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={p.header}>
          <Text style={p.title}>🔔 Bildirişlər</Text>
          <TouchableOpacity style={p.closeBtn} onPress={handleClose} hitSlop={{ top:10, bottom:10, left:10, right:10 }}>
            <Text style={p.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        {!hasNotifs ? (
          <View style={p.empty}>
            <Text style={{ fontSize: 48 }}>🔔</Text>
            <Text style={p.emptyTitle}>Bildiriş yoxdur</Text>
            <Text style={p.emptyDesc}>Mesajlar burada görünəcək</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 14 }} showsVerticalScrollIndicator={false}>
            {/* Unread messages section only */}
            {unreadChats.length > 0 && (
              <>
                <Text style={p.sectionLabel}>💬 Oxunmamış mesajlar</Text>
                {unreadChats.map(chat => (
                  <UnreadChatCard
                    key={chat.id}
                    chat={chat}
                    onPress={() => setSelectedChat(chat)}
                  />
                ))}
              </>
            )}
          </ScrollView>
        )}
      </SafeAreaView>

      {/* Open sender profile from invite */}
      {selectedInvite && (
        <MusicianProfileScreen
          musician={getMusicianFromInvite(selectedInvite)}
          onClose={() => setSelectedInvite(null)}
          fromInvite={selectedInvite}
        />
      )}

      {/* Open direct chat from unread message — pass invite if exists */}
      {selectedChat && (
        <DirectChat
          musician={getMusicianFromChat(selectedChat)}
          onClose={() => setSelectedChat(null)}
          fromInvite={receivedInvites.find(inv =>
            inv.fromUid === (selectedChat.members?.find(m => m !== user?.uid) ?? '')
          )}
        />
      )}
    </Animated.View>
  );
}

// ── Topbar ────────────────────────────────────────────────
interface TopbarProps {
  title?:    string;
  showLogo?: boolean;
}

export default function Topbar({ title, showLogo = true }: TopbarProps) {
  const { lang, setLang, receivedInvites, chats } = useAppStore();
  const { t } = useT();
  const [showNotifs, setShowNotifs] = React.useState(false);

  const pendingInvites = receivedInvites.filter(i => i.status === 'pending').length;
  const unreadMessages = chats.reduce((sum, c) => sum + (c.unread || 0), 0);
  const totalBadge = unreadMessages; // only messages, not invites

  return (
    <>
      <View style={styles.topbar}>
        <View style={styles.logoWrap}>
          {showLogo ? (
            <>
              <View style={styles.logoIcon}>
                <Text style={{ fontSize: 18 }}>🎵</Text>
              </View>
              <View>
                <Text style={styles.logoText}>{t('appName')}</Text>
                <Text style={styles.logoSub}>{t('appSub')}</Text>
              </View>
            </>
          ) : (
            <Text style={styles.screenTitle}>{title}</Text>
          )}
        </View>

        <View style={styles.topbarRight}>
          <TouchableOpacity style={styles.tbtn} onPress={() => setShowNotifs(true)}>
            <Text style={{ fontSize: 15 }}>🔔</Text>
            {totalBadge > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{totalBadge > 9 ? '9+' : totalBadge}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.langBtn} onPress={() => setLang(lang === 'az' ? 'ru' : 'az')}>
            <Text style={styles.langText}>{lang.toUpperCase()}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {showNotifs && <NotificationsPanel onClose={() => setShowNotifs(false)} />}
    </>
  );
}

const nc = StyleSheet.create({
  card:     { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 14, padding: 12, marginBottom: 10 },
  top:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ava:      { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.bg3, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border, flexShrink: 0 },
  name:     { fontFamily: Typography.nunito700, fontSize: 14, color: Colors.text, marginBottom: 2 },
  sub:      { fontSize: 11, color: Colors.muted, fontFamily: Typography.nunito400 },
  badge:    { borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, flexShrink: 0 },
  badgeText:{ fontSize: 10, fontFamily: Typography.nunito700 },
  btns:     { flexDirection: 'row', gap: 8, marginTop: 10 },
  btn:      { flex: 1, paddingVertical: 8, borderRadius: 20, alignItems: 'center' },
  btnText:  { fontSize: 12, fontFamily: Typography.nunito700, color: 'white' },
});

const p = StyleSheet.create({
  panel:      { ...StyleSheet.absoluteFillObject, backgroundColor: Colors.bg, zIndex: 200 },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title:      { fontFamily: Typography.playfair700, fontSize: 20, color: Colors.text },
  closeBtn:   { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  closeText:  { fontSize: 16, color: Colors.muted, fontFamily: Typography.nunito700 },
  sectionLabel: { fontSize: 11, color: Colors.muted, fontFamily: Typography.nunito700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginTop: 4 },
  empty:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 30 },
  emptyTitle: { fontFamily: Typography.playfair700, fontSize: 20, color: Colors.text },
  emptyDesc:  { fontSize: 13, color: Colors.muted, textAlign: 'center', lineHeight: 20, fontFamily: Typography.nunito400 },
});

const styles = StyleSheet.create({
  topbar:      { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.bg },
  logoWrap:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoIcon:    { width: 36, height: 36, borderRadius: 10, backgroundColor: '#8b5a00', alignItems: 'center', justifyContent: 'center' },
  logoText:    { fontFamily: Typography.playfair800, fontSize: 20, color: Colors.gold2, letterSpacing: 0.5 },
  logoSub:     { fontSize: 10, color: Colors.muted, letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: Typography.nunito600 },
  screenTitle: { fontFamily: Typography.playfair700, fontSize: 20, color: Colors.text },
  topbarRight: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  tbtn:        { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  badge:       { position: 'absolute', top: -4, right: -4, backgroundColor: Colors.red, borderRadius: 8, paddingHorizontal: 4, paddingVertical: 1, minWidth: 16, alignItems: 'center', borderWidth: 2, borderColor: Colors.bg },
  badgeText:   { color: 'white', fontSize: 9, fontFamily: Typography.nunito700 },
  langBtn:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  langText:    { color: Colors.gold, fontSize: 12, fontFamily: Typography.nunito700, letterSpacing: 0.5 },
});
