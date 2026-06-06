import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Animated, KeyboardAvoidingView, Platform, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { useT } from '../../i18n';
import { useAppStore, ChatItem, Message } from '../../store/useAppStore';

const SCREEN_WIDTH = Dimensions.get('window').width;

// ── Chat Window ───────────────────────────────────────────
function ChatWindow({ chat, onClose }: { chat: ChatItem; onClose: () => void }) {
  const { t } = useT();
  const messages    = useAppStore(s => s.messages);
  const sendMessage = useAppStore(s => s.sendMessage);
  const loadMessages = useAppStore(s => s.loadMessages);
  const showToast  = useAppStore(s => s.showToast);

  const [inputText, setInputText] = useState('');
  const scrollRef  = useRef<ScrollView>(null);
  // FIX: slideAnim начинается с SCREEN_WIDTH (за экраном), анимируется к 0
  const slideAnim  = useRef(new Animated.Value(SCREEN_WIDTH)).current;

  // FIX: анимация входа сразу при монтировании, не по visible prop
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      damping: 26,
      stiffness: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  // Subscribe to real Firestore messages
  useEffect(() => {
    loadMessages(chat.id);
  }, [chat.id]);

  const chatMsgs: Message[] = messages[chat.id] ?? [];

  const sendMsg = useCallback(async () => {
    const text = inputText.trim();
    if (!text) return;
    setInputText('');
    await sendMessage(chat.id, text);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, [inputText, chat.id, sendMessage]);

  const handleClose = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_WIDTH,
      duration: 250,
      useNativeDriver: true,
    }).start(onClose);
  }, [onClose]);

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFillObject,
        styles.chatWin,
        { transform: [{ translateX: slideAnim }] },
      ]}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          {/* Header */}
          <View style={styles.cwHeader}>
            <TouchableOpacity style={styles.cwBack} onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.cwBackText}>←</Text>
            </TouchableOpacity>
            <View style={[styles.cwAva, chat.isGroup && { borderRadius: 12 }]}>
              <Text style={{ fontSize: 18 }}>{chat.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cwName} numberOfLines={1}>{chat.name}</Text>
              {chat.online && !chat.isGroup && (
                <Text style={styles.cwStatus}>{t('chatOnline')}</Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.cwActionBtn}
              onPress={() => showToast(t('callToast'))}
            >
              <Text style={{ fontSize: 15 }}>📞</Text>
            </TouchableOpacity>
          </View>

          {/* Messages */}
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.cwMsgs}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          >
            {chatMsgs.length === 0 && (
              <Text style={styles.emptyMsgs}>Hələ heç bir mesaj yoxdur</Text>
            )}
            {chatMsgs.map(msg => (
              <View
                key={msg.id}
                style={[styles.msg, msg.mine ? styles.msgMine : styles.msgTheirs]}
              >
                <View style={[styles.msgBubble, msg.mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                  <Text style={[styles.msgText, msg.mine && { color: '#1a0e00' }]}>
                    {msg.text}
                  </Text>
                </View>
                <Text style={styles.msgTime}>{msg.time}</Text>
              </View>
            ))}
          </ScrollView>

          {/* Input */}
          <View style={styles.cwInputBar}>
            <TouchableOpacity
              style={styles.cwFileBtn}
              onPress={() => showToast(t('fileToast'))}
            >
              <Text style={{ fontSize: 16 }}>📎</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.cwInput}
              placeholder={t('chatPlaceholder')}
              placeholderTextColor={Colors.muted}
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={sendMsg}
              returnKeyType="send"
              blurOnSubmit={false}
            />
            <TouchableOpacity style={styles.cwSend} onPress={sendMsg}>
              <Text style={{ color: '#1a0e00', fontSize: 16 }}>➤</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Animated.View>
  );
}

// ── Chat List Item ────────────────────────────────────────
const ChatListItem = React.memo(function ChatListItem({
  chat,
  onPress,
}: {
  chat: ChatItem;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.cliItem} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.cliAva, chat.isGroup && styles.cliAvaGroup]}>
        <Text style={{ fontSize: 21 }}>{chat.emoji}</Text>
        {chat.online && !chat.isGroup && <View style={styles.cliOnline} />}
      </View>
      <View style={styles.cliInfo}>
        <Text style={styles.cliName} numberOfLines={1}>{chat.name}</Text>
        <Text style={styles.cliPreview} numberOfLines={1}>{chat.preview}</Text>
      </View>
      <View style={styles.cliMeta}>
        <Text style={styles.cliTime}>{chat.time}</Text>
        {(chat.unread && chat.unread > 0) ? (
          <View style={styles.cliBadge}>
            <Text style={styles.cliBadgeText}>{chat.unread}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
});

