import React, { useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Animated, Dimensions, ActivityIndicator, Modal, TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getDocs, query, collection, orderBy as fbOrderBy } from 'firebase/firestore';
import { fbFirestore, COLLECTIONS } from '../../firebase/config';
import * as FireStore from '../../firebase/firestore';
import { Colors }     from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { useAppStore } from '../../store/useAppStore';
import type { Agreement } from '../../store/useAppStore';
import MusicianProfileScreen from '../Musician/MusicianProfileScreen';

const SCREEN_W = Dimensions.get('window').width;

// ── Agreement Detail Screen ───────────────────────────────
function AgreementDetail({ agreement, onClose }: { agreement: Agreement; onClose: () => void }) {
  const { user, musicians } = useAppStore();
  const [chatMessages,    setChatMessages]    = React.useState<any[]>([]);
  const [loadingMsgs,    setLoadingMsgs]    = React.useState(false);
  const [selectedMusician, setSelectedMusician] = React.useState<any>(null);
  const slideAnim = React.useRef(new Animated.Value(SCREEN_W)).current;

  // Check online status from musicians list
  const fromMusician = musicians.find(m => (m.uid ?? m.id) === agreement.fromUid);
  const toMusician   = musicians.find(m => (m.uid ?? m.id) === agreement.toUid);
  const fromOnline   = fromMusician?.online ?? false;

  const openMusician = (uid: string, name: string) => {
    const found = musicians.find(m => (m.uid ?? m.id) === uid);
    setSelectedMusician(found ?? {
      id: uid, uid, name, emoji: '👤',
      instrument: '', city: '', rating: 5, reviews: 0,
    });
  };
  const toOnline     = toMusician?.online ?? false;

  React.useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0, damping: 26, stiffness: 300, useNativeDriver: true,
    }).start();
  }, []);

  // Load chat messages
  React.useEffect(() => {
    console.log('chatId:', agreement.chatId);
    if (!agreement.chatId) return;
    const load = async () => {
      setLoadingMsgs(true);
      console.log('Loading msgs started');
      try {
        const snap = await getDocs(query(
          collection(fbFirestore, COLLECTIONS.CHATS, agreement.chatId!, COLLECTIONS.MESSAGES),
          fbOrderBy('createdAt', 'asc'),
        ));
        const msgs = snap.docs.map(d => {
          const data = d.data();
          const ts = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
          return {
            id:         d.id,
            text:       data.text ?? '',
            senderId:   data.senderId ?? '',
            senderName: data.senderName ?? '',
            time:       ts.toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' }),
            date:       ts.toLocaleDateString('az-AZ', { day: 'numeric', month: 'short' }),
          };
        });
        setChatMessages(msgs);
      } catch { /* ignore */ }
      finally { setLoadingMsgs(false); console.log('Loading msgs done'); }
    };
    load();
  }, [agreement.chatId]);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_W, duration: 220, useNativeDriver: true,
    }).start(onClose);
  };

  const dateObj2 = agreement.createdAt?.toDate ? agreement.createdAt.toDate() : null;
  const date = dateObj2
    ? dateObj2.toLocaleDateString('az-AZ', { day: 'numeric', month: 'long', year: 'numeric' }) +
      ' ' + dateObj2.toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })
    : 'Bilinmir';

  return (
    <Animated.View style={[
      StyleSheet.absoluteFillObject,
      { backgroundColor: Colors.bg, zIndex: 100, transform: [{ translateX: slideAnim }] },
    ]}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={d.header}>
          <TouchableOpacity style={d.backBtn} onPress={handleClose} hitSlop={{ top:10, bottom:10, left:10, right:10 }}>
            <Text style={d.backText}>←</Text>
          </TouchableOpacity>
          <Text style={d.headerTitle}>Müqavilə</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={d.container}>
          {/* Status badge */}
          <View style={d.statusWrap}>
            <View style={[(ag => (ag as any).status === 'cancelled')(agreement) ? d.statusBadgeCancelled : d.statusBadge]}>
              <Text style={[(ag => (ag as any).status === 'cancelled')(agreement) ? d.statusTextCancelled : d.statusText]}>
                {(agreement as any).status === 'cancelled'
                  ? (agreement as any).cancelledBy === user?.uid
                    ? '✖ Siz imtina etdiniz'
                    : `✖ ${(agreement as any).cancelledByName ?? ''} imtina etdi`
                  : '✅ Razılaşma qəbul edildi'}
              </Text>
            </View>
            <Text style={d.dateText}>{date}</Text>
          </View>

          {/* Event details */}
          {((agreement as any).eventDate || (agreement as any).eventType) && (agreement as any).status !== 'cancelled' && (
            <View style={d.card}>
              <Text style={d.cardTitle}>📅 Tədbir məlumatı</Text>
              {(agreement as any).eventType && (
                <View style={d.detailRow}>
                  <Text style={d.detailLabel}>Növ</Text>
                  <Text style={d.detailValue}>{(agreement as any).eventType}</Text>
                </View>
              )}
              {(agreement as any).eventDate && (
                <View style={d.detailRow}>
                  <Text style={d.detailLabel}>Tarix</Text>
                  <Text style={d.detailValue}>
                    {new Date((agreement as any).eventDate).toLocaleDateString('az-AZ', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </Text>
                </View>
              )}
              {(agreement as any).eventDate && (
                <View style={d.detailRow}>
                  <Text style={d.detailLabel}>Vaxt</Text>
                  <Text style={d.detailValue}>
                    {new Date((agreement as any).eventDate).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              )}
              {(agreement as any).eventLocation && (
                <View style={d.detailRow}>
                  <Text style={d.detailLabel}>📍 Yer</Text>
                  <Text style={d.detailValue}>{(agreement as any).eventLocation}</Text>
                </View>
              )}
              {(agreement as any).eventNotes && (
                <View style={[d.detailRow, { borderBottomWidth: 0 }]}>
                  <Text style={d.detailLabel}>📝 Əlavələr</Text>
                  <Text style={d.detailValue}>{(agreement as any).eventNotes}</Text>
                </View>
              )}
            </View>
          )}

          {/* Parties — clickable to open profile */}
          <View style={d.card}>
            <Text style={d.cardTitle}>Tərəflər</Text>
            <TouchableOpacity
              style={d.party}
              onPress={() => openMusician(agreement.fromUid, agreement.fromName)}
              activeOpacity={0.7}
            >
              <View style={d.partyAvaWrap}>
                <View style={d.partyAva}><Text style={{ fontSize: 22 }}>👤</Text></View>
                <View style={[d.onlineDot, { backgroundColor: fromOnline ? Colors.green : Colors.muted }]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[d.partyName, (agreement as any).cancelledBy === agreement.fromUid && { color: Colors.red, textDecorationLine: 'underline' }]}>{agreement.fromName}</Text>
                <Text style={[d.partyRole, (agreement as any).cancelledBy === agreement.fromUid && { color: Colors.red }]}>
                  {(agreement as any).cancelledBy === agreement.fromUid ? 'İmtina etdi' : 'Göndərən (Təklif edən)'}
                </Text>
              </View>
              <Text style={[d.onlineLabel, { color: fromOnline ? Colors.green : Colors.muted }]}>
                {fromOnline ? '● Onlayn' : '○ Oflayn'}
              </Text>
              <Text style={d.partyArrow}>›</Text>
            </TouchableOpacity>
            <View style={d.divider} />
            <TouchableOpacity
              style={d.party}
              onPress={() => openMusician(agreement.toUid, agreement.toName)}
              activeOpacity={0.7}
            >
              <View style={d.partyAvaWrap}>
                <View style={d.partyAva}><Text style={{ fontSize: 22 }}>👤</Text></View>
                <View style={[d.onlineDot, { backgroundColor: toOnline ? Colors.green : Colors.muted }]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[d.partyName, (agreement as any).cancelledBy === agreement.toUid && { color: Colors.red, textDecorationLine: 'underline' }]}>{agreement.toName}</Text>
                <Text style={[d.partyRole, (agreement as any).cancelledBy === agreement.toUid && { color: Colors.red }]}>
                  {(agreement as any).cancelledBy === agreement.toUid ? 'İmtina etdi' : 'Qəbul edən'}
                </Text>
              </View>
              <Text style={[d.onlineLabel, { color: toOnline ? Colors.green : Colors.muted }]}>
                {toOnline ? '● Onlayn' : '○ Oflayn'}
              </Text>
              <Text style={d.partyArrow}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Agreement details card removed — number and date shown in chat history footer */}

          {/* Chat history */}
          {chatMessages.length > 0 && (
            <View style={d.card}>
              <Text style={d.cardTitle}>💬 Yazışma tarixi</Text>
              {chatMessages.map((msg, i) => {
                const isVoice = msg.text?.startsWith('🎤 VOICE:');
                const isMine  = msg.senderId === user?.uid;
                return (
                  <View key={msg.id ?? i} style={d.msgRow}>
                    <View style={[d.msgAva, { backgroundColor: isMine ? Colors.gold + '33' : Colors.bg3 }]}>
                      <Text style={{ fontSize: 12 }}>👤</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={d.msgHeader}>
                        <Text style={[d.msgSender, { color: isMine ? Colors.gold : Colors.text }]}>
                          {msg.senderName}
                        </Text>
                        <Text style={d.msgTime}>{msg.date} {msg.time}</Text>
                      </View>
                      <Text style={d.msgText}>
                        {isVoice ? '🎤 Səs mesajı' : msg.text}
                      </Text>
                    </View>
                  </View>
                );
              })}
              {/* Number and date at bottom */}
              <View style={d.chatFooter}>
                <Text style={d.chatFooterText}>№ {agreement.id.slice(0, 8).toUpperCase()}</Text>
                <Text style={d.chatFooterText}>{date}</Text>
              </View>
            </View>
          )}

          {/* If no messages yet — still show number and date */}
          {loadingMsgs && (
            <View style={{ alignItems: 'center', padding: 20 }}>
              <ActivityIndicator size="small" color={Colors.gold} />
              <Text style={{ color: Colors.muted, marginTop: 8, fontSize: 12 }}>Yazışma yüklənir...</Text>
            </View>
          )}
          {!loadingMsgs && chatMessages.length === 0 && (
            <View style={d.card}>
              <Text style={d.cardTitle}>💬 Yazışma tarixi</Text>
              <Text style={[d.msgText, { color: Colors.muted, paddingVertical: 8 }]}>
                Yazışma yoxdur
              </Text>
              <View style={d.chatFooter}>
                <Text style={d.chatFooterText}>№ {agreement.id.slice(0, 8).toUpperCase()}</Text>
                <Text style={d.chatFooterText}>{date}</Text>
              </View>
            </View>
          )}

          {/* Note */}
          <View style={d.noteCard}>
            <Text style={d.noteText}>
              Bu müqavilə {agreement.fromName} və {agreement.toName} arasında
              qarşılıqlı razılıq əsasında bağlanmışdır.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Open musician profile on party tap */}
      {selectedMusician && (
        <MusicianProfileScreen
          musician={selectedMusician}
          onClose={() => setSelectedMusician(null)}
        />
      )}
    </Animated.View>
  );
}

