import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  Modal, FlatList, StyleSheet, SafeAreaView,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';

interface Country {
  code: string;
  flag: string;
  dial: string;
  name: string;
}

const COUNTRIES: Country[] = [
  { code: 'AZ', flag: '🇦🇿', dial: '+994', name: 'Azərbaycan' },
  { code: 'RU', flag: '🇷🇺', dial: '+7',   name: 'Rusiya' },
  { code: 'TR', flag: '🇹🇷', dial: '+90',  name: 'Türkiyə' },
  { code: 'UA', flag: '🇺🇦', dial: '+380', name: 'Ukrayna' },
  { code: 'GE', flag: '🇬🇪', dial: '+995', name: 'Gürcüstan' },
  { code: 'AM', flag: '🇦🇲', dial: '+374', name: 'Ermənistan' },
  { code: 'KZ', flag: '🇰🇿', dial: '+7',   name: 'Qazaxıstan' },
  { code: 'DE', flag: '🇩🇪', dial: '+49',  name: 'Almaniya' },
  { code: 'US', flag: '🇺🇸', dial: '+1',   name: 'ABŞ' },
  { code: 'GB', flag: '🇬🇧', dial: '+44',  name: 'Böyük Britaniya' },
  { code: 'FR', flag: '🇫🇷', dial: '+33',  name: 'Fransa' },
  { code: 'IT', flag: '🇮🇹', dial: '+39',  name: 'İtaliya' },
  { code: 'SA', flag: '🇸🇦', dial: '+966', name: 'Səudiyyə Ərəbistanı' },
  { code: 'AE', flag: '🇦🇪', dial: '+971', name: 'BAƏ' },
];

interface PhoneInputProps {
  value:       string;
  onChange:    (phone: string) => void;
  placeholder?: string;
}

export default function PhoneInput({ value, onChange, placeholder }: PhoneInputProps) {
  const [country,     setCountry]     = useState<Country>(COUNTRIES[0]);
  const [showPicker,  setShowPicker]  = useState(false);
  const [localNumber, setLocalNumber] = useState('');

  const handleNumberChange = (num: string) => {
    setLocalNumber(num);
    onChange(`${country.dial}${num}`);
  };

  const handleCountrySelect = (c: Country) => {
    setCountry(c);
    setShowPicker(false);
    onChange(`${c.dial}${localNumber}`);
  };

  return (
    <View style={s.wrap}>
      <TouchableOpacity style={s.countryBtn} onPress={() => setShowPicker(true)}>
        <Text style={s.flag}>{country.flag}</Text>
        <Text style={s.dial}>{country.dial}</Text>
        <Text style={s.arrow}>▼</Text>
      </TouchableOpacity>
      <TextInput
        style={s.input}
        value={localNumber}
        onChangeText={handleNumberChange}
        placeholder={placeholder ?? '50 123 45 67'}
        placeholderTextColor={Colors.muted}
        keyboardType="phone-pad"
      />

      <Modal visible={showPicker} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Ölkə seçin</Text>
            <TouchableOpacity onPress={() => setShowPicker(false)}>
              <Text style={s.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={COUNTRIES}
            keyExtractor={c => c.code}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[s.countryItem, country.code === item.code && s.countryItemSel]}
                onPress={() => handleCountrySelect(item)}
              >
                <Text style={s.itemFlag}>{item.flag}</Text>
                <Text style={s.itemName}>{item.name}</Text>
                <Text style={s.itemDial}>{item.dial}</Text>
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  wrap:          { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bg3, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, marginBottom: 10, overflow: 'hidden' },
  countryBtn:    { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 12, borderRightWidth: 1, borderRightColor: Colors.border },
  flag:          { fontSize: 20 },
  dial:          { fontSize: 14, color: Colors.text, fontFamily: Typography.nunito600 },
  arrow:         { fontSize: 10, color: Colors.muted },
  input:         { flex: 1, paddingHorizontal: 12, paddingVertical: 12, color: Colors.text, fontFamily: Typography.nunito400, fontSize: 14 },
  modal:         { flex: 1, backgroundColor: Colors.bg },
  modalHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle:    { fontSize: 16, color: Colors.text, fontFamily: Typography.playfair700 },
  modalClose:    { fontSize: 18, color: Colors.muted },
  countryItem:   { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  countryItemSel:{ backgroundColor: Colors.goldDim },
  itemFlag:      { fontSize: 24 },
  itemName:      { flex: 1, fontSize: 14, color: Colors.text, fontFamily: Typography.nunito500 },
  itemDial:      { fontSize: 14, color: Colors.muted, fontFamily: Typography.nunito400 },
});
