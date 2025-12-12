import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../utils/colors';
import { auth, firestore } from '../../services/api/firebaseConfig';
import { FontFamily } from '../../GlobalStyles';

export default function ForgotPasswordScreen({ navigation }: any) {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);

  // Check if input is an email
  const isEmail = (value: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  };

  const handleSendResetEmail = async () => {
    const trimmedIdentifier = identifier.trim();
    
    if (!trimmedIdentifier) {
      Alert.alert('Error', 'Please enter your username or email address.');
      return;
    }

    try {
      setLoading(true);

      let email: string;
      const identifierLower = trimmedIdentifier.toLowerCase();

      // Check if input is an email or username
      if (isEmail(trimmedIdentifier)) {
        // User entered an email directly
        email = identifierLower;
        console.log('📧 Using provided email:', email);
      } else {
        // User entered a username - fetch email from usernames collection
        console.log('🔍 Looking up email for username:', identifierLower);
        try {
          const usernameDoc = await firestore()
            .collection('usernames')
            .doc(identifierLower)
            .get();

          const usernameData = usernameDoc.data();
          
          if (!usernameData || !usernameData.email) {
            console.error('❌ Username not found in usernames collection');
            Alert.alert(
              'Username Not Found',
              'The username you entered was not found. Please check your username or try using your email address instead.'
            );
            setLoading(false);
            return;
          }

          email = usernameData.email;
          console.log('✅ Found email for username:', email);
        } catch (firestoreError: any) {
          console.error('❌ Firestore Error - Failed to lookup username:', {
            code: firestoreError?.code,
            message: firestoreError?.message,
            username: identifierLower,
          });
          Alert.alert(
            'Network Error',
            'Failed to look up username. Please check your connection and try again, or use your email address instead.'
          );
          setLoading(false);
          return;
        }
      }

      // Send password reset email
      console.log('📝 Sending password reset email to:', email);
      try {
        await auth().sendPasswordResetEmail(email);
        console.log('✅ Password reset email sent successfully');
        
        // Navigate to password changed screen (success confirmation)
        navigation.replace('AuthPasswordChanged', { isResetEmailSent: true });
      } catch (authError: any) {
        console.error('❌ Auth Error - Failed to send password reset email:', {
          code: authError?.code,
          message: authError?.message,
          email: email,
        });

        let errorMessage = 'Failed to send reset email. Please try again.';
        
        if (authError?.code === 'auth/user-not-found') {
          errorMessage = 'No account found with this email address. Please check your email or try using your username.';
        } else if (authError?.code === 'auth/invalid-email') {
          errorMessage = 'Invalid email address. Please check and try again.';
        } else if (authError?.code === 'auth/too-many-requests') {
          errorMessage = 'Too many reset requests. Please try again later.';
        } else if (authError?.message) {
          errorMessage = authError.message;
        }

        Alert.alert('Error', errorMessage);
      }
    } catch (error: any) {
      console.error('❌ Unexpected error in password reset:', {
        code: error?.code,
        message: error?.message,
        error: error,
      });
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Forgot Password?</Text>
        <Text style={styles.subtitle}>
          Don't worry! It happens. Please enter your username or email address linked with your account.
        </Text>

        <TextInput
          placeholder="Enter your username or email"
          placeholderTextColor={colors.mutedText}
          style={styles.input}
          autoCapitalize="none"
          keyboardType="default"
          value={identifier}
          onChangeText={setIdentifier}
          editable={!loading}
        />

        <TouchableOpacity
          style={[styles.primaryBtn, (!identifier.trim() || loading) && styles.primaryBtnDisabled]}
          onPress={handleSendResetEmail}
          disabled={!identifier.trim() || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>Send Reset Link</Text>
          )}
        </TouchableOpacity>

        <View style={styles.bottomRow}>
          <Text style={styles.muted}>Remember Password? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('AuthLogin')} disabled={loading}>
            <Text style={styles.linkStrong}>Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { paddingHorizontal: 24, paddingTop: 24 },
  title: { fontSize: 35, fontWeight: '600', fontFamily: FontFamily.poppinsExtraBold,  color: colors.primary,  },
  subtitle: { fontSize: 14, color: colors.mutedText, marginBottom: 18, lineHeight: 20, fontFamily: FontFamily.poppinsRegular, },
  input: {
    backgroundColor: colors.background,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontFamily: FontFamily.poppinsRegular,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 22,
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16, fontFamily: FontFamily.poppinsBold,  },
  bottomRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  muted: { color: colors.mutedText, fontFamily: FontFamily.poppinsRegular, },
  linkStrong: { color: colors.primary, fontFamily: FontFamily.poppinsBold, },
});

 