/**
 * Profile Header Component
 * 
 * Displays profile picture, username, full name, user tag,
 * stats (posts, followers, following), and Edit Profile button
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { ProfileData, ProfileStats } from '../../hooks/useProfileData';

interface ProfileHeaderProps {
  profileData: ProfileData | null;
  stats: ProfileStats;
  onEditPress: () => void;
}

export default function ProfileHeader({ profileData, stats, onEditPress }: ProfileHeaderProps) {
  const displayName = profileData?.fullname || 'User';
  const username = profileData?.username || 'user';
  const userTag = profileData?.userTag || `@${username}`;
  const profilePic = profileData?.profilePic;

  return (
    <View style={styles.container}>
      {/* Profile Picture */}
      <View style={styles.profilePicContainer}>
        {profilePic ? (
          <Image source={{ uri: profilePic }} style={styles.profilePic} />
        ) : (
          <View style={styles.profilePicPlaceholder}>
            <Text style={styles.profilePicText}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      {/* Username and Full Name */}
      <Text style={styles.username}>{username}</Text>
      <Text style={styles.fullName}>{displayName}</Text>
      <Text style={styles.userTag}>{userTag}</Text>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.postsCount}</Text>
          <Text style={styles.statLabel}>posts</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.followersCount}</Text>
          <Text style={styles.statLabel}>followers</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.followingCount}</Text>
          <Text style={styles.statLabel}>following</Text>
        </View>
      </View>

      {/* Edit Profile Button */}
      <TouchableOpacity style={styles.editButton} onPress={onEditPress} activeOpacity={0.8}>
        <Text style={styles.editButtonText}>Edit Profile</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: Colors.white.primary,
  },
  profilePicContainer: {
    marginBottom: 16,
  },
  profilePic: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.white.tertiary,
  },
  profilePicPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePicText: {
    fontSize: 36,
    fontFamily: Fonts.bold,
    color: Colors.white.primary,
  },
  username: {
    fontSize: 24,
    fontFamily: Fonts.bold,
    color: Colors.black.primary,
    marginBottom: 4,
  },
  fullName: {
    fontSize: 18,
    fontFamily: Fonts.semibold,
    color: Colors.black.secondary,
    marginBottom: 4,
  },
  userTag: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.black.qua,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingVertical: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.white.tertiary,
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    color: Colors.black.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.black.qua,
    textTransform: 'lowercase',
  },
  editButton: {
    backgroundColor: Colors.brand.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
    minWidth: 140,
  },
  editButtonText: {
    fontSize: 16,
    fontFamily: Fonts.semibold,
    color: Colors.white.primary,
    textAlign: 'center',
  },
});

