/**
 * ChatInput Component
 * 
 * Bottom input bar for typing messages
 */

import React, { useState } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Keyboard } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';

interface ChatInputProps {
  onSend: (message: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function ChatInput({
  onSend,
  placeholder = "Tell me about your dream trip...",
  disabled = false,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (trimmedMessage && !disabled) {
      onSend(trimmedMessage);
      setMessage('');
      Keyboard.dismiss();
    }
  };

  return (
    <View style={[styles.container, isFocused && styles.containerFocused]}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={message}
          onChangeText={setMessage}
          placeholder={placeholder}
          placeholderTextColor={Colors.black.qua}
          multiline
          maxLength={500}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          editable={!disabled}
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={styles.actionButton}
          activeOpacity={0.7}
          disabled={disabled}
        >
          <Icon
            name="mic"
            size={22}
            color={Colors.black.tertiary}
          />
        </TouchableOpacity>
        {message.trim().length > 0 && (
          <TouchableOpacity
            onPress={handleSend}
            disabled={disabled}
            style={styles.sendButton}
            activeOpacity={0.8}
          >
            <Icon
              name="arrow-up"
              size={20}
              color={Colors.white.primary}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white.primary,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 0,
    // Soft shadow for floating feel
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 8,
  },
  containerFocused: {
    // subtle state change if needed
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA', // Lighter neutral background
    borderRadius: 32, // Fully rounded pill shape
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 56,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  input: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: 16,
    color: Colors.black.primary,
    maxHeight: 100,
    paddingVertical: 0,
    paddingHorizontal: 8,
    lineHeight: 22,
  },
  actionButton: {
    padding: 8,
    marginRight: 4,
    opacity: 0.6,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
    transform: [{ scale: 0.9 }],
  },
});

