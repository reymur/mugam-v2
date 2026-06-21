import React from 'react';
import {
  View, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Colors } from '../../theme/colors';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxHeight?: string;
}

export default function BottomSheet({ visible, onClose, children, maxHeight = '85%' }: BottomSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: Colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight, flex: 1 }}>
            {children}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
