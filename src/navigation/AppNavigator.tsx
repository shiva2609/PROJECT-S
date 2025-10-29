import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import SplashScreen from '../screens/SplashScreen';
import OnboardingScreen1 from '../screens/Onboarding/OnboardingScreen1';
import OnboardingScreen2 from '../screens/Onboarding/OnboardingScreen2';
import OnboardingScreen3 from '../screens/Onboarding/OnboardingScreen3';
import OnboardingScreen4 from '../screens/Onboarding/OnboardingScreen4';
import LoginScreen from '../screens/Auth/LoginScreen';
import SignupScreen from '../screens/Auth/SignupScreen';
import HomeScreen from '../screens/HomeScreen';
import ExploreScreen from '../screens/ExploreScreen';
import CreatePostScreen from '../screens/CreatePostScreen';
import TripsScreen from '../screens/TripsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AccountScreen from '../screens/AccountScreen';
import { colors } from '../utils/colors';


const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedText,
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
    <NavigationContainer theme={{ ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.background } }}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />

        {/* Onboarding group with smoother horizontal transitions */}
        <Stack.Group
          screenOptions={{
            cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
            transitionSpec: {
              open: { animation: 'timing', config: { duration: 350 } },
              close: { animation: 'timing', config: { duration: 300 } },
            },
          }}
        >
          <Stack.Screen name="Onboarding1" component={OnboardingScreen1} />
          <Stack.Screen name="Onboarding2" component={OnboardingScreen2} />
          <Stack.Screen name="Onboarding3" component={OnboardingScreen3} />
          <Stack.Screen name="Onboarding4" component={OnboardingScreen4} />
        </Stack.Group>

        <Stack.Screen name="AuthLogin" component={LoginScreen} />
        <Stack.Screen name="AuthSignup" component={SignupScreen} />
        <Stack.Screen name="MainTabs" component={Tabs} />
        <Stack.Screen name="Account" component={AccountScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
