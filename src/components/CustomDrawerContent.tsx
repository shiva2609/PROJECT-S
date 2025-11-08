import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { DrawerContentScrollView, DrawerContentComponentProps } from '@react-navigation/drawer';
import { useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/Ionicons';
import { DrawerHeader } from './DrawerHeader';
import { DrawerItem } from './DrawerItem';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../api/authService';
import { doc, onSnapshot } from 'firebase/firestore';
import { AccountType, VerificationStatus } from '../types/account';
import { handleLogout, handleUpgradeAccount } from '../utils/accountActions';

interface MenuGroup {
  title: string;
  items: Array<{
    icon: string;
    label: string;
    routeName?: string;
    onPress?: () => void;
  }>;
}

export default function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { navigation, state } = props;
  const { user } = useAuth();
  const dispatch = useDispatch();
  const currentRoute = state.routes[state.index]?.name;
  const [accountType, setAccountType] = useState<AccountType>('Traveler');
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('none');

  // Fetch user account type and verification status for conditional rendering
  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const accType = (data.accountType || data.role || 'Traveler') as AccountType;
        const verStatus = (data.verificationStatus || 'none') as VerificationStatus;
        setAccountType(accType);
        setVerificationStatus(verStatus);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const handleNavigate = (routeName: string) => {
    navigation.navigate(routeName);
  };

  const handleExplorerPointsPress = () => {
    navigation.navigate('Explorer Wallet');
  };

  const handleLogoutPress = () => {
    handleLogout(navigation, dispatch);
  };

  const handleUpgradePress = () => {
    handleUpgradeAccount(navigation);
  };

  // Check if user is Explorer (Traveler) - only they can upgrade
  const isExplorer = accountType === 'Traveler';
  
  // Check if user is superAdmin
  const isSuperAdmin = accountType === 'superAdmin';
  
  // Check if verification is pending (same logic as ProfileScreen)
  const isPending = verificationStatus === 'pending';

  const menuGroups: MenuGroup[] = [
    {
      title: 'Tools',
      items: [
        { icon: 'grid-outline', label: 'Dashboard', routeName: 'Dashboard' },
        // Show Super Admin Dashboard prominently at the top for superAdmin users
        ...(isSuperAdmin ? [{ icon: 'shield-checkmark-outline', label: 'Super Admin Dashboard', onPress: () => navigation.navigate('SuperAdminDashboard') }] : []),
        { icon: 'briefcase-outline', label: 'Host Tools', routeName: 'Host Tools' },
        { icon: 'card-outline', label: 'Traveler Card', routeName: 'Traveler Card' },
        { icon: 'location-outline', label: "Sanchari's Near You", routeName: "Sanchari's Near You" },
        { icon: 'map-outline', label: 'Itinerary Builder', routeName: 'Itinerary Builder' },
      ],
    },
    {
      title: 'Rewards',
      items: [
        { icon: 'wallet-outline', label: 'Explorer Wallet', routeName: 'Explorer Wallet' },
        { icon: 'trophy-outline', label: 'Achievements', routeName: 'Achievements' },
      ],
    },
    {
      title: 'Settings',
      items: [
        { icon: 'settings-outline', label: 'Account Settings', routeName: 'Account Settings' },
        // Only show Upgrade Account for Explorer users
        ...(isExplorer ? [{ icon: 'arrow-up-circle-outline', label: 'Upgrade Account', onPress: handleUpgradePress }] : []),
        { icon: 'help-circle-outline', label: 'Help & Support', routeName: 'Help & Support' },
        { icon: 'document-text-outline', label: 'Terms & Policies', routeName: 'Terms & Policies' },
        { icon: 'log-out-outline', label: 'Logout', onPress: handleLogoutPress },
      ],
    },
  ];

  return (
    <View style={styles.container}>
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <DrawerHeader onExplorerPointsPress={handleExplorerPointsPress} />

        {/* Verification Pending Card - displayed below header when status is pending */}
        {isPending && (
          <View style={styles.verificationPendingCard}>
            <Icon name="time-outline" size={14} color={Colors.accent.amber} />
            <Text style={styles.verificationPendingText}>Verification Pending</Text>
          </View>
        )}

        {/* Menu Groups */}
        {menuGroups.map((group, groupIndex) => (
          <View key={groupIndex}>
            {groupIndex > 0 && <View style={styles.divider} />}
            <View style={styles.menuGroup}>
              <Text style={styles.groupTitle}>{group.title}</Text>
              {group.items.map((item, itemIndex) => (
                <DrawerItem
                  key={itemIndex}
                  icon={item.icon}
                  label={item.label}
                  onPress={item.onPress || (() => item.routeName && handleNavigate(item.routeName))}
                  isActive={currentRoute === item.routeName}
                />
              ))}
            </View>
          </View>
        ))}

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerContent}>
            <Text style={styles.footerText}>Made with ❤️ for Travelers</Text>
            <Text style={styles.versionText}>v1.0.0 Beta</Text>
          </View>
        </View>
      </DrawerContentScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white.secondary, // Neutral-50
  },
  scrollContent: {
    paddingTop: 10,
    paddingBottom: 20,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.white.qua, // Divider color
    marginVertical: 16,
    marginHorizontal: 20,
  },
  menuGroup: {
    paddingHorizontal: 0,
    marginBottom: 8,
  },
  groupTitle: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: Colors.black.qua,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginHorizontal: 20,
    marginTop: 8,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
  },
  footerContent: {
    alignItems: 'center',
  },
  footerText: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.black.qua,
    marginBottom: 4,
  },
  versionText: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    color: Colors.brand.secondary, // Teal
  },
  verificationPendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF4E8',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginHorizontal: 16,
    marginTop: 8,
    gap: 6,
  },
  verificationPendingText: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    color: Colors.black.secondary,
  },
});