// ── Chats Screen ──────────────────────────────────────────
export default function ChatsScreen() {
  const { t } = useT();
  const chats    = useAppStore(s => s.chats);
  const showToast = useAppStore(s => s.showToast);
  // FIX: активный чат хранится как объект; ChatWindow монтируется/размонтируется
  const [activeChat, setActiveChat] = useState<ChatItem | null>(null);

  const openChat  = useCallback((chat: ChatItem) => setActiveChat(chat), []);
  const closeChat = useCallback(() => setActiveChat(null), []);

  const rooms   = chats.filter(c => c.isGroup);
  const directs = chats.filter(c => !c.isGroup);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.topRow}>
        <Text style={styles.screenTitle}>{t('chatsTitle')}</Text>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => showToast('✏️ Yeni qrup yaradılır...')}
        >
          <Text style={{ fontSize: 16 }}>✏️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLbl}>{t('chatsRooms')}</Text>
        {rooms.map(c => (
          <ChatListItem key={c.id} chat={c} onPress={() => openChat(c)} />
        ))}

        <Text style={styles.sectionLbl}>{t('chatsDirect')}</Text>
        {directs.map(c => (
          <ChatListItem key={c.id} chat={c} onPress={() => openChat(c)} />
        ))}
      </ScrollView>

      {/* FIX: ChatWindow монтируется только когда чат выбран — нет animation bug при смене */}
      {activeChat && (
        <ChatWindow chat={activeChat} onClose={closeChat} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  topRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 18,
    paddingTop: 16, paddingBottom: 10,
  },
  screenTitle: { fontFamily: Typography.playfair700, fontSize: 18, color: Colors.text },
  editBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.card,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionLbl: {
    paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4,
    fontSize: 11, color: Colors.muted,
    textTransform: 'uppercase', letterSpacing: 1.2,
    fontFamily: Typography.nunito700,
  },
  cliItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  cliAva: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: Colors.bg3,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative', flexShrink: 0,
  },
  cliAvaGroup: { borderRadius: 14 },
  cliOnline: {
    position: 'absolute', bottom: 1, right: 1,
    width: 12, height: 12, backgroundColor: Colors.green,
    borderRadius: 6, borderWidth: 2, borderColor: Colors.bg,
  },
  cliInfo: { flex: 1, minWidth: 0 },
  cliName: { fontFamily: Typography.playfair700, fontSize: 14, color: Colors.text, marginBottom: 3 },
  cliPreview: { fontSize: 12, color: Colors.muted, fontFamily: Typography.nunito400 },
  cliMeta: { alignItems: 'flex-end', gap: 5, flexShrink: 0 },
  cliTime: { fontSize: 11, color: Colors.muted, fontFamily: Typography.nunito400 },
  cliBadge: {
    backgroundColor: Colors.gold, borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 2,
    minWidth: 20, alignItems: 'center',
  },
  cliBadgeText: { color: '#1a0e00', fontSize: 11, fontFamily: Typography.nunito700 },
  // Chat Window
  chatWin: { backgroundColor: Colors.bg, zIndex: 100 },
  cwHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    backgroundColor: Colors.bg2,
  },
  cwBack: { paddingHorizontal: 4, paddingVertical: 4 },
  cwBackText: { fontSize: 24, color: Colors.text },
  cwAva: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.bg3,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.gold, flexShrink: 0,
  },
  cwName: { fontFamily: Typography.playfair700, fontSize: 15, color: Colors.text },
  cwStatus: { fontSize: 11, color: Colors.green, fontFamily: Typography.nunito700 },
  cwActionBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.card,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  cwMsgs: { padding: 16, gap: 10 },
  emptyMsgs: {
    textAlign: 'center', color: Colors.muted,
    fontSize: 13, marginTop: 40, fontFamily: Typography.nunito400,
  },
  msg: { maxWidth: '80%', gap: 3 },
  msgMine: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  msgTheirs: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  msgBubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  bubbleMine: { backgroundColor: Colors.gold, borderBottomRightRadius: 4 },
  bubbleTheirs: {
    backgroundColor: Colors.card,
    borderWidth: 1, borderColor: Colors.border,
    borderBottomLeftRadius: 4,
  },
  msgText: { fontSize: 14, color: Colors.text, lineHeight: 20, fontFamily: Typography.nunito400 },
  msgTime: { fontSize: 10, color: Colors.muted, fontFamily: Typography.nunito400 },
  cwInputBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: Colors.border,
    backgroundColor: Colors.bg2,
  },
  cwFileBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.card,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  cwInput: {
    flex: 1, backgroundColor: Colors.card,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10,
    color: Colors.text, fontSize: 14, fontFamily: Typography.nunito400,
  },
  cwSend: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: Colors.gold,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
});
