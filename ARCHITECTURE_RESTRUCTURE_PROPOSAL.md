# React Native Architecture Restructure Proposal

## Executive Summary

This document outlines a comprehensive restructuring plan to transform the Sanchari React Native project into a clean, scalable, industry-standard architecture following best practices.

---

## 🔍 Current Issues Identified

### 1. **Duplicate Files & Logic**
- **Screens:** `HomeScreen.tsx` vs `Home/index.tsx`, `ProfileScreen.tsx` vs `Profile/index.tsx`, `ExploreScreen.tsx` vs `Explore/index.tsx`, `NotificationsScreen.tsx` vs `Notifications/index.tsx`, `PostDetailScreen.tsx` vs `PostDetails/index.tsx`
- **Components:** `FollowButton.tsx` vs `profile/FollowButton.tsx` (different implementations)
- **Hooks:** `hooks/useSuggestions.ts` vs `global/logic/useSuggestions.ts` (different implementations)
- **Contexts:** `contexts/AuthContext.tsx` vs `global/context/AuthContext.tsx` (global one is empty)

### 2. **Misplaced Files**
- **Services in utils:** `bookingService.ts`, `favoriteService.ts`, `reviewService.ts`, `contactsService.ts` → Should be in `/services`
- **API services mixed:** `notificationService.ts`, `chatService.ts`, `itineraryService.ts`, `rewardNotificationService.ts`, `topicNotificationService.ts` in `/api` → Should be in `/services`
- **Colors scattered:** `utils/colors.ts`, `theme/colors.ts`, `constants/colors.ts` → Should consolidate in `/theme`
- **Theme files in utils:** `utils/theme.ts` → Should be in `/theme`
- **Components in utils:** `utils/gradient.tsx`, `utils/moti.tsx` → Should be in `/components/ui`
- **Assets in screens:** `screens/assets/` → Should be in `/assets`

### 3. **Structure Inconsistencies**
- Screens inconsistently organized (some in folders, some flat)
- Empty folders: `global/api/`, `global/components/`, `context/`
- Navigation not in `app/navigation`
- Providers not in `app/providers`
- Mixed state management: Redux Toolkit + Zustand (`useCreateFlowStore.tsx`)

### 4. **Naming & Organization Issues**
- Inconsistent naming: `PostCard.tsx` vs `PostCard/index.tsx`
- Mixed conventions: PascalCase vs camelCase
- No centralized exports (index.ts files missing)

### 5. **Business Logic in Screens**
- Screens contain direct API calls and business logic
- No clear separation of concerns

---

## 📁 Proposed New Structure

