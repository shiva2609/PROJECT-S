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
  EditProfile: undefined;
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
  PhotoSelect: {
    mode?: 'post' | 'story' | 'reel';
  };
  CropAdjust: {
    contentType?: 'post' | 'reel';
    selectedImages: Array<{
      uri: string;
      width?: number;
      height?: number;
      id: string;
      createdAt?: number;
      type?: 'image' | 'video';
    }>;
    imageUri?: string;
    currentImageIndex?: number;
    allowMultiple?: boolean;
    croppedMedia?: Array<{
      originalUri: string;
      cropData: {
        ratio: '1:1' | '4:5' | '16:9';
        zoomScale: number;
        offsetX: number;
        offsetY: number;
        frameWidth: number;
        frameHeight: number;
      };
      finalCroppedUri?: string;
      type: 'image' | 'video';
    }>;
  };
  PostPreview: {
    croppedMedia: Array<{
      originalUri: string;
      cropData: {
        ratio: '1:1' | '4:5' | '16:9';
        zoomScale: number;
        offsetX: number;
        offsetY: number;
        frameWidth: number;
        frameHeight: number;
      };
      finalCroppedUri?: string;
      type: 'image' | 'video';
    }>;
    postType: 'post' | 'reel';
    currentIndex?: number;
  };
  AddPostDetails: {
    croppedImageUri?: string;
    originalImageUri?: string;
    croppedMedia?: Array<{
      originalUri: string;
      cropData: {
        ratio: '1:1' | '4:5' | '16:9';
        zoomScale: number;
        offsetX: number;
        offsetY: number;
        frameWidth: number;
        frameHeight: number;
      };
      finalCroppedUri?: string;
      type: 'image' | 'video';
    }>;
    contentType?: 'post' | 'reel';
    selectedImages?: Array<{
      uri: string;
      width?: number;
      height?: number;
      id: string;
      createdAt?: number;
      type?: 'image' | 'video';
    }>;
    transformData?: {
      scale: number;
      translateX: number;
      translateY: number;
    };
  };
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

