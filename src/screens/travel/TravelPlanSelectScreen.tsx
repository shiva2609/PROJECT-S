import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { useAuth } from '../../providers/AuthProvider';

export default function TravelPlanSelectScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [loading, setLoading] = React.useState(false);

  const handleComplete = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { updateDoc, doc } = await import('firebase/firestore');
      const { db } = await import('../../core/firebase');

      await updateDoc(doc(db, 'users', user.uid), {
        isNewUser: false,
        onboardingComplete: true,
        updatedAt: Date.now(),
      });

      // BootGate will automatically detect the change via the real-time listener in userStore
      // and update the bootState to APP_READY, which will cause AppNavigator to switch to MainTabs.
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Select Your Travel Plan</Text>
        <Text style={styles.subtitle}>
          This screen is a placeholder. Travel plan selection functionality will be implemented here.
        </Text>

        <View style={{ width: '100%', paddingHorizontal: 20 }}>
          <View style={{ backgroundColor: Colors.brand.primary, borderRadius: 12, overflow: 'hidden' }}>
            <Text
              onPress={handleComplete}
              style={{
                color: Colors.white.primary,
                fontFamily: Fonts.bold,
                fontSize: 16,
                paddingVertical: 16,
                textAlign: 'center',
              }}
            >
              {loading ? 'Setting up...' : 'Get Started'}
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white.primary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontFamily: Fonts.bold,
    color: Colors.black.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: Colors.black.secondary,
    textAlign: 'center',
    marginBottom: 32,
  },
});
