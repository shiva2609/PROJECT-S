import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../utils/colors';

export default function AccountScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Account</Text>
      <Text style={styles.note}>
        Logout and Upgrade Account have been moved to the Side Menu.
      </Text>
      <Text style={styles.note}>
        Open the menu from the top-left corner to access these options.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface, padding: 16 },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, marginTop: 24 },
  note: {
    fontSize: 14,
    color: colors.mutedText,
    marginTop: 16,
    lineHeight: 20,
  },
});
