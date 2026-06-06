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

interface Props {
  onGoRegister: () => void;
  onForgot:     () => void;
}

export default function LoginScreen({ onGoRegister, onForgot }: Props) {
  const { login, authLoading, authError, clearAuthError } = useAppStore();
  const [email, setEmail] = useState('');
  const [pass,  setPass]  = useState('');
  const [showP, setShowP] = useState(false);

  const handleLogin = useCallback(async () => {
    if (!email.trim() || !pass.trim()) return;
    clearAuthError();
    try { await login(email.trim().toLowerCase(), pass); }
    catch { /* shown via authError */ }
  }, [email, pass, login, clearAuthError]);

  return (
    <SafeAreaView style={s.screen} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Logo */}
          <View style={s.logoWrap}>
            <View style={s.logoIcon}><Text style={{ fontSize: 36 }}>🎵</Text></View>
            <Text style={s.logoText}>Muğam Club</Text>
            <Text style={s.logoSub}>AZƏRBAYCAN MUSİQİSİ</Text>
          </View>

          <Text style={s.title}>Daxil ol</Text>
          <Text style={s.subtitle}>Hesabına giriş et</Text>

          {authError ? (
            <View style={s.errorBox}>
              <Text style={s.errorText}>⚠️ {authError}</Text>
            </View>
          ) : null}

          <Text style={s.lbl}>E-POÇT</Text>
          <TextInput
            style={s.inp}
            placeholder="musiqici@mail.com"
            placeholderTextColor={Colors.muted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
            returnKeyType="next"
          />

          <Text style={s.lbl}>ŞİFRƏ</Text>
          <View style={s.passRow}>
            <TextInput
              style={[s.inp, { flex: 1, marginBottom: 0 }]}
              placeholder="••••••••"
              placeholderTextColor={Colors.muted}
              value={pass}
              onChangeText={setPass}
              secureTextEntry={!showP}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity style={s.eyeBtn} onPress={() => setShowP(p => !p)}>
              <Text style={{ fontSize: 18 }}>{showP ? '🙈' : '👁'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={s.forgotBtn} onPress={onForgot}>
            <Text style={s.forgotText}>Şifrəni unutdum?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.btn, (!email || !pass || authLoading) && s.btnDis]}
            onPress={handleLogin}
            disabled={!email || !pass || authLoading}
          >
            {authLoading
              ? <ActivityIndicator color="#1a0e00" />
              : <Text style={s.btnText}>🎵 Daxil ol</Text>
            }
          </TouchableOpacity>

          <View style={s.registerRow}>
            <Text style={s.registerLabel}>Hesabın yoxdur? </Text>
            <TouchableOpacity onPress={onGoRegister}>
              <Text style={s.registerLink}>Qeydiyyat</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: Colors.bg },
  container:    { paddingHorizontal: 24, paddingBottom: 40, paddingTop: 20 },
  logoWrap:     { alignItems: 'center', marginBottom: 28, marginTop: 8 },
  logoIcon:     { width: 80, height: 80, borderRadius: 24, backgroundColor: '#2a1e08', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.gold, marginBottom: 14 },
  logoText:     { fontFamily: Typography.playfair800, fontSize: 28, color: Colors.gold2, letterSpacing: 0.5 },
  logoSub:      { fontSize: 11, color: Colors.muted, letterSpacing: 2.5, textTransform: 'uppercase', fontFamily: Typography.nunito700, marginTop: 4 },
  title:        { fontFamily: Typography.playfair700, fontSize: 26, color: Colors.text, marginBottom: 4 },
  subtitle:     { fontSize: 14, color: Colors.muted, fontFamily: Typography.nunito400, marginBottom: 24 },
  errorBox:     { backgroundColor: 'rgba(192,57,43,0.12)', borderWidth: 1, borderColor: 'rgba(192,57,43,0.35)', borderRadius: 12, padding: 12, marginBottom: 16 },
  errorText:    { color: '#e74c3c', fontSize: 13, fontFamily: Typography.nunito600 },
  lbl:          { fontSize: 11, color: Colors.muted, fontFamily: Typography.nunito700, letterSpacing: 0.8, marginBottom: 8 },
  inp:          { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, color: Colors.text, fontSize: 15, fontFamily: Typography.nunito400, marginBottom: 16 },
  passRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  eyeBtn:       { width: 48, height: 48, borderRadius: 14, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  forgotBtn:    { alignSelf: 'flex-end', marginBottom: 20, paddingVertical: 4 },
  forgotText:   { color: Colors.gold, fontSize: 13, fontFamily: Typography.nunito700 },
  btn:          { backgroundColor: Colors.gold, borderRadius: 28, paddingVertical: 16, alignItems: 'center', marginBottom: 20 },
  btnDis:       { opacity: 0.5 },
  btnText:      { color: '#1a0e00', fontSize: 16, fontFamily: Typography.nunito700 },
  registerRow:  { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  registerLabel:{ color: Colors.muted, fontSize: 14, fontFamily: Typography.nunito400 },
  registerLink: { color: Colors.gold, fontSize: 14, fontFamily: Typography.nunito700 },
});
