import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../../utils/colors';
import { ONBOARDING_DONE_KEY } from '../../utils/constants';

export default function OnboardingScreen3({ navigation }: any) {
  const onGetStarted = async () => {
    await AsyncStorage.setItem(ONBOARDING_DONE_KEY, '1');
    navigation.replace('AuthLogin');
  };

  return (
    <View style={styles.container}>
      <Image source={{ uri: 'https://images.unsplash.com/photo-1519882782034-7b3cc52c3f36?w=1200' }} style={styles.image} />
      <Text style={styles.title}>Share Your Journey</Text>
      <Text style={styles.sub}>Post photos, videos, and tips to inspire other travelers.</Text>
      <View style={styles.actions}>
        <TouchableOpacity onPress={onGetStarted} style={styles.next}>
          <Text style={styles.nextText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: colors.surface },
  image: { width: '100%', height: 300, borderRadius: 16, marginTop: 24 },
  title: { fontSize: 28, fontWeight: '700', color: colors.text, marginTop: 24 },
  sub: { color: colors.mutedText, marginTop: 8 },
  actions: { marginTop: 24, alignItems: 'flex-end' },
  next: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  nextText: { color: 'white', fontWeight: '700' },
});
