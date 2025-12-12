/**
 * Global Firestore Document Normalizers
 * 
 * These functions ensure all documents have required fields with safe defaults,
 * preventing "internal assertion failed" errors and React rendering crashes.
 * 
 * Each normalizer:
 * - Fills missing required fields
 * - Repairs incorrect types
 * - Protects UI from crashing
 * - Returns clean, stable objects
 */

import { Timestamp, serverTimestamp } from 'firebase/firestore';
import { extractCreatedAt } from '../safeFirestore';

// ---------- User Normalizer ----------

export interface NormalizedUser {
  id: string;
  username: string;
  name: string;
  fullName?: string;
  displayName?: string;
  userTag?: string;
  bio?: string;
  photoUrl?: string;
  profilePic?: string;
  profilePhotoUrl?: string;
  location?: string;
  aboutMe?: string;
  interests?: string[];
  countriesVisited?: string[];
  statesVisited?: string[];
  followersCount: number;
  followingCount: number;
  verified: boolean;
  accountType?: string;
  verificationStatus?: string;
  createdAt: any;
  email?: string;
  pushTokens?: string[];
  [key: string]: any;
}

/**
 * Normalize user document with safe defaults
 */
export function normalizeUser(doc: any): NormalizedUser | null {
  if (!doc || !doc.id) {
    return null;
  }

  const data = doc.data ? doc.data() : doc;
  if (!data || typeof data !== 'object') {
    return null;
  }

  // Extract createdAt safely
  let createdAt = data.createdAt;
  if (!createdAt) {
    // If missing, use current timestamp (will be converted to Timestamp if needed)
    createdAt = Timestamp.now();
  } else if (typeof createdAt === 'string') {
    // Convert string to Timestamp
    try {
      createdAt = Timestamp.fromDate(new Date(createdAt));
    } catch {
      createdAt = Timestamp.now();
    }
  }

  // Ensure counts are numbers
  const followersCount = typeof data.followersCount === 'number' 
    ? Math.max(0, data.followersCount) 
    : 0;
  const followingCount = typeof data.followingCount === 'number' 
    ? Math.max(0, data.followingCount) 
    : 0;

  // Ensure verified is boolean
  const verified = data.verificationStatus === 'verified' || 
                   data.verified === true || 
                   false;

  return {
    id: doc.id,
    username: data.username || data.displayName || 'User',
    name: data.name || data.fullName || data.displayName || data.username || 'User',
    fullName: data.fullName || data.displayName || data.name || '',
    displayName: data.displayName || data.name || data.username || 'User',
    userTag: data.userTag || `@${data.username || 'user'}`,
    bio: data.bio || '',
    photoUrl: data.photoURL || data.photoUrl || data.profilePic || data.profilePhotoUrl || '',
    profilePic: data.profilePic || data.photoURL || data.photoUrl || '',
    profilePhotoUrl: data.profilePhotoUrl || data.photoURL || data.photoUrl || '',
    location: data.location || '',
    aboutMe: data.aboutMe || data.about || data.description || '',
    interests: Array.isArray(data.interests) ? data.interests : [],
    countriesVisited: Array.isArray(data.countriesVisited) ? data.countriesVisited : [],
    statesVisited: Array.isArray(data.statesVisited) ? data.statesVisited : [],
    followersCount,
    followingCount,
    verified,
    accountType: data.accountType || data.role || 'Traveler',
    verificationStatus: data.verificationStatus || (verified ? 'verified' : 'unverified'),
    createdAt,
    email: data.email || '',
    pushTokens: Array.isArray(data.pushTokens) ? data.pushTokens : [],
    // Preserve other fields
    ...data,
  };
}

// ---------- Post Normalizer ----------

export interface NormalizedPost {
  id: string;
  createdBy: string;
  userId?: string;
  ownerId?: string;
  authorId?: string;
  createdAt: any;
  caption?: string;
  mediaUrl?: string;
  imageURL?: string;
  coverImage?: string;
  gallery?: string[];
  likeCount: number;
  likesCount: number;
  commentCount: number;
  commentsCount: number;
  savedCount: number;
  [key: string]: any;
}

/**
 * Normalize post document with safe defaults
 */
