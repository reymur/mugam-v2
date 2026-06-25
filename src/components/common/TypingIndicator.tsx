import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';

interface TypingIndicatorProps {
  name: string;
}

export default function TypingIndicator({ name }: TypingIndicatorProps) {
  return (
    <View style={s.wrap}>
      <Text style={s.text}>✍️ {name} yazır...</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingVertical: 4 },
  text: { fontSize: 13, color: Colors.gold, fontStyle: 'italic', fontFamily: Typography.nunito500 },
});
