# Follow/Following Suggestion System Implementation

## Overview

This document describes the implementation of the follow/following suggestion system and following-feed UX for the Sanchari app, similar to Instagram's functionality.

## Features Implemented

### 1. UI Components

- **FollowingSuggestions**: Container component displaying multiple horizontal carousels of user suggestions
- **SuggestionCard**: Individual suggestion card with avatar, name, tagline, verified badge, and follow button
- **FollowingFeed**: Feed component showing posts from followed users with real-time updates
- **ViewMoreList**: Full-screen list view for suggestion categories with filters
- **ContactsPermissionModal**: Modal for requesting contacts permission with clear consent
- **ChatSuggestions**: Suggestions component for chat screen (shown when messages < 5)

### 2. Hooks

- **useFollow**: Manages follow/unfollow operations with optimistic updates
- **useSuggestions**: Fetches and manages user suggestions with real-time updates
- **useFollowingFeed**: Fetches posts from followed users with pagination

### 3. Utilities

- **contactsService**: Handles contact permission, hashing (SHA256), and upload to Firestore
- **suggestionUtils**: Suggestion scoring algorithm and utility functions

## Firestore Structure

### Collections

#### `users/{userId}`
```typescript
{
  name: string;
  username: string;
  avatar?: string;
  bio?: string;
  location?: string;
  verified: boolean;
  interests: string[];
  contactsHash: string[]; // SHA256 hashed phone numbers
  createdAt: timestamp;
  lastActiveAt: timestamp;
  followersCount: number;
  followingCount: number;
  postsCount?: number;
}
```

#### `follows/{followId}`
```typescript
{
  followerId: string; // User who is following
  followingId: string; // User being followed
  timestamp: timestamp;
}
```

**Note**: `followId` should be `${followerId}_${followingId}` for uniqueness.

#### `posts/{postId}`
```typescript
{
  createdBy: string; // User ID
  userId?: string; // Legacy field
  content?: string;
  caption?: string;
  imageURL?: string;
  coverImage?: string;
  gallery?: string[];
  media?: any[];
  likeCount?: number;
  commentCount?: number;
  createdAt: timestamp;
  metadata?: {
    location?: string;
    [key: string]: any;
  };
}
```

#### `suggestions_cache/{userId}` (Optional)
```typescript
{
  priorityAccounts: string[]; // User IDs
  locationBased: string[];
  contactsMutuals: string[];
  newUsers: string[];
  timestamp: timestamp;
}
```

## Firestore Composite Indexes

Create these indexes in Firebase Console:

1. **posts collection**:
   - `createdBy` (Ascending), `createdAt` (Descending)

2. **users collection**:
   - `location` (Ascending), `verified` (Descending), `lastActiveAt` (Descending)
   - `verified` (Ascending), `followersCount` (Descending)

3. **follows collection**:
   - `followerId` (Ascending), `followingId` (Ascending)

4. **users collection** (for contacts matching):
   - `contactsHash` (Array), `createdAt` (Descending)

## Suggestion Algorithm

The scoring system prioritizes suggestions based on:

- **Verified users**: +30 points
- **Same location**: +20 points
- **Contact mutuals**: +25 points
- **Mutual followers count**: +15 points (capped)
- **High followers count**: +15 points (if > 1000) or proportional
- **Similar interests**: +10 points
- **Recently joined**: +5 points

### Suggestion Categories (in order)

1. **Priority Accounts**: Verified + high-activity creators
2. **Verified Travellers**: All verified users
3. **People Near You**: Users with same location
4. **Contacts Mutuals**: Users with matching hashed phone numbers
5. **New Explorers**: Users who joined in the last 7 days
6. **Recommended Travellers**: Users with similar interests

## Privacy & Contacts

### Contacts Access Flow

1. User clicks "Find Friends from Contacts" button
2. Modal appears with clear explanation
3. User grants permission
4. Contacts are read and phone numbers normalized (E.164)
5. Phone numbers are hashed locally using SHA256
6. Only hashed values are uploaded to Firestore
7. Matching is performed server-side or via Cloud Function

### Security

- **No plain phone numbers** are ever stored
- **No contact names** are uploaded
- Users can revoke access and delete hashed contacts
- `contactsHash` field is only writable by the user themselves

## Real-time Updates

### Follow/Unfollow

- Optimistic UI updates (immediate state change)
- Firestore transaction updates counts atomically
- Real-time listeners reconcile server state
- Rollback on error

### Following Feed

- Real-time listener on `follows` collection
- Automatically reloads posts when follow list changes
- Pagination support with `startAfter`
- Chunked queries for users following >10 people

## Pull-to-Refresh Behavior

- Rotates suggestions to show different users
- Maintains `recentlyShownSuggestions` in AsyncStorage
- TTL: 24 hours
- Filters out recently shown items on refresh

## Chat Suggestions

- Shown above chat list when `messagesCount < 5`
- Persists flag in local storage or Firestore thread metadata
- Hides after 5 messages exchanged
- Shows prioritized suggestions from all categories

## Testing Checklist

