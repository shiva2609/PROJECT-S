/**
 * User Follow State Redux Slice
 * 
 * Global store for follow state: userFollowState[userId] = { isFollowing: boolean }
 * Fetched fresh on each ProfileScreen mount
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface FollowState {
  isFollowing: boolean;
  isFollowedBack: boolean; // Whether the target user follows the current user
  followerCount: number;
  followingCount: number;
  isLoading: boolean;
}

interface UserFollowStateState {
  userFollowState: {
    [userId: string]: FollowState;
  };
}

const initialState: UserFollowStateState = {
  userFollowState: {},
};

const userFollowStateSlice = createSlice({
  name: 'userFollowState',
  initialState,
  reducers: {
    setUserFollowState: (state, action: PayloadAction<{ userId: string; followState: FollowState }>) => {
      const { userId, followState } = action.payload;
      state.userFollowState[userId] = followState;
    },
    clearUserFollowState: (state, action: PayloadAction<string>) => {
      const userId = action.payload;
      delete state.userFollowState[userId];
    },
    clearAllUserFollowState: (state) => {
      state.userFollowState = {};
    },
  },
});

export const {
  setUserFollowState,
  clearUserFollowState,
  clearAllUserFollowState,
} = userFollowStateSlice.actions;

export default userFollowStateSlice.reducer;

