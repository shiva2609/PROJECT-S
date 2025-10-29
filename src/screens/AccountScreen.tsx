import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch } from 'react-redux';
import { logout } from '../store';
import { colors } from '../utils/colors';
import { AUTH_USER_KEY } from '../utils/constants';

export default function AccountScreen() {
  const dispatch = useDispatch();

  const onLogout = async () => {
    // clear persisted user and reset redux state
    try {
      await AsyncStorage.removeItem(AUTH_USER_KEY);
    } catch (e) {
      // ignore
    }
    dispatch(logout());
    Alert.alert('Logged out', 'You have been logged out.');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Account</Text>
      <TouchableOpacity style={styles.btn} onPress={onLogout}>
        <Text style={styles.btnText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface, padding: 16 },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, marginTop: 24 },
  btn: { alignSelf: 'flex-start', marginTop: 16, backgroundColor: colors.danger, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  btnText: { color: 'white', fontWeight: '700' },
});