// ── Calendar View ────────────────────────────────────────
// ── Custom Date Picker ────────────────────────────────────
const ITEM_H = 44;
const VISIBLE = 3;
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
        contentContainerStyle={{ paddingVertical: ITEM_H * 1 }}
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
                fontSize: isSelected ? 22 : 15,
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
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
  const monthNames = ['Yanvar','Fevral','Mart','Aprel','May','İyun','İyul','Avqust','Sentyabr','Oktyabr','Noyabr','Dekabr'];

  return (
    <View style={{ marginBottom: 8 }}>

      <View style={{ borderRadius: 16, overflow: 'hidden', backgroundColor: '#161210', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}>
        {/* Selection highlight */}
        <View pointerEvents="none" style={{
          position: 'absolute',
          top: ITEM_H * 1,
          left: 8, right: 8,
          height: ITEM_H,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: 'rgba(212,160,60,0.5)',
          backgroundColor: 'rgba(255,255,255,0.07)',
          zIndex: 1,
        }} />
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 100 }}>
          <WheelCol
            flex={1}
            items={hours}
            selectedIndex={value.getHours()}
            onSelect={i => { const d = new Date(value); d.setHours(i); onChange(d); }}
          />
          <Text style={{ color: Colors.gold, fontSize: 28, fontFamily: Typography.nunito700, paddingBottom: 4, paddingHorizontal: 8 }}>:</Text>
          <WheelCol
            flex={1}
            items={minutes}
            selectedIndex={value.getMinutes()}
            onSelect={i => { const d = new Date(value); d.setMinutes(i); onChange(d); }}
          />
        </View>
      </View>
    </View>
  );
}

