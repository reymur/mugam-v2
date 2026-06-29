import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import BottomSheet from '../modals/BottomSheet';

interface AttachMenuProps {
  visible:        boolean;
  onClose:        () => void;
  onDismiss:      () => void;
  onOpenGallery?: () => void;
  onOpenCamera?:  () => void;
}

export default function AttachMenu({
  visible, onClose, onDismiss, onOpenGallery, onOpenCamera,
}: AttachMenuProps) {
  const ATTACH_ITEMS = [
    { icon: '🖼',  label: 'Foto',    color: '#1565C0', onPress: () => { onClose(); onOpenGallery?.(); } },
    { icon: '📷',  label: 'Kamera',  color: '#424242', onPress: () => { onClose(); onOpenCamera?.(); } },
    { icon: '📍',  label: 'Məkan',   color: '#00695C', onPress: () => { onClose(); Alert.alert('', 'Tezliklə'); } },
    { icon: '👤',  label: 'Kontakt', color: '#4A148C', onPress: () => { onClose(); Alert.alert('', 'Tezliklə'); } },
    { icon: '📄',  label: 'Sənəd',   color: '#E65100', onPress: () => { onClose(); Alert.alert('', 'Tezliklə'); } },
    { icon: '📊',  label: 'Sorğu',   color: '#F9A825', onPress: () => { onClose(); Alert.alert('', 'Tezliklə'); } },
  ];

  return (
    <BottomSheet visible={visible} onClose={onClose} onDismiss={onDismiss}>
      <View style={s.menuGrid}>
        {ATTACH_ITEMS.map((item) => (
          <TouchableOpacity key={item.label} style={s.menuItem} onPress={item.onPress}>
            <View style={[s.menuIconBox, { backgroundColor: item.color }]}>
              <Text style={s.menuIcon}>{item.icon}</Text>
            </View>
            <Text style={s.menuLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </BottomSheet>
  );
}

const s = StyleSheet.create({
  menuGrid:    { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', paddingBottom: 16 },
  menuItem:    { width: '25%', alignItems: 'center', gap: 8, marginBottom: 20 },
  menuIconBox: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  menuIcon:    { fontSize: 26 },
  menuLabel:   { fontSize: 12, color: Colors.text, fontFamily: Typography.nunito400, textAlign: 'center' },
});