```
src/
├── app/
│   ├── App.tsx                    # Main app entry
│   ├── navigation/
│   │   ├── AppNavigator.tsx       # Main navigator
│   │   ├── DrawerNavigator.tsx    # Drawer navigation
│   │   └── types.ts               # Navigation types
│   └── providers/
│       ├── index.tsx              # All providers combined
│       ├── AuthProvider.tsx       # Auth context provider
│       ├── ThemeProvider.tsx      # Theme context provider
│       ├── UserProvider.tsx       # User context provider
│       ├── MessageProvider.tsx    # Message context provider
│       └── UserRelationProvider.tsx # User relations provider
│
├── screens/
│   ├── Auth/
│   │   ├── index.tsx              # Auth screen router
│   │   ├── LoginScreen.tsx
│   │   ├── SignupScreen.tsx
│   │   ├── ForgotPasswordScreen.tsx
│   │   ├── ChangePasswordScreen.tsx
│   │   └── PasswordChangedScreen.tsx
│   ├── Onboarding/
│   │   ├── OnboardingScreen1.tsx
│   │   ├── OnboardingScreen2.tsx
│   │   ├── OnboardingScreen3.tsx
│   │   └── OnboardingScreen4.tsx
│   ├── Home/
│   │   └── index.tsx              # Keep Home/index.tsx (remove HomeScreen.tsx)
│   ├── Explore/
│   │   └── index.tsx              # Keep Explore/index.tsx (remove ExploreScreen.tsx)
│   ├── Search/
│   │   └── index.tsx
│   ├── Profile/
│   │   ├── index.tsx              # Keep Profile/index.tsx (remove ProfileScreen.tsx)
│   │   ├── EditProfileScreen.tsx
│   │   ├── FollowersScreen.tsx
│   │   └── FollowingScreen.tsx
│   ├── Post/
│   │   ├── PostDetails/
│   │   │   └── index.tsx          # Keep PostDetails/index.tsx (remove PostDetailScreen.tsx)
│   │   ├── CreatePostScreen.tsx
│   │   ├── PostPreviewScreen.tsx
│   │   └── CommentsScreen.tsx
│   ├── Chat/
│   │   ├── index.tsx
│   │   └── ChatRoom.tsx
│   ├── Notifications/
│   │   └── index.tsx              # Keep Notifications/index.tsx (remove NotificationsScreen.tsx)
│   ├── Create/
│   │   ├── CreateScreen.tsx
│   │   ├── CreateReelScreen.tsx
│   │   ├── PhotoSelectScreen.tsx
│   │   ├── CropScreen.tsx
│   │   ├── CropAdjustScreen.tsx
│   │   ├── AdjustScreen.tsx
│   │   ├── AddDetailsScreen.tsx
│   │   └── AddPostDetailsScreen.tsx
│   ├── KYC/
│   │   ├── AccountChangeFlowScreen.tsx
│   │   ├── AgencyVerification.tsx
│   │   ├── BaseVerificationScreen.tsx
│   │   ├── CreatorVerification.tsx
│   │   ├── HostVerification.tsx
│   │   └── StayHostVerification.tsx
│   ├── Admin/
│   │   ├── SuperAdminDashboardScreen.tsx
│   │   ├── AdminVerificationScreen.tsx
│   │   └── sections/
│   │       ├── Analytics.tsx
│   │       ├── DashboardOverview.tsx
│   │       ├── HostVerifications.tsx
│   │       ├── PackageManagement.tsx
│   │       ├── ReportsReviews.tsx
│   │       ├── Settings.tsx
│   │       ├── TripApprovals.tsx
│   │       ├── UpcomingVerifications.tsx
│   │       └── UserManagement.tsx
│   ├── Settings/
│   │   ├── index.tsx
│   │   ├── AccountSettingsScreen.tsx
│   │   ├── HelpSupportScreen.tsx
│   │   ├── LogoutScreen.tsx
│   │   ├── TermsPoliciesScreen.tsx
│   │   └── UpgradeAccountScreen.tsx
│   ├── Tools/
│   │   ├── DashboardScreen.tsx
│   │   ├── HostToolsScreen.tsx
│   │   ├── ItineraryBuilderScreen.tsx
│   │   ├── NearYouScreen.tsx
│   │   └── TravelerCardScreen.tsx
│   ├── Rewards/
│   │   ├── AchievementsScreen.tsx
│   │   └── ExplorerWalletScreen.tsx
│   ├── Travel/
│   │   └── TravelPlanSelectScreen.tsx
│   ├── Account/
│   │   ├── AccountScreen.tsx
│   │   ├── RoleUpgradeScreen.tsx
│   │   └── ProfilePhotoCropScreen.tsx
│   ├── SplashScreen.tsx
│   ├── TripsScreen.tsx
│   ├── ChatsScreen.tsx
│   ├── MessagingScreen.tsx
│   └── UnifiedEditScreen.tsx
│
├── components/
│   ├── ui/                        # Reusable UI primitives
│   │   ├── index.ts
│   │   ├── Toast.tsx
│   │   ├── LoadingOverlay.tsx
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── Gradient.tsx           # From utils/gradient.tsx
│   │   └── Moti.tsx               # From utils/moti.tsx
│   ├── layout/                    # Layout components
│   │   ├── index.ts
│   │   ├── GlassHeader.tsx
│   │   ├── DrawerHeader.tsx
│   │   ├── DrawerItem.tsx
│   │   ├── CustomDrawerContent.tsx
│   │   └── SideMenu.tsx
│   ├── post/                      # Post-related components
│   │   ├── index.ts
│   │   ├── PostCard/
│   │   │   ├── index.tsx
│   │   │   ├── PostHeader.tsx
│   │   │   ├── PostMedia.tsx
│   │   │   ├── PostFooter.tsx
│   │   │   ├── PostActions.tsx
│   │   │   └── styles.ts
│   │   ├── PostCarousel.tsx
│   │   ├── PostDropdown.tsx
│   │   ├── CommentCard.tsx
│   │   └── PostCard.tsx           # Legacy, to be removed
│   ├── profile/                   # Profile-related components
│   │   ├── index.ts
│   │   ├── ProfileHeader.tsx
│   │   ├── FollowButton.tsx       # Keep profile/FollowButton.tsx (remove root FollowButton.tsx)
│   │   ├── PostsGrid.tsx
│   │   ├── BioSection.tsx
│   │   ├── MemoriesSection.tsx
│   │   ├── ReviewsSection.tsx
│   │   ├── TabNavigator.tsx
│   │   ├── Card.tsx
│   │   ├── InputModal.tsx
│   │   ├── MultiSelectDropdown.tsx
│   │   └── ProfileImage.tsx
│   ├── user/                      # User-related components
│   │   ├── index.ts
│   │   ├── UserAvatar.tsx
│   │   ├── UsernameChip.tsx
│   │   ├── VerifiedBadge.tsx
│   │   └── followers/
│   │       └── UserRowCard.tsx
│   ├── chat/                      # Chat-related components
│   │   ├── index.ts
│   │   ├── MessageBubble.tsx
│   │   └── messaging/             # If exists
│   ├── suggestions/               # Suggestion components
│   │   ├── index.ts
│   │   ├── SuggestionCard.tsx
│   │   ├── SuggestionCarousel.tsx
│   │   ├── FollowingSuggestions.tsx
│   │   ├── FollowingFeed.tsx
│   │   ├── ChatSuggestions.tsx
│   │   ├── ViewMoreList.tsx
│   │   ├── StackCardPlaceholder.tsx
│   │   ├── PlaceholderSuggestionCarousel.tsx
│   │   └── ContactsPermissionModal.tsx
│   ├── create/                    # Create flow components
│   │   ├── index.ts
│   │   ├── PostAndReelCreator.tsx
│   │   ├── StayCreator.tsx
│   │   ├── RideCreator.tsx
│   │   ├── PackageCreator.tsx
│   │   ├── CourseCreator.tsx
│   │   ├── EventCreator.tsx
│   │   ├── ItineraryCreator.tsx
│   │   ├── LocalTourCreator.tsx
│   │   ├── AffiliateCreator.tsx
│   │   ├── TeamCreator.tsx
│   │   ├── MediaPicker.tsx
│   │   ├── CropperView.tsx
│   │   ├── EditCropBox.tsx
│   │   └── ImageTile.tsx
│   ├── itinerary/                 # Itinerary components
│   │   ├── index.ts
│   │   ├── ChatBubble.tsx
│   │   ├── ChatInput.tsx
│   │   ├── Header.tsx
│   │   ├── ItineraryCard.tsx
│   │   └── SuggestedChips.tsx
│   ├── upload/                    # Upload components
│   │   ├── index.ts
│   │   └── VerificationUpload.tsx
│   ├── explorer/                  # Explorer components (if exists)
│   ├── common/                    # Common shared components
│   │   ├── index.ts
│   │   ├── CustomText.tsx
│   │   ├── SegmentedControl.tsx
│   │   ├── ConfirmationModal.tsx
│   │   ├── ReviewModal.tsx
│   │   ├── RewardPopCard.tsx
│   │   ├── TopicClaimAlert.tsx
│   │   └── UpgradeAccountModal.tsx
│   └── index.ts                   # Main components export
│
├── services/                      # All business logic & API calls
│   ├── api/                       # API client & config
│   │   ├── index.ts
│   │   ├── apiClient.ts
│   │   ├── firebaseConfig.ts
│   │   └── firebaseService.ts
│   ├── auth/                      # Authentication services
│   │   ├── index.ts
│   │   ├── authService.ts
│   │   └── mockAuth.ts
│   ├── posts/                     # Post services
│   │   ├── index.ts
│   │   └── postsService.ts         # From PostsAPI.ts
│   ├── users/                     # User services
│   │   ├── index.ts
│   │   ├── usersService.ts         # From UsersAPI.ts
│   │   ├── profileService.ts
│   │   └── userProfilePhotoService.ts
│   ├── follow/                    # Follow services
│   │   ├── index.ts
│   │   ├── followService.ts
│   │   └── followAPI.ts           # From FollowAPI.ts
│   ├── chat/                      # Chat services
│   │   ├── index.ts
│   │   ├── chatService.ts
│   │   ├── messagesService.ts      # From MessagesAPI.ts
│   │   └── groupsService.ts        # From GroupsAPI.ts
│   ├── notifications/             # Notification services
│   │   ├── index.ts
│   │   ├── notificationService.ts
│   │   ├── notificationAPI.ts      # From NotificationAPI.ts
│   │   ├── rewardNotificationService.ts
│   │   └── topicNotificationService.ts
│   ├── likes/                     # Like services
│   │   ├── index.ts
│   │   └── likesService.ts         # From LikesAPI.ts
│   ├── itinerary/                 # Itinerary services
│   │   ├── index.ts
│   │   ├── itineraryService.ts
│   │   └── generateItinerary.ts
│   ├── booking/                   # Booking services
│   │   ├── index.ts
│   │   └── bookingService.ts       # From utils/bookingService.ts
│   ├── review/                    # Review services
│   │   ├── index.ts
│   │   └── reviewService.ts        # From utils/reviewService.ts
│   ├── favorite/                  # Favorite services
│   │   ├── index.ts
│   │   └── favoriteService.ts      # From utils/favoriteService.ts
│   ├── contacts/                  # Contacts services
│   │   ├── index.ts
│   │   └── contactsService.ts      # From utils/contactsService.ts
│   ├── role/                      # Role services
│   │   ├── index.ts
│   │   └── roleRequirements.ts
│   └── index.ts                   # Main services export
│
├── store/                         # State management
│   ├── slices/                    # Redux slices
│   │   ├── index.ts
│   │   ├── profilePhotoSlice.ts
│   │   ├── userProfileSlice.ts
│   │   ├── userPostsSlice.ts
│   │   └── userFollowStateSlice.ts
│   ├── zustand/                   # Zustand stores
│   │   ├── index.ts
│   │   └── createFlowStore.ts     # From useCreateFlowStore.tsx
│   ├── index.ts                   # Store configuration
│   └── hooks.ts                   # Typed hooks (useAppDispatch, useAppSelector)
│
├── hooks/                         # Custom React hooks
│   ├── api/                       # API-related hooks
│   │   ├── index.ts
│   │   ├── useProfileData.ts
│   │   ├── useProfilePhoto.ts
│   │   ├── useFollowingFeed.ts
│   │   ├── useFollow.ts
│   │   └── useSuggestions.ts      # Keep hooks/useSuggestions.ts (remove global/logic/useSuggestions.ts)
│   ├── business/                  # Business logic hooks
│   │   ├── index.ts
│   │   ├── useKYCManager.ts
│   │   ├── useRewardOnboarding.ts
│   │   ├── useTopicClaimStatus.ts
│   │   └── useTopicClaimReminder.ts
│   ├── ui/                        # UI-related hooks
│   │   ├── index.ts
│   │   └── useCropState.ts
│   ├── admin/                     # Admin hooks
│   │   ├── index.ts
│   │   ├── useUsers.ts
│   │   ├── useVerifications.ts
│   │   ├── useTrips.ts
│   │   └── useReports.ts
│   ├── global/                    # Global utility hooks
│   │   ├── index.ts
│   │   ├── useCachedState.ts      # From global/hooks
│   │   ├── usePaginatedQuery.ts   # From global/hooks
│   │   └── useToggle.ts           # From global/hooks
│   └── index.ts                   # Main hooks export
│
├── utils/                         # Pure utility functions
│   ├── index.ts
│   ├── formatTimestamp.ts
│   ├── generateId.ts
│   ├── validateUsername.ts
│   ├── debounce.ts
│   ├── throttle.ts
│   ├── retry.ts
│   ├── storage.ts
│   ├── uploadMedia.ts
│   ├── cropUtils.ts
│   ├── cropMath.ts
│   ├── finalCropProcessor.ts
│   ├── profilePhotoCropUtils.ts
│   ├── postUtils.ts
│   ├── postHelpers.ts
│   ├── postDropdownHelpers.ts
│   ├── suggestionUtils.ts
│   ├── navigationHelpers.ts
│   ├── kycAuthRedirect.ts
│   ├── kycNavigation.ts
│   ├── authUtils.ts
│   ├── adminInit.ts
│   ├── constants.ts
│   └── firestoreTest.ts           # Remove if test file
│
├── constants/                     # Static constants
│   ├── index.ts
│   ├── routes.ts
│   ├── sizes.ts
│   ├── firebase.ts
│   └── verificationTemplates.ts
│
├── types/                         # TypeScript types
│   ├── index.ts
│   ├── account.ts
│   ├── kyc.ts
│   ├── navigation.ts              # From navigation/types.ts
│   └── react-native-vector-icons.d.ts
│
├── theme/                         # Theme & styling
│   ├── index.ts
│   ├── colors.ts                  # Consolidate all colors here
│   ├── fonts.ts
│   ├── spacing.ts                 # From constants/sizes.ts
│   └── GlobalStyles.ts            # From root GlobalStyles.ts
│
├── config/                        # Configuration files
│   ├── index.ts
│   └── rolesMetadata.ts
│
├── context/                       # Legacy contexts (to be migrated)
│   └── (empty - will be removed)
│
├── contexts/                      # Legacy contexts (to be migrated)
│   └── AuthContext.tsx            # Will move to app/providers
│
├── global/                        # Legacy global folder (to be removed)
│   └── (all contents moved to appropriate locations)
│
├── assets/                        # Static assets
│   ├── images/
│   │   ├── onboard1.jpeg
│   │   ├── onboard2.jpeg
│   │   ├── onboard3.jpeg
│   │   ├── onboard4.jpeg
│   │   └── wavyBadge.png
│   └── fonts/
│       └── (all Poppins fonts from screens/assets/fonts)
│
└── __tests__/                     # Test files
    ├── RewardPopCard.test.tsx
    ├── useKYCManager.test.ts
    └── useRewardOnboarding.test.ts
```

