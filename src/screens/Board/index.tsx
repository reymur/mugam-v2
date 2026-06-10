import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { useT } from '../../i18n';
import { useAppStore, BoardItem } from '../../store/useAppStore';
import Topbar from '../../components/common/Topbar';
import BottomSheet from '../../components/modals/BottomSheet';

const EVENT_TYPES = ['typeToy','typeKonsert','typeRestoran','typeCekilish','typeDiger'] as const;
const INSTRUMENTS = ['instKaman','instSinger','instGarmon','instTar','instBalaban','instZerb','instGuitar','instPiano','instZurna'] as const;

function PinnedCard({ item }: { item: BoardItem }) {
  const { t } = useT();
  const { showToast } = useAppStore();
  return (
    <View style={styles.pinCard}>
      <View style={styles.pinHighlight} />
      <View style={styles.pinTop}>
        <View style={styles.pinBadge}><Text style={styles.pinBadgeText}>{t('pinBadge')}</Text></View>
        <Text style={styles.pinTime}>2 saat əvvəl</Text>
      </View>
      <Text style={styles.pinTitle}>{item.title}</Text>
      <Text style={styles.pinDesc}>{item.description}</Text>
      <View style={styles.tagsRow}>
        {item.tags.map((tag) => (
          <View key={`${item.id}-${tag}`} style={styles.etagGold}>
            <Text style={styles.etagGoldText}>{tag}</Text>
          </View>
        ))}
      </View>
      <View style={styles.pinFooter}>
        <View style={styles.pinClient}>
          <View style={styles.pinAva}><Text style={{ fontSize: 14 }}>👤</Text></View>
          <View>
            <Text style={styles.pinClientName}>{item.client}</Text>
            <Text style={styles.pinViews}>👁 {item.views} nəfər baxdı</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.applyBtn}
          onPress={() => showToast(t('toastMsgApplied'))}
        >
          <Text style={styles.applyBtnText}>{t('applyBtn')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function BoardCard({ item }: { item: BoardItem }) {
  const { t } = useT();
  const { showToast } = useAppStore();
  const [expanded, setExpanded] = useState(false);

  return (
    <TouchableOpacity
      style={styles.boardCard}
      onPress={() => setExpanded(e => !e)}
      activeOpacity={0.8}
    >
      <View style={styles.boardCardInner}>
        <View style={styles.dateBox}>
          <Text style={styles.dateDay}>{item.day}</Text>
          <Text style={styles.dateMon}>{item.month}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardLoc}>📍 {item.location}</Text>
          <View style={styles.tagsRow}>
            {item.tags.slice(0, 2).map((tag) => (
              <View key={`${item.id}-${tag}`} style={styles.etagGold}>
                <Text style={styles.etagGoldText}>{tag}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.cardMeta}>👁 {item.views} · <Text style={{ color: Colors.green }}>● Aktiv</Text></Text>
        </View>
      </View>
      {expanded && item.description && (
        <Text style={styles.expandedDesc}>{item.description}</Text>
      )}
      <View style={styles.boardCardFooter}>
        <Text style={styles.boardClient}>👤 {item.client}</Text>
        <TouchableOpacity
          style={styles.applyBtnSm}
          onPress={e => { showToast(t('toastMsgApplied')); }}
        >
          <Text style={styles.applyBtnText}>{t('applyBtn')}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function BoardScreen() {
  const { t } = useT();
  const { boardItems, addBoardItem, showToast } = useAppStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [nameVal, setNameVal] = useState('');
  const [dateVal, setDateVal] = useState('');
  const [locVal, setLocVal] = useState('');
  const [timeVal, setTimeVal] = useState('');
  const [descVal, setDescVal] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedInsts, setSelectedInsts] = useState<Set<string>>(new Set());

  const toggleInst = (inst: string) => {
    setSelectedInsts(prev => {
      const next = new Set(prev);
      next.has(inst) ? next.delete(inst) : next.add(inst);
      return next;
    });
  };

  const submit = () => {
    if (!nameVal.trim()) { showToast(t('toastValidName')); return; }
    const newItem: BoardItem = {
      id: `b_${Date.now()}`,
      day: dateVal.split(' ')[0] || '—',
      month: dateVal.split(' ')[1] || '—',
      title: `${selectedType} ${t('boardTitle')}`,
      location: locVal || 'Bakı',
      tags: [selectedType, '✅ Ödənişli'],
      views: 0, active: true,
      client: nameVal,
      description: descVal,
    };
    addBoardItem(newItem);
    setModalVisible(false);
    setNameVal(''); setDateVal(''); setLocVal(''); setTimeVal(''); setDescVal('');
    setSelectedType(''); setSelectedInsts(new Set());
    showToast(t('toastInvPosted'));
  };

  const pinned = boardItems.find(b => b.pinned);
  const rest = boardItems.filter(b => !b.pinned);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.topRow}>
        <Text style={styles.screenTitle}>{t('boardTitle')}</Text>
        <TouchableOpacity style={styles.postBtn} onPress={() => setModalVisible(true)}>
          <Text style={styles.postBtnText}>{t('boardPost')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
        {pinned && <PinnedCard item={pinned} />}
        {rest.map(item => <BoardCard key={item.id} item={item} />)}

        {/* CTA */}
        <TouchableOpacity style={styles.cta} onPress={() => setModalVisible(true)}>
          <Text style={{ fontSize: 32, marginBottom: 8 }}>📣</Text>
          <Text style={styles.ctaTitle}>{t('ctaTitle')}</Text>
          <Text style={styles.ctaDesc}>{t('ctaDesc')}</Text>
        </TouchableOpacity>
      </ScrollView>

      <BottomSheet visible={modalVisible} onClose={() => setModalVisible(false)}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Text style={{ fontSize: 28 }}>📣</Text>
          <Text style={styles.modalTitle}>{t('inviteModalTitle')}</Text>
        </View>

        <Text style={styles.lbl}>{t('invLblName')}</Text>
        <TextInput style={styles.inp} placeholder={t('invPlaceholderName')} placeholderTextColor={Colors.muted} value={nameVal} onChangeText={setNameVal} />

        <Text style={styles.lbl}>{t('invLblType')}</Text>
        <View style={styles.typeRow}>
          {EVENT_TYPES.map(k => (
            <TouchableOpacity key={k} style={[styles.instBtn, selectedType === t(k) && styles.instBtnSel]} onPress={() => setSelectedType(t(k))}>
              <Text style={[styles.instBtnText, selectedType === t(k) && styles.instBtnTextSel]}>{t(k)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.lbl}>{t('invLblDate')}</Text>
        <TextInput style={styles.inp} placeholder={t('invPlaceholderDate')} placeholderTextColor={Colors.muted} value={dateVal} onChangeText={setDateVal} />

        <Text style={styles.lbl}>{t('invLblLoc')}</Text>
        <TextInput style={styles.inp} placeholder={t('invPlaceholderLoc')} placeholderTextColor={Colors.muted} value={locVal} onChangeText={setLocVal} />

        <Text style={styles.lbl}>{t('invLblTime')}</Text>
        <TextInput style={styles.inp} placeholder={t('invPlaceholderTime')} placeholderTextColor={Colors.muted} value={timeVal} onChangeText={setTimeVal} />

        <Text style={styles.lbl}>{t('invLblInst')}</Text>
        <View style={styles.instGrid}>
          {INSTRUMENTS.map(k => (
            <TouchableOpacity key={k} style={[styles.instBtn, selectedInsts.has(t(k)) && styles.instBtnSel]} onPress={() => toggleInst(t(k))}>
              <Text style={[styles.instBtnText, selectedInsts.has(t(k)) && styles.instBtnTextSel]}>{t(k)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.lbl}>{t('invLblDesc')}</Text>
        <TextInput style={[styles.inp, { height: 80 }]} multiline placeholder={t('invPlaceholderDesc')} placeholderTextColor={Colors.muted} value={descVal} onChangeText={setDescVal} />

        <View style={styles.visNotice}>
          <Text style={{ fontSize: 18 }}>👁</Text>
          <Text style={styles.visText}>{t('invVisNotice')}</Text>
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={submit}>
          <Text style={styles.submitBtnText}>{t('invSubmit')}</Text>
        </TouchableOpacity>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  topRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 18, paddingTop: 16, paddingBottom: 10,
  },
  screenTitle: { fontFamily: Typography.playfair700, fontSize: 18, color: Colors.text },
  postBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, backgroundColor: Colors.gold,
  },
  postBtnText: { color: '#1a0e00', fontSize: 12, fontFamily: Typography.nunito700 },

  pinCard: {
    backgroundColor: '#1e1400',
    borderWidth: 2, borderColor: Colors.gold,
    borderRadius: 18, padding: 16, marginBottom: 14,
    overflow: 'hidden',
  },
  pinHighlight: {
    position: 'absolute', top: 0, right: 0,
    width: 150, height: 150, borderRadius: 75,
    backgroundColor: 'rgba(212,160,60,0.15)',
  },
  pinTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  pinBadge: { backgroundColor: Colors.gold, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  pinBadgeText: { color: '#1a0e00', fontSize: 10, fontFamily: Typography.nunito700 },
  pinTime: { fontSize: 11, color: Colors.muted, fontFamily: Typography.nunito400 },
  pinTitle: { fontFamily: Typography.playfair700, fontSize: 17, color: Colors.text, marginBottom: 6 },
  pinDesc: { fontSize: 13, color: '#c0a870', lineHeight: 20, marginBottom: 12, fontFamily: Typography.nunito400 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  etagGold: { backgroundColor: 'rgba(212,160,60,0.12)', borderWidth: 1, borderColor: 'rgba(212,160,60,0.25)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  etagGoldText: { color: Colors.gold, fontSize: 10, fontFamily: Typography.nunito700 },
  pinFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pinClient: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pinAva: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.bg3, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  pinClientName: { fontSize: 13, fontFamily: Typography.nunito700, color: Colors.text },
  pinViews: { fontSize: 11, color: Colors.muted, fontFamily: Typography.nunito400 },
  applyBtn: { backgroundColor: Colors.gold, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  applyBtnSm: { backgroundColor: Colors.gold, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  applyBtnText: { color: '#1a0e00', fontSize: 12, fontFamily: Typography.nunito700 },

  boardCard: {
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 18, padding: 16, marginBottom: 12,
  },
  boardCardInner: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  dateBox: {
    width: 48, height: 56,
    backgroundColor: Colors.gold, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  dateDay: { fontFamily: Typography.playfair800, fontSize: 18, color: '#1a0e00', lineHeight: 22 },
  dateMon: { fontSize: 9, fontFamily: Typography.nunito700, color: '#1a0e00', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardTitle: { fontFamily: Typography.playfair700, fontSize: 15, color: Colors.text, marginBottom: 4 },
  cardLoc: { fontSize: 12, color: Colors.muted, marginBottom: 6, fontFamily: Typography.nunito400 },
  cardMeta: { fontSize: 12, color: Colors.muted, marginTop: 4, fontFamily: Typography.nunito400 },
  expandedDesc: { fontSize: 13, color: '#b0a080', lineHeight: 20, marginTop: 10, fontFamily: Typography.nunito400 },
  boardCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.border },
  boardClient: { fontSize: 12, color: Colors.muted, fontFamily: Typography.nunito400 },

  cta: {
    borderWidth: 1, borderColor: Colors.border, borderStyle: "dashed",
    borderRadius: 18, padding: 20, alignItems: 'center', marginTop: 4,
  },
  ctaTitle: { fontFamily: Typography.playfair700, fontSize: 16, color: Colors.text, marginBottom: 4 },
  ctaDesc: { fontSize: 13, color: Colors.muted, textAlign: 'center', fontFamily: Typography.nunito400 },

  // Modal
  modalTitle: { fontFamily: Typography.playfair700, fontSize: 20, color: Colors.text },
  lbl: { fontSize: 12, color: Colors.muted, fontFamily: Typography.nunito700, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 5 },
  inp: {
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    color: Colors.text, fontSize: 14, fontFamily: Typography.nunito400, marginBottom: 10,
  },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  instGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  instBtn: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
    backgroundColor: Colors.bg3, borderWidth: 1, borderColor: Colors.border,
  },
  instBtnSel: { backgroundColor: 'rgba(212,160,60,0.15)', borderColor: Colors.gold },
  instBtnText: { color: Colors.muted, fontSize: 12, fontFamily: Typography.nunito700 },
  instBtnTextSel: { color: Colors.gold },
  visNotice: {
    backgroundColor: Colors.goldDim, borderWidth: 1, borderColor: 'rgba(212,160,60,0.25)',
    borderRadius: 12, padding: 12, marginBottom: 14, flexDirection: 'row', gap: 10,
  },
  visText: { flex: 1, fontSize: 12, color: Colors.muted, lineHeight: 18, fontFamily: Typography.nunito400 },
  submitBtn: { backgroundColor: Colors.gold, borderRadius: 24, paddingVertical: 14, alignItems: 'center', marginBottom: 8 },
  submitBtnText: { color: '#1a0e00', fontSize: 14, fontFamily: Typography.nunito700 },
});
