import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../api/authService';
import { doc, onSnapshot } from 'firebase/firestore';
import { AccountType, getAccountTypeMetadata } from '../types/account';

interface UserData {
  username?: string;
  role?: string;
  accountType?: AccountType;
  verified?: boolean;
  explorerPoints?: number;
  photoURL?: string;
}

interface DrawerHeaderProps {
  onExplorerPointsPress: () => void;
}

export const DrawerHeader: React.FC<DrawerHeaderProps> = ({ onExplorerPointsPress }) => {
  const { user } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setUserData({
          username: data.username || data.email?.split('@')[0] || 'Traveler',
          role: data.accountType || data.role || 'Traveler',
          accountType: (data.accountType || 'Traveler') as AccountType,
          verified: data.verificationStatus === 'verified' || data.verified === true,
          explorerPoints: data.explorerPoints || data.points || 0,
          photoURL: data.photoURL || data.avatar,
        });
      }
    });

    return () => unsubscribe();
  }, [user]);

  if (!user) return null;

  const accountType = (userData?.accountType || 'Traveler') as AccountType;
  const displayName = userData?.username || user.email?.split('@')[0] || 'Traveler';
  const isVerified = userData?.verified || false;
  const explorerPoints = userData?.explorerPoints || 0;

  // Map account types to display names using official metadata
  const getRoleDisplayName = (type: AccountType): string => {
    const metadata = getAccountTypeMetadata(type);
    return metadata.tag; // Use the official tag from metadata (TRAVELER, HOST, etc.)
  };

  const roleDisplayName = getRoleDisplayName(accountType);
  const isSuperAdmin = accountType === 'superAdmin';

  return (
    <View style={styles.wrapper}>
      {/* Stacked Background Card */}
      <View style={styles.card}>
        {/* Horizontal Layout: Avatar + Content */}
        <View style={styles.contentRow}>
          {/* Avatar on the left */}
          <View style={styles.avatarContainer}>
            {userData?.photoURL ? (
              <Image source={{ uri: userData.photoURL }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Icon name="person" size={28} color={Colors.brand.primary} />
              </View>
            )}
          </View>

          {/* Right side: Username + Badges */}
          <View style={styles.rightContent}>
            {/* Username + Verified Tick on same line */}
            <View style={styles.usernameRow}>
              <Text style={styles.username}>@{displayName}</Text>
              {isVerified && (
                <Icon name="checkmark-circle" size={18} color="#5D9A94" style={styles.verifiedIcon} />
              )}
            </View>

            {/* Role Badge + EP Badge side-by-side */}
            <View style={styles.badgesRow}>
              {/* Role Badge */}
              <View style={[styles.roleBadge, isSuperAdmin && styles.superAdminBadge]}>
                <Text style={[styles.roleText, isSuperAdmin && styles.superAdminText]}>
                  {roleDisplayName}
                </Text>
                {isSuperAdmin && (
                  <Icon name="shield-checkmark" size={10} color="#FFFFFF" style={{ marginLeft: 4 }} />
                )}
              </View>

              {/* Explorer Points Badge */}
              <TouchableOpacity
                style={styles.epBadge}
                onPress={onExplorerPointsPress}
                activeOpacity={0.7}
              >
                <Icon name="diamond-outline" size={12} color={Colors.brand.primary} />
                <Text style={styles.epText}>{explorerPoints} EP</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
  },
  card: {
    backgroundColor: '#FFFFFF', // Card Background
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 18,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    width: '100%',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.white.tertiary,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.brand.accent, // 20% opacity brand color
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightContent: {
    flex: 1,
    justifyContent: 'space-between',
    height: 56, // Match avatar height for vertical alignment
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  username: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    color: '#3C3C3B', // Username Text
  },
  verifiedIcon: {
    marginLeft: 2,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  roleBadge: {
    backgroundColor: '#DDE8FA', // Role Badge BG
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  roleText: {
    fontFamily: Fonts.medium,
    fontSize: 10,
    color: '#467CF1', // Role Text
  },
  superAdminBadge: {
    backgroundColor: '#E53935', // Red background for admin
    flexDirection: 'row',
    alignItems: 'center',
  },
  superAdminText: {
    color: '#FFFFFF', // White text for admin
    fontFamily: Fonts.bold,
  },
  epBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE2D2', // EP Badge BG
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 3,
  },
  epText: {
    fontFamily: Fonts.semibold,
    fontSize: 10,
    color: Colors.brand.primary, // #FF5C02
  },
});

