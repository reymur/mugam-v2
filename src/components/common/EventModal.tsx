import React from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal, Alert,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { Colors } from '../../theme/colors';
import LocationPicker from './LocationPicker';
import WheelTimePicker from './WheelTimePicker';
import MusicianPicker from './MusicianPicker';
import { Typography } from '../../theme/typography';

const EVENT_TYPES = ['Toy', 'Konsert', 'Bayram', 'Digər'];
const NOTES_OPTIONS = [
  'Qara kostyum və ağ köynək',
  'Qara köynək sərbəst',
  'Qalstuk',
  'Baboçka',
  'Yumru boğaz köynək sərbəst',
  'Digər...',
];
const MONTH_NAMES = ['Yanvar','Fevral','Mart','Aprel','May','İyun','İyul','Avqust','Sentyabr','Oktyabr','Noyabr','Dekabr'];


interface Musician {
  uid?: string;
  id?: string;
  name: string;
  emoji?: string;
  instrument?: string;
}

interface EventModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: { date: Date; type: string; location: string; notes: string; qeyd: string; musicians: string[] }) => Promise<void>;
  mode: 'full' | 'time-only';
  initialDate?: Date;
  initialType?: string;
  initialLocation?: string;
  initialNotes?: string;
  allMusicians?: Musician[];
  onMusicianChange?: (uids: string[]) => void;
  selectedMusicians?: string[];
  onRemoveMusician?: (uid: string) => void;
  onOpenProfile?: (m: Musician) => void;
  title?: string;
  existingEvents?: any[];
  onConflict?: (conflictEvent: any, pendingData: { date: Date; type: string; location: string; notes: string; qeyd: string; musicians: string[] }) => void;
  onBax?: (conflictEvent: any) => void;
}

