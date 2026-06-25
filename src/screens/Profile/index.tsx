import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { useT } from '../../i18n';
import { useAppStore } from '../../store/useAppStore';
import { updateUserProfile } from '../../firebase/auth';
import { uploadAvatar } from '../../firebase/storage';
import InvitesScreen from './InvitesScreen';
import MusicianProfileScreen from '../Musician/MusicianProfileScreen';

const TABS = ['tabAbout', 'tabVideo', 'tabEvents', 'tabReviews'] as const;
const INSTRUMENTS = ['🎻 Kaman','🎤 Müğənni','🪗 Qarmon','🎵 Tar','🎷 Balaban','🥁 Zərb','🎸 Gitara','🎹 Piano','🎺 Zurna'];
const CITIES = ['Bakı','Gəncə','Şəki','Lənkəran','Sumqayıt','Şamaxı','Naxçıvan','Mingəçevir'];

// ── Edit Profile Modal ────────────────────────────────────
function EditProfileSheet({ onClose }: { onClose: () => void }) {
  const { t } = useT();
  const { user, setUser, showToast } = useAppStore();
  const [name,   setName]   = useState(user?.displayName ?? '');
  const [bio,    setBio]    = useState(user?.bio ?? '');
  const [inst,   setInst]   = useState(user?.instrument ?? '');
  const [city,   setCity]   = useState(user?.city ?? '');
  const [phone,  setPhone]  = useState(user?.phone ?? '');
  const [avail,  setAvail]  = useState(user?.available ?? false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  const pickAvatar = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { showToast('⚠️ Qalereya icazəsi lazımdır'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  }, [showToast]);

  const handleSave = useCallback(async () => {
    if (!user?.uid) return;
    setSaving(true);
    try {
      let photoURL = user.photoURL;
      if (avatarUri) {
        setUploading(true);
        photoURL = await uploadAvatar(user.uid, avatarUri);
        setUploading(false);
      }
      const updates = { displayName: name.trim(), bio, instrument: inst, city, available: avail, photoURL, phone: phone.trim() };
      await updateUserProfile(user.uid, updates);
      setUser({ ...user, ...updates });
      showToast('✅ Profil yeniləndi!');
      onClose();
    } catch (err: unknown) {
      showToast('⚠️ Xəta: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  }, [user, name, bio, inst, city, avail, avatarUri, setUser, showToast, onClose]);

  return (
    <View style={es.sheet}>
      <View style={es.sheetHandle} />
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={es.title}>✏️ Profili Düzəlt</Text>

        {/* Avatar picker */}
        <TouchableOpacity style={es.avaBtn} onPress={pickAvatar}>
          <View style={es.avaBig}>
            <Text style={{ fontSize: 32 }}>{user?.emoji ?? '🎵'}</Text>
            {avatarUri && <View style={es.avaOverlay}><Text style={{ color: 'white', fontSize: 11 }}>✓ Seçildi</Text></View>}
          </View>
          <Text style={es.avaHint}>📷 Foto yüklə</Text>
        </TouchableOpacity>

        <Text style={es.lbl}>Ad Soyad</Text>
        <TextInput style={es.inp} value={name} onChangeText={setName} placeholderTextColor={Colors.muted} placeholder="Adınız" />
        <TextInput style={es.inp} value={phone} onChangeText={setPhone} placeholderTextColor={Colors.muted} placeholder="📞 Telefon nömrəsi (+994...)" keyboardType="phone-pad" />

        <Text style={es.lbl}>Haqqında</Text>
        <TextInput style={[es.inp, { height: 80 }]} value={bio} onChangeText={setBio} multiline placeholder="Özünüz haqqında yazın..." placeholderTextColor={Colors.muted} />

        <Text style={es.lbl}>Alət</Text>
        <View style={es.grid}>
          {INSTRUMENTS.map(i => (
            <TouchableOpacity key={i} style={[es.chip, inst === i && es.chipSel]} onPress={() => setInst(i)}>
              <Text style={[es.chipText, inst === i && es.chipTextSel]}>{i}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={es.lbl}>Şəhər</Text>
        <View style={es.grid}>
          {CITIES.map(c => (
            <TouchableOpacity key={c} style={[es.chip, city === c && es.chipSel]} onPress={() => setCity(c)}>
              <Text style={[es.chipText, city === c && es.chipTextSel]}>📍 {c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[es.availBtn, avail && es.availBtnOn]}
          onPress={() => setAvail(a => !a)}
        >
          <Text style={[es.availText, avail && { color: '#1a0e00' }]}>
            {avail ? '✅ Hazıram (Aktiv)' : '⏸ Hazır deyiləm'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[es.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#1a0e00" />
            : <Text style={es.saveBtnText}>{uploading ? '📤 Foto yüklənir...' : '💾 Saxla'}</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ── Profile Header ────────────────────────────────────────
function ProfileHeader({ onEdit }: { onEdit: () => void }) {
  const { t } = useT();
  const { user, musicians, showToast } = useAppStore();
  const [adding, setAdding] = React.useState(false);

  // Check if user is already in musicians list
  const isMusician = user ? musicians.some(m => m.uid === user.uid || m.id === user.uid) : false;

  const handleAddAsMusician = async () => {
    if (!user) return;
    setAdding(true);
    try {
      const { saveUserAsMusician } = await import('../../firebase/firestore');
      await saveUserAsMusician(user.uid, {
        id:          user.uid,
        uid:         user.uid,
        name:        user.displayName,
        emoji:       user.emoji ?? '🎵',
        instrument:  user.instrument,
        city:        user.city,
        bio:         user.bio,
        rating:      user.rating ?? 0,
        reviews:     user.reviews ?? 0,
        available:   user.available ?? false,
        goldRing:    false,
        online:      true,
      });
      showToast('✅ Musiqiçi siyahısına əlavə oldunuz!');
    } catch {
      showToast('⚠️ Xəta baş verdi');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveAsMusician = async () => {
    if (!user) return;
    setAdding(true);
    try {
      const { deleteDoc, doc } = await import('firebase/firestore');
      const { fbFirestore, COLLECTIONS } = await import('../../firebase/config');
      await deleteDoc(doc(fbFirestore, COLLECTIONS.MUSICIANS, user.uid));
      showToast('❌ Musiqiçi siyahısından çıxarıldınız');
    } catch {
      showToast('⚠️ Xəta baş verdi');
    } finally {
      setAdding(false);
    }
  };

  return (
    <View style={styles.profileBg}>
      <View style={styles.profileHighlight} />
      <View style={styles.bigAva}>
        <Text style={{ fontSize: 38 }}>{user?.emoji ?? '🎵'}</Text>
        {user?.verified && (
          <View style={styles.verifiedBadge}><Text style={{ fontSize: 12 }}>✓</Text></View>
        )}
      </View>
      <Text style={styles.profileName}>{user?.displayName ?? 'Musiqiçi'}</Text>
      <Text style={styles.profileHandle}>
        {user?.instrument ? `${user.instrument} · ` : ''}{user?.city ?? 'Bakı'}
      </Text>
      <View style={styles.badges}>
        {user?.instrument && (
          <View style={styles.pbadgeGold}>
            <Text style={styles.pbadgeGoldText}>{user.instrument}</Text>
          </View>
        )}
        {user?.available && (
          <View style={styles.pbadgeGreen}>
            <Text style={styles.pbadgeGreenText}>✅ Hazıram</Text>
          </View>
        )}
        {user?.verified && (
          <View style={styles.pbadgeRed}>
            <Text style={styles.pbadgeRedText}>✓ Təsdiqlənmiş</Text>
          </View>
        )}
        {isMusician && (
          <View style={styles.pbadgeGold}>
            <Text style={styles.pbadgeGoldText}>🎵 Musiqiçi</Text>
          </View>
        )}
      </View>
      {user?.bio ? (
        <Text style={styles.profileBio}>{user.bio}</Text>
      ) : null}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statN}>{user?.gigs ?? 0}</Text>
          <Text style={styles.statL}>{t('statGigs')}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statN}>{user?.followers ?? 0}</Text>
          <Text style={styles.statL}>{t('statFollowers')}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statN}>{user?.rating ? user.rating.toFixed(1) : '—'}</Text>
          <Text style={styles.statL}>{t('statRating')}</Text>
        </View>
      </View>
      <View style={styles.profileActions}>
        <TouchableOpacity style={styles.editBtn} onPress={onEdit}>
          <Text style={styles.editBtnText}>{t('profileEdit')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.shareBtn}>
          <Text style={styles.shareBtnText}>{t('profileShare')}</Text>
        </TouchableOpacity>
      </View>

      {/* Musician toggle button */}
      <TouchableOpacity
        style={[styles.musicianBtn, isMusician && styles.musicianBtnActive]}
        onPress={isMusician ? handleRemoveAsMusician : handleAddAsMusician}
        disabled={adding}
      >
        <Text style={[styles.musicianBtnText, isMusician && styles.musicianBtnTextActive]}>
          {adding ? '...' : isMusician ? '🎵 Musiqiçi siyahısından çıx' : '🎵 Musiqiçi kimi əlavə ol'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ── About Tab ─────────────────────────────────────────────
function AboutTab() {
  const { t } = useT();
  const user = useAppStore(s => s.user);
  return (
    <View style={{ padding: 4 }}>
      <View style={styles.infoCard}>
        <Text style={styles.infoCardTitle}>👤 {t('tabAbout')}</Text>
        <Text style={styles.infoCardContent}>
          {user?.bio || 'Profil məlumatları hələ əlavə edilməyib. Profili düzəlt düyməsini basın.'}
        </Text>
      </View>
      {user?.instrument && (
        <View style={styles.infoCard}>
          <Text style={styles.infoCardTitle}>⚡ {t('skills')}</Text>
          <View style={styles.skillsRow}>
            <View style={styles.skillTag}>
              <Text style={styles.skillTagText}>{user.instrument}</Text>
            </View>
          </View>
        </View>
      )}
      <View style={styles.infoCard}>
        <Text style={styles.infoCardTitle}>💼 {t('services')}</Text>
        {[
          { icon: '💍', label: 'Toy',      price: '200–400 AZN' },
          { icon: '🎭', label: 'Konsert',  price: '150–300 AZN' },
          { icon: '🍽', label: 'Restoran', price: '100–200 AZN / gecə' },
          { icon: '📸', label: 'Çəkiliş', price: '150–250 AZN' },
        ].map(s => (
          <View key={s.label} style={styles.serviceRow}>
            <Text style={styles.serviceIcon}>{s.icon} {s.label}</Text>
            <Text style={styles.servicePrice}>{s.price}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Settings Tab ──────────────────────────────────────────
function SettingsTab() {
  const { t } = useT();
  const { lang, setLang, showToast, logout } = useAppStore();

  const handleLogout = useCallback(() => {
    Alert.alert(t('logoutLabel'), 'Hesabdan çıxmaq istəyirsiniz?', [
      { text: 'Ləğv et', style: 'cancel' },
      {
        text: 'Çıxış', style: 'destructive',
        onPress: async () => {
          try { await logout(); }
          catch { showToast('⚠️ Çıxış zamanı xəta baş verdi'); }
        },
      },
    ]);
  }, [logout, showToast, t]);

  return (
    <View style={{ padding: 4 }}>
      {[
        { icon: '🌐', label: t('langLabel'), action: () => setLang(lang === 'az' ? 'ru' : 'az'), extra: lang.toUpperCase() },
        { icon: '🔔', label: t('notifLabel'), action: () => showToast('🔔 Bildirişlər'), extra: '' },
        { icon: '🔒', label: t('passLabel'), action: () => showToast('🔒 Şifrə dəyişdirmə...'), extra: '' },
        { icon: '❓', label: t('helpLabel'), action: () => showToast('❓ Kömək...'), extra: '' },
      ].map(item => (
        <TouchableOpacity key={item.icon} style={styles.settingRow} onPress={item.action}>
          <Text style={styles.settingIcon}>{item.icon}</Text>
          <Text style={styles.settingLabel}>{item.label}</Text>
          {item.extra ? <Text style={styles.settingExtra}>{item.extra}</Text> : null}
          <Text style={styles.settingArrow}>›</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity style={[styles.settingRow, { marginTop: 12 }]} onPress={handleLogout}>
        <Text style={styles.settingIcon}>🚪</Text>
        <Text style={[styles.settingLabel, { color: Colors.red }]}>{t('logoutLabel')}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Profile Screen ────────────────────────────────────────

function InviteTabButton({ active, onPress }: { active: boolean; onPress: () => void }) {
  const { receivedInvites, myInvites } = useAppStore();
  const pendingIn  = receivedInvites.filter(i => i.status === 'pending').length;
  const pendingOut = myInvites.filter(i => i.status === 'pending').length;
  const total = pendingIn + pendingOut;
  return (
    <TouchableOpacity
      style={[styles.tabBtn, active && styles.tabBtnActive]}
      onPress={onPress}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>
          📨 Dəvətlər
        </Text>
        {total > 0 && (
          <View style={{ backgroundColor: Colors.red, borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 }}>
            <Text style={{ color: 'white', fontSize: 9, fontFamily: Typography.nunito700 }}>{total}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const { t } = useT();
  const [activeTab,         setActiveTab]         = useState(0);
  const [editVisible,       setEditVisible]       = useState(false);
  const [selectedMusician,  setSelectedMusician]  = useState<any>(null);
  const [selectedInvite,    setSelectedInvite]    = useState<any>(null);

  const handleOpenMusician = useCallback((musicianOrInvite: any) => {
    // If it's an invite — extract musician and pass invite
    if (musicianOrInvite?.fromUid || musicianOrInvite?.musicianId) {
      setSelectedInvite(musicianOrInvite);
      setSelectedMusician({
        id:         musicianOrInvite.fromUid,
        uid:        musicianOrInvite.fromUid,
        name:       musicianOrInvite.fromName,
        emoji:      '👤',
        instrument: '',
        city:       musicianOrInvite.fromCity ?? '',
        rating:     5,
        reviews:    0,
      });
    } else {
      setSelectedInvite(null);
      setSelectedMusician(musicianOrInvite);
    }
  }, []);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ProfileHeader onEdit={() => setEditVisible(true)} />

        {/* Tabs */}
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          style={styles.tabsScroll}
          contentContainerStyle={{ paddingHorizontal: 14, gap: 8 }}
        >
          {TABS.map((tab, i) => (
            <TouchableOpacity key={tab} style={[styles.tabBtn, activeTab === i && styles.tabBtnActive]} onPress={() => setActiveTab(i)}>
              <Text style={[styles.tabBtnText, activeTab === i && styles.tabBtnTextActive]}>{t(tab)}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[styles.tabBtn, activeTab === 4 && styles.tabBtnActive]} onPress={() => setActiveTab(4)}>
            <Text style={[styles.tabBtnText, activeTab === 4 && styles.tabBtnTextActive]}>⚙️ Ayarlar</Text>
          </TouchableOpacity>
          <InviteTabButton active={activeTab === 5} onPress={() => setActiveTab(5)} />
        </ScrollView>

        <View style={styles.tabContent}>
          {activeTab === 0 && <AboutTab />}
          {activeTab === 4 && <SettingsTab />}
          {activeTab === 5 && (
            <InvitesScreen
              onBack={() => setActiveTab(0)}
              onOpenMusician={handleOpenMusician}
            />
          )}
          {(activeTab === 1 || activeTab === 2 || activeTab === 3) && (
            <View style={styles.emptyTab}>
              <Text style={{ fontSize: 40 }}>🎵</Text>
              <Text style={styles.emptyTabText}>Tezliklə əlavə olunacaq</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Edit Profile Sheet */}
      {editVisible && (
        <View style={styles.editOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setEditVisible(false)} />
          <EditProfileSheet onClose={() => setEditVisible(false)} />
        </View>
      )}

      {/* Musician profile — outside ScrollView, covers full screen */}
      {selectedMusician && (
        <MusicianProfileScreen
          musician={selectedMusician}
          onClose={() => { setSelectedMusician(null); setSelectedInvite(null); }}
          fromInvite={selectedInvite}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  profileBg: { backgroundColor: '#15100a', padding: 24, paddingTop: 24, overflow: 'hidden' },
  profileHighlight: { position: 'absolute', top: 0, right: 0, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(212,160,60,0.2)' },
  bigAva: { width: 86, height: 86, borderRadius: 43, backgroundColor: Colors.bg3, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: Colors.gold, marginBottom: 12 },
  verifiedBadge: { position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.gold, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.bg },
  profileName: { fontFamily: Typography.playfair800, fontSize: 22, color: Colors.text, marginBottom: 2 },
  profileHandle: { fontSize: 13, color: Colors.muted, marginBottom: 8, fontFamily: Typography.nunito400 },
  badges: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 12 },
  pbadgeGold: { backgroundColor: 'rgba(212,160,60,0.15)', borderWidth: 1, borderColor: 'rgba(212,160,60,0.3)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  pbadgeGoldText: { color: Colors.gold, fontSize: 11, fontFamily: Typography.nunito700 },
  pbadgeGreen: { backgroundColor: 'rgba(39,174,96,0.15)', borderWidth: 1, borderColor: 'rgba(39,174,96,0.3)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  pbadgeGreenText: { color: Colors.green, fontSize: 11, fontFamily: Typography.nunito700 },
  pbadgeRed: { backgroundColor: 'rgba(192,57,43,0.15)', borderWidth: 1, borderColor: 'rgba(192,57,43,0.3)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  pbadgeRedText: { color: '#e74c3c', fontSize: 11, fontFamily: Typography.nunito700 },
  profileBio: { fontSize: 13, color: '#b0a080', lineHeight: 20, marginBottom: 14, fontFamily: Typography.nunito400 },
  statsRow: { flexDirection: 'row', gap: 24, marginBottom: 16 },
  stat: { alignItems: 'center' },
  statN: { fontFamily: Typography.playfair700, fontSize: 20, color: Colors.gold2 },
  statL: { fontSize: 11, color: Colors.muted, fontFamily: Typography.nunito700 },
  profileActions: { flexDirection: 'row', gap: 10 },
  editBtn: { backgroundColor: Colors.gold, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24 },
  editBtnText: { color: '#1a0e00', fontSize: 13, fontFamily: Typography.nunito700 },
  shareBtn:       { borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24 },
  shareBtnText:   { color: Colors.text, fontSize: 13, fontFamily: Typography.nunito700 },
  musicianBtn:    { marginTop: 12, width: '100%', paddingVertical: 12, borderRadius: 24, borderWidth: 1, borderColor: Colors.gold, alignItems: 'center' },
  musicianBtnActive: { backgroundColor: 'rgba(192,57,43,0.1)', borderColor: Colors.red },
  musicianBtnText:   { color: Colors.gold, fontSize: 13, fontFamily: Typography.nunito700 },
  musicianBtnTextActive: { color: Colors.red },
  tabsScroll: { flexGrow: 0, marginTop: 16, marginBottom: 4 },
  tabBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: Colors.border },
  tabBtnActive: { backgroundColor: Colors.gold, borderColor: Colors.gold },
  tabBtnText: { color: Colors.muted, fontSize: 12, fontFamily: Typography.nunito700 },
  tabBtnTextActive: { color: '#1a0e00' },
  tabContent: { paddingHorizontal: 14, paddingBottom: 30, marginTop: 8 },
  infoCard: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 16, padding: 14, marginBottom: 12 },
  infoCardTitle: { fontFamily: Typography.playfair700, fontSize: 15, color: Colors.text, marginBottom: 8 },
  infoCardContent: { fontSize: 13, color: Colors.muted, lineHeight: 20, fontFamily: Typography.nunito400 },
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillTag: { backgroundColor: 'rgba(212,160,60,0.1)', borderWidth: 1, borderColor: 'rgba(212,160,60,0.25)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  skillTagText: { color: Colors.gold, fontSize: 12, fontFamily: Typography.nunito700 },
  serviceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  serviceIcon: { fontSize: 13, color: Colors.text, fontFamily: Typography.nunito600 },
  servicePrice: { fontSize: 13, color: Colors.gold, fontFamily: Typography.nunito700 },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  settingIcon: { fontSize: 18, marginRight: 12 },
  settingLabel: { flex: 1, fontSize: 15, color: Colors.text, fontFamily: Typography.nunito600 },
  settingExtra: { fontSize: 13, color: Colors.gold, fontFamily: Typography.nunito700, marginRight: 8 },
  settingArrow: { fontSize: 20, color: Colors.muted },
  emptyTab: { alignItems: 'center', marginTop: 60, gap: 12 },
  emptyTabText: { color: Colors.muted, fontSize: 14, fontFamily: Typography.nunito400 },
  editOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end', zIndex: 200 },
});

// Edit sheet styles
const es = StyleSheet.create({
  sheet: { backgroundColor: Colors.bg2, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderColor: Colors.border, paddingHorizontal: 20, paddingBottom: 32, paddingTop: 12, maxHeight: '90%' },
  sheetHandle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 18 },
  title: { fontFamily: Typography.playfair700, fontSize: 20, color: Colors.text, marginBottom: 20 },
  avaBtn: { alignItems: 'center', marginBottom: 20 },
  avaBig: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.bg3, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.gold, marginBottom: 8 },
  avaOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', borderBottomLeftRadius: 40, borderBottomRightRadius: 40, paddingVertical: 4, alignItems: 'center' },
  avaHint: { color: Colors.gold, fontSize: 13, fontFamily: Typography.nunito700 },
  lbl: { fontSize: 11, color: Colors.muted, fontFamily: Typography.nunito700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  inp: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: Colors.text, fontSize: 14, fontFamily: Typography.nunito400, marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.bg3, borderWidth: 1, borderColor: Colors.border },
  chipSel: { backgroundColor: 'rgba(212,160,60,0.15)', borderColor: Colors.gold },
  chipText: { color: Colors.muted, fontSize: 12, fontFamily: Typography.nunito700 },
  chipTextSel: { color: Colors.gold },
  availBtn: { borderWidth: 1, borderColor: Colors.border, borderRadius: 24, paddingVertical: 12, alignItems: 'center', marginBottom: 16 },
  availBtnOn: { backgroundColor: Colors.gold, borderColor: Colors.gold },
  availText: { color: Colors.text, fontSize: 14, fontFamily: Typography.nunito700 },
  saveBtn: { backgroundColor: Colors.gold, borderRadius: 24, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: '#1a0e00', fontSize: 14, fontFamily: Typography.nunito700 },
});
