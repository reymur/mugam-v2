import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, StyleSheet, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { useT } from '../../i18n';
import { useAppStore, GigItem } from '../../store/useAppStore';
import BottomSheet from '../../components/modals/BottomSheet';

const EVENT_TYPES = ['typeToy','typeKonsert','typeRestoran','typeKorporativ','typeFilm','typeDiger'] as const;
const INSTRUMENTS = ['instKaman','instSinger','instGarmon','instTar','instBalaban','instZerb','instGuitar','instPiano','instZurna'] as const;
const FILTERS = ['filterAll','typeToy','typeKonsert','typeRestoran','typeKorporativ','typeFilm'] as const;

// ── Gig Detail Modal ──────────────────────────────────────
function GigDetailModal({ gig, visible, onClose }: { gig: GigItem | null; visible: boolean; onClose: () => void }) {
  const { t } = useT();
  const { showToast } = useAppStore();
  if (!gig) return null;
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={styles.detailTitle}>{gig.title}</Text>
      <Text style={styles.detailRow}>💰 {gig.price}</Text>
      <Text style={styles.detailRow}>📍 {gig.location}</Text>
      {gig.date && <Text style={styles.detailRow}>📅 {gig.date}</Text>}
      <Text style={styles.detailRow}>👤 {gig.client}</Text>
      <Text style={styles.detailDesc}>{gig.description}</Text>
      <View style={styles.detailTags}>
        {gig.tags.map((tag, i) => (
          <View key={`tag-${i}`} style={styles.etagGold}>
            <Text style={styles.etagGoldText}>{tag}</Text>
          </View>
        ))}
      </View>
      <TouchableOpacity
        style={styles.submitBtn}
        onPress={() => { onClose(); showToast(t('toastApplied')); }}
      >
        <Text style={styles.submitBtnText}>{t('gigDetailApply')}</Text>
      </TouchableOpacity>
    </BottomSheet>
  );
}

