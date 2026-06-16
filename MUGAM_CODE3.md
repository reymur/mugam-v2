# MUGAM CLUB — ПОЛНЫЙ КОД ЧАСТЬ 3 (ФИНАЛ)

---

## src/screens/Auth/PhoneRegisterScreen.tsx

```tsx
// src/screens/Auth/PhoneRegisterScreen.tsx
import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { Colors }     from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { useAppStore } from '../../store/useAppStore';
import { sendPhoneOTP, verifyPhoneOTP } from '../../firebase/auth';
import { FIREBASE_CONFIG } from '../../firebase/config';

const INSTRUMENTS = [
  '🎻 Kaman','🎤 Müğənni','🪗 Qarmon','🎵 Tar',
  '🎷 Balaban','🥁 Zərb','🎸 Gitara','🎹 Piano','🎺 Zurna',
];
const CITIES = ['Bakı','Gəncə','Şəki','Lənkəran','Sumqayıt','Şamaxı','Naxçıvan','Mingəçevir'];
const AZ_PREFIX = '+994';

interface Props { onGoLogin: () => void; }

type Step = 'phone' | 'otp' | 'profile';

export default function PhoneRegisterScreen({ onGoLogin }: Props) {
  const { setUser, showToast } = useAppStore();

  // Recaptcha ref — required by Firebase Phone Auth
  const recaptchaRef = useRef<FirebaseRecaptchaVerifierModal>(null);

  const [step,    setStep]    = useState<Step>('phone');
  const [phone,   setPhone]   = useState('');  // without prefix
  const [otp,     setOtp]     = useState('');
  const [name,    setName]    = useState('');
  const [inst,    setInst]    = useState('');
  const [city,    setCity]    = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  // ── Step 1: Send SMS ──────────────────────────────────
  const handleSendOTP = useCallback(async () => {
    setError('');
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 9) {
      setError('⚠️ Düzgün telefon nömrəsi daxil edin (9 rəqəm)');
      return;
    }
    const fullPhone = AZ_PREFIX + digits;
    setLoading(true);
    try {
      // Get recaptcha token from the modal verifier
      const token = await recaptchaRef.current?.verify();
      if (!token) throw new Error('reCAPTCHA doğrulaması uğursuz oldu');
      await sendPhoneOTP(fullPhone, token);
      setStep('otp');
      showToast('📱 SMS göndərildi!');
    } catch (err: unknown) {
      setError('⚠️ ' + (err instanceof Error ? err.message : 'Xəta baş verdi'));
    } finally {
      setLoading(false);
    }
  }, [phone, showToast]);

  // ── Step 2: Verify OTP ────────────────────────────────
  const handleVerifyOTP = useCallback(async () => {
    setError('');
    if (otp.length < 6) {
      setError('⚠️ 6 rəqəmli kod daxil edin');
      return;
    }
    setLoading(true);
    try {
      await verifyPhoneOTP(otp);
      setStep('profile');
    } catch (err: unknown) {
      setError('⚠️ ' + (err instanceof Error ? err.message : 'Yanlış kod'));
    } finally {
      setLoading(false);
    }
  }, [otp]);

  // ── Step 3: Save profile ──────────────────────────────
  const handleSaveProfile = useCallback(async () => {
    setError('');
    if (!name.trim()) { setError('⚠️ Ad daxil edin'); return; }
    if (!inst)        { setError('⚠️ Alət seçin'); return; }
    if (!city)        { setError('⚠️ Şəhər seçin'); return; }
    setLoading(true);
    try {
      const { updateUserProfile } = await import('../../firebase/auth');
      const { fbAuth } = await import('../../firebase/config');
      const uid = fbAuth.currentUser?.uid;
      if (!uid) throw new Error('İstifadəçi tapılmadı');
      await updateUserProfile(uid, { displayName: name.trim(), instrument: inst, city });
      showToast('✅ Qeydiyyat tamamlandı!');
      // Auth state listener in store will pick up the new user automatically
    } catch (err: unknown) {
      setError('⚠️ ' + (err instanceof Error ? err.message : 'Xəta'));
    } finally {
      setLoading(false);
    }
  }, [name, inst, city, showToast]);

  return (
    <SafeAreaView style={s.screen} edges={['top', 'bottom']}>
      {/* Recaptcha modal — invisible, required by Firebase */}
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaRef}
        firebaseConfig={FIREBASE_CONFIG}
        attemptInvisibleVerification
        title="Siz robot deyilsiniz?"
        cancelLabel="Ləğv et"
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={s.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={s.header}>
            <Text style={s.title}>📱 Telefonla qeydiyyat</Text>
            <Text style={s.subtitle}>
              {step === 'phone'   && 'Azərbaycan nömrəni daxil et'}
              {step === 'otp'     && `${AZ_PREFIX}${phone} nömrəsinə SMS göndərildi`}
              {step === 'profile' && 'Profilinizi tamamlayın'}
            </Text>
          </View>

          {/* Step indicator */}
          <View style={s.steps}>
            {(['phone','otp','profile'] as Step[]).map((st, i) => (
              <View key={st} style={s.stepRow}>
                <View style={[s.stepDot, step === st && s.stepDotActive,
                  (step === 'otp' && i === 0) || (step === 'profile' && i <= 1)
                    ? s.stepDotDone : null]}>
                  <Text style={s.stepNum}>{i + 1}</Text>
                </View>
                {i < 2 && <View style={[s.stepLine,
                  (step === 'otp' && i === 0) || (step === 'profile' && i <= 1)
                    ? s.stepLineDone : null]} />}
              </View>
            ))}
          </View>

          {/* Error */}
          {error ? (
            <View style={s.errorBox}>
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* ── STEP 1: Phone input ── */}
          {step === 'phone' && (
            <>
              <Text style={s.lbl}>Telefon nömrəsi</Text>
              <View style={s.phoneRow}>
                <View style={s.prefixBox}>
                  <Text style={s.prefixText}>🇦🇿 +994</Text>
                </View>
                <TextInput
                  style={[s.inp, { flex: 1, marginBottom: 0 }]}
                  placeholder="50 123 45 67"
                  placeholderTextColor={Colors.muted}
                  value={phone}
                  onChangeText={t => setPhone(t.replace(/\D/g, '').slice(0, 9))}
                  keyboardType="phone-pad"
                  maxLength={9}
                />
              </View>
              <Text style={s.hint}>SMS kodu göndəriləcək</Text>
              <TouchableOpacity
                style={[s.btn, loading && s.btnDis]}
                onPress={handleSendOTP}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#1a0e00" />
                  : <Text style={s.btnText}>📤 SMS Göndər</Text>
                }
              </TouchableOpacity>
            </>
          )}

          {/* ── STEP 2: OTP input ── */}
          {step === 'otp' && (
            <>
              <Text style={s.lbl}>SMS kodu</Text>
              <TextInput
                style={[s.inp, s.otpInput]}
                placeholder="— — — — — —"
                placeholderTextColor={Colors.muted}
                value={otp}
                onChangeText={t => setOtp(t.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
              <TouchableOpacity
                style={[s.btn, (otp.length < 6 || loading) && s.btnDis]}
                onPress={handleVerifyOTP}
                disabled={otp.length < 6 || loading}
              >
                {loading
                  ? <ActivityIndicator color="#1a0e00" />
                  : <Text style={s.btnText}>✅ Kodu yoxla</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity
                style={s.resendBtn}
                onPress={() => { setStep('phone'); setOtp(''); setError(''); }}
              >
                <Text style={s.resendText}>← Nömrəni dəyiş</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ── STEP 3: Profile ── */}
          {step === 'profile' && (
            <>
              <Text style={s.lbl}>Ad Soyad</Text>
              <TextInput
                style={s.inp}
                placeholder="məs: Anar Musayev"
                placeholderTextColor={Colors.muted}
                value={name}
                onChangeText={setName}
                autoFocus
              />

              <Text style={s.lbl}>Alət seç</Text>
              <View style={s.grid}>
                {INSTRUMENTS.map(i => (
                  <TouchableOpacity
                    key={i}
                    style={[s.chip, inst === i && s.chipSel]}
                    onPress={() => setInst(i)}
                  >
                    <Text style={[s.chipText, inst === i && s.chipTextSel]}>{i}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.lbl}>Şəhər</Text>
              <View style={s.grid}>
                {CITIES.map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[s.chip, city === c && s.chipSel]}
                    onPress={() => setCity(c)}
                  >
                    <Text style={[s.chipText, city === c && s.chipTextSel]}>📍 {c}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[s.btn, loading && s.btnDis]}
                onPress={handleSaveProfile}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#1a0e00" />
                  : <Text style={s.btnText}>🎵 Tamamla</Text>
                }
              </TouchableOpacity>
            </>
          )}

          {/* Back to login */}
          <View style={s.loginRow}>
            <Text style={s.loginLabel}>Artıq hesabın var? </Text>
            <TouchableOpacity onPress={onGoLogin}>
              <Text style={s.loginLink}>Daxil ol</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen:      { flex: 1, backgroundColor: Colors.bg },
  container:   { paddingHorizontal: 24, paddingBottom: 40, paddingTop: 24 },
  header:      { marginBottom: 24 },
  title:       { fontFamily: Typography.playfair700, fontSize: 24, color: Colors.text, marginBottom: 4 },
  subtitle:    { fontSize: 13, color: Colors.muted, fontFamily: Typography.nunito400, lineHeight: 20 },
  steps:       { flexDirection: 'row', alignItems: 'center', marginBottom: 28 },
  stepRow:     { flexDirection: 'row', alignItems: 'center' },
  stepDot:     { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.bg3, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  stepDotActive:{ borderColor: Colors.gold, backgroundColor: 'rgba(212,160,60,0.15)' },
  stepDotDone: { backgroundColor: Colors.gold, borderColor: Colors.gold },
  stepNum:     { color: Colors.muted, fontSize: 12, fontFamily: Typography.nunito700 },
  stepLine:    { width: 32, height: 2, backgroundColor: Colors.border, marginHorizontal: 4 },
  stepLineDone:{ backgroundColor: Colors.gold },
  errorBox:    { backgroundColor: 'rgba(192,57,43,0.12)', borderWidth: 1, borderColor: 'rgba(192,57,43,0.35)', borderRadius: 12, padding: 12, marginBottom: 16 },
  errorText:   { color: '#e74c3c', fontSize: 13, fontFamily: Typography.nunito600 },
  lbl:         { fontSize: 11, color: Colors.muted, fontFamily: Typography.nunito700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  inp:         { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13, color: Colors.text, fontSize: 15, fontFamily: Typography.nunito400, marginBottom: 16 },
  phoneRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  prefixBox:   { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 13 },
  prefixText:  { color: Colors.text, fontSize: 14, fontFamily: Typography.nunito700 },
  hint:        { fontSize: 12, color: Colors.muted, fontFamily: Typography.nunito400, marginBottom: 20 },
  otpInput:    { fontSize: 24, letterSpacing: 8, textAlign: 'center', fontFamily: Typography.playfair700 },
  btn:         { backgroundColor: Colors.gold, borderRadius: 28, paddingVertical: 16, alignItems: 'center', marginTop: 8, marginBottom: 16 },
  btnDis:      { opacity: 0.5 },
  btnText:     { color: '#1a0e00', fontSize: 16, fontFamily: Typography.nunito700 },
  resendBtn:   { alignItems: 'center', paddingVertical: 8 },
  resendText:  { color: Colors.gold, fontSize: 13, fontFamily: Typography.nunito700 },
  grid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip:        { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, backgroundColor: Colors.bg3, borderWidth: 1, borderColor: Colors.border },
  chipSel:     { backgroundColor: 'rgba(212,160,60,0.15)', borderColor: Colors.gold },
  chipText:    { color: Colors.muted, fontSize: 13, fontFamily: Typography.nunito700 },
  chipTextSel: { color: Colors.gold },
  loginRow:    { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  loginLabel:  { color: Colors.muted, fontSize: 14, fontFamily: Typography.nunito400 },
  loginLink:   { color: Colors.gold, fontSize: 14, fontFamily: Typography.nunito700 },
});

```

