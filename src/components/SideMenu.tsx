import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Pressable, ScrollView, Image } from 'react-native';
import { MotiView } from 'moti';
import { BlurView } from '@react-native-community/blur';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';
import Icon from 'react-native-vector-icons/Ionicons';
import { AccountType, VerificationStatus, getAccountTypeMetadata, UserAccountData } from '../types/account';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../api/authService';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { signOut } from '../api/authService';
import { useDispatch } from 'react-redux';
import { logout } from '../store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AUTH_USER_KEY } from '../utils/constants';
import { PendingAccountChange, PendingStatus } from '../types/kyc';

const { width } = Dimensions.get('window');
const MENU_WIDTH = width * 0.75;

interface SideMenuProps {
  visible: boolean;
  onClose: () => void;
  onNavigate: (route: string) => void;
  navigation?: any;
}

interface MenuItemData {
  label: string;
  icon: string;
  route: string;
  onPress?: () => void;
}

interface MenuGroupProps {
  title: string;
  items: MenuItemData[];
}

interface ProfileMiniCardProps {
  userData: (UserAccountData & { photoURL?: string; pendingAccountChange?: PendingAccountChange }) | null;
  displayName: string;
}

interface VerificationStatusCardProps {
  pendingChange: PendingAccountChange | null | undefined;
  onPress?: () => void;
}

