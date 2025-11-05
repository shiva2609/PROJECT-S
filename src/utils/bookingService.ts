/**
 * Booking Service
 * 
 * Handles trip booking/joining logic with authentication checks.
 * Prevents duplicate bookings and manages joinedProfiles array.
 */

import { doc, getDoc, updateDoc, arrayUnion, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../api/authService';
import { requireAuth, getCurrentUserId } from './authUtils';
import { Alert } from 'react-native';

/**
 * Join a trip (book a package)
 * @param postId - ID of the trip post
 * @returns Promise<void>
 */
export async function joinTrip(postId: string): Promise<void> {
  // Check authentication (async - waits for auth initialization)
  const isAuthenticated = await requireAuth('join this trip');
  if (!isAuthenticated) {
    throw new Error('You must be logged in to join this trip.');
  }

  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('User ID not found. Please login again.');
  }

  try {
    const postRef = doc(db, 'posts', postId);
    const postDoc = await getDoc(postRef);

    if (!postDoc.exists()) {
      throw new Error('Trip not found');
    }

    const postData = postDoc.data();
    const joinedProfiles = postData.joinedProfiles || [];
    const joinedCount = postData.joinedCount || 0;
    const availableSeats = postData.availableSeats || 0;

    // Check if user already joined
    if (joinedProfiles.includes(userId)) {
      Alert.alert('Already Joined', 'You have already joined this trip.');
      throw new Error('Already joined this trip');
    }

    // Check if seats are available
    if (joinedCount >= availableSeats) {
      Alert.alert('Full', 'This trip is fully booked. No seats available.');
      throw new Error('Trip is fully booked');
    }

    // Add user to joined profiles and increment count
    await updateDoc(postRef, {
      joinedProfiles: arrayUnion(userId),
      joinedCount: increment(1),
      updatedAt: serverTimestamp(),
    });

    Alert.alert('Success', 'Booking successful! You have joined this trip.');
  } catch (error: any) {
    console.error('Error joining trip:', error);
    // Re-throw auth errors as-is
    if (error.message && error.message.includes('logged in')) {
      throw error;
    }
    // Don't show alert again if we already showed one
    if (!error.message || (!error.message.includes('Already') && !error.message.includes('Full'))) {
      throw new Error('Failed to join trip. Please try again.');
    }
    throw error;
  }
}

/**
 * Leave a trip (cancel booking)
 * @param postId - ID of the trip post
 * @returns Promise<void>
 */
export async function leaveTrip(postId: string): Promise<void> {
  const isAuthenticated = await requireAuth('leave this trip');
  if (!isAuthenticated) {
    throw new Error('You must be logged in to leave this trip.');
  }

  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('User ID not found. Please login again.');
  }

  try {
    const postRef = doc(db, 'posts', postId);
    const postDoc = await getDoc(postRef);

    if (!postDoc.exists()) {
      throw new Error('Trip not found');
    }

    const postData = postDoc.data();
    const joinedProfiles = postData.joinedProfiles || [];

    // Check if user is actually joined
    if (!joinedProfiles.includes(userId)) {
      Alert.alert('Not Joined', 'You are not currently joined to this trip.');
      throw new Error('Not joined to this trip');
    }

    // Remove user from joined profiles and decrement count
    const updatedProfiles = joinedProfiles.filter((id: string) => id !== userId);
    
    await updateDoc(postRef, {
      joinedProfiles: updatedProfiles,
      joinedCount: Math.max(0, (postData.joinedCount || 0) - 1),
      updatedAt: serverTimestamp(),
    });

    Alert.alert('Success', 'You have left this trip.');
  } catch (error: any) {
    console.error('Error leaving trip:', error);
    if (error.message && error.message.includes('logged in')) {
      throw error;
    }
    if (!error.message || !error.message.includes('Not Joined')) {
      throw new Error('Failed to leave trip. Please try again.');
    }
    throw error;
  }
}

/**
 * Check if current user has joined a trip
 * @param postId - ID of the trip post
 * @returns Promise<boolean>
 */
export async function hasUserJoined(postId: string): Promise<boolean> {
  const userId = getCurrentUserId();
  if (!userId) return false;

  try {
    const postRef = doc(db, 'posts', postId);
    const postDoc = await getDoc(postRef);

    if (!postDoc.exists()) return false;

    const postData = postDoc.data();
    const joinedProfiles = postData.joinedProfiles || [];
    return joinedProfiles.includes(userId);
  } catch (error) {
    console.error('Error checking join status:', error);
    return false;
  }
}

