# Archived Code

This folder contains code that was identified as unused, duplicate, or dead during the V0 hygiene cleanup (Dec 2025).

## Files

- **FollowingFeed.tsx**: Old component for following feed, replaced by `FollowingUsersScreen` using `useHomeFeed` hook.
- **useFollowingFeed.ts**: Old hook for following feed logic, replaced by `useHomeFeed`.
- **usePosts.ts**: Unused hook attempting to unify feed logic, replaced by `useHomeFeed`.
- **App.tsx**: Duplicate entry point. Real entry point is `src/app/App.tsx` used by `index.js`.

## Restoration

If any of these files are found to be needed, move them back to their original locations (deduced from imports or git history).
