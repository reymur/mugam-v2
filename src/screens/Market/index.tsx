import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, StyleSheet, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { useT } from '../../i18n';
import { useAppStore, MarketItem } from '../../store/useAppStore';
import BottomSheet from '../../components/modals/BottomSheet';

const CAT_FILTERS = ['mfAll','mfInst','mfAcc','mfTech','mfNote','mfCloth','mfOther'] as const;
const CATEGORIES  = ['mfInst','mfAcc','mfTech','mfNote','mfCloth','mfOther'] as const;
const CONDITIONS  = [
  { key: 'condNew',  val: 'new'      as const },
  { key: 'condLike', val: 'like-new' as const },
  { key: 'condGood', val: 'good'     as const },
  { key: 'condUsed', val: 'used'     as const },
] as const;

function condColor(c: string) {
  if (c === 'new' || c === 'like-new') return Colors.green;
  if (c === 'good') return Colors.gold;
  return Colors.muted;
}

function ItemCard({ item, onPress }: { item: MarketItem; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.mktItem} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.mktImg}><Text style={{ fontSize: 42 }}>{item.emoji}</Text></View>
      <View style={styles.mktBody}>
        <Text style={styles.mktName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.mktPrice}>{item.price} AZN</Text>
        <Text style={[styles.mktCond, { color: condColor(item.condition) }]}>✦ {item.condition}</Text>
        <Text style={styles.mktLoc}>📍 {item.city}</Text>
      </View>
    </TouchableOpacity>
  );
}

function ItemDetailSheet({ item, visible, onClose }: { item: MarketItem | null; visible: boolean; onClose: () => void }) {
  const { t } = useT();
  const { showToast } = useAppStore();
  if (!item) return null;
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={{ flexDirection: 'row', gap: 14, marginBottom: 14 }}>
        <View style={styles.detailEmoji}><Text style={{ fontSize: 36 }}>{item.emoji}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.detailName}>{item.name}</Text>
          <Text style={styles.detailPrice}>{item.price} AZN</Text>
          <Text style={[styles.detailCond, { color: condColor(item.condition) }]}>✦ {item.condition}</Text>
          <Text style={styles.detailCity}>📍 {item.city}</Text>
        </View>
      </View>
      <View style={styles.sellerRow}>
        <View style={styles.sellerAva}><Text style={{ fontSize: 18 }}>👤</Text></View>
        <Text style={styles.sellerName}>{item.seller}</Text>
      </View>
      <Text style={styles.detailDesc}>{item.description}</Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity style={[styles.actionBtn, { flex: 1 }]} onPress={() => showToast('📞 Əlaqə...')}>
          <Text style={styles.actionBtnText}>{t('itemContact')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtnGold, { flex: 1 }]} onPress={() => { onClose(); showToast('✉️ Mesaj açıldı'); }}>
          <Text style={styles.actionBtnGoldText}>{t('itemMessage')}</Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

