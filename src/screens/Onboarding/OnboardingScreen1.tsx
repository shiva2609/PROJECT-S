import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { colors } from '../../utils/colors';

export default function OnboardingScreen1({ navigation }: any) {
  return (
    <View style={styles.container}>
      <Image source={{ uri: 'https://images.unsplash.com/photo-1518684079-3c830dcef090?w=1200' }} style={styles.image} />
      <Text style={styles.title}>Discover Destinations</Text>
      <Text style={styles.sub}>Find hidden gems around the world curated by travelers.</Text>
      <View style={styles.actions}>
        <TouchableOpacity onPress={() => navigation.replace('AuthLogin')}><Text style={styles.skip}>Skip</Text></TouchableOpacity>
        <TouchableOpacity style={styles.next} onPress={() => navigation.navigate('Onboarding2')}>
          <Text style={styles.nextText}>Next</Text>
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
  actions: { marginTop: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  skip: { color: colors.mutedText },
  next: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  nextText: { color: 'white', fontWeight: '700' },
});
