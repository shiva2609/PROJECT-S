import React, { forwardRef } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';

interface GlassInputBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onPlusPress?: () => void;
  placeholder?: string;
}

const GlassInputBar = forwardRef<TextInput, GlassInputBarProps>(({
  value,
  onChangeText,
  onSend,
  onPlusPress,
  placeholder = 'Type your message here',
}, ref) => {
  const hasText = value.trim().length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.blurContainer}>
        <View style={styles.content}>
          {/* Plus Button */}
          <TouchableOpacity
            style={styles.plusButton}
            onPress={onPlusPress}
            activeOpacity={0.7}
          >
            <Icon name="add" size={26} color="#1C1C1C" />
          </TouchableOpacity>

          {/* Text Input */}
          <TextInput
            ref={ref}
            style={styles.textInput}
            placeholder={placeholder}
            placeholderTextColor="#999999"
            value={value}
            onChangeText={onChangeText}
            multiline
            maxLength={1000}
          />

          {/* Mic/Send Button */}
          {hasText ? (
            <TouchableOpacity
              style={styles.sendButtonContainer}
              onPress={onSend}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#E87A5D', '#E87A5D']}
                style={styles.sendButton}
              >
                <Icon name="send" size={18} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.micButtonContainer}
              onPress={() => {
                // Handle voice recording
              }}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#3B4A67', '#2E3A52']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.micButton}
              >
                <Icon name="mic-outline" size={20} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
});

export default GlassInputBar;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 16 : 10,
  },
  blurContainer: {
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 245, 240, 0.98)', // Solid peachy background
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 10,
  },
  plusButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#1C1C1C',
    maxHeight: 90,
    fontFamily: 'System',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  sendButtonContainer: {
    width: 36,
    height: 36,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micButtonContainer: {
    width: 36,
    height: 36,
  },
  micButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
