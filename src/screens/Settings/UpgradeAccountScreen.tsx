import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';

export default function UpgradeAccountScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Coming Soon</Text>
      <Text style={styles.subtext}>
        We're working hard to bring you premium features. Stay tuned!
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  text: {
    fontFamily: Fonts.semibold,
    fontSize: 18,
    color: Colors.black.primary,
    marginTop: 16,
  },
  subtext: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.black.tertiary,
    marginTop: 8,
    textAlign: 'center',
  },
});
