import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SmartImage } from '../common/SmartImage';
import Icon from 'react-native-vector-icons/Ionicons';

interface MemberListItemProps {
  userId: string;
  username: string;
  name?: string;
  photoUrl?: string;
  role?: 'admin' | 'member';
  isSelected?: boolean;
  onPress: (userId: string) => void;
  showCheckbox?: boolean;
  showRole?: boolean;
  disabled?: boolean;
}

export default function MemberListItem({
  userId,
  username,
  name,
  photoUrl,
  role,
  isSelected = false,
  onPress,
  showCheckbox = false,
  showRole = false,
  disabled = false,
}: MemberListItemProps) {
  // Logic to determine initials for placeholder
  const displayName = name || username || 'User';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <TouchableOpacity
      style={[styles.container, disabled && styles.containerDisabled]}
      onPress={() => !disabled && onPress(userId)}
      activeOpacity={disabled ? 1 : 0.7}
      disabled={disabled}
    >
      {photoUrl ? (
        <SmartImage uri={photoUrl} style={styles.avatar} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarPlaceholderText}>{initial}</Text>
        </View>
      )}

      <View style={styles.info}>
        <Text style={styles.username} numberOfLines={1}>
          {displayName}
        </Text>
        {name && (
          <Text style={styles.handle} numberOfLines={1}>
            @{username}
          </Text>
        )}
        {showRole && role === 'admin' && (
          <Text style={styles.roleLabel}>Admin</Text>
        )}
      </View>

      {showCheckbox && (
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && <Icon name="checkmark" size={16} color="#FFFFFF" />}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  containerDisabled: {
    opacity: 0.5,
    backgroundColor: '#F5F5F5',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E87A5D', // Brand Orange
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  avatarPlaceholderText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'System',
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  username: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1C',
    fontFamily: 'System',
  },
  handle: {
    fontSize: 13,
    color: '#666666',
    marginTop: 2,
    fontFamily: 'System',
  },
  roleLabel: {
    fontSize: 11,
    color: '#E87A5D',
    fontWeight: '600',
    marginTop: 2,
    fontFamily: 'System',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#CCCCCC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#E87A5D',
    borderColor: '#E87A5D',
  },
});
