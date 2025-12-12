import React from 'react';
import {
  NavigationContainer,
  DefaultTheme,
} from '@react-navigation/native';
import {
  createNativeStackNavigator,} from '@react-navigation/native-stack';
import {TransitionPresets} from '@react-navigation/stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors } from '../../utils/colors';
import { useAuth } from '../../providers/AuthProvider';

// Screens - TODO: Update paths after screen reorganization
import SplashScreen from '../../screens/SplashScreen';
import OnboardingScreen1 from '../../screens/Onboarding/OnboardingScreen1';
import OnboardingScreen2 from '../../screens/Onboarding/OnboardingScreen2';
import OnboardingScreen3 from '../../screens/Onboarding/OnboardingScreen3';
import OnboardingScreen4 from '../../screens/Onboarding/OnboardingScreen4';
import LoginScreen from '../../screens/Auth/LoginScreen';
import SignupScreen from '../../screens/Auth/SignupScreen';
import ForgotPasswordScreen from '../../screens/Auth/ForgotPasswordScreen';
import ChangePasswordScreen from '../../screens/Auth/ChangePasswordScreen';
import PasswordChangedScreen from '../../screens/Auth/PasswordChangedScreen';
import TravelPlanSelectScreen from '../../screens/Travel/TravelPlanSelectScreen';
import HomeScreen from '../../screens/Home/index';
import ExploreScreen from '../../screens/Explore/index';
import PhotoSelectScreen from '../../screens/Create/PhotoSelectScreen';
import TripsScreen from '../../screens/TripsScreen';
import ProfileScreen from '../../screens/Profile/index';
import AccountScreen from '../../screens/Account/AccountScreen';
import EditProfileScreen from '../../screens/Account/EditProfileScreen';
import AdminVerificationScreen from '../../screens/admin/AdminVerificationScreen';
import SuperAdminDashboardScreen from '../../screens/admin/SuperAdminDashboardScreen';
import DashboardScreen from '../../screens/Tools/DashboardScreen';
import RoleUpgradeScreen from '../../screens/Account/RoleUpgradeScreen';
// KYC Verification Screens
import HostVerification from '../../screens/kyc/HostVerification';
import AgencyVerification from '../../screens/kyc/AgencyVerification';
import StayHostVerification from '../../screens/kyc/StayHostVerification';
import CreatorVerification from '../../screens/kyc/CreatorVerification';
import AccountChangeFlowScreen from '../../screens/kyc/AccountChangeFlowScreen';
import MessagingScreen from '../../screens/Chat/MessagingScreen';
import ChatsScreen from '../../screens/Chat/ChatsScreen';
import NotificationsScreen from '../../screens/Notifications/index';
import PostDetailScreen from '../../screens/Post/PostDetails/index';
import CommentsScreen from '../../screens/Post/CommentsScreen';
import CropAdjustScreen from '../../screens/Create/CropAdjustScreen';
import ProfilePhotoCropScreen from '../../screens/Account/ProfilePhotoCropScreen';
import FollowersScreen from '../../screens/Account/FollowersScreen';
import AddPostDetailsScreen from '../../screens/Create/AddPostDetailsScreen';
import PostPreviewScreen from '../../screens/Create/PostPreviewScreen';
import CreatePostScreen from '../../screens/Create/CreatePostScreen';
import CreateReelScreen from '../../screens/Create/CreateReelScreen';
import UnifiedEditScreen from '../../screens/Create/UnifiedEditScreen';
import AddDetailsScreen from '../../screens/Create/AddDetailsScreen';
import DrawerNavigator from './DrawerNavigator';
import { CreateFlowProvider } from '../../store/stores/useCreateFlowStore';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

