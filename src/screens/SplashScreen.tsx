import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { colors } from '../utils/colors';

type Props = {
  navigation: StackNavigationProp<any>;
};

export default function SplashScreen({ navigation }: Props) {
  const scale = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const runSplash = async () => {
      // Wait for animation
      await new Promise(resolve => setTimeout(resolve, 2000));
      // Since SplashScreen is only rendered in the Auth Stack (unauthenticated),
      // we can safely navigate to Onboarding.
      // Note: We use replace to prevent going back to splash
      navigation.replace('Onboarding1');
    };

    // Start animation
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.98,
        duration: 150,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();

    runSplash();
  }, [navigation, scale]);

  return (
    <View style={styles.container}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Text style={styles.logo}>S</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  logo: {
    fontSize: 42,
    fontWeight: '800',
    color: colors.primary,
  },
  tag: {
    marginTop: 8,
    color: colors.mutedText,
  },
});
