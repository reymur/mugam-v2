import React from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { Colors } from '../../theme/colors';
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

function CustomDatePicker({ value, onChange, mode }: { value: Date; onChange: (d: Date) => void; mode: 'full' | 'time-only' }) {
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const years = Array.from({ length: 10 }, (_, i) => String(new Date().getFullYear() + i));

  return (
    <View style={{ marginBottom: 8 }}>
      <View style={{ borderRadius: 16, overflow: 'hidden', backgroundColor: '#161210', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}>
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
        {mode === 'full' ? (
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8 }}>
            <WheelCol flex={1} items={days} selectedIndex={value.getDate() - 1} onSelect={i => { const d = new Date(value); d.setDate(i + 1); onChange(d); }} />
            <WheelCol flex={2} items={MONTH_NAMES} selectedIndex={value.getMonth()} onSelect={i => { const d = new Date(value); d.setMonth(i); onChange(d); }} />
            <WheelCol flex={2} items={years} selectedIndex={Math.max(0, value.getFullYear() - new Date().getFullYear())} onSelect={i => { const d = new Date(value); d.setFullYear(new Date().getFullYear() + i); onChange(d); }} />
            <Text style={{ color: Colors.gold, fontSize: 28, fontFamily: Typography.nunito700, paddingBottom: 4, paddingHorizontal: 8 }}>·</Text>
            <WheelCol flex={1} items={hours} selectedIndex={value.getHours()} onSelect={i => { const d = new Date(value); d.setHours(i); onChange(d); }} />
            <Text style={{ color: Colors.gold, fontSize: 28, fontFamily: Typography.nunito700, paddingBottom: 4, paddingHorizontal: 4 }}>:</Text>
            <WheelCol flex={1} items={minutes} selectedIndex={value.getMinutes()} onSelect={i => { const d = new Date(value); d.setMinutes(i); onChange(d); }} />
          </View>
        ) : (
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 100 }}>
            <WheelCol flex={1} items={hours} selectedIndex={value.getHours()} onSelect={i => { const d = new Date(value); d.setHours(i); onChange(d); }} />
            <Text style={{ color: Colors.gold, fontSize: 28, fontFamily: Typography.nunito700, paddingBottom: 4, paddingHorizontal: 8 }}>:</Text>
            <WheelCol flex={1} items={minutes} selectedIndex={value.getMinutes()} onSelect={i => { const d = new Date(value); d.setMinutes(i); onChange(d); }} />
          </View>
        )}
      </View>
    </View>
  );
}

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
  allMusicians?: Musician[];
  onOpenMusicianPicker?: () => void;
  selectedMusicians?: string[];
  onRemoveMusician?: (uid: string) => void;
  onOpenProfile?: (m: Musician) => void;
  title?: string;
}

export default function EventModal({
  visible, onClose, onSave, mode,
  initialDate, allMusicians = [],
  onOpenMusicianPicker, selectedMusicians = [],
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

  React.useEffect(() => {
    if (visible) {
      setEventDate(initialDate ?? new Date());
      setEventType('Toy');
      setEventLocation('');
      setEventNotes('');
      setEventQeyd('');
      setDigerText('');
    }
  }, [visible, initialDate]);

  return (
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
              <Text style={{ color: Colors.gold, fontFamily: Typography.nunito700, fontSize: 15, textAlign: 'center', marginTop: 12 }}>
                {eventDate.getDate()} {MONTH_NAMES[eventDate.getMonth()]} {eventDate.getFullYear()}
              </Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ paddingHorizontal: 20 }}>
              <CustomDatePicker value={eventDate} onChange={setEventDate} mode={mode} />

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
                    style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bg3, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, marginBottom: 16, padding: 12 }}
                    onPress={onOpenMusicianPicker}
                  >
                    <Text style={{ flex: 1, color: Colors.muted, fontSize: 13 }}>Musiqiçi seç...</Text>
                    <Text style={{ color: Colors.gold, fontSize: 16 }}>+</Text>
                  </TouchableOpacity>
                </>
              )}

              <TextInput
                style={{ backgroundColor: Colors.bg3, borderRadius: 12, padding: 12, color: Colors.text, borderWidth: 1, borderColor: Colors.border, marginBottom: 16 }}
                placeholder="Məkan daxil edin..."
                placeholderTextColor={Colors.muted}
                value={eventLocation}
                onChangeText={setEventLocation}
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
                  setSaving(true);
                  try {
                    await onSave({ date: eventDate, type: eventType, location: eventLocation, notes: eventNotes, qeyd: eventQeyd, musicians: selectedMusicians });
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
    </Modal>
  );
}
