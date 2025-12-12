import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../../theme/colors';
import { handleUpgradeAccount } from '../../utils/accountActions';

export default function UpgradeAccountScreen() {
  const navigation = useNavigation();

  useEffect(() => {
    // Navigate to RoleUpgrade screen using shared function
    handleUpgradeAccount(navigation);
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.brand.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

