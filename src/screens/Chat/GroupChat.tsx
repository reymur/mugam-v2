import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  StyleSheet, Animated, KeyboardAvoidingView,
  Platform, ScrollView, Dimensions, ActivityIndicator,
  Alert, Modal, Keyboard, PanResponder, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { useAppStore } from '../../store/useAppStore';
import { markGroupChatAsReadBy, markChatAsDelivered, subscribeChat, setTyping } from '../../firebase/firestore';
import { deleteMessagePermanently, deleteMessageForAll, deleteMessageForMe } from '../../firebase/firestore';
import type { ChatItem, Message } from '../../store/useAppStore';
import SwipeableMessage from '../../components/common/SwipeableMessage';
import { useScrollToMessage } from './hooks/useScrollToMessage';
import { Image } from 'expo-image';
import GroupInfo from './GroupInfo';

const SCREEN_W = Dimensions.get('window').width;

interface Props {
  chat: ChatItem;
  onClose: () => void;
}



export default function GroupChat({ chat: chatProp, onClose }: Props) {
  const { user, messages, sendMessage, loadMessages, loadMoreMessages, showToast, chats, setRemovedFromGroup, _chatHasMore } = useAppStore();
  const chat = chats.find(ch => ch.id === chatProp.id) ?? chatProp;

  const [inputText, setInputText] = useState('');
  const [replyMsg, setReplyMsg] = useState<Message | null>(null);
  const [selectedMsg, setSelectedMsg] = useState<Message | null>(null);

  const [showInfo, setShowInfo] = useState(false);
  const [liveMembers, setLiveMembers] = useState<string[]>(chatProp.members ?? []);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [readBy, setReadBy] = useState<string[]>([]);
  const [lastReadMsgId, setLastReadMsgId] = useState<Record<string, string>>({});
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const slideAnim = useRef(new Animated.Value(SCREEN_W)).current;
  const { msgRefs, highlightId, scrollToMessage } = useScrollToMessage();

  // Slide in
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0, damping: 26, stiffness: 300, useNativeDriver: true,
    }).start();
  }, []);

  // Subscribe to live members, typing and readBy
  useEffect(() => {
    const unsub = subscribeChat(chatProp.id, (data) => {
      setLiveMembers(data.members ?? []);
      setReadBy(data.readBy ?? []);
      setLastReadMsgId(data.lastReadMsgId ?? {});
      const typing = data.typing ?? {};
      const now = Date.now();
      const activeTypers = Object.entries(typing)
        .filter(([uid, ts]) => uid !== user?.uid && typeof ts === 'number' && now - (ts as number) < 5000)
        .map(([uid]) => uid);
      setTypingUsers(activeTypers);
    });
    return unsub;
  }, [chatProp.id, user?.uid]);

  // Close chat if current user is removed from group
  useEffect(() => {
    if (!user?.uid || liveMembers.length === 0) return;
    if (!liveMembers.includes(user.uid)) {
      setRemovedFromGroup({ chatName: chat.name, removedByName: '' });
      onClose();
    }
  }, [liveMembers, user?.uid]);

  // Load messages
  useEffect(() => {
    loadMessages(chat.id);
    if (user?.uid) markGroupChatAsReadBy(chat.id, user.uid).catch(() => {});
  }, [chat.id]);

  const chatMessages = messages[chat.id] ?? [];
  React.useEffect(() => { console.log('[GC] id:', chat.id, 'msgs:', chatMessages.length); }, [chat.id, chatMessages.length]);

  // Mark as read when new messages arrive
  useEffect(() => {
    if (!user?.uid || chatMessages.length === 0) return;
    const lastMsg = chatMessages[chatMessages.length - 1];
    if (lastMsg?.id) markGroupChatAsReadBy(chat.id, user.uid, lastMsg.id).catch(() => {});
  }, [chatMessages.length, chat.id, user?.uid]);

  useEffect(() => {
    if (chatMessages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
    }
  }, []);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatMessages.length === 0) return;
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [chatMessages.length]);

  const resolved = chatMessages.length >= 0
    ? chatMessages
        .filter(m => !m.deletedFor?.includes(user?.uid ?? ''))
        .filter(m => {
          if (!m.deletedForAll) return true;
          if (!m.deletedAt) return true;
          return Date.now() - new Date(m.deletedAt).getTime() < 60000;
        })
        .map(m => ({ ...m, mine: m.senderId === user?.uid }))
    : [];

  const handleClose = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_W, duration: 250, useNativeDriver: true,
    }).start(onClose);
  }, [onClose]);

  const handleSend = useCallback(async () => {
    if (!inputText.trim() || !user) return;
    const text = inputText.trim();
    const replyData = replyMsg ? { id: replyMsg.id ?? '', text: replyMsg.text, senderName: replyMsg.senderName ?? '' } : undefined;
    setInputText('');
    setReplyMsg(null);
    await sendMessage(chat.id, text, replyData);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 500);
  }, [inputText, chat.id, user, sendMessage, replyMsg]);

  return (
    <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: Colors.bg, zIndex: 200, transform: [{ translateX: slideAnim }] }]}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={s.backText}>←</Text>
          </TouchableOpacity>
          <View style={[s.groupAva, { borderRadius: 12 }]}>
            {chat.photoURL
              ? <Image source={{ uri: chat.photoURL }} style={[StyleSheet.absoluteFill, { borderRadius: 12 }]} />
              : <Text style={{ fontSize: 20 }}>{chat.emoji}</Text>
            }
          </View>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowInfo(true)}>
            <Text style={s.groupName} numberOfLines={1}>{chat.name}</Text>
            <Text style={s.groupSub}>{chat.members?.length ?? 0} iştirakçı</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowInfo(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={{ fontSize: 20, color: Colors.text }}>⋯</Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={s.msgList}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onScroll={async (e) => {
              if (e.nativeEvent.contentOffset.y < 50 && _chatHasMore[chat.id] && !isLoadingMore) {
                setIsLoadingMore(true);
                await loadMoreMessages(chat.id);
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
            {resolved.map((msg, i) => {
              if (msg.isSystem) {
                return (
                  <View key={msg.id ?? i} style={s.systemMsg}>
                    <Text style={s.systemText}>{msg.text}</Text>
                  </View>
                );
              }
              return (
                <View key={msg.id ?? i} ref={r => { if (msg.id) msgRefs.current[msg.id] = r; }} style={highlightId === msg.id ? s.msgHighlight : undefined}>
                  <SwipeableMessage
                    onSwipeLeft={async () => {
                      if (!msg.id) return;
                      await deleteMessagePermanently(chat.id, msg.id).catch(() => {});
                    }}
                    onSwipeRight={() => {
                      setReplyMsg(msg);
                      setTimeout(() => inputRef.current?.focus(), 100);
                    }}
                  >
                  <Pressable
                    style={[s.msgWrap, msg.mine ? s.msgWrapMine : s.msgWrapTheirs]}
                    onLongPress={() => setSelectedMsg(msg)}
                    delayLongPress={400}
                  >
                    {/* Sender name for group */}
                    {!msg.mine && (
                      <Text style={s.senderName}>{msg.senderName}</Text>
                    )}
                    <View style={[s.msgBubble, msg.mine ? s.msgBubbleMine : s.msgBubbleTheirs]}>
                      {msg.replyTo && (
                        <TouchableOpacity style={[s.replyQuote, msg.mine ? s.replyQuoteMine : s.replyQuoteTheirs]} onPress={() => { if (msg.replyTo?.id) scrollToMessage(msg.replyTo.id, scrollRef, inputRef); }} activeOpacity={0.7}>
                          <View style={{ padding: 8 }}>
                            <Text style={s.replyQuoteName}>{msg.replyTo.senderName}</Text>
                            <Text style={s.replyQuoteText} numberOfLines={1}>{msg.replyTo.text}</Text>
                          </View>
                        </TouchableOpacity>
                      )}
                      <Text style={[s.msgText, msg.mine ? s.msgTextMine : s.msgTextTheirs]}>
                        {msg.text}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
                        <Text style={[s.msgTime, msg.mine ? s.msgTimeMine : s.msgTimeTheirs]}>
                          {msg.time}
                        </Text>
                        {msg.mine && (
                          msg.status === 'sending' ? (
                            <Text style={{ fontSize: 12, marginLeft: 2 }}>⏳</Text>
                          ) : msg.status === 'failed' ? (
                            <Text style={{ fontSize: 12, marginLeft: 2 }}>❌</Text>
                          ) : null
                        )}
                      </View>
                    </View>
                  </Pressable>
                  </SwipeableMessage>
                </View>
              );
            })}
          </ScrollView>

          {/* Typing indicator */}
          {typingUsers.length > 0 && (() => {
            // Build uid→name map from messages
            const memberNames: Record<string, string> = {};
            chatMessages.forEach(m => { if (m.senderId && m.senderName) memberNames[m.senderId] = m.senderName; });
            const names = typingUsers.map(uid => memberNames[uid] ?? 'Biri');
            const label = names.length === 1
              ? `${names[0]} yazır...`
              : `${names.join(', ')} yazır...`;
            return (
              <View style={s.typingBar}>
                <Text style={s.typingText}>{label}</Text>
              </View>
            );
          })()}

          {/* Reply preview */}
          {replyMsg && (
            <View style={s.replyBar}>
              <View style={s.replyBarLine} />
              <View style={{ flex: 1 }}>
                <Text style={s.replyBarName}>{replyMsg.mine ? 'Siz' : replyMsg.senderName}</Text>
                <Text style={s.replyBarText} numberOfLines={1}>{replyMsg.text}</Text>
              </View>
              <TouchableOpacity onPress={() => setReplyMsg(null)}>
                <Text style={{ fontSize: 18, color: Colors.muted }}>✕</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Input */}
          <View style={s.inputRow}>
            <TextInput
              ref={inputRef}
              style={s.input}
              placeholder="Mesaj yaz..."
              placeholderTextColor={Colors.muted}
              value={inputText}
              onChangeText={(text) => {
                setInputText(text);
                if (!user?.uid) return;
                setTyping(chat.id, user.uid, true).catch(() => {});
                if (typingTimer.current) clearTimeout(typingTimer.current);
                typingTimer.current = setTimeout(() => {
                  setTyping(chat.id, user.uid, false).catch(() => {});
                }, 3000);
              }}
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

        {/* Delete message modal */}
        <Modal transparent visible={!!selectedMsg} animationType="slide" onRequestClose={() => setSelectedMsg(null)}>
          <TouchableOpacity style={s.menuOverlay} activeOpacity={1} onPress={() => setSelectedMsg(null)}>
            <View style={s.deleteSheet}>
              {selectedMsg?.mine && (
                <TouchableOpacity style={s.menuItem} onPress={async () => {
                  if (!selectedMsg?.id) return;
                  setSelectedMsg(null);
                  await deleteMessageForAll(chat.id, selectedMsg.id).catch(() => {});
                }}>
                  <Text style={[s.menuItemText, { color: Colors.red }]}>🗑 Hamıdan sil</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={s.menuItem} onPress={async () => {
                if (!selectedMsg?.id || !user?.uid) return;
                setSelectedMsg(null);
                await deleteMessageForMe(chat.id, selectedMsg.id, user.uid).catch(() => {});
              }}>
                <Text style={s.menuItemText}>🗑 Yalnız məndən sil</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.menuItem} onPress={() => {
                setReplyMsg(selectedMsg);
                setSelectedMsg(null);
                setTimeout(() => inputRef.current?.focus(), 100);
              }}>
                <Text style={s.menuItemText}>↩️ Cavabla</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.menuItem, { borderBottomWidth: 0 }]} onPress={() => setSelectedMsg(null)}>
                <Text style={[s.menuItemText, { color: Colors.muted }]}>Ləğv et</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        <Modal visible={showInfo} animationType="slide" presentationStyle="pageSheet">
          <GroupInfo
            chat={chat}
            onClose={() => setShowInfo(false)}
            onLeft={() => { setShowInfo(false); onClose(); }}
          />
        </Modal>

      </SafeAreaView>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  header:        { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backText:      { fontSize: 24, color: Colors.text },
  groupAva:      { width: 40, height: 40, backgroundColor: Colors.bg3, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.gold },
  groupName:     { fontFamily: Typography.playfair700, fontSize: 15, color: Colors.text },
  groupSub:      { fontSize: 11, color: Colors.muted, fontFamily: Typography.nunito400 },
  msgList:       { padding: 14, gap: 8, paddingBottom: 8 },
  systemMsg:     { alignItems: 'center', marginVertical: 8 },
  systemText:    { fontSize: 12, color: Colors.muted, fontFamily: Typography.nunito400, backgroundColor: Colors.bg3, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  senderName:    { fontSize: 12, color: Colors.gold, fontFamily: Typography.nunito700, marginBottom: 3, marginLeft: 4 },
  msgWrap:       { flexDirection: 'column', marginBottom: 4 },
  msgWrapMine:   { alignItems: 'flex-end' },
  msgWrapTheirs: { alignItems: 'flex-start' },
  msgBubble:     { maxWidth: '75%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  msgBubbleMine: { backgroundColor: Colors.gold, borderBottomRightRadius: 4 },
  msgBubbleTheirs: { backgroundColor: Colors.card, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: Colors.border },
  msgText:       { fontSize: 15, lineHeight: 22, fontFamily: Typography.nunito400 },
  msgTextMine:   { color: '#1a0e00' },
  msgTextTheirs: { color: Colors.text },
  msgTime:       { fontSize: 10, marginTop: 4, fontFamily: Typography.nunito400 },
  msgTimeMine:   { color: 'rgba(26,14,0,0.5)', textAlign: 'right' },
  msgTimeTheirs: { color: Colors.muted },
  replyBar:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: Colors.bg2, borderTopWidth: 1, borderTopColor: Colors.border },
  replyBarLine:  { width: 3, height: 36, borderRadius: 2, backgroundColor: Colors.gold },
  replyBarName:  { fontSize: 12, color: Colors.gold, fontFamily: Typography.nunito700, marginBottom: 2 },
  replyBarText:  { fontSize: 12, color: Colors.muted, fontFamily: Typography.nunito400 },
  replyQuote:    { borderRadius: 6, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: 'rgba(26,14,0,0.5)', alignSelf: 'stretch', overflow: 'hidden' },
  replyQuoteMine:   { backgroundColor: 'rgba(26,14,0,0.2)' },
  replyQuoteTheirs: { backgroundColor: 'rgba(212,160,60,0.12)', borderLeftColor: Colors.gold },
  replyQuoteName:   { fontSize: 13, color: Colors.gold, fontFamily: Typography.nunito700, marginBottom: 3 },
  replyQuoteText:   { fontSize: 13, color: Colors.text, fontFamily: Typography.nunito400 },
  inputRow:      { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.bg },
  input:         { flex: 1, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: Colors.text, fontSize: 15, fontFamily: Typography.nunito400, maxHeight: 120 },
  sendBtn:       { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.gold, alignItems: 'center', justifyContent: 'center' },
  sendBtnDis:    { opacity: 0.4 },
  sendBtnText:   { color: '#1a0e00', fontSize: 18, fontFamily: Typography.nunito700 },
  menuOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  deleteSheet:   { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  menuItem:      { paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  menuItemText:  { color: Colors.text, fontSize: 15, fontFamily: Typography.nunito500 },
  red:           { color: Colors.red },
  typingBar:     { paddingHorizontal: 16, paddingVertical: 4 },
  msgHighlight:  { backgroundColor: 'rgba(212,160,60,0.15)', borderRadius: 12 },
  typingText:    { fontSize: 13, color: Colors.gold, fontFamily: Typography.nunito500, fontStyle: 'italic' },
});
