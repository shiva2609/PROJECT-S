import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DrawerContentScrollView, DrawerContentComponentProps } from '@react-navigation/drawer';
import { useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/Ionicons';
import { DrawerHeader } from './DrawerHeader';
import { DrawerItem } from './DrawerItem';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { useAuth } from '../../providers/AuthProvider';
import { db } from '../../core/firebase';
import { doc, onSnapshot } from '../../core/firebase/compat';
import { AccountType, VerificationStatus } from '../../types/account';
import { handleLogout, handleUpgradeAccount } from '../../utils/accountActions';
import { DRAWER_MENU, MenuItemConfig } from '../../navigation/drawerMenu';

export default function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { navigation, state } = props;
  const { user, authReady } = useAuth();
  const dispatch = useDispatch();

  const currentRoute = state.routes[state.index]?.name;
  const [accountType, setAccountType] = useState<AccountType>('Traveler');
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('none');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [roleChecked, setRoleChecked] = useState(false);

  // Fetch user account type and verification status for conditional rendering
  useEffect(() => {
    if (!user) {
      setAccountType('Traveler');
      setVerificationStatus('none');
      setIsSuperAdmin(false);
      setRoleChecked(true);
      return;
    }

    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(
      userRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const accType = (data.accountType || data.role || 'Traveler') as AccountType;
          const verStatus = (data.verificationStatus || 'none') as VerificationStatus;

          setAccountType(accType);
          setVerificationStatus(verStatus);
          // Check if role is explicitly super_admin or matches specific super admin logic if needed
          setIsSuperAdmin(accType === 'super_admin' || data.role === 'superAdmin');
        } else {
          setAccountType('Traveler');
          setVerificationStatus('none');
          setIsSuperAdmin(false);
        }
        setRoleChecked(true);
      },
      (error) => {
        console.error('❌ CustomDrawerContent - Error fetching user data:', error);
        setAccountType('Traveler');
        setRoleChecked(true);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleNavigate = (routeName: string, params?: any) => {
    navigation.navigate(routeName, params);
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

  const isPending = verificationStatus === 'pending';
  // isSuperAdmin value is now from state

  // Generate Menu Groups based on Roles
  const menuGroups = useMemo(() => {
    // 1. Filter Groups (Super Admin vs Common)
    const relevantGroups = DRAWER_MENU.filter(group => {
      if (isSuperAdmin) {
        return group.superAdminOnly === true;
      } else {
        return !group.superAdminOnly;
      }
    });

    // 2. Filter Items within Groups (Role Checks)
    return relevantGroups.map(group => {
      const filteredItems = group.items.filter(item => {
        // Check Allowed Roles (if property exists)
        if (item.allowedRoles && !item.allowedRoles.includes(accountType)) {
          return false;
        }

        // Check Excluded Roles (if property exists)
        if (item.excludedRoles && item.excludedRoles.includes(accountType)) {
          return false;
        }

        return true;
      });

      return {
        ...group,
        items: filteredItems
      };
    }).filter(group => group.items.length > 0); // Remove empty groups
  }, [isSuperAdmin, accountType]);

  const handleItemPress = (item: MenuItemConfig) => {
    if (item.action === 'logout') {
      handleLogoutPress();
    } else if (item.action === 'upgrade') {
      handleUpgradePress();
    } else if (item.routeName) {
      if (item.dashboardSection) {
        handleNavigate(item.routeName, { section: item.dashboardSection });
      } else {
        handleNavigate(item.routeName);
      }
    }
  };

  // Don't render menu until role check is complete
  if (!roleChecked || !user) {
    return (
      <View style={styles.container}>
        <DrawerContentScrollView
          {...props}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <Text style={{ color: Colors.black.secondary, fontSize: 14 }}>Loading...</Text>
          </View>
        </DrawerContentScrollView>
      </View>
    );
  }

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
                  onPress={() => handleItemPress(item)}
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
            <Text style={styles.versionText}>v1.1.1 Beta</Text>
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
