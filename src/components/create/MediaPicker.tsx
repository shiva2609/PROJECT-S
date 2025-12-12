import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';

interface MediaPickerProps {
  onPickImage?: () => void;
  onPickVideo?: () => void;
}

export default function MediaPicker({ onPickImage, onPickVideo }: MediaPickerProps) {
  return (
    <View style={styles.container}>
      {onPickImage && (
        <TouchableOpacity
          style={styles.button}
          onPress={onPickImage}
          activeOpacity={0.7}
        >
          <Icon name="image-outline" size={24} color={Colors.brand.primary} />
          <Text style={styles.buttonText}>Pick Photo</Text>
        </TouchableOpacity>
      )}
      {onPickVideo && (
        <TouchableOpacity
          style={styles.button}
          onPress={onPickVideo}
          activeOpacity={0.7}
        >
          <Icon name="videocam-outline" size={24} color={Colors.brand.primary} />
          <Text style={styles.buttonText}>Pick Video</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white.secondary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  buttonText: {
    fontSize: 16,
    fontFamily: Fonts.medium,
    color: Colors.brand.primary,
  },
});