// ── Gig Card ──────────────────────────────────────────────
function GigCard({ gig, onPress }: { gig: GigItem; onPress: () => void }) {
  const { t } = useT();
  const { applyGig, showToast } = useAppStore();

  const handleApply = () => {
    if (gig.applied) { showToast(t('toastAlreadyApplied')); return; }
    applyGig(gig.id);
    showToast(t('toastApplied'));
  };

  return (
    <TouchableOpacity
      style={[styles.gigCard, gig.featured && styles.gigCardFeatured]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.gigTop}>
        <View style={styles.gigBadges}>
          {gig.eventType && (
            <View style={styles.etagGold}><Text style={styles.etagGoldText}>{gig.eventType}</Text></View>
          )}
          {gig.hot && (
            <View style={styles.hotBadge}><Text style={styles.hotBadgeText}>🔥 HOT</Text></View>
          )}
        </View>
        <Text style={styles.gigTime}>Az əvvəl</Text>
      </View>
      <Text style={styles.gigTitle}>{gig.title}</Text>
      <Text style={styles.gigClient}>👤 {gig.client}</Text>
      <Text style={styles.gigDesc} numberOfLines={2}>{gig.description}</Text>
      <View style={styles.gigTags}>
        {gig.tags.map((tag, i) => (
          <View key={`tag-${i}`} style={styles.etagGold}><Text style={styles.etagGoldText}>{tag}</Text></View>
        ))}
      </View>
      <View style={styles.gigFooter}>
        <Text style={styles.gigPrice}>{gig.price}</Text>
        <Text style={styles.gigApplies}>👁 {gig.views} · 🙋 {gig.applications}{t('applyCount')}</Text>
      </View>
      <View style={styles.gigBtns}>
        <TouchableOpacity
          style={[styles.applyBtn, gig.applied && styles.applyBtnApplied]}
          onPress={handleApply}
        >
          <Text style={styles.applyBtnText}>{gig.applied ? t('appliedGig') : t('applyGig')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.detailBtn} onPress={onPress}>
          <Text style={styles.detailBtnText}>ℹ️</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ── Gigs Screen ───────────────────────────────────────────
export default function GigsScreen() {
  const { t } = useT();
  const { gigs, addGig, showToast } = useAppStore();
  const [postModal, setPostModal] = useState(false);
  const [detailGig, setDetailGig] = useState<GigItem | null>(null);
  const [activeFilter, setActiveFilter] = useState('');

  // Post form
  const [clientVal, setClientVal] = useState('');
  const [titleVal, setTitleVal] = useState('');
  const [dateVal, setDateVal]     = useState('');
  const [locVal, setLocVal]       = useState('');
  const [payVal, setPayVal]       = useState('');
  const [descVal, setDescVal]     = useState('');
  const [selType, setSelType]     = useState('');
  const [selInsts, setSelInsts]   = useState<Set<string>>(new Set());

  const toggleInst = (i: string) => {
    setSelInsts(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });
  };

  const submitPost = () => {
    if (!titleVal.trim()) { showToast(t('toastValidTitle')); return; }
    addGig({
      id: `g_${Date.now()}`,
      title: titleVal, client: clientVal || 'Müştəri',
      location: locVal || 'Bakı', date: dateVal,
      price: payVal || 'Razılaşma',
      description: descVal,
      tags: Array.from(selInsts),
      views: 0, applications: 0,
      eventType: selType,
    });
    setPostModal(false);
    setTitleVal(''); setClientVal(''); setDateVal(''); setLocVal(''); setPayVal(''); setDescVal('');
    setSelType(''); setSelInsts(new Set());
    showToast(t('toastGigPosted'));
  };

  const filtered = gigs.filter(g => {
    if (!activeFilter) return true;
    return g.eventType?.includes(activeFilter.split(' ').pop() ?? '');
  });

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.topRow}>
        <Text style={styles.screenTitle}>{t('gigsTitle')}</Text>
        <TouchableOpacity style={styles.postBtn} onPress={() => setPostModal(true)}>
          <Text style={styles.postBtnText}>{t('gigsPost')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={{ paddingHorizontal: 14, gap: 8 }}
      >
        {FILTERS.map(f => {
          const label = t(f as Parameters<typeof t>[0]);
          const val = f === 'filterAll' ? '' : label;
          return (
            <TouchableOpacity
              key={f}
              style={[styles.ftag, activeFilter === val && styles.ftagActive]}
              onPress={() => setActiveFilter(val)}
            >
              <Text style={[styles.ftagText, activeFilter === val && styles.ftagTextActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
        {filtered.map(g => (
          <GigCard key={g.id} gig={g} onPress={() => setDetailGig(g)} />
        ))}
        <TouchableOpacity style={styles.cta} onPress={() => setPostModal(true)}>
          <Text style={{ fontSize: 32, marginBottom: 8 }}>🎼</Text>
          <Text style={styles.ctaTitle}>{t('gigCtaTitle')}</Text>
          <Text style={styles.ctaDesc}>{t('gigCtaDesc')}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Post Gig Modal */}
      <BottomSheet visible={postModal} onClose={() => setPostModal(false)}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Text style={{ fontSize: 26 }}>🎼</Text>
          <Text style={styles.modalTitle}>{t('gigModalTitle')}</Text>
        </View>
        <Text style={styles.lbl}>{t('gigLblClient')}</Text>
        <TextInput style={styles.inp} placeholder={t('gigPlaceholderClient')} placeholderTextColor={Colors.muted} value={clientVal} onChangeText={setClientVal} />
        <Text style={styles.lbl}>{t('gigLblType')}</Text>
        <View style={styles.instGrid}>
          {EVENT_TYPES.map(k => (
            <TouchableOpacity key={k} style={[styles.instBtn, selType === t(k) && styles.instBtnSel]} onPress={() => setSelType(t(k))}>
              <Text style={[styles.instBtnText, selType === t(k) && styles.instBtnTextSel]}>{t(k)}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.lbl}>{t('gigLblNeed')}</Text>
        <View style={styles.instGrid}>
          {INSTRUMENTS.map(k => (
            <TouchableOpacity key={k} style={[styles.instBtn, selInsts.has(t(k)) && styles.instBtnSel]} onPress={() => toggleInst(t(k))}>
              <Text style={[styles.instBtnText, selInsts.has(t(k)) && styles.instBtnTextSel]}>{t(k)}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.lbl}>{t('gigLblDate')}</Text>
        <TextInput style={styles.inp} placeholder={t('gigPlaceholderDate')} placeholderTextColor={Colors.muted} value={dateVal} onChangeText={setDateVal} />
        <Text style={styles.lbl}>{t('gigLblLoc')}</Text>
        <TextInput style={styles.inp} placeholder={t('gigPlaceholderLoc')} placeholderTextColor={Colors.muted} value={locVal} onChangeText={setLocVal} />
        <Text style={styles.lbl}>{t('gigLblPay')}</Text>
        <TextInput style={styles.inp} placeholder={t('gigPlaceholderPay')} placeholderTextColor={Colors.muted} value={payVal} onChangeText={setPayVal} keyboardType="numeric" />
        <Text style={styles.lbl}>{t('gigLblDesc')}</Text>
        <TextInput style={[styles.inp, { height: 80 }]} multiline placeholder={t('gigPlaceholderDesc')} placeholderTextColor={Colors.muted} value={descVal} onChangeText={setDescVal} />
        <TouchableOpacity style={styles.submitBtn} onPress={submitPost}>
          <Text style={styles.submitBtnText}>{t('gigSubmit')}</Text>
        </TouchableOpacity>
      </BottomSheet>

      {/* Detail Modal */}
      <GigDetailModal gig={detailGig} visible={!!detailGig} onClose={() => setDetailGig(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingTop: 16, paddingBottom: 10 },
  screenTitle: { fontFamily: Typography.playfair700, fontSize: 18, color: Colors.text },
  postBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: Colors.gold },
  postBtnText: { color: '#1a0e00', fontSize: 12, fontFamily: Typography.nunito700 },
  filterScroll: { flexGrow: 0, marginBottom: 8 },
  ftag: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: Colors.border },
  ftagActive: { backgroundColor: Colors.gold, borderColor: Colors.gold },
  ftagText: { color: Colors.muted, fontSize: 12, fontFamily: Typography.nunito700 },
  ftagTextActive: { color: '#1a0e00' },

  gigCard: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 20, padding: 16, marginBottom: 12 },
  gigCardFeatured: { backgroundColor: '#1a1200', borderColor: Colors.gold, borderWidth: 2 },
  gigTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  gigBadges: { flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' },
  hotBadge: { backgroundColor: Colors.red, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  hotBadgeText: { color: 'white', fontSize: 10, fontFamily: Typography.nunito700 },
  gigTime: { fontSize: 11, color: Colors.muted, fontFamily: Typography.nunito400 },
  gigTitle: { fontFamily: Typography.playfair700, fontSize: 16, color: Colors.text, marginBottom: 4 },
  gigClient: { fontSize: 12, color: Colors.muted, marginBottom: 8, fontFamily: Typography.nunito400 },
  gigDesc: { fontSize: 13, color: '#b0a070', lineHeight: 20, marginBottom: 10, fontFamily: Typography.nunito400 },
  gigTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 10 },
  etagGold: { backgroundColor: 'rgba(212,160,60,0.12)', borderWidth: 1, borderColor: 'rgba(212,160,60,0.25)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  etagGoldText: { color: Colors.gold, fontSize: 10, fontFamily: Typography.nunito700 },
  gigFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  gigPrice: { fontSize: 16, fontFamily: Typography.nunito700, color: Colors.gold2 },
  gigApplies: { fontSize: 11, color: Colors.muted, fontFamily: Typography.nunito400 },
  gigBtns: { flexDirection: 'row', gap: 8 },
  applyBtn: { flex: 1, backgroundColor: Colors.gold, borderRadius: 24, paddingVertical: 10, alignItems: 'center' },
  applyBtnApplied: { backgroundColor: Colors.bg3, opacity: 0.7 },
  applyBtnText: { color: '#1a0e00', fontSize: 13, fontFamily: Typography.nunito700 },
  detailBtn: { width: 44, borderRadius: 24, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  detailBtnText: { fontSize: 16 },

  cta: { borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed', borderRadius: 18, padding: 20, alignItems: 'center', marginTop: 4 },
  ctaTitle: { fontFamily: Typography.playfair700, fontSize: 16, color: Colors.text, marginBottom: 4 },
  ctaDesc: { fontSize: 13, color: Colors.muted, textAlign: 'center', fontFamily: Typography.nunito400 },

  detailTitle: { fontFamily: Typography.playfair700, fontSize: 20, color: Colors.text, marginBottom: 12 },
  detailRow: { fontSize: 14, color: Colors.text, fontFamily: Typography.nunito600, marginBottom: 6 },
  detailDesc: { fontSize: 13, color: Colors.muted, lineHeight: 20, marginVertical: 10, fontFamily: Typography.nunito400 },
  detailTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },

  modalTitle: { fontFamily: Typography.playfair700, fontSize: 20, color: Colors.text },
  lbl: { fontSize: 12, color: Colors.muted, fontFamily: Typography.nunito700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 },
  inp: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: Colors.text, fontSize: 14, fontFamily: Typography.nunito400, marginBottom: 10 },
  instGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  instBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: Colors.bg3, borderWidth: 1, borderColor: Colors.border },
  instBtnSel: { backgroundColor: 'rgba(212,160,60,0.15)', borderColor: Colors.gold },
  instBtnText: { color: Colors.muted, fontSize: 12, fontFamily: Typography.nunito700 },
  instBtnTextSel: { color: Colors.gold },
  submitBtn: { backgroundColor: Colors.gold, borderRadius: 24, paddingVertical: 14, alignItems: 'center', marginBottom: 8 },
  submitBtnText: { color: '#1a0e00', fontSize: 14, fontFamily: Typography.nunito700 },
});
