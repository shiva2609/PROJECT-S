import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { handleLogout } from '../../utils/accountActions';

export default function LogoutScreen() {
  const navigation = useNavigation();
  const dispatch = useDispatch();

  useEffect(() => {
    handleLogout(navigation, dispatch);
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.brand.primary} />
      <Text style={styles.text}>Logging out...</Text>
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
  text: {
    marginTop: 16,
    fontFamily: Fonts.medium,
    fontSize: 16,
    color: Colors.black.secondary,
  },
});

