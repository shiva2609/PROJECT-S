/**
 * User Posts Redux Slice
 * 
 * Global store for user posts: userPosts[userId] = Post[]
 * Fetched fresh on each ProfileScreen mount
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Post {
  id: string;
  imageURL?: string;
  coverImage?: string;
  gallery?: string[];
  mediaUrls?: string[];
  finalCroppedUrl?: string;
  likeCount?: number;
  createdAt: number; // Serialized as milliseconds (number) for Redux compatibility
  createdBy?: string;
  userId?: string;
}

interface UserPostsState {
  userPosts: {
    [userId: string]: Post[];
  };
  loading: {
    [userId: string]: boolean;
  };
}

const initialState: UserPostsState = {
  userPosts: {},
  loading: {},
};

const userPostsSlice = createSlice({
  name: 'userPosts',
  initialState,
  reducers: {
    setUserPosts: (state, action: PayloadAction<{ userId: string; posts: Post[] }>) => {
      const { userId, posts } = action.payload;
      state.userPosts[userId] = posts;
      state.loading[userId] = false;
    },
    setUserPostsLoading: (state, action: PayloadAction<{ userId: string; loading: boolean }>) => {
      const { userId, loading } = action.payload;
      state.loading[userId] = loading;
    },
    clearUserPosts: (state, action: PayloadAction<string>) => {
      const userId = action.payload;
      delete state.userPosts[userId];
      delete state.loading[userId];
    },
    clearAllUserPosts: (state) => {
      state.userPosts = {};
      state.loading = {};
    },
  },
});

export const {
  setUserPosts,
  setUserPostsLoading,
  clearUserPosts,
  clearAllUserPosts,
} = userPostsSlice.actions;

export default userPostsSlice.reducer;

