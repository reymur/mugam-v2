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
import EventCard from '../../components/common/EventCard';
import EventModal from '../../components/common/EventModal';
import ConflictModal from '../../components/common/ConflictModal';

const SCREEN_W = Dimensions.get('window').width;

// ── Agreement Detail Screen ───────────────────────────────
function AgreementDetail({ agreement, onClose }: { agreement: Agreement; onClose: () => void }) {
  const { user, musicians } = useAppStore();
  const agreements = useAppStore(s => s.agreements);
  const personalEvents = useAppStore(s => s.personalEvents);
  const eventsAsMusician = useAppStore(s => s.eventsAsMusician);
  const [chatMessages,    setChatMessages]    = React.useState<any[]>([]);
  const [loadingMsgs,    setLoadingMsgs]    = React.useState(false);
  const [selectedMusician, setSelectedMusician] = React.useState<any>(null);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const slideAnim = React.useRef(new Animated.Value(SCREEN_W)).current;

  // Check online status from musicians list
  const fromMusician = musicians.find(m => (m.uid ?? m.id) === agreement.ownerUid);
  const toMusician   = musicians.find(m => (m.uid ?? m.id) === agreement.partnerUid);
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
    const chatId = agreement.agreementChatId ?? agreement.chatId;
    if (!chatId) return;
    const load = async () => {
      setLoadingMsgs(true);
      console.log('Loading msgs started');
      try {
        const snap = await getDocs(query(
          collection(fbFirestore, COLLECTIONS.CHATS, chatId!, COLLECTIONS.MESSAGES),
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
          {agreement.ownerUid === user?.uid ? (
            <TouchableOpacity onPress={() => setShowEditModal(true)} hitSlop={{ top:10, bottom:10, left:10, right:10 }}>
              <Text style={{ color: Colors.gold, fontSize: 22, width: 40, textAlign: 'right' }}>✏️</Text>
            </TouchableOpacity>
          ) : <View style={{ width: 40 }} />}
        </View>

        <ScrollView contentContainerStyle={d.container}>
          {/* Status badge */}
          <View style={d.statusWrap}>
            <View style={[agreement.status === 'cancelled' ? d.statusBadgeCancelled : d.statusBadge]}>
              <Text style={[agreement.status === 'cancelled' ? d.statusTextCancelled : d.statusText]}>
                {agreement.status === 'cancelled'
                  ? agreement.cancelledBy === user?.uid
                    ? '✖ Siz imtina etdiniz'
                    : `✖ ${agreement.partnerName ?? ''} imtina etdi`
                  : '✅ Razılaşma qəbul edildi'}
              </Text>
            </View>
            <Text style={d.dateText}>{date}</Text>
          </View>

          {/* Event details */}
          {(agreement.date || agreement.type) && agreement.status !== 'cancelled' && (
            <View style={d.card}>
              <Text style={d.cardTitle}>📅 Tədbir məlumatı</Text>
              {agreement.type && (
                <View style={d.detailRow}>
                  <Text style={d.detailLabel}>Növ</Text>
                  <Text style={d.detailValue}>{agreement.type}</Text>
                </View>
              )}
              {agreement.date && (
                <View style={d.detailRow}>
                  <Text style={d.detailLabel}>Tarix</Text>
                  <Text style={d.detailValue}>
                    {new Date(agreement.date).toLocaleDateString('az-AZ', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </Text>
                </View>
              )}
              {agreement.date && (
                <View style={d.detailRow}>
                  <Text style={d.detailLabel}>Vaxt</Text>
                  <Text style={d.detailValue}>
                    {new Date(agreement.date).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              )}
              {agreement.location && (
                <View style={d.detailRow}>
                  <Text style={d.detailLabel}>📍 Yer</Text>
                  <Text style={d.detailValue}>{agreement.location}</Text>
                </View>
              )}
              {agreement.notes && (
                <View style={[d.detailRow, { borderBottomWidth: 0 }]}>
                  <Text style={d.detailLabel}>📝 Əlavələr</Text>
                  <Text style={d.detailValue}>{agreement.notes}</Text>
                </View>
              )}
            </View>
          )}

          {/* Parties — clickable to open profile */}
          <View style={d.card}>
            <Text style={d.cardTitle}>Tərəflər</Text>
            <TouchableOpacity
              style={[d.party, { backgroundColor: Colors.gold + '22', borderRadius: 14 }]}
              onPress={() => openMusician(agreement.ownerUid, user?.displayName ?? '')}
              activeOpacity={0.7}
            >
              <View style={d.partyAvaWrap}>
                <View style={d.partyAva}><Text style={{ fontSize: 22 }}>👤</Text></View>

              </View>
              <View style={{ flex: 1 }}>
                <Text style={[d.partyName, agreement.cancelledBy === agreement.ownerUid && { color: Colors.red, textDecorationLine: 'underline' }]}>{user?.displayName ?? ''}</Text>
                <Text style={[d.partyRole, agreement.cancelledBy === agreement.ownerUid && { color: Colors.red }]}>
                  {agreement.cancelledBy === agreement.ownerUid ? 'İmtina etdi' : 'Göndərən (Təklif edən)'}
                </Text>
              </View>

              <Text style={d.partyArrow}>›</Text>
            </TouchableOpacity>
            <View style={d.divider} />
            <TouchableOpacity
              style={d.party}
              onPress={() => openMusician(agreement.partnerUid, agreement.partnerName ?? '')}
              activeOpacity={0.7}
            >
              <View style={d.partyAvaWrap}>
                <View style={d.partyAva}><Text style={{ fontSize: 22 }}>👤</Text></View>

              </View>
              <View style={{ flex: 1 }}>
                <Text style={[d.partyName, agreement.cancelledBy === agreement.partnerUid && { color: Colors.red, textDecorationLine: 'underline' }]}>{agreement.partnerName ?? ''}</Text>
                <Text style={[d.partyRole, agreement.cancelledBy === agreement.partnerUid && { color: Colors.red }]}>
                  {agreement.cancelledBy === agreement.partnerUid ? 'İmtina etdi' : 'Qəbul edən'}
                </Text>
              </View>

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
              Bu müqavilə {user?.displayName ?? ''} və {agreement.partnerName ?? ''} arasında
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
      <EventModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        mode="full"
        existingEvents={[
          ...personalEvents,
        ]}
        title="Müqaviləni redaktə et"
        initialDate={agreement.date ? new Date(agreement.date) : new Date()}
        initialType={agreement.type}
        initialLocation={agreement.location}
        initialNotes={agreement.notes}
        allMusicians={[]}
        selectedMusicians={[]}
        onSave={async (data) => {
          await FireStore.updatePersonalEvent(agreement.id, {
            type: data.type,
            date: data.date.toISOString(),
            location: data.location,
            notes: [data.notes, data.qeyd].filter(Boolean).join(' | '),
          });
          setShowEditModal(false);
        }}
      />

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


// ── Personal Event Detail ─────────────────────────────────
function PersonalEventDetail({ event, onClose, onOpenProfile, onConflictTrigger, onBaxTrigger }: { event: any; onClose: () => void; onOpenProfile: (m: any) => void; onConflictTrigger?: (ce: any, pd: any) => void; onBaxTrigger?: (ce: any) => void }) {
  const { musicians, user } = useAppStore();
  const personalEvents = useAppStore(s => s.personalEvents);
  const eventsAsMusician = useAppStore(s => s.eventsAsMusician);
  const agreements = useAppStore(s => s.agreements);
  const slideAnim = React.useRef(new Animated.Value(SCREEN_W)).current;
  const monthNames = ['Yanvar','Fevral','Mart','Aprel','May','İyun','İyul','Avqust','Sentyabr','Oktyabr','Noyabr','Dekabr'];

  React.useEffect(() => {
    Animated.spring(slideAnim, { toValue: 0, damping: 26, stiffness: 300, useNativeDriver: true }).start();
  }, []);

  const handleClose = () => {
    Animated.timing(slideAnim, { toValue: SCREEN_W, duration: 220, useNativeDriver: true }).start(onClose);
  };

  const date = event.date ? new Date(event.date) : null;
  const dateStr = date ? `${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}` : '';
  const timeStr = date ? date.toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' }) : '';
  const isOwner = event.ownerUid === user?.uid;
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [editMusicians, setEditMusicians] = React.useState<string[]>(event.musicians ?? []);
  const [tedbirBaxEvent, setTedbirBaxEvent] = React.useState<any>(null);
  const owner = musicians.find(m => (m.uid ?? m.id) === event.ownerUid);
  const eventMusicians = (event.musicians ?? []).map((uid: string) => musicians.find(m => (m.uid ?? m.id) === uid)).filter(Boolean);

  return (
    <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: Colors.bg, zIndex: 200, transform: [{ translateX: slideAnim }] }]}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={d.header}>
          <TouchableOpacity style={d.backBtn} onPress={handleClose} hitSlop={{ top:10, bottom:10, left:10, right:10 }}>
            <Text style={d.backText}>←</Text>
          </TouchableOpacity>
          <Text style={d.headerTitle}>Tədbir</Text>
          {isOwner ? (
            <TouchableOpacity onPress={() => setShowEditModal(true)} hitSlop={{ top:10, bottom:10, left:10, right:10 }}>
              <Text style={{ color: Colors.gold, fontSize: 22, width: 40, textAlign: 'right' }}>✏️</Text>
            </TouchableOpacity>
          ) : <View style={{ width: 40 }} />}
        </View>

        <ScrollView contentContainerStyle={d.container}>
          {/* Status */}
          <View style={d.statusWrap}>
            {(() => {
              const initiator = isOwner
                ? { name: user?.displayName ?? 'Siz', emoji: user?.emoji ?? '👤', instrument: user?.instrument ?? 'Təklif edən' }
                : owner ? { name: owner.name, emoji: owner.emoji ?? '👤', instrument: owner.instrument ?? 'Təklif edən' } : null;
              return initiator ? (
                <TouchableOpacity onPress={() => { if (owner) onOpenProfile(owner); }} activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.gold + '22', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 }}>
                  <Text style={{ fontSize: 20 }}>{initiator.emoji}</Text>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ color: Colors.gold, fontFamily: Typography.playfair700, fontSize: 16 }}>{initiator.name}</Text>
                    <Text style={{ color: Colors.gold, fontSize: 11, opacity: 0.8 }}>{initiator.instrument}</Text>
                  </View>
                </TouchableOpacity>
              ) : null;
            })()}

          </View>

          {/* Details */}
          <View style={d.card}>
            <Text style={d.cardTitle}>Məlumat</Text>
            <View style={d.row}>
              <Text style={d.rowLabel}>Növ</Text>
              <Text style={d.rowValue}>{event.type}</Text>
            </View>
            {event.location ? (
              <View style={d.row}>
                <Text style={d.rowLabel}>Yer</Text>
                <Text style={d.rowValue}>{event.location}</Text>
              </View>
            ) : null}
            {dateStr ? (
              <View style={d.row}>
                <Text style={d.rowLabel}>Tarix</Text>
                <Text style={d.rowValue}>{dateStr}</Text>
              </View>
            ) : null}
            {timeStr ? (
              <View style={d.row}>
                <Text style={d.rowLabel}>Saat</Text>
                <Text style={d.rowValue}>{timeStr}</Text>
              </View>
            ) : null}
            {event.notes ? (
              <View style={[d.row, { borderBottomWidth: 0 }]}>
                <Text style={d.rowLabel}>Qeyd</Text>
                <Text style={[d.rowValue, { flex: 1, textAlign: 'right' }]}>{event.notes}</Text>
              </View>
            ) : null}
          </View>

          {/* Organizer */}
          {!isOwner && owner && (
            <View style={d.card}>
              <Text style={d.cardTitle}>Təşkilatçı</Text>
              <TouchableOpacity style={d.party} onPress={() => onOpenProfile(owner)} activeOpacity={0.7}>
                <View style={d.partyAva}>
                  <Text style={{ fontSize: 22 }}>{owner.emoji ?? '👤'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={d.partyName}>{owner.name}</Text>
                  <Text style={d.partyRole}>{owner.instrument}</Text>
                </View>
                <Text style={d.partyArrow}>›</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Musicians */}
          {eventMusicians.length > 0 && (
            <View style={d.card}>
              <Text style={d.cardTitle}>Musiqiçilər</Text>
              {eventMusicians.map((m: any, i: number) => (
                <View key={i}>
                  {i > 0 && <View style={d.divider} />}
                  <TouchableOpacity style={d.party} onPress={() => onOpenProfile(m)} activeOpacity={0.7}>
                    <View style={d.partyAva}>
                      <Text style={{ fontSize: 22 }}>{m.emoji ?? '👤'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={d.partyName}>{m.name}</Text>
                      <Text style={d.partyRole}>{m.instrument}</Text>
                    </View>
                    <Text style={d.partyArrow}>›</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      <EventModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        mode="time-only"
        existingEvents={[...personalEvents, ...eventsAsMusician]}
        onConflict={(ce, pd) => { onConflictTrigger?.(ce, pd); }}
        onBax={(ce) => { setShowEditModal(false); setTimeout(() => onBaxTrigger?.(ce), 300); }}
        title="Tədbiri redaktə et"
        initialDate={event.date ? new Date(event.date) : new Date()}
        initialType={event.type}
        initialLocation={event.location}
        initialNotes={event.notes}
        allMusicians={musicians.filter(m => (m.uid ?? m.id) !== user?.uid)}
        selectedMusicians={editMusicians}
        onMusicianChange={(uids) => setEditMusicians(uids)}
        onRemoveMusician={(uid) => setEditMusicians(prev => prev.filter(x => x !== uid))}
        onSave={async (data) => {
          await FireStore.updatePersonalEvent(event.id, {
            date: data.date.toISOString(),
            type: data.type,
            location: data.location,
            notes: [data.notes, data.qeyd].filter(Boolean).join(' | '),
            musicians: data.musicians,
          });
          setShowEditModal(false);
        }}
      />
    </Animated.View>
  );
}

// ── Calendar View ────────────────────────────────────────
function CalendarView({ agreements, onSelectAgreement, personalEvents, eventsAsMusician, onOpenProfile, showModalFromParent, onModalShown, onDayPress }: { agreements: any[]; onSelectAgreement: (ag: any) => void; personalEvents: any[]; eventsAsMusician: any[]; onOpenProfile: (m: any) => void; showModalFromParent?: boolean; onModalShown?: () => void; onDayPress?: (date: Date, events: any[]) => void }) {
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [selectedDay, setSelectedDay] = React.useState<number | null>(null);
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [newEventDate, setNewEventDate] = React.useState(new Date());
  const [selectedMusicians, setSelectedMusicians] = React.useState<string[]>([]);
  const [selectedPersonalEvent, setSelectedPersonalEvent] = React.useState<any>(null);
  const [profileMusician, setProfileMusician] = React.useState<any>(null);
  const lastTapRef = React.useRef<{ day: number; time: number } | null>(null);
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

  // Group all events by day (from personalEvents only)
  const eventDays: Record<number, any[]> = {};
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
              onPress={() => {
                const now = Date.now();
                const last = lastTapRef.current;
                if (last && last.day === day && now - last.time < 300) {
                  // Double tap — open modal
                  lastTapRef.current = null;
                  setSelectedDay(day);
                  setShowAddModal(true);
                } else {
                  // Single tap — select day
                  lastTapRef.current = { day, time: now };
                  setSelectedDay(isSelected ? null : day);
                  if (eventDays[day] && eventDays[day].length > 0 && onDayPress) {
                    onDayPress(new Date(year, month, day), eventDays[day]);
                  }
                }
              }}
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
              {hasEvent && !isSelected && (
                <View style={{ position: 'absolute', top: 2, right: 2, backgroundColor: Colors.gold, borderRadius: 8, minWidth: 14, height: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 }}>
                  <Text style={{ color: '#1a0e00', fontSize: 9, fontFamily: Typography.nunito700 }}>{eventDays[day].length}</Text>
                </View>
              )}
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
            // Render all events from personalEvents
            const personalCards = selectedEvents.map((e: any, pi: number) => {
              const isInvited = e.ownerUid !== user?.uid;
              const owner = isInvited ? musicians.find(m => (m.uid ?? m.id) === e.ownerUid) : null;
              const eDateTime = e.date ? new Date(e.date) : null;
              const timeStr = eDateTime ? eDateTime.toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' }) : '';
              const time = timeStr;
              return (
                <EventCard
                  key={'p' + pi}
                  type={e.type}
                  time={time}
                  location={e.location}
                  notes={e.notes}
                  badge={e.isAgree ? { label: '🤝', color: Colors.green, bg: 'rgba(39,174,96,0.15)' } : { label: '', color: Colors.green, bg: 'transparent' }}
                  initiator={isInvited ? (owner ?? undefined) : (user ? { name: user.displayName ?? '', emoji: user.emoji ?? '👤', instrument: user.instrument ?? '' } : undefined)}
                  musicians={(e.musicians ?? []).map((uid: string) => musicians.find((x: any) => (x.uid ?? x.id) === uid)).filter(Boolean)}
                  onPress={() => setSelectedPersonalEvent(e)}
                  onMusicianPress={(m) => { setSelectedPersonalEvent(null); setTimeout(() => setProfileMusician(m), 100); }}
                  currentUserUid={user?.uid ?? undefined}
                />
              );
            });

            return [...personalCards];
          })()}
        </View>
      )}
      {selectedDay && selectedEvents.length === 0 && (
        <View style={{ alignItems: 'center', marginTop: 20 }}>
          <Text style={{ color: Colors.muted }}>Bu gün üçün tədbir yoxdur</Text>
        </View>
      )}

      </ScrollView>
      {/* Musician Picker Modal */}


      {selectedPersonalEvent && (
        <PersonalEventDetail
          event={[...personalEvents, ...eventsAsMusician].find(e => e.id === selectedPersonalEvent.id) ?? selectedPersonalEvent}
          onClose={() => setSelectedPersonalEvent(null)}
          onOpenProfile={(m) => { onOpenProfile(m); }}
          onConflictTrigger={(ce, pd) => { setConflictEvent(ce); setConflictPending(pd); setConflictEventId(event?.id ?? null); setTimeout(() => setConflictVisible(true), 300); }}
          onBaxTrigger={(ce) => { setBaxDetail(ce); }}
        />
      )}
      {profileMusician && (
        <MusicianProfileScreen musician={profileMusician} onClose={() => setProfileMusician(null)} />
      )}
      <EventModal
        visible={showAddModal}
        mode="time-only"
        initialDate={newEventDate}
        existingEvents={[...personalEvents, ...eventsAsMusician]}
        allMusicians={musicians}
        selectedMusicians={selectedMusicians}
        onMusicianChange={(uids) => setSelectedMusicians(uids)}
        onRemoveMusician={(uid) => setSelectedMusicians(prev => prev.filter(x => x !== uid))}
        onOpenProfile={(m) => { setShowAddModal(false); onOpenProfile(m); }}
        onClose={() => { setShowAddModal(false); setSelectedMusicians([]); setNewEventDate(new Date(year, month, selectedDay ?? 1, 12, 0)); }}
        onSave={async ({ date, type, location, notes, qeyd, musicians: mList }) => {
          if (!user?.uid) return;
          try {
            await FireStore.addPersonalEvent(user.uid, {
              date: date.toISOString(),
              type,
              location,
              notes: [notes, qeyd].filter(Boolean).join(' | '),
              musicians: mList,
            });
            setShowAddModal(false);
            setSelectedMusicians([]);
            setNewEventDate(new Date(year, month, selectedDay ?? 1, 12, 0));
          } catch { Alert.alert('Xəta', 'Saxlamaq mümkün olmadı'); }
        }}
      />

    </View>
  );
}

// ── Agreement Card with messages ─────────────────────────
function AgreementCard({ ag, onPress, isUnread }: { ag: any; onPress: () => void; isUnread: boolean }) {
  const { user } = useAppStore();
  const isMine = ag.ownerUid === user?.uid;
  const otherName = ag.partnerName ?? '';
  const isCancelled = ag.status === 'cancelled';
  const cancelledByMe = ag.cancelledBy === user?.uid;
  const eventDate = ag.date ? new Date(ag.date) : null;
  const eventDateStr = eventDate
    ? eventDate.toLocaleDateString('az-AZ', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;
  const dateObj = ag.createdAt?.toDate ? ag.createdAt.toDate() : null;
  const date = dateObj
    ? dateObj.toLocaleDateString('az-AZ', { day: 'numeric', month: 'long', year: 'numeric' }) +
      ' ' + dateObj.toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })
    : '';
  const roleText = isCancelled
    ? cancelledByMe ? 'Siz imtina etdiniz' : `${otherName} imtina etdi`
    : isMine ? 'Siz göndərdiniz' : 'Sizə göndərildi';

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
              {'📅 ' + (ag.type ?? '') + ' — ' + eventDateStr + (ag.location ? ' · ' + ag.location : '')}
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

  const agreeEvents = personalEvents.filter((e: any) => e.isAgree === true);
  const outgoing  = agreeEvents.filter((e: any) => e.ownerUid === user?.uid && e.status !== 'cancelled');
  const incoming  = agreeEvents.filter((e: any) => e.ownerUid !== user?.uid && e.status !== 'cancelled');
  const cancelled = agreeEvents.filter((e: any) => e.status === 'cancelled');
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
    ? agreeEvents.find(a => a.partnerUid === autoOpenUid || a.ownerUid === autoOpenUid) ?? null
    : null;

  const [selected, setSelected] = useState<Agreement | null>(autoAgreement);
  const [mainView, setMainView] = useState<'agreements' | 'calendar' | 'tedbirler'>('calendar');
  const personalEvents = useAppStore(s => s.personalEvents);
  const eventsAsMusician = useAppStore(s => s.eventsAsMusician);
  const musicians = useAppStore(s => s.musicians);
  const [tedbirDetail, setTedbirDetail] = useState<any>(null);
  const [conflictVisible, setConflictVisible] = useState(false);
  const [conflictEvent, setConflictEvent] = useState<any>(null);
  const [conflictPending, setConflictPending] = useState<any>(null);
  const [conflictEventId, setConflictEventId] = useState<string | null>(null);
  const [baxDetail, setBaxDetail] = useState<any>(null);
  const [tedbirFilterDate, setTedbirFilterDate] = useState<Date | null>(null);
  const [tedbirTab, setTedbirTab] = useState<'hamisi' | 'sexsi' | 'dəvətli'>('hamisi');
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
            <View style={{ position: 'relative' }}>
              <Text style={[s.mainViewText, mainView === 'agreements' && s.mainViewTextActive]} numberOfLines={1} ellipsizeMode="tail">📋 Müqavilələr</Text>
              {agreeEvents.length > 0 && (() => {
                const unreadCount = agreeEvents.filter(a => !readAgreementIds.includes(a.id)).length;
                const count = unreadCount > 0 ? unreadCount : agreeEvents.length;
                const bg = unreadCount > 0 ? '#ff3b30' : Colors.gold;
                const textColor = unreadCount > 0 ? '#fff' : '#1a0e00';
                return (
                  <View style={{ position: 'absolute', top: -6, left: 10, backgroundColor: bg, borderRadius: 10, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }}>
                    <Text style={{ color: textColor, fontSize: 10, fontFamily: Typography.nunito700 }}>{count}</Text>
                  </View>
                );
              })()}
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.mainViewBtn, mainView === 'calendar' && s.mainViewBtnActive]}
            onPress={() => setMainView('calendar')}
          >
            <Text style={[s.mainViewText, mainView === 'calendar' && s.mainViewTextActive]}>📅 Təqvim</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.mainViewBtn, mainView === 'tedbirler' && s.mainViewBtnActive]}
            onPress={() => setMainView('tedbirler')}
          >
            <Text style={[s.mainViewText, mainView === 'tedbirler' && s.mainViewTextActive]}>🎪 Tədbirlər</Text>
          </TouchableOpacity>
        </View>
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

      {mainView === 'tedbirler' && (
        <>
          <View style={{ flexDirection: 'row', marginHorizontal: 14, marginBottom: 8, borderRadius: 12, backgroundColor: Colors.bg3, padding: 4 }}>
            {(['hamisi', 'sexsi', 'dəvətli'] as const).map(tab => (
              <TouchableOpacity key={tab} onPress={() => setTedbirTab(tab)} style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10, backgroundColor: tedbirTab === tab ? Colors.gold : 'transparent' }}>
                <Text style={{ fontSize: 13, fontFamily: Typography.nunito600, color: tedbirTab === tab ? '#1a0e00' : Colors.muted }}>
                  {tab === 'hamisi' ? 'Hamısı' : tab === 'sexsi' ? 'Şəxsi' : 'Dəvətli'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {tedbirFilterDate && (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 14, marginTop: 4, marginBottom: 4, backgroundColor: Colors.gold + '22', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: Colors.gold }}>
              <Text style={{ color: Colors.gold, fontFamily: Typography.nunito700, fontSize: 13 }}>
                {'📅 ' + tedbirFilterDate.getDate() + ' ' + ['Yanvar','Fevral','Mart','Aprel','May','İyun','İyul','Avqust','Sentyabr','Oktyabr','Noyabr','Dekabr'][tedbirFilterDate.getMonth()] + ' ' + tedbirFilterDate.getFullYear()}
              </Text>
              <TouchableOpacity onPress={() => setTedbirFilterDate(null)} hitSlop={{ top:10, bottom:10, left:10, right:10 }}>
                <Text style={{ color: Colors.gold, fontSize: 18 }}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
          <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} showsVerticalScrollIndicator={false}>
          {[
              ...(tedbirTab === 'dəvətli' ? [] : personalEvents.filter((e: any) => e.ownerUid === user?.uid).map(e => ({ ...e, _type: 'personal' }))),
              ...(tedbirTab === 'sexsi' ? [] : personalEvents.filter((e: any) => e.ownerUid !== user?.uid).map(e => ({ ...e, _isInvited: true, _type: 'personal' }))),
            ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .filter(e => {
              if (!tedbirFilterDate) return true;
              const eDate = new Date(e.date);
              const match = eDate.getFullYear() === tedbirFilterDate.getFullYear() &&
                     eDate.getMonth() === tedbirFilterDate.getMonth() &&
                     eDate.getDate() === tedbirFilterDate.getDate();
              return match;
            })
            .map((e, i) => {
              const eDateTime = e.date ? new Date(e.date) : null;
              const timeStr2 = eDateTime ? eDateTime.toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' }) : '';
              const dateStr2 = eDateTime ? eDateTime.getDate() + ' ' + ['Yan','Fev','Mar','Apr','May','İyn','İyl','Avq','Sen','Okt','Noy','Dek'][eDateTime.getMonth()] : '';
              const time = tedbirFilterDate ? timeStr2 : (dateStr2 + ' ' + timeStr2).trim();
              if (e._type === 'agreement') {
                const initiator = musicians.find((m: any) => (m.uid ?? m.id) === e.ownerUid) ?? { name: e.partnerName ?? '', emoji: '👑', instrument: '' };
                const toMusician = musicians.find((m: any) => (m.uid ?? m.id) === e.partnerUid);
                return (
                  <EventCard
                    key={e.id ?? i}
                    type={e.type}
                    time={time}
                    location={e.location}
                    notes={e.notes}
                    badge={{ label: '🤝', color: Colors.green, bg: 'rgba(39,174,96,0.15)' }}
                    initiator={initiator}
                    musicians={toMusician ? [toMusician] : []}
                    onPress={() => setSelected(e)}
                    currentUserUid={user?.uid}
                  />
                );
              }
              const isInvited = e._isInvited;
              const owner = musicians.find((m: any) => (m.uid ?? m.id) === e.ownerUid);
              const currentUser = user ? { name: user.displayName ?? '', emoji: user.emoji ?? '👤', instrument: user.instrument ?? '' } : undefined;
              return (
                <EventCard
                  key={e.id ?? i}
                  type={e.type}
                  time={time}
                  location={e.location}
                  notes={e.notes}
                  badge={{ label: '', color: Colors.green, bg: 'transparent' }}
                  initiator={isInvited ? (owner ?? undefined) : currentUser}
                  musicians={(e.musicians ?? []).map((uid: string) => musicians.find((m: any) => (m.uid ?? m.id) === uid)).filter(Boolean)}
                  onPress={() => setTedbirDetail(e)}
                  onMusicianPress={(m: any) => setCalendarProfileMusician(m)}
                  currentUserUid={user?.uid}
                />
              );
            })}
          {personalEvents.length === 0 && eventsAsMusician.length === 0 && (
            <Text style={{ color: Colors.muted, textAlign: 'center', marginTop: 40 }}>Heç bir tədbir yoxdur</Text>
          )}
        </ScrollView>
        </>
      )}

      {mainView === 'calendar' && (
        <CalendarView key="calendar-view" agreements={[]} onSelectAgreement={(ag) => setSelected(ag)} personalEvents={personalEvents} eventsAsMusician={eventsAsMusician} onOpenProfile={(m) => setCalendarProfileMusician(m)} showModalFromParent={calendarShowModal} onModalShown={() => setCalendarShowModal(false)} onDayPress={(date, events) => {
              const uid = user?.uid;
              const hasSexsi = events.some((e: any) => e.ownerUid === uid);
              const hasDavetli = events.some((e: any) => e.ownerUid !== uid);
              const tab = hasSexsi && hasDavetli ? 'hamisi' : hasSexsi ? 'sexsi' : 'dəvətli';
              setTedbirFilterDate(date);
              setTedbirTab(tab as any);
              setMainView('tedbirler');
            }} />
      )}

      {mainView === 'agreements' && <ScrollView
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
      >
        {agreeEvents.length === 0 ? (
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

      {tedbirDetail && (
        <PersonalEventDetail
          event={[...personalEvents, ...eventsAsMusician].find(e => e.id === tedbirDetail.id) ?? tedbirDetail}
          onClose={() => setTedbirDetail(null)}
          onOpenProfile={(m) => { setCalendarProfileMusician(m); }}
          onConflictTrigger={(ce, pd) => { setConflictEvent(ce); setConflictPending(pd); setConflictEventId(tedbirDetail?.id ?? null); setTimeout(() => setConflictVisible(true), 300); }}
          onBaxTrigger={(ce) => { setBaxDetail(ce); }}
        />
      )}
      {calendarProfileMusician && (
        <MusicianProfileScreen musician={calendarProfileMusician} onClose={() => { setCalendarProfileMusician(null); }} />
      )}
      {selected && (
        <AgreementDetail
          agreement={agreeEvents.find(a => a.id === selected.id) ?? selected}
          onClose={() => setSelected(null)}
        />
      )}
      <ConflictModal
        visible={conflictVisible}
        conflictEvent={conflictEvent}
        pendingData={conflictPending}
        onClose={() => setConflictVisible(false)}
        onBax={(_ce) => { setConflictVisible(false); }}
        onEvezEt={async (pd) => {
          if (conflictEventId) {
            await FireStore.updatePersonalEvent(conflictEventId, {
              date: pd.date.toISOString(),
              type: pd.type,
              location: pd.location,
              notes: [pd.notes, pd.qeyd].filter(Boolean).join(' | '),
              musicians: pd.musicians,
            });
          }
          setConflictVisible(false);
        }}
        onYeniTedbir={(_pd, _ce) => {
          setConflictVisible(false);
        }}
      />
      {baxDetail && (
        <PersonalEventDetail
          event={baxDetail}
          onClose={() => setBaxDetail(null)}
          onOpenProfile={(m) => { setBaxDetail(null); setCalendarProfileMusician(m); }}
        />
      )}
    </SafeAreaView>
  );
}

const d = StyleSheet.create({
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 0, borderBottomWidth: 1, borderBottomColor: Colors.border },
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
  mainViewText:       { color: Colors.muted, fontFamily: Typography.playfair700, fontSize: 16 },
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
