# React Native App Architecture Audit

**Generated:** $(date)  
**Purpose:** Complete mapping of screens, components, hooks, services, and global managers with validation checklists

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Screens Inventory](#screens-inventory)
3. [Components Inventory](#components-inventory)
4. [Hooks Inventory](#hooks-inventory)
5. [Services & API Utilities](#services--api-utilities)
6. [Global Managers](#global-managers)
7. [State Management](#state-management)
8. [Navigation Structure](#navigation-structure)
9. [Screen-by-Screen Validation Checklists](#screen-by-screen-validation-checklists)

---

## Architecture Overview

### Tech Stack
- **Framework:** React Native 0.82.1
- **Language:** TypeScript
- **State Management:** Redux Toolkit + React Context
- **Backend:** Firebase (Firestore, Auth, Storage)
- **Navigation:** React Navigation (Stack, Tab, Drawer)
- **UI Libraries:** React Native Vector Icons, Moti, Linear Gradient

### Architecture Pattern
- **Global Logic Managers:** Centralized hooks in `src/global/logic/`
- **Service Layer:** API abstraction in `src/services/`
- **Context Providers:** Auth, User, UserRelations, Messages, Theme
- **Redux Slices:** Profile, Posts, Follow State, Profile Photo

---

## Screens Inventory

### Authentication & Onboarding (8 screens)
1. **SplashScreen** (`src/screens/SplashScreen.tsx`)
   - Initial app entry point
   - Auth state check
   - Navigation routing

2. **OnboardingScreen1-4** (`src/screens/Onboarding/`)
   - User onboarding flow
   - First-time user experience

3. **LoginScreen** (`src/screens/Auth/LoginScreen.tsx`)
   - Email/username login
   - Navigation to signup/forgot password

4. **SignupScreen** (`src/screens/Auth/SignupScreen.tsx`)
   - User registration
   - Username validation
   - Email verification

5. **ForgotPasswordScreen** (`src/screens/Auth/ForgotPasswordScreen.tsx`)
   - Password reset flow

6. **ChangePasswordScreen** (`src/screens/Auth/ChangePasswordScreen.tsx`)
   - Authenticated password change

7. **PasswordChangedScreen** (`src/screens/Auth/PasswordChangedScreen.tsx`)
   - Confirmation screen

### Main Feed & Content (5 screens)
8. **HomeScreen** (`src/screens/Home/index.tsx`)
   - "For You" and "Following" feeds
   - Post listing with pagination
   - Like/comment/save interactions
   - Real-time notifications badge

9. **ExploreScreen** (`src/screens/Explore/index.tsx`)
   - Discovery feed
   - Trip exploration

10. **PostDetailScreen** (`src/screens/Post/PostDetails/index.tsx`)
    - Full post view
    - Comments section
    - Post interactions

11. **CommentsScreen** (`src/screens/Post/CommentsScreen.tsx`)
    - Comment listing
    - Add/delete comments
    - User navigation

12. **TripsScreen** (`src/screens/TripsScreen.tsx`)
    - Trip listings
    - Trip management

### Profile & Account (6 screens)
13. **ProfileScreen** (`src/screens/Profile/index.tsx`)
    - User profile display
    - Posts grid
    - Followers/following tabs
    - Follow/unfollow logic

14. **AccountScreen** (`src/screens/Account/AccountScreen.tsx`)
    - Saved posts display
    - Account management entry

15. **EditProfileScreen** (`src/screens/Account/EditProfileScreen.tsx`)
    - Profile editing
    - Bio, username updates

16. **FollowersScreen** (`src/screens/Account/FollowersScreen.tsx`)
    - Followers list
    - User navigation

17. **FollowingScreen** (`src/screens/Account/FollowingScreen.tsx`)
    - Following list
    - User navigation

18. **ProfilePhotoCropScreen** (`src/screens/Account/ProfilePhotoCropScreen.tsx`)
    - Profile photo cropping
    - Photo upload

### Create Post Flow (10 screens)
19. **CreatePostScreen** (`src/screens/Create/CreatePostScreen.tsx`)
    - Photo selection
    - Gallery access
    - Camera capture
    - Multi-image selection (max 5)

20. **PhotoSelectScreen** (`src/screens/Create/PhotoSelectScreen.tsx`)
    - Alternative photo picker

21. **UnifiedEditScreen** (`src/screens/Create/UnifiedEditScreen.tsx`)
    - Image editing
    - Crop/adjust unified

22. **CropScreen** (`src/screens/Create/CropScreen.tsx`)
    - Image cropping

23. **AdjustScreen** (`src/screens/Create/AdjustScreen.tsx`)
    - Image adjustments

24. **CropAdjustScreen** (`src/screens/Create/CropAdjustScreen.tsx`)
    - Combined crop/adjust

25. **AddPostDetailsScreen** (`src/screens/Create/AddPostDetailsScreen.tsx`)
    - Caption, location, tags

26. **AddDetailsScreen** (`src/screens/Create/AddDetailsScreen.tsx`)
    - Alternative details screen

27. **PostPreviewScreen** (`src/screens/Create/PostPreviewScreen.tsx`)
    - Post preview before publish

28. **CreateReelScreen** (`src/screens/Create/CreateReelScreen.tsx`)
    - Reel creation flow

### Chat & Messaging (3 screens)
29. **ChatsScreen** (`src/screens/Chat/ChatsScreen.tsx`)
    - Chat list
    - Unread counts

30. **MessagingScreen** (`src/screens/Chat/MessagingScreen.tsx`)
    - Individual chat
    - Message sending/receiving

31. **ChatRoom** (`src/screens/Chat/ChatRoom.tsx`)
    - Alternative chat interface

### Notifications (1 screen)
32. **NotificationsScreen** (`src/screens/Notifications/index.tsx`)
    - Notification list
    - Real-time updates

### Search (1 screen)
33. **SearchScreen** (`src/screens/Search/index.tsx`)
    - User/post search
    - Search results

### Settings (5 screens)
34. **SettingsScreen** (`src/screens/Settings/index.tsx`)
    - Settings menu

35. **AccountSettingsScreen** (`src/screens/Settings/AccountSettingsScreen.tsx`)
    - Account configuration

36. **UpgradeAccountScreen** (`src/screens/Settings/UpgradeAccountScreen.tsx`)
    - Account upgrade flow

37. **HelpSupportScreen** (`src/screens/Settings/HelpSupportScreen.tsx`)
    - Help & support

38. **TermsPoliciesScreen** (`src/screens/Settings/TermsPoliciesScreen.tsx`)
    - Terms & policies

39. **LogoutScreen** (`src/screens/Settings/LogoutScreen.tsx`)
    - Logout confirmation

### KYC & Verification (6 screens)
40. **AccountChangeFlowScreen** (`src/screens/kyc/AccountChangeFlowScreen.tsx`)
    - Account type change flow

41. **BaseVerificationScreen** (`src/screens/kyc/BaseVerificationScreen.tsx`)
    - Base verification UI

42. **HostVerification** (`src/screens/kyc/HostVerification.tsx`)
    - Host verification

43. **AgencyVerification** (`src/screens/kyc/AgencyVerification.tsx`)
    - Agency verification

44. **StayHostVerification** (`src/screens/kyc/StayHostVerification.tsx`)
    - Stay host verification

45. **CreatorVerification** (`src/screens/kyc/CreatorVerification.tsx`)
    - Creator verification

### Admin (10 screens)
46. **SuperAdminDashboardScreen** (`src/screens/admin/SuperAdminDashboardScreen.tsx`)
    - Admin dashboard

47. **AdminVerificationScreen** (`src/screens/admin/AdminVerificationScreen.tsx`)
    - Admin verification management

48. **UserManagement** (`src/screens/admin/sections/UserManagement.tsx`)
    - User management

49. **TripApprovals** (`src/screens/admin/sections/TripApprovals.tsx`)
    - Trip approval management

50. **HostVerifications** (`src/screens/admin/sections/HostVerifications.tsx`)
    - Host verification management

51. **DashboardOverview** (`src/screens/admin/sections/DashboardOverview.tsx`)
    - Admin dashboard overview

52. **Analytics** (`src/screens/admin/sections/Analytics.tsx`)
    - Analytics dashboard

53. **ReportsReviews** (`src/screens/admin/sections/ReportsReviews.tsx`)
    - Reports & reviews

54. **PackageManagement** (`src/screens/admin/sections/PackageManagement.tsx`)
    - Package management

55. **UpcomingVerifications** (`src/screens/admin/sections/UpcomingVerifications.tsx`)
    - Upcoming verifications

56. **Settings** (`src/screens/admin/sections/Settings.tsx`)
    - Admin settings

### Tools & Utilities (5 screens)
57. **DashboardScreen** (`src/screens/Tools/DashboardScreen.tsx`)
    - Tools dashboard

58. **HostToolsScreen** (`src/screens/Tools/HostToolsScreen.tsx`)
    - Host-specific tools

59. **TravelerCardScreen** (`src/screens/Tools/TravelerCardScreen.tsx`)
    - Traveler card

60. **NearYouScreen** (`src/screens/Tools/NearYouScreen.tsx`)
    - Location-based features

61. **ItineraryBuilderScreen** (`src/screens/Tools/ItineraryBuilderScreen.tsx`)
    - Itinerary creation

### Rewards (2 screens)
62. **ExplorerWalletScreen** (`src/screens/Rewards/ExplorerWalletScreen.tsx`)
    - Wallet display

63. **AchievementsScreen** (`src/screens/Rewards/AchievementsScreen.tsx`)
    - Achievements display

### Account Management (2 screens)
64. **RoleUpgradeScreen** (`src/screens/Account/RoleUpgradeScreen.tsx`)
    - Role upgrade flow

65. **TravelPlanSelectScreen** (`src/screens/Travel/TravelPlanSelectScreen.tsx`)
    - Travel plan selection

**Total: 65 screens**

---

## Components Inventory

### Post Components (6)
- **PostCard** (`src/components/post/PostCard.tsx`)
  - Main post display
  - Like/comment/save actions
  - User navigation

- **PostCard/** (Subcomponents)
  - `PostHeader.tsx` - Post header with user info
  - `PostMedia.tsx` - Media display
  - `PostFooter.tsx` - Post footer
  - `PostActions.tsx` - Action buttons

- **PostCarousel** (`src/components/post/PostCarousel.tsx`)
  - Multi-image carousel

- **PostDropdown** (`src/components/post/PostDropdown.tsx`)
  - Post options menu

- **CommentCard** (`src/components/post/CommentCard.tsx`)
  - Comment display

### User Components (5)
- **UserAvatar** (`src/components/user/UserAvatar.tsx`)
  - Avatar display

- **ProfileImage** (`src/components/user/ProfileImage.tsx`)
  - Profile image component

- **UsernameChip** (`src/components/user/UsernameChip.tsx`)
  - Username display chip

- **VerifiedBadge** (`src/components/user/VerifiedBadge.tsx`)
  - Verification badge

- **UserRowCard** (`src/components/user/followers/UserRowCard.tsx`)
  - User row in lists

### Profile Components (11)
- **ProfileHeader** (`src/components/profile/ProfileHeader.tsx`)
  - Profile header section

- **BioSection** (`src/components/profile/BioSection.tsx`)
  - Bio display

- **PostsGrid** (`src/components/profile/PostsGrid.tsx`)
  - Posts grid layout

- **FollowButton** (`src/components/profile/FollowButton.tsx`)
  - Follow/unfollow button

- **MemoriesSection** (`src/components/profile/MemoriesSection.tsx`)
  - Memories display

- **ReviewsSection** (`src/components/profile/ReviewsSection.tsx`)
  - Reviews display

- **Card** (`src/components/profile/Card.tsx`)
  - Profile card wrapper

- **TabNavigator** (`src/components/profile/TabNavigator.tsx`)
  - Profile tabs

- **InputModal** (`src/components/profile/InputModal.tsx`)
  - Input modal

- **MultiSelectDropdown** (`src/components/profile/MultiSelectDropdown.tsx`)
  - Multi-select dropdown

### Create Components (12)
- **ImageTile** (`src/components/create/ImageTile.tsx`)
  - Image selection tile

- **MediaPicker** (`src/components/create/MediaPicker.tsx`)
  - Media picker

- **CropperView** (`src/components/create/CropperView.tsx`)
  - Image cropper

- **EditCropBox** (`src/components/create/EditCropBox.tsx`)
  - Crop box editor

- **PostAndReelCreator** (`src/components/create/PostAndReelCreator.tsx`)
  - Post/reel creator

- **EventCreator** (`src/components/create/EventCreator.tsx`)
  - Event creation

- **AffiliateCreator** (`src/components/create/AffiliateCreator.tsx`)
  - Affiliate creation

- **ItineraryCreator** (`src/components/create/ItineraryCreator.tsx`)
  - Itinerary creation

- **LocalTourCreator** (`src/components/create/LocalTourCreator.tsx`)
  - Local tour creation

- **StayCreator** (`src/components/create/StayCreator.tsx`)
  - Stay creation

- **RideCreator** (`src/components/create/RideCreator.tsx`)
  - Ride creation

- **CourseCreator** (`src/components/create/CourseCreator.tsx`)
  - Course creation

- **TeamCreator** (`src/components/create/TeamCreator.tsx`)
  - Team creation

- **PackageCreator** (`src/components/create/PackageCreator.tsx`)
  - Package creation

### Suggestions Components (8)
- **SuggestionCard** (`src/components/suggestions/SuggestionCard.tsx`)
  - User suggestion card

- **SuggestionCarousel** (`src/components/suggestions/SuggestionCarousel.tsx`)
  - Suggestions carousel

- **FollowingFeed** (`src/components/suggestions/FollowingFeed.tsx`)
  - Following feed display

- **FollowingSuggestions** (`src/components/suggestions/FollowingSuggestions.tsx`)
  - Following suggestions

- **ChatSuggestions** (`src/components/suggestions/ChatSuggestions.tsx`)
  - Chat suggestions

- **ContactsPermissionModal** (`src/components/suggestions/ContactsPermissionModal.tsx`)
  - Contacts permission

- **ContactsPermissionCard** (`src/components/suggestions/ContactsPermissionCard.tsx`)
  - Contacts permission card

- **ViewMoreList** (`src/components/suggestions/ViewMoreList.tsx`)
  - View more list

- **PlaceholderSuggestionCarousel** (`src/components/suggestions/PlaceholderSuggestionCarousel.tsx`)
  - Placeholder carousel

- **StackCardPlaceholder** (`src/components/suggestions/StackCardPlaceholder.tsx`)
  - Stack card placeholder

### Layout Components (5)
- **SideMenu** (`src/components/layout/SideMenu.tsx`)
  - Side menu drawer

- **CustomDrawerContent** (`src/components/layout/CustomDrawerContent.tsx`)
  - Custom drawer content

- **DrawerHeader** (`src/components/layout/DrawerHeader.tsx`)
  - Drawer header

- **DrawerItem** (`src/components/layout/DrawerItem.tsx`)
  - Drawer menu item

- **GlassHeader** (`src/components/layout/GlassHeader.tsx`)
  - Glass morphism header

### Common Components (8)
- **ConfirmationModal** (`src/components/common/ConfirmationModal.tsx`)
  - Confirmation dialogs

- **ReviewModal** (`src/components/common/ReviewModal.tsx`)
  - Review modal

- **RewardPopCard** (`src/components/common/RewardPopCard.tsx`)
  - Reward popup

- **SegmentedControl** (`src/components/common/SegmentedControl.tsx`)
  - Segmented control

- **TopicClaimAlert** (`src/components/common/TopicClaimAlert.tsx`)
  - Topic claim alert

- **UpgradeAccountModal** (`src/components/common/UpgradeAccountModal.tsx`)
  - Account upgrade modal

- **ComingSoonTemplate** (`src/components/common/ComingSoonTemplate.tsx`)
  - Coming soon placeholder

- **CustomText** (`src/components/common/CustomText.tsx`)
  - Custom text component

### Chat Components (2)
- **MessageBubble** (`src/components/chat/MessageBubble.tsx`)
  - Message bubble display

### Itinerary Components (5)
- **ItineraryCard** (`src/components/itinerary/ItineraryCard.tsx`)
  - Itinerary card

- **ChatBubble** (`src/components/itinerary/ChatBubble.tsx`)
  - Itinerary chat bubble

- **ChatInput** (`src/components/itinerary/ChatInput.tsx`)
  - Chat input

- **Header** (`src/components/itinerary/Header.tsx`)
  - Itinerary header

- **SuggestedChips** (`src/components/itinerary/SuggestedChips.tsx`)
  - Suggested chips

### UI Components (4)
- **Toast** (`src/components/ui/Toast.tsx`)
  - Toast notifications

- **LoadingOverlay** (`src/components/ui/LoadingOverlay.tsx`)
  - Loading overlay

- **Gradient** (`src/components/ui/Gradient.tsx`)
  - Gradient component

- **Moti** (`src/components/ui/Moti.tsx`)
  - Moti animations

### Upload Components (1)
- **VerificationUpload** (`src/components/upload/VerificationUpload.tsx`)
  - Verification document upload

**Total: 79 components**

---

## Hooks Inventory

### Global Logic Hooks (12)
1. **usePostFetcher** (`src/global/logic/usePostFetcher.ts`)
   - Post feed fetching
   - Pagination
   - Caching

2. **useLikesManager** (`src/global/logic/useLikesManager.ts`)
   - Like/unlike posts
   - Optimistic updates
   - Like state management

3. **useCommentsManager** (`src/global/logic/useCommentsManager.ts`)
   - Comment CRUD
   - Comment state management

4. **useFollowManager** (`src/global/logic/useFollowManager.ts`)
   - Follow/unfollow logic
   - Optimistic updates
   - Count synchronization

5. **useSaveManager** (`src/global/logic/useSaveManager.ts`)
   - Save/unsave posts
   - Saved posts management

6. **useProfileManager** (`src/global/logic/useProfileManager.ts`)
   - Profile updates
   - Profile photo changes

7. **useFollowerFetcher** (`src/global/logic/useFollowerFetcher.ts`)
   - Followers/following fetching
   - List management

8. **useNotificationManager** (`src/global/logic/useNotificationManager.ts`)
   - Notification handling
   - Unread counts

9. **useMessageManager** (`src/global/logic/useMessageManager.ts`)
   - Message handling
   - Chat management

10. **useSearchManager** (`src/global/logic/useSearchManager.ts`)
    - Search functionality
    - Search results

11. **useSuggestions** (`src/global/logic/useSuggestions.ts`)
    - User suggestions
    - Suggestion logic

12. **useMediaManager** (`src/global/logic/useMediaManager.ts`)
    - Media upload
    - Media management

13. **usePushTokenManager** (`src/global/logic/usePushTokenManager.ts`)
    - Push token management
    - Notification tokens

### Feature Hooks (15)
14. **useFollow** (`src/hooks/useFollow.ts`)
    - Follow functionality

15. **useFollowingFeed** (`src/hooks/useFollowingFeed.ts`)
    - Following feed

16. **useSuggestions** (`src/hooks/useSuggestions.ts`)
    - User suggestions

17. **useProfileData** (`src/hooks/useProfileData.ts`)
    - Profile data fetching

18. **useProfilePhoto** (`src/hooks/useProfilePhoto.ts`)
    - Profile photo management

19. **useKYCManager** (`src/hooks/useKYCManager.ts`)
    - KYC verification flow

20. **useRewardOnboarding** (`src/hooks/useRewardOnboarding.ts`)
    - Reward onboarding

21. **useTopicClaimStatus** (`src/hooks/useTopicClaimStatus.ts`)
    - Topic claim status

22. **useTopicClaimReminder** (`src/hooks/useTopicClaimReminder.ts`)
    - Topic claim reminders

23. **useCropState** (`src/hooks/useCropState.ts`)
    - Crop state management

### Admin Hooks (4)
24. **useUsers** (`src/hooks/admin/useUsers.ts`)
    - Admin user management

25. **useTrips** (`src/hooks/admin/useTrips.ts`)
    - Admin trip management

26. **useVerifications** (`src/hooks/admin/useVerifications.ts`)
    - Admin verification management

27. **useReports** (`src/hooks/admin/useReports.ts`)
    - Admin reports

### Global Utility Hooks (3)
28. **useCachedState** (`src/global/hooks/useCachedState.ts`)
    - Cached state management

29. **usePaginatedQuery** (`src/global/hooks/usePaginatedQuery.ts`)
    - Pagination utilities

30. **useToggle** (`src/global/hooks/useToggle.ts`)
    - Toggle state utility

**Total: 30 hooks**

---

## Services & API Utilities

### Auth Services (2)
1. **authService** (`src/services/auth/authService.ts`)
   - Firebase Auth integration
   - Sign up/in/out
   - Password reset
   - Username validation

2. **mockAuth** (`src/services/auth/mockAuth.ts`)
   - Mock auth for testing

### User Services (4)
3. **usersService** (`src/services/users/usersService.ts`)
   - User CRUD
   - User fetching
   - Profile management

4. **profileService** (`src/services/users/profileService.ts`)
   - Profile operations
   - Profile updates

5. **userProfilePhotoService** (`src/services/users/userProfilePhotoService.ts`)
   - Profile photo upload
   - Photo management

6. **roleRequirements** (`src/services/users/roleRequirements.ts`)
   - Role requirements
   - Role validation

### Post Services (1)
7. **postsService** (`src/services/posts/postsService.ts`)
   - Post CRUD
   - Feed fetching
   - Comments management

### Follow Services (2)
8. **followService** (`src/services/follow/followService.ts`)
   - Follow operations
   - Follow state

9. **followAPI** (`src/services/follow/followAPI.ts`)
   - Follow API calls

### Like Services (1)
10. **likesService** (`src/services/likes/likesService.ts`)
    - Like/unlike operations
    - Like state

### Chat Services (3)
11. **chatService** (`src/services/chat/chatService.ts`)
    - Chat operations
    - Chat management

12. **MessagesAPI** (`src/services/chat/MessagesAPI.ts`)
    - Message API calls

13. **GroupsAPI** (`src/services/chat/GroupsAPI.ts`)
    - Group chat API

### Notification Services (4)
14. **notificationService** (`src/services/notifications/notificationService.ts`)
    - Notification operations
    - Unread counts

15. **NotificationAPI** (`src/services/notifications/NotificationAPI.ts`)
    - Notification API calls

16. **rewardNotificationService** (`src/services/notifications/rewardNotificationService.ts`)
    - Reward notifications

17. **topicNotificationService** (`src/services/notifications/topicNotificationService.ts`)
    - Topic notifications

### Itinerary Services (2)
18. **itineraryService** (`src/services/itinerary/itineraryService.ts`)
    - Itinerary CRUD
    - Itinerary management

19. **generateItinerary** (`src/services/itinerary/generateItinerary.ts`)
    - AI itinerary generation

### Other Services (6)
20. **bookingService** (`src/services/booking/bookingService.ts`)
    - Booking operations

21. **reviewService** (`src/services/review/reviewService.ts`)
    - Review operations

22. **favoriteService** (`src/services/favorite/favoriteService.ts`)
    - Favorite operations

23. **contactsService** (`src/services/contacts/contactsService.ts`)
    - Contacts management

### API Utilities (3)
24. **firebaseService** (`src/services/api/firebaseService.ts`)
    - Firebase API wrapper
    - Firestore operations
    - Storage operations

25. **firebaseConfig** (`src/services/api/firebaseConfig.ts`)
    - Firebase configuration

26. **apiClient** (`src/services/api/apiClient.ts`)
    - API client utilities

**Total: 29 services**

---

## Global Managers

### Context Providers (6)
1. **AuthProvider** (`src/app/providers/AuthProvider.tsx`)
   - Authentication state
   - User session
   - Super admin check

2. **UserProvider** (`src/app/providers/UserProvider.tsx`)
   - Current user data
   - User profile

3. **UserRelationProvider** (`src/app/providers/UserRelationProvider.tsx`)
   - Followers/following state
   - Relation updates
   - Global relation sync

4. **MessageProvider** (`src/app/providers/MessageProvider.tsx`)
   - Message state
   - Chat management

5. **ThemeProvider** (`src/app/providers/ThemeProvider.tsx`)
   - Theme management
   - Color schemes

6. **ErrorBoundary** (`src/app/providers/ErrorBoundary.tsx`)
   - Error handling
   - Error boundaries

### Redux Store (5 slices)
7. **userProfileSlice** (`src/store/slices/userProfileSlice.ts`)
   - User profile state
   - Profile caching

8. **userPostsSlice** (`src/store/slices/userPostsSlice.ts`)
   - User posts state

9. **userFollowStateSlice** (`src/store/slices/userFollowStateSlice.ts`)
   - Follow state

10. **profilePhotoSlice** (`src/store/slices/profilePhotoSlice.ts`)
    - Profile photo state

11. **useCreateFlowStore** (`src/store/stores/useCreateFlowStore.tsx`)
    - Create flow state
    - Image selection
    - Flow management

---

## State Management

### Redux Store Structure
```typescript
{
  user: { currentUser: User | null },
  posts: { items: Post[], isLoading: boolean },
  profilePhoto: ProfilePhotoState,
  userProfile: { userProfile: Record<string, ProfileData>, loading: Record<string, boolean> },
  userPosts: UserPostsState,
  userFollowState: UserFollowState
}
```

### Context Providers Hierarchy
```
ErrorBoundary
  └─ SafeAreaProvider
      └─ GestureHandlerRootView
          └─ Redux Provider
              └─ AuthProvider
                  └─ UserProvider
                      └─ UserRelationProvider
                          └─ MessageProvider
                              └─ ThemeProvider
                                  └─ CreateFlowProvider
                                      └─ AppNavigator
```

---

## Navigation Structure

### Navigation Types
- **Stack Navigator:** Main navigation
- **Tab Navigator:** Bottom tabs (Home, Explore, Create, Trips, Profile)
- **Drawer Navigator:** Side menu

### Navigation Routes
```
Splash
├─ Onboarding1-4
├─ AuthLogin
├─ AuthSignup
├─ AuthForgotPassword
├─ AuthChangePassword
├─ AuthPasswordChanged
├─ TravelPlanSelect
└─ MainTabs (Drawer)
    ├─ Home (Tab)
    ├─ Explore (Tab)
    ├─ Create (Tab)
    ├─ Trips (Tab)
    ├─ Profile (Tab)
    ├─ Dashboard (Drawer)
    ├─ Host Tools (Drawer)
    ├─ Traveler Card (Drawer)
    ├─ Sanchari's Near You (Drawer)
    ├─ Itinerary Builder (Drawer)
    ├─ Explorer Wallet (Drawer)
    ├─ Achievements (Drawer)
    ├─ Account Settings (Drawer)
    ├─ Upgrade Account (Drawer)
    ├─ Help & Support (Drawer)
    ├─ Terms & Policies (Drawer)
    ├─ Logout (Drawer)
    └─ SuperAdminDashboard (Drawer)
```

### Stack Screens
- PostDetail
- Comments
- ProfileScreen
- EditProfile
- Followers
- Chats
- Messaging
- Notifications
- CreatePostScreen
- CreateReelScreen
- UnifiedEdit
- AddDetails
- AddPostDetails
- CropAdjust
- ProfilePhotoCrop
- PhotoSelect
- PostPreview
- HostVerification
- AgencyVerification
- StayHostVerification
- CreatorVerification
- AccountChangeFlow
- AdminVerification
- RoleUpgrade

---

## Screen-by-Screen Validation Checklists

### 1. HomeScreen (`src/screens/Home/index.tsx`)

#### Backend Interactions
- ✅ Uses `usePostFetcher` → `PostsAPI.fetchFeed()`
- ✅ Uses `useLikesManager` → `LikesAPI.likePost/unlikePost()`
- ✅ Uses `useSaveManager` → Save operations
- ✅ Uses `UsersAPI.getUserById()` for user data
- ✅ Uses `listenToUnreadCounts()` for notifications

#### Global State
- ✅ Uses `useAuth()` for current user
- ✅ Uses `useUserRelations()` for following state
- ✅ Uses `usePostFetcher()` for posts
- ✅ Uses `useLikesManager()` for likes
- ✅ Uses `useSaveManager()` for saves

#### Navigation
- ✅ Navigates to `PostDetail` on post press
- ✅ Navigates to `ProfileScreen` on profile press
- ✅ Navigates to `Notifications` on notification icon
- ✅ Navigates to `Chats` on message icon
- ✅ Opens drawer on menu press
- ✅ Navigates to `Explore` from empty state

#### UI Components
- ✅ Uses `PostCard` for post display
- ✅ Uses `SegmentedControl` for tab switching
- ✅ Uses `RewardPopCard` for rewards
- ✅ Uses `TopicClaimAlert` for topic claims

#### Data Fetching
- ✅ Fetches initial posts on mount
- ✅ Fetches more posts on scroll
- ✅ Refreshes posts on pull-to-refresh
- ✅ Fetches user data for posts

#### State Updates
- ✅ Updates like state optimistically
- ✅ Updates save state optimistically
- ✅ Updates unread counts in real-time

#### Interactions
- ✅ Like/Unlike posts
- ✅ Save/Unsave posts
- ✅ Comment on posts
- ✅ Share posts
- ✅ Navigate to post details

#### Post Listing Logic
- ✅ Filters "For You" posts (excludes following)
- ✅ Shows "Following" tab with FollowingScreen
- ✅ Pagination with `hasMore` check
- ✅ Empty state handling

#### Real-time Updates
- ✅ Listens to unread counts
- ✅ Updates feed on refresh

#### Error Handling
- ⚠️ Basic error logging (needs improvement)
- ⚠️ No user-facing error messages

#### Globalisation
- ✅ Uses centralized `usePostFetcher`
- ✅ Uses centralized `useLikesManager`
- ✅ Uses centralized `useSaveManager`
- ✅ Uses `normalizePost` utility

---

### 2. ProfileScreen (`src/screens/Profile/index.tsx`)

#### Backend Interactions
- ✅ Uses `UsersAPI.getUserById()`
- ✅ Uses `PostsAPI.fetchPostsByUser()`
- ✅ Uses `useFollowManager` → `FollowAPI.followUser/unfollowUser()`
- ✅ Uses `useFollowerFetcher` → Follower/following lists

#### Global State
- ✅ Uses `useAuth()` for current user
- ✅ Uses `useUserRelations()` for follow state
- ✅ Uses `useFollowManager()` for follow operations
- ✅ Uses `useProfileManager()` for profile updates

#### Navigation
- ✅ Navigates to `EditProfile` on edit press
- ✅ Navigates to `PostDetail` on post press
- ✅ Navigates to `ProfileScreen` on user press
- ✅ Goes back on back press

#### UI Components
- ✅ Uses `UserAvatar` for profile photo
- ✅ Uses `FollowButton` for follow/unfollow
- ✅ Custom tabs for posts/followers/following

#### Data Fetching
- ✅ Fetches profile data on mount
- ✅ Fetches posts on mount
- ✅ Fetches followers/following on tab change

#### State Updates
- ✅ Updates follow state optimistically
- ✅ Updates follower/following counts

#### Interactions
- ✅ Follow/Unfollow users
- ✅ View posts grid
- ✅ View followers list
- ✅ View following list

#### Follow/Unfollow Logic
- ✅ Uses `useFollowManager` for follow operations
- ✅ Optimistic updates
- ✅ Count synchronization

#### Error Handling
- ⚠️ Basic error logging
- ⚠️ Shows "User not found" message

#### Globalisation
- ✅ Uses centralized `useFollowManager`
- ✅ Uses centralized `useProfileManager`
- ✅ Uses centralized `useFollowerFetcher`

---

### 3. PostDetailScreen (`src/screens/Post/PostDetails/index.tsx`)

#### Backend Interactions
- ✅ Uses `PostsAPI.getPostById()`
- ✅ Uses `useCommentsManager` → `PostsAPI.getComments/addComment()`
- ✅ Uses `useLikesManager` → Like operations
- ✅ Uses `useSaveManager` → Save operations

#### Global State
- ✅ Uses `useAuth()` for current user
- ✅ Uses `useCommentsManager()` for comments
- ✅ Uses `useLikesManager()` for likes
- ✅ Uses `useSaveManager()` for saves

#### Navigation
- ✅ Navigates to `Comments` screen
- ✅ Navigates to `ProfileScreen` on profile press
- ✅ Goes back on back press

#### UI Components
- ✅ Uses `PostCard` or custom post display
- ✅ Uses `CommentCard` for comments

#### Data Fetching
- ✅ Fetches post data on mount
- ✅ Fetches comments on mount

#### State Updates
- ✅ Updates like state
- ✅ Updates save state
- ✅ Updates comment count

#### Interactions
- ✅ Like/Unlike posts
- ✅ Save/Unsave posts
- ✅ Add comments
- ✅ View comments

#### Error Handling
- ⚠️ Basic error handling

#### Globalisation
- ✅ Uses centralized `useCommentsManager`
- ✅ Uses centralized `useLikesManager`
- ✅ Uses centralized `useSaveManager`

---

### 4. CommentsScreen (`src/screens/Post/CommentsScreen.tsx`)

#### Backend Interactions
- ✅ Uses `useCommentsManager` → `PostsAPI.getComments/addComment/deleteComment()`

#### Global State
- ✅ Uses `useAuth()` for current user
- ✅ Uses `useCommentsManager()` for comments

#### Navigation
- ✅ Navigates to `ProfileScreen` on user press
- ✅ Goes back on back press

#### UI Components
- ✅ Uses `CommentCard` for comment display

#### Data Fetching
- ✅ Fetches comments on mount

#### State Updates
- ✅ Adds comments optimistically
- ✅ Deletes comments optimistically

#### Interactions
- ✅ Add comments
- ✅ Delete comments (own comments)
- ✅ Navigate to user profiles

#### Error Handling
- ⚠️ Basic error handling

#### Globalisation
- ✅ Uses centralized `useCommentsManager`

---

### 5. CreatePostScreen (`src/screens/Create/CreatePostScreen.tsx`)

#### Backend Interactions
- ⚠️ No direct backend calls (handled in later screens)

#### Global State
- ✅ Uses `useCreateFlowStore` for image selection
- ✅ Uses `useAuth()` for current user

#### Navigation
- ✅ Navigates to `UnifiedEdit` on next press
- ✅ Goes back on close press

#### UI Components
- ✅ Uses `ImageTile` for image selection
- ✅ Custom camera tile

#### Data Fetching
- ✅ Loads photos from gallery
- ✅ Requests camera permissions

#### State Updates
- ✅ Updates selected images in store
- ✅ Resets selection on entry from outside

#### Interactions
- ✅ Select/deselect images (max 5)
- ✅ Capture photo from camera
- ✅ Navigate to edit screen

#### Error Handling
- ✅ Permission request errors
- ✅ Photo loading errors

#### Globalisation
- ✅ Uses centralized `useCreateFlowStore`

---

### 6. AccountScreen (`src/screens/Account/AccountScreen.tsx`)

#### Backend Interactions
- ✅ Uses `listenToSavedPosts()` for saved posts

#### Global State
- ✅ Uses `useAuth()` for current user

#### Navigation
- ✅ Navigates to `PostDetail` on post press
- ✅ Navigates to `Explore` from empty state

#### UI Components
- ✅ Custom post grid

#### Data Fetching
- ✅ Listens to saved posts in real-time

#### State Updates
- ✅ Updates saved posts list

#### Interactions
- ✅ View saved posts
- ✅ Navigate to post details

#### Error Handling
- ⚠️ Basic error handling

#### Globalisation
- ⚠️ Direct Firestore call (should use service)

---

### 7. EditProfileScreen (`src/screens/Account/EditProfileScreen.tsx`)

#### Backend Interactions
- ✅ Uses `UsersAPI.updateUser()`
- ✅ Uses `useProfileManager`

remainind server stopped.