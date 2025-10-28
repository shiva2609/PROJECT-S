import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StackNavigationProp } from '@react-navigation/stack';
import { ONBOARDING_DONE_KEY } from '../utils/constants';
import { colors } from '../utils/colors';

type Props = {
  navigation: StackNavigationProp<any>;
};

export default function SplashScreen({ navigation }: Props) {
  const scale = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 1,
        duration: 900,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.98,
        duration: 200,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(async () => {
      const done = await AsyncStorage.getItem(ONBOARDING_DONE_KEY);
      if (done) {
        navigation.replace('AuthLogin');
      } else {
        navigation.replace('Onboarding1');
      }
    });
  }, [navigation, scale]);

  return (
    <View style={styles.container}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Text style={styles.logo}>Sanchari</Text>
      </Animated.View>
      <Text style={styles.tag}>Travel. Share. Discover.</Text>
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
