import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { Colors } from '../../theme/colors';

interface CloseButtonProps {
  onPress: () => void;
}

export default function CloseButton({ onPress }: CloseButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
    >
      <Text style={{ color: Colors.muted, fontSize: 28 }}>×</Text>
    </TouchableOpacity>
  );
}
