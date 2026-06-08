import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors }     from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { useAppStore } from '../../store/useAppStore';

const INSTRUMENTS = ['🎻 Kaman','🎤 Müğənni','🪗 Qarmon','🎵 Tar','🎷 Balaban','🥁 Zərb','🎸 Gitara','🎹 Piano','🎺 Zurna'];
const CITIES = ['Bakı','Gəncə','Şəki','Lənkəran','Sumqayıt','Şamaxı','Naxçıvan','Mingəçevir'];

type Role = 'musiqici' | 'qonaq';

interface Props { onGoLogin: () => void; }

export default function RegisterScreen({ onGoLogin }: Props) {
  const { register, authLoading, authError, clearAuthError } = useAppStore();
  const [role,     setRole]     = useState<Role | null>(null);
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [pass,     setPass]     = useState('');
  const [pass2,    setPass2]    = useState('');
  const [inst,     setInst]     = useState('');
  const [city,     setCity]     = useState('');
  const [showP,    setShowP]    = useState(false);
  const [localErr, setLocalErr] = useState('');

  const handleRegister = useCallback(async () => {
    setLocalErr('');
    clearAuthError();
    if (!role)           { setLocalErr('⚠️ Rol seçin'); return; }
    if (!name.trim())    { setLocalErr('⚠️ Ad daxil edin'); return; }
    if (!email.trim())   { setLocalErr('⚠️ E-poçt daxil edin'); return; }
    if (pass.length < 6) { setLocalErr('⚠️ Şifrə ən azı 6 simvol olmalıdır'); return; }
    if (pass !== pass2)  { setLocalErr('⚠️ Şifrələr uyğun gəlmir'); return; }
    if (role === 'musiqici' && !inst) { setLocalErr('⚠️ Alət seçin'); return; }
    if (!city)           { setLocalErr('⚠️ Şəhər seçin'); return; }

    try {
      await register(
        email.trim().toLowerCase(),
        pass,
        name.trim(),
        role === 'musiqici' ? inst : '',
        city,
        role,
      );
    } catch { /* shown via authError */ }
  }, [role, name, email, pass, pass2, inst, city, register, clearAuthError]);

  const errorMsg = localErr || authError;

  return (
    <SafeAreaView style={s.screen} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          <View style={s.header}>
            <Text style={s.title}>Qeydiyyat</Text>
            <Text style={s.subtitle}>Muğam Club ailəsinə qoşul</Text>
          </View>

          {errorMsg ? (
            <View style={s.errorBox}>
              <Text style={s.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* Role selector */}
          <Text style={s.lbl}>ROL SEÇİN</Text>
          <View style={s.roleRow}>
            <TouchableOpacity
              style={[s.roleBtn, role === 'musiqici' && s.roleBtnActive]}
              onPress={() => setRole('musiqici')}
            >
              <Text style={s.roleEmoji}>🎵</Text>
              <Text style={[s.roleText, role === 'musiqici' && s.roleTextActive]}>Musiqiçi</Text>
              <Text style={s.roleDesc}>Siyahıda görünərəm</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.roleBtn, role === 'qonaq' && s.roleBtnActive]}
              onPress={() => { setRole('qonaq'); setInst(''); }}
            >
              <Text style={s.roleEmoji}>👤</Text>
              <Text style={[s.roleText, role === 'qonaq' && s.roleTextActive]}>Qonaq</Text>
              <Text style={s.roleDesc}>Musiqiçi dəvət edərəm</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.lbl}>AD SOYAD</Text>
          <TextInput style={s.inp} placeholder="məs: Anar Musayev" placeholderTextColor={Colors.muted} value={name} onChangeText={setName} returnKeyType="next" />

          <Text style={s.lbl}>E-POÇT</Text>
          <TextInput style={s.inp} placeholder="musiqici@mail.com" placeholderTextColor={Colors.muted} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" returnKeyType="next" />

          <Text style={s.lbl}>ŞİFRƏ</Text>
          <View style={s.passRow}>
            <TextInput
              style={[s.inp, { flex: 1, marginBottom: 0 }]}
              placeholder="••••••••"
              placeholderTextColor={Colors.muted}
              value={pass}
              onChangeText={setPass}
              secureTextEntry={!showP}
            />
            <TouchableOpacity style={s.eyeBtn} onPress={() => setShowP(p => !p)}>
              <Text style={{ fontSize: 18 }}>{showP ? '🙈' : '👁'}</Text>
            </TouchableOpacity>
          </View>
          <View style={{ height: 16 }} />

          <Text style={s.lbl}>ŞİFRƏNİ TƏKİT ET</Text>
          <TextInput style={s.inp} placeholder="••••••••" placeholderTextColor={Colors.muted} value={pass2} onChangeText={setPass2} secureTextEntry={!showP} />

          {/* Instrument only for musicians */}
          {role === 'musiqici' && (
            <>
              <Text style={s.lbl}>ALƏT SEÇ</Text>
              <View style={s.grid}>
                {INSTRUMENTS.map(i => (
                  <TouchableOpacity key={i} style={[s.chip, inst === i && s.chipSel]} onPress={() => setInst(i)}>
                    <Text style={[s.chipText, inst === i && s.chipTextSel]}>{i}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <Text style={s.lbl}>ŞƏHƏRİ SEÇ</Text>
          <View style={s.grid}>
            {CITIES.map(c => (
              <TouchableOpacity key={c} style={[s.chip, city === c && s.chipSel]} onPress={() => setCity(c)}>
                <Text style={[s.chipText, city === c && s.chipTextSel]}>📍 {c}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[s.btn, authLoading && s.btnDis]}
            onPress={handleRegister}
            disabled={authLoading}
          >
            {authLoading
              ? <ActivityIndicator color="#1a0e00" />
              : <Text style={s.btnText}>🎵 Qeydiyyatdan keç</Text>
            }
          </TouchableOpacity>

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
  title:       { fontFamily: Typography.playfair700, fontSize: 26, color: Colors.text, marginBottom: 4 },
  subtitle:    { fontSize: 14, color: Colors.muted, fontFamily: Typography.nunito400 },
  errorBox:    { backgroundColor: 'rgba(192,57,43,0.12)', borderWidth: 1, borderColor: 'rgba(192,57,43,0.35)', borderRadius: 12, padding: 12, marginBottom: 16 },
  errorText:   { color: '#e74c3c', fontSize: 13, fontFamily: Typography.nunito600 },
  lbl:         { fontSize: 11, color: Colors.muted, fontFamily: Typography.nunito700, letterSpacing: 0.8, marginBottom: 8 },
  inp:         { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, color: Colors.text, fontSize: 15, fontFamily: Typography.nunito400, marginBottom: 16 },
  passRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeBtn:      { width: 48, height: 48, borderRadius: 14, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  roleRow:     { flexDirection: 'row', gap: 12, marginBottom: 20 },
  roleBtn:     { flex: 1, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 16, padding: 16, alignItems: 'center', gap: 4 },
  roleBtnActive: { borderColor: Colors.gold, backgroundColor: 'rgba(212,160,60,0.1)' },
  roleEmoji:   { fontSize: 28, marginBottom: 4 },
  roleText:    { fontFamily: Typography.nunito700, fontSize: 15, color: Colors.muted },
  roleTextActive: { color: Colors.gold },
  roleDesc:    { fontSize: 11, color: Colors.muted, fontFamily: Typography.nunito400, textAlign: 'center' },
  grid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip:        { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, backgroundColor: Colors.bg3, borderWidth: 1, borderColor: Colors.border },
  chipSel:     { backgroundColor: 'rgba(212,160,60,0.15)', borderColor: Colors.gold },
  chipText:    { color: Colors.muted, fontSize: 13, fontFamily: Typography.nunito700 },
  chipTextSel: { color: Colors.gold },
  btn:         { backgroundColor: Colors.gold, borderRadius: 28, paddingVertical: 16, alignItems: 'center', marginTop: 8, marginBottom: 20 },
  btnDis:      { opacity: 0.5 },
  btnText:     { color: '#1a0e00', fontSize: 16, fontFamily: Typography.nunito700 },
  loginRow:    { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  loginLabel:  { color: Colors.muted, fontSize: 14, fontFamily: Typography.nunito400 },
  loginLink:   { color: Colors.gold, fontSize: 14, fontFamily: Typography.nunito700 },
});
