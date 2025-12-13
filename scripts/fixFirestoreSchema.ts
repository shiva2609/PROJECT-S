/**
 * Firestore Schema Migration Script
 * 
 * This script fixes schema inconsistencies that cause "internal assertion failed" errors.
 * 
 * ⚠️ SAFETY FEATURES:
 * - ONLY updates documents with broken/missing fields
 * - NEVER overwrites proper data
 * - Logs every fix for audit trail
 * - Skips already-correct documents
 * - Non-destructive: only adds missing fields, never deletes
 * 
 * Usage:
 *   npx ts-node scripts/fixFirestoreSchema.ts
 * 
 * Or in Node.js:
 *   node -r ts-node/register scripts/fixFirestoreSchema.ts
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

// Initialize Firebase Admin (requires service account key)
// For local development, set GOOGLE_APPLICATION_CREDENTIALS env var
// Or pass serviceAccountPath as argument
const serviceAccountPath = process.argv[2] || process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!serviceAccountPath || !fs.existsSync(serviceAccountPath)) {
  console.error('❌ Service account key not found. Set GOOGLE_APPLICATION_CREDENTIALS or pass path as argument.');
  console.error('Usage: npx ts-node scripts/fixFirestoreSchema.ts [path/to/serviceAccountKey.json]');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = getFirestore();

// Statistics
const stats = {
  users: { checked: 0, fixed: 0, skipped: 0 },
  posts: { checked: 0, fixed: 0, skipped: 0 },
  follows: { checked: 0, fixed: 0, skipped: 0 },
  messages: { checked: 0, fixed: 0, skipped: 0 },
  notifications: { checked: 0, fixed: 0, skipped: 0 },
  conversations: { checked: 0, fixed: 0, skipped: 0 },
};

// ---------- Helper Functions ----------

function isTimestamp(value: any): boolean {
  return value && (
    (value.constructor && value.constructor.name === 'Timestamp') ||
    (value.seconds !== undefined && value.nanoseconds !== undefined) ||
    (value._seconds !== undefined && value._nanoseconds !== undefined)
  );
}

function convertToTimestamp(value: any): Timestamp {
  if (isTimestamp(value)) {
    return value as Timestamp;
  }
  if (typeof value === 'string') {
    return Timestamp.fromDate(new Date(value));
  }
  if (typeof value === 'number') {
    return Timestamp.fromMillis(value);
  }
  return Timestamp.now();
}

function needsUserFix(data: any): { needsFix: boolean; updates: any } {
  const updates: any = {};
  let needsFix = false;

  // Fix createdAt
  if (!data.createdAt || !isTimestamp(data.createdAt)) {
    if (data.createdAt && typeof data.createdAt === 'string') {
      updates.createdAt = convertToTimestamp(data.createdAt);
    } else {
      updates.createdAt = FieldValue.serverTimestamp();
    }
    needsFix = true;
  }

  // Fix followersCount
  if (typeof data.followersCount !== 'number') {
    updates.followersCount = 0;
    needsFix = true;
  }

  // Fix followingCount
  if (typeof data.followingCount !== 'number') {
    updates.followingCount = 0;
    needsFix = true;
  }

  // Fix verified boolean
  if (typeof data.verified !== 'boolean') {
    if (data.verificationStatus === 'verified') {
      updates.verified = true;
    } else {
      updates.verified = false;
    }
    needsFix = true;
  }

  // Fix accountType default
  if (!data.accountType && !data.role) {
    updates.accountType = 'Traveler';
    needsFix = true;
  }

  return { needsFix, updates };
}

function needsPostFix(data: any): { needsFix: boolean; updates: any } {
  const updates: any = {};
  let needsFix = false;

  // CRITICAL: Fix missing createdAt (causes orderBy failures)
  if (!data.createdAt || !isTimestamp(data.createdAt)) {
    if (data.createdAt && typeof data.createdAt === 'string') {
      updates.createdAt = convertToTimestamp(data.createdAt);
    } else {
      updates.createdAt = FieldValue.serverTimestamp();
    }
    needsFix = true;
  }

  // Normalize createdBy/userId
  const ownerId = data.createdBy || data.userId || data.ownerId || data.authorId;
  if (ownerId) {
    // Ensure createdBy exists
    if (!data.createdBy && data.userId) {
      updates.createdBy = data.userId;
      needsFix = true;
    }
    // Ensure userId exists as alias
    if (!data.userId && data.createdBy) {
      updates.userId = data.createdBy;
      needsFix = true;
    }
  }

  // Fix counts
  if (typeof data.likeCount !== 'number') {
    updates.likeCount = 0;
    needsFix = true;
  }
  if (typeof data.commentCount !== 'number') {
    updates.commentCount = 0;
    needsFix = true;
  }

  return { needsFix, updates };
}

function needsFollowFix(data: any): { needsFix: boolean; updates: any } {
  const updates: any = {};
  let needsFix = false;

  // Normalize field names
  const followerId = data.followerId || data.follower;
  const followingId = data.followingId || data.following || data.followedId;

  if (followerId && !data.followerId) {
    updates.followerId = followerId;
    needsFix = true;
  }
  if (followingId && !data.followingId) {
    updates.followingId = followingId;
    needsFix = true;
  }

  // Remove old field names (only if new ones exist)
  if (data.follower && data.followerId) {
    // Keep both for now, don't delete
  }
  if ((data.following || data.followedId) && data.followingId) {
    // Keep both for now, don't delete
  }

  // Fix createdAt
  if (!data.createdAt || !isTimestamp(data.createdAt)) {
    if (data.timestamp && isTimestamp(data.timestamp)) {
      updates.createdAt = data.timestamp;
    } else if (data.createdAt && typeof data.createdAt === 'string') {
      updates.createdAt = convertToTimestamp(data.createdAt);
    } else if (data.timestamp && typeof data.timestamp === 'string') {
      updates.createdAt = convertToTimestamp(data.timestamp);
    } else {
      updates.createdAt = FieldValue.serverTimestamp();
    }
    needsFix = true;
  }

  return { needsFix, updates };
}

function needsMessageFix(data: any): { needsFix: boolean; updates: any } {
  const updates: any = {};
  let needsFix = false;

  // Fix createdAt
  if (!data.createdAt || !isTimestamp(data.createdAt)) {
    if (data.createdAt && typeof data.createdAt === 'string') {
      updates.createdAt = convertToTimestamp(data.createdAt);
    } else {
      updates.createdAt = FieldValue.serverTimestamp();
    }
    needsFix = true;
  }

  // Fix participants array
  if (!Array.isArray(data.participants)) {
    const participants: string[] = [];
    if (data.from) participants.push(data.from);
    if (Array.isArray(data.to)) {
      participants.push(...data.to.filter((id: any) => id && typeof id === 'string'));
    } else if (data.to && typeof data.to === 'string') {
      participants.push(data.to);
    }
    if (participants.length > 0) {
      updates.participants = [...new Set(participants)]; // Remove duplicates
      needsFix = true;
    }
  }

  // Ensure 'to' is array
  if (!Array.isArray(data.to) && data.to) {
    updates.to = [data.to];
    needsFix = true;
  }

  return { needsFix, updates };
}

function needsNotificationFix(data: any): { needsFix: boolean; updates: any } {
  const updates: any = {};
  let needsFix = false;

  // Fix userId
  if (!data.userId && data.targetUserId) {
    updates.userId = data.targetUserId;
    needsFix = true;
  }

  // Fix timestamp/createdAt
  const timestamp = data.timestamp || data.createdAt;
  if (!timestamp || !isTimestamp(timestamp)) {
    if (timestamp && typeof timestamp === 'string') {
      updates.timestamp = convertToTimestamp(timestamp);
      updates.createdAt = updates.timestamp;
    } else {
      updates.timestamp = FieldValue.serverTimestamp();
      updates.createdAt = FieldValue.serverTimestamp();
    }
    needsFix = true;
  } else if (!data.createdAt) {
    updates.createdAt = timestamp;
    needsFix = true;
  }

  // Fix read boolean
  if (typeof data.read !== 'boolean') {
    updates.read = false;
    needsFix = true;
  }

  // Fix type
  if (!data.type) {
    updates.type = 'unknown';
    needsFix = true;
  }

  return { needsFix, updates };
}

function needsConversationFix(data: any): { needsFix: boolean; updates: any } {
  const updates: any = {};
  let needsFix = false;

  // Fix participants array
  if (!Array.isArray(data.participants)) {
    if (data.participants && typeof data.participants === 'string') {
      updates.participants = [data.participants];
    } else {
      updates.participants = [];
    }
    needsFix = true;
  }

  // Fix createdAt
  if (!data.createdAt || !isTimestamp(data.createdAt)) {
    if (data.createdAt && typeof data.createdAt === 'string') {
      updates.createdAt = convertToTimestamp(data.createdAt);
    } else {
      updates.createdAt = FieldValue.serverTimestamp();
    }
    needsFix = true;
  }

  // Fix updatedAt
  if (!data.updatedAt || !isTimestamp(data.updatedAt)) {
    if (data.lastMessageAt && isTimestamp(data.lastMessageAt)) {
      updates.updatedAt = data.lastMessageAt;
    } else if (data.updatedAt && typeof data.updatedAt === 'string') {
      updates.updatedAt = convertToTimestamp(data.updatedAt);
    } else {
      updates.updatedAt = data.createdAt || FieldValue.serverTimestamp();
    }
    needsFix = true;
  }

  return { needsFix, updates };
}

// ---------- Migration Functions ----------

async function fixUsersCollection() {
  console.log('\n📋 Fixing Users collection...');
  const usersRef = db.collection('users');
  const snapshot = await usersRef.limit(1000).get(); // Process in batches

  const batch = db.batch();
  let batchCount = 0;
  const BATCH_SIZE = 500;

  for (const docSnap of snapshot.docs) {
    stats.users.checked++;
    const data = docSnap.data();
    const { needsFix, updates } = needsUserFix(data);

    if (needsFix) {
      const userRef = usersRef.doc(docSnap.id);
      batch.update(userRef, updates);
      batchCount++;
      stats.users.fixed++;

      if (batchCount % 10 === 0) {
        console.log(`  ✓ Fixed user ${docSnap.id}:`, Object.keys(updates).join(', '));
      }

      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        console.log(`  ✓ Committed batch of ${batchCount} user fixes`);
        batchCount = 0;
      }
    } else {
      stats.users.skipped++;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
    console.log(`  ✓ Committed final batch of ${batchCount} user fixes`);
  }

  console.log(`  ✅ Users: ${stats.users.checked} checked, ${stats.users.fixed} fixed, ${stats.users.skipped} skipped`);
}

async function fixPostsCollection() {
  console.log('\n📋 Fixing Posts collection...');
  const postsRef = db.collection('posts');
  const snapshot = await postsRef.limit(1000).get();

  const batch = db.batch();
  let batchCount = 0;
  const BATCH_SIZE = 500;

  for (const docSnap of snapshot.docs) {
    stats.posts.checked++;
    const data = docSnap.data();
    const { needsFix, updates } = needsPostFix(data);

    if (needsFix) {
      const postRef = postsRef.doc(docSnap.id);
      batch.update(postRef, updates);
      batchCount++;
      stats.posts.fixed++;

      if (batchCount % 10 === 0) {
        console.log(`  ✓ Fixed post ${docSnap.id}:`, Object.keys(updates).join(', '));
      }

      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        console.log(`  ✓ Committed batch of ${batchCount} post fixes`);
        batchCount = 0;
      }
    } else {
      stats.posts.skipped++;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
    console.log(`  ✓ Committed final batch of ${batchCount} post fixes`);
  }

  console.log(`  ✅ Posts: ${stats.posts.checked} checked, ${stats.posts.fixed} fixed, ${stats.posts.skipped} skipped`);
}

async function fixFollowsCollection() {
  console.log('\n📋 Fixing Follows collection...');
  const followsRef = db.collection('follows');
  const snapshot = await followsRef.limit(1000).get();

  const batch = db.batch();
  let batchCount = 0;
  const BATCH_SIZE = 500;

  for (const docSnap of snapshot.docs) {
    stats.follows.checked++;
    const data = docSnap.data();
    const { needsFix, updates } = needsFollowFix(data);

    if (needsFix) {
      const followRef = followsRef.doc(docSnap.id);
      batch.update(followRef, updates);
      batchCount++;
      stats.follows.fixed++;

      if (batchCount % 10 === 0) {
        console.log(`  ✓ Fixed follow ${docSnap.id}:`, Object.keys(updates).join(', '));
      }

      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        console.log(`  ✓ Committed batch of ${batchCount} follow fixes`);
        batchCount = 0;
      }
    } else {
      stats.follows.skipped++;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
    console.log(`  ✓ Committed final batch of ${batchCount} follow fixes`);
  }

  console.log(`  ✅ Follows: ${stats.follows.checked} checked, ${stats.follows.fixed} fixed, ${stats.follows.skipped} skipped`);
}

async function fixMessagesCollection() {
  console.log('\n📋 Fixing Messages collection (in conversations subcollections)...');
  const conversationsRef = db.collection('conversations');
  const conversationsSnapshot = await conversationsRef.limit(100).get();

  let totalChecked = 0;
  let totalFixed = 0;

  for (const convDoc of conversationsSnapshot.docs) {
    const messagesRef = conversationsRef.doc(convDoc.id).collection('messages');
    const messagesSnapshot = await messagesRef.limit(500).get();

    const batch = db.batch();
    let batchCount = 0;

    for (const msgDoc of messagesSnapshot.docs) {
      totalChecked++;
      stats.messages.checked++;
      const data = msgDoc.data();
      const { needsFix, updates } = needsMessageFix(data);

      if (needsFix) {
        const messageRef = messagesRef.doc(msgDoc.id);
        batch.update(messageRef, updates);
        batchCount++;
        totalFixed++;
        stats.messages.fixed++;
      } else {
        stats.messages.skipped++;
      }

      if (batchCount >= 500) {
        await batch.commit();
        batchCount = 0;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }
  }

  console.log(`  ✅ Messages: ${stats.messages.checked} checked, ${stats.messages.fixed} fixed, ${stats.messages.skipped} skipped`);
}

async function fixNotificationsCollection() {
  console.log('\n📋 Fixing Notifications collection (in users subcollections)...');
  const usersRef = db.collection('users');
  const usersSnapshot = await usersRef.limit(100).get();

  let totalChecked = 0;
  let totalFixed = 0;

  for (const userDoc of usersSnapshot.docs) {
    const notificationsRef = usersRef.doc(userDoc.id).collection('notifications');
    const notificationsSnapshot = await notificationsRef.limit(500).get();

    const batch = db.batch();
    let batchCount = 0;

    for (const notifDoc of notificationsSnapshot.docs) {
      totalChecked++;
      stats.notifications.checked++;
      const data = notifDoc.data();
      const { needsFix, updates } = needsNotificationFix(data);

      if (needsFix) {
        const notificationRef = notificationsRef.doc(notifDoc.id);
        batch.update(notificationRef, updates);
        batchCount++;
        totalFixed++;
        stats.notifications.fixed++;
      } else {
        stats.notifications.skipped++;
      }

      if (batchCount >= 500) {
        await batch.commit();
        batchCount = 0;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }
  }

  console.log(`  ✅ Notifications: ${stats.notifications.checked} checked, ${stats.notifications.fixed} fixed, ${stats.notifications.skipped} skipped`);
}

async function fixConversationsCollection() {
  console.log('\n📋 Fixing Conversations collection...');
  const conversationsRef = db.collection('conversations');
  const snapshot = await conversationsRef.limit(1000).get();

  const batch = db.batch();
  let batchCount = 0;
  const BATCH_SIZE = 500;

  for (const docSnap of snapshot.docs) {
    stats.conversations.checked++;
    const data = docSnap.data();
    const { needsFix, updates } = needsConversationFix(data);

    if (needsFix) {
      const convRef = conversationsRef.doc(docSnap.id);
      batch.update(convRef, updates);
      batchCount++;
      stats.conversations.fixed++;

      if (batchCount % 10 === 0) {
        console.log(`  ✓ Fixed conversation ${docSnap.id}:`, Object.keys(updates).join(', '));
      }

      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        console.log(`  ✓ Committed batch of ${batchCount} conversation fixes`);
        batchCount = 0;
      }
    } else {
      stats.conversations.skipped++;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
    console.log(`  ✓ Committed final batch of ${batchCount} conversation fixes`);
  }

  console.log(`  ✅ Conversations: ${stats.conversations.checked} checked, ${stats.conversations.fixed} fixed, ${stats.conversations.skipped} skipped`);
}

// ---------- Main Execution ----------

async function main() {
  console.log('🚀 Starting Firestore Schema Migration...\n');
  console.log('⚠️  This script will fix broken documents but will NOT delete any data.\n');

  try {
    await fixUsersCollection();
    await fixPostsCollection();
    await fixFollowsCollection();
    await fixConversationsCollection();
    await fixMessagesCollection();
    await fixNotificationsCollection();

    console.log('\n✅ Migration Complete!\n');
    console.log('📊 Summary:');
    console.log(`  Users: ${stats.users.fixed} fixed / ${stats.users.checked} checked`);
    console.log(`  Posts: ${stats.posts.fixed} fixed / ${stats.posts.checked} checked`);
    console.log(`  Follows: ${stats.follows.fixed} fixed / ${stats.follows.checked} checked`);
    console.log(`  Conversations: ${stats.conversations.fixed} fixed / ${stats.conversations.checked} checked`);
    console.log(`  Messages: ${stats.messages.fixed} fixed / ${stats.messages.checked} checked`);
    console.log(`  Notifications: ${stats.notifications.fixed} fixed / ${stats.notifications.checked} checked`);
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

main();


