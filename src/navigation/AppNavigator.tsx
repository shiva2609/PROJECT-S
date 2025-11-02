import React from 'react';
import {
  NavigationContainer,
  DefaultTheme,
} from '@react-navigation/native';
import {
  createNativeStackNavigator,} from '@react-navigation/native-stack';
import {TransitionPresets} from '@react-navigation/stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors } from '../utils/colors';

// Screens
import SplashScreen from '../screens/SplashScreen';
import OnboardingScreen1 from '../screens/Onboarding/OnboardingScreen1';
import OnboardingScreen2 from '../screens/Onboarding/OnboardingScreen2';
import OnboardingScreen3 from '../screens/Onboarding/OnboardingScreen3';
import OnboardingScreen4 from '../screens/Onboarding/OnboardingScreen4';
import LoginScreen from '../screens/Auth/LoginScreen';
import SignupScreen from '../screens/Auth/SignupScreen';
import ForgotPasswordScreen from '../screens/Auth/ForgotPasswordScreen';
import ChangePasswordScreen from '../screens/Auth/ChangePasswordScreen';
import PasswordChangedScreen from '../screens/Auth/PasswordChangedScreen';
import TravelPlanSelectScreen from '../screens/travel/TravelPlanSelectScreen';
import HomeScreen from '../screens/HomeScreen';
import ExploreScreen from '../screens/ExploreScreen';
import CreatePostScreen from '../screens/CreatePostScreen';
import TripsScreen from '../screens/TripsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AccountScreen from '../screens/AccountScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function Tabs() {
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
  return (
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

        {/* Main Tabs */}
        <Stack.Screen name="MainTabs" component={Tabs} />
        <Stack.Screen name="Account" component={AccountScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
