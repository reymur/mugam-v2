import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  StyleSheet, Animated, KeyboardAvoidingView,
  Platform, ScrollView, Dimensions, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { Colors }     from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { useAppStore } from '../../store/useAppStore';
import type { Musician, Invite } from '../../store/useAppStore';

const SCREEN_W = Dimensions.get('window').width;

// ── Voice Message Player ──────────────────────────────────
function VoicePlayer({ uri, mine }: { uri: string; mine: boolean }) {
  const [sound,   setSound]   = useState<Audio.Sound | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    return () => { sound?.unloadAsync().catch(() => {}); };
  }, [sound]);

  const handlePlay = async () => {
    try {
      if (playing && sound) {
        await sound.stopAsync();
        setPlaying(false);
        return;
      }
      setLoading(true);
      if (sound) await sound.unloadAsync();
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded && status.didJustFinish) setPlaying(false);
        }
      );
      setSound(newSound);
      setPlaying(true);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  return (
    <TouchableOpacity style={[vs.wrap, mine ? vs.wrapMine : vs.wrapTheirs]} onPress={handlePlay}>
      {loading
        ? <ActivityIndicator size="small" color={mine ? '#1a0e00' : Colors.gold} />
        : <Text style={[vs.icon, { color: mine ? '#1a0e00' : Colors.gold }]}>{playing ? '⏹' : '▶'}</Text>
      }
      <View style={vs.bars}>
        {Array.from({ length: 16 }).map((_, i) => (
          <View key={i} style={[vs.bar, { height: 4 + Math.sin(i * 0.8) * 8 + 4 }, playing && { backgroundColor: mine ? '#1a0e00' : Colors.gold }]} />
        ))}
      </View>
      <Text style={[vs.label, { color: mine ? '#1a0e00' : Colors.muted }]}>🎤</Text>
    </TouchableOpacity>
  );
}

// ── Main DirectChat ───────────────────────────────────────
interface Props {
  musician:   Musician;
  onClose:    () => void;
  onAgreed?:  () => void;  // navigate to Müqavilələr after agreement
  fromInvite?: Invite;
}

