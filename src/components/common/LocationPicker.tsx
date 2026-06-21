import React from 'react';
import {
  View, Text, TouchableOpacity, Modal, TextInput,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Colors } from '../../theme/colors';
import CloseButton from './CloseButton';
import { Typography } from '../../theme/typography';
import { AZERBAIJAN_LOCATIONS } from '../../data/locations';

const GOOGLE_API_KEY = 'AIzaSyDFGOC39rQDKRZR2xZ9wR54x2VXWX3AERk';

interface LocationPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (location: string) => void;
}

export default function LocationPicker({ visible, onClose, onSelect }: LocationPickerProps) {
  const [step, setStep] = React.useState<'city' | 'district' | 'place'>('city');
  const [selectedCity, setSelectedCity] = React.useState<any>(null);
  const [selectedDistrict, setSelectedDistrict] = React.useState<any>(null);
  const [search, setSearch] = React.useState('');
  const [places, setPlaces] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!visible) {
      setStep('city');
      setSelectedCity(null);
      setSelectedDistrict(null);
      setSearch('');
      setPlaces([]);
    }
  }, [visible]);

  const searchPlaces = async (query: string) => {
    if (!query.trim() || !selectedDistrict) return;
    setLoading(true);
    try {
      const location = `${selectedDistrict.name}, ${selectedCity.name}, Azərbaycan`;
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query + ' ' + location)}&key=${GOOGLE_API_KEY}&language=az`;
      const res = await fetch(url);
      const data = await res.json();
      setPlaces(data.results ?? []);
    } catch {
      setPlaces([]);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (search.length > 1) searchPlaces(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const renderHeader = () => (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
      {step !== 'city' && (
        <TouchableOpacity onPress={() => {
          if (step === 'district') setStep('city');
          if (step === 'place') setStep('district');
        }} style={{ marginRight: 12 }}>
          <Text style={{ color: Colors.gold, fontSize: 22 }}>←</Text>
        </TouchableOpacity>
      )}
      <Text style={{ color: Colors.text, fontFamily: Typography.playfair700, fontSize: 18, flex: 1 }}>
        {step === 'city' ? 'Şəhər seç' : step === 'district' ? selectedCity?.name : selectedDistrict?.name}
      </Text>
      <CloseButton onPress={onClose} />
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: Colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' }}>
            {renderHeader()}

            {/* Breadcrumb */}
            {step !== 'city' && (
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
                <TouchableOpacity onPress={() => setStep('city')}>
                  <Text style={{ color: Colors.gold, fontSize: 12 }}>{selectedCity?.name}</Text>
                </TouchableOpacity>
                {step === 'place' && (
                  <>
                    <Text style={{ color: Colors.muted, fontSize: 12 }}>›</Text>
                    <TouchableOpacity onPress={() => setStep('district')}>
                      <Text style={{ color: Colors.gold, fontSize: 12 }}>{selectedDistrict?.name}</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}

            {/* City step */}
            {step === 'city' && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {AZERBAIJAN_LOCATIONS.map(city => (
                  <TouchableOpacity
                    key={city.id}
                    style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                    onPress={() => { setSelectedCity(city); setStep('district'); }}
                  >
                    <Text style={{ color: Colors.text, fontFamily: Typography.nunito600, fontSize: 15 }}>📍 {city.name}</Text>
                    <Text style={{ color: Colors.muted }}>›</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* District step */}
            {step === 'district' && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {selectedCity?.districts.map((d: any) => (
                  <TouchableOpacity
                    key={d.id}
                    style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                    onPress={() => { setSelectedDistrict(d); setStep('place'); }}
                  >
                    <Text style={{ color: Colors.text, fontFamily: Typography.nunito600, fontSize: 15 }}>🏘 {d.name}</Text>
                    <Text style={{ color: Colors.muted }}>›</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Place search step */}
            {step === 'place' && (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bg3, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, marginBottom: 12, paddingRight: 8 }}>
                  <TextInput
                    style={{ flex: 1, padding: 12, color: Colors.text, fontSize: 14 }}
                    placeholder="Restoran axtar..."
                    placeholderTextColor={Colors.muted}
                    value={search}
                    onChangeText={setSearch}
                    autoFocus
                  />
                  {search.length > 0 && (
                    <TouchableOpacity onPress={() => { setSearch(''); setPlaces([]); }}>
                      <Text style={{ color: Colors.muted, fontSize: 18 }}>×</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {loading && <ActivityIndicator color={Colors.gold} style={{ marginTop: 20 }} />}

                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  {/* Manuel giriş */}
                  {search.length > 0 && (
                    <TouchableOpacity
                      style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border, flexDirection: 'row', alignItems: 'center', gap: 10 }}
                      onPress={() => { onSelect(`${search}, ${selectedDistrict?.name}, ${selectedCity?.name}`); onClose(); }}
                    >
                      <Text style={{ fontSize: 18 }}>✍️</Text>
                      <View>
                        <Text style={{ color: Colors.gold, fontFamily: Typography.nunito600, fontSize: 14 }}>"{search}" — əl ilə daxil et</Text>
                        <Text style={{ color: Colors.muted, fontSize: 11 }}>{selectedDistrict?.name}, {selectedCity?.name}</Text>
                      </View>
                    </TouchableOpacity>
                  )}

                  {places.map((place, i) => (
                    <TouchableOpacity
                      key={i}
                      style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border, flexDirection: 'row', alignItems: 'center', gap: 10 }}
                      onPress={() => { onSelect(place.name + ', ' + (place.formatted_address ?? '')); onClose(); }}
                    >
                      <Text style={{ fontSize: 18 }}>🍽</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: Colors.text, fontFamily: Typography.nunito600, fontSize: 14 }}>{place.name}</Text>
                        <Text style={{ color: Colors.muted, fontSize: 11 }} numberOfLines={1}>{place.formatted_address}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}

                  {!loading && search.length > 1 && places.length === 0 && (
                    <Text style={{ color: Colors.muted, textAlign: 'center', marginTop: 20 }}>Nəticə tapılmadı</Text>
                  )}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
