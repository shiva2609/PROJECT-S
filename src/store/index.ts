import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';
import profilePhotoReducer from './profilePhotoSlice';
import userProfileReducer from './userProfileSlice';
import userPostsReducer from './userPostsSlice';
import userFollowStateReducer from './userFollowStateSlice';

export type User = {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
};

export type Post = {
  id: string;
  userId: string;
  caption: string;
  mediaUrl?: string;
  createdAt: number;
};

const userSlice = createSlice({
  name: 'user',
  initialState: { currentUser: null as User | null },
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => {
      state.currentUser = action.payload;
    },
    logout: (state) => {
      state.currentUser = null;
    },
  },
});

const postsSlice = createSlice({
  name: 'posts',
  initialState: { items: [] as Post[], isLoading: false },
  reducers: {
    setPosts: (state, action: PayloadAction<Post[]>) => {
      state.items = action.payload;
    },
    addPost: (state, action: PayloadAction<Post>) => {
      state.items.unshift(action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
});

export const { setUser, logout } = userSlice.actions;
export const { setPosts, addPost, setLoading } = postsSlice.actions;

export const store = configureStore({
  reducer: {
    user: userSlice.reducer,
    posts: postsSlice.reducer,
    profilePhoto: profilePhotoReducer,
    userProfile: userProfileReducer,
    userPosts: userPostsReducer,
    userFollowState: userFollowStateReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
