import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../utils/colors';
import Icon from 'react-native-vector-icons/Ionicons';
import { AccountType, ACCOUNT_TYPE_METADATA } from '../types/account';

const UPGRADEABLE_TYPES: AccountType[] = [
  'Host',
  'Agency',
  'AdventurePro',
  'Creator',
  'StayHost',
  'RideCreator',
  'EventOrganizer',
];

export default function RoleUpgradeScreen({ navigation }: any) {
  const [selectedType, setSelectedType] = useState<AccountType | null>(null);

  const handleNext = () => {
    if (!selectedType) {
      return;
    }
    // Navigate to AccountChangeFlowScreen with the selected role
    navigation.navigate('AccountChangeFlow', {
      toRole: selectedType,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Upgrade Account</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Select Role</Text>
        <Text style={styles.sectionDescription}>
          Choose the account type you want to upgrade to. You'll be guided through the verification process.
        </Text>

        <View style={styles.grid}>
          {UPGRADEABLE_TYPES.map((type) => {
            const meta = ACCOUNT_TYPE_METADATA[type];
            const selected = selectedType === type;
            return (
              <TouchableOpacity
                key={type}
                style={[
                  styles.roleCard,
                  selected && { borderColor: meta.color, borderWidth: 2, backgroundColor: `${meta.color}15` },
                ]}
                onPress={() => setSelectedType(type)}
              >
                <Text style={[styles.roleTag, { color: meta.color }]}>{meta.tag}</Text>
                <Text style={styles.roleName}>{meta.displayName}</Text>
                {selected && (
                  <View style={[styles.selectedIndicator, { backgroundColor: meta.color }]}>
                    <Icon name="checkmark" size={16} color="white" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {selectedType && (
          <TouchableOpacity
            style={[styles.nextButton, { backgroundColor: ACCOUNT_TYPE_METADATA[selectedType].color }]}
            onPress={handleNext}
          >
            <Text style={styles.nextButtonText}>Continue</Text>
            <Icon name="chevron-forward" size={20} color="white" />
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    marginTop: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.mutedText,
    marginBottom: 24,
    lineHeight: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  roleCard: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
    minHeight: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleTag: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  roleName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});




