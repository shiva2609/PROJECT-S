import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';

interface Props {
  title: string;
}

export const ComingSoonTemplate: React.FC<Props> = ({ title }) => (
  <View style={styles.container}>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.text}>🚧 Coming Soon!</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white.secondary, // Neutral-50
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontFamily: Fonts.bold,
    color: Colors.black.secondary, // Neutral-900
    marginBottom: 10,
  },
  text: {
    fontSize: 18,
    color: Colors.brand.primary, // #FF5C02
    fontFamily: Fonts.semibold,
  },
});

