import React from 'react';
import { View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '../../theme/colors';

interface WheelTimePickerProps {
  value: Date;
  onChange: (d: Date) => void;
  mode: 'full' | 'time-only';
}

export default function WheelTimePicker({ value, onChange, mode }: WheelTimePickerProps) {
  return (
    <View style={{ height: 102, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' }}>
      <DateTimePicker
        value={value}
        mode={mode === 'full' ? 'datetime' : 'time'}
        display="spinner"
        onChange={(_, date) => { if (date) onChange(date); }}
        locale="az"
        themeVariant="dark"
        textColor={Colors.gold}
        style={{ width: '100%' }}
      />
    </View>
  );
}