export default function DirectChat({ musician, onClose, onAgreed, fromInvite: fromInviteProp }: Props) {
  const {
    user, messages, sendMessage, loadMessages, showToast,
    updateInviteStatus, receivedInvites,
    createAgreement, hasAgreementWith,
  } = useAppStore();

  const [chatId,      setChatId]      = useState<string | null>(null);
  const [inputText,   setInputText]   = useState('');
  const [loading,     setLoading]     = useState(true);
  const [recording,   setRecording]   = useState(false);
  const [recDuration, setRecDuration] = useState(0);
  const [accepting,   setAccepting]   = useState(false);
  const [justAgreed,  setJustAgreed]  = useState(false);
  const [initiatorUid, setInitiatorUid] = useState<string | null>(null);
  const [navigating,  setNavigating]  = useState(false);

  const musicianUid = musician.uid ?? musician.id;

  // Already agreed before opening chat?
  const agreedBefore = hasAgreementWith(musicianUid);
  // Just agreed in this session?
  const agreed = agreedBefore || justAgreed;

  // Auto-navigate BOTH users when agreement is created
  const agreedRef = React.useRef(false);
  React.useEffect(() => {
    // Trigger for Teymur (initiator) — Sevgi agreed via Firestore update
    if (
      agreedBefore &&
      !agreedRef.current &&
      !isRecipient &&
      initiatorUid !== null &&
      !navigating
    ) {
      agreedRef.current = true;
      setNavigating(true);
      showToast('✅ Razılaşma qəbul edildi!');
      setTimeout(() => {
        onClose();
        setTimeout(() => onAgreed?.(), 300);
      }, 2000);
    }
  }, [agreedBefore, initiatorUid]);

  // Recipient = current user is NOT the one who started the chat
  // initiatorUid is loaded from Firestore chat document
  const isRecipient = initiatorUid !== null && initiatorUid !== user?.uid;

  const showInitiatorBanner = !agreedBefore && !justAgreed && !isRecipient && initiatorUid !== null;
  const showRecipientBanner = !agreedBefore && !justAgreed && isRecipient;

  const scrollRef  = useRef<ScrollView>(null);
  const slideAnim  = useRef(new Animated.Value(SCREEN_W)).current;
  const recRef     = useRef<Audio.Recording | null>(null);
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  // Slide in
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0, damping: 26, stiffness: 300, useNativeDriver: true,
    }).start();
  }, []);

  // Init chat
  useEffect(() => {
    if (!user) return;
    const init = async () => {
      try {
        const { createOrGetDirectChat, markChatAsRead } = await import('../../firebase/firestore');
        const { getDoc, doc } = await import('firebase/firestore');
        const { fbFirestore, COLLECTIONS } = await import('../../firebase/config');

        const id = await createOrGetDirectChat(
          user.uid,
          musician.uid ?? musician.id,
          musician.name,
          musician.emoji,
          user.displayName,
          user.city,
        );
        setChatId(id);
        loadMessages(id);
        await markChatAsRead(id, user.uid).catch(() => {});

        // Load initiatorUid to determine who is recipient
        const chatSnap = await getDoc(doc(fbFirestore, COLLECTIONS.CHATS, id));
        if (chatSnap.exists()) {
          setInitiatorUid(chatSnap.data().initiatorUid ?? user.uid);
        }
      } catch {
        showToast('⚠️ Çat açılmadı');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [user, musician]);

  // Init audio
  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    }).catch(() => {});
  }, []);

  const handleClose = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_W, duration: 250, useNativeDriver: true,
    }).start(onClose);
  }, [onClose]);

  // Send text message
  const handleSend = useCallback(async () => {
    if (!inputText.trim() || !chatId || !user) return;
    const text = inputText.trim();
    setInputText('');
    await sendMessage(chatId, text);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [inputText, chatId, user, sendMessage]);

  // Start voice recording
  const startRecording = useCallback(async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        showToast('⚠️ Mikrofon icazəsi lazımdır');
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      recRef.current = rec;
      setRecording(true);
      setRecDuration(0);
      timerRef.current = setInterval(() => {
        setRecDuration(d => d + 1);
      }, 1000);
    } catch {
      showToast('⚠️ Səs yazmaq mümkün olmadı');
    }
  }, [showToast]);

  // Stop and send voice message
  const stopRecording = useCallback(async () => {
    if (!recRef.current || !chatId || !user) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
    setRecDuration(0);
    try {
      await recRef.current.stopAndUnloadAsync();
      const uri = recRef.current.getURI();
      recRef.current = null;
      if (!uri) return;

      // Send voice message as text with special prefix
      // In production — upload to Storage, here we use local URI
      await sendMessage(chatId, `🎤 VOICE:${uri}`);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      showToast('⚠️ Səs mesajı göndərilmədi');
    }
  }, [chatId, user, sendMessage]);

  const chatMessages = chatId ? (messages[chatId] ?? []) : [];
  const resolved = chatMessages.map(m => ({ ...m, mine: m.senderId === user?.uid }));

  const formatDur = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <Animated.View style={[
      StyleSheet.absoluteFillObject,
      { backgroundColor: Colors.bg, zIndex: 200, transform: [{ translateX: slideAnim }] },
    ]}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={handleClose} hitSlop={{ top:10, bottom:10, left:10, right:10 }}>
            <Text style={s.backText}>←</Text>
          </TouchableOpacity>
          <View style={s.headerInfo}>
            <Text style={s.headerEmoji}>{musician.emoji}</Text>
            <View>
              <Text style={s.headerName}>{musician.name}</Text>
              <Text style={s.headerSub}>{musician.instrument}</Text>
            </View>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Teymur sees: "Sevgi fikirləşir..." — no buttons */}
        {showInitiatorBanner && (
          <View style={s.acceptBanner}>
            <Text style={s.acceptBannerText}>
              🤔 {musician.name} fikirləşir....
            </Text>
          </View>
        )}

        {/* Sevgi sees: "Teymur cavab gözləyir" + Razıyam button */}
        {showRecipientBanner && (
          <View style={s.acceptBanner}>
            <Text style={s.acceptBannerText}>
              🤝 {musician.name} cavab gözləyir
            </Text>
            <TouchableOpacity
              style={[s.acceptBtn, accepting && { opacity: 0.6 }]}
              onPress={async () => {
                setAccepting(true);
                try {
                  await createAgreement(musicianUid, musician.name, chatId ?? undefined);
                  setJustAgreed(true);
                  setNavigating(true);
                  showToast(`✅ ${musician.name} ilə razılaşdınız!`);
                  setTimeout(() => {
                    onClose();
                    setTimeout(() => onAgreed?.(), 300);
                  }, 2000);
                } finally {
                  setAccepting(false);
                }
              }}
              disabled={accepting}
            >
              {accepting
                ? <ActivityIndicator size="small" color="white" />
                : <Text style={s.acceptBtnText}>✅ Razıyam</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {/* Both see agreed banner briefly before navigating */}
        {(justAgreed || (agreedBefore && !navigating)) && (
          <View style={[s.acceptBanner, { backgroundColor: 'rgba(39,174,96,0.1)', borderColor: Colors.green }]}>
            <Text style={[s.acceptBannerText, { color: Colors.green }]}>
              ✅ Razılaşma qəbul edildi — Müqavilələr bölməsinə keçirik...
            </Text>
          </View>
        )}

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Messages */}
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={s.msgList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          >
            {loading && <Text style={s.loadingText}>Yüklənir...</Text>}
            {!loading && resolved.length === 0 && (
              <View style={s.emptyChat}>
                <Text style={{ fontSize: 40 }}>💬</Text>
                <Text style={s.emptyChatText}>{musician.name} ilə söhbət</Text>
                <Text style={s.emptyChatSub}>Mesaj və ya səs göndər</Text>
              </View>
            )}
            {resolved.map((msg, i) => {
              const isVoice = msg.text?.startsWith('🎤 VOICE:');
              const voiceUri = isVoice ? msg.text.replace('🎤 VOICE:', '') : null;
              return (
                <View key={msg.id ?? i} style={[s.msgWrap, msg.mine ? s.msgWrapMine : s.msgWrapTheirs]}>
                  {isVoice && voiceUri ? (
                    <VoicePlayer uri={voiceUri} mine={msg.mine} />
                  ) : (
                    <View style={[s.msgBubble, msg.mine ? s.msgBubbleMine : s.msgBubbleTheirs]}>
                      <Text style={[s.msgText, msg.mine ? s.msgTextMine : s.msgTextTheirs]}>
                        {msg.text}
                      </Text>
                      <Text style={[s.msgTime, msg.mine ? s.msgTimeMine : s.msgTimeTheirs]}>
                        {msg.time}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>

          {/* Recording indicator */}
          {recording && (
            <View style={s.recordingBar}>
              <View style={s.recDot} />
              <Text style={s.recText}>Yazılır... {formatDur(recDuration)}</Text>
              <Text style={s.recHint}>Buraxmaq üçün mikrofonu bas</Text>
            </View>
          )}

          {/* Input bar */}
          <View style={s.inputRow}>
            {/* Voice button */}
            <TouchableOpacity
              style={[s.voiceBtn, recording && s.voiceBtnActive]}
              onPressIn={startRecording}
              onPressOut={stopRecording}
            >
              <Text style={{ fontSize: 20 }}>{recording ? '⏹' : '🎤'}</Text>
            </TouchableOpacity>

            <TextInput
              style={s.input}
              placeholder="Mesaj yaz..."
              placeholderTextColor={Colors.muted}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={handleSend}
            />

            <TouchableOpacity
              style={[s.sendBtn, !inputText.trim() && s.sendBtnDis]}
              onPress={handleSend}
              disabled={!inputText.trim()}
            >
              <Text style={s.sendBtnText}>➤</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Animated.View>
  );
}

const vs = StyleSheet.create({
  wrap:       { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, maxWidth: '75%' },
  wrapMine:   { backgroundColor: Colors.gold, borderBottomRightRadius: 4 },
  wrapTheirs: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderBottomLeftRadius: 4 },
  icon:       { fontSize: 20 },
  bars:       { flexDirection: 'row', alignItems: 'center', gap: 2, height: 24 },
  bar:        { width: 3, borderRadius: 2, backgroundColor: 'rgba(128,128,128,0.4)' },
  label:      { fontSize: 14 },
});

const s = StyleSheet.create({
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  acceptBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: 'rgba(212,160,60,0.08)', borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 10 },
  acceptBannerText: { flex: 1, fontSize: 13, color: Colors.text, fontFamily: Typography.nunito600 },
  acceptBtn:    { backgroundColor: Colors.green, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  acceptBtnText:{ color: 'white', fontSize: 13, fontFamily: Typography.nunito700 },
  backBtn:     { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backText:    { fontSize: 24, color: Colors.text },
  headerInfo:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerEmoji: { fontSize: 28 },
  headerName:  { fontFamily: Typography.playfair700, fontSize: 16, color: Colors.text },
  headerSub:   { fontSize: 12, color: Colors.gold, fontFamily: Typography.nunito600 },
  msgList:     { padding: 14, gap: 8, paddingBottom: 8 },
  loadingText: { textAlign: 'center', color: Colors.muted, fontSize: 13, marginTop: 20, fontFamily: Typography.nunito400 },
  emptyChat:   { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyChatText: { fontFamily: Typography.playfair700, fontSize: 18, color: Colors.text },
  emptyChatSub:  { fontSize: 13, color: Colors.muted, fontFamily: Typography.nunito400 },
  msgWrap:       { flexDirection: 'row', marginBottom: 4 },
  msgWrapMine:   { justifyContent: 'flex-end' },
  msgWrapTheirs: { justifyContent: 'flex-start' },
  msgBubble:     { maxWidth: '75%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  msgBubbleMine: { backgroundColor: Colors.gold, borderBottomRightRadius: 4 },
  msgBubbleTheirs: { backgroundColor: Colors.card, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: Colors.border },
  msgText:     { fontSize: 15, lineHeight: 22, fontFamily: Typography.nunito400 },
  msgTextMine: { color: '#1a0e00' },
  msgTextTheirs: { color: Colors.text },
  msgTime:     { fontSize: 10, marginTop: 4, fontFamily: Typography.nunito400 },
  msgTimeMine: { color: 'rgba(26,14,0,0.5)', textAlign: 'right' },
  msgTimeTheirs: { color: Colors.muted },
  recordingBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: 'rgba(192,57,43,0.1)', borderTopWidth: 1, borderTopColor: Colors.border },
  recDot:      { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.red },
  recText:     { color: Colors.red, fontSize: 14, fontFamily: Typography.nunito700 },
  recHint:     { color: Colors.muted, fontSize: 11, fontFamily: Typography.nunito400, flex: 1, textAlign: 'right' },
  inputRow:    { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.bg },
  voiceBtn:    { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  voiceBtnActive: { backgroundColor: 'rgba(192,57,43,0.15)', borderColor: Colors.red },
  input:       { flex: 1, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: Colors.text, fontSize: 15, fontFamily: Typography.nunito400, maxHeight: 120 },
  sendBtn:     { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.gold, alignItems: 'center', justifyContent: 'center' },
  sendBtnDis:  { opacity: 0.4 },
  sendBtnText: { color: '#1a0e00', fontSize: 18, fontFamily: Typography.nunito700 },
});
