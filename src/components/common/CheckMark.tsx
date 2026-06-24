import React from 'react';
import { View, Text } from 'react-native';

interface CheckMarkProps {
  isRead: boolean;
  isDelivered: boolean;
}

export function CheckMark({ isRead, isDelivered }: CheckMarkProps) {
  const color = isRead ? '#1a6b9e' : 'rgba(26,14,0,0.5)';
  if (!isDelivered) {
    return (
      <Text style={{ fontSize: 13, color: 'rgba(26,14,0,0.5)', marginLeft: 3, fontWeight: 'bold' }}>✓</Text>
    );
  }
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 3 }}>
      <Text style={{ fontSize: 13, color, fontWeight: 'bold', marginRight: -5 }}>✓</Text>
      <Text style={{ fontSize: 13, color, fontWeight: 'bold' }}>✓</Text>
    </View>
  );
}

interface GroupCheckMarkProps {
  readBy: string[];
  members: string[];
  senderUid: string;
}

export function GroupCheckMark({ readBy, members, senderUid }: GroupCheckMarkProps) {
  const otherMembers = members.filter(uid => uid !== senderUid);
  if (otherMembers.length === 0) return null;
  const allRead = otherMembers.every(uid => readBy.includes(uid));
  const color = allRead ? '#1a6b9e' : 'rgba(26,14,0,0.5)';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 3 }}>
      <Text style={{ fontSize: 13, color, fontWeight: 'bold', marginRight: -5 }}>✓</Text>
      <Text style={{ fontSize: 13, color, fontWeight: 'bold' }}>✓</Text>
    </View>
  );
}
