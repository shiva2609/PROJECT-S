# Firestore Composite Index Setup Guide

## Issue

The Notifications screen query requires a composite index because it uses both:
- `where('userId', '==', user.uid)`
- `orderBy('timestamp', 'desc')`

## Solution Options

### Option 1: Create the Index (Recommended for Production)

Firebase will provide a link in the error message. Click it to create the index automatically.

**Manual Steps:**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `sanchari-truetraveller`
3. Navigate to **Firestore Database** → **Indexes** tab
4. Click **Create Index**
5. Configure:
   - **Collection ID**: `notifications`
   - **Fields to index**:
     - `userId` (Ascending)
     - `timestamp` (Descending)
   - **Query scope**: Collection
6. Click **Create**

**Or use the error link:**
- When the error appears, it includes a URL like:
  ```
  https://console.firebase.google.com/v1/r/project/sanchari-truetraveller/firestore/indexes?create_composite=...
  ```
- Click this link to auto-create the index

**Wait Time:**
- Index creation takes a few minutes
- The app will work once the index is built

### Option 2: Use Current Code (Temporary Workaround)

The code has been updated to:
- Try the query with `orderBy` first
- Fall back to query without `orderBy` if index doesn't exist
- Sort results in memory

This works but is less efficient for large datasets.

## Recommended Indexes

For optimal performance, create these indexes:

### 1. Notifications by User and Timestamp
```
Collection: notifications
Fields:
  - userId (Ascending)
  - timestamp (Descending)
```

### 2. Notifications by User, Category, and Read Status
```
Collection: notifications
Fields:
  - userId (Ascending)
  - category (Ascending)
  - read (Ascending)
```

### 3. Notifications by User and Type
```
Collection: notifications
Fields:
  - userId (Ascending)
  - type (Ascending)
```

## Verification

After creating the index:

1. Wait 2-5 minutes for index to build
2. Check Firebase Console → Firestore → Indexes
3. Status should show "Enabled" (green)
4. Restart your app
5. Navigate to Notifications screen
6. Error should be gone

## Notes

- Indexes are free but count toward Firestore quotas
- Composite indexes are required when combining `where` and `orderBy` on different fields
- The app will work without the index (using fallback), but queries will be slower

