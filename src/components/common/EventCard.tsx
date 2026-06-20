import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';

interface Musician {
  uid?: string;
  id?: string;
  name: string;
  emoji?: string;
  instrument?: string;
}

interface EventCardProps {
  type: string;
  time: string;
  location?: string;
  notes?: string;
  badge: { label: string; color: string; bg: string };
  initiator?: Musician;
  musicians?: Musician[];
  onPress: () => void;
  onInitiatorPress?: () => void;
  onMusicianPress?: (m: Musician) => void;
}

export default function EventCard({
  type, time, location, notes, badge,
  initiator, musicians = [],
  onPress, onInitiatorPress, onMusicianPress,
}: EventCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        backgroundColor: Colors.card,
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: Colors.border,
      }}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ color: Colors.gold, fontFamily: Typography.nunito700, fontSize: 14 }}>{type}</Text>
          {location ? <Text style={{ color: Colors.muted, fontSize: 12 }}>{'📍 ' + location}</Text> : null}
          <Text style={{ color: Colors.muted, fontSize: 12 }}>{'🕐 ' + time}</Text>
        </View>
        <View style={{ borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: 'transparent' }}>
          <Text style={{ color: badge.color, fontSize: 16 }}>{badge.label}</Text>
        </View>
      </View>

      {/* Notes */}
      {notes ? <Text style={{ color: Colors.muted, fontSize: 12, marginBottom: 6 }}>{'📝 ' + notes}</Text> : null}

      {/* Initiator + Musicians */}
      {initiator && (
        <View style={{ borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 8, marginTop: 4 }}>
          <TouchableOpacity
            onPress={onInitiatorPress ?? onPress}
            activeOpacity={0.85}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              backgroundColor: Colors.gold + '22',
              borderRadius: 14,
              paddingHorizontal: 14,
              paddingVertical: 10,
              marginBottom: 8,
            }}
          >
            <Text style={{ fontSize: 20 }}>{initiator.emoji ?? '👤'}</Text>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: Colors.gold, fontFamily: Typography.playfair700, fontSize: 16 }}>{initiator.name}</Text>
              <Text style={{ color: Colors.gold, fontSize: 11, opacity: 0.8 }}>{initiator.instrument || 'Təklif edən'}</Text>
            </View>
          </TouchableOpacity>
          {musicians.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {musicians.map((m, mi) => (
                <TouchableOpacity
                  key={mi}
                  onPress={() => onMusicianPress?.(m)}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: Colors.bg3,
                    borderRadius: 20,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderWidth: 1,
                    borderColor: Colors.border,
                  }}
                >
                  <Text style={{ fontSize: 14 }}>{m.emoji ?? '🎵'}</Text>
                  <View>
                    <Text style={{ color: Colors.text, fontFamily: Typography.nunito600, fontSize: 12 }}>{m.name}</Text>
                    <Text style={{ color: Colors.muted, fontSize: 10 }}>{m.instrument}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}
