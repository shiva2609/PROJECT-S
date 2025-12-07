/**
 * User Profile Redux Slice
 * 
 * Global store for user profiles: userProfile[userId] = ProfileData
 * Fetched fresh on each ProfileScreen mount
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ProfileData {
  username: string;
  fullname: string;
  userTag: string;
  profilePic?: string;
  location?: string;
  aboutMe?: string;
  bio?: string;
  interests?: string[];
  countriesVisited?: string[];
  statesVisited?: string[];
  accountType?: string;
  verificationStatus?: string;
  verified?: boolean;
}

interface UserProfileState {
  userProfile: {
    [userId: string]: ProfileData | null;
  };
  loading: {
    [userId: string]: boolean;
  };
}

const initialState: UserProfileState = {
  userProfile: {},
  loading: {},
};

const userProfileSlice = createSlice({
  name: 'userProfile',
  initialState,
  reducers: {
    setUserProfile: (state, action: PayloadAction<{ userId: string; profile: ProfileData | null }>) => {
      const { userId, profile } = action.payload;
      state.userProfile[userId] = profile;
      state.loading[userId] = false;
    },
    setUserProfileLoading: (state, action: PayloadAction<{ userId: string; loading: boolean }>) => {
      const { userId, loading } = action.payload;
      state.loading[userId] = loading;
    },
    clearUserProfile: (state, action: PayloadAction<string>) => {
      const userId = action.payload;
      delete state.userProfile[userId];
      delete state.loading[userId];
    },
    clearAllUserProfiles: (state) => {
      state.userProfile = {};
      state.loading = {};
    },
  },
});

export const {
  setUserProfile,
  setUserProfileLoading,
  clearUserProfile,
  clearAllUserProfiles,
} = userProfileSlice.actions;

export default userProfileSlice.reducer;

