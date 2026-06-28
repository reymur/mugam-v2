import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Modal as RNModal,
  View, Text, TouchableOpacity, TextInput, Image,
  StyleSheet, Animated, KeyboardAvoidingView,
  Platform, ScrollView, Dimensions, ActivityIndicator, AppState, Alert, Modal, TextInput as RNTextInput, PanResponder, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Audio } from 'expo-av';
import { Linking } from 'react-native';
import { VoicePlayer } from '../../components/common/VoiceMessage';
import ChatInput from '../../components/common/ChatInput';
import ZoomableImage from '../../components/common/ZoomableImage';
import GalleryPicker from '../../components/common/GalleryPicker';
import { uploadChatImage } from '../../firebase/firestore';
import TypingIndicator from '../../components/common/TypingIndicator';
import { Colors }     from '../../theme/colors';
import EventModal from '../../components/common/EventModal';
import { Typography } from '../../theme/typography';
import { useAppStore } from '../../store/useAppStore';
import { markChatAsReadBy, markChatAsDelivered, setTyping, subscribeChatMeta, removeReadBy, cancelChat, markChatAsRead, createOrGetDirectChat, completeChat, closeChat, deleteChatWithMessages, saveChatEventDate, setWaitingForDate, setJobOffer, clearChatForUser, deleteMessageForAll, deleteMessageForMe, deleteMessagePermanently, subscribeUserOnline, uploadVoiceMessage, addActiveUser, removeActiveUser } from '../../firebase/firestore';
import { getDocs, query, collection, where, getDoc, doc, onSnapshot } from 'firebase/firestore';
import { fbFirestore, COLLECTIONS } from '../../firebase/config';
import type { Musician, Invite } from '../../store/useAppStore';
import { CheckMark } from '../../components/common/CheckMark';
import { useScrollToMessage } from './hooks/useScrollToMessage';

const SCREEN_W = Dimensions.get('window').width;

// ── Voice Message Player ──────────────────────────────────
function SwipeableMessage({ children, onSwipeLeft, onSwipeRight, disabled, disableSwipeLeft }: { children: React.ReactNode; onSwipeLeft: () => void; onSwipeRight: () => void; disabled?: boolean; disableSwipeLeft?: boolean }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const replyIconScale = useRef(new Animated.Value(0)).current;
  const replyIconOpacity = useRef(new Animated.Value(0)).current;
  const replyTriggered = useRef(false);
  const disableSwipeLeftRef = useRef(disableSwipeLeft);
  disableSwipeLeftRef.current = disableSwipeLeft;

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, g) => {
      const isHorizontal = Math.abs(g.dx) > Math.abs(g.dy) * 1.5 && Math.abs(g.dx) > 10;
      return isHorizontal;
    },
    onPanResponderTerminationRequest: () => false,
    onPanResponderMove: (_, g) => {
      if (g.dx < 0 && !disableSwipeLeftRef.current) {
        translateX.setValue(g.dx);
        replyIconOpacity.setValue(0);
      } else if (g.dx > 0) {
        const clamped = Math.min(g.dx, 80);
        translateX.setValue(clamped);
        const progress = clamped / 80;
        replyIconOpacity.setValue(progress);
        replyIconScale.setValue(0.5 + progress * 0.5);
        if (clamped >= 70 && !replyTriggered.current) {
          replyTriggered.current = true;
          Animated.spring(replyIconScale, { toValue: 1.3, useNativeDriver: true }).start(() => {
            Animated.spring(replyIconScale, { toValue: 1, useNativeDriver: true }).start();
          });
        }
      }
    },
    onPanResponderRelease: (_, g) => {
      replyTriggered.current = false;
      if (g.dx < -60 && !disableSwipeLeftRef.current) {
        Animated.timing(translateX, { toValue: -SCREEN_W, duration: 200, useNativeDriver: true }).start(() => {
          onSwipeLeft();
          translateX.setValue(0);
        });
      } else if (g.dx >= 60) {
        onSwipeRight();
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        Animated.timing(replyIconOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      } else {
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        Animated.timing(replyIconOpacity, { toValue: 0, duration: 150, useNativeDriver: true }).start();
      }
    },
  })).current;

  if (disabled) return <View>{children}</View>;

  return (
    <View style={{ position: 'relative' }}>
      <Animated.View style={{
        position: 'absolute', left: 8, top: '50%',
        opacity: replyIconOpacity,
        transform: [{ scale: replyIconScale }, { translateY: -12 }],
        zIndex: 1,
      }}>
        <Text style={{ fontSize: 20 }}>↩️</Text>
      </Animated.View>
      <Animated.View {...panResponder.panHandlers} style={{ transform: [{ translateX }] }}>
        {children}
      </Animated.View>
    </View>
  );
}

function TypingDots() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: -6, duration: 200, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 200, useNativeDriver: true }),
          Animated.delay(400),
        ])
      );
    const a1 = anim(dot1, 0);
    const a2 = anim(dot2, 150);
    const a3 = anim(dot3, 300);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, []);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8 }}>
      {[dot1, dot2, dot3].map((dot, i) => (
        <Animated.View
          key={i}
          style={{
            width: 8, height: 8, borderRadius: 4,
            backgroundColor: Colors.gold,
            transform: [{ translateY: dot }],
          }}
        />
      ))}
    </View>
  );
}




// ── Custom Date Picker ────────────────────────────────────
const ITEM_H = 44;
const VISIBLE = 7;
const PICKER_H = ITEM_H * VISIBLE;

