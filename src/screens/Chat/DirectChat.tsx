import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  StyleSheet, Animated, KeyboardAvoidingView,
  Platform, ScrollView, Dimensions, ActivityIndicator, AppState, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { Colors }     from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { useAppStore } from '../../store/useAppStore';
import { markChatAsReadBy, setTyping, subscribeChatMeta, removeReadBy, cancelChat, markChatAsRead, createOrGetDirectChat, completeChat, closeChat, deleteChatWithMessages } from '../../firebase/firestore';
import { getDocs, query, collection, where, getDoc, doc } from 'firebase/firestore';
import { fbFirestore, COLLECTIONS } from '../../firebase/config';
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
  onAgreed?:    () => void;  // navigate to Müqavilələr after agreement
  onCancelled?: () => void;  // navigate to Müqavilələr -> Ləğv edilən
  fromInvite?: Invite;
}

export default function DirectChat({ musician, onClose, onAgreed, onCancelled, fromInvite: fromInviteProp }: Props) {
  const {
    user, messages, sendMessage, loadMessages, showToast,
    updateInviteStatus, receivedInvites,
    createAgreement, hasAgreementWith,
  } = useAppStore();

  const [chatId,      setChatId]      = useState<string | null>(null);
  const [msgsLoading, setMsgsLoading] = useState(false);
  const [recipientRead,  setRecipientRead]  = useState(false);
  const [recipientTyping, setRecipientTyping] = useState(false);
  const [cancelledBy,    setCancelledBy]    = useState<string | null>(null);
  const [chatClosed,    setChatClosed]    = useState(false);
  const [cancelling,    setCancelling]    = useState(false);
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

  // Auto-navigate Teymur when Sevgi agrees (fresh agreement via onSnapshot)
  const agreedCountRef = React.useRef<number | null>(null);
  const agreements = useAppStore(s => s.agreements);
  const agreementCount = agreements.filter(a =>
    (a.fromUid === musicianUid && a.toUid === user?.uid) ||
    (a.toUid === musicianUid && a.fromUid === user?.uid)
  ).length;

  React.useEffect(() => {
    // Initialize count reference on first render
    if (agreedCountRef.current === null) {
      agreedCountRef.current = agreementCount;
      return;
    }
    // New agreement appeared AND this user didn't click Razıyam (justAgreed)
    if (agreementCount > agreedCountRef.current && !justAgreed && !navigating) {
      agreedCountRef.current = agreementCount;
      setNavigating(true);
      showToast('✅ Razılaşma qəbul edildi!');
      setTimeout(() => {
        onClose();
        setTimeout(() => onAgreed?.(), 300);
      }, 2000);
    }
  }, [agreementCount]);

  // Recipient = current user is NOT the one who started the chat
  // initiatorUid is loaded from Firestore chat document
  const isRecipient = initiatorUid !== null && initiatorUid !== user?.uid;

  const showInitiatorBanner = !justAgreed && !navigating && !isRecipient && initiatorUid !== null;
  const showRecipientBanner = !justAgreed && !navigating && isRecipient;

  // Subscribe to readBy and typing
  const typingTsRef = useRef<number | null>(null);
  const initialCancelledByRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!chatId || !user?.uid) return;
    console.log('subscribeChatMeta for chatId:', chatId);
    markChatAsReadBy(chatId, user.uid).catch(() => {});
    const unsub = subscribeChatMeta(chatId, ({ readBy, typing, cancelledBy: cb, closedBy }) => {
      const otherUid = musician.uid;
      setRecipientRead(readBy.includes(otherUid));
      typingTsRef.current = typing[otherUid] ?? null;
      setRecipientTyping(!!typing[otherUid] && Date.now() - typing[otherUid] < 5000);
      // First snapshot — save initial cancelledBy value
      if (initialCancelledByRef.current === undefined) {
        initialCancelledByRef.current = cb;
      }
      setCancelledBy(cb);
      // Handle closedBy — close chat for both users
      if (closedBy && closedBy !== user?.uid) {
        setTimeout(() => { onClose(); }, 500);
      }
      // Auto navigate only if cancelledBy appeared AFTER opening
      if (cb && cb !== user?.uid && initialCancelledByRef.current === null) {
        setTimeout(() => {
          onClose();
          setTimeout(() => onCancelled?.(), 300);
        }, 1000);
      }
    });
    // Check typing every second
    const interval = setInterval(() => {
      if (typingTsRef.current) {
        setRecipientTyping(Date.now() - typingTsRef.current < 5000);
      }
    }, 1000);
    return () => { unsub(); clearInterval(interval); };
  }, [chatId, user?.uid]);

  // Set typing status when input changes
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // AppState — remove/add readBy when app is backgrounded
  useEffect(() => {
    if (!chatId || !user?.uid) return;
    const sub = AppState.addEventListener('change', state => {
      if (!chatId || !user?.uid) return;
      if (state === 'active') {
        markChatAsReadBy(chatId, user.uid).catch(() => {});
      } else {
        removeReadBy(chatId, user.uid).catch(() => {});
      }
    });
    return () => sub.remove();
  }, [chatId, user?.uid]);
  const handleInputChange = (text: string) => {
    setInputText(text);
    if (!chatId || !user?.uid) return;
    setTyping(chatId, user.uid, true).catch(() => {});
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      setTyping(chatId, user.uid, false).catch(() => {});
    }, 3000);
  };

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

  // Init chat — only load existing chat, don't create new one yet
  useEffect(() => {
    if (!user) return;
    const init = async () => {
      try {
        const musicianUid = musician.uid ?? musician.id;

        // Check cache first
        const { chatIdCache } = useAppStore.getState();
        const cachedId = chatIdCache[musicianUid];
        if (cachedId) {
          // Verify chat still exists in Firestore
          try {
            const chatSnap = await getDoc(doc(fbFirestore, COLLECTIONS.CHATS, cachedId));
            if (chatSnap.exists() && !chatSnap.data().closedBy && !chatSnap.data().completed) {
              setChatId(cachedId);
              setMsgsLoading(true);
              loadMessages(cachedId);
              setInitiatorUid(chatSnap.data().initiatorUid ?? user.uid);
              setLoading(false);
              return;
            } else {
              // Chat doesn't exist or is closed — clear cache
              const musicianUid = musician.uid ?? musician.id;
              useAppStore.setState(s => {
                const newCache = { ...s.chatIdCache };
                delete newCache[musicianUid];
                return { chatIdCache: newCache };
              });
            }
          } catch { /* ignore */ }
        }

        // Look for existing uncompleted chat
        const q = query(
          collection(fbFirestore, COLLECTIONS.CHATS),
          where('members', 'array-contains', user.uid),
          where('isGroup', '==', false),
        );
        const snap = await getDocs(q);
        const existing = snap.docs.find(d => {
          const data = d.data();
          return data.members?.includes(musicianUid) && !data.completed && !data.closedBy;
        });

        if (existing) {
          const id = existing.id;
          // Save to cache
          useAppStore.setState(s => ({ chatIdCache: { ...s.chatIdCache, [musicianUid]: id } }));
          setChatId(id);
          setMsgsLoading(true);
          loadMessages(id);
          await markChatAsRead(id, user.uid).catch(() => {});
          const data = existing.data();
          setInitiatorUid(data.initiatorUid ?? user.uid);
        } else {
          // No existing chat — will be created on first message
          setInitiatorUid(user.uid); // current user will be initiator
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

  const handleCloseChat = useCallback(() => {
    // If no messages — just close without Alert
    if (!chatId || resolved.length === 0) { onClose(); return; }
    Alert.alert(
      'Çatı bağla',
      'Bu çatı bağlamaq istədiyinizə əminsiniz? Bağlasanız bütün məlumatlar silinəcək.',
      [
        { text: 'Ləğv et', style: 'cancel' },
        {
          text: 'Bağla',
          style: 'destructive',
          onPress: async () => {
            if (!chatId) { onClose(); return; }
            try {
              // First mark as closed so other user gets notified
              await closeChat(chatId, user?.uid ?? '');
              // Wait for other user to receive the update
              await new Promise(r => setTimeout(r, 1500));
              // Then delete
              await deleteChatWithMessages(chatId, user?.uid ?? '', musician.uid ?? musician.id);
              const musicianUid = musician.uid ?? musician.id;
              useAppStore.setState(s => {
                const newCache = { ...s.chatIdCache };
                delete newCache[musicianUid];
                return { chatIdCache: newCache };
              });
            } catch { /* ignore */ }
            onClose();
          },
        },
      ]
    );
  }, [chatId, user?.uid]);

  const handleClose = useCallback(() => {
    const musicianUid = musician.uid ?? musician.id;
    if (justAgreed || navigating || cancelledBy) {
      useAppStore.setState(s => {
        const newCache = { ...s.chatIdCache };
        delete newCache[musicianUid];
        return { chatIdCache: newCache };
      });
    }
    Animated.timing(slideAnim, {
      toValue: SCREEN_W, duration: 250, useNativeDriver: true,
    }).start(onClose);
  }, [onClose, justAgreed, navigating, cancelledBy]);

  // Send text message
  const handleSend = useCallback(async () => {
    if (!inputText.trim() || !user) return;
    const text = inputText.trim();
    setInputText('');

    try {
      let activeChatId = chatId;

      // Create chat on first message if not exists yet
      if (!activeChatId) {
const id = await createOrGetDirectChat(
          user.uid,
          musician.uid ?? musician.id,
          musician.name,
          musician.emoji,
          user.displayName,
          user.city,
        );
        activeChatId = id;
        setChatId(id);
        loadMessages(id);
        setInitiatorUid(user.uid);
        // Save new chatId to cache
        const musicianUid = musician.uid ?? musician.id;
        useAppStore.setState(s => ({ chatIdCache: { ...s.chatIdCache, [musicianUid]: id } }));
      }

      await sendMessage(activeChatId, text);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      showToast('⚠️ Mesaj göndərilmədi');
    }
  }, [inputText, chatId, user, musician, sendMessage, loadMessages, showToast]);

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
    if (!recRef.current || !user) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
    setRecDuration(0);
    try {
      await recRef.current.stopAndUnloadAsync();
      const uri = recRef.current.getURI();
      recRef.current = null;
      if (!uri) return;

      let activeChatId = chatId;
      if (!activeChatId) {
const id = await createOrGetDirectChat(
          user.uid, musician.uid ?? musician.id,
          musician.name, musician.emoji,
          user.displayName, user.city,
        );
        activeChatId = id;
        setChatId(id);
        loadMessages(id);
        setInitiatorUid(user.uid);
        // Save new chatId to cache
        const musicianUid = musician.uid ?? musician.id;
        useAppStore.setState(s => ({ chatIdCache: { ...s.chatIdCache, [musicianUid]: id } }));
      }

      await sendMessage(activeChatId, `🎤 VOICE:${uri}`);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      showToast('⚠️ Səs mesajı göndərilmədi');
    }
  }, [chatId, user, sendMessage]);

  const chatMessages = chatId ? (messages[chatId] ?? []) : [];
  React.useEffect(() => { if (chatMessages.length >= 0 && msgsLoading) setMsgsLoading(false); }, [chatMessages]);
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
          <TouchableOpacity
            style={s.closeChatBtn}
            onPress={handleCloseChat}
            hitSlop={{ top:10, bottom:10, left:10, right:10 }}
          >
            <Text style={s.closeChatText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Cancelled banner */}
        {cancelledBy && (
          <View style={[s.acceptBanner, { borderColor: Colors.red, backgroundColor: 'rgba(192,57,43,0.1)' }]}>
            <Text style={[s.acceptBannerText, { color: Colors.red }]}>
              {cancelledBy === user?.uid
                ? 'Siz imtina etdiniz'
                : `${musician.name} imtina etdi`}
            </Text>
          </View>
        )}

        {/* Teymur sees: "Sevgi fikirləşir..." + Imtina button */}
        {showInitiatorBanner && !cancelledBy && (
          <View style={s.acceptBanner}>
            <Text style={[s.acceptBannerText, (recipientTyping || recipientRead) ? s.bannerBlue : s.bannerGray]}>
              {recipientTyping
                ? `✍️ ${musician.name} yazır...`
                : recipientRead
                  ? `👁 ${musician.name} baxdı`
                  : `⏳ ${musician.name} hələ baxmayıb`}
            </Text>
            <TouchableOpacity
              style={[s.cancelBtn, cancelling && { opacity: 0.6 }]}
              disabled={cancelling}
              onPress={async () => {
if (!chatId || !user?.uid) return;
                setCancelling(true);
                try {
await cancelChat(chatId, user.uid, user.displayName ?? '', musician.uid, musician.name);
                  showToast('İmtina edildi');
                  setTimeout(() => {
                    onClose();
                    setTimeout(() => onCancelled?.(), 300);
                  }, 1000);
                } finally { setCancelling(false); }
              }}
            >
              <Text style={s.cancelBtnText}>✖ Imtina</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Sevgi sees: "Teymur cavab gözləyir" + Razıyam + Imtina buttons */}
        {showRecipientBanner && !cancelledBy && (
          <View style={s.acceptBanner}>
            <Text style={[s.acceptBannerText, (recipientTyping || recipientRead) ? s.bannerBlue : s.bannerGray]}>
              {recipientTyping
                ? `✍️ ${musician.name} yazır...`
                : recipientRead
                  ? `👁 ${musician.name} baxdı`
                  : `🤝 ${musician.name} cavab gözləyir`}
            </Text>
            <TouchableOpacity
              style={[s.acceptBtn, accepting && { opacity: 0.6 }]}
              onPress={async () => {
                setAccepting(true);
                try {
                  await createAgreement(musicianUid, musician.name, chatId ?? undefined);
                  // Mark chat as completed so next Mesaj creates fresh chat
                  if (chatId) {
await completeChat(chatId).catch(() => {});
                  }
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
            <TouchableOpacity
              style={[s.cancelBtn, cancelling && { opacity: 0.6 }]}
              disabled={cancelling}
              onPress={async () => {
if (!chatId || !user?.uid) return;
                setCancelling(true);
                try {
await cancelChat(chatId, user.uid, user.displayName ?? '', musician.uid, musician.name);
                  showToast('İmtina edildi');
                  setTimeout(() => {
                    onClose();
                    setTimeout(() => onCancelled?.(), 300);
                  }, 1000);
                } finally { setCancelling(false); }
              }}
            >
              <Text style={s.cancelBtnText}>✖ Imtina</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Agreed banner — only show when just agreed in this session */}
        {(justAgreed || navigating) && (
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
            {loading && (
              <View style={{ alignItems: 'center', padding: 30 }}>
                <ActivityIndicator size="large" color={Colors.gold} />
              </View>
            )}
            {!loading && resolved.length === 0 && (
              <View style={s.emptyChat}>
                <Text style={{ fontSize: 40 }}>💬</Text>
                <Text style={s.emptyChatText}>{musician.name} ilə söhbət</Text>
                <Text style={s.emptyChatSub}>Mesaj və ya səs göndər</Text>
              </View>
            )}
            {msgsLoading && (
              <View style={{ alignItems: 'center', padding: 20 }}>
                <ActivityIndicator size="small" color={Colors.gold} />
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
              onChangeText={handleInputChange}
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
  closeChatBtn:  { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  closeChatText: { color: Colors.muted, fontSize: 18, fontFamily: Typography.nunito600 },
  cancelBtn:        { marginTop: 8, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: Colors.red, alignItems: 'center' },
  cancelBtnText:    { color: Colors.red, fontFamily: Typography.nunito600, fontSize: 13 },
  bannerBlue:       { color: '#4a90d9' },
  bannerGray:       { color: Colors.muted },
  acceptBannerText: { flex: 1, fontSize: 13, fontFamily: Typography.nunito600 },
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
