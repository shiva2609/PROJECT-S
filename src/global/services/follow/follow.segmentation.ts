/**
 * Global Follow Segmentation Service
 * 
 * SINGLE SOURCE OF TRUTH for segregating followers and suggested users.
 * Ensures NO user appears in both sections.
 * 
 * Core Principle: Clear separation between:
 * - People Who Follow You (followers)
 * - Suggested Accounts (not connected yet)
 */

export interface User {
  uid: string;
  [key: string]: any; // Allow other user properties
}

export interface SegmentFollowersAndSuggestionsInput {
  followers: User[];        // users who follow logged-in user
  followingIds: string[];   // users logged-in user follows
  suggestedUsers: User[];   // raw suggested users list
  loggedUserId: string;     // logged-in user ID
}

export interface SegmentFollowersAndSuggestionsOutput {
  followersSection: User[];
  suggestedSection: User[];
  followersCount: number;
  suggestionsCount: number;
}

/**
 * Segment followers and suggestions with strict rules
 * 
 * RULES (STRICT):
 * 
 * 1) followersSection:
 *    - MUST contain users who follow logged-in user
 *    - Exclude logged-in user
 *    - Keep unique users only
 * 
 * 2) suggestedSection:
 *    - MUST NOT include:
 *        a) users already in followersSection
 *        b) users already followed by logged-in user
 *        c) logged-in user
 *    - Must contain ONLY users not connected yet
 * 
 * @param input - Followers, following IDs, suggested users, and logged user ID
 * @returns Segmented users for each section
 */
export function segmentFollowersAndSuggestions({
  followers,
  followingIds,
  suggestedUsers,
  loggedUserId,
}: SegmentFollowersAndSuggestionsInput): SegmentFollowersAndSuggestionsOutput {
  const followingSet = new Set(followingIds);
  const followerIds = new Set<string>();
  const followersSection: User[] = [];

  for (const follower of followers) {
    const uid = follower.uid || follower.id;
    if (!uid || uid === loggedUserId) {
      continue; // Skip invalid or self
    }

    // EXCLUDE if already followed
    if (followingSet.has(uid)) {
      continue;
    }

    if (!followerIds.has(uid)) {
      followerIds.add(uid);
      followersSection.push(follower);
    }
  }

  // STEP 2: Process suggested section
  // Create sets for efficient lookup
  const suggestedSection: User[] = [];
  const suggestedIds = new Set<string>();

  for (const suggested of suggestedUsers) {
    const uid = suggested.uid || suggested.id;
    if (!uid || uid === loggedUserId) {
      continue; // Skip invalid or self
    }

    // MUST NOT include if:
    // a) Already in followers section
    if (followerIds.has(uid)) {
      continue;
    }

    // b) Already followed by logged-in user
    if (followingSet.has(uid)) {
      continue;
    }

    // c) Already added to suggested section (duplicate check)
    if (suggestedIds.has(uid)) {
      continue;
    }

    suggestedIds.add(uid);
    suggestedSection.push(suggested);
  }

  // STEP 3: DEV-ONLY assertion to ensure no duplicates
  if (__DEV__) {
    const overlap = followersSection.filter(f => {
      const fUid = f.uid || f.id;
      return suggestedSection.some(s => {
        const sUid = s.uid || s.id;
        return fUid === sUid;
      });
    });

    if (overlap.length > 0) {
      console.error('[follow.segmentation] ERROR: Duplicate users found between sections:', overlap.map(u => u.uid || u.id));
      console.assert(overlap.length === 0, 'Duplicate users found between sections');
    }
  }

  return {
    followersSection,
    suggestedSection,
    followersCount: followersSection.length,
    suggestionsCount: suggestedSection.length,
  };
}

