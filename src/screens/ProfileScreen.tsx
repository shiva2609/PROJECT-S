import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../utils/colors';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

export default function ProfileScreen({ navigation }: any) {
  const user = useSelector((s: RootState) => s.user.currentUser);

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{user?.displayName || 'Traveler'}</Text>
      <Text style={styles.sub}>{user?.email || '@guest'}</Text>
      <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('Account')}>
        <Text style={styles.btnText}>Account Settings</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface, padding: 16 },
  name: { fontSize: 24, fontWeight: '700', color: colors.text, marginTop: 24 },
  sub: { color: colors.mutedText, marginTop: 6 },
  btn: { alignSelf: 'flex-start', marginTop: 16, backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  btnText: { color: 'white', fontWeight: '700' },
});
