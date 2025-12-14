/**
 * Normalize User Document
 * 
 * Converts raw Firestore document to typed User interface
 * Ensures all required fields exist with safe defaults
 */

import { Timestamp } from 'firebase/firestore';
import { User } from '../../types/firestore';

/**
 * Check if value is a Firestore Timestamp
 */
function isTimestamp(v: any): v is Timestamp {
  return v && (
    (typeof v.toDate === 'function') ||
    (v._seconds !== undefined && v._nanoseconds !== undefined) ||
    (v.seconds !== undefined && v.nanoseconds !== undefined)
  );
}

/**
 * Convert value to Timestamp
 */
function toTimestamp(v: any): Timestamp {
  if (isTimestamp(v)) {
    return v;
  }
  if (typeof v === 'string') {
    try {
      return Timestamp.fromDate(new Date(v));
    } catch {
      return Timestamp.now();
    }
  }
  if (typeof v === 'number') {
    try {
      return Timestamp.fromMillis(v);
    } catch {
      return Timestamp.now();
    }
  }
  return Timestamp.now();
}

/**
 * Normalize user document to User interface
 * @param raw - Raw Firestore document data
 * @returns Normalized User object with safe defaults
 */
export function normalizeUser(raw: any): User {
  // Handle Firestore Snapshot
  if (raw && typeof raw.data === 'function') {
    const data = raw.data();
    raw = { ...data, id: raw.id };
  }

  if (!raw || typeof raw !== 'object') {
    // Return minimal safe user
    return {
      id: raw?.id || '',
      username: '',
      name: 'User',
      bio: '',
      profilePhoto: null,
      accountType: 'Traveler',
      verified: false,
      createdAt: Timestamp.now(),
      followersCount: 0,
      followingCount: 0,
      postsCount: 0,
    };
  }

  const username = raw.username || raw.handle || '';

  return {
    id: raw.id || raw.uid || '',
    username: username,
    name: raw.name || raw.fullName || raw.displayName || username || 'User',
    bio: raw.bio || raw.aboutMe || raw.about || '',
    profilePhoto: raw.profilePhoto || raw.photoURL || raw.photoUrl || raw.profilePic || null,
    photoUrl: raw.photoUrl || raw.photoURL || raw.profilePhoto || raw.profilePic || null,
    photoURL: raw.photoURL || raw.photoUrl || raw.profilePhoto || raw.profilePic || null,
    profilePic: raw.profilePic || raw.profilePhoto || raw.photoURL || raw.photoUrl || null,
    accountType: raw.accountType || raw.role || 'Traveler',
    verified: raw.verified === true || raw.verificationStatus === 'verified' || false,
    createdAt: raw.createdAt ? toTimestamp(raw.createdAt) : Timestamp.now(),
    followersCount: typeof raw.followersCount === 'number' ? Math.max(0, raw.followersCount) : 0,
    followingCount: typeof raw.followingCount === 'number' ? Math.max(0, raw.followingCount) : 0,
    postsCount: typeof raw.postsCount === 'number' ? Math.max(0, raw.postsCount) : 0,
    email: raw.email || undefined,
    pushTokens: Array.isArray(raw.pushTokens) ? raw.pushTokens : undefined,
    location: raw.location || undefined,
    aboutMe: raw.aboutMe || raw.about || undefined,
    interests: Array.isArray(raw.interests) ? raw.interests : undefined,
    countriesVisited: Array.isArray(raw.countriesVisited) ? raw.countriesVisited : undefined,
    statesVisited: Array.isArray(raw.statesVisited) ? raw.statesVisited : undefined,
    userTag: raw.userTag || undefined,
    displayName: raw.displayName || raw.name || undefined,
    fullName: raw.fullName || raw.name || undefined,
    verificationStatus: raw.verificationStatus || undefined,
    travelPlan: Array.isArray(raw.travelPlan) ? raw.travelPlan : [],
    onboardingComplete: raw.onboardingComplete === true,
  };
}


