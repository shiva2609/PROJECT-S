/**
 * Post Dropdown Options Helper
 * Centralizes all dropdown option logic based on post ownership, follow status, and feed type
 */

export type DropdownOption = 'Delete' | 'Report' | 'Block' | 'Hide Post' | 'Unfollow' | 'Mute';

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
 * - NON-FOLLOWED (For You): ["Report", "Block", "Hide Post"]
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
  if (!isFollowing && inForYou) {
    return ['Report', 'Block', 'Hide Post'];
  }

  // FOLLOWED USERS (Following section OR For You but followed)
  if (isFollowing) {
    return ['Unfollow', 'Mute', 'Report', 'Block'];
  }

  // Fallback: If in Following feed but not following (edge case)
  // Treat as non-followed
  if (!inForYou && !isFollowing) {
    return ['Report', 'Block', 'Hide Post'];
  }

  // Default fallback
  return ['Report', 'Block', 'Hide Post'];
}