---

## firebase_config/firestore.indexes.json

```json
{
  "indexes": [
    {
      "collectionGroup": "gigs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "active",    "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "board",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "active",    "order": "ASCENDING" },
        { "fieldPath": "pinned",    "order": "DESCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "market",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "sold",      "order": "ASCENDING" },
        { "fieldPath": "featured",  "order": "DESCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "musicians",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "rating",    "order": "DESCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "chats",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "members",       "arrayConfig": "CONTAINS" },
        { "fieldPath": "lastMessageAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "messages",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "createdAt", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "chats",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "isGroup", "order": "ASCENDING" },
        { "fieldPath": "members", "arrayConfig": "CONTAINS" }
      ]
    }
  ],
  "fieldOverrides": []
}

```

---

## ИТОГ — ВСЕ ФАЙЛЫ ЗАДОКУМЕНТИРОВАНЫ

Все 42 файла проекта задокументированы в трёх файлах:
- MUGAM_FINAL_DOC.md — архитектура и правила
- MUGAM_CODE.md — основные файлы
- MUGAM_CODE2.md — оставшиеся файлы
- MUGAM_CODE3.md — этот файл (последние 2 файла)

Для воссоздания приложения:
1. Создай новый Expo проект: npx create-expo-app mugam-v2
2. Скопируй package.json и запусти: npm install --legacy-peer-deps
3. Скопируй metro.config.js и babel.config.js
4. Скопируй все файлы из src/ точно как задокументировано
5. Создай коллекции в Firestore с нужными индексами
6. Запусти: npx expo start --clear
