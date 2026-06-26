import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';

interface ChatListItemProps {
  name:        string;
  emoji:       string;
  preview?:    string;
  unread?:     number;
  online?:     boolean;
  photoURL?:   string;
  isGroup?:    boolean;
  specialty?: string;
  onPress:     () => void;
}

export default function ChatListItem({
  name, emoji, preview, unread, online, photoURL, isGroup, specialty, onPress,
}: ChatListItemProps) {
  return (
    <TouchableOpacity style={s.item} onPress={onPress} activeOpacity={0.8}>
      <View style={[s.ava, isGroup && { borderRadius: 14 }]}>
        {photoURL
          ? <Image source={{ uri: photoURL }} style={[StyleSheet.absoluteFill, { borderRadius: isGroup ? 14 : 25 }]} />
          : <Text style={{ fontSize: 21 }}>{emoji}</Text>
        }
        {online && !isGroup && <View style={s.online} />}
      </View>

      <View style={s.info}>
        <View style={s.nameRow}>
          <Text style={s.name} numberOfLines={1}>{name}</Text>
          {!isGroup && !!specialty && (
            <Text style={s.specText}>{specialty.split(' ')[0]}</Text>
          )}
        </View>
        {!!preview && (
          <Text style={s.preview} numberOfLines={1}>{preview}</Text>
        )}
      </View>

      {(unread ?? 0) > 0 && (
        <View style={s.unreadBadge}>
          <Text style={s.unreadText}>{unread}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  item:        { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  ava:         { width: 50, height: 50, borderRadius: 25, backgroundColor: Colors.bg3, alignItems: 'center', justifyContent: 'center', position: 'relative', flexShrink: 0 },
  online:      { position: 'absolute', bottom: 1, right: 1, width: 12, height: 12, backgroundColor: Colors.green, borderRadius: 6, borderWidth: 2, borderColor: Colors.bg },
  info:        { flex: 1, minWidth: 0 },
  nameRow:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  name:        { fontFamily: Typography.playfair700, fontSize: 14, color: Colors.text, flexShrink: 1 },
  specText:    { fontSize: 16 },
  preview:     { fontSize: 12, color: Colors.muted, fontFamily: Typography.nunito400 },
  unreadBadge: { backgroundColor: Colors.gold, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, minWidth: 20, alignItems: 'center' },
  unreadText:  { color: '#1a0e00', fontSize: 11, fontFamily: Typography.nunito700 },
});
