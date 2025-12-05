/**
 * Post Helper Utilities
 * Functions for formatting timestamps, parsing hashtags, etc.
 */

/**
 * Format timestamp to relative time (e.g., "2h ago", "3d ago")
 */
export function formatTimestamp(timestamp?: number | any): string {
  if (!timestamp) return '';

  let date: Date;
  if (typeof timestamp === 'number') {
    date = new Date(timestamp);
  } else if (timestamp?.toMillis && typeof timestamp.toMillis === 'function') {
    date = new Date(timestamp.toMillis());
  } else if (timestamp?.seconds) {
    date = new Date(timestamp.seconds * 1000);
  } else {
    return '';
  }

  try {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    // Format: "Jan 15"
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const day = date.getDate();
    return `${month} ${day}`;
  } catch {
    return '';
  }
}

/**
 * Parse hashtags from caption text
 * Returns array of { text, isHashtag, index } for rendering
 */
export interface CaptionPart {
  text: string;
  isHashtag: boolean;
}

export function parseHashtags(caption: string): CaptionPart[] {
  if (!caption) return [];
  
  const parts: CaptionPart[] = [];
  const hashtagRegex = /#[\w]+/g;
  let lastIndex = 0;
  let match;

  while ((match = hashtagRegex.exec(caption)) !== null) {
    // Add text before hashtag
    if (match.index > lastIndex) {
      parts.push({
        text: caption.substring(lastIndex, match.index),
        isHashtag: false,
      });
    }
    // Add hashtag
    parts.push({
      text: match[0],
      isHashtag: true,
    });
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < caption.length) {
    parts.push({
      text: caption.substring(lastIndex),
      isHashtag: false,
    });
  }

  return parts.length > 0 ? parts : [{ text: caption, isHashtag: false }];
}

