import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../utils/colors';
import Icon from 'react-native-vector-icons/Feather'; // ✅ Feather icons

export default function PasswordChangedScreen({ navigation, route }: any) {
  const isResetEmailSent = route?.params?.isResetEmailSent === true;

  const title = isResetEmailSent ? 'Reset Email Sent!' : 'Password Changed!';
  const subtitle = isResetEmailSent
    ? "Password reset link sent! Check your inbox to reset your password."

    : 'Your password has been changed successfully.';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* ✅ New Badge with Icon */}
        <View style={styles.badgeContainer}>
       <Image source={require('../../assets/images/wavyBadge.png')} style={styles.badgeImage} />
</View>


        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.replace('AuthLogin')}>
          <Text style={styles.primaryBtnText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  // ✅ Updated Badge style to look like your 2nd image
  badge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFEADF', // Accent Peach background
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },

  title: {
    fontSize: 22,
    fontWeight: '500',
    color: colors.primary,
    fontFamily: 'Poppins-Bold',
  },
  subtitle: {
    fontSize: 14,
    color: colors.mutedText,
    textAlign: 'center',
    marginTop: 8,
    fontFamily: 'Poppins-Regular',
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 28,
    width: '100%',
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
  },
  badgeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    width: 140,
    height: 140,
  },
  badgeImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
    position: 'absolute',
  },
  badgeIcon: {
    position: 'absolute',
    top: '35%',
  },
  
  
});