function WheelCol({ items, selectedIndex, onSelect, flex = 1 }: {
  items: string[];
  selectedIndex: number;
  onSelect: (i: number) => void;
  flex?: number;
}) {
  const scrollRef = React.useRef<ScrollView>(null);

  React.useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: selectedIndex * ITEM_H, animated: false });
    }, 80);
  }, []);

  return (
    <View style={{ flex, height: PICKER_H }}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        onMomentumScrollEnd={e => {
          const i = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
          onSelect(Math.max(0, Math.min(i, items.length - 1)));
        }}
        contentContainerStyle={{ paddingVertical: ITEM_H * 3 }}
      >
        {items.map((item, i) => {
          const isSelected = i === selectedIndex;
          return (
            <TouchableOpacity
              key={i}
              style={{ height: ITEM_H, alignItems: 'center', justifyContent: 'center' }}
              onPress={() => {
                onSelect(i);
                scrollRef.current?.scrollTo({ y: i * ITEM_H, animated: true });
              }}
              activeOpacity={0.7}
            >
              <Text style={{
                color: isSelected ? '#ffffff' : Colors.muted,
                fontSize: isSelected ? 20 : 15,
                fontFamily: isSelected ? Typography.nunito700 : Typography.nunito400,
                opacity: isSelected ? 1 : Math.max(0.15, 1 - Math.abs(i - selectedIndex) * 0.3),
              }}>
                {item}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

function CustomDatePicker({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
  const months = ['Yan','Fev','Mar','Apr','May','İyn','İyl','Avq','Sen','Okt','Noy','Dek'];
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  const now = new Date();
  const minYear = now.getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => (minYear + i).toString());

  const getDaysInMonth = (m: number, y: number) => new Date(y, m + 1, 0).getDate();
  const days = Array.from(
    { length: getDaysInMonth(value.getMonth(), value.getFullYear()) },
    (_, i) => (i + 1).toString().padStart(2, '0')
  );

  return (
    <View style={{ borderRadius: 16, overflow: 'hidden', backgroundColor: '#161210', marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}>
      {/* Selection highlight */}
      <View pointerEvents="none" style={{
        position: 'absolute',
        top: ITEM_H * 3,
        left: 8, right: 8,
        height: ITEM_H,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(212,160,60,0.5)',
        backgroundColor: 'rgba(255,255,255,0.07)',
        zIndex: 1,
      }} />
      <View style={{ flexDirection: 'row', paddingHorizontal: 8 }}>
        <WheelCol
          flex={1}
          items={days}
          selectedIndex={value.getDate() - 1}
          onSelect={i => { const d = new Date(value); d.setDate(i + 1); onChange(d); }}
        />
        <WheelCol
          flex={2}
          items={months}
          selectedIndex={value.getMonth()}
          onSelect={i => {
            const d = new Date(value);
            d.setMonth(i);
            const maxDay = getDaysInMonth(i, d.getFullYear());
            if (d.getDate() > maxDay) d.setDate(maxDay);
            onChange(d);
          }}
        />
        <WheelCol
          flex={2}
          items={years}
          selectedIndex={Math.max(0, value.getFullYear() - minYear)}
          onSelect={i => { const d = new Date(value); d.setFullYear(minYear + i); onChange(d); }}
        />
        <WheelCol
          flex={1}
          items={hours}
          selectedIndex={value.getHours()}
          onSelect={i => { const d = new Date(value); d.setHours(i); onChange(d); }}
        />
        <WheelCol
          flex={1}
          items={minutes}
          selectedIndex={value.getMinutes()}
          onSelect={i => { const d = new Date(value); d.setMinutes(i); onChange(d); }}
        />
      </View>
    </View>
  );
}

// ── Main DirectChat ───────────────────────────────────────
interface Props {
  musician:   Musician;
  onClose:    () => void;
  onAgreed?:    (tab?: 'outgoing' | 'incoming') => void;  // navigate to Müqavilələr after agreement
  onCancelled?: () => void;  // navigate to Müqavilələr -> Ləğv edilən
  fromInvite?: Invite;
}

export default function DirectChat({ musician, onClose, onAgreed, onCancelled, fromInvite: fromInviteProp }: Props) {
  const {
    user, messages, sendMessage, loadMessages, loadMoreMessages, showToast, _chatHasMore,
    updateInviteStatus, receivedInvites,
    createAgreement, hasAgreementWith,
  } = useAppStore();

  const [chatId,      setChatId]      = useState<string | null>(null);
  const [showGallery, setShowGallery] = React.useState(false);
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null);

  const handleGallerySelect = async (uri: string) => {
    if (!user?.uid) return;
    try {
      let activeChatId = chatId;
      if (!activeChatId) {
        activeChatId = await createOrGetDirectChat(
          user.uid,
          musician.uid ?? musician.id,
          musician.name,
          musician.emoji,
          user.displayName,
          user.city,
        );
        setChatId(activeChatId);
        loadMessages(activeChatId);
      }
      // Optimistic: показываем фото сразу с локальным URI
      const tempId = await sendMessage(activeChatId, `📷 IMAGE:${uri}`);
      // Загружаем на Firebase в фоне
      const url = await uploadChatImage(activeChatId, uri, user.uid);
      // Обновляем tempMsg с реальным Firebase URL
      updateMessage(activeChatId, tempId, `📷 IMAGE:${url}`);
    } catch {
      // silent
    }
  };
  const [msgsLoading, setMsgsLoading] = useState(false);
  const [recipientRead,  setRecipientRead]  = useState(false);
  const [recipientOnline, setRecipientOnline] = useState(false);
  const [lastReadAt,     setLastReadAt]     = useState<Record<string, string>>({});
  const [lastReadMsgId,  setLastReadMsgId]  = useState<Record<string, string>>({});
  const [deliveredTo, setDeliveredTo] = useState<Record<string, boolean>>({});
  const [recipientTyping, setRecipientTyping] = useState(false);
  const [cancelledBy,    setCancelledBy]    = useState<string | null>(null);
  const cancelledByRef = React.useRef<string | null>(null);
  const [chatClosed,    setChatClosed]    = useState(false);
  const [waitingForDate, setWaitingForDate2] = useState(false);
  const [cancelling,    setCancelling]    = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [eventDate,      setEventDate]      = useState<Date | null>(null);
  const [eventType,      setEventType]      = useState('Toy');
  const [eventLocation,  setEventLocation]  = useState('');
  const [eventNotes,     setEventNotes]     = useState('');
  const [showCustomNote, setShowCustomNote] = useState(false);
  const [customNote,     setCustomNote]     = useState('');
  const [showEventTypes, setShowEventTypes] = useState(false);

  const EVENT_TYPES = ['Toy', 'Konsert', 'Bayram', 'Digər'];
  const NOTES_OPTIONS = [
    'Qara kostyum və ağ köynək',
    'Qara köynək sərbəst',
    'Qalstuk',
    'Baboçka',
    'Yumru boğaz köynək sərbəst',
  ];
  const [inputText,   setInputText]   = useState('');
  const [loading,     setLoading]     = useState(true);
  const [recording,   setRecording]   = useState(false);
  const [voiceUploading, setVoiceUploading] = useState(false);
  const [localDeletedIds, setLocalDeletedIds] = useState<Set<string>>(new Set());
  const [recDuration, setRecDuration] = useState(0);
  const [accepting,   setAccepting]   = useState(false);
  const [justAgreed,  setJustAgreed]  = useState(false);
  const [initiatorUid, setInitiatorUid] = useState<string | null>(null);
  const [navigating,  setNavigating]  = useState(false);
  const [jobOfferBy,  setJobOfferBy]  = useState<string | null>(null);
  const [showMenu,    setShowMenu]    = useState(false);
  const [clearedAt,   setClearedAt]   = useState<string | null>(null);
  const [selectedMsg, setSelectedMsg] = useState<Message | null>(null);
  const [replyMsg,    setReplyMsg]    = useState<Message | null>(null);
  const msgPositions = useRef<Record<string, number>>({});
  const { msgRefs, highlightId, scrollToMessage } = useScrollToMessage();

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
    if (agreementCount > agreedCountRef.current && !justAgreed && !navigating && !cancelledByRef.current) {
      agreedCountRef.current = agreementCount;
      setNavigating(true);
      showToast('✅ Razılaşma qəbul edildi!');
      setTimeout(() => {
        onClose();
        setTimeout(() => onAgreed?.(isRecipient ? 'incoming' : 'outgoing'), 300);
      }, 2000);
    }
  }, [agreementCount]);

  // Recipient = current user is NOT the one who started the chat
  // initiatorUid is loaded from Firestore chat document
  const isRecipient = initiatorUid !== null && initiatorUid !== user?.uid;

  const showInitiatorBanner = !justAgreed && !navigating && jobOfferBy !== null && jobOfferBy === user?.uid;
  const showRecipientBanner = !justAgreed && !navigating && jobOfferBy !== null && jobOfferBy !== user?.uid;

  // Subscribe to readBy and typing
  const typingTsRef = useRef<number | null>(null);
  const initialCancelledByRef = useRef<string | null | undefined>(undefined);
  const prevWaitingForDateRef = useRef<boolean>(false);

  // Subscribe to recipient online status
  useEffect(() => {
    const mUid = musician.uid ?? musician.id;
    const unsub = subscribeUserOnline(mUid, (online) => {
      setRecipientOnline(online);
      const activeChatId = chatId ?? useAppStore.getState().chatIdCache[mUid];
      if (online && activeChatId) {
        markChatAsDelivered(activeChatId, mUid).catch(() => {});
      }
    });
    return () => unsub();
  }, [musician]);

  // When chatId appears and recipient is online — mark as delivered
  useEffect(() => {
    if (!chatId || !recipientOnline) return;
    const mUid = musician.uid ?? musician.id;
    markChatAsDelivered(chatId, mUid).catch(() => {});
  }, [chatId, recipientOnline]);

  useEffect(() => {
    if (!chatId || !user?.uid) return;
    console.log('subscribeChatMeta for chatId:', chatId);
    addActiveUser(chatId, user.uid).catch(() => {});
    const _lastOther1 = [...(messages[chatId] ?? [])].reverse().find(m => m.senderId !== user.uid);
    if (_lastOther1?.id) markChatAsReadBy(chatId, user.uid, _lastOther1.id).catch(() => {});
    const unsub = subscribeChatMeta(chatId, (data) => {
      const { readBy, typing, cancelledBy: cb, closedBy, eventDate: ed, eventType: et, eventLocation: el, eventNotes: en } = data;
      const otherUid = musicianUid;
      setRecipientRead(readBy.includes(otherUid));
      typingTsRef.current = typing[otherUid] ?? null;
      setRecipientTyping(!!typing[otherUid] && Date.now() - typing[otherUid] < 5000);
      // First snapshot — save initial cancelledBy value
      if (initialCancelledByRef.current === undefined) {
        initialCancelledByRef.current = cb;
      }
      setCancelledBy(cb);
      cancelledByRef.current = cb ?? null;
      // Sync event data from Firestore
      if (ed) { setEventDate(new Date(ed)); setEventType(et); setEventLocation(el); setEventNotes(en ?? ''); }
      const prevWaiting = prevWaitingForDateRef.current;
      const currWaiting = data.waitingForDate ?? false;
      setWaitingForDate2(currWaiting);
      setJobOfferBy(data.jobOfferBy ?? null);
      setLastReadAt(data.lastReadAt ?? {});
      setLastReadMsgId(data.lastReadMsgId ?? {});
      setDeliveredTo(data.deliveredTo ?? {});
      if (user?.uid && data.clearedBy?.[user.uid]) setClearedAt(data.clearedBy[user.uid]);
      // Only update ref and show alert when initiatorUid is loaded
      if (initiatorUid !== null) {
        if (currWaiting && !prevWaiting && initiatorUid === user?.uid) {
          Alert.alert('', `${musician.name} sizdən tarix gözləyir 📅`);
          // Reset so next press triggers again
          if (chatId) setWaitingForDate(chatId, false).catch(() => {});
        }
        prevWaitingForDateRef.current = currWaiting;
      }
      // Handle closedBy — show alert to recipient
      if (closedBy && closedBy !== user?.uid) {
        Alert.alert(
          `${musician.name} çatı bağladı`,
          '',
          [{ text: 'Çıx', onPress: () => onClose() }],
          { cancelable: false }
        );
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
        const _lastOther2 = [...(messages[chatId] ?? [])].reverse().find(m => m.senderId !== user.uid);
        if (_lastOther2?.id) markChatAsReadBy(chatId, user.uid, _lastOther2.id).catch(() => {});
        addActiveUser(chatId, user.uid).catch(() => {});
      } else {
        removeReadBy(chatId, user.uid).catch(() => {});
        removeActiveUser(chatId, user.uid).catch(() => {});
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
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const inputRef   = useRef<RNTextInput>(null);
  const slideAnim  = useRef(new Animated.Value(SCREEN_W)).current;
  const recRef     = useRef<Audio.Recording | null>(null);
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationRef = useRef(0);

  // Slide in
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0, damping: 26, stiffness: 300, useNativeDriver: true,
    }).start();
  }, []);

  // Watch for new chat created by other user while screen is open
  useEffect(() => {
    if (chatId || !user?.uid) return;
    const mUid = musician.uid ?? musician.id;
    const q = query(
      collection(fbFirestore, COLLECTIONS.CHATS),
      where('members', 'array-contains', user.uid),
      where('isGroup', '==', false),
    );
    const unsub = onSnapshot(q, snap => {
      if (chatId) { unsub(); return; }
      const found = snap.docs.find(d => {
        const data = d.data();
        return data.members?.includes(mUid) && !data.completed && !data.closedBy;
      });
      if (found) {
        unsub();
        setChatId(prev => prev === found.id ? prev : found.id);
        loadMessages(found.id);
        useAppStore.setState(s => ({ chatIdCache: { ...s.chatIdCache, [mUid]: found.id } }));
      }
    });
    return () => unsub();
  }, [chatId, user?.uid]);

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
              setChatId(prev => prev === cachedId ? prev : cachedId);
              
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
          setChatId(prev => prev === id ? prev : id);
          
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
    // Reset waitingForDate on exit
    if (chatId && user?.uid) {
      removeActiveUser(chatId, user.uid).catch(() => {});
      setWaitingForDate(chatId, false).catch(() => {});
    }
    // Reset ref for next session
    prevWaitingForDateRef.current = false;
    Animated.timing(slideAnim, {
      toValue: SCREEN_W, duration: 250, useNativeDriver: true,
    }).start(onClose);
  }, [onClose, justAgreed, navigating, cancelledBy, chatId]);

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
        setChatId(prev => prev === id ? prev : id);
        loadMessages(id);
        setInitiatorUid(user.uid);
        // Save new chatId to cache
        const musicianUid = musician.uid ?? musician.id;
        useAppStore.setState(s => ({ chatIdCache: { ...s.chatIdCache, [musicianUid]: id } }));
      }

      const replyData = replyMsg ? { id: replyMsg.id ?? '', text: replyMsg.text, senderName: replyMsg.mine ? (user.displayName ?? '') : musician.name } : undefined;
      await sendMessage(activeChatId, text, replyData);
      setReplyMsg(null);
      if (chatId) {
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 500);
      }
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
      durationRef.current = 0;
      timerRef.current = setInterval(() => {
        durationRef.current += 1;
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
    const duration = durationRef.current;
    setRecording(false);
    setRecDuration(0);
    if (duration < 1) {
      await recRef.current.stopAndUnloadAsync().catch(() => {});
      recRef.current = null;
      showToast('⚠️ Səs mesajı çox qısadır');
      return;
    }
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
        setChatId(prev => prev === id ? prev : id);
        loadMessages(id);
        setInitiatorUid(user.uid);
        // Save new chatId to cache
        const musicianUid = musician.uid ?? musician.id;
        useAppStore.setState(s => ({ chatIdCache: { ...s.chatIdCache, [musicianUid]: id } }));
      }

      setVoiceUploading(true);
      const voiceUrl = await uploadVoiceMessage(activeChatId, uri, user.uid);
      setVoiceUploading(false);
      const voiceReplyData = replyMsg ? { id: replyMsg.id ?? '', text: replyMsg.text, senderName: replyMsg.mine ? (user.displayName ?? '') : musician.name } : undefined;
      await sendMessage(activeChatId, `🎤 VOICE:${voiceUrl}`, voiceReplyData);
      if (replyMsg) setReplyMsg(null);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 500);
    } catch {
      setVoiceUploading(false);
      showToast('⚠️ Səs mesajı göndərilmədi');
    }
  }, [chatId, user, sendMessage, replyMsg, setReplyMsg]);

  const rawMessages = chatId ? (messages[chatId] ?? []) : [];
  const chatMessages = rawMessages.map(m => localDeletedIds.has(m.id ?? '') ? { ...m, deletedForAll: true, text: '', deletedAt: new Date().toISOString() } : m);

  // Auto-remove deleted messages after 5 minutes
  useEffect(() => {
    const deletedMsgs = chatMessages.filter(m => m.deletedForAll && m.deletedAt);
    if (deletedMsgs.length === 0) return;
    const timers = deletedMsgs.map(m => {
      const deletedAt = new Date(m.deletedAt!).getTime();
      const remaining = Math.max(0, deletedAt + 5 * 60 * 1000 - Date.now());
      return setTimeout(async () => {
        if (!chatId || !m.id) return;
        setLocalDeletedIds(prev => { const n = new Set(prev); n.delete(m.id!); return n; });
        await deleteMessagePermanently(chatId, m.id).catch(() => {});
      }, remaining);
    });
    return () => timers.forEach(clearTimeout);
  }, [chatMessages.filter(m => m.deletedForAll).length, chatId]);
  React.useEffect(() => { if (chatMessages.length >= 0 && msgsLoading) setMsgsLoading(false); }, [chatMessages]);



  // Mark as read when new messages arrive and chat is open
  React.useEffect(() => {
    if (!chatId || !user?.uid || chatMessages.length === 0) return;
    // Only mark as read up to the last message from OTHER person — not our own
    const lastOtherMsg = [...chatMessages].reverse().find(m => m.senderId !== user.uid);
    if (lastOtherMsg?.id) {
      markChatAsReadBy(chatId, user.uid, lastOtherMsg.id).catch(() => {});
    }
    // Auto scroll to bottom when new message arrives
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [chatMessages.length, chatId, user?.uid]);
  const [readyToShow, setReadyToShow] = React.useState(false);
  React.useEffect(() => {
    if (chatMessages.length > 0 && !readyToShow) {
      setTimeout(() => {
        setReadyToShow(true);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
      }, 100);
    }
  }, [chatMessages.length]);
  const resolved = (readyToShow || chatMessages.length === 0)
    ? chatMessages
        .filter(m => !clearedAt || (m.createdAt && (m.createdAt.toDate ? m.createdAt.toDate() : new Date(m.createdAt)) > new Date(clearedAt)))
        .filter(m => !m.deletedFor?.includes(user?.uid ?? ''))
        .filter(m => true)
        .map(m => ({ ...m, mine: m.senderId === user?.uid }))
    : [];

  const handleClearChat = useCallback(() => {
    if (!chatId || !user?.uid) return;
    Alert.alert(
      'Çatı təmizlə',
      'Bütün mesajlar sizin üçün silinəcək. Davam etmək istəyirsiniz?',
      [
        { text: 'Ləğv et', style: 'cancel' },
        {
          text: 'Təmizlə',
          style: 'destructive',
          onPress: async () => {
            await clearChatForUser(chatId, user.uid).catch(() => {});
            setClearedAt(new Date().toISOString());
            showToast('🗑 Çat təmizləndi');
          },
        },
      ]
    );
  }, [chatId, user?.uid]);

  const formatDur = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <Animated.View style={[
      StyleSheet.absoluteFillObject,
      { backgroundColor: Colors.bg, zIndex: 200, transform: [{ translateX: slideAnim }] },
    ]}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>

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
              onPress={() => {
                if (musician.phone) {
                  const phone = musician.phone.replace(/[^0-9]/g, '');
                  Linking.openURL(`whatsapp://send?phone=${phone}`).catch(() => {
                    Alert.alert('', 'WhatsApp quraşdırılmayıb');
                  });
                } else {
                  Alert.alert('', 'Bu istifadəçinin telefon nömrəsi yoxdur');
                }
              }}
              hitSlop={{ top:10, bottom:10, left:10, right:10 }}
              style={{ marginRight: 8 }}
            >
              <Text style={{ fontSize: 20 }}>📞</Text>
            </TouchableOpacity>
          <TouchableOpacity
            style={s.closeChatBtn}
            onPress={() => setShowMenu(true)}
            hitSlop={{ top:10, bottom:10, left:10, right:10 }}
          >
            <Text style={s.closeChatText}>⋯</Text>
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

        {/* Event info banner if date selected */}
        {eventDate && (showInitiatorBanner || showRecipientBanner) && !cancelledBy && (
          <View style={[s.acceptBanner, { borderColor: Colors.gold, backgroundColor: 'rgba(212,160,60,0.08)' }]}>
            <Text style={[s.acceptBannerText, { color: Colors.gold }]}>
              📅 {eventType} — {eventDate.toLocaleDateString('az-AZ', { day: 'numeric', month: 'long', year: 'numeric' })} {eventDate.toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })}
              {eventLocation ? `
📍 ${eventLocation}` : ''}
            </Text>
          </View>
        )}

        {/* Teymur sees: "Sevgi fikirləşir..." + Date + Imtina buttons */}
        {showInitiatorBanner && !cancelledBy && (
          <View style={[s.acceptBanner, { flexDirection: 'column', gap: 8 }]}>
            <Text style={[s.acceptBannerText, (recipientTyping || recipientRead) ? s.bannerBlue : s.bannerGray]}>
              {recipientTyping
                ? `✍️ ${musician.name} yazır...`
                : recipientRead
                  ? `👁 ${musician.name} baxdı`
                  : `⏳ ${musician.name} hələ baxmayıb`}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={s.dateBtn} onPress={() => setShowEventModal(true)}>
                <Text style={s.dateBtnText}>📅 {eventDate ? 'Tarix dəyiş' : 'Tarix seç'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.cancelBtn, cancelling && { opacity: 0.6 }]}
                disabled={cancelling}
                onPress={async () => {
                  if (!chatId || !user?.uid) return;
                  setCancelling(true);
                  try {
                    await cancelChat(chatId, user.uid, user.displayName ?? '', musicianUid, musician.name, initiatorUid ?? user.uid, initiatorUid === user.uid ? (user.displayName ?? '') : musician.name);
                    showToast('İmtina edildi');
                    setTimeout(() => { onClose(); setTimeout(() => onCancelled?.(), 300); }, 1000);
                  } finally { setCancelling(false); }
                }}
              >
                <Text style={s.cancelBtnText}>✖ Imtina</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Sevgi sees: "Teymur cavab gözləyir" + Razıyam + Imtina buttons */}
        {showRecipientBanner && !cancelledBy && (
          <View style={[s.acceptBanner, { flexDirection: 'column', gap: 8 }]}>
            {/* Top row: text left + Imtina right */}
            {/* Top row: text */}
            <Text style={[s.acceptBannerText, (recipientTyping || recipientRead) ? s.bannerBlue : s.bannerGray]}>
              {recipientTyping
                ? `✍️ ${musician.name} yazır...`
                : recipientRead
                  ? `👁 ${musician.name} baxdı`
                  : `🤝 ${musician.name} cavab gözləyir`}
            </Text>
            {/* Bottom row: 2 buttons */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={[s.acceptBtn, (!eventDate || accepting) && { opacity: 0.6 }]}
                onPress={async () => {
                  if (!eventDate) {
                    Alert.alert('', `${musician.name} hələ tədbir tarixini seçməyib ⏳`);
                    if (chatId) setWaitingForDate(chatId, true).catch(() => {});
                    return;
                  }
                  setAccepting(true);
                  try {
                    console.log('createAgreement eventNotes:', eventNotes);
                    await createAgreement(musicianUid, musician.name, chatId ?? undefined, eventDate?.toISOString(), eventType, eventLocation || undefined, eventNotes || undefined);
                    if (chatId) { await completeChat(chatId).catch(() => {}); }
                    setJustAgreed(true);
                    setNavigating(true);
                    showToast(`✅ ${musician.name} ilə razılaşdınız!`);
                    setTimeout(() => { onClose(); setTimeout(() => onAgreed?.(isRecipient ? 'incoming' : 'outgoing'), 300); }, 2000);
                  } finally { setAccepting(false); }
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
                    await cancelChat(chatId, user.uid, user.displayName ?? '', musicianUid, musician.name, initiatorUid ?? user.uid, initiatorUid === user.uid ? (user.displayName ?? '') : musician.name);
                    showToast('İmtina edildi');
                    setTimeout(() => { onClose(); setTimeout(() => onCancelled?.(), 300); }, 1000);
                  } finally { setCancelling(false); }
                }}
              >
                <Text style={s.cancelBtnText}>✖ Imtina</Text>
              </TouchableOpacity>
            </View>
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
            keyboardShouldPersistTaps="handled"
            onScroll={async (e) => {
              if (e.nativeEvent.contentOffset.y < 50 && chatId && _chatHasMore[chatId] && !isLoadingMore) {
                setIsLoadingMore(true);
                await loadMoreMessages(chatId);
                setIsLoadingMore(false);
              }
            }}
            scrollEventThrottle={200}
          >
            {isLoadingMore && (
              <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                <ActivityIndicator size="small" color={Colors.gold} />
              </View>
            )}
            {loading && (
              <View style={{ alignItems: 'center', padding: 30 }}>
                <ActivityIndicator size="large" color={Colors.gold} />
              </View>
            )}
            {!loading && resolved.length === 0 && !chatId && (
              <View style={s.emptyChat}>
                <Text style={{ fontSize: 40 }}>💬</Text>
                <Text style={s.emptyChatText}>{musician.name} ilə söhbət</Text>
                <Text style={s.emptyChatSub}>Mesaj və ya səs göndər</Text>
              </View>
            )}

            {resolved.map((msg, i) => {
              const isVoice = msg.text?.startsWith('🎤 VOICE:');
              const voiceUri = isVoice ? msg.text.replace('🎤 VOICE:', '') : null;
              const isImage = msg.text?.startsWith('📷 IMAGE:');
              const imageUri = isImage ? msg.text.replace('📷 IMAGE:', '') : null;
              const isDeletedForAll = msg.deletedForAll;
              return (
                <View
                  key={msg.id ?? i}
                  ref={r => { if (msg.id) msgRefs.current[msg.id] = r; }}
                >
                <SwipeableMessage
                  key={`sw-${msg.id}-${msg.deletedForAll}`}
                  disableSwipeLeft={!msg.deletedForAll}
                  onSwipeLeft={msg.deletedForAll ? async () => {
                    if (!chatId || !msg.id) return;
                    const delId = msg.id;
                    useAppStore.setState(s => ({
                      messages: {
                        ...s.messages,
                        [chatId]: (s.messages[chatId] ?? []).filter(m => m.id !== delId),
                      },
                    }));
                    await deleteMessagePermanently(chatId, delId).catch(() => {});
                  } : () => {}}
                  onSwipeRight={() => { setReplyMsg(msg); setTimeout(() => inputRef.current?.focus(), 100); }}
                >
                <View
                  style={[s.msgWrap, msg.mine ? s.msgWrapMine : s.msgWrapTheirs, highlightId === msg.id && s.msgHighlight]}
                  onLayout={e => {
                    if (msg.id) {
                      const y = e.nativeEvent.layout.y;
                      msgPositions.current[msg.id] = y;
                    }
                  }}
                >
                  {isDeletedForAll ? (
                    <View style={[s.msgBubble, s.msgBubbleDeleted]}>
                      <Text style={s.msgTextDeleted}>🚫 Bu mesaj silindi</Text>
                    </View>
                  ) : isVoice && voiceUri === 'loading' ? (
                    <View style={[s.msgBubble, msg.mine ? s.msgBubbleMine : s.msgBubbleTheirs, { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10 }]}>
                      <Text style={{ fontSize: 16 }}>🎤</Text>
                      <ActivityIndicator size="small" color={msg.mine ? '#1a0e00' : Colors.gold} />
                      <Text style={{ fontSize: 12, color: msg.mine ? '#1a0e00' : Colors.muted }}>Yüklənir...</Text>
                    </View>
                  ) : isVoice && voiceUri ? (
                    <View style={[s.msgBubble, msg.mine ? s.msgBubbleMine : s.msgBubbleTheirs, { padding: 0, overflow: 'hidden' }]}>
                      {msg.replyTo && (
                        <TouchableOpacity
                          style={[s.replyQuote, msg.mine ? s.replyQuoteMine : s.replyQuoteTheirs]}
                          onPress={() => { if (msg.replyTo?.id) scrollToMessage(msg.replyTo.id, scrollRef, inputRef); }}
                          activeOpacity={0.7}
                        >
                          <View style={{ padding: 10 }}>
                            <Text style={s.replyQuoteName}>{msg.replyTo.senderName}</Text>
                            {msg.replyTo.text?.startsWith('📷 IMAGE:') ? (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Image source={{ uri: msg.replyTo.text.replace('📷 IMAGE:', '') }} style={{ width: 36, height: 36, borderRadius: 4 }} resizeMode="cover" />
                                <Text style={s.replyQuoteText}>📷 Şəkil</Text>
                              </View>
                            ) : (
                              <Text style={s.replyQuoteText} numberOfLines={1}>{msg.replyTo.text?.startsWith('🎤 VOICE:') ? '🎤 Ses mesaji' : msg.replyTo.text}</Text>
                            )}
                          </View>
                        </TouchableOpacity>
                      )}
                      <VoicePlayer
                        uri={voiceUri}
                        mine={msg.mine}
                        senderEmoji={msg.mine ? (user?.emoji ?? '👤') : (musician?.emoji ?? '🎵')}
                        status={msg.status}
                        isRead={(() => { const mUid = musician.uid ?? musician.id; const allMsgIds = chatMessages.map(m => m.id); const msgIndex = allMsgIds.indexOf(msg.id); const lastReadId = lastReadMsgId[mUid]; const lastReadIndex = lastReadId ? allMsgIds.indexOf(lastReadId) : -1; return lastReadIndex >= msgIndex && msgIndex !== -1; })()}
                        isDelivered={(() => { const mUid = musician.uid ?? musician.id; const allMsgIds = chatMessages.map(m => m.id); const msgIndex = allMsgIds.indexOf(msg.id); const lastReadId = lastReadMsgId[mUid]; const lastReadIndex = lastReadId ? allMsgIds.indexOf(lastReadId) : -1; const isRead = lastReadIndex >= msgIndex && msgIndex !== -1; return deliveredTo[mUid] === true || isRead; })()}
                        onLongPress={() => { setSelectedMsg(msg); }}
                      />
                    </View>
                  ) : isImage && imageUri ? (
                    <TouchableOpacity
                      onPress={() => setSelectedImage(imageUri)}
                      onLongPress={() => setSelectedMsg(msg)}
                      delayLongPress={400}
                    >
                      <Image source={{ uri: imageUri }} style={{ width: 220, height: 220, borderRadius: 12 }} resizeMode="cover" />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={[s.msgBubble, msg.mine ? s.msgBubbleMine : s.msgBubbleTheirs]} onLongPress={() => !isDeletedForAll && setSelectedMsg(msg)} delayLongPress={400} activeOpacity={1}>
                      {msg.replyTo && (
                        <TouchableOpacity
                          style={[s.replyQuote, msg.mine ? s.replyQuoteMine : s.replyQuoteTheirs]}
                          onPress={() => { if (msg.replyTo?.id) scrollToMessage(msg.replyTo.id, scrollRef, inputRef); }}
                          activeOpacity={0.7}
                        >
                          <View style={{ padding: 10 }}>
                            <Text style={s.replyQuoteName}>{msg.replyTo.senderName}</Text>
                            {msg.replyTo.text?.startsWith('📷 IMAGE:') ? (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Image source={{ uri: msg.replyTo.text.replace('📷 IMAGE:', '') }} style={{ width: 36, height: 36, borderRadius: 4 }} resizeMode="cover" />
                                <Text style={s.replyQuoteText}>📷 Şəkil</Text>
                              </View>
                            ) : (
                              <Text style={s.replyQuoteText} numberOfLines={1}>{msg.replyTo.text?.startsWith('🎤 VOICE:') ? '🎤 Ses mesaji' : msg.replyTo.text}</Text>
                            )}
                          </View>
                        </TouchableOpacity>
                      )}
                      <Text style={[s.msgText, msg.mine ? s.msgTextMine : s.msgTextTheirs]} onLongPress={() => !isDeletedForAll && setSelectedMsg(msg)} suppressHighlighting>
                        {msg.text}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, justifyContent: msg.mine ? 'flex-end' : 'flex-start' }}>
                        <Text style={[s.msgTime, msg.mine ? s.msgTimeMine : s.msgTimeTheirs]}>
                          {msg.time}
                        </Text>
                        {msg.mine && (() => {
                          if (msg.status === 'sending') return <Text style={{ fontSize: 12, marginLeft: 2 }}>⏳</Text>;
                          if (msg.status === 'failed')  return <Text style={{ fontSize: 12, marginLeft: 2 }}>❌</Text>;
                          const mUid = musician.uid ?? musician.id;
                          const allMsgIds = chatMessages.map(m => m.id);
                          const msgIndex = allMsgIds.indexOf(msg.id);
                          const lastReadId = lastReadMsgId[mUid];
                          const lastReadIndex = lastReadId ? allMsgIds.indexOf(lastReadId) : -1;
                          const isRead = lastReadIndex >= msgIndex && msgIndex !== -1;
                          const isDelivered = deliveredTo[mUid] === true || isRead;
                          return <CheckMark isRead={isRead} isDelivered={isDelivered} />;
                        })()}
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
                </SwipeableMessage>
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

          {/* Reply preview */}
          {replyMsg && (
            <View style={s.replyBar}>
              <View style={s.replyBarLine} />
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {replyMsg.text?.startsWith('📷 IMAGE:') && (
                  <Image source={{ uri: replyMsg.text.replace('📷 IMAGE:', '') }} style={{ width: 40, height: 40, borderRadius: 4 }} resizeMode="cover" />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={s.replyBarName}>{replyMsg.mine ? 'Siz' : musician.name}</Text>
                  <Text style={s.replyBarText} numberOfLines={1}>{replyMsg.text?.startsWith('🎤 VOICE:') ? '🎤 Ses mesaji' : replyMsg.text?.startsWith('📷 IMAGE:') ? '📷 Şəkil' : replyMsg.text}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setReplyMsg(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={{ fontSize: 18, color: Colors.muted }}>✕</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Voice uploading placeholder */}
          {voiceUploading && (
            <View style={[s.msgWrap, s.msgWrapMine]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 22, minWidth: 220, backgroundColor: Colors.gold, borderBottomRightRadius: 4 }}>
                <View style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator size="small" color="#1a0e00" />
                </View>
                <View style={{ flex: 1, flexDirection: 'column', gap: 3 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, height: 34 }}>
                    {Array.from({ length: 40 }).map((_, i) => (
                      <View key={i} style={{ width: 3, borderRadius: 2, height: Math.max(4, Math.round(Math.abs(Math.sin(i * 0.47 + 1.2) * Math.cos(i * 0.31)) * 22 + 4)), backgroundColor: 'rgba(26,14,0,0.25)' }} />
                    ))}
                  </View>
                  <Text style={{ fontSize: 10, fontFamily: Typography.nunito700, textAlign: 'right', color: 'rgba(26,14,0,0.6)' }}>0:00</Text>
                </View>
              </View>
            </View>
          )}

          {/* Typing indicator */}
          {recipientTyping && <TypingIndicator name={musician.name} />}

          {/* Input bar */}
          <ChatInput
            value={inputText}
            onChangeText={handleInputChange}
            onSend={handleSend}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
            recording={recording}
            recDuration={recDuration}
            inputRef={inputRef}
            recordingMode="hold"
            chatId={chatId ?? undefined}
            senderId={user?.uid}
            onSendMessage={(text) => sendMessage(chatId!, text)}
            onOpenGallery={() => setShowGallery(true)}
          />
        </KeyboardAvoidingView>
        <RNModal visible={!!selectedImage} transparent animationType="fade" onRequestClose={() => setSelectedImage(null)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' }}>
            <TouchableOpacity
              onPress={() => setSelectedImage(null)}
              style={{ position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 8 }}
            >
              <Text style={{ color: '#fff', fontSize: 28 }}>✕</Text>
            </TouchableOpacity>
            {selectedImage && <ZoomableImage uri={selectedImage} />}
          </View>
        </RNModal>

        <GalleryPicker
          visible={showGallery}
          onClose={() => setShowGallery(false)}
          onSelect={handleGallerySelect}
        />
        <EventModal
          visible={showEventModal}
          mode="full"
          title="📅 Tədbir məlumatı"
          initialDate={eventDate ?? new Date()}
          onClose={() => setShowEventModal(false)}
          onSave={async ({ date, type, location, notes }) => {
            setEventDate(date);
            setEventType(type);
            setEventLocation(location);
            setEventNotes(notes);
            setShowEventModal(false);
            if (chatId) {
              await saveChatEventDate(chatId, date, type, location, notes).catch(() => {});
              await setWaitingForDate(chatId, false).catch(() => {});
              showToast('✅ Tarix saxlanıldı');
            }
          }}
        />

        {/* Three dots menu */}
        <Modal transparent visible={showMenu} animationType="fade" onRequestClose={() => setShowMenu(false)}>
          <TouchableOpacity style={s.menuOverlay} activeOpacity={1} onPress={() => setShowMenu(false)}>
            <View style={s.menuBox}>
              {!jobOfferBy && (
                <TouchableOpacity
                  style={s.menuItem}
                  onPress={async () => {
                    setShowMenu(false);
                    if (!user?.uid) return;
                    try {
                      let activeChatId = chatId;
                      if (!activeChatId) {
                        activeChatId = await createOrGetDirectChat(
                          user.uid,
                          musician.uid ?? musician.id,
                          musician.name,
                          musician.emoji,
                          user.displayName,
                          user.city,
                        );
                        setChatId(prev => prev === activeChatId ? prev : activeChatId);
                        loadMessages(activeChatId);
                        setInitiatorUid(user.uid);
                        const musicianUid = musician.uid ?? musician.id;
                        useAppStore.setState(s => ({ chatIdCache: { ...s.chatIdCache, [musicianUid]: activeChatId! } }));
                      }
                      await setJobOffer(activeChatId, user.uid);
                      showToast('📅 İş təklifi göndərildi');
                    } catch {
                      showToast('⚠️ Xəta baş verdi');
                    }
                  }}
                >
                  <Text style={s.menuItemText}>📅 İş təklif et</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={s.menuItem} onPress={() => { setShowMenu(false); handleClearChat(); }}>
                <Text style={[s.menuItemText, { color: Colors.red }]}>🗑 Çatı təmizlə</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Delete message modal */}
        <Modal transparent visible={!!selectedMsg} animationType="slide" onRequestClose={() => setSelectedMsg(null)}>
          <TouchableOpacity style={s.menuOverlay} activeOpacity={1} onPress={() => setSelectedMsg(null)}>
            <View style={s.deleteSheet}>
              {selectedMsg?.mine && (
                <TouchableOpacity
                  style={s.menuItem}
                  onPress={async () => {
                    if (!chatId || !selectedMsg?.id) return;
                    const msgId = selectedMsg.id;
                    setSelectedMsg(null);
                    setLocalDeletedIds(prev => new Set([...prev, msgId]));
                    await deleteMessageForAll(chatId, msgId).catch(() => {});
                  }}
                >
                  <Text style={[s.menuItemText, { color: Colors.red }]}>🗑 Hamıdan sil</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={s.menuItem}
                onPress={async () => {
                  if (!chatId || !selectedMsg?.id || !user?.uid) return;
                  const msgIdMe = selectedMsg.id;
                  const myUid = user.uid;
                  setSelectedMsg(null);
                  useAppStore.setState(s => ({
                    messages: {
                      ...s.messages,
                      [chatId]: (s.messages[chatId] ?? []).filter(m => m.id !== msgIdMe),
                    },
                  }));
                  await deleteMessageForMe(chatId, msgIdMe, myUid).catch(() => {});
                }}
              >
                <Text style={s.menuItemText}>🗑 Yalnız məndən sil</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.menuItem, { borderBottomWidth: 0 }]} onPress={() => setSelectedMsg(null)}>
                <Text style={[s.menuItemText, { color: Colors.muted }]}>Ləğv et</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

      </SafeAreaView>
    </Animated.View>
  );
}



const s = StyleSheet.create({
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  acceptBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: 'rgba(212,160,60,0.08)', borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 10 },
  dateBtn:           { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: Colors.gold, alignItems: 'center', backgroundColor: 'rgba(212,160,60,0.08)' },
  dateBtnText:       { color: Colors.gold, fontFamily: Typography.nunito600, fontSize: 12 },
  modalOverlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalBox:          { backgroundColor: Colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 12 },
  modalTitle:        { fontFamily: Typography.playfair700, fontSize: 18, color: Colors.text, textAlign: 'center', marginBottom: 8 },
  modalField:        { backgroundColor: Colors.bg3, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.border },
  modalFieldLabel:   { fontSize: 12, color: Colors.muted, fontFamily: Typography.nunito600, marginBottom: 4 },
  modalFieldValue:   { fontSize: 14, color: Colors.text, fontFamily: Typography.nunito500 },
  modalInput:        { backgroundColor: Colors.bg3, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.border, color: Colors.text, fontFamily: Typography.nunito400, fontSize: 14 },
  eventTypeList:     { backgroundColor: Colors.bg3, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  eventTypeItem:     { padding: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  eventTypeItemActive: { backgroundColor: 'rgba(212,160,60,0.1)' },
  eventTypeText:     { color: Colors.text, fontFamily: Typography.nunito500, fontSize: 14 },
  eventTypeTextActive: { color: Colors.gold, fontFamily: Typography.nunito700 },
  modalButtons:      { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalCancelBtn:    { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  modalCancelText:   { color: Colors.muted, fontFamily: Typography.nunito600 },
  modalSaveBtn:      { flex: 1, padding: 14, borderRadius: 12, backgroundColor: Colors.gold, alignItems: 'center' },
  modalSaveText:     { color: '#1a0e00', fontFamily: Typography.nunito700 },
  closeChatBtn:  { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  closeChatText: { color: Colors.muted, fontSize: 18, fontFamily: Typography.nunito600 },
  cancelBtn:        { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: Colors.red, alignItems: 'center' },
  cancelBtnText:    { color: Colors.red, fontFamily: Typography.nunito600, fontSize: 13 },
  bannerBlue:       { color: '#4a90d9' },
  bannerGray:       { color: Colors.muted },
  acceptBannerText: { fontSize: 13, fontFamily: Typography.nunito600 },
  acceptBtn:    { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: Colors.green, alignItems: 'center', backgroundColor: 'rgba(39,174,96,0.15)' },
  acceptBtnText: { color: Colors.green, fontSize: 13, fontFamily: Typography.nunito600 },
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
  typingWrap:  { alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 4 },
  menuOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  menuBox:      { position: 'absolute', top: 100, right: 16, backgroundColor: Colors.card, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, minWidth: 200, overflow: 'hidden' },
  menuItem:     { paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  menuItemText: { color: Colors.text, fontSize: 15, fontFamily: Typography.nunito500 },
  msgBubbleDeleted: { backgroundColor: Colors.bg3, borderWidth: 1, borderColor: Colors.border, borderBottomLeftRadius: 4 },
  msgTextDeleted:   { color: Colors.muted, fontSize: 13, fontStyle: 'italic', fontFamily: Typography.nunito400 },
  deleteSheet:      { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  replyBar:         { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: Colors.bg2, borderTopWidth: 1, borderTopColor: Colors.border },
  replyBarLine:     { width: 3, height: 36, borderRadius: 2, backgroundColor: Colors.gold },
  replyBarName:     { fontSize: 12, color: Colors.gold, fontFamily: Typography.nunito700, marginBottom: 2 },
  replyBarText:     { fontSize: 12, color: Colors.muted, fontFamily: Typography.nunito400 },
  msgHighlight:     { backgroundColor: 'rgba(212,160,60,0.15)', borderRadius: 12 },
  replyQuote:       { borderRadius: 6, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: 'rgba(26,14,0,0.5)', alignSelf: 'stretch', overflow: 'hidden' },
  replyQuoteMine:   { backgroundColor: 'rgba(26,14,0,0.2)' },
  replyQuoteTheirs: { backgroundColor: 'rgba(212,160,60,0.12)', borderLeftColor: Colors.gold },
  replyQuoteName:   { fontSize: 13, color: Colors.gold, fontFamily: Typography.nunito700, marginBottom: 3 },
  replyQuoteText:   { fontSize: 13, color: Colors.text, fontFamily: Typography.nunito400 },
});
