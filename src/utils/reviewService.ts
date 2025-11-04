/**
 * Review Service
 * 
 * Handles post reviews and auto-calculates ratings.
 * Reviews are stored in posts/{postId}/reviews subcollection.
 * Parent post rating is automatically updated when reviews change.
 */

import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  query, 
  orderBy,
  updateDoc,
  Timestamp,
  Firestore,
} from 'firebase/firestore';
import { db } from '../api/authService';
import { requireAuth, getCurrentUserId } from './authUtils';

export interface Review {
  id: string;
  userId: string;
  rating: number; // 1 to 5
  feedback: string;
  createdAt: Timestamp | number;
}

/**
 * Add a review to a post
 * Requires authentication - throws error if user not logged in
 */
export async function addReview(
  postId: string,
  rating: number,
  feedback: string = ''
): Promise<void> {
  // Check authentication (async - waits for auth initialization)
  const isAuthenticated = await requireAuth('submit a review');
  if (!isAuthenticated) {
    throw new Error('You must be logged in to submit a review.');
  }

  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('User ID not found. Please login again.');
  }

  // Validate rating (mandatory)
  if (!rating || rating < 1 || rating > 5) {
    throw new Error('Rating must be between 1 and 5');
  }

  // Feedback is optional, so we allow empty string

  try {
    // Add review to subcollection
    const reviewsRef = collection(db, 'posts', postId, 'reviews');
    await addDoc(reviewsRef, {
      userId,
      rating,
      feedback: feedback?.trim() || '',
      createdAt: Timestamp.now(),
    });

    // Recalculate and update parent post rating
    await recalculatePostRating(postId);
  } catch (error: any) {
    console.error('Error adding review:', error);
    // Re-throw auth errors as-is, wrap others
    if (error.message && error.message.includes('logged in')) {
      throw error;
    }
    throw new Error('Failed to add review');
  }
}

/**
 * Get all reviews for a post
 */
export async function getReviews(postId: string): Promise<Review[]> {
  try {
    const reviewsRef = collection(db, 'posts', postId, 'reviews');
    const q = query(reviewsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Review[];
  } catch (error: any) {
    console.error('Error fetching reviews:', error);
    return [];
  }
}

/**
 * Recalculate average rating for a post and update the parent document
 */
export async function recalculatePostRating(postId: string): Promise<void> {
  try {
    const reviews = await getReviews(postId);
    
    if (reviews.length === 0) {
      // No reviews, set rating to null or 0
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, { rating: null });
      return;
    }

    // Calculate average rating
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    const averageRating = sum / reviews.length;
    const roundedRating = Math.round(averageRating * 10) / 10; // Round to 1 decimal

    // Update parent post
    const postRef = doc(db, 'posts', postId);
    await updateDoc(postRef, { 
      rating: roundedRating,
      reviewCount: reviews.length,
    });
  } catch (error: any) {
    console.error('Error recalculating rating:', error);
    throw new Error('Failed to update rating');
  }
}

/**
 * Get reviews for multiple posts (for batch operations)
 */
export async function getReviewsForPosts(postIds: string[]): Promise<Record<string, Review[]>> {
  const result: Record<string, Review[]> = {};
  
  await Promise.all(
    postIds.map(async (postId) => {
      result[postId] = await getReviews(postId);
    })
  );
  
  return result;
}