---

## 📋 Detailed Change List

### Phase 1: Create New Structure & Move Files

#### 1.1 App Layer
- [ ] Create `src/app/` directory
- [ ] Move `src/App.tsx` → `src/app/App.tsx`
- [ ] Create `src/app/navigation/` and move navigation files
- [ ] Create `src/app/providers/` and consolidate all providers
- [ ] Create `src/app/providers/index.tsx` for combined provider

#### 1.2 Screens Reorganization
- [ ] Remove duplicate screen files:
  - Remove `HomeScreen.tsx` (keep `Home/index.tsx`)
  - Remove `ProfileScreen.tsx` (keep `Profile/index.tsx`)
  - Remove `ExploreScreen.tsx` (keep `Explore/index.tsx`)
  - Remove `NotificationsScreen.tsx` (keep `Notifications/index.tsx`)
  - Remove `PostDetailScreen.tsx` (keep `PostDetails/index.tsx`)
- [ ] Reorganize screens into feature folders:
  - Move `Create*` screens → `screens/Create/`
  - Move `KYC` screens → `screens/KYC/`
  - Move `Admin` screens → `screens/Admin/`
  - Move `side-menu/settings` → `screens/Settings/`
  - Move `side-menu/tools` → `screens/Tools/`
  - Move `side-menu/rewards` → `screens/Rewards/`
  - Move `travel` → `screens/Travel/`
  - Move account-related → `screens/Account/`

