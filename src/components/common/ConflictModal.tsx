import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';

interface ConflictModalProps {
  visible: boolean;
  conflictEvent: any;
  pendingData: any;
  onClose: () => void;
  onBax: (event: any) => void;
  onEvezEt: (pendingData: any) => void;
  onYeniTedbir: (pendingData: any, conflictEvent: any) => void;
}

export default function ConflictModal({
  visible, conflictEvent, pendingData,
  onClose, onBax, onEvezEt, onYeniTedbir,
}: ConflictModalProps) {
  if (!conflictEvent) return null;

  const type = conflictEvent.type ?? conflictEvent.eventType ?? '';
  const location = conflictEvent.location ?? conflictEvent.eventLocation ?? '';
  const time = conflictEvent.date ?? conflictEvent.eventDate
    ? new Date(conflictEvent.date ?? conflictEvent.eventDate).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 24, zIndex: 9999 }}>
        <View style={{ backgroundColor: Colors.bg, borderRadius: 20, padding: 24, width: '100%' }}>

          {/* Close button */}
          <TouchableOpacity
            onPress={onClose}
            style={{ position: 'absolute', top: 12, right: 12 }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={{ color: Colors.muted, fontSize: 20 }}>✕</Text>
          </TouchableOpacity>

          {/* Title */}
          <Text style={{ color: Colors.text, fontFamily: Typography.playfair700, fontSize: 18, marginBottom: 6, textAlign: 'center' }}>
            Bu tarixdə tədbir var
          </Text>

          {/* Conflict info + Bax button */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20, backgroundColor: Colors.bg3, borderRadius: 12, padding: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: Colors.gold, fontFamily: Typography.nunito700, fontSize: 14 }}>{type}</Text>
              {location ? <Text style={{ color: Colors.muted, fontSize: 12 }}>{'📍 ' + location}</Text> : null}
              {time ? <Text style={{ color: Colors.muted, fontSize: 12 }}>{'🕐 ' + time}</Text> : null}
            </View>
            <TouchableOpacity
              onPress={() => onBax(conflictEvent)}
              style={{ backgroundColor: Colors.gold + '22', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: Colors.gold }}
            >
              <Text style={{ color: Colors.gold, fontFamily: Typography.nunito700, fontSize: 13 }}>Bax</Text>
            </TouchableOpacity>
          </View>

          {/* Əvəz et */}
          <TouchableOpacity
            style={{ paddingVertical: 14, borderRadius: 16, alignItems: 'center', backgroundColor: Colors.gold, marginBottom: 10 }}
            onPress={() => onEvezEt(pendingData)}
          >
            <Text style={{ color: '#1a0e00', fontFamily: Typography.nunito700 }}>Əvəz et</Text>
          </TouchableOpacity>

          {/* Yeni tədbir */}
          <TouchableOpacity
            style={{ paddingVertical: 14, borderRadius: 16, alignItems: 'center', backgroundColor: Colors.bg3, borderWidth: 1, borderColor: Colors.border }}
            onPress={() => onYeniTedbir(pendingData, conflictEvent)}
          >
            <Text style={{ color: Colors.text, fontFamily: Typography.nunito700 }}>Yeni tədbir</Text>
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  );
}
