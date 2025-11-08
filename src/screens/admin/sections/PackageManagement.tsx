/**
 * Package Management Section
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  searchQuery: string;
  navigation: any;
}

export default function PackageManagement({ searchQuery, navigation }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Package Management</Text>
      <Text style={styles.comingSoon}>🚧 Coming Soon!</Text>
      <Text style={styles.description}>
        Package approval, editing, and removal functionality will be available here.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 400,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3C3C3B',
    fontFamily: 'Poppins-Bold',
    marginBottom: 16,
  },
  comingSoon: {
    fontSize: 48,
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    color: '#757574',
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
  },
});