#### 1.3 Components Reorganization
- [ ] Create component subfolders: `ui/`, `layout/`, `post/`, `profile/`, `user/`, `chat/`, `suggestions/`, `create/`, `itinerary/`, `upload/`, `common/`
- [ ] Move `utils/gradient.tsx` → `components/ui/Gradient.tsx`
- [ ] Move `utils/moti.tsx` → `components/ui/Moti.tsx`
- [ ] Remove `components/FollowButton.tsx` (keep `components/profile/FollowButton.tsx`)
- [ ] Create `index.ts` files for each component folder

#### 1.4 Services Reorganization
- [ ] Create service subfolders: `api/`, `auth/`, `posts/`, `users/`, `follow/`, `chat/`, `notifications/`, `likes/`, `itinerary/`, `booking/`, `review/`, `favorite/`, `contacts/`, `role/`
- [ ] Move API files from `api/` to appropriate service folders
- [ ] Move service files from `utils/` to `services/`:
  - `utils/bookingService.ts` → `services/booking/bookingService.ts`
  - `utils/favoriteService.ts` → `services/favorite/favoriteService.ts`
  - `utils/reviewService.ts` → `services/review/reviewService.ts`
  - `utils/contactsService.ts` → `services/contacts/contactsService.ts`
- [ ] Rename API files to service naming:
  - `PostsAPI.ts` → `posts/postsService.ts`
  - `UsersAPI.ts` → `users/usersService.ts`
  - `FollowAPI.ts` → `follow/followAPI.ts`
  - `LikesAPI.ts` → `likes/likesService.ts`
  - `MessagesAPI.ts` → `chat/messagesService.ts`
  - `GroupsAPI.ts` → `chat/groupsService.ts`
  - `NotificationAPI.ts` → `notifications/notificationAPI.ts`
