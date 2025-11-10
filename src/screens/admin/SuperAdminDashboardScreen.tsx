/**
 * Super Admin Dashboard Screen
 * 
 * Comprehensive admin dashboard for managing verifications, users, trips, reports, and more.
 * Only accessible to users with accountType === 'superAdmin'
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { auth, db } from '../../api/authService';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { handleLogout } from '../../utils/accountActions';
import { useDispatch } from 'react-redux';
import { NavigationProp, useRoute, useFocusEffect } from '@react-navigation/native';
import { BackHandler } from 'react-native';
import { Colors } from '../../theme/colors';
import { useAuth } from '../../contexts/AuthContext';

// Section Components
import DashboardOverview from './sections/DashboardOverview';
import UserManagement from './sections/UserManagement';
import HostVerifications from './sections/HostVerifications';
import TripApprovals from './sections/TripApprovals';
import ReportsReviews from './sections/ReportsReviews';
import UpcomingVerifications from './sections/UpcomingVerifications';
import PackageManagement from './sections/PackageManagement';
import Analytics from './sections/Analytics';
import Settings from './sections/Settings';

type Section = 
  | 'dashboard'
  | 'users'
  | 'host-verifications'
  | 'trip-approvals'
  | 'reports'
  | 'upcoming'
  | 'packages'
  | 'analytics'
  | 'settings';

interface Props {
  navigation: NavigationProp<any>;
}

export default function SuperAdminDashboardScreen({ navigation }: Props) {
  const dispatch = useDispatch();
  const { user, initialized, isSuperAdmin, roleChecked } = useAuth();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const routeParams = (route.params as any) || {};
  const initialSection = (routeParams.section as Section) || 'dashboard';
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<Section>(initialSection);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const DRAWER_WIDTH = 270;
  const drawerAnimation = useRef(new Animated.Value(-DRAWER_WIDTH)).current; // Drawer width
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  
  // Update active section when route params change (when navigating from drawer)
  useEffect(() => {
    const section = (route.params as any)?.section as Section;
    if (section && section !== activeSection) {
      console.log('🔄 Updating active section from route params:', section);
      setActiveSection(section);
      // Scroll to top when section changes
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }, 100);
    }
  }, [(route.params as any)?.section]);
  
  // Toggle drawer
  const toggleDrawer = React.useCallback(() => {
    setDrawerOpen((prev) => {
      const newState = !prev;
      const toValue = newState ? 0 : -DRAWER_WIDTH;
      const overlayValue = newState ? 1 : 0;
      
      Animated.parallel([
        Animated.timing(drawerAnimation, {
          toValue,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(overlayOpacity, {
          toValue: overlayValue,
          duration: 300,
          useNativeDriver: false,
        }),
      ]).start();
      
      return newState;
    });
  }, []);

  // Close drawer
  const closeDrawer = React.useCallback(() => {
    if (drawerOpen) {
      toggleDrawer();
    }
  }, [drawerOpen, toggleDrawer]);

  // Handle section change with navigation params update
  const handleSectionChange = (section: Section) => {
    console.log('📱 handleSectionChange called with:', section);
    console.log('📱 Current activeSection:', activeSection);
    
    if (section === activeSection) {
      console.log('⚠️ Already on this section, skipping');
      closeDrawer(); // Close drawer even if same section
      return; // Don't do anything if already on this section
    }
    
    console.log('✅ Setting new active section:', section);
    setActiveSection(section);
    
    // Update route params to reflect current section (for deep linking)
    try {
      navigation.setParams({ section });
    } catch (error) {
      console.warn('⚠️ Could not update route params:', error);
    }
    
    // Close drawer after selection
    closeDrawer();
    
    // Scroll to top when section changes
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }, 50);
  };
  
  // Debug: Log activeSection changes
  useEffect(() => {
    console.log('🔄 activeSection changed to:', activeSection);
  }, [activeSection]);

  // Handle back button press
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        if (drawerOpen) {
          // If drawer is open, close it instead of navigating back
          toggleDrawer();
          return true; // Prevent default back behavior
        }
        // If drawer is closed, allow normal back navigation
        return false;
      };

      // Add event listener
      const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      // Cleanup
      return () => backHandler.remove();
    }, [drawerOpen, toggleDrawer])
  );

  useEffect(() => {
    if (initialized) {
      if (user) {
        checkAdminAccess();
      } else {
        // Wait a bit for auth to initialize
        const timer = setTimeout(() => {
          if (!user && !auth.currentUser) {
            Alert.alert('Error', 'You must be logged in to access this screen.');
            navigation.goBack();
            setLoading(false);
          } else {
            checkAdminAccess();
          }
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [initialized, user]);

  const checkAdminAccess = async () => {
    try {
      // Use auth context user first, fallback to auth.currentUser
      const currentUser = user || auth.currentUser;
      if (!currentUser) {
        Alert.alert('Error', 'You must be logged in to access this screen.');
        navigation.goBack();
        setLoading(false);
        return;
      }

      // Check both users collection and adminUsers collection
      // Try multiple possible adminUsers document IDs
      const possibleAdminIds = [
        currentUser.email?.toLowerCase().split('@')[0] || 'sanchariadmin',
        'sanchariadmin',
        currentUser.uid,
      ];
      
      const [userDoc, ...adminUserDocs] = await Promise.all([
        getDoc(doc(db, 'users', currentUser.uid)),
        ...possibleAdminIds.map(id => getDoc(doc(db, 'adminUsers', id))),
      ]);
      
      // Find the first existing adminUsers document
      const adminUserDoc = adminUserDocs.find(doc => doc.exists());

      let accountType: string | null = null;
      let isAdmin = false;

      // Check users collection first
      if (userDoc.exists()) {
        const userData = userDoc.data();
        accountType = userData?.accountType || userData?.role || null;
        if (accountType === 'superAdmin') {
          isAdmin = true;
        }
      }

      // Also check adminUsers collection (fallback)
      if (!isAdmin && adminUserDoc) {
        const adminData = adminUserDoc.data();
        // Check if UID matches or role is superAdmin
        if (adminData?.uid === currentUser.uid || adminData?.role === 'superAdmin') {
          isAdmin = true;
          accountType = 'superAdmin';
          
          console.log('✅ Admin access granted via adminUsers collection');
          
          // Update users collection if it exists but doesn't have superAdmin
          if (userDoc.exists()) {
            try {
              await updateDoc(doc(db, 'users', currentUser.uid), {
                accountType: 'superAdmin',
                updatedAt: Date.now(),
              });
              console.log('✅ Updated users collection with superAdmin accountType');
            } catch (updateError: any) {
              console.warn('⚠️ Could not update users collection:', updateError?.message);
            }
          }
        }
      }
      
      console.log('🔍 Admin Access Check:', {
        uid: currentUser.uid,
        email: currentUser.email,
        accountType: accountType,
        isAdmin: isAdmin,
        userDocExists: userDoc.exists(),
        adminUserDocExists: !!adminUserDoc,
        adminUserData: adminUserDoc?.data(),
      });

      if (isAdmin) {
        setIsAdmin(true);
        setLoading(false);
      } else {
        // Show detailed error with account type info
        const errorMessage = `You do not have permission to access this screen.\n\nYour account type: ${accountType || 'Unknown'}\nRequired: superAdmin\n\nUID: ${currentUser.uid}\n\nPlease ensure your accountType is set to 'superAdmin' in the users collection.`;
        
        Alert.alert(
          'Access Denied',
          errorMessage,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
        setLoading(false);
      }
    } catch (error: any) {
      console.error('❌ Error checking admin access:', error);
      Alert.alert('Error', `Failed to verify admin access: ${error.message || 'Unknown error'}`);
      navigation.goBack();
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    // Refresh logic will be handled by individual sections
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleLogoutPress = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => handleLogout(navigation, dispatch),
        },
      ]
    );
  };

  const menuItems: Array<{ key: Section; label: string; icon: string }> = [
    { key: 'dashboard', label: 'Dashboard Overview', icon: 'home-outline' },
    { key: 'users', label: 'User Management', icon: 'people-outline' },
    { key: 'host-verifications', label: 'Host Verifications', icon: 'school-outline' },
    { key: 'trip-approvals', label: 'Trip Approvals', icon: 'briefcase-outline' },
    { key: 'reports', label: 'Reports & Reviews', icon: 'chatbubbles-outline' },
    { key: 'upcoming', label: 'Upcoming Verifications', icon: 'calendar-outline' },
    { key: 'packages', label: 'Package Management', icon: 'cube-outline' },
    { key: 'analytics', label: 'Analytics', icon: 'stats-chart-outline' },
    { key: 'settings', label: 'Settings', icon: 'settings-outline' },
  ];

  // Get current section display name
  const getCurrentSectionName = (): string => {
    const currentItem = menuItems.find(item => item.key === activeSection);
    return currentItem?.label || 'Dashboard';
  };

  const renderSection = () => {
    const commonProps = { searchQuery, navigation };
    
    console.log('🎨 Rendering section:', activeSection);
    
    switch (activeSection) {
      case 'dashboard':
        return <DashboardOverview key="dashboard" {...commonProps} />;
      case 'users':
        return <UserManagement key="users" {...commonProps} />;
      case 'host-verifications':
        return <HostVerifications key="host-verifications" {...commonProps} />;
      case 'trip-approvals':
        return <TripApprovals key="trip-approvals" {...commonProps} />;
      case 'reports':
        return <ReportsReviews key="reports" {...commonProps} />;
      case 'upcoming':
        return <UpcomingVerifications key="upcoming" {...commonProps} />;
      case 'packages':
        return <PackageManagement key="packages" {...commonProps} />;
      case 'analytics':
        return <Analytics key="analytics" {...commonProps} />;
      case 'settings':
        return <Settings key="settings" {...commonProps} onLogout={handleLogoutPress} />;
      default:
        console.warn('⚠️ Unknown section, defaulting to dashboard:', activeSection);
        return <DashboardOverview key="dashboard-default" {...commonProps} />;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF5C02" />
          <Text style={styles.loadingText}>Verifying access...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Guard: Only super admins can access this screen
  // Wait for role check to complete
  if (!roleChecked) {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF5C02" />
          <Text style={styles.loadingText}>Verifying access...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  // Check both local isAdmin state AND AuthContext isSuperAdmin
  // Only users in adminUsers collection should have access
  if (!isAdmin || !isSuperAdmin) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F5F1' }}>
        <Text style={{ fontSize: 18, fontWeight: '600', color: '#3C3C3B', marginBottom: 12 }}>
          Access Denied
        </Text>
        <Text style={{ fontSize: 14, color: '#757574', textAlign: 'center', paddingHorizontal: 40 }}>
          You don't have permission to view this section. Only super admins can access the Super Admin Dashboard.
        </Text>
        <TouchableOpacity
          style={{ marginTop: 24, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#FF5C02', borderRadius: 8 }}
          onPress={() => navigation.goBack()}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      {/* Header - Dynamic with current section name */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Icon name="arrow-back" size={24} color="#3C3C3B" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={toggleDrawer}
            activeOpacity={0.7}
          >
            <Icon name="menu" size={26} color="#FF5C02" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{getCurrentSectionName()}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIconButton}>
            <Icon name="notifications-outline" size={22} color="#3C3C3B" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerIconButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <Icon name="person-circle-outline" size={22} color="#3C3C3B" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="search-outline" size={20} color="#757574" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by username, host ID, or trip ID..."
          placeholderTextColor="#757574"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close-circle" size={20} color="#757574" />
          </TouchableOpacity>
        )}
      </View>

      {/* Overlay */}
      {drawerOpen && (
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={closeDrawer}
        >
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                opacity: overlayOpacity,
                zIndex: 999,
              },
            ]}
          />
        </TouchableOpacity>
      )}

      <View style={styles.contentContainer}>
        {/* Drawer Sidebar */}
        <Animated.View
          style={[
            styles.sidebar,
            {
              transform: [{ translateX: drawerAnimation }],
            },
          ]}
        >
          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.drawerContent}
          >
            {/* Drawer Header - Branded orange header */}
            <View style={[styles.drawerHeader, { paddingTop: 18 + insets.top }]}>
              <Text style={styles.drawerHeaderTitle}>Super Admin Dashboard</Text>
            </View>

            {/* Menu Items */}
            {menuItems.map((item) => {
              const isActive = activeSection === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.menuItem,
                    isActive && styles.menuItemActive,
                  ]}
                  onPress={() => {
                    console.log('👆 Menu item pressed:', item.key, item.label);
                    handleSectionChange(item.key);
                  }}
                  activeOpacity={0.7}
                >
                  <Icon
                    name={item.icon}
                    size={20}
                    color={isActive ? '#FF5C02' : '#757574'}
                  />
                  <Text
                    style={[
                      styles.menuItemText,
                      isActive && styles.menuItemTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
            
            {/* Logout Button */}
            <View style={styles.drawerDivider} />
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={() => {
                closeDrawer();
                handleLogoutPress();
              }}
              activeOpacity={0.7}
            >
              <Icon name="log-out-outline" size={20} color="#FF5C02" />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>

        {/* Main Content - Full Width */}
        <View style={styles.mainContent}>
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            showsVerticalScrollIndicator={false}
            key={activeSection} // Force re-render when section changes
          >
            {renderSection()}
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F5F1',
    paddingTop: 0, // Ensure no top padding
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#757574',
    fontFamily: 'Poppins-Medium',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  menuButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF5C02',
    fontFamily: 'Poppins-Bold',
    marginLeft: 4,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 12,
  },
  headerIconButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#3C3C3B',
    fontFamily: 'Poppins-Regular',
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'row',
    zIndex: 0,
  },
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0, // Starts from very top of screen
    bottom: 0,
    width: 270,
    backgroundColor: '#FFFFFF',
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    marginTop: 0, // No margin offset
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 1000,
  },
  drawerContent: {
    flexGrow: 1,
    paddingTop: 0, // Aligns to top of screen
    backgroundColor: '#FFFFFF',
  },
  drawerHeader: {
    backgroundColor: '#FF5C02',
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'flex-start',
  },
  drawerHeaderTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
  },
  drawerDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 8,
    marginHorizontal: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginVertical: 2,
    marginHorizontal: 8,
    borderRadius: 10,
    gap: 12,
    minHeight: 44,
  },
  menuItemActive: {
    backgroundColor: 'rgba(255, 92, 2, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: '#FF5C02',
  },
  menuItemText: {
    fontSize: 15,
    color: '#757574',
    fontFamily: 'Poppins-Medium',
    fontWeight: '500',
  },
  menuItemTextActive: {
    color: '#FF5C02',
    fontFamily: 'Poppins-SemiBold',
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    marginTop: 'auto',
  },
  logoutText: {
    marginLeft: 12,
    color: '#FF5C02',
    fontWeight: '600',
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
  },
  mainContent: {
    flex: 1,
    backgroundColor: '#F8F5F1',
    zIndex: 1,
  },
  scrollView: {
    flex: 1,
  },
});

