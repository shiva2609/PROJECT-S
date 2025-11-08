/**
 * Super Admin Dashboard Screen
 * 
 * Comprehensive admin dashboard for managing verifications, users, trips, reports, and more.
 * Only accessible to users with accountType === 'superAdmin'
 */

import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { auth, db } from '../../api/authService';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { handleLogout } from '../../utils/accountActions';
import { useDispatch } from 'react-redux';
import { NavigationProp } from '@react-navigation/native';
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
  const { user, initialized } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<Section>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

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

  const renderSection = () => {
    const commonProps = { searchQuery, navigation };
    
    switch (activeSection) {
      case 'dashboard':
        return <DashboardOverview {...commonProps} />;
      case 'users':
        return <UserManagement {...commonProps} />;
      case 'host-verifications':
        return <HostVerifications {...commonProps} />;
      case 'trip-approvals':
        return <TripApprovals {...commonProps} />;
      case 'reports':
        return <ReportsReviews {...commonProps} />;
      case 'upcoming':
        return <UpcomingVerifications {...commonProps} />;
      case 'packages':
        return <PackageManagement {...commonProps} />;
      case 'analytics':
        return <Analytics {...commonProps} />;
      case 'settings':
        return <Settings {...commonProps} onLogout={handleLogoutPress} />;
      default:
        return <DashboardOverview {...commonProps} />;
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

  if (!isAdmin) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Super Admin Dashboard</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIconButton}>
            <Icon name="notifications-outline" size={24} color="#3C3C3B" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerIconButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <Icon name="person-circle-outline" size={24} color="#3C3C3B" />
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

      <View style={styles.contentContainer}>
        {/* Sidebar */}
        <View style={styles.sidebar}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.menuItem,
                  activeSection === item.key && styles.menuItemActive,
                ]}
                onPress={() => setActiveSection(item.key)}
              >
                <Icon
                  name={item.icon}
                  size={20}
                  color={activeSection === item.key ? '#FF5C02' : '#757574'}
                />
                <Text
                  style={[
                    styles.menuItemText,
                    activeSection === item.key && styles.menuItemTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.menuItem, styles.logoutButton]}
              onPress={handleLogoutPress}
            >
              <Icon name="log-out-outline" size={20} color="#E53935" />
              <Text style={[styles.menuItemText, styles.logoutText]}>Logout</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          <ScrollView
            style={styles.scrollView}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            showsVerticalScrollIndicator={false}
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FF5C02',
    fontFamily: 'Poppins-Bold',
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
  },
  sidebar: {
    width: 240,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#EAEAEA',
    paddingTop: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  menuItemActive: {
    backgroundColor: 'rgba(255, 92, 2, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: '#FF5C02',
  },
  menuItemText: {
    fontSize: 14,
    color: '#757574',
    fontFamily: 'Poppins-Medium',
  },
  menuItemTextActive: {
    color: '#FF5C02',
    fontFamily: 'Poppins-SemiBold',
  },
  logoutButton: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#EAEAEA',
    paddingTop: 20,
  },
  logoutText: {
    color: '#E53935',
  },
  mainContent: {
    flex: 1,
    backgroundColor: '#F8F5F1',
  },
  scrollView: {
    flex: 1,
  },
});

