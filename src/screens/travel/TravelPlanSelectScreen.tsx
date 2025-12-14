import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { useAuth } from '../../providers/AuthProvider';

export default function TravelPlanSelectScreen() {
  const navigation = useNavigation();
  const { user, userProfile } = useAuth();

  useEffect(() => {
    // Safety Net: Automatic redirect for users who already have a plan or completed onboarding,
    // in case they land here by mistake (AppNavigator should handle this, but this is a fail-safe).
    const hasPlan = userProfile?.travelPlan && Array.isArray(userProfile.travelPlan) && userProfile.travelPlan.length > 0;
    const completedOnboarding = userProfile?.onboardingComplete;

    if (hasPlan || completedOnboarding) {
      // Use replace to ensure back button doesn't come here
      navigation.replace('MainTabs');
    }
  }, [user, userProfile, navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Select Your Travel Plan</Text>
        <Text style={styles.subtitle}>
          This screen is a placeholder. Travel plan selection functionality will be implemented here.
        </Text>
        {/* Skip button removed to enforce flow for new users */}
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
