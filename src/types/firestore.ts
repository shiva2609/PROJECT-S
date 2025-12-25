/**
 * Firestore Document Type Definitions
 * 
 * Strict TypeScript interfaces matching Firestore schema
 * All fields match actual Firestore documents with proper optional types
 */

import { Timestamp } from '../core/firebase/compat';

/**
 * User Document Interface
 * Collection: users/{userId}
 */
export interface User {
  id: string;
  username: string;
  name: string;
  bio?: string;
  profilePhoto?: string | null;
  photoUrl?: string | null;
  photoURL?: string | null;
  profilePic?: string | null;
  accountType?: string;
  verified?: boolean;
  createdAt: Timestamp | null | number;
  followersCount: number;
  followingCount: number;
  postsCount?: number;
  email?: string;
  pushTokens?: string[];
  location?: string;
  aboutMe?: string;
  interests?: string[];
  countriesVisited?: string[];
  statesVisited?: string[];
  userTag?: string;
  displayName?: string;
  fullName?: string;
  verificationStatus?: string;
  travelPlan?: any[];
  onboardingComplete?: boolean;
  [key: string]: any; // Allow additional fields
}

/**
 * Post Document Interface
 * Collection: posts/{postId}
 */
export interface Post {
  id: string;
  createdBy: string;
  userId?: string;
  ownerId?: string;
  authorId?: string | null;
  createdAt: Timestamp | null | number;
  imageURL?: string | null;
  imageUrl?: string | null;
  mediaUrl?: string | null;
  coverImage?: string | null;
  gallery?: string[];
  media?: string[];
  mediaUrls?: string[];
  likeCount: number;
  likesCount?: number;
  commentCount: number;
  commentsCount?: number;
  savedCount?: number;
  caption?: string;
  content?: string;
  savedBy?: string[];
  isPublic?: boolean;
  metadata?: any;
  aspectRatio?: number;
  hashtags?: string[];
  location?: string | { id: string; name: string; coords?: { lat: number; lng: number } } | null;
  [key: string]: any; // Allow additional fields
}

/**
 * Follow Document Interface
 * Collection: follows/{followId}
 */
export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  followedId?: string;
  follower?: string; // Legacy field
  following?: string; // Legacy field
  createdAt: Timestamp | null;
  timestamp?: Timestamp | null; // Legacy field
  [key: string]: any; // Allow additional fields
}

/**
 * Notification Document Interface
 * Collection: notifications/{notificationId} or users/{userId}/notifications/{notificationId}
 */
export interface Notification {
  id: string;
  userId: string;
  recipientId?: string; // Legacy field
  type: string;
  category?: string;
  actorId?: string;
  sourceUserId?: string;
  postId?: string;
  message?: string;
  data?: any;
  timestamp: Timestamp | null;
  createdAt?: Timestamp | null;
  read: boolean;
  notificationType?: string; // Legacy field
  [key: string]: any; // Allow additional fields
}

/**
 * Message Document Interface
 * Collection: messages/{messageId} or conversations/{conversationId}/messages/{messageId}
 */
export interface Message {
  id: string;
  threadId?: string;
  conversationId?: string;
  from: string;
  senderId?: string;
  to: string[];
  participants?: string[];
  participant?: string; // Legacy field
  text?: string;
  message?: string; // Legacy field
  mediaUrl?: string;
  media?: string[];
  type: 'text' | 'image' | 'video';
  createdAt: Timestamp | null;
  delivered?: boolean;
  read?: boolean;
  [key: string]: any; // Allow additional fields
}

/**
 * Conversation Document Interface
 * Collection: conversations/{conversationId}
 */
export interface Conversation {
  id: string;
  participants: string[];
  participant?: string; // Legacy field
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  lastMessage?: string;
  lastMessageAt?: Timestamp | null;
  [key: string]: any; // Allow additional fields
}

/**
 * Follow State (not a Firestore document, but a computed state)
 */
export interface FollowState {
  isFollowing: boolean;
  followId: string | null;
}


