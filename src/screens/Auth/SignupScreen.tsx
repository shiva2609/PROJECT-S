import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../utils/colors';
import { auth, firestore } from '../../api/firebaseConfig';
import { useDispatch } from 'react-redux';
import { setUser } from '../../store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AUTH_USER_KEY } from '../../utils/constants';

interface FormState {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface ValidationState {
  username: 'idle' | 'checking' | 'available' | 'taken' | 'invalid';
  email: 'idle' | 'valid' | 'invalid';
  password: 'idle' | 'valid' | 'invalid';
  confirmPassword: 'idle' | 'match' | 'mismatch';
}

export default function SignupScreen({ navigation }: any) {
  const [form, setForm] = useState<FormState>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [validation, setValidation] = useState<ValidationState>({
    username: 'idle',
    email: 'idle',
    password: 'idle',
    confirmPassword: 'idle',
  });

  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();

  // Email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Username validation
  React.useEffect(() => {
    const u = form.username.trim();
    if (!u) {
      setValidation(prev => ({ ...prev, username: 'idle' }));
      return;
    }

    // Simple local validation: no '@', lowercase enforced
    if (u.includes('@')) {
      setValidation(prev => ({ ...prev, username: 'invalid' }));
      return;
    }

    let cancelled = false;
    setValidation(prev => ({ ...prev, username: 'checking' }));

    const t = setTimeout(async () => {
      try {
        // Check username availability using /usernames/{username} collection
        const usernameLower = u.toLowerCase();
        const usernameDoc = await firestore()
          .collection('usernames')
          .doc(usernameLower)
          .get();
        
        if (cancelled) return;
        const usernameData = usernameDoc.data();
        const isTaken = usernameData !== undefined && usernameData !== null;
        setValidation(prev => ({
          ...prev,
          username: isTaken ? 'taken' : 'available',
        }));
      } catch (error) {
        if (cancelled) return;
        setValidation(prev => ({ ...prev, username: 'taken' }));
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [form.username]);

  // Email validation
  React.useEffect(() => {
    if (!form.email) {
      setValidation(prev => ({ ...prev, email: 'idle' }));
      return;
    }
    const isValid = emailRegex.test(form.email.trim());
    setValidation(prev => ({
      ...prev,
      email: isValid ? 'valid' : 'invalid',
    }));
  }, [form.email]);

  // Password validation
  React.useEffect(() => {
    if (!form.password) {
      setValidation(prev => ({ ...prev, password: 'idle' }));
      return;
    }
    const isValid = /^[A-Za-z0-9]{8}$/.test(form.password);
    setValidation(prev => ({
      ...prev,
      password: isValid ? 'valid' : 'invalid',
    }));
  }, [form.password]);

  // Confirm password validation
  React.useEffect(() => {
    if (!form.confirmPassword) {
      setValidation(prev => ({ ...prev, confirmPassword: 'idle' }));
      return;
    }
    setValidation(prev => ({
      ...prev,
      confirmPassword: form.confirmPassword === form.password ? 'match' : 'mismatch',
    }));
  }, [form.confirmPassword, form.password]);

  // Check if all fields are valid
  const isFormValid =
    form.username.trim() &&
    form.email.trim() &&
    form.password &&
    form.confirmPassword &&
    validation.username === 'available' &&
    validation.email === 'valid' &&
    validation.password === 'valid' &&
    validation.confirmPassword === 'match';

  const onSignup = async () => {
    if (!isFormValid || loading) return;

    const username = form.username.trim().toLowerCase();
    const email = form.email.trim().toLowerCase();
    const password = form.password;

    try {
      setLoading(true);

      // Check username availability in /usernames/{username} collection
      console.log('🔍 Checking username availability...');
      
      try {
        const usernameDoc = await firestore()
          .collection('usernames')
          .doc(username)
          .get();
        
        const usernameData = usernameDoc.data();
        if (usernameData) {
          Alert.alert('Username already taken!', 'Please choose a different username.');
          setLoading(false);
          return;
        }
      } catch (firestoreError: any) {
        console.error('❌ Firestore Error - Failed to check username availability:', {
          code: firestoreError?.code,
          message: firestoreError?.message,
        });
        Alert.alert('Network Error', 'Please check your connection and try again.');
        return;
      }

      console.log('✅ Username is available');

      // Create Firebase Auth user
      console.log('📝 Creating Firebase Auth user...');
      let userCredential, firebaseUser;
      try {
        userCredential = await auth().createUserWithEmailAndPassword(email, password);
        firebaseUser = userCredential.user;
        console.log(`✅ User created successfully`);
        console.log(`   User ID: ${firebaseUser.uid}`);
      } catch (authError: any) {
        console.error('❌ Auth Error - Failed to create user:', {
          code: authError?.code,
          message: authError?.message,
          email: email,
        });
        throw authError;
      }

      // Update displayName in Firebase Auth
      console.log('📝 Setting display name in Firebase Auth...');
      try {
        await firebaseUser.updateProfile({
          displayName: username,
        });
        console.log('👤 Display name set in Firebase Auth');
      } catch (authError: any) {
        console.error('❌ Auth Error - Failed to update display name:', {
          code: authError?.code,
          message: authError?.message,
          uid: firebaseUser.uid,
        });
        // Non-critical, continue with signup
      }

      // Create Firestore documents
      const user = firebaseUser;
      const uid = user.uid;
      const createdAt = new Date().toISOString();

      // Create user document at /users/{uid} with exact field order
      console.log('📝 Creating user document in Firestore...');
      const userData = {
        username,
        email,
        role: 'traveler',
        travelPlan: [],
        createdAt,
        updatedAt: createdAt,
      };

      const userDocRef = firestore().collection('users').doc(uid);
      try {
        await userDocRef.set(userData, { merge: true });
        console.log('✅ Firestore user record created:', userData);
      } catch (firestoreError: any) {
        console.error('❌ Firestore Error - Failed to create user document:', {
          code: firestoreError?.code,
          message: firestoreError?.message,
          uid: uid,
        });
        throw new Error('Failed to save user data. Please try again.');
      }

      // Create username reservation document at /usernames/{username}
      // Firestore will auto-create the collection if it doesn't exist
      console.log('📝 Creating username reservation document in usernames collection...');
      const usernameDocRef = firestore().collection('usernames').doc(username);
      try {
        await usernameDocRef.set({
          uid,
          email,
          createdAt: new Date().toISOString(),
        }, { merge: true });
        console.log('✅ Username reservation created:', username);
        console.log('   Document path: /usernames/' + username);
      } catch (firestoreError: any) {
        console.error('❌ Firestore Error - Failed to create username document:', {
          code: firestoreError?.code,
          message: firestoreError?.message,
          username: username,
        });
        // Try to delete user document if username reservation fails
        try {
          await userDocRef.delete();
          console.log('✅ Rolled back user document');
        } catch (deleteError: any) {
          console.error('❌ Failed to rollback user document:', {
            code: deleteError?.code,
            message: deleteError?.message,
            error: deleteError,
          });
        }
        throw new Error('Failed to reserve username. Please try again.');
      }

      // Update Redux store
      dispatch(
        setUser({
          id: firebaseUser.uid,
          email: email,
          displayName: username,
          photoURL: '',
        })
      );

      // Save to AsyncStorage
      try {
        await AsyncStorage.setItem(
          AUTH_USER_KEY,
          JSON.stringify({ id: firebaseUser.uid, username: username })
        );
        console.log('✅ User data saved to AsyncStorage');
      } catch (e) {
        console.warn('⚠️ Failed to save to AsyncStorage:', e);
      }

      // Navigate to TravelPlanSelect only after all Firestore writes are complete
      console.log('✅ Signup complete - Navigating to TravelPlanSelect');
      navigation.replace('TravelPlanSelect');
    } catch (error: any) {
      console.error('❌ Signup failed:', {
        code: error?.code,
        message: error?.message,
        error: error,
      });
      
      let errorMessage = 'Unable to create account. Please try again.';
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.code === 'auth/email-already-in-use') {
        errorMessage = 'Email is already registered';
      } else if (error?.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (error?.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak';
      } else if (error?.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your connection.';
      }

      Alert.alert('Signup Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Hello! Register to get started</Text>

        <TextInput
          placeholder="Username"
          placeholderTextColor={colors.mutedText}
          style={styles.input}
          autoCapitalize="none"
          value={form.username}
          onChangeText={(text) => setForm(prev => ({ ...prev, username: text }))}
        />
        {validation.username === 'available' ? (
          <Text style={styles.validText}>✅ Username available</Text>
        ) : validation.username === 'taken' ? (
          <Text style={styles.errorText}>❌ Username not available</Text>
        ) : validation.username === 'invalid' ? (
          <Text style={styles.errorText}>❌ Username cannot contain @</Text>
        ) : validation.username === 'checking' ? (
          <Text style={styles.mutedSmall}>Checking availability…</Text>
        ) : null}

        <TextInput
          placeholder="Email"
          placeholderTextColor={colors.mutedText}
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          value={form.email}
          onChangeText={(text) => setForm(prev => ({ ...prev, email: text }))}
        />
        {validation.email === 'valid' ? (
          <Text style={styles.validText}>✅ Valid email</Text>
        ) : validation.email === 'invalid' ? (
          <Text style={styles.errorText}>⚠️ Please enter a valid email address.</Text>
        ) : null}

        <TextInput
          placeholder="Password"
          placeholderTextColor={colors.mutedText}
          style={styles.input}
          secureTextEntry
          value={form.password}
          onChangeText={(text) => setForm(prev => ({ ...prev, password: text }))}
        />
        {validation.password === 'invalid' ? (
          <Text style={styles.errorText}>❌ Password must be 8 alphanumeric characters</Text>
        ) : validation.password === 'valid' ? (
          <Text style={styles.validText}>✅ Strong password</Text>
        ) : null}

        <TextInput
          placeholder="Confirm password"
          placeholderTextColor={colors.mutedText}
          style={styles.input}
          secureTextEntry
          value={form.confirmPassword}
          onChangeText={(text) => setForm(prev => ({ ...prev, confirmPassword: text }))}
        />
        {validation.confirmPassword === 'mismatch' ? (
          <Text style={styles.errorText}>❌ Passwords do not match</Text>
        ) : validation.confirmPassword === 'match' ? (
          <Text style={styles.validText}>✅ Passwords match</Text>
        ) : null}

        <TouchableOpacity
          style={[styles.primaryBtn, (!isFormValid || loading) && styles.primaryBtnDisabled]}
          onPress={onSignup}
          disabled={!isFormValid || loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Register</Text>}
        </TouchableOpacity>

        <View style={styles.bottomRow}>
          <Text style={styles.muted}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('AuthLogin')}>
            <Text style={styles.linkStrong}>Login Now</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  scroll: { paddingHorizontal: 24, paddingVertical: 24 },
  title: { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: 16 },
  input: {
    backgroundColor: colors.background,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  bottomRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  muted: { color: colors.mutedText },
  linkStrong: { color: colors.primary, fontWeight: '700' },
  validText: { color: '#4CAF50', fontSize: 12, marginTop: 4, marginLeft: 4 },
  errorText: { color: '#F44336', fontSize: 12, marginTop: 4, marginLeft: 4 },
  mutedSmall: { color: colors.mutedText, fontSize: 12, marginTop: 4, marginLeft: 4 },
});
