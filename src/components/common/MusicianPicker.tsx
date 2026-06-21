import React from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
} from 'react-native';
import { Colors } from '../../theme/colors';
import CloseButton from './CloseButton';
import BottomSheet from './BottomSheet';
import { Typography } from '../../theme/typography';

interface Musician {
  uid?: string;
  id?: string;
  name: string;
  emoji?: string;
  instrument?: string;
}

interface MusicianPickerProps {
  visible: boolean;
  onClose: () => void;
  musicians: Musician[];
  selectedMusicians: string[];
  onMusicianChange: (uids: string[]) => void;
}

export default function MusicianPicker({
  visible, onClose, musicians, selectedMusicians, onMusicianChange,
}: MusicianPickerProps) {
  const [search, setSearch] = React.useState('');

  React.useEffect(() => {
    if (!visible) setSearch('');
  }, [visible]);

  const filtered = musicians.filter(m =>
    search.length === 0 || m.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <BottomSheet visible={visible} onClose={onClose} maxHeight='85%'>
          <View style={{ flex: 1 }}>
            
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={{ color: Colors.text, fontFamily: Typography.playfair700, fontSize: 18 }}>Musiqiçi seç</Text>
              <CloseButton onPress={onClose} />
            </View>

            {/* Search */}
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bg3, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, marginBottom: 12, paddingRight: 8 }}>
              <TextInput
                style={{ flex: 1, padding: 10, color: Colors.text, fontSize: 13 }}
                placeholder="Axtar..."
                placeholderTextColor={Colors.muted}
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Text style={{ color: Colors.muted, fontSize: 18, paddingHorizontal: 4 }}>×</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* List */}
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ flex: 1 }}>
              {filtered.map(m => {
                const mid = m.uid ?? m.id ?? '';
                const sel = selectedMusicians.includes(mid);
                return (
                  <TouchableOpacity
                    key={mid}
                    onPress={() => {
                      const updated = sel
                        ? selectedMusicians.filter(x => x !== mid)
                        : [...selectedMusicians, mid];
                      onMusicianChange(updated);
                    }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border }}
                  >
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

            {/* Done button */}
            <TouchableOpacity
              style={{ marginTop: 12, paddingVertical: 12, borderRadius: 20, alignItems: 'center', backgroundColor: Colors.gold }}
              onPress={onClose}
            >
              <Text style={{ color: '#1a0e00', fontFamily: Typography.nunito700 }}>Hazır ({selectedMusicians.length})</Text>
            </TouchableOpacity>

          </View>
    </BottomSheet>
  );
}
