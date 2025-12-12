// scripts/fix_bad_docs.js
/**
 * Non-destructive fixer. Only updates documents that are missing required fields or have bad types.
 *
 * Run:
 *  node scripts/fix_bad_docs.js
 *
 * IMPORTANT: Use service account or ADC credentials.
 */
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}
const db = admin.firestore();

function toTimestampOrServer(val) {
  if (!val) return admin.firestore.FieldValue.serverTimestamp();
  if (typeof val.toDate === 'function') return val;
  if (val && val._seconds !== undefined && val._nanoseconds !== undefined) return val;
  if (typeof val === 'string' || typeof val === 'number') {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return admin.firestore.Timestamp.fromDate(d);
  }
  return admin.firestore.FieldValue.serverTimestamp();
}

async function fixPosts(limit = 500) {
  const col = db.collection('posts');
  const snapshot = await col.limit(limit).get();
  const batch = db.batch();
  let ops = 0;
  snapshot.forEach(doc => {
    const data = doc.data();
    const update = {};
    if (data.createdAt === undefined || data.createdAt === null || typeof data.createdAt === 'string') {
      update.createdAt = toTimestampOrServer(data.createdAt);
    }
    if (!data.createdBy && data.userId) {
      update.createdBy = data.userId;
    }
    if (data.likeCount === undefined) update.likeCount = 0;
    if (data.commentCount === undefined) update.commentCount = 0;
    if (!Array.isArray(data.media)) update.media = Array.isArray(data.media) ? data.media : [];
    if (Object.keys(update).length) {
      batch.update(col.doc(doc.id), update);
      ops++;
      console.log(`[fixPosts] Will fix doc ${doc.id}:`, Object.keys(update).join(', '));
    }
  });
  if (ops) {
    console.log(`Committing ${ops} updates to posts...`);
    await batch.commit();
    console.log(`✓ Fixed ${ops} post documents`);
  } else {
    console.log('No post fixes required in sampled batch.');
  }
}

async function fixUsers(limit = 500) {
  const col = db.collection('users');
  const snapshot = await col.limit(limit).get();
  const batch = db.batch();
  let ops = 0;
  snapshot.forEach(doc => {
    const data = doc.data();
    const update = {};
    if (data.createdAt === undefined || data.createdAt === null || typeof data.createdAt === 'string') {
      update.createdAt = toTimestampOrServer(data.createdAt);
    }
    if (data.verified === undefined) update.verified = false;
    if (data.followersCount === undefined) update.followersCount = 0;
    if (data.followingCount === undefined) update.followingCount = 0;
    if (Object.keys(update).length) {
      batch.update(col.doc(doc.id), update);
      ops++;
      console.log(`[fixUsers] Will fix doc ${doc.id}:`, Object.keys(update).join(', '));
    }
  });
  if (ops) {
    console.log(`Committing ${ops} updates to users...`);
    await batch.commit();
    console.log(`✓ Fixed ${ops} user documents`);
  } else {
    console.log('No user fixes required in sampled batch.');
  }
}

async function fixFollows(limit = 500) {
  const col = db.collection('follows');
  const snapshot = await col.limit(limit).get();
  const batch = db.batch();
  let ops = 0;
  snapshot.forEach(doc => {
    const data = doc.data();
    const update = {};
    if (!data.followerId && data.follower) update.followerId = data.follower;
    if (!data.followingId && data.following) update.followingId = data.following;
    if (data.createdAt === undefined || data.createdAt === null) update.createdAt = admin.firestore.FieldValue.serverTimestamp();
    if (Object.keys(update).length) {
      batch.update(col.doc(doc.id), update);
      ops++;
      console.log(`[fixFollows] Will fix doc ${doc.id}:`, Object.keys(update).join(', '));
    }
  });
  if (ops) {
    console.log(`Committing ${ops} updates to follows...`);
    await batch.commit();
    console.log(`✓ Fixed ${ops} follow documents`);
  } else {
    console.log('No follow fixes required in sampled batch.');
  }
}

async function fixConversations(limit = 500) {
  const col = db.collection('conversations');
  const snapshot = await col.limit(limit).get();
  const batch = db.batch();
  let ops = 0;
  snapshot.forEach(doc => {
    const data = doc.data();
    const update = {};
    if (!Array.isArray(data.participants)) update.participants = Array.isArray(data.participants) ? data.participants : [];
    if (data.updatedAt === undefined || data.updatedAt === null) update.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    if (Object.keys(update).length) {
      batch.update(col.doc(doc.id), update);
      ops++;
      console.log(`[fixConversations] Will fix doc ${doc.id}:`, Object.keys(update).join(', '));
    }
  });
  if (ops) {
    console.log(`Committing ${ops} updates to conversations...`);
    await batch.commit();
    console.log(`✓ Fixed ${ops} conversation documents`);
  } else {
    console.log('No conversation fixes required in sampled batch.');
  }
}

async function fixMessages(limit = 500) {
  const col = db.collection('messages');
  const snapshot = await col.limit(limit).get();
  const batch = db.batch();
  let ops = 0;
  snapshot.forEach(doc => {
    const data = doc.data();
    const update = {};
    if (data.createdAt === undefined || data.createdAt === null) update.createdAt = admin.firestore.FieldValue.serverTimestamp();
    if (!Array.isArray(data.participants)) update.participants = Array.isArray(data.participants) ? data.participants : [];
    if (Object.keys(update).length) {
      batch.update(col.doc(doc.id), update);
      ops++;
      console.log(`[fixMessages] Will fix doc ${doc.id}:`, Object.keys(update).join(', '));
    }
  });
  if (ops) {
    console.log(`Committing ${ops} updates to messages...`);
    await batch.commit();
    console.log(`✓ Fixed ${ops} message documents`);
  } else {
    console.log('No message fixes required in sampled batch.');
  }
}

async function fixNotifications(limit = 500) {
  const col = db.collection('notifications');
  const snapshot = await col.limit(limit).get();
  const batch = db.batch();
  let ops = 0;
  snapshot.forEach(doc => {
    const data = doc.data();
    const update = {};
    if (!data.userId && data.recipientId) update.userId = data.recipientId;
    if (data.timestamp === undefined || data.timestamp === null) update.timestamp = admin.firestore.FieldValue.serverTimestamp();
    if (Object.keys(update).length) {
      batch.update(col.doc(doc.id), update);
      ops++;
      console.log(`[fixNotifications] Will fix doc ${doc.id}:`, Object.keys(update).join(', '));
    }
  });
  if (ops) {
    console.log(`Committing ${ops} updates to notifications...`);
    await batch.commit();
    console.log(`✓ Fixed ${ops} notification documents`);
  } else {
    console.log('No notification fixes required in sampled batch.');
  }
}

async function runAll() {
  console.log('Starting fixes (non-destructive sample run).');
  await fixPosts();
  await fixUsers();
  await fixFollows();
  await fixConversations();
  await fixMessages();
  await fixNotifications();
  console.log('\nSample fixes complete. Repeat with pagination to cover entire DB if necessary.');
}

runAll().catch(err => {
  console.error('Fix script failed:', err);
  process.exit(1);
});