### Contacts & Privacy
- [ ] Tap "Allow contacts" → modal appears
- [ ] Grant permission → hashed contacts uploaded
- [ ] Contacts mutuals appear in carousel
- [ ] Revoke access → contacts hashes removed

### Suggestions
- [ ] Pull-to-refresh rotates suggestions (different users shown)
- [ ] Verified users appear at top of priority carousel
- [ ] Location-based suggestions show when location is set
- [ ] "View More" navigates to full list
- [ ] Filters work in ViewMoreList

### Follow/Unfollow
- [ ] Follow a user → followingCount and followersCount update instantly
- [ ] Unfollow → counts update correctly
- [ ] Profile shows correct follow state
- [ ] Follow button shows correct state (Follow/Following)

### Following Feed
- [ ] Shows posts from followed users
- [ ] When no posts, shows suggestions
- [ ] When feed ends, shows suggestions
- [ ] Pull-to-refresh reloads posts
- [ ] Real-time updates when user follows someone new

### Chat Suggestions
- [ ] Shows suggestions when messages < 5
- [ ] Hides after 5 messages
- [ ] Suggestions are clickable and navigate to profile

### Edge Cases
- [ ] Firestore 'in' query limits handled (chunking)
- [ ] No duplicate suggestions shown
- [ ] Empty states handled gracefully
- [ ] Loading states shown appropriately
- [ ] Error handling works correctly

## Security Rules

The following security rules have been added to `firestore.rules`:

```javascript
// Follows Collection
match /follows/{followId} {
  allow read: if isAuthenticated();
  allow create: if isAuthenticated() && 
                 request.resource.data.followerId == request.auth.uid &&
                 request.resource.data.followingId != request.auth.uid;
  allow delete: if isAuthenticated() && 
                 resource.data.followerId == request.auth.uid;
  allow update: if false;
}

// Suggestions Cache
match /suggestions_cache/{userId} {
  allow read: if isAuthenticated() && userId == request.auth.uid;
  allow write: if false; // Cloud Functions only
}
```

## Dependencies

### Required
- `@react-native-async-storage/async-storage`: For storing recently shown suggestions
- `firebase`: For Firestore operations

### Optional (for contacts)
- `expo-contacts` OR `react-native-contacts`: For reading device contacts
- `crypto-js`: For SHA256 hashing (recommended for production)

Install with:
```bash
npm install crypto-js @types/crypto-js
# OR
npm install expo-contacts
# OR
npm install react-native-contacts
```

## Usage Examples

### Using FollowingSuggestions

```tsx
import FollowingSuggestions from '../components/suggestions/FollowingSuggestions';

<FollowingSuggestions
  onUserPress={(userId) => navigation.navigate('Profile', { userId })}
  onViewMore={(category, users) => navigation.navigate('ViewMore', { category, users })}
/>
```

### Using FollowingFeed

```tsx
import FollowingFeed from '../components/suggestions/FollowingFeed';

<FollowingFeed
  onUserPress={(userId) => navigation.navigate('Profile', { userId })}
  onPostPress={(post) => navigation.navigate('PostDetail', { postId: post.id })}
/>
```

### Using useFollow Hook

```tsx
import { useFollow } from '../hooks/useFollow';

const { isFollowing, isLoading, toggleFollow } = useFollow(targetUserId);

<TouchableOpacity onPress={toggleFollow}>
  <Text>{isFollowing ? 'Following' : 'Follow'}</Text>
</TouchableOpacity>
```

## Performance Considerations

1. **Chunking**: Firestore 'in' queries are limited to 10 values. The implementation automatically chunks arrays.

2. **Caching**: Suggestions can be precomputed in Cloud Functions and stored in `suggestions_cache` collection.

3. **Pagination**: Following feed uses pagination to load posts incrementally.

4. **Real-time Listeners**: Use `onSnapshot` for real-time updates, but be mindful of read costs.

5. **Optimistic Updates**: UI updates immediately, then reconciles with server state.

## Future Enhancements

1. **Cloud Function for Precomputation**: Precompute suggestions hourly per active user
2. **Algolia Integration**: For advanced search and discovery
3. **Analytics**: Track follow/unfollow actions and suggestion engagement
4. **A/B Testing**: Test different suggestion algorithms
5. **Machine Learning**: Personalize suggestions based on user behavior

## Troubleshooting

### Contacts not working
- Ensure `expo-contacts` or `react-native-contacts` is installed
- Check permissions in device settings
- Verify crypto-js is installed for hashing

### Suggestions not showing
- Check Firestore indexes are created
- Verify user has `location`, `interests`, or `contactsHash` set
- Check console for Firestore query errors

### Follow counts not updating
- Verify Firestore security rules allow updates
- Check transaction is completing successfully
- Ensure real-time listeners are set up

### Feed not loading
- Check user is following at least one person
- Verify posts have `createdBy` field set
- Check Firestore indexes for `posts` collection

## Support

For issues or questions, refer to:
- Firebase Console: Check Firestore indexes and security rules
- React Native Debugger: Check for JavaScript errors
- Firebase Console Logs: Check for Firestore query errors