- [ ] Create `index.ts` files for each service folder

#### 1.5 Store Reorganization
- [ ] Create `store/slices/` for Redux slices
- [ ] Move all slice files to `store/slices/`
- [ ] Create `store/zustand/` for Zustand stores
- [ ] Move `useCreateFlowStore.tsx` → `store/zustand/createFlowStore.ts` (convert to Zustand pattern)
- [ ] Create `store/hooks.ts` for typed Redux hooks

#### 1.6 Hooks Reorganization
- [ ] Create hook subfolders: `api/`, `business/`, `ui/`, `admin/`, `global/`
- [ ] Move hooks to appropriate folders
- [ ] Remove `global/logic/useSuggestions.ts` (keep `hooks/api/useSuggestions.ts`)
- [ ] Move `global/hooks/*` → `hooks/global/`
- [ ] Move `global/logic/*` → appropriate hook folders or services
- [ ] Create `index.ts` files for each hook folder

#### 1.7 Utils Cleanup
- [ ] Remove service files (moved to services)
- [ ] Remove component files (moved to components)
- [ ] Keep only pure utility functions
- [ ] Create `utils/index.ts`

#### 1.8 Theme Consolidation
- [ ] Consolidate all color files into `theme/colors.ts`
- [ ] Move `constants/sizes.ts` → `theme/spacing.ts`
- [ ] Move `GlobalStyles.ts` → `theme/GlobalStyles.ts`
- [ ] Remove `utils/colors.ts` and `constants/colors.ts`

