/**
 * MemberChip - Small chip showing selected member
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SmartImage } from '../common/SmartImage';
import Icon from 'react-native-vector-icons/Ionicons';

interface MemberChipProps {
  userId: string;
  username: string;
  photoUrl?: string;
  onRemove: (userId: string) => void;
}

export default function MemberChip({
  userId,
  username,
  photoUrl,
  onRemove,
}: MemberChipProps) {
  return (
    <View style={styles.container}>
      <SmartImage uri={photoUrl} style={styles.avatar} />
      <Text style={styles.username} numberOfLines={1}>
        {username}
      </Text>
      <TouchableOpacity
        onPress={() => onRemove(userId)}
        style={styles.removeButton}
        activeOpacity={0.7}
      >
        <Icon name="close-circle" size={18} color="#E87A5D" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(232, 122, 93, 0.15)',
    borderRadius: 20,
    paddingLeft: 4,
    paddingRight: 8,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 8,
    gap: 6,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  username: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1C1C1C',
    maxWidth: 80,
  },
  removeButton: {
    marginLeft: 2,
  },
});
