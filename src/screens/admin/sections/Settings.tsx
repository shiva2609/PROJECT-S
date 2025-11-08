/**
 * Settings Section
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

interface Props {
  searchQuery: string;
  navigation: any;
  onLogout: () => void;
}

export default function Settings({ searchQuery, navigation, onLogout }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Settings</Text>

      <View style={styles.settingsList}>
        <TouchableOpacity style={styles.settingItem}>
          <Icon name="people-outline" size={24} color="#3C3C3B" />
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Manage Admin Roles</Text>
            <Text style={styles.settingDescription}>Assign and manage admin permissions</Text>
          </View>
          <Icon name="chevron-forward" size={20} color="#757574" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <Icon name="shield-outline" size={24} color="#3C3C3B" />
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Permissions</Text>
            <Text style={styles.settingDescription}>Configure system permissions</Text>
          </View>
          <Icon name="chevron-forward" size={20} color="#757574" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <Icon name="notifications-outline" size={24} color="#3C3C3B" />
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Notifications</Text>
            <Text style={styles.settingDescription}>Manage notification preferences</Text>
          </View>
          <Icon name="chevron-forward" size={20} color="#757574" />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.settingItem, styles.logoutItem]} onPress={onLogout}>
          <Icon name="log-out-outline" size={24} color="#E53935" />
          <View style={styles.settingContent}>
            <Text style={[styles.settingTitle, styles.logoutText]}>Logout</Text>
            <Text style={styles.settingDescription}>Sign out from admin dashboard</Text>
          </View>
          <Icon name="chevron-forward" size={20} color="#E53935" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3C3C3B',
    fontFamily: 'Poppins-Bold',
    marginBottom: 20,
  },
  settingsList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    gap: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3C3C3B',
    fontFamily: 'Poppins-SemiBold',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 12,
    color: '#757574',
    fontFamily: 'Poppins-Regular',
  },
  logoutItem: {
    borderTopWidth: 1,
    borderTopColor: '#EAEAEA',
    marginTop: 8,
  },
  logoutText: {
    color: '#E53935',
  },
});