#### 1.9 Assets Reorganization
- [ ] Move `screens/assets/` → `assets/`
- [ ] Organize fonts and images properly

#### 1.10 Types & Constants
- [ ] Move `navigation/types.ts` → `types/navigation.ts`
- [ ] Create `types/index.ts`
- [ ] Create `constants/index.ts`

### Phase 2: Update Imports & Fix Dependencies

#### 2.1 Update All Import Paths
- [ ] Update imports in all files to use new paths
- [ ] Use absolute imports with `src/` prefix
- [ ] Update `tsconfig.json` paths configuration
- [ ] Update `babel.config.js` for path aliases (if needed)

#### 2.2 Fix Provider Setup
- [ ] Consolidate all providers in `app/providers/index.tsx`
- [ ] Update `app/App.tsx` to use combined provider
- [ ] Remove duplicate context files

#### 2.3 Update Navigation
- [ ] Update all screen imports in navigation files
- [ ] Ensure all routes point to correct screen locations

### Phase 3: Cleanup & Optimization

#### 3.1 Remove Legacy Files
- [ ] Remove empty folders: `global/api/`, `global/components/`, `context/`
- [ ] Remove duplicate files
- [ ] Remove legacy `PostCard.tsx` if `PostCard/index.tsx` is used
- [ ] Clean up `legacy_messaging_backup/` folder

