import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch } from 'react-redux';
import { logout } from '../store';
import { colors } from '../utils/colors';
import { AUTH_USER_KEY } from '../utils/constants';
import { auth } from '../api/firebaseConfig';

export default function AccountScreen({ navigation }: any) {
  const dispatch = useDispatch();

  const onLogout = async () => {
    try {
      // Sign out from Firebase Auth using React Native Firebase
      try {
        await auth().signOut();
        console.log('✅ Signed out from Firebase Auth');
      } catch (authError: any) {
        console.error('❌ Auth Error - Failed to sign out:', {
          code: authError?.code,
          message: authError?.message,
        });
        throw authError;
      }
      
      // Clear persisted user data
      try {
        await AsyncStorage.removeItem(AUTH_USER_KEY);
        console.log('✅ Cleared AsyncStorage');
      } catch (storageError: any) {
        console.error('❌ Storage Error - Failed to clear AsyncStorage:', {
          message: storageError?.message,
        });
        // Non-critical, continue with logout
      }
      
      // Reset Redux state
      dispatch(logout());
      console.log('✅ Cleared Redux state');
      
      Alert.alert('Logged out', 'You have been logged out.', [
        {
          text: 'OK',
          onPress: () => {
            // Navigate to onboarding
            navigation.reset({
              index: 0,
              routes: [{ name: 'Onboarding1' }],
            });
          },
        },
      ]);
    } catch (error: any) {
      console.error('❌ Logout error:', {
        code: error?.code,
        message: error?.message,
        error: error,
      });
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
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