export function normalizePost(doc: any): NormalizedPost | null {
  if (!doc || !doc.id) {
    return null;
  }

  const data = doc.data ? doc.data() : doc;
  if (!data || typeof data !== 'object') {
    return null;
  }

  // Extract owner/user ID
  const ownerId = data.createdBy || data.userId || data.ownerId || data.authorId || null;
  if (!ownerId) {
    console.warn('[normalizePost] Post missing owner ID:', doc.id);
    // Don't return null - allow post but log warning
  }

  // Extract createdAt safely - CRITICAL for orderBy queries
  let createdAt = data.createdAt;
  if (!createdAt) {
    // Missing createdAt causes "internal assertion failed" on orderBy
    // Use current timestamp as fallback
    createdAt = Timestamp.now();
  } else if (typeof createdAt === 'string') {
    // Convert string to Timestamp
    try {
      createdAt = Timestamp.fromDate(new Date(createdAt));
    } catch {
      createdAt = Timestamp.now();
    }
  } else if (typeof createdAt === 'number') {
    // Convert number (milliseconds) to Timestamp
    try {
      createdAt = Timestamp.fromMillis(createdAt);
    } catch {
      createdAt = Timestamp.now();
    }
  }

  // Ensure counts are numbers
  const likeCount = typeof data.likeCount === 'number' ? Math.max(0, data.likeCount) : 0;
  const likesCount = typeof data.likesCount === 'number' ? Math.max(0, data.likesCount) : likeCount;
  const commentCount = typeof data.commentCount === 'number' ? Math.max(0, data.commentCount) : 0;
  const commentsCount = typeof data.commentsCount === 'number' ? Math.max(0, data.commentsCount) : commentCount;
  const savedCount = typeof data.savedCount === 'number' ? Math.max(0, data.savedCount) : 0;

  return {
    id: doc.id,
    createdBy: ownerId || '',
    userId: ownerId || '',
    ownerId: ownerId || '',
    authorId: ownerId || '',
    createdAt,
    caption: (data.caption && typeof data.caption === 'string') ? data.caption : '',
    mediaUrl: data.mediaUrl || data.imageURL || data.imageUrl || data.photoUrl || '',
    imageURL: data.imageURL || data.mediaUrl || data.imageUrl || '',
    coverImage: data.coverImage || '',
    gallery: Array.isArray(data.gallery) ? data.gallery : [],
    likeCount,
    likesCount,
    commentCount,
    commentsCount,
    savedCount,
    // Preserve other fields
    ...data,
  };
}

// ---------- Follow Normalizer ----------

export interface NormalizedFollow {
  id: string;
  followerId: string;
  followingId: string;
  followedId?: string;
  createdAt: any;
  timestamp?: any;
  [key: string]: any;
}

/**
 * Normalize follow document with safe defaults
 */
export function normalizeFollow(doc: any): NormalizedFollow | null {
  if (!doc || !doc.id) {
    return null;
  }

  const data = doc.data ? doc.data() : doc;
  if (!data || typeof data !== 'object') {
    return null;
  }

  // Normalize field names: follower/following -> followerId/followingId
  const followerId = data.followerId || data.follower || null;
  const followingId = data.followingId || data.following || data.followedId || null;

  // Both IDs are required
  if (!followerId || !followingId) {
    console.warn('[normalizeFollow] Follow missing required IDs:', doc.id, { followerId, followingId });
    return null;
  }

  // Extract createdAt safely
  let createdAt = data.createdAt || data.timestamp;
  if (!createdAt) {
    // Missing createdAt causes ordering issues
    createdAt = Timestamp.now();
  } else if (typeof createdAt === 'string') {
    try {
      createdAt = Timestamp.fromDate(new Date(createdAt));
    } catch {
      createdAt = Timestamp.now();
    }
  } else if (typeof createdAt === 'number') {
    try {
      createdAt = Timestamp.fromMillis(createdAt);
    } catch {
      createdAt = Timestamp.now();
    }
  }

  return {
    id: doc.id,
    followerId: String(followerId),
    followingId: String(followingId),
    followedId: String(followingId), // Alias for compatibility
    createdAt,
    timestamp: createdAt, // Alias for compatibility
    // Preserve other fields
    ...data,
  };
}

// ---------- Message Normalizer ----------

export interface NormalizedMessage {
  id: string;
  from: string;
  to: string[];
  text?: string;
  mediaUrl?: string;
  type: 'text' | 'image' | 'video';
  createdAt: any;
  delivered?: boolean;
  read?: boolean;
  participants?: string[];
  [key: string]: any;
}

/**
 * Normalize message document with safe defaults
 */
