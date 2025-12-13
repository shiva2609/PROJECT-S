/**
 * Services Barrel Export
 * 
 * Central export point for all service modules.
 * Import from here: import { getUserById, createPost } from '@/services';
 */

// Auth Services
export * from './auth/authService';
export * from './auth/mockAuth';

// User Services
export * from './users/usersService';
export * from './users/profileService';
export * from './users/userProfilePhotoService';
export * from './users/roleRequirements';

// Post Services
export * from './posts/postsService';

// Follow Services
export * from './follow/followAPI';
export * from './follow/followService';

// Chat Services
export * from './chat/MessagesAPI';
export * from './chat/GroupsAPI';
export * from './chat/chatService';

// Notification Services
export * from './notifications/NotificationAPI';
export * from './notifications/notificationService';
export * from './notifications/rewardNotificationService';
export * from './notifications/topicNotificationService';

// Like Services
export * from './likes/likesService';

// Itinerary Services
export * from './itinerary/generateItinerary';
export * from './itinerary/itineraryService';

// Booking Services
export * from './booking/bookingService';

// Review Services
export * from './review/reviewService';

// Favorite Services
export * from './favorite/favoriteService';

// Contact Services
export * from './contacts/contactsService';

// API Services
export * from './api/apiClient';
export * from './api/firebaseConfig';
export * from './api/firebaseService';