export function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedText,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopWidth: 0,
          elevation: 0,
        },
        tabBarIcon: ({ color, size }) => {
          const name =
            route.name === 'Home'
              ? 'home'
              : route.name === 'Explore'
              ? 'search'
              : route.name === 'Create'
              ? 'add-circle'
              : route.name === 'Trips'
              ? 'airplane'
              : 'person';
          return <Icon name={name} color={color} size={size} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Explore" component={ExploreScreen} />
      <Tab.Screen name="Create" component={CreatePostScreen} />
      <Tab.Screen name="Trips" component={TripsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { initialized, loading } = useAuth();

  // Wait for Firebase Auth to initialize before rendering routes
  if (!initialized || loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <CreateFlowProvider>
      <NavigationContainer
        theme={{
          ...DefaultTheme,
          colors: { ...DefaultTheme.colors, background: colors.background },
        }}
      >
        <Stack.Navigator
        screenOptions={{
          headerShown: false,
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
          animation: 'slide_from_right',
          animationDuration: 350,
        }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />

        {/* Onboarding Flow */}
        <Stack.Group
          screenOptions={{
            ...TransitionPresets.SlideFromRightIOS,
            gestureEnabled: true,
            fullScreenGestureEnabled: true,
          }}
        >
          <Stack.Screen name="Onboarding1" component={OnboardingScreen1} />
          <Stack.Screen name="Onboarding2" component={OnboardingScreen2} />
          <Stack.Screen name="Onboarding3" component={OnboardingScreen3} />
          <Stack.Screen name="Onboarding4" component={OnboardingScreen4} />
        </Stack.Group>

        {/* Auth Screens */}
        <Stack.Screen name="AuthLogin" component={LoginScreen} />
        <Stack.Screen name="AuthSignup" component={SignupScreen} />
        <Stack.Screen name="AuthForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="AuthChangePassword" component={ChangePasswordScreen} />
        <Stack.Screen name="AuthPasswordChanged" component={PasswordChangedScreen} />

        {/* Travel Select */}
        <Stack.Screen name="TravelPlanSelect" component={TravelPlanSelectScreen} />

        {/* Main Tabs - wrapped with Drawer */}
        <Stack.Screen name="MainTabs" component={DrawerNavigator} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="Account" component={AccountScreen} />
        <Stack.Screen 
          name="EditProfile" 
          component={EditProfileScreen}
          options={{
            headerShown: false,
            gestureEnabled: true,
          }}
        />
        <Stack.Screen name="AdminVerification" component={AdminVerificationScreen} />
        <Stack.Screen 
          name="SuperAdminDashboard" 
          component={SuperAdminDashboardScreen}
          options={{
            headerShown: false,
            gestureEnabled: true,
          }}
        />
        <Stack.Screen name="RoleUpgrade" component={RoleUpgradeScreen} />
        <Stack.Screen 
          name="CreatePostScreen" 
          component={CreatePostScreen}
          options={{
            headerShown: false,
            gestureEnabled: true,
          }}
        />
        <Stack.Screen 
          name="CreateReelScreen" 
          component={CreateReelScreen}
          options={{
            headerShown: false,
            gestureEnabled: true,
          }}
        />
        
        {/* KYC Verification Screens */}
        <Stack.Screen 
          name="HostVerification" 
          component={HostVerification}
          options={{ 
            headerShown: false,
            gestureEnabled: true,
          }}
        />
        <Stack.Screen 
          name="AgencyVerification" 
          component={AgencyVerification}
          options={{ 
            headerShown: false,
            gestureEnabled: true,
          }}
        />
        <Stack.Screen 
          name="StayHostVerification" 
          component={StayHostVerification}
          options={{ 
            headerShown: false,
            gestureEnabled: true,
          }}
        />
        <Stack.Screen 
          name="CreatorVerification" 
          component={CreatorVerification}
          options={{ 
            headerShown: false,
            gestureEnabled: true,
          }}
        />
        <Stack.Screen 
          name="AccountChangeFlow" 
          component={AccountChangeFlowScreen}
          options={{ 
            headerShown: false,
            gestureEnabled: true,
          }}
        />
        <Stack.Screen 
          name="Chats" 
          component={ChatsScreen}
          options={{ 
            headerShown: false,
            gestureEnabled: true,
          }}
        />
        <Stack.Screen 
          name="Messaging" 
          component={MessagingScreen}
          options={{ 
            headerShown: false,
            gestureEnabled: true,
          }}
        />
        <Stack.Screen 
          name="Notifications" 
          component={NotificationsScreen}
          options={{ 
            headerShown: false,
            gestureEnabled: true,
          }}
        />
        <Stack.Screen 
          name="PostDetail" 
          component={PostDetailScreen}
          options={{ 
            headerShown: false,
            gestureEnabled: true,
          }}
        />
        <Stack.Screen 
          name="Comments" 
          component={CommentsScreen}
          options={{ 
            headerShown: false,
            gestureEnabled: true,
          }}
        />
        <Stack.Screen 
          name="CropAdjust" 
          component={CropAdjustScreen}
          options={{ 
            headerShown: false,
            gestureEnabled: true,
          }}
        />
        <Stack.Screen 
          name="ProfilePhotoCrop" 
          component={ProfilePhotoCropScreen}
          options={{ 
            headerShown: false,
            gestureEnabled: true,
          }}
        />
        <Stack.Screen 
          name="AddPostDetails" 
          component={AddPostDetailsScreen}
          options={{ 
            headerShown: false,
            gestureEnabled: true,
          }}
        />
        <Stack.Screen 
          name="PhotoSelect" 
          component={PhotoSelectScreen}
          options={{ 
            headerShown: false,
            gestureEnabled: true,
          }}
        />
        {/* PostPreview kept for manual preview only - not used in create flow */}
        <Stack.Screen 
          name="PostPreview" 
          component={PostPreviewScreen}
          options={{ 
            headerShown: false,
            gestureEnabled: true,
          }}
        />
        {/* New Create Post Flow */}
        <Stack.Screen 
          name="CreatePost" 
          component={CreatePostScreen}
          options={{ 
            headerShown: false,
            gestureEnabled: true,
          }}
        />
        <Stack.Screen 
          name="UnifiedEdit" 
          component={UnifiedEditScreen}
          options={{ 
            headerShown: false,
            gestureEnabled: true,
          }}
        />
        <Stack.Screen 
          name="AddDetails" 
          component={AddDetailsScreen}
          options={{ 
            headerShown: false,
            gestureEnabled: true,
          }}
        />
        <Stack.Screen 
          name="Followers" 
          component={FollowersScreen}
          options={{ 
            headerShown: false,
            gestureEnabled: true,
          }}
        />
        <Stack.Screen 
          name="FollowersScreen" 
          component={FollowersScreen}
          options={{ 
            headerShown: false,
            gestureEnabled: true,
          }}
        />
        <Stack.Screen 
          name="FollowingScreen" 
          component={FollowersScreen}
          options={{ 
            headerShown: false,
            gestureEnabled: true,
          }}
        />
        <Stack.Screen 
          name="ProfileScreen" 
          component={ProfileScreen}
          options={{ 
            headerShown: false,
            gestureEnabled: true,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
    </CreateFlowProvider>
  );
}