export function normalizeMessage(doc: any): NormalizedMessage | null {
  if (!doc || !doc.id) {
    return null;
  }

  const data = doc.data ? doc.data() : doc;
  if (!data || typeof data !== 'object') {
    return null;
  }

  // Extract createdAt safely
  let createdAt = data.createdAt;
  if (!createdAt) {
    createdAt = Timestamp.now();
  } else if (typeof createdAt === 'string') {
    try {
      createdAt = Timestamp.fromDate(new Date(createdAt));
    } catch {
      createdAt = Timestamp.now();
    }
  } else if (typeof createdAt === 'number') {
    try {
      createdAt = Timestamp.fromMillis(createdAt);
    } catch {
      createdAt = Timestamp.now();
    }
  }

  // Ensure 'to' is an array
  let to: string[] = [];
  if (Array.isArray(data.to)) {
    to = data.to.filter((id: any) => id && typeof id === 'string');
  } else if (data.to && typeof data.to === 'string') {
    to = [data.to];
  }

  // Ensure 'from' exists
  const from = data.from || '';

  return {
    id: doc.id,
    from,
    to,
    text: data.text || '',
    mediaUrl: data.mediaUrl || '',
    type: (data.type === 'image' || data.type === 'video') ? data.type : 'text',
    createdAt,
    delivered: data.delivered === true,
    read: data.read === true,
    participants: Array.isArray(data.participants) ? data.participants : to.length > 0 ? to : [from],
    // Preserve other fields
    ...data,
  };
}

// ---------- Notification Normalizer ----------

export interface NormalizedNotification {
  id: string;
  userId: string;
  type: string;
  category?: string;
  actorId?: string;
  postId?: string;
  message?: string;
  data?: any;
  timestamp: any;
  createdAt: any;
  read: boolean;
  [key: string]: any;
}

/**
 * Normalize notification document with safe defaults
 */
export function normalizeNotification(doc: any): NormalizedNotification | null {
  if (!doc || !doc.id) {
    return null;
  }

  const data = doc.data ? doc.data() : doc;
  if (!data || typeof data !== 'object') {
    return null;
  }

  // userId is required
  const userId = data.userId || data.targetUserId || '';
  if (!userId) {
    console.warn('[normalizeNotification] Notification missing userId:', doc.id);
    return null;
  }

  // Extract timestamp/createdAt safely
  let timestamp = data.timestamp || data.createdAt;
  if (!timestamp) {
    timestamp = Timestamp.now();
  } else if (typeof timestamp === 'string') {
    try {
      timestamp = Timestamp.fromDate(new Date(timestamp));
    } catch {
      timestamp = Timestamp.now();
    }
  } else if (typeof timestamp === 'number') {
    try {
      timestamp = Timestamp.fromMillis(timestamp);
    } catch {
      timestamp = Timestamp.now();
    }
  }

  const createdAt = timestamp;

  return {
    id: doc.id,
    userId: String(userId),
    type: data.type || 'unknown',
    category: data.category || '',
    actorId: data.actorId || data.sourceUserId || '',
    postId: data.postId || '',
    message: data.message || '',
    data: data.data || {},
    timestamp,
    createdAt,
    read: data.read === true,
    // Preserve other fields
    ...data,
  };
}

// ---------- Conversation Normalizer ----------

export interface NormalizedConversation {
  id: string;
  participants: string[];
  createdAt: any;
  updatedAt: any;
  lastMessage?: string;
  lastMessageAt?: any;
  [key: string]: any;
}

/**
 * Normalize conversation document with safe defaults
 */
export function normalizeConversation(doc: any): NormalizedConversation | null {
  if (!doc || !doc.id) {
    return null;
  }

  const data = doc.data ? doc.data() : doc;
  if (!data || typeof data !== 'object') {
    return null;
  }

  // Ensure participants is an array
  let participants: string[] = [];
  if (Array.isArray(data.participants)) {
    participants = data.participants.filter((id: any) => id && typeof id === 'string');
  } else if (data.participants && typeof data.participants === 'string') {
    participants = [data.participants];
  }

  if (participants.length === 0) {
    console.warn('[normalizeConversation] Conversation missing participants:', doc.id);
    return null;
  }

  // Extract timestamps safely
  let createdAt = data.createdAt;
  if (!createdAt) {
    createdAt = Timestamp.now();
  } else if (typeof createdAt === 'string') {
    try {
      createdAt = Timestamp.fromDate(new Date(createdAt));
    } catch {
      createdAt = Timestamp.now();
    }
  }

  let updatedAt = data.updatedAt || data.lastMessageAt || createdAt;
  if (!updatedAt) {
    updatedAt = Timestamp.now();
  } else if (typeof updatedAt === 'string') {
    try {
      updatedAt = Timestamp.fromDate(new Date(updatedAt));
    } catch {
      updatedAt = Timestamp.now();
    }
  }

  return {
    id: doc.id,
    participants,
    createdAt,
    updatedAt,
    lastMessage: data.lastMessage || '',
    lastMessageAt: data.lastMessageAt || updatedAt,
    // Preserve other fields
    ...data,
  };
}

