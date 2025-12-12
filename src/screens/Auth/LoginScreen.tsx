import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../utils/colors';
import { auth, firestore } from '../../services/api/firebaseConfig';
import { useDispatch } from 'react-redux';
import { setUser } from '../../store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AUTH_USER_KEY } from '../../utils/constants';
import { FontFamily } from '../../GlobalStyles';

export default function LoginScreen({ navigation }: any) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();

  const onLogin = async () => {
    const u = username.trim();
    if (!u || !password) return;
    
    try {
      setLoading(true);
      
      // Get email from username lookup in /usernames/{username}
      let email: string;
      try {
        const usernameDoc = await firestore()
          .collection('usernames')
          .doc(u.toLowerCase())
          .get();
        
        const usernameData = usernameDoc.data();
        if (!usernameData || !usernameData.email) {
          // Try to sign in with username as email (for backward compatibility)
          email = `${u.toLowerCase()}@sanchari.app`;
        } else {
          email = usernameData.email;
        }
      } catch (error) {
        // Fallback: try username as email
        email = `${u.toLowerCase()}@sanchari.app`;
      }

      // Sign in with Firebase Auth
      console.log('📝 Signing in...');
      let userCredential;
      try {
        userCredential = await auth().signInWithEmailAndPassword(email, password);
      } catch (authError: any) {
        // Try direct email if username lookup failed
        if (authError?.code === 'auth/user-not-found' || authError?.code === 'auth/invalid-email') {
          email = u.toLowerCase();
          userCredential = await auth().signInWithEmailAndPassword(email, password);
        } else {
          throw authError;
        }
      }

      const firebaseUser = userCredential.user;
      const uid = firebaseUser.uid;
      console.log(`✅ Signed in: ${uid}`);

      // Check and create/update user document if needed
      const userDocRef = firestore().collection('users').doc(uid);
      let userDoc;
      let userData: any;
      
      try {
        userDoc = await userDocRef.get();
        userData = userDoc.data();
      } catch (firestoreError: any) {
        console.error('❌ Firestore Error - Failed to read user document:', {
          code: firestoreError?.code,
          message: firestoreError?.message,
          uid: uid,
        });
        throw new Error('Failed to retrieve user data. Please try again.');
      }

      let finalUserData: any = {};
      
      if (!userData) {
        // Create missing user document with exact structure
        console.log('📝 Creating missing user document...');
        const now = new Date().toISOString();
        finalUserData = {
          username: u.toLowerCase(),
          email: firebaseUser.email || email,
          role: 'traveler',
          travelPlan: [],
          createdAt: now,
          updatedAt: now,
        };
        try {
          await userDocRef.set(finalUserData, { merge: true });
          console.log('✅ User document created');
        } catch (firestoreError: any) {
          console.error('❌ Firestore Error - Failed to create user document:', {
            code: firestoreError?.code,
            message: firestoreError?.message,
            uid: uid,
          });
          throw new Error('Failed to create user profile. Please try again.');
        }
      } else {
        // Update existing document with missing fields if needed
        const updates: any = {};
        if (!userData.username) updates.username = u.toLowerCase();
        if (!userData.email) updates.email = firebaseUser.email || email;
        if (!userData.role) updates.role = 'traveler';
        if (!userData.travelPlan) updates.travelPlan = [];
        if (!userData.createdAt) updates.createdAt = new Date().toISOString();
        if (!userData.updatedAt) updates.updatedAt = new Date().toISOString();
        
        if (Object.keys(updates).length > 0) {
          try {
            await userDocRef.set(updates, { merge: true });
            console.log('✅ User document updated with missing fields');
          } catch (firestoreError: any) {
            console.error('❌ Firestore Error - Failed to update user document:', {
              code: firestoreError?.code,
              message: firestoreError?.message,
              uid: uid,
            });
            // Continue with existing data
          }
        }
        finalUserData = { ...userData, ...updates };
      }

      // Update Redux store
      dispatch(setUser({
        id: uid,
        email: finalUserData.email || firebaseUser.email || '',
        displayName: finalUserData.username || firebaseUser.displayName || u,
        photoURL: firebaseUser.photoURL || '',
      }));

      // Save to AsyncStorage
      try {
        await AsyncStorage.setItem(
          AUTH_USER_KEY,
          JSON.stringify({ id: uid, username: finalUserData.username || u })
        );
      } catch (storageError) {
        console.warn('⚠️ Failed to save to AsyncStorage:', storageError);
      }

      // Check if travelPlan exists and route accordingly
      const hasTravelPlan = finalUserData.travelPlan && Array.isArray(finalUserData.travelPlan) && finalUserData.travelPlan.length > 0;
      
      if (hasTravelPlan) {
        console.log('✅ User has travel plan, navigating to MainTabs');
        navigation.replace('MainTabs');
      } else {
        console.log('ℹ️ User has no travel plan, navigating to TravelPlanSelect');
        navigation.replace('TravelPlanSelect');
      }
    } catch (error: any) {
      console.error('❌ Login failed:', {
        code: error?.code,
        message: error?.message,
        error: error,
      });
      
      let errorMessage = 'Please check your credentials';
      if (error?.code === 'auth/user-not-found') {
        errorMessage = 'User not found. Please check your username.';
      } else if (error?.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.';
      } else if (error?.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.';
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Login failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerArea}>
        <Text style={styles.welcomeTop}>Welcome</Text>
        <Text style={styles.welcomeBrand}>Sanchari!</Text>
      </View>

      <View style={styles.form}>
        <TextInput
          placeholder="Enter your username"
          placeholderTextColor={colors.mutedText}
          style={styles.input}
          autoCapitalize="none"
          keyboardType="default"
          value={username}
          onChangeText={setUsername}
        />
        <TextInput
          placeholder="Enter your password"
          placeholderTextColor={colors.mutedText}
          style={styles.input}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <View style={styles.forgotRow}>
          <TouchableOpacity onPress={() => navigation.navigate('AuthForgotPassword')}>
            <Text style={styles.linkText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.primaryBtn} onPress={onLogin} disabled={loading}>
          {loading ? <ActivityIndicator color={'#fff'} /> : <Text style={styles.primaryBtnText}>Login</Text>}
        </TouchableOpacity>

        <View style={styles.bottomRow}>
          <Text style={styles.muted}>Don’t have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('AuthSignup')}>
            <Text style={styles.linkStrong}>Register Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  headerArea: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 8},
  welcomeTop: { fontSize: 30, fontWeight: '600', fontFamily: FontFamily.poppinsBold, color: colors.primary, marginBottom: -4, lineHeight: 32, },
  welcomeBrand: { fontSize: 40, fontWeight: '600', fontFamily: FontFamily.poppinsExtraBold, color: colors.primary, },
  form: { paddingHorizontal: 24, paddingTop: 12 },
  input: {
    backgroundColor: colors.background,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontFamily: FontFamily.poppinsRegular,
  },
  forgotRow: { alignItems: 'flex-end', marginTop: 8 },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 18,
  },
  primaryBtnText: { color: '#fff', fontFamily: FontFamily.poppinsBold, fontSize: 16 },
  bottomRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 28 },
  muted: { color: colors.mutedText, fontFamily: FontFamily.poppinsRegular },
  linkText: { color: colors.mutedText, fontFamily: FontFamily.poppinsRegular },
  linkStrong: { color: colors.primary, fontFamily: FontFamily.poppinsBold },
});