// Profile Mini Card Component
const ProfileMiniCard = ({ userData, displayName }: ProfileMiniCardProps) => {
  const accountType = (userData?.accountType || 'Traveler') as AccountType;
  const verificationStatus = (userData?.verificationStatus || 'none') as VerificationStatus;
  const isVerified = verificationStatus === 'verified';
  const meta = getAccountTypeMetadata(accountType);

  return (
    <View style={styles.profileCard}>
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          {userData?.photoURL ? (
            <Image source={{ uri: userData.photoURL }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Icon name="person" size={32} color={Colors.brand.primary} />
            </View>
          )}
          {isVerified && (
            <View style={styles.verifiedBadge}>
              <Icon name="checkmark-circle" size={20} color={Colors.accent.green} />
            </View>
          )}
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName} numberOfLines={1}>
            {userData?.username || displayName || 'Traveler'}
          </Text>
          <View style={styles.roleBadgeContainer}>
            <View style={[styles.roleBadge, { backgroundColor: meta.color + '20' }]}>
              <Text style={[styles.roleBadgeText, { color: meta.color }]}>
                {meta.displayName}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

// Verification Status Card Component
const VerificationStatusCard = ({ pendingChange, onPress }: VerificationStatusCardProps) => {
  // Debug logging
  console.log('VerificationStatusCard - pendingChange:', JSON.stringify(pendingChange, null, 2));
  
  if (!pendingChange) {
    console.log('VerificationStatusCard - No pending change, returning null');
    return null;
  }

  // Validate that pendingChange has required fields
  if (!pendingChange.toRole || !pendingChange.status) {
    console.log('VerificationStatusCard - Invalid pending change data:', pendingChange);
    return null;
  }

  const status = pendingChange.status as PendingStatus;
  const toRole = pendingChange.toRole;
  const toRoleMeta = getAccountTypeMetadata(toRole);
  const isApproved = status === 'approved';
  const isDisabled = isApproved;

  const getStatusConfig = () => {
    switch (status) {
      case 'in_progress':
        return {
          label: 'In Progress',
          icon: 'time-outline',
          color: Colors.brand.primary,
          bgColor: Colors.brand.primary + '15',
        };
      case 'submitted':
        return {
          label: 'Under Review',
          icon: 'hourglass-outline',
          color: Colors.accent.amber,
          bgColor: Colors.accent.amber + '15',
        };
      case 'approved':
        return {
          label: 'Approved',
          icon: 'checkmark-circle',
          color: Colors.accent.green,
          bgColor: Colors.accent.green + '15',
        };
      case 'rejected':
        return {
          label: 'Rejected',
          icon: 'close-circle',
          color: Colors.accent.red,
          bgColor: Colors.accent.red + '15',
        };
      case 'incomplete':
        return {
          label: 'Incomplete',
          icon: 'alert-circle-outline',
          color: Colors.black.qua,
          bgColor: Colors.white.tertiary,
        };
      default:
        return {
          label: 'Pending',
          icon: 'time-outline',
          color: Colors.brand.primary,
          bgColor: Colors.brand.primary + '15',
        };
    }
  };

  const statusConfig = getStatusConfig();

  const content = (
    <View style={[styles.verificationCard, isDisabled && styles.verificationCardDisabled]}>
      <View style={[styles.verificationIconContainer, { backgroundColor: statusConfig.bgColor }]}>
        <Icon name={statusConfig.icon} size={20} color={statusConfig.color} />
      </View>
      <View style={styles.verificationContent}>
        <Text style={styles.verificationTitle}>Account Upgrade</Text>
        <View style={styles.verificationDetails}>
          <View style={[styles.verificationRoleBadge, { backgroundColor: toRoleMeta.color + '20' }]}>
            <Text style={[styles.verificationRoleText, { color: toRoleMeta.color }]}>
              {toRoleMeta.displayName}
            </Text>
          </View>
          <Text style={[styles.verificationStatus, { color: statusConfig.color }]}>
            {statusConfig.label}
          </Text>
        </View>
      </View>
      {!isDisabled && (
        <Icon name="chevron-forward" size={18} color={Colors.black.qua} />
      )}
    </View>
  );

  if (isDisabled) {
    return content;
  }

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={isDisabled}
    >
      {content}
    </TouchableOpacity>
  );
};

// Menu Group Component
const MenuGroup = ({ title, items }: MenuGroupProps) => {
  if (!items || items.length === 0) return null;

  return (
    <View style={styles.menuGroup}>
      <Text style={styles.groupTitle}>{title}</Text>
      {items.map((item, index) => (
        <MenuItem
          key={index}
          icon={item.icon}
          label={item.label}
          onPress={item.onPress || (() => {})}
        />
      ))}
    </View>
  );
};

// Menu Item Component
const MenuItem = ({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) => (
  <TouchableOpacity 
    activeOpacity={0.6} 
    onPress={onPress} 
    style={styles.menuItem}
  >
    <Icon name={icon} size={22} color={Colors.brand.secondary} style={styles.menuIcon} />
    <Text style={styles.menuLabel}>{label}</Text>
    <Icon name="chevron-forward" size={18} color={Colors.black.qua} />
  </TouchableOpacity>
);

export default function SideMenu({ visible, onClose, onNavigate, navigation }: SideMenuProps) {
  const { user } = useAuth();
  const dispatch = useDispatch();
  const [userData, setUserData] = useState<(UserAccountData & { photoURL?: string }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible && user) {
      loadUserData();
      
      // Set up real-time listener for pendingAccountChange updates
      const userRef = doc(db, 'users', user.uid);
      const unsubscribe = onSnapshot(userRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data() as UserAccountData & { photoURL?: string; pendingAccountChange?: PendingAccountChange };
          console.log('SideMenu - Real-time update:', {
            hasPendingChange: !!data.pendingAccountChange,
            pendingChangeStatus: data.pendingAccountChange?.status,
            pendingChangeToRole: data.pendingAccountChange?.toRole,
          });
          setUserData(data);
        }
      }, (error) => {
        console.error('SideMenu - Error listening to user updates:', error);
      });

      return () => unsubscribe();
    }
  }, [visible, user]);

  const loadUserData = async () => {
    try {
      if (!user) {
        setLoading(false);
        return;
      }

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data() as UserAccountData & { photoURL?: string; pendingAccountChange?: PendingAccountChange };
        console.log('SideMenu - Loaded user data:', {
          hasPendingChange: !!data.pendingAccountChange,
          pendingChangeStatus: data.pendingAccountChange?.status,
          pendingChangeToRole: data.pendingAccountChange?.toRole,
        });
        setUserData(data);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      await AsyncStorage.removeItem(AUTH_USER_KEY);
      dispatch(logout());
      
      if (navigation) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Onboarding1' }],
        });
      }
      onClose();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const accountType = (userData?.accountType || 'Traveler') as AccountType;
  const isSuperAdmin = accountType === 'superAdmin';
  const isTraveler = accountType === 'Traveler';
  const showDashboard = !isTraveler;
  const showUpgrade = !isSuperAdmin;

  // Menu Groups Configuration
  const tripsItems: MenuItemData[] = [
    { label: 'My Trips', icon: 'airplane-outline', route: 'Trips' },
    { label: 'Saved Trips', icon: 'bookmark-outline', route: 'SavedTrips' },
    { label: 'Itinerary Builder', icon: 'map-outline', route: 'ItineraryBuilder' },
  ];

  const toolsItems: MenuItemData[] = [
    ...(showDashboard ? [{ label: 'Dashboard', icon: 'grid-outline', route: 'Dashboard' } as MenuItemData] : []),
    { label: "Sanchari's Near You", icon: 'location-outline', route: 'NearYou' },
  ];

  const rewardsItems: MenuItemData[] = [
    { label: 'Explorer Points Wallet', icon: 'wallet-outline', route: 'PointsWallet' },
  ];

  const settingsItems: MenuItemData[] = [
    { label: 'Account Settings', icon: 'settings-outline', route: 'Account' },
    ...(showUpgrade ? [{ label: 'Upgrade Account', icon: 'arrow-up-circle-outline', route: 'RoleUpgrade' } as MenuItemData] : []),
    { label: 'Logout', icon: 'log-out-outline', route: '', onPress: handleLogout },
  ];

  if (!visible) return null;

  const displayName = userData?.username || user?.email?.split('@')[0] || 'Traveler';

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Blurred background */}
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <BlurView blurType="light" blurAmount={12} style={StyleSheet.absoluteFill} reducedTransparencyFallbackColor={Colors.white.secondary} />
      </Pressable>

      {/* Sliding Menu */}
      <MotiView
        from={{ translateX: -MENU_WIDTH }}
        animate={{ translateX: 0 }}
        exit={{ translateX: -MENU_WIDTH }}
        transition={{ type: 'timing', duration: 320 }}
        style={styles.menuContainer}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Mini Card */}
          <ProfileMiniCard userData={userData} displayName={displayName} />

          {/* Verification Status Card */}
          <VerificationStatusCard
            pendingChange={userData?.pendingAccountChange}
            onPress={() => {
              if (userData?.pendingAccountChange?.requestId) {
                onClose();
                navigation?.navigate('AccountChangeFlow', {
                  toRole: userData.pendingAccountChange.toRole,
                  requestId: userData.pendingAccountChange.requestId,
                });
              }
            }}
          />

          {/* Divider */}
          <View style={styles.divider} />

          {/* Trips Group */}
          <MenuGroup 
            title="Trips" 
            items={tripsItems.map(item => ({
              ...item,
              onPress: () => {
                onClose();
                onNavigate(item.route);
              },
            }))}
          />

          {/* Divider */}
          <View style={styles.divider} />

          {/* Tools Group */}
          <MenuGroup 
            title="Tools" 
            items={toolsItems.map(item => ({
              ...item,
              onPress: () => {
                onClose();
                onNavigate(item.route);
              },
            }))}
          />

          {/* Divider */}
          <View style={styles.divider} />

          {/* Rewards Group */}
          <MenuGroup 
            title="Rewards" 
            items={rewardsItems.map(item => ({
              ...item,
              onPress: () => {
                onClose();
                onNavigate(item.route);
              },
            }))}
          />

          {/* Divider */}
          <View style={styles.divider} />

          {/* Settings Group */}
          <MenuGroup 
            title="Settings" 
            items={settingsItems.map(item => ({
              ...item,
              onPress: item.onPress || (() => {
                onClose();
                if (item.route) {
                  onNavigate(item.route);
                }
              }),
            }))}
          />

          {/* Version Footer */}
          <View style={styles.footer}>
            <Text style={styles.versionText}>v1.0.0</Text>
          </View>
        </ScrollView>
      </MotiView>
    </View>
  );
}