export default function EventModal({
  visible, onClose, onSave, mode,
  initialDate, initialType, initialLocation, initialNotes, allMusicians = [],
  selectedMusicians = [], onMusicianChange, existingEvents = [], onConflict, onBax,
  onRemoveMusician, onOpenProfile,
  title,
}: EventModalProps) {
  const [eventType, setEventType] = React.useState('Toy');
  const [eventDate, setEventDate] = React.useState(initialDate ?? new Date());
  const [eventLocation, setEventLocation] = React.useState('');
  const [eventNotes, setEventNotes] = React.useState('');
  const [eventQeyd, setEventQeyd] = React.useState('');
  const [digerText, setDigerText] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [showLocationPicker, setShowLocationPicker] = React.useState(false);
  const [showMusicianPicker, setShowMusicianPicker] = React.useState(false);
  const [showConflictModal, setShowConflictModal] = React.useState(false);
  const [pendingData, setPendingData] = React.useState<{ date: Date; type: string; location: string; notes: string; qeyd: string; musicians: string[] } | null>(null);
  const [conflictEvent, setConflictEvent] = React.useState<any>(null);

  React.useEffect(() => {
    if (visible) {
      setEventDate(initialDate ?? new Date());
      setEventType(initialType ?? 'Toy');
      setEventLocation(initialLocation ?? '');
      const parts = (initialNotes ?? '').split(' | ');
      const mainNotes = parts[0] ?? '';
      const qeydPart = parts.slice(1).join(' | ');
      const standardOpts = NOTES_OPTIONS.slice(0, -1);
      const noteItems = mainNotes.split(', ').filter(Boolean);
      const standardItems = noteItems.filter(x => standardOpts.includes(x));
      const digerItem = noteItems.find(x => !standardOpts.includes(x)) ?? '';
      setEventNotes(mainNotes);
      setEventQeyd(qeydPart);
      setDigerText(digerItem);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  return (
    <>
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: Colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%', flex: 1 }}>

            {/* Fixed Header */}
            <View style={{ padding: 20, paddingBottom: 12 }}>
              <Text style={{ color: Colors.text, fontFamily: Typography.playfair700, fontSize: 18, marginBottom: 16, textAlign: 'center' }}>
                {title ?? 'Tədbir əlavə et'}
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {EVENT_TYPES.map(t => (
                  <TouchableOpacity
                    key={t}
                    style={{ flex: 1, paddingVertical: 8, borderRadius: 20, alignItems: 'center', backgroundColor: eventType === t ? Colors.gold : Colors.bg3, borderWidth: 1, borderColor: eventType === t ? Colors.gold : Colors.border }}
                    onPress={() => setEventType(t)}
                  >
                    <Text style={{ color: eventType === t ? '#1a0e00' : Colors.muted, fontFamily: Typography.nunito700, fontSize: 12 }}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={{ color: Colors.gold, fontFamily: Typography.nunito700, fontSize: 15, textAlign: 'center', marginTop: 12, marginLeft: -10 }}>
                {eventDate.getDate()} {MONTH_NAMES[eventDate.getMonth()]} {eventDate.getFullYear()}
              </Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ paddingHorizontal: 20 }}>
              <WheelTimePicker value={eventDate} onChange={setEventDate} mode={mode} />

              {mode === 'time-only' && (
                <>
                  <Text style={{ color: Colors.muted, fontSize: 12, fontFamily: Typography.nunito700, marginBottom: 8 }}>MUSİQİÇİLƏR</Text>
                  {selectedMusicians.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                      {selectedMusicians.map(mid => {
                        const m = allMusicians.find(x => (x.uid ?? x.id) === mid);
                        return (
                          <TouchableOpacity key={mid} onPress={() => { if (m && onOpenProfile) onOpenProfile(m); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.gold + '22', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: Colors.gold }}>
                            <Text style={{ fontSize: 16 }}>{m?.emoji ?? '👤'}</Text>
                            <View>
                              <Text style={{ color: Colors.gold, fontFamily: Typography.nunito700, fontSize: 12 }}>{m?.name ?? mid}</Text>
                              {m?.instrument ? <Text style={{ color: Colors.gold, fontSize: 10, opacity: 0.7 }}>{m.instrument}</Text> : null}
                            </View>
                            <TouchableOpacity onPress={() => onRemoveMusician?.(mid)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ marginLeft: 6, padding: 2 }}>
                              <Text style={{ color: Colors.red, fontSize: 16, fontFamily: Typography.nunito700 }}>×</Text>
                            </TouchableOpacity>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bg3, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, marginBottom: 8, padding: 12 }}
                    onPress={() => setShowMusicianPicker(true)}
                  >
                    <Text style={{ flex: 1, color: Colors.muted, fontSize: 13 }}>Musiqiçi seç...</Text>
                    <Text style={{ color: Colors.gold, fontSize: 16 }}>+</Text>
                  </TouchableOpacity>
                  <MusicianPicker
                    visible={showMusicianPicker}
                    onClose={() => setShowMusicianPicker(false)}
                    musicians={allMusicians ?? []}
                    selectedMusicians={selectedMusicians}
                    onMusicianChange={(uids) => { onMusicianChange?.(uids); }}
                  />

                </>
              )}

              <TouchableOpacity
                style={{ backgroundColor: Colors.bg3, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.border, marginBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                onPress={() => setShowLocationPicker(true)}
              >
                <Text style={{ color: eventLocation ? Colors.text : Colors.muted, fontSize: 14 }}>
                  {eventLocation || 'Məkan daxil edin...'}
                </Text>
                <Text style={{ color: Colors.gold, fontSize: 16 }}>📍</Text>
              </TouchableOpacity>
              <LocationPicker
                visible={showLocationPicker}
                onClose={() => setShowLocationPicker(false)}
                onSelect={(loc) => { setEventLocation(loc); setShowLocationPicker(false); }}
              />

              <Text style={{ color: Colors.muted, fontSize: 12, fontFamily: Typography.nunito700, marginBottom: 8 }}>ƏLAVƏLƏR (istəyə görə)</Text>
              <View style={{ gap: 6, marginBottom: 16 }}>
                {NOTES_OPTIONS.map((opt, i) => {
                  const isDiger = opt === 'Digər...';
                  const isSelected = isDiger
                    ? eventNotes.split(', ').some(x => !NOTES_OPTIONS.slice(0, -1).includes(x) && x.length > 0)
                    : eventNotes.split(', ').includes(opt);
                  return (
                    <View key={i}>
                      <TouchableOpacity
                        style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: isSelected ? Colors.gold : Colors.border, backgroundColor: isSelected ? 'rgba(212,160,60,0.1)' : Colors.bg3, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                        onPress={() => {
                          if (isDiger) {
                            setDigerText(prev => prev ? '' : ' ');
                            if (digerText) {
                              const current = eventNotes.split(', ').filter(x => NOTES_OPTIONS.slice(0, -1).includes(x));
                              setEventNotes(current.join(', '));
                              setDigerText('');
                            }
                          } else {
                            const current = eventNotes ? eventNotes.split(', ').filter(Boolean) : [];
                            const updated = isSelected ? current.filter(x => x !== opt) : [...current, opt];
                            setEventNotes(updated.join(', '));
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
                            const standard = eventNotes.split(', ').filter(x => NOTES_OPTIONS.slice(0, -1).includes(x));
                            setEventNotes([...standard, text].filter(Boolean).join(', '));
                          }}
                        />
                      )}
                    </View>
                  );
                })}
              </View>

              {mode === 'time-only' && (
                <TextInput
                  style={{ backgroundColor: Colors.bg3, borderRadius: 12, padding: 12, color: Colors.text, borderWidth: 1, borderColor: Colors.border, marginBottom: 20, minHeight: 60 }}
                  placeholder="Əlavə qeydlər..."
                  placeholderTextColor={Colors.muted}
                  value={eventQeyd}
                  onChangeText={setEventQeyd}
                  multiline
                />
              )}
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 10, padding: 20, paddingTop: 12 }}>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 14, borderRadius: 20, alignItems: 'center', backgroundColor: Colors.bg3, borderWidth: 1, borderColor: Colors.border }}
                onPress={onClose}
              >
                <Text style={{ color: Colors.muted, fontFamily: Typography.nunito700 }}>Ləğv et</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 14, borderRadius: 20, alignItems: 'center', backgroundColor: Colors.gold, opacity: saving ? 0.6 : 1 }}
                disabled={saving}
                onPress={async () => {
                  const data = { date: eventDate, type: eventType, location: eventLocation, notes: eventNotes, qeyd: eventQeyd, musicians: selectedMusicians };
                  const conflict = existingEvents.find(e => {
                    const eDate = new Date(e.date ?? e.eventDate);
                    const match = eDate.getFullYear() === eventDate.getFullYear() &&
                           eDate.getMonth() === eventDate.getMonth() &&
                           eDate.getDate() === eventDate.getDate();
                    return match;
                  });
                  if (conflict) {
                    console.log('SHOW CONFLICT MODAL');
                    setPendingData(data);
                    setConflictEvent(conflict);
                    setShowConflictModal(true);
                    return;
                  }
                  setSaving(true);
                  try {
                    await onSave(data);
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                {saving ? <ActivityIndicator color="#1a0e00" size="small" /> : <Text style={{ color: '#1a0e00', fontFamily: Typography.nunito700 }}>Saxla</Text>}
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </KeyboardAvoidingView>
      {showConflictModal && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 24, zIndex: 999 }}>
          <View style={{ backgroundColor: '#1c1710', borderRadius: 20, padding: 24, width: '100%', borderWidth: 1, borderColor: Colors.gold }}>
            <TouchableOpacity
              onPress={() => setShowConflictModal(false)}
              style={{ position: 'absolute', top: 12, right: 12 }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={{ color: Colors.muted, fontSize: 20 }}>✕</Text>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ color: Colors.text, fontFamily: Typography.playfair700, fontSize: 18 }}>
                  Bu tarixdə tədbir var
                </Text>
                {onConflict && (
                  <TouchableOpacity
                    onPress={() => { setShowConflictModal(false); onBax?.(conflictEvent); }}
                    style={{ backgroundColor: Colors.bg3, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: Colors.gold }}
                  >
                    <Text style={{ color: Colors.gold, fontFamily: Typography.nunito700, fontSize: 14 }}>Bax</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            <TouchableOpacity
              style={{ paddingVertical: 14, borderRadius: 16, alignItems: 'center', backgroundColor: Colors.gold, marginBottom: 10 }}
              onPress={async () => {
                setShowConflictModal(false);
                if (!pendingData) return;
                setSaving(true);
                try { await onSave(pendingData); } finally { setSaving(false); }
              }}
            >
              <Text style={{ color: '#1a0e00', fontFamily: Typography.nunito700 }}>Əvəz et</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ paddingVertical: 14, borderRadius: 16, alignItems: 'center', backgroundColor: Colors.bg3, borderWidth: 1, borderColor: Colors.border }}
              onPress={async () => {
                setShowConflictModal(false);
                if (!pendingData) return;
                setSaving(true);
                try { await onSave(pendingData); } finally { setSaving(false); }
              }}
            >
              <Text style={{ color: Colors.text, fontFamily: Typography.nunito700 }}>Yeni tədbir</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </Modal>

    </>
  );
}
