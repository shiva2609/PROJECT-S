# Performance Optimization Guide

## Overview
This document outlines performance optimizations implemented in the Sanchari app.

## Client-Side Optimizations

### FlatList Optimizations
All FlatLists have been optimized with:
- `keyExtractor`: Unique keys for efficient reconciliation
- `windowSize={8}`: Render 8 screens worth of items
- `initialNumToRender={5}`: Render 5 items initially
- `maxToRenderPerBatch={10}`: Render 10 items per batch
- `updateCellsBatchingPeriod={50}`: Batch updates every 50ms
- `removeClippedSubviews`: Remove off-screen views from memory
- `getItemLayout`: When possible, provide item dimensions for faster scrolling

### Component Memoization
The following components are memoized with `React.memo`:
- `PostCard`: Prevents re-renders when props haven't changed
- `MessageBubble`: Optimized for chat performance
- `CommentCard`: Reduces re-renders in comment lists

### Callback Memoization
- All event handlers use `useCallback` to prevent unnecessary re-renders
- Callbacks are only recreated when dependencies change

### Media Optimization
- PostCard uses thumbnails for feed view
- Full resolution loads only in post details
- Images are cached using React Native Image component
- Video thumbnails are generated and cached

## Backend Optimizations

### Firestore Indexes
Required composite indexes:
1. **Posts Feed**: `createdAt` (descending)
2. **User Posts**: `authorId` + `createdAt` (descending)
3. **Followers**: `followingId` + `createdAt` (descending)
4. **Following**: `followerId` + `createdAt` (descending)
5. **Messages**: `createdAt` (descending) per conversation
6. **Comments**: `postId` + `createdAt` (descending)
7. **Likes**: `userId` + `createdAt` (descending)

### Pagination
- All list queries use pagination (limit: 10-50 items)
- Cursor-based pagination for efficient loading
- Infinite scroll with `onEndReached` threshold

### Batch Writes
- Follow/unfollow operations use transactions
- Like/unlike operations use transactions
- Counter updates are atomic

### Retry Logic
- Exponential backoff for network failures
- Retryable errors: `unavailable`, `deadline-exceeded`, `network-error`
- Max retries: 3
- Initial delay: 1 second, max delay: 10 seconds

## Bundle Optimization

### Metro Config
- Hermes engine enabled (default in React Native 0.82+)
- Tree shaking enabled
- Unused code elimination

### Code Splitting
- Lazy loading for heavy screens
- Dynamic imports for optional features

### Dependency Management
- Remove unused libraries
- Use lightweight alternatives where possible
- Bundle size monitoring

## Performance Monitoring

### Metrics to Track
1. **Time to Interactive (TTI)**: App startup time
2. **Feed Load Time**: Time to first post
3. **Scroll Performance**: FPS during scrolling
4. **Memory Usage**: Monitor for leaks
5. **Network Requests**: Count and size

### Tools
- React Native Performance Monitor
- Flipper Performance Plugin
- Firebase Performance Monitoring (recommended)

## Best Practices

1. **Avoid unnecessary re-renders**
   - Use `React.memo` for pure components
   - Use `useMemo` for expensive calculations
   - Use `useCallback` for event handlers

2. **Optimize images**
   - Use appropriate image sizes
   - Implement lazy loading
   - Cache images locally

3. **Minimize API calls**
   - Batch requests where possible
   - Cache responses locally
   - Use optimistic updates

4. **Monitor performance**
   - Profile with React DevTools
   - Monitor bundle size
   - Track API response times

## Checklist

- [x] FlatList optimizations applied
- [x] Component memoization implemented
- [x] Callback memoization implemented
- [x] Retry logic with exponential backoff
- [x] Transactions for counter updates
- [x] Pagination for all list queries
- [ ] Bundle size analysis (recommended)
- [ ] Performance monitoring setup (recommended)