const styles = StyleSheet.create({
  menuContainer: {
    width: MENU_WIDTH,
    height: '100%',
    backgroundColor: Colors.white.secondary,
    paddingTop: 36,
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 2, height: 0 },
    shadowRadius: 12,
    elevation: 12,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  profileCard: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.white.tertiary,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.brand.primary + '20',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: Colors.white.primary,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.white.secondary,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontFamily: Fonts.semibold,
    fontSize: 18,
    color: Colors.black.primary,
    marginBottom: 6,
  },
  roleBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  roleBadgeText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.white.tertiary,
    marginVertical: 16,
    marginHorizontal: 20,
  },
  menuGroup: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  groupTitle: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: Colors.black.qua,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  menuIcon: {
    width: 28,
    marginRight: 12,
  },
  menuLabel: {
    flex: 1,
    fontFamily: Fonts.medium,
    fontSize: 15,
    color: Colors.black.primary,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    alignItems: 'center',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.black.qua,
    fontFamily: Fonts.regular,
  },
  verificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: Colors.white.primary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.white.tertiary,
  },
  verificationCardDisabled: {
    opacity: 0.6,
  },
  verificationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  verificationContent: {
    flex: 1,
  },
  verificationTitle: {
    fontFamily: Fonts.semibold,
    fontSize: 14,
    color: Colors.black.primary,
    marginBottom: 6,
  },
  verificationDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  verificationRoleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  verificationRoleText: {
    fontFamily: Fonts.medium,
    fontSize: 11,
  },
  verificationStatus: {
    fontFamily: Fonts.medium,
    fontSize: 12,
  },
});
