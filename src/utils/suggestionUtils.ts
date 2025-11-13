/**
 * Suggestion Utilities
 * Scoring algorithm for user suggestions
 */

export interface SuggestionCandidate {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  bio?: string;
  location?: string;
  verified: boolean;
  interests?: string[];
  contactsHash?: string[];
  followersCount: number;
  followingCount: number;
  postsCount?: number;
  createdAt?: any;
  lastActiveAt?: any;
  mutualFollowersCount?: number;
  isNewUser?: boolean;
}

export interface CurrentUser {
  id: string;
  location?: string;
  interests?: string[];
  contactsHash?: string[];
  followingIds?: string[];
}

/**
 * Calculate similarity score between two interest arrays
 */
function hasSimilarInterests(candidate: SuggestionCandidate, currentUser: CurrentUser): boolean {
  if (!candidate.interests || !currentUser.interests || candidate.interests.length === 0 || currentUser.interests.length === 0) {
    return false;
  }

  const candidateSet = new Set(candidate.interests.map(i => i.toLowerCase()));
  const userSet = new Set(currentUser.interests.map(i => i.toLowerCase()));
  
  // Check if there's at least one common interest
  for (const interest of candidateSet) {
    if (userSet.has(interest)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Calculate intersection of two arrays
 */
function intersection<T>(arr1: T[], arr2: T[]): T[] {
  const set1 = new Set(arr1);
  return arr2.filter(item => set1.has(item));
}

/**
 * Score a candidate user for suggestions
 * Higher score = better match
 */
export function scoreCandidate(
  candidate: SuggestionCandidate,
  currentUser: CurrentUser
): number {
  let score = 0;

  // Verified users get high priority
  if (candidate.verified) {
    score += 30;
  }

  // Same location
  if (candidate.location && currentUser.location && 
      candidate.location.toLowerCase() === currentUser.location.toLowerCase()) {
    score += 20;
  }

  // Contact mutuals (if both have contactsHash)
  if (candidate.contactsHash && currentUser.contactsHash && 
      candidate.contactsHash.length > 0 && currentUser.contactsHash.length > 0) {
    const mutualContacts = intersection(candidate.contactsHash, currentUser.contactsHash);
    if (mutualContacts.length > 0) {
      score += 25;
    }
  }

  // Mutual followers count
  if (candidate.mutualFollowersCount) {
    score += Math.min(15, candidate.mutualFollowersCount);
  }

  // High followers count (popular users)
  if (candidate.followersCount > 1000) {
    score += 15;
  } else if (candidate.followersCount > 0) {
    score += Math.floor(candidate.followersCount / 100);
  }

  // Similar interests
  if (hasSimilarInterests(candidate, currentUser)) {
    score += 10;
  }

  // New users (recently joined)
  if (candidate.isNewUser) {
    score += 5;
  }

  return score;
}

/**
 * Sort candidates by score (descending)
 */
export function sortCandidatesByScore(
  candidates: SuggestionCandidate[],
  currentUser: CurrentUser
): SuggestionCandidate[] {
  return candidates
    .map(candidate => ({
      candidate,
      score: scoreCandidate(candidate, currentUser),
    }))
    .sort((a, b) => b.score - a.score)
    .map(item => item.candidate);
}

/**
 * Rotate/shuffle array to show different suggestions on refresh
 */
export function rotateSuggestions<T>(items: T[], recentlyShown: Set<string>): T[] {
  // Filter out recently shown items
  const filtered = items.filter((item: any) => !recentlyShown.has(item.id));
  
  // If we have enough items after filtering, return them
  if (filtered.length >= 8) {
    return filtered.slice(0, 8);
  }
  
  // Otherwise, shuffle all items and take first 8
  const shuffled = [...items].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 8);
}

/**
 * Chunk array into smaller arrays (for Firestore 'in' queries)
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

