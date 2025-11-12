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
  placeholder = "Ask your Copilot...",
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
          style={styles.micButton}
          activeOpacity={0.7}
          disabled={disabled}
        >
          <Icon 
            name="mic-outline" 
            size={20} 
            color={Colors.black.qua} 
          />
        </TouchableOpacity>
        {message.trim().length > 0 && (
          <TouchableOpacity
            onPress={handleSend}
            disabled={disabled}
            style={styles.sendButton}
            activeOpacity={0.7}
          >
            <Icon 
              name="send" 
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.white.qua,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  containerFocused: {
    borderTopColor: Colors.brand.primary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white.secondary,
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 48,
    maxHeight: 120,
  },
  input: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: 15,
    color: Colors.black.secondary,
    maxHeight: 100,
    paddingVertical: 0,
    paddingHorizontal: 8,
  },
  micButton: {
    padding: 4,
    marginRight: 4,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
});

