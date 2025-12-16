/**
 * Global User Types
 * 
 * Types for user data used across the entire app
 */

export interface UserPublicInfo {
  uid: string;
  username: string;
  displayName: string;
  photoURL: string;
  bio?: string;
  verified?: boolean;
  email?: string;
  accountType?: string;
  aboutMe?: string;
  travelPlan?: any[];
  onboardingComplete?: boolean;
  isNewUser?: boolean;
}

export interface UserCounts {
  followers: number;
  following: number;
  posts: number;
}

export interface UserData {
  user: UserPublicInfo | null;
  posts: any[]; // Post[] from types/firestore
  counts: UserCounts;
  isFollowing: boolean;
  loading: boolean;
}