#### 3.2 Create Index Exports
- [ ] Create `index.ts` files for all major folders
- [ ] Export all public APIs through index files
- [ ] Update imports to use index exports where possible

#### 3.3 Update Configuration
- [ ] Update `tsconfig.json` with proper path mappings
- [ ] Update `metro.config.js` if needed
- [ ] Update any build configurations

### Phase 4: Code Quality Improvements

#### 4.1 Extract Business Logic
- [ ] Move API calls from screens to services
- [ ] Create custom hooks for screen-specific logic
- [ ] Ensure screens only handle UI rendering

#### 4.2 Standardize Naming
- [ ] Ensure PascalCase for components/screens
- [ ] Ensure camelCase for functions/utils
- [ ] Consistent file naming conventions

#### 4.3 Add Missing Types
- [ ] Ensure all services have proper TypeScript types
- [ ] Export types from `types/index.ts`
- [ ] Remove any `any` types where possible

---

## 🔧 Configuration Updates Required

### tsconfig.json
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@app/*": ["src/app/*"],
      "@screens/*": ["src/screens/*"],
      "@components/*": ["src/components/*"],
      "@services/*": ["src/services/*"],
      "@store/*": ["src/store/*"],
      "@hooks/*": ["src/hooks/*"],
      "@utils/*": ["src/utils/*"],
      "@constants/*": ["src/constants/*"],
      "@types/*": ["src/types/*"],
      "@theme/*": ["src/theme/*"],
      "@config/*": ["src/config/*"],
      "@assets/*": ["src/assets/*"]
    }
  }
}
```

### babel.config.js (if using Babel plugin for paths)
```js
module.exports = {
  presets: ['@react-native/babel-preset'],
  plugins: [
    'react-native-reanimated/plugin',
    [
      'module-resolver',
      {
        root: ['./src'],
        extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
        alias: {
          '@app': './src/app',
          '@screens': './src/screens',
          '@components': './src/components',
          '@services': './src/services',
          '@store': './src/store',
          '@hooks': './src/hooks',
          '@utils': './src/utils',
          '@constants': './src/constants',
          '@types': './src/types',
          '@theme': './src/theme',
          '@config': './src/config',
          '@assets': './src/assets',
        },
      },
    ],
  ],
};
```

---

## ⚠️ Breaking Changes & Migration Notes

1. **Import Paths**: All imports will need to be updated. Use find/replace carefully.
2. **Context Providers**: Provider setup will change - update App.tsx accordingly.
3. **Screen Names**: Some screen files are being removed (duplicates). Ensure navigation uses correct paths.
4. **Service Calls**: API calls moved to services - update all direct API imports.
5. **Store Access**: Redux store structure remains same, but file locations change.

---

## ✅ Benefits of New Structure

1. **Scalability**: Clear separation allows easy feature additions
2. **Maintainability**: Related files grouped together
3. **Discoverability**: Standard structure makes navigation easier
4. **Testability**: Services and hooks can be tested independently
5. **Team Collaboration**: Clear conventions reduce confusion
6. **Performance**: Better code splitting opportunities
7. **Type Safety**: Centralized types improve TypeScript usage

---

## 📊 Estimated Impact

- **Files to Move**: ~150+ files
- **Files to Remove**: ~10 duplicate files
- **Imports to Update**: ~500+ import statements
- **New Files to Create**: ~50 index.ts files
- **Time Estimate**: 4-6 hours for complete migration

---

## 🚀 Next Steps

1. **Review this proposal** - Check if structure aligns with your vision
2. **Approve changes** - Confirm which phases to proceed with
3. **Backup current code** - Ensure you have a backup before migration
4. **Execute migration** - I'll perform the restructuring systematically
5. **Test thoroughly** - Verify all imports and functionality
6. **Update documentation** - Reflect new structure in docs

---

**Ready to proceed?** Please review and approve this proposal. I'll wait for your confirmation before making any changes.