// ── Calendar View ────────────────────────────────────────
function CalendarView({ agreements, onSelectAgreement, personalEvents, eventsAsMusician, onOpenProfile, showModalFromParent, onModalShown }: { agreements: any[]; onSelectAgreement: (ag: any) => void; personalEvents: any[]; eventsAsMusician: any[]; onOpenProfile: (m: any) => void; showModalFromParent?: boolean; onModalShown?: () => void }) {
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [selectedDay, setSelectedDay] = React.useState<number | null>(null);
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [newEventType, setNewEventType] = React.useState('Toy');
  const [newEventLocation, setNewEventLocation] = React.useState('');
  const [newEventNotes, setNewEventNotes] = React.useState('');
  const [newEventQeyd, setNewEventQeyd] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [newEventDate, setNewEventDate] = React.useState(new Date());
  const [selectedMusicians, setSelectedMusicians] = React.useState<string[]>([]);
  const [musicianSearch, setMusicianSearch] = React.useState('');
  const [showMusicianPicker, setShowMusicianPicker] = React.useState(false);
  const [digerText, setDigerText] = React.useState('');
  const { user, musicians } = useAppStore();
  const EVENT_TYPES = ['Toy', 'Konsert', 'Bayram', 'Digər'];
  const NOTES_OPTIONS = [
    'Qara kostyum və ağ köynək',
    'Qara köynək sərbəst',
    'Qalstuk',
    'Baboçka',
    'Yumru boğaz köynək sərbəst',
    'Digər...',
  ];

  React.useEffect(() => {
    if (showModalFromParent) {
      setShowAddModal(true);
      onModalShown?.();
    }
  }, [showModalFromParent]);


  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthNames = ['Yanvar','Fevral','Mart','Aprel','May','İyun','İyul','Avqust','Sentyabr','Oktyabr','Noyabr','Dekabr'];
  const dayNames = ['B.e','Ç.a','Ç','C.a','C','Ş','B'];

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;

  // Group agreements by day
  const eventDays: Record<number, any[]> = {};
  agreements.forEach(a => {
    const d = new Date(a.eventDate);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!eventDays[day]) eventDays[day] = [];
      eventDays[day].push(a);
    }
  });

  // Add personal events to calendar
  const allPersonal = [...personalEvents, ...eventsAsMusician.map(e => ({ ...e, _isInvited: true }))];
  allPersonal.forEach(e => {
    if (!e.date) return;
    const d = new Date(e.date);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!eventDays[day]) eventDays[day] = [];
      eventDays[day].push({ ...e, _isPersonal: true });
    }
  });
  const selectedEvents = selectedDay ? (eventDays[selectedDay] ?? []) : [];

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 16 }}>
      {/* Month navigation */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <TouchableOpacity
          onPress={() => setCurrentDate(new Date(year, month - 1, 1))}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg3, borderRadius: 12 }}
        >
          <Text style={{ color: Colors.gold, fontSize: 24, fontWeight: '300' }}>‹</Text>
        </TouchableOpacity>
        <Text style={{ color: Colors.text, fontFamily: Typography.playfair700, fontSize: 22 }}>
          {monthNames[month]} {year}
        </Text>
        <TouchableOpacity
          onPress={() => setCurrentDate(new Date(year, month + 1, 1))}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg3, borderRadius: 12 }}
        >
          <Text style={{ color: Colors.gold, fontSize: 24, fontWeight: '300' }}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Day names */}
      <View style={{ flexDirection: 'row', marginBottom: 8 }}>
        {dayNames.map(d => (
          <Text key={d} style={{ flex: 1, textAlign: 'center', color: Colors.muted, fontSize: 13, fontFamily: Typography.nunito700 }}>{d}</Text>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {Array.from({ length: startOffset }).map((_, i) => (
          <View key={`empty-${i}`} style={{ width: '14.28%', aspectRatio: 1 }} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const hasEvent = !!eventDays[day];
          const isSelected = selectedDay === day;
          const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;
          return (
            <TouchableOpacity
              key={day}
              style={{ width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' }}
              onPress={() => setSelectedDay(isSelected ? null : day)}
            >
              <View style={{
                width: 40, height: 40, borderRadius: 20,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: isSelected ? Colors.gold : hasEvent ? 'rgba(212,160,60,0.15)' : 'transparent',
                borderWidth: isToday ? 1 : 0,
                borderColor: Colors.gold,
              }}>
                <Text style={{ color: isSelected ? '#1a0e00' : hasEvent ? Colors.gold : Colors.text, fontSize: 15, fontFamily: Typography.nunito600 }}>{day}</Text>
              </View>
              {hasEvent && !isSelected && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.gold, marginTop: 2 }} />}
            </TouchableOpacity>
          );
        })}
      </View>

      </View>
      <ScrollView style={{ flex: 1, paddingHorizontal: 16 }} showsVerticalScrollIndicator={false}>
      {/* Selected day events */}
      {selectedDay && selectedEvents.length > 0 && (
        <View style={{ marginTop: 20 }}>
          <Text style={{ color: Colors.text, fontFamily: Typography.playfair700, fontSize: 16, marginBottom: 12 }}>
            {selectedDay} {monthNames[month]}
          </Text>
          {(() => {
            const agreementEvents = selectedEvents.filter((a: any) => !a._isPersonal);
            const personalEventsList = selectedEvents.filter((a: any) => a._isPersonal);
            const groups: Record<string, any[]> = {};
            agreementEvents.forEach((a: any) => {
              const time = new Date(a.eventDate).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' });
              const key = `${a.fromUid}|${a.eventType}|${a.eventLocation ?? ''}|${time}`;
              if (!groups[key]) groups[key] = [];
              groups[key].push(a);
            });
            return Object.entries(groups).map(([key, items], gi) => {
              const first = items[0];
              const time = new Date(first.eventDate).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' });
              const locations = [...new Set(items.map((a: any) => a.eventLocation).filter(Boolean))];
              const musicians = items.filter((a: any) => a.toUid !== first.fromUid);
              return (
                <View
                  key={gi}
                  style={{ backgroundColor: Colors.card, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border }}
                >
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10, alignItems: 'center' }}>
                    <Text style={{ color: Colors.gold, fontFamily: Typography.nunito700, fontSize: 15 }}>{first.eventType}</Text>
                    {locations.length > 0 && <Text style={{ color: Colors.text, fontSize: 13 }}>{'· 📍 ' + locations.join(', ')}</Text>}
                    <Text style={{ color: Colors.text, fontSize: 13 }}>{'· 🕐 ' + time}</Text>
                  </View>
                  {first.eventNotes && (
                    <Text style={{ color: Colors.muted, fontSize: 13, marginBottom: 10 }}>{'📝 ' + first.eventNotes}</Text>
                  )}
                  <View style={{ height: 1, backgroundColor: Colors.border, marginVertical: 8 }} />
                  <Text style={{ color: Colors.muted, fontSize: 11, fontFamily: Typography.nunito700, marginBottom: 8, letterSpacing: 1 }}>MUSİQİÇİLƏR</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.gold + '22', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.gold }}>
                      <Text style={{ fontSize: 18 }}>👑</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: Colors.gold, fontFamily: Typography.playfair700, fontSize: 16 }}>{first.fromName}</Text>
                      <Text style={{ color: Colors.muted, fontSize: 11 }}>Təklif edən</Text>
                    </View>
                  </View>
                  {musicians.map((a: any, mi: number) => (
                    <TouchableOpacity key={mi} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }} onPress={() => onSelectAgreement(a)} activeOpacity={0.75}>
                      <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: Colors.bg3, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 15 }}>🎵</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: Colors.text, fontFamily: Typography.nunito600, fontSize: 13 }}>{a.toName}</Text>
                        <Text style={{ color: Colors.muted, fontSize: 11 }}>Musiqiçi</Text>
                      </View>
                      <Text style={{ color: Colors.gold, fontSize: 14 }}>›</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              );
            });

            // Render personal events
            const personalCards = personalEventsList.map((e: any, pi: number) => {
              const isInvited = !!e._isInvited;
              const owner = isInvited ? musicians.find(m => (m.uid ?? m.id) === e.ownerUid) : null;
              const time = e.date ? new Date(e.date).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' }) : '';
              return (
                <View key={'p' + pi} style={{ backgroundColor: Colors.card, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: isInvited ? Colors.gold : Colors.gold + '66' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ color: Colors.gold, fontFamily: Typography.nunito700, fontSize: 14 }}>{e.type}</Text>
                      {time ? <Text style={{ color: Colors.muted, fontSize: 12 }}>{'🕐 ' + time}</Text> : null}
                    </View>
                    <View style={{ borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: isInvited ? 'rgba(212,160,60,0.15)' : 'rgba(39,174,96,0.15)', borderWidth: 1, borderColor: isInvited ? Colors.gold : Colors.green }}>
                      <Text style={{ color: isInvited ? Colors.gold : Colors.green, fontSize: 10, fontFamily: Typography.nunito700 }}>
                        {isInvited ? 'Dəvət olunmusan' : 'Şəxsi'}
                      </Text>
                    </View>
                  </View>
                  {isInvited && owner && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <Text style={{ fontSize: 14 }}>{owner.emoji ?? '👤'}</Text>
                      <Text style={{ color: Colors.text, fontFamily: Typography.nunito600, fontSize: 13 }}>{owner.name}</Text>
                      <Text style={{ color: Colors.muted, fontSize: 11 }}>təşkil edir</Text>
                    </View>
                  )}
                  {e.location ? <Text style={{ color: Colors.text, fontSize: 13, marginBottom: 4 }}>{'📍 ' + e.location}</Text> : null}
                  {e.notes ? <Text style={{ color: Colors.muted, fontSize: 12 }}>{'📝 ' + e.notes}</Text> : null}
                </View>
              );
            });

            return [...Object.entries(groups).map(([key, items], gi) => {
              const first = items[0];
              const time = new Date(first.eventDate).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' });
              const locations = [...new Set(items.map((a: any) => a.eventLocation).filter(Boolean))];
              const musicians = items.filter((a: any) => a.toUid !== first.fromUid);
              return (
                <View key={gi} style={{ backgroundColor: Colors.card, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border }}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10, alignItems: 'center' }}>
                    <Text style={{ color: Colors.gold, fontFamily: Typography.nunito700, fontSize: 15 }}>{first.eventType}</Text>
                    {locations.length > 0 && <Text style={{ color: Colors.text, fontSize: 13 }}>{"· 📍 " + locations.join(", ")}</Text>}
                    <Text style={{ color: Colors.text, fontSize: 13 }}>{"· 🕐 " + time}</Text>
                  </View>
                  {first.eventNotes && <Text style={{ color: Colors.muted, fontSize: 13, marginBottom: 10 }}>{"📝 " + first.eventNotes}</Text>}
                  <View style={{ height: 1, backgroundColor: Colors.border, marginVertical: 8 }} />
                  <Text style={{ color: Colors.muted, fontSize: 11, fontFamily: Typography.nunito700, marginBottom: 8, letterSpacing: 1 }}>MUSİQİÇİLƏR</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.gold + '22', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.gold }}>
                      <Text style={{ fontSize: 18 }}>👑</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: Colors.gold, fontFamily: Typography.playfair700, fontSize: 16 }}>{first.fromName}</Text>
                      <Text style={{ color: Colors.muted, fontSize: 11 }}>Təklif edən</Text>
                    </View>
                  </View>
                  {musicians.map((a: any, mi: number) => (
                    <TouchableOpacity key={mi} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }} onPress={() => onSelectAgreement(a)} activeOpacity={0.75}>
                      <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: Colors.bg3, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 15 }}>🎵</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: Colors.text, fontFamily: Typography.nunito600, fontSize: 13 }}>{a.toName}</Text>
                        <Text style={{ color: Colors.muted, fontSize: 11 }}>Musiqiçi</Text>
                      </View>
                      <Text style={{ color: Colors.gold, fontSize: 14 }}>›</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              );
            }), ...personalCards];
          })()}
        </View>
      )}
      {selectedDay && selectedEvents.length === 0 && (
        <View style={{ alignItems: 'center', marginTop: 20 }}>
          <Text style={{ color: Colors.muted, marginBottom: 16 }}>Bu gün üçün tədbir yoxdur</Text>
          <TouchableOpacity
            style={{ padding: 14, borderRadius: 12, backgroundColor: 'rgba(212,160,60,0.1)', borderWidth: 1, borderColor: Colors.gold, alignItems: 'center', width: '100%' }}
            onPress={() => setShowAddModal(true)}
          >
            <Text style={{ color: Colors.gold, fontFamily: Typography.nunito600, fontSize: 14 }}>+ Tədbir əlavə et</Text>
          </TouchableOpacity>
        </View>
      )}

      </ScrollView>
      {/* Musician Picker Modal */}
      <Modal visible={showMusicianPicker} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: Colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ color: Colors.text, fontFamily: Typography.playfair700, fontSize: 16 }}>Musiqiçi seç</Text>
              <TouchableOpacity onPress={() => { setShowMusicianPicker(false); setMusicianSearch(''); }}>
                <Text style={{ color: Colors.muted, fontSize: 22 }}>×</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bg3, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, marginBottom: 12, paddingRight: 8 }}>
              <TextInput
                style={{ flex: 1, padding: 10, color: Colors.text, fontSize: 13 }}
                placeholder="Axtar..."
                placeholderTextColor={Colors.muted}
                value={musicianSearch}
                onChangeText={setMusicianSearch}
              />
              {musicianSearch.length > 0 && (
                <TouchableOpacity onPress={() => setMusicianSearch('')}>
                  <Text style={{ color: Colors.muted, fontSize: 18, paddingHorizontal: 4 }}>×</Text>
                </TouchableOpacity>
              )}
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {musicians.filter(m => musicianSearch.length === 0 || m.name.toLowerCase().includes(musicianSearch.toLowerCase())).map(m => {
                const mid = m.uid ?? m.id;
                const sel = selectedMusicians.includes(mid);
                return (
                  <TouchableOpacity key={mid} onPress={() => setSelectedMusicians(prev => sel ? prev.filter(x => x !== mid) : [...prev, mid])} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border }}>
                    <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: sel ? Colors.gold : Colors.muted, backgroundColor: sel ? Colors.gold : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                      {sel && <Text style={{ color: '#1a0e00', fontSize: 12, fontFamily: Typography.nunito700 }}>✓</Text>}
                    </View>
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.bg3, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 18 }}>{m.emoji ?? '👤'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: sel ? Colors.gold : Colors.text, fontFamily: Typography.nunito600, fontSize: 13 }}>{m.name}</Text>
                      <Text style={{ color: Colors.muted, fontSize: 11 }}>{m.instrument}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              style={{ marginTop: 12, paddingVertical: 12, borderRadius: 20, alignItems: 'center', backgroundColor: Colors.gold }}
              onPress={() => { setShowMusicianPicker(false); setMusicianSearch(''); setShowAddModal(true); }}
            >
              <Text style={{ color: '#1a0e00', fontFamily: Typography.nunito700 }}>Hazır ({selectedMusicians.length})</Text>
            </TouchableOpacity>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Personal Event Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: Colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%', flex: 1 }}>
            {/* Fixed Header */}
            <View style={{ padding: 20, paddingBottom: 12 }}>
              <Text style={{ color: Colors.text, fontFamily: Typography.playfair700, fontSize: 18, marginBottom: 16, textAlign: 'center' }}>Tədbir əlavə et</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {EVENT_TYPES.map(t => (
                  <TouchableOpacity
                    key={t}
                    style={{ flex: 1, paddingVertical: 8, borderRadius: 20, alignItems: 'center', backgroundColor: newEventType === t ? Colors.gold : Colors.bg3, borderWidth: 1, borderColor: newEventType === t ? Colors.gold : Colors.border }}
                    onPress={() => setNewEventType(t)}
                  >
                    <Text style={{ color: newEventType === t ? '#1a0e00' : Colors.muted, fontFamily: Typography.nunito700, fontSize: 12 }}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={{ color: Colors.gold, fontFamily: Typography.nunito700, fontSize: 15, textAlign: 'center', marginTop: 12 }}>
                {newEventDate.getDate()} {['Yanvar','Fevral','Mart','Aprel','May','İyun','İyul','Avqust','Sentyabr','Oktyabr','Noyabr','Dekabr'][newEventDate.getMonth()]} {newEventDate.getFullYear()}
              </Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ paddingHorizontal: 20 }}>

            {/* Date & Time Picker */}
            <CustomDatePicker value={newEventDate} onChange={setNewEventDate} />

            {/* Musicians */}
            <Text style={{ color: Colors.muted, fontSize: 12, fontFamily: Typography.nunito700, marginBottom: 8 }}>MUSİQİÇİLƏR</Text>
            {selectedMusicians.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {selectedMusicians.map(mid => {
                  const m = musicians.find(x => (x.uid ?? x.id) === mid);
                  return (
                    <TouchableOpacity key={mid} onPress={() => { if (m) { setShowAddModal(false); onOpenProfile(m); } }} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.gold + '22', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: Colors.gold }}>
                      <Text style={{ fontSize: 16 }}>{m?.emoji ?? '👤'}</Text>
                      <View>
                        <Text style={{ color: Colors.gold, fontFamily: Typography.nunito700, fontSize: 12 }}>{m?.name ?? mid}</Text>
                        {m?.instrument ? <Text style={{ color: Colors.gold, fontSize: 10, opacity: 0.7 }}>{m.instrument}</Text> : null}
                      </View>
                      <TouchableOpacity onPress={() => setSelectedMusicians(prev => prev.filter(x => x !== mid))} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ marginLeft: 6, padding: 2 }}>
                        <Text style={{ color: Colors.red, fontSize: 16, fontFamily: Typography.nunito700 }}>×</Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bg3, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, marginBottom: 16, padding: 12 }}
              onPress={() => { setShowAddModal(false); setShowMusicianPicker(true); }}
            >
              <Text style={{ flex: 1, color: Colors.muted, fontSize: 13 }}>Musiqiçi seç...</Text>
              <Text style={{ color: Colors.gold, fontSize: 16 }}>+</Text>
            </TouchableOpacity>

            {/* Location */}
            <TextInput
              style={{ backgroundColor: Colors.bg3, borderRadius: 12, padding: 12, color: Colors.text, borderWidth: 1, borderColor: Colors.border, marginBottom: 16 }}
              placeholder="Məkan daxil edin..."
              placeholderTextColor={Colors.muted}
              value={newEventLocation}
              onChangeText={setNewEventLocation}
            />

            {/* Əlavələr */}
            <Text style={{ color: Colors.muted, fontSize: 12, fontFamily: Typography.nunito700, marginBottom: 8 }}>ƏLAVƏLƏR (istəyə görə)</Text>
            <View style={{ gap: 6, marginBottom: 16 }}>
              {NOTES_OPTIONS.map((opt, i) => {
                const isDiger = opt === 'Digər...';
                const isSelected = isDiger
                  ? newEventNotes.split(', ').some(x => !NOTES_OPTIONS.slice(0,-1).includes(x) && x.length > 0)
                  : newEventNotes.split(', ').includes(opt);
                return (
                  <View key={i}>
                    <TouchableOpacity
                      style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: isSelected ? Colors.gold : Colors.border, backgroundColor: isSelected ? 'rgba(212,160,60,0.1)' : Colors.bg3, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                      onPress={() => {
                        if (isDiger) {
                          setDigerText(prev => prev ? '' : ' ');
                          if (digerText) {
                            const current = newEventNotes.split(', ').filter(x => NOTES_OPTIONS.slice(0,-1).includes(x));
                            setNewEventNotes(current.join(', '));
                            setDigerText('');
                          }
                        } else {
                          const current = newEventNotes ? newEventNotes.split(', ').filter(Boolean) : [];
                          const updated = isSelected ? current.filter(x => x !== opt) : [...current, opt];
                          setNewEventNotes(updated.join(', '));
                        }
                      }}
                    >
                      <Text style={{ color: isSelected ? Colors.gold : Colors.text, fontFamily: Typography.nunito600, fontSize: 13 }}>{opt}</Text>
                      {isSelected && <Text style={{ color: Colors.gold }}>✓</Text>}
                    </TouchableOpacity>
                    {isDiger && digerText !== '' && (
                      <TextInput
                        style={{ backgroundColor: Colors.bg3, borderRadius: 10, padding: 10, color: Colors.text, borderWidth: 1, borderColor: Colors.gold, marginTop: 6, fontSize: 13 }}
                        placeholder="Öz variantınızı yazın..."
                        placeholderTextColor={Colors.muted}
                        value={digerText.trim()}
                        onChangeText={text => {
                          setDigerText(text);
                          const standard = newEventNotes.split(', ').filter(x => NOTES_OPTIONS.slice(0,-1).includes(x));
                          setNewEventNotes([...standard, text].filter(Boolean).join(', '));
                        }}
                      />
                    )}
                  </View>
                );
              })}
            </View>

            <TextInput
              style={{ backgroundColor: Colors.bg3, borderRadius: 12, padding: 12, color: Colors.text, borderWidth: 1, borderColor: Colors.border, marginBottom: 20, minHeight: 60 }}
              placeholder="Əlavə qeydlər..."
              placeholderTextColor={Colors.muted}
              value={newEventQeyd}
              onChangeText={setNewEventQeyd}
              multiline
            />

            </ScrollView>
            {/* Fixed Buttons */}
            <View style={{ flexDirection: 'row', gap: 10, padding: 20, paddingTop: 12 }}>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 14, borderRadius: 20, alignItems: 'center', backgroundColor: Colors.bg3, borderWidth: 1, borderColor: Colors.border }}
                onPress={() => { setShowAddModal(false); setNewEventLocation(''); setNewEventNotes(''); setNewEventQeyd(''); setSelectedMusicians([]); setNewEventDate(new Date(year, month, selectedDay ?? 1, 12, 0)); }}
              >
                <Text style={{ color: Colors.muted, fontFamily: Typography.nunito700 }}>Ləğv et</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 14, borderRadius: 20, alignItems: 'center', backgroundColor: Colors.gold, opacity: saving ? 0.6 : 1 }}
                disabled={saving}
                onPress={async () => {
                  if (!user?.uid) return;
                  setSaving(true);
                  try {
                    const date = newEventDate;
                    await FireStore.addPersonalEvent(user.uid, {
                      date: date.toISOString(),
                      type: newEventType,
                      location: newEventLocation,
                      notes: [newEventNotes, newEventQeyd].filter(Boolean).join(' | '),
                      musicians: selectedMusicians,
                    });
                    setShowAddModal(false);
                    setNewEventLocation('');
                    setNewEventNotes('');
                    setNewEventQeyd('');
                  } catch { Alert.alert('Xəta', 'Saxlamaq mümkün olmadı'); }
                  finally { setSaving(false); }
                }}
              >
                {saving ? <ActivityIndicator color="#1a0e00" size="small" /> : <Text style={{ color: '#1a0e00', fontFamily: Typography.nunito700 }}>Saxla</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ── Agreement Card with messages ─────────────────────────
function AgreementCard({ ag, onPress, isUnread }: { ag: Agreement; onPress: () => void; isUnread: boolean }) {
  const { user } = useAppStore();
  const isSender    = ag.fromUid === user?.uid;
  const otherName   = isSender ? ag.toName : ag.fromName;
  const isCancelled = (ag as any).status === 'cancelled';
  const cancelledByMe = (ag as any).cancelledBy === user?.uid;
  const cancelledByName = (ag as any).cancelledByName ?? otherName;
  const eventDate = (ag as any).eventDate ? new Date((ag as any).eventDate) : null;
  const eventType = (ag as any).eventType ?? null;
  const eventLocation = (ag as any).eventLocation ?? null;
  const eventDateStr = eventDate
    ? eventDate.toLocaleDateString('az-AZ', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  const dateObj = ag.createdAt?.toDate ? ag.createdAt.toDate() : null;
  const date = dateObj
    ? dateObj.toLocaleDateString('az-AZ', { day: 'numeric', month: 'long', year: 'numeric' }) +
      ' ' + dateObj.toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })
    : '';

  const roleText = isCancelled
    ? cancelledByMe
      ? 'Siz imtina etdiniz'
      : `${cancelledByName} imtina etdi`
    : isSender ? 'Siz göndərdiniz' : 'Sizə göndərildi';

  return (
    <TouchableOpacity
      style={[s.card, isCancelled ? (isUnread ? s.cardCancelledUnread : s.cardCancelled) : isUnread ? s.cardUnread : s.cardRead]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={s.cardLeft}>
        <View style={s.cardAva}>
          <Text style={{ fontSize: 22 }}>{isCancelled ? '✖️' : '📋'}</Text>
          {isUnread && !isCancelled && <View style={s.unreadDot} />}
          {isUnread && isCancelled && <View style={s.unreadDotCancelled} />}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.cardName, isUnread ? s.cardNameUnread : s.cardNameRead]}>{otherName}</Text>
          <Text style={[s.cardRole, isUnread ? (isCancelled ? s.cardRoleCancelled : s.cardRoleUnread) : s.cardRoleRead]}>
            {roleText}
          </Text>
          <Text style={[s.cardDate, !isUnread && s.cardDateRead]}>{date}</Text>
          {eventDateStr && !isCancelled && (
            <Text style={[s.cardDate, { color: Colors.gold, marginTop: 2 }]}>
              📅 {eventType} — {eventDateStr}
              {eventLocation ? ` · ${eventLocation}` : ''}
            </Text>
          )}
        </View>
        <View style={s.cardRight}>
          {isUnread && !isCancelled && <View style={s.unreadCircle} />}
          {isUnread && isCancelled && <View style={s.unreadCircleCancelled} />}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Agreements List Screen ────────────────────────────────
export default function AgreementsScreen({ route }: { route?: any }) {
  const { agreements, user, markAgreementAsRead } = useAppStore();
  const readAgreementIds: string[] = useAppStore(s => (s as any).readAgreementIds ?? []);
  const autoOpenUid = route?.params?.musicianUid ?? null;
  const initialTab = route?.params?.tab ?? 'outgoing';
  const [activeTab, setActiveTab] = React.useState<'outgoing' | 'incoming' | 'cancelled'>(initialTab);

  React.useEffect(() => {
    if (route?.params?.tab) {
      setActiveTab(route.params.tab);
    }
  }, [route?.params?.tab, route?.params?._t]);

  const outgoing  = agreements.filter((a: any) => a.fromUid === user?.uid && a.status !== 'cancelled');
  const incoming  = agreements.filter((a: any) => a.toUid === user?.uid && a.status !== 'cancelled');
  const cancelled = agreements.filter((a: any) => a.status === 'cancelled' && (a.fromUid === user?.uid || a.toUid === user?.uid));
  const sortAndGroup = (list: any[]) => {
    const unread = list.filter((a: any) => !readAgreementIds.includes(a.id))
      .sort((a: any, b: any) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
    const read = list.filter((a: any) => readAgreementIds.includes(a.id))
      .sort((a: any, b: any) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
    return [...unread, ...read];
  };
  const filtered = sortAndGroup(
    activeTab === 'outgoing' ? outgoing : activeTab === 'incoming' ? incoming : cancelled
  );

  // Mark all as seen when screen opens (clears badge)
  React.useEffect(() => {
  }, []);

  // Auto-open agreement with specific musician
  const autoAgreement = autoOpenUid
    ? agreements.find(a => a.fromUid === autoOpenUid || a.toUid === autoOpenUid) ?? null
    : null;

  const [selected, setSelected] = useState<Agreement | null>(autoAgreement);
  const [mainView, setMainView] = useState<'agreements' | 'calendar'>('agreements');
  const personalEvents = useAppStore(s => s.personalEvents);
  const eventsAsMusician = useAppStore(s => s.eventsAsMusician);
  const [calendarProfileMusician, setCalendarProfileMusician] = useState<any>(null);
  const [calendarShowModal, setCalendarShowModal] = useState(false);

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <View style={s.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%' }}>
          <TouchableOpacity
            style={[s.mainViewBtn, mainView === 'agreements' && s.mainViewBtnActive]}
            onPress={() => setMainView('agreements')}
          >
            <Text style={[s.mainViewText, mainView === 'agreements' && s.mainViewTextActive]}>📋 Müqavilələr</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.mainViewBtn, mainView === 'calendar' && s.mainViewBtnActive]}
            onPress={() => setMainView('calendar')}
          >
            <Text style={[s.mainViewText, mainView === 'calendar' && s.mainViewTextActive]}>📅 Təqvim</Text>
          </TouchableOpacity>
        </View>
        <Text style={s.subtitle}>{agreements.length} müqavilə</Text>
      </View>

      {mainView === 'agreements' && <View style={s.tabRow}>
        <TouchableOpacity style={[s.tab, activeTab === 'outgoing' && s.tabActive]} onPress={() => setActiveTab('outgoing')}>
          <Text style={[s.tabText, activeTab === 'outgoing' && s.tabTextActive]}>Göndərilən ({outgoing.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tab, activeTab === 'incoming' && s.tabActive]} onPress={() => setActiveTab('incoming')}>
          <Text style={[s.tabText, activeTab === 'incoming' && s.tabTextActive]}>Gələnlər ({incoming.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tab, activeTab === 'cancelled' && s.tabCancelledActive]} onPress={() => setActiveTab('cancelled')}>
          <Text style={[s.tabText, activeTab === 'cancelled' && s.tabCancelledText]}>Ləğv edilən ({cancelled.length})</Text>
        </TouchableOpacity>
      </View>}

      {mainView === 'calendar' && (
        <CalendarView agreements={agreements.filter((a: any) => a.status === 'agreed' && a.eventDate)} onSelectAgreement={(ag) => setSelected(ag)} personalEvents={personalEvents} eventsAsMusician={eventsAsMusician} onOpenProfile={(m) => setCalendarProfileMusician(m)} showModalFromParent={calendarShowModal} onModalShown={() => setCalendarShowModal(false)} />
      )}

      {mainView === 'agreements' && <ScrollView
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
      >
        {agreements.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>📋</Text>
            <Text style={s.emptyTitle}>Hələ müqavilə yoxdur</Text>
            <Text style={s.emptyDesc}>
              Musiqiçi ilə razılaşdıqda müqavilə burada görünəcək
            </Text>
          </View>
        ) : (
          filtered.map(ag => (
            <AgreementCard
              key={ag.id}
              ag={ag}
              isUnread={!readAgreementIds.includes(ag.id)}
              onPress={() => {
                markAgreementAsRead?.(ag.id);
                setSelected(ag);
              }}
            />
          ))
        )}
      </ScrollView>}

      {calendarProfileMusician && (
        <MusicianProfileScreen musician={calendarProfileMusician} onClose={() => { setCalendarProfileMusician(null); setCalendarShowModal(true); }} />
      )}
      {selected && (
        <AgreementDetail
          agreement={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </SafeAreaView>
  );
}

const d = StyleSheet.create({
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn:     { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backText:    { fontSize: 24, color: Colors.text },
  headerTitle: { fontFamily: Typography.playfair700, fontSize: 18, color: Colors.text },
  container:   { padding: 18, gap: 16, paddingBottom: 40 },
  statusWrap:  { alignItems: 'center', paddingVertical: 20, gap: 8 },
  statusBadge:           { backgroundColor: 'rgba(39,174,96,0.15)', borderWidth: 1, borderColor: Colors.green, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  statusText:            { color: Colors.green, fontSize: 15, fontFamily: Typography.nunito700 },
  statusBadgeCancelled:  { backgroundColor: 'rgba(192,57,43,0.15)', borderWidth: 1, borderColor: Colors.red, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  statusTextCancelled:   { color: Colors.red, fontSize: 15, fontFamily: Typography.nunito700 },
  detailRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  detailLabel: { color: Colors.muted, fontSize: 13, fontFamily: Typography.nunito500 },
  detailValue: { color: Colors.text, fontSize: 13, fontFamily: Typography.nunito600, textAlign: 'right', flex: 1, marginLeft: 16 },
  dateText:    { color: Colors.muted, fontSize: 12, fontFamily: Typography.nunito400 },
  card:        { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 16, padding: 16, gap: 12 },
  cardTitle:   { fontFamily: Typography.playfair700, fontSize: 16, color: Colors.text, marginBottom: 4 },
  party:       { flexDirection: 'row', alignItems: 'center', gap: 12 },
  partyAvaWrap:{ position: 'relative' },
  partyAva:    { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.bg3, alignItems: 'center', justifyContent: 'center' },
  onlineDot:   { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: Colors.card },
  onlineLabel: { fontSize: 11, fontFamily: Typography.nunito700 },
  partyArrow:  { fontSize: 20, color: Colors.muted, marginLeft: 4 },
  partyName:   { fontFamily: Typography.nunito700, fontSize: 15, color: Colors.text },
  partyRole:   { fontSize: 12, color: Colors.gold, fontFamily: Typography.nunito600 },
  divider:     { height: 1, backgroundColor: Colors.border },
  row:         { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowLabel:    { fontSize: 13, color: Colors.muted, fontFamily: Typography.nunito400 },
  rowValue:    { fontSize: 13, color: Colors.text, fontFamily: Typography.nunito700 },
  noteCard:    { backgroundColor: Colors.bg3, borderRadius: 12, padding: 14 },
  msgRow:      { flexDirection: 'row', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  msgAva:      { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  msgHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  msgSender:   { fontFamily: Typography.nunito700, fontSize: 12 },
  msgTime:     { fontSize: 10, color: Colors.muted, fontFamily: Typography.nunito400 },
  msgText:     { fontSize: 13, color: Colors.text, lineHeight: 18, fontFamily: Typography.nunito400 },
  noteText:    { fontSize: 13, color: Colors.muted, lineHeight: 20, fontFamily: Typography.nunito400 },
  chatFooter:  { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.border },
  chatFooterText: { fontSize: 11, color: Colors.muted, fontFamily: Typography.nunito600 },
});

const s = StyleSheet.create({
  screen:      { flex: 1, backgroundColor: Colors.bg },
  header:      { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 8 },
  title:       { fontFamily: Typography.playfair700, fontSize: 22, color: Colors.text },
  subtitle:    { fontSize: 12, color: Colors.muted, fontFamily: Typography.nunito400, marginTop: 2 },
  list:        { padding: 14, gap: 10, paddingBottom: 20 },
  mainViewBtn:        { flex: 1, alignItems: 'center', paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  mainViewBtnActive:  { borderBottomColor: Colors.gold },
  mainViewText:       { color: Colors.muted, fontFamily: Typography.playfair700, fontSize: 20 },
  mainViewTextActive: { color: Colors.text },
  mainSwitcher:       { flexDirection: 'row', backgroundColor: Colors.bg3, borderRadius: 10, padding: 3 },
  mainSwitchBtn:      { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 8 },
  mainSwitchActive:   { backgroundColor: Colors.gold },
  mainSwitchText:     { color: Colors.muted, fontFamily: Typography.nunito600, fontSize: 13 },
  mainSwitchTextActive: { color: '#1a0e00', fontFamily: Typography.nunito700, fontSize: 13 },
  tabRow:        { flexDirection: 'row', marginHorizontal: 14, marginBottom: 8, borderRadius: 12, backgroundColor: Colors.bg3, padding: 4 },
  tab:           { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  tabActive:          { backgroundColor: Colors.gold },
  tabCancelledActive: { backgroundColor: Colors.red },
  tabCancelledText:   { color: '#fff', fontFamily: Typography.nunito700 },
  tabText:       { fontSize: 13, color: Colors.muted, fontFamily: Typography.nunito600 },
  tabTextActive: { color: '#1a0e00', fontFamily: Typography.nunito700 },
  empty:       { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyEmoji:  { fontSize: 52 },
  emptyTitle:  { fontFamily: Typography.playfair700, fontSize: 20, color: Colors.text },
  emptyDesc:   { fontSize: 13, color: Colors.muted, textAlign: 'center', lineHeight: 20, fontFamily: Typography.nunito400, paddingHorizontal: 20 },
  card:        { borderRadius: 16, padding: 14, marginBottom: 10 },
  cardUnread:  { borderWidth: 1, borderColor: Colors.gold, backgroundColor: 'rgba(212,160,60,0.08)' },
  cardRead:             { backgroundColor: 'rgba(255,255,255,0.03)' },
  cardCancelled:        { borderWidth: 1, borderColor: 'rgba(192,57,43,0.3)', backgroundColor: 'rgba(255,255,255,0.01)' },
  cardCancelledUnread:  { borderWidth: 1, borderColor: Colors.red, backgroundColor: 'rgba(192,57,43,0.08)' },
  cardLeft:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardAva:     { width: 46, height: 46, borderRadius: 14, backgroundColor: Colors.bg3, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border, position: 'relative' },
  unreadDot:   { position: 'absolute', top: -3, right: -3, width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.gold, borderWidth: 2, borderColor: Colors.bg },
  cardName:     { fontFamily: Typography.playfair700, fontSize: 15, marginBottom: 2 },
  cardNameUnread: { color: '#ffffff' },
  cardNameRead: { color: Colors.muted },
  cardRole:     { fontSize: 12, fontFamily: Typography.nunito600, marginBottom: 2 },
  cardRoleUnread:     { color: Colors.gold2 },
  cardRoleCancelled:  { color: Colors.red, fontSize: 12, fontFamily: Typography.nunito600, marginBottom: 2 },
  cardRoleRead: { color: Colors.muted },
  cardDate:     { fontSize: 11, color: Colors.muted, fontFamily: Typography.nunito400 },
  cardDateRead: { color: Colors.muted },
  cardRight:    { alignItems: 'center', gap: 6 },
  unreadCircle:           { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.green },
  unreadCircleCancelled:  { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.red },
  unreadDotCancelled:     { position: 'absolute', top: -3, right: -3, width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.red, borderWidth: 2, borderColor: Colors.bg },
  cardArrow:    { fontSize: 20, color: Colors.muted },
  msgsWrap:    { marginTop: 10, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10, gap: 6 },
  msgLine:     { flexDirection: 'row', alignItems: 'flex-start', gap: 4, flexWrap: 'wrap' },
  msgLineName: { fontSize: 12, color: Colors.gold, fontFamily: Typography.nunito700, flexShrink: 0 },
  msgLineText: { fontSize: 12, color: Colors.text, fontFamily: Typography.nunito400, flex: 1 },
  msgLineTime: { fontSize: 10, color: Colors.muted, fontFamily: Typography.nunito400, flexShrink: 0 },
});
