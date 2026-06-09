import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Animated, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors }     from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { useAppStore } from '../../store/useAppStore';
import type { Agreement } from '../../store/useAppStore';

const SCREEN_W = Dimensions.get('window').width;

// ── Agreement Detail Screen ───────────────────────────────
function AgreementDetail({ agreement, onClose }: { agreement: Agreement; onClose: () => void }) {
  const { user } = useAppStore();
  const slideAnim = React.useRef(new Animated.Value(SCREEN_W)).current;

  React.useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0, damping: 26, stiffness: 300, useNativeDriver: true,
    }).start();
  }, []);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_W, duration: 220, useNativeDriver: true,
    }).start(onClose);
  };

  const isFrom    = agreement.fromUid === user?.uid;
  const otherName = isFrom ? agreement.toName : agreement.fromName;
  const myRole    = isFrom ? 'Təklif edən' : 'Qəbul edən';
  const otherRole = isFrom ? 'Qəbul edən' : 'Təklif edən';

  const date = agreement.createdAt?.toDate
    ? agreement.createdAt.toDate().toLocaleDateString('az-AZ', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
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
            <View style={d.statusBadge}>
              <Text style={d.statusText}>✅ Razılaşma qəbul edildi</Text>
            </View>
            <Text style={d.dateText}>{date}</Text>
          </View>

          {/* Parties */}
          <View style={d.card}>
            <Text style={d.cardTitle}>Tərəflər</Text>
            <View style={d.party}>
              <View style={d.partyAva}><Text style={{ fontSize: 22 }}>👤</Text></View>
              <View>
                <Text style={d.partyName}>{user?.displayName ?? 'Siz'}</Text>
                <Text style={d.partyRole}>{myRole}</Text>
              </View>
            </View>
            <View style={d.divider} />
            <View style={d.party}>
              <View style={d.partyAva}><Text style={{ fontSize: 22 }}>👤</Text></View>
              <View>
                <Text style={d.partyName}>{otherName}</Text>
                <Text style={d.partyRole}>{otherRole}</Text>
              </View>
            </View>
          </View>

          {/* Agreement details */}
          <View style={d.card}>
            <Text style={d.cardTitle}>Müqavilə məlumatları</Text>
            <View style={d.row}>
              <Text style={d.rowLabel}>Müqavilə №</Text>
              <Text style={d.rowValue}>{agreement.id.slice(0, 8).toUpperCase()}</Text>
            </View>
            <View style={d.row}>
              <Text style={d.rowLabel}>Tarix</Text>
              <Text style={d.rowValue}>{date}</Text>
            </View>
            <View style={d.row}>
              <Text style={d.rowLabel}>Status</Text>
              <Text style={[d.rowValue, { color: Colors.green }]}>✅ Aktiv</Text>
            </View>
          </View>

          {/* Note */}
          <View style={d.noteCard}>
            <Text style={d.noteText}>
              Bu müqavilə {agreement.fromName} və {agreement.toName} arasında
              qarşılıqlı razılıq əsasında bağlanmışdır.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Animated.View>
  );
}

// ── Agreements List Screen ────────────────────────────────
export default function AgreementsScreen() {
  const { agreements, user } = useAppStore();
  const [selected, setSelected] = useState<Agreement | null>(null);

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>📋 Müqavilələr</Text>
        <Text style={s.subtitle}>{agreements.length} müqavilə</Text>
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
          agreements.map(ag => {
            const isFrom    = ag.fromUid === user?.uid;
            const otherName = isFrom ? ag.toName : ag.fromName;
            const date = ag.createdAt?.toDate
              ? ag.createdAt.toDate().toLocaleDateString('az-AZ', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })
              : '';

            return (
              <TouchableOpacity
                key={ag.id}
                style={s.card}
                onPress={() => setSelected(ag)}
                activeOpacity={0.85}
              >
                <View style={s.cardLeft}>
                  <View style={s.cardAva}>
                    <Text style={{ fontSize: 22 }}>📋</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardName}>{otherName}</Text>
                    <Text style={s.cardRole}>
                      {isFrom ? 'Siz təklif etdiniz' : 'Sizə təklif edildi'}
                    </Text>
                    <Text style={s.cardDate}>{date}</Text>
                  </View>
                </View>
                <View style={s.cardStatus}>
                  <Text style={s.cardStatusText}>✅</Text>
                  <Text style={s.cardArrow}>›</Text>
                </View>
              </TouchableOpacity>
            );
          })
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
  statusBadge: { backgroundColor: 'rgba(39,174,96,0.15)', borderWidth: 1, borderColor: Colors.green, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  statusText:  { color: Colors.green, fontSize: 15, fontFamily: Typography.nunito700 },
  dateText:    { color: Colors.muted, fontSize: 12, fontFamily: Typography.nunito400 },
  card:        { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 16, padding: 16, gap: 12 },
  cardTitle:   { fontFamily: Typography.playfair700, fontSize: 16, color: Colors.text, marginBottom: 4 },
  party:       { flexDirection: 'row', alignItems: 'center', gap: 12 },
  partyAva:    { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.bg3, alignItems: 'center', justifyContent: 'center' },
  partyName:   { fontFamily: Typography.nunito700, fontSize: 15, color: Colors.text },
  partyRole:   { fontSize: 12, color: Colors.gold, fontFamily: Typography.nunito600 },
  divider:     { height: 1, backgroundColor: Colors.border },
  row:         { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowLabel:    { fontSize: 13, color: Colors.muted, fontFamily: Typography.nunito400 },
  rowValue:    { fontSize: 13, color: Colors.text, fontFamily: Typography.nunito700 },
  noteCard:    { backgroundColor: Colors.bg3, borderRadius: 12, padding: 14 },
  noteText:    { fontSize: 13, color: Colors.muted, lineHeight: 20, fontFamily: Typography.nunito400 },
});

const s = StyleSheet.create({
  screen:      { flex: 1, backgroundColor: Colors.bg },
  header:      { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 8 },
  title:       { fontFamily: Typography.playfair700, fontSize: 22, color: Colors.text },
  subtitle:    { fontSize: 12, color: Colors.muted, fontFamily: Typography.nunito400, marginTop: 2 },
  list:        { padding: 14, gap: 10, paddingBottom: 20 },
  empty:       { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyEmoji:  { fontSize: 52 },
  emptyTitle:  { fontFamily: Typography.playfair700, fontSize: 20, color: Colors.text },
  emptyDesc:   { fontSize: 13, color: Colors.muted, textAlign: 'center', lineHeight: 20, fontFamily: Typography.nunito400, paddingHorizontal: 20 },
  card:        { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardLeft:    { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  cardAva:     { width: 46, height: 46, borderRadius: 14, backgroundColor: Colors.bg3, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  cardName:    { fontFamily: Typography.playfair700, fontSize: 15, color: Colors.text, marginBottom: 2 },
  cardRole:    { fontSize: 12, color: Colors.gold, fontFamily: Typography.nunito600, marginBottom: 2 },
  cardDate:    { fontSize: 11, color: Colors.muted, fontFamily: Typography.nunito400 },
  cardStatus:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardStatusText: { fontSize: 18 },
  cardArrow:   { fontSize: 20, color: Colors.muted },
});
