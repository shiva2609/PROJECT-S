/**
 * Post Dropdown Options Helper
 * Centralizes all dropdown option logic based on post ownership, follow status, and feed type
 */

// V1 MODERATION: 'Hide Post' removed - V1 focuses on Report and Block only
export type DropdownOption = 'Delete' | 'Report' | 'Block' | 'Unfollow' | 'Mute';

export interface DropdownOptionsParams {
  postUserId: string;
  currentUserId: string;
  isFollowing: boolean;
  inForYou: boolean;
}

/**
 * Returns array of dropdown options based on post context
 * 
 * Rules:
 * - OWN POST: ["Delete"]
 * - NON-FOLLOWED (For You): ["Report", "Block"] (V1: Hide Post removed)
 * - FOLLOWED (Following OR For You but followed): ["Unfollow", "Mute", "Report", "Block"]
 */
export function getPostDropdownOptions({
  postUserId,
  currentUserId,
  isFollowing,
  inForYou,
}: DropdownOptionsParams): DropdownOption[] {
  // OWN POST
  if (postUserId === currentUserId) {
    return ['Delete'];
  }

  // NON-FOLLOWED USERS (For You section)
  // V1: Hide Post removed - only Report and Block
  if (!isFollowing && inForYou) {
    return ['Report', 'Block'];
  }

  // FOLLOWED USERS (Following section OR For You but followed)
  if (isFollowing) {
    return ['Unfollow', 'Mute', 'Report', 'Block'];
  }

  // Fallback: If in Following feed but not following (edge case)
  // Treat as non-followed
  // V1: Hide Post removed - only Report and Block
  if (!inForYou && !isFollowing) {
    return ['Report', 'Block'];
  }

  // Default fallback
  return ['Report', 'Block'];
}

