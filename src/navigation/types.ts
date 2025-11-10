/**
 * Navigation Types for React Navigation
 * 
 * Defines all navigation route names and param types
 */

export type DrawerParamList = {
  MainTabs: undefined;
  Dashboard: undefined;
  'Host Tools': undefined;
  'Traveler Card': undefined;
  "Sanchari's Near You": undefined;
  'Itinerary Builder': undefined;
  'Explorer Wallet': undefined;
  Achievements: undefined;
  'Account Settings': undefined;
  'Upgrade Account': undefined;
  'Help & Support': undefined;
  'Terms & Policies': undefined;
  Logout: undefined;
};

export type RootStackParamList = {
  Splash: undefined;
  Onboarding1: undefined;
  Onboarding2: undefined;
  Onboarding3: undefined;
  Onboarding4: undefined;
  AuthLogin: undefined;
  AuthSignup: undefined;
  AuthForgotPassword: undefined;
  AuthChangePassword: undefined;
  AuthPasswordChanged: undefined;
  TravelPlanSelect: undefined;
  MainTabs: undefined;
  Home: undefined;
  Dashboard: undefined;
  Account: undefined;
  AdminVerification: undefined;
  SuperAdminDashboard: undefined;
  RoleUpgrade: undefined;
  HostVerification: undefined;
  AgencyVerification: undefined;
  StayHostVerification: undefined;
  CreatorVerification: undefined;
  AccountChangeFlow: undefined;
  Chats: undefined;
  Messaging: {
    userId: string;
    username: string;
    profilePhoto?: string;
  };
  DrawerNavigator: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

