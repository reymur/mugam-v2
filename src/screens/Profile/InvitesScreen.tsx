import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Colors }     from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { useAppStore } from '../../store/useAppStore';
import type { Invite, Musician } from '../../store/useAppStore';

type Tab = 'received' | 'sent';

// ── Build musician object from invite ─────────────────────
function musicianFromInvite(invite: Invite, type: Tab, musicians: Musician[]): Musician {
  const uid = type === 'received' ? invite.fromUid : invite.musicianId;
  const found = musicians.find(m => (m.uid ?? m.id) === uid);
  if (found) return found;
  return {
    id:         uid,
    uid:        uid,
    name:       type === 'received' ? invite.fromName       : invite.musicianName,
    emoji:      type === 'received' ? '👤'                  : invite.musicianEmoji,
    instrument: type === 'received' ? ''                    : invite.musicianInst,
    city:       type === 'received' ? (invite.fromCity ?? ''): '',
    rating:     5,
    reviews:    0,
  };
}

// ── Invite Card ───────────────────────────────────────────
function InviteCard({
  invite,
  type,
  onPress,
}: {
  invite:  Invite;
  type:    Tab;
  onPress: () => void;
}) {
  const { updateInviteStatus, cancelInvite, showToast } = useAppStore();
  const [loading, setLoading] = useState(false);

  const statusColor = invite.status === 'accepted' ? Colors.green
    : invite.status === 'declined' ? Colors.red : Colors.gold;
  const statusText  = invite.status === 'accepted' ? '✅ Qəbul edildi'
    : invite.status === 'declined' ? '❌ Rədd edildi' : '🔔 Gözləyir';

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.85}>
      <View style={s.top}>
        <View style={s.ava}>
          <Text style={{ fontSize: 20 }}>
            {type === 'received' ? '👤' : invite.musicianEmoji}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.name} numberOfLines={1}>
            {type === 'received' ? invite.fromName : invite.musicianName}
          </Text>
          <Text style={s.sub}>
            {type === 'received'
              ? (invite.fromCity ? `📍 ${invite.fromCity}` : 'Muğam Club üzvü')
              : invite.musicianInst}
          </Text>
          <Text style={s.time}>{invite.createdAtStr ?? 'Az əvvəl'}</Text>
        </View>
        <View style={[s.badge, { borderColor: statusColor, backgroundColor: `${statusColor}22` }]}>
          <Text style={[s.badgeText, { color: statusColor }]}>{statusText}</Text>
        </View>
      </View>

      {/* Action buttons — stop propagation so card onPress doesn't fire */}
      {invite.status === 'pending' && (
        <View style={s.btns}>
          {type === 'received' ? (
            <>
              <TouchableOpacity
                style={[s.btn, { backgroundColor: Colors.green }]}
                disabled={loading}
                onPress={async (e) => {
                  setLoading(true);
                  await updateInviteStatus(invite.id, 'accepted').catch(() => {});
                  showToast(`✅ ${invite.fromName} — dəvəti qəbul etdiniz!`);
                  setLoading(false);
                }}
              >
                {loading
                  ? <ActivityIndicator color="white" size="small" />
                  : <Text style={s.btnText}>✅ Qəbul Et</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.red }]}
                disabled={loading}
                onPress={async () => {
                  setLoading(true);
                  await updateInviteStatus(invite.id, 'declined').catch(() => {});
                  showToast('❌ Rədd edildi');
                  setLoading(false);
                }}
              >
                <Text style={[s.btnText, { color: Colors.red }]}>❌ Rədd Et</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[s.btn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.red }]}
              disabled={loading}
              onPress={async () => {
                setLoading(true);
                await cancelInvite(invite.musicianId).catch(() => {});
                showToast(`❌ ${invite.musicianName} — dəvət ləğv edildi`);
                setLoading(false);
              }}
            >
              {loading
                ? <ActivityIndicator color={Colors.red} size="small" />
                : <Text style={[s.btnText, { color: Colors.red }]}>🗑 Ləğv Et</Text>
              }
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── Invites Screen ────────────────────────────────────────
export default function InvitesScreen({
  onBack,
  onOpenMusician,
}: {
  onBack?: () => void;
  onOpenMusician?: (m: Musician) => void;
}) {
  const { receivedInvites, myInvites, musicians } = useAppStore();
  const [activeTab, setActiveTab] = useState<Tab>('received');

  const pendingCount = receivedInvites.filter(i => i.status === 'pending').length;
  const data = activeTab === 'received' ? receivedInvites : myInvites;

  return (
    <View>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={onBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={s.backText}>← Geri</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>📨 Dəvətlər</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        <TouchableOpacity
          style={[s.tab, activeTab === 'received' && s.tabActive]}
          onPress={() => setActiveTab('received')}
        >
          <Text style={[s.tabText, activeTab === 'received' && s.tabTextActive]}>
            📥 Gələnlər{pendingCount > 0 ? ` (${pendingCount})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tab, activeTab === 'sent' && s.tabActive]}
          onPress={() => setActiveTab('sent')}
        >
          <Text style={[s.tabText, activeTab === 'sent' && s.tabTextActive]}>
            📤 Göndərilənlər ({myInvites.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {data.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyEmoji}>{activeTab === 'received' ? '📭' : '📤'}</Text>
          <Text style={s.emptyTitle}>
            {activeTab === 'received' ? 'Hələ dəvət yoxdur' : 'Hələ dəvət göndərməmisiniz'}
          </Text>
          <Text style={s.emptyDesc}>
            {activeTab === 'received'
              ? 'Kimsə sizi tədbirə dəvət etdikdə burada görünəcək'
              : 'Musiqiçilərin kartlarındakı "Dəvət Et" düyməsini basın'}
          </Text>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {data.map(item => (
            <InviteCard
              key={item.id}
              invite={item}
              type={activeTab}
              onPress={() => onOpenMusician?.(
                musicianFromInvite(item, activeTab, musicians)
              )}
            />
          ))}
        </View>
      )}

    </View>
  );
}

const s = StyleSheet.create({
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, marginBottom: 6 },
  backBtn:     { paddingVertical: 6, paddingHorizontal: 2 },
  backText:    { color: Colors.gold, fontSize: 14, fontFamily: Typography.nunito700 },
  headerTitle: { fontFamily: Typography.playfair700, fontSize: 16, color: Colors.text },
  tabs:        { flexDirection: 'row', backgroundColor: Colors.bg3, borderRadius: 14, padding: 4, marginBottom: 14, borderWidth: 1, borderColor: Colors.border },
  tab:         { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
  tabActive:   { backgroundColor: Colors.gold },
  tabText:     { fontSize: 12, fontFamily: Typography.nunito700, color: Colors.muted },
  tabTextActive: { color: '#1a0e00' },
  card:        { backgroundColor: Colors.bg3, borderWidth: 1, borderColor: Colors.border, borderRadius: 14, padding: 13 },
  top:         { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ava:         { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border, flexShrink: 0 },
  name:        { fontFamily: Typography.nunito700, fontSize: 14, color: Colors.text, marginBottom: 2 },
  sub:         { fontSize: 11, color: Colors.gold, fontFamily: Typography.nunito600 },
  time:        { fontSize: 10, color: Colors.muted, fontFamily: Typography.nunito400, marginTop: 2 },
  badge:       { borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, flexShrink: 0 },
  badgeText:   { fontSize: 10, fontFamily: Typography.nunito700 },
  btns:        { flexDirection: 'row', gap: 8, marginTop: 10 },
  btn:         { flex: 1, paddingVertical: 9, borderRadius: 20, alignItems: 'center' },
  btnText:     { fontSize: 12, fontFamily: Typography.nunito700, color: 'white' },
  empty:       { alignItems: 'center', paddingTop: 40, paddingHorizontal: 20, gap: 8 },
  emptyEmoji:  { fontSize: 44 },
  emptyTitle:  { fontFamily: Typography.playfair700, fontSize: 16, color: Colors.text, textAlign: 'center' },
  emptyDesc:   { fontSize: 12, color: Colors.muted, textAlign: 'center', lineHeight: 18, fontFamily: Typography.nunito400 },
});