export default function MarketScreen() {
  const { t } = useT();
  const { marketItems, addMarketItem, showToast } = useAppStore();
  const [sellModal, setSellModal]  = useState(false);
  const [detailItem, setDetailItem] = useState<MarketItem | null>(null);
  const [activeFilter, setActiveFilter] = useState('');

  // Sell form
  const [nameVal, setNameVal]   = useState('');
  const [priceVal, setPriceVal] = useState('');
  const [cityVal, setCityVal]   = useState('');
  const [descVal, setDescVal]   = useState('');
  const [selCat, setSelCat]     = useState('');
  const [selCond, setSelCond]   = useState<typeof CONDITIONS[number]['val'] | ''>('');

  const submit = () => {
    if (!nameVal.trim() || !priceVal.trim()) { showToast(t('toastValidNamePrice')); return; }
    addMarketItem({
      id: `m_${Date.now()}`,
      name: nameVal,
      emoji: selCat.includes('Alət') ? '🎻' : selCat.includes('Avadanlıq') ? '🎛️' : selCat.includes('Aksesuar') ? '🎒' : selCat.includes('Not') ? '📜' : selCat.includes('Geyim') ? '👔' : '📦',
      price: parseFloat(priceVal) || 0,
      condition: (selCond || 'good') as MarketItem['condition'],
      city: cityVal || 'Bakı',
      seller: 'Siz',
      description: descVal,
    });
    setSellModal(false);
    setNameVal(''); setPriceVal(''); setCityVal(''); setDescVal('');
    setSelCat(''); setSelCond('');
    showToast(t('toastSellPosted'));
  };

  const featured = marketItems.find(m => m.featured);
  const grid = marketItems.filter(m => !m.featured);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.topRow}>
        <Text style={styles.screenTitle}>{t('mktTitle')}</Text>
        <TouchableOpacity style={styles.postBtn} onPress={() => setSellModal(true)}>
          <Text style={styles.postBtnText}>{t('mktSellBtn')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={{ paddingHorizontal: 14, gap: 8 }}
      >
        {CAT_FILTERS.map(f => {
          const label = t(f as Parameters<typeof t>[0]);
          const val = f === 'mfAll' ? '' : label;
          return (
            <TouchableOpacity key={f} style={[styles.ftag, activeFilter === val && styles.ftagActive]} onPress={() => setActiveFilter(val)}>
              <Text style={[styles.ftagText, activeFilter === val && styles.ftagTextActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
        {/* Featured */}
        {featured && (
          <TouchableOpacity
            style={styles.featuredCard}
            onPress={() => setDetailItem(featured)}
            activeOpacity={0.85}
          >
            <View style={styles.featuredImg}><Text style={{ fontSize: 38 }}>{featured.emoji}</Text></View>
            <View style={{ flex: 1 }}>
              <View style={styles.featuredBadge}><Text style={styles.featuredBadgeText}>{t('mktFeaturedBadge')}</Text></View>
              <Text style={styles.featuredName}>{featured.name}</Text>
              <Text style={styles.featuredPrice}>{featured.price} AZN</Text>
              <Text style={styles.featuredMeta}>📍 {featured.city} · <Text style={{ color: Colors.green }}>✅ Yeni</Text></Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Grid */}
        <View style={styles.grid}>
          {grid.map(item => (
            <ItemCard key={item.id} item={item} onPress={() => setDetailItem(item)} />
          ))}
        </View>

        {/* Sell CTA */}
        <TouchableOpacity style={styles.cta} onPress={() => setSellModal(true)}>
          <Text style={{ fontSize: 32, marginBottom: 8 }}>🏷️</Text>
          <Text style={styles.ctaTitle}>{t('mktCtaTitle')}</Text>
          <Text style={styles.ctaDesc}>{t('mktCtaDesc')}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Sell Modal */}
      <BottomSheet visible={sellModal} onClose={() => setSellModal(false)}>
        <Text style={styles.modalTitle}>{t('sellModalTitle')}</Text>
        <Text style={styles.lbl}>{t('sellLblName')}</Text>
        <TextInput style={styles.inp} placeholder="məs: Tar" placeholderTextColor={Colors.muted} value={nameVal} onChangeText={setNameVal} />
        <Text style={styles.lbl}>{t('sellLblCat')}</Text>
        <View style={styles.instGrid}>
          {CATEGORIES.map(k => (
            <TouchableOpacity key={k} style={[styles.instBtn, selCat === t(k) && styles.instBtnSel]} onPress={() => setSelCat(t(k))}>
              <Text style={[styles.instBtnText, selCat === t(k) && styles.instBtnTextSel]}>{t(k)}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.lbl}>{t('sellLblPrice')}</Text>
        <TextInput style={styles.inp} placeholder="məs: 450" placeholderTextColor={Colors.muted} value={priceVal} onChangeText={setPriceVal} keyboardType="numeric" />
        <Text style={styles.lbl}>{t('sellLblCond')}</Text>
        <View style={styles.instGrid}>
          {CONDITIONS.map(c => (
            <TouchableOpacity key={c.key} style={[styles.instBtn, selCond === c.val && styles.instBtnSel]} onPress={() => setSelCond(c.val)}>
              <Text style={[styles.instBtnText, selCond === c.val && styles.instBtnTextSel]}>{t(c.key as Parameters<typeof t>[0])}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.lbl}>{t('sellLblCity')}</Text>
        <TextInput style={styles.inp} placeholder="məs: Bakı" placeholderTextColor={Colors.muted} value={cityVal} onChangeText={setCityVal} />
        <Text style={styles.lbl}>{t('sellLblDesc')}</Text>
        <TextInput style={[styles.inp, { height: 80 }]} multiline placeholder="Ətraflı məlumat..." placeholderTextColor={Colors.muted} value={descVal} onChangeText={setDescVal} />
        <TouchableOpacity style={styles.submitBtn} onPress={submit}>
          <Text style={styles.submitBtnText}>{t('sellSubmit')}</Text>
        </TouchableOpacity>
      </BottomSheet>

      {/* Item Detail */}
      <ItemDetailSheet item={detailItem} visible={!!detailItem} onClose={() => setDetailItem(null)} />
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

  featuredCard: {
    backgroundColor: '#1a1200', borderWidth: 1, borderColor: Colors.gold,
    borderRadius: 18, padding: 16, marginBottom: 14,
    flexDirection: 'row', gap: 14,
  },
  featuredImg: {
    width: 80, height: 80, borderRadius: 14,
    backgroundColor: Colors.bg3,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border, flexShrink: 0,
  },
  featuredBadge: { backgroundColor: Colors.gold, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', marginBottom: 6 },
  featuredBadgeText: { color: '#1a0e00', fontSize: 10, fontFamily: Typography.nunito700 },
  featuredName: { fontFamily: Typography.playfair700, fontSize: 16, color: Colors.text, marginBottom: 4 },
  featuredPrice: { fontSize: 18, fontFamily: Typography.nunito700, color: Colors.gold2, marginBottom: 4 },
  featuredMeta: { fontSize: 12, color: Colors.muted, fontFamily: Typography.nunito400 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  mktItem: {
    width: '47.5%',
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 16, overflow: 'hidden',
  },
  mktImg: { aspectRatio: 1, backgroundColor: Colors.bg3, alignItems: 'center', justifyContent: 'center' },
  mktBody: { padding: 10 },
  mktName: { fontFamily: Typography.playfair700, fontSize: 13, color: Colors.text, marginBottom: 4, lineHeight: 18 },
  mktPrice: { fontSize: 16, fontFamily: Typography.nunito700, color: Colors.gold2, marginBottom: 2 },
  mktCond: { fontSize: 10, fontFamily: Typography.nunito700, marginBottom: 2 },
  mktLoc: { fontSize: 10, color: Colors.muted, fontFamily: Typography.nunito400 },

  cta: { borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed', borderRadius: 18, padding: 20, alignItems: 'center', marginTop: 4 },
  ctaTitle: { fontFamily: Typography.playfair700, fontSize: 16, color: Colors.text, marginBottom: 4 },
  ctaDesc: { fontSize: 13, color: Colors.muted, textAlign: 'center', fontFamily: Typography.nunito400 },

  detailEmoji: { width: 80, height: 80, borderRadius: 16, backgroundColor: Colors.bg3, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border, flexShrink: 0 },
  detailName: { fontFamily: Typography.playfair700, fontSize: 20, color: Colors.text, marginBottom: 4 },
  detailPrice: { fontSize: 26, fontFamily: Typography.nunito700, color: Colors.gold2, marginBottom: 4 },
  detailCond: { fontSize: 13, fontFamily: Typography.nunito700, marginBottom: 4 },
  detailCity: { fontSize: 13, color: Colors.muted, fontFamily: Typography.nunito400 },
  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  sellerAva: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.bg3, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  sellerName: { fontSize: 14, fontFamily: Typography.nunito700, color: Colors.text },
  detailDesc: { fontSize: 13, color: Colors.muted, lineHeight: 20, marginBottom: 16, fontFamily: Typography.nunito400 },
  actionBtn: { borderWidth: 1, borderColor: Colors.border, borderRadius: 24, paddingVertical: 12, alignItems: 'center' },
  actionBtnText: { color: Colors.text, fontSize: 13, fontFamily: Typography.nunito700 },
  actionBtnGold: { backgroundColor: Colors.gold, borderRadius: 24, paddingVertical: 12, alignItems: 'center' },
  actionBtnGoldText: { color: '#1a0e00', fontSize: 13, fontFamily: Typography.nunito700 },

  modalTitle: { fontFamily: Typography.playfair700, fontSize: 20, color: Colors.text, marginBottom: 16 },
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
