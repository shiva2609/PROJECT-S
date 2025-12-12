/**
 * Favorite Service
 * 
 * Handles favorite/bookmark functionality with authentication checks.
 * Stores favorites in user's document in Firestore.
 */

import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, getDocs, query, where, collection } from 'firebase/firestore';
import { db } from '../auth/authService';
import { requireAuth, getCurrentUserId } from '../../utils/authUtils';
import { Alert } from 'react-native';

const FAVORITES_COLLECTION = 'favorites';
const USER_FAVORITES_FIELD = 'favoritePostIds';

/**
 * Add a post to favorites
 * @param postId - ID of the post to favorite
 * @returns Promise<void>
 */
export async function addToFavorites(postId: string): Promise<void> {
  // Check authentication (async - waits for auth initialization)
  const isAuthenticated = await requireAuth('add to favorites');
  if (!isAuthenticated) {
    throw new Error('You must be logged in to add to favorites.');
  }

  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('User ID not found. Please login again.');
  }

  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('User document not found');
    }

    const userData = userDoc.data();
    const favorites = userData[USER_FAVORITES_FIELD] || [];

    // Check if already favorited
    if (favorites.includes(postId)) {
      Alert.alert('Already Favorited', 'This post is already in your favorites.');
      return;
    }

    // Add to favorites
    await updateDoc(userRef, {
      [USER_FAVORITES_FIELD]: arrayUnion(postId),
      updatedAt: Date.now(),
    });

    Alert.alert('Success', 'Added to favorites.');
  } catch (error: any) {
    console.error('Error adding to favorites:', error);
    if (error.message && error.message.includes('logged in')) {
      throw error;
    }
    if (!error.message || !error.message.includes('Already')) {
      Alert.alert('Error', 'Failed to add to favorites. Please try again.');
    }
    throw error;
  }
}

/**
 * Remove a post from favorites
 * @param postId - ID of the post to unfavorite
 * @returns Promise<void>
 */
export async function removeFromFavorites(postId: string): Promise<void> {
  const isAuthenticated = await requireAuth('remove from favorites');
  if (!isAuthenticated) {
    throw new Error('You must be logged in to remove from favorites.');
  }

  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('User ID not found. Please login again.');
  }

  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('User document not found');
    }

    const userData = userDoc.data();
    const favorites = userData[USER_FAVORITES_FIELD] || [];

    // Check if not favorited
    if (!favorites.includes(postId)) {
      Alert.alert('Not Favorited', 'This post is not in your favorites.');
      return;
    }

    // Remove from favorites
    await updateDoc(userRef, {
      [USER_FAVORITES_FIELD]: arrayRemove(postId),
      updatedAt: Date.now(),
    });

    Alert.alert('Success', 'Removed from favorites.');
  } catch (error: any) {
    console.error('Error removing from favorites:', error);
    if (error.message && error.message.includes('logged in')) {
      throw error;
    }
    if (!error.message || !error.message.includes('Not Favorited')) {
      Alert.alert('Error', 'Failed to remove from favorites. Please try again.');
    }
    throw error;
  }
}

/**
 * Check if a post is favorited by current user
 * @param postId - ID of the post
 * @returns Promise<boolean>
 */
export async function isFavorited(postId: string): Promise<boolean> {
  const userId = getCurrentUserId();
  if (!userId) return false;

  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) return false;

    const userData = userDoc.data();
    const favorites = userData[USER_FAVORITES_FIELD] || [];
    return favorites.includes(postId);
  } catch (error) {
    console.error('Error checking favorite status:', error);
    return false;
  }
}

/**
 * Get all favorited post IDs for current user
 * @returns Promise<string[]>
 */
export async function getUserFavorites(): Promise<string[]> {
  const userId = getCurrentUserId();
  if (!userId) return [];

  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) return [];

    const userData = userDoc.data();
    return userData[USER_FAVORITES_FIELD] || [];
  } catch (error) {
    console.error('Error fetching favorites:', error);
    return [];
  }
}

