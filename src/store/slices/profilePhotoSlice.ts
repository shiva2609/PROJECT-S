/**
 * Profile Photo Redux Slice
 * 
 * Global store for profile photos: profilePhotoMap = { [userId]: profilePhotoUrl }
 * Includes timestamp tracking for race-condition prevention
 * Automatically updated by Firestore listeners via userProfilePhotoService
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ProfilePhotoState {
  profilePhotoMap: {
    [userId: string]: string;
  };
  profilePhotoUpdatedAtMap: {
    [userId: string]: number; // Timestamp in milliseconds
  };
}

const initialState: ProfilePhotoState = {
  profilePhotoMap: {},
  profilePhotoUpdatedAtMap: {},
};

const profilePhotoSlice = createSlice({
  name: 'profilePhoto',
  initialState,
  reducers: {
    updateProfilePhoto: (state, action: PayloadAction<{ userId: string; photoUrl: string }>) => {
      const { userId, photoUrl } = action.payload;
      state.profilePhotoMap[userId] = photoUrl;
      // Update timestamp to current time if not provided
      if (!state.profilePhotoUpdatedAtMap[userId]) {
        state.profilePhotoUpdatedAtMap[userId] = Date.now();
      }
    },
    updateProfilePhotoWithTimestamp: (state, action: PayloadAction<{ userId: string; photoUrl: string; updatedAt: number }>) => {
      const { userId, photoUrl, updatedAt } = action.payload;
      // Only update if timestamp is newer (race-condition prevention)
      const existingTimestamp = state.profilePhotoUpdatedAtMap[userId];
      if (!existingTimestamp || updatedAt > existingTimestamp) {
        state.profilePhotoMap[userId] = photoUrl;
        state.profilePhotoUpdatedAtMap[userId] = updatedAt;
      }
    },
    updateMultipleProfilePhotos: (state, action: PayloadAction<{ [userId: string]: string }>) => {
      state.profilePhotoMap = {
        ...state.profilePhotoMap,
        ...action.payload,
      };
      // Update timestamps for all
      const now = Date.now();
      Object.keys(action.payload).forEach(userId => {
        if (!state.profilePhotoUpdatedAtMap[userId]) {
          state.profilePhotoUpdatedAtMap[userId] = now;
        }
      });
    },
    clearProfilePhoto: (state, action: PayloadAction<string>) => {
      const userId = action.payload;
      delete state.profilePhotoMap[userId];
      delete state.profilePhotoUpdatedAtMap[userId];
    },
    clearAllProfilePhotos: (state) => {
      state.profilePhotoMap = {};
      state.profilePhotoUpdatedAtMap = {};
    },
  },
});

export const {
  updateProfilePhoto,
  updateProfilePhotoWithTimestamp,
  updateMultipleProfilePhotos,
  clearProfilePhoto,
  clearAllProfilePhotos,
} = profilePhotoSlice.actions;

export default profilePhotoSlice.reducer;

