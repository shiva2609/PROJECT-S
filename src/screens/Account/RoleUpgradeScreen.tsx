import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';

export default function RoleUpgradeScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={Colors.black.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Upgrade Account</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Icon name="rocket-outline" size={64} color={Colors.brand.primary} />
        </View>
        <Text style={styles.comingSoonText}>Coming Soon</Text>
        <Text style={styles.subtext}>
          We're working hard to bring you premium features and specialized roles. Stay tuned for the next update!
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.white.tertiary,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: Colors.black.primary,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 102, 0, 0.1)', // Brand primary with opacity
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  comingSoonText: {
    fontFamily: Fonts.bold,
    fontSize: 24,
    color: Colors.black.primary,
    marginBottom: 12,
  },
  subtext: {
    fontFamily: Fonts.regular,
    fontSize: 16,
    color: Colors.black.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});




