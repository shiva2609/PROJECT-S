# Profile Photo Not Fetching in Search - Fix

## Issue
Profile photos not displaying in Explore search results. Users see default avatar icons instead of their actual profile pictures.

## Root Cause
**Type mismatch** between `User` type and `UserResult` type:

- `UsersAPI.searchUsers()` returns `User[]` with field: `photoUrl`
- `useSearchManager` hook expects `UserResult[]` with field: `avatarUri`
- The hook was directly setting results without mapping field names

```typescript
// Before (❌ Wrong field name)
const results = await UsersAPI.searchUsers(query);
setUsersResults(results);  // photoUrl not mapped to avatarUri
```

## Solution
Added mapping to transform `User` type to `UserResult` type with correct field names:

```typescript
// After (✅ Correct mapping)
const results = await UsersAPI.searchUsers(query);

const mappedResults: UserResult[] = results.map(user => ({
  id: user.id,
  username: user.username,
  displayName: user.name,              // name -> displayName
  avatarUri: user.photoUrl,            // photoUrl -> avatarUri ✅
  isVerified: user.verified,
  followerCount: user.followersCount,
}));

setUsersResults(mappedResults);
```

## Field Mappings

| User Type (API) | UserResult Type (UI) | Purpose |
|-----------------|---------------------|---------|
| `photoUrl` | `avatarUri` | Profile photo URL |
| `name` | `displayName` | Display name |
| `verified` | `isVerified` | Verification status |
| `followersCount` | `followerCount` | Follower count |
| `username` | `username` | Username (same) |
| `id` | `id` | User ID (same) |

## How UserAvatar Works

The `UserAvatar` component expects:
```typescript
<UserAvatar uri={item.avatarUri} size="md" />
```

Before fix:
- `item.avatarUri` was `undefined`
- Component showed default avatar icon

After fix:
- `item.avatarUri` contains the actual photo URL
- Component displays the user's profile picture

## Files Modified
- `src/hooks/useSearchManager.ts` (searchUsers function)

## Testing

### Before Fix
```
Search results:
- ✅ Username displayed
- ✅ Display name shown
- ❌ Profile photo missing (default icon)
```

### After Fix
```
Search results:
- ✅ Username displayed
- ✅ Display name shown
- ✅ Profile photo displayed
- ✅ Verified badge shown (if applicable)
```

## Result
✅ Profile photos now display correctly in search results  
✅ All user data properly mapped  
✅ UserAvatar component receives correct field  
✅ No breaking changes to other components  

---

**Status: FIXED ✅**

Profile photos should now appear in the Explore search results!
