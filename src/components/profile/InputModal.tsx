/**
 * Input Modal Component
 * 
 * Reusable modal for text input with save/cancel functionality
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Fonts } from '../../theme/fonts';

const DESIGN_COLORS = {
  primary: '#FF5C02',
  primaryText: '#3C3C3B',
  secondaryText: '#757574',
  cardBackground: '#FFFFFF',
  border: '#E5E5E5',
  background: '#F4F5F7',
};

interface InputModalProps {
  visible: boolean;
  title: string;
  placeholder: string;
  initialValue?: string;
  onSave: (value: string) => void;
  onClose: () => void;
  multiline?: boolean;
}

export default function InputModal({
  visible,
  title,
  placeholder,
  initialValue = '',
  onSave,
  onClose,
  multiline = false,
}: InputModalProps) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (visible) {
      setValue(initialValue);
    }
  }, [visible, initialValue]);

  const handleSave = () => {
    if (value.trim()) {
      onSave(value.trim());
      setValue('');
      onClose();
    }
  };

  const handleCancel = () => {
    setValue(initialValue);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleCancel}
        />
        <View style={styles.modalContainer}>
          <View style={styles.card}>
            <Text style={styles.title}>{title}</Text>
            <TextInput
              style={[styles.input, multiline && styles.inputMultiline]}
              placeholder={placeholder}
              placeholderTextColor={DESIGN_COLORS.secondaryText}
              value={value}
              onChangeText={setValue}
              multiline={multiline}
              numberOfLines={multiline ? 4 : 1}
              autoFocus
            />
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancel}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, !value.trim() && styles.saveButtonDisabled]}
                onPress={handleSave}
                activeOpacity={0.8}
                disabled={!value.trim()}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
  },
  card: {
    backgroundColor: DESIGN_COLORS.cardBackground,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: DESIGN_COLORS.primaryText,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: DESIGN_COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: DESIGN_COLORS.primaryText,
    backgroundColor: DESIGN_COLORS.background,
    marginBottom: 20,
    minHeight: 48,
  },
  inputMultiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  cancelButtonText: {
    fontSize: 15,
    fontFamily: Fonts.medium,
    color: DESIGN_COLORS.secondaryText,
  },
  saveButton: {
    backgroundColor: DESIGN_COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    backgroundColor: DESIGN_COLORS.border,
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 15,
    fontFamily: Fonts.semibold,
    color: DESIGN_COLORS.cardBackground,
  },
});

