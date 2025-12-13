# Security & Privacy Guide

## Overview
This document outlines security best practices and requirements for the Sanchari app.

## Firestore Security Rules

### User Profile Rules
- Users can only read their own profile or public profiles
- Users can only update their own profile
- Profile images are public (for feed display)
- Private fields (email, pushTokens) are only readable by the user

### Posts Rules
- Posts are public by default (for feed)
- Users can only create/update/delete their own posts
- Deleted posts cannot be accessed
- Media URLs are public (for feed display)

### Follow Rules
- Users can read follow relationships
- Users can only create/delete their own follow relationships
- Follow actions are validated server-side

### Messages Rules
- Only conversation participants can read/write messages
- Messages are stored in subcollections for scalability
- Media in messages is private (only participants can access)

### Comments Rules
- Comments are public (attached to public posts)
- Users can only create/update/delete their own comments
- Deleted comments cannot be accessed

### Likes Rules
- Like relationships are public (for counts)
- Users can only create/delete their own likes
- Like actions are idempotent (using transactions)

## Storage Security Rules

### Profile Images
- **Path**: `users/{userId}/profile/{imageId}`
- **Access**: Public read, user-only write
- **Use Case**: Display in feed, profile, comments

### Post Media
- **Path**: `posts/{postId}/media/{mediaId}`
- **Access**: Public read, post author-only write
- **Use Case**: Display in feed, post details

### Message Media
- **Path**: `messages/{conversationId}/{messageId}/{mediaId}`
- **Access**: Private (only conversation participants)
- **Use Case**: Chat attachments

## Push Token Security

### Requirements
1. Push tokens are stored in user document under `pushTokens` array
2. Tokens are removed on logout (via `usePushTokenManager`)
3. Tokens are only readable/writable by the user
4. Tokens are used only for notifications (not for tracking)

### Implementation
- `usePushTokenManager.removePushToken()` is called on logout
- Tokens are validated before sending notifications
- Expired tokens are cleaned up server-side

## API Security

### Authentication
- All API calls require authenticated user (via `useAuth`)
- User ID is validated server-side
- Unauthorized requests are rejected

### Rate Limiting
- Client-side throttling for hot endpoints (like/unlike, follow/unfollow)
- Server-side rate limiting recommended for production

### Data Validation
- All inputs are validated before API calls
- Username validation (no spaces, alphanumeric + underscores)
- Media file size limits enforced

## Best Practices

1. **Never expose sensitive data in client code**
   - API keys, secrets, admin credentials
   - Use environment variables for config

2. **Validate all user inputs**
   - Sanitize text inputs
   - Validate file types and sizes
   - Check user permissions before actions

3. **Use transactions for critical operations**
   - Like/unlike (updates like count)
   - Follow/unfollow (updates follower counts)
   - Comment creation (updates comment count)

4. **Implement proper error handling**
   - Don't expose internal errors to users
   - Use `formatError()` for user-friendly messages
   - Log errors server-side for debugging

5. **Secure media uploads**
   - Validate file types
   - Scan for malicious content (server-side)
   - Enforce file size limits
   - Use signed URLs for private media

6. **Protect user privacy**
   - Don't expose email addresses
   - Respect user privacy settings
   - Allow users to delete their data

## Security Checklist

- [x] Firestore security rules implemented
- [x] Storage security rules implemented
- [x] Push token cleanup on logout
- [x] Transactions for counter updates
- [x] Input validation in API functions
- [x] Error handling with formatError
- [ ] Server-side rate limiting (recommended)
- [ ] Media content scanning (recommended)
- [ ] Signed URLs for private media (recommended)

## Reporting Security Issues

If you discover a security vulnerability, please report it to the development team immediately. Do not disclose publicly until it has been addressed.




