// src/screens/Auth/ForgotScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { useAppStore } from '../../store/useAppStore';

interface Props { onBack: () => void; }

export default function ForgotScreen({ onBack }: Props) {
  const { resetPassword } = useAppStore();
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState('');

  const handleSend = async () => {
    if (!email.trim()) { setError('⚠️ E-poçt daxil edin'); return; }
    setLoading(true); setError('');
    try {
      await resetPassword(email.trim().toLowerCase());
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.screen} edges={['top','bottom']}>
      <TouchableOpacity style={s.backBtn} onPress={onBack}>
        <Text style={s.backText}>← Geri</Text>
      </TouchableOpacity>

      <View style={s.body}>
        <Text style={s.emoji}>🔑</Text>
        <Text style={s.title}>Şifrəni bərpa et</Text>
        <Text style={s.subtitle}>E-poçt ünvanına bərpa linki göndəriləcək</Text>

        {sent ? (
          <View style={s.successBox}>
            <Text style={s.successText}>✅ Link göndərildi! E-poçtunu yoxla.</Text>
          </View>
        ) : (
          <>
            {error ? (
              <View style={s.errorBox}>
                <Text style={s.errorText}>{error}</Text>
              </View>
            ) : null}
            <Text style={s.lbl}>E-poçt</Text>
            <TextInput
              style={s.inp}
              placeholder="musiqici@mail.com"
              placeholderTextColor={Colors.muted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              returnKeyType="done"
              onSubmitEditing={handleSend}
            />
            <TouchableOpacity style={[s.btn, loading && s.btnDis]} onPress={handleSend} disabled={loading}>
              {loading
                ? <ActivityIndicator color="#1a0e00" />
                : <Text style={s.btnText}>📧 Göndər</Text>
              }
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: Colors.bg },
  backBtn: { paddingHorizontal: 20, paddingTop: 16 },
  backText:{ color: Colors.gold, fontSize: 15, fontFamily: Typography.nunito700 },
  body:    { flex: 1, paddingHorizontal: 28, paddingTop: 40 },
  emoji:   { fontSize: 52, textAlign: 'center', marginBottom: 20 },
  title:   { fontFamily: Typography.playfair700, fontSize: 24, color: Colors.text, marginBottom: 8, textAlign: 'center' },
  subtitle:{ fontSize: 14, color: Colors.muted, textAlign: 'center', lineHeight: 22, marginBottom: 32, fontFamily: Typography.nunito400 },
  errorBox:{ backgroundColor: 'rgba(192,57,43,0.12)', borderWidth: 1, borderColor: 'rgba(192,57,43,0.35)', borderRadius: 12, padding: 12, marginBottom: 16 },
  errorText:{ color: '#e74c3c', fontSize: 13, fontFamily: Typography.nunito600 },
  successBox:{ backgroundColor: 'rgba(39,174,96,0.12)', borderWidth: 1, borderColor: 'rgba(39,174,96,0.35)', borderRadius: 14, padding: 16 },
  successText:{ color: Colors.green, fontSize: 14, fontFamily: Typography.nunito700, textAlign: 'center' },
  lbl:     { fontSize: 11, color: Colors.muted, fontFamily: Typography.nunito700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  inp:     { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, color: Colors.text, fontSize: 15, fontFamily: Typography.nunito400, marginBottom: 20 },
  btn:     { backgroundColor: Colors.gold, borderRadius: 28, paddingVertical: 16, alignItems: 'center' },
  btnDis:  { opacity: 0.5 },
  btnText: { color: '#1a0e00', fontSize: 16, fontFamily: Typography.nunito700 },
});
