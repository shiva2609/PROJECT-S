import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Dimensions } from 'react-native';
import CustomDrawerContent from '../../components/layout/CustomDrawerContent';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';

// Import the Tabs component
import { Tabs } from './AppNavigator';

// Tools Screens
import DashboardScreen from '../../screens/Tools/DashboardScreen';
import HostToolsScreen from '../../screens/Tools/HostToolsScreen';
import TravelerCardScreen from '../../screens/TravelerCard/TravelerCardScreen';
import NearYouScreen from '../../screens/Tools/NearYouScreen';
import ItineraryBuilderScreen from '../../screens/Tools/ItineraryBuilderScreen';

// Rewards Screens
import ExplorerWalletScreen from '../../screens/Rewards/ExplorerWalletScreen';
import AchievementsScreen from '../../screens/Rewards/AchievementsScreen';

// Settings Screens
import AccountSettingsScreen from '../../screens/Settings/AccountSettingsScreen';
import UpgradeAccountScreen from '../../screens/Settings/UpgradeAccountScreen';
import HelpSupportScreen from '../../screens/Settings/HelpSupportScreen';
import TermsPoliciesScreen from '../../screens/Settings/TermsPoliciesScreen';
import LogoutScreen from '../../screens/Settings/LogoutScreen';

// Admin Screens
import SuperAdminDashboardScreen from '../../screens/admin/SuperAdminDashboardScreen';

import { DrawerParamList } from './types';

const Drawer = createDrawerNavigator<DrawerParamList>();
const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.78; // 78% of screen width

export default function DrawerNavigator() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'slide',
        drawerStyle: {
          width: DRAWER_WIDTH,
          backgroundColor: Colors.white.secondary, // Neutral-50
          borderTopRightRadius: 24,
          borderBottomRightRadius: 24,
        },
        drawerActiveTintColor: Colors.brand.primary, // #FF5C02
        drawerInactiveTintColor: Colors.black.secondary, // Neutral-900
        drawerLabelStyle: {
          fontFamily: Fonts.medium,
          fontSize: 15,
        },
        overlayColor: 'rgba(0, 0, 0, 0.5)',
        swipeEnabled: true,
        swipeEdgeWidth: 50,
      }}
    >
      {/* Main Tabs as the initial screen */}
      <Drawer.Screen
        name="MainTabsContent"
        component={Tabs}
        options={{
          drawerLabel: 'Home',
          drawerItemStyle: { display: 'none' }, // Hide from drawer menu
        }}
      />

      {/* Drawer Menu Screens */}
      <Drawer.Screen name="Dashboard" component={DashboardScreen} />
      <Drawer.Screen name="Host Tools" component={HostToolsScreen} />
      <Drawer.Screen name="Traveler Card" component={TravelerCardScreen} />
      <Drawer.Screen name="Sanchari's Near You" component={NearYouScreen} />
      <Drawer.Screen name="Itinerary Builder" component={ItineraryBuilderScreen} />
      <Drawer.Screen name="Explorer Wallet" component={ExplorerWalletScreen} />
      <Drawer.Screen name="Achievements" component={AchievementsScreen} />
      <Drawer.Screen name="Account Settings" component={AccountSettingsScreen} />
      <Drawer.Screen name="Upgrade Account" component={UpgradeAccountScreen} />
      <Drawer.Screen name="Help & Support" component={HelpSupportScreen} />
      <Drawer.Screen name="Terms & Policies" component={TermsPoliciesScreen} />
      <Drawer.Screen name="Logout" component={LogoutScreen} />

      {/* Super Admin Dashboard */}
      <Drawer.Screen
        name="SuperAdminDashboard"
        component={SuperAdminDashboardScreen}
        options={{
          drawerItemStyle: { display: 'none' }, // Hide from drawer menu (shown conditionally in CustomDrawerContent)
        }}
      />
    </Drawer.Navigator>
  );
}

