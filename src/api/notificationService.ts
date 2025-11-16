/**
 * Notification Service
 * 
 * Handles tracking unread notifications and messages
 */

import { 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot, 
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  Timestamp
} from 'firebase/firestore';
import { db } from './authService';

const UNREAD_COUNTS_COLLECTION = 'unreadCounts';
const LAST_READ_COLLECTION = 'lastRead';

/**
 * Get last read timestamp for a user's chat
 */
export async function getLastReadTimestamp(userId: string, chatId: string): Promise<number> {
  try {
    const lastReadRef = doc(db, 'users', userId, 'lastRead', chatId);
    const lastReadDoc = await getDoc(lastReadRef);
    if (lastReadDoc.exists()) {
      const data = lastReadDoc.data();
      const timestamp = data.timestamp || data.lastReadAt;
      
      // Handle Firestore Timestamp
      if (timestamp && typeof timestamp.toMillis === 'function') {
        return timestamp.toMillis();
      }
      // Handle number timestamp
      if (typeof timestamp === 'number') {
        return timestamp;
      }
    }
    return 0;
  } catch (error) {
    console.error('Error getting last read timestamp:', error);
    return 0;
  }
}

/**
 * Mark chat as read (update last read timestamp)
 */
export async function markChatAsRead(userId: string, chatId: string): Promise<void> {
  try {
    const lastReadRef = doc(db, 'users', userId, 'lastRead', chatId);
    await setDoc(lastReadRef, {
      timestamp: serverTimestamp(),
      lastReadAt: Date.now(),
    }, { merge: true });
  } catch (error) {
    console.error('Error marking chat as read:', error);
  }
}

/**
 * Calculate actual unread message count from Firestore
 * Gets all messages and filters to count unread ones per chat
 * Includes both regular messages and Copilot chat messages
 */
export async function calculateUnreadMessageCount(userId: string): Promise<number> {
  try {
    let unreadCount = 0;
    
    // Get last read timestamps for all chats
    const lastReadRef = collection(db, 'users', userId, 'lastRead');
    let lastReadDocs;
    try {
      lastReadDocs = await getDocs(lastReadRef);
    } catch (e) {
      console.log('⚠️ Could not fetch lastRead docs:', e);
      lastReadDocs = { docs: [] } as any;
    }
    
    // Build map of last read times per chat
    const lastReadMap = new Map<string, number>();
    lastReadDocs.docs.forEach((doc) => {
      const data = doc.data();
      const timestamp = data.timestamp || data.lastReadAt;
      let lastReadTime = 0;
      if (timestamp && typeof timestamp.toMillis === 'function') {
        lastReadTime = timestamp.toMillis();
      } else if (typeof timestamp === 'number') {
        lastReadTime = timestamp;
      }
      lastReadMap.set(doc.id, lastReadTime);
    });
    
    // Also get general messages last read
    const messagesLastReadRef = doc(db, 'users', userId, 'lastRead', 'messages');
    const messagesLastReadDoc = await getDoc(messagesLastReadRef);
    let generalLastReadTime = 0;
    if (messagesLastReadDoc.exists()) {
      const data = messagesLastReadDoc.data();
      const timestamp = data.timestamp || data.lastReadAt;
      if (timestamp && typeof timestamp.toMillis === 'function') {
        generalLastReadTime = timestamp.toMillis();
      } else if (typeof timestamp === 'number') {
        generalLastReadTime = timestamp;
      }
    }
    
    // 1. Count unread messages from main messages collection
    const messagesRef = collection(db, 'messages');
    let snapshot;
    try {
      const q = query(
        messagesRef,
        where('recipientId', '==', userId)
      );
      snapshot = await getDocs(q);
      console.log(`📨 Query with recipientId: Found ${snapshot.size} messages for user ${userId}`);
    } catch (queryError: any) {
      // If query fails (e.g., missing index), get all messages and filter
      console.log('⚠️ Query with recipientId failed, fetching all messages:', queryError.message);
      snapshot = await getDocs(messagesRef);
      console.log(`📨 Fetched all messages: ${snapshot.size} total`);
    }
    
    // Process regular messages to count unread
    snapshot.forEach((doc) => {
      const msg = doc.data();
      
      // Only count messages where user is recipient
      if (msg.recipientId !== userId) {
        return;
      }
      
      // Get message time
      let msgTime = 0;
      const createdAt = msg.createdAt;
      if (createdAt && typeof createdAt.toMillis === 'function') {
        msgTime = createdAt.toMillis();
      } else if (typeof createdAt === 'number') {
        msgTime = createdAt;
      }
      
      // Determine last read time for this chat
      const senderId = msg.senderId;
      const chatId = senderId; // Use senderId as chatId
      const chatLastReadTime = lastReadMap.get(chatId) || generalLastReadTime;
      
      // Message is unread if it's newer than last read time
      if (msgTime > chatLastReadTime) {
        unreadCount++;
      }
    });
    
    // 2. Count unread messages from Copilot chat
    try {
      const copilotChatId = 'sanchari-copilot';
      const copilotMessagesRef = collection(db, 'users', userId, 'chats', copilotChatId, 'messages');
      const copilotSnapshot = await getDocs(copilotMessagesRef);
      
      console.log(`🤖 Found ${copilotSnapshot.size} Copilot messages for user ${userId}`);
      
      // Get last read time for Copilot chat
      const copilotLastReadTime = lastReadMap.get(copilotChatId) || 0;
      
      copilotSnapshot.forEach((doc) => {
        const msg = doc.data();
        
        // Get message time (Copilot messages use timestamp or createdAt)
        let msgTime = 0;
        const timestamp = msg.timestamp || msg.createdAt;
        
        if (timestamp) {
          if (typeof timestamp === 'number') {
            msgTime = timestamp;
          } else if (timestamp.toMillis && typeof timestamp.toMillis === 'function') {
            msgTime = timestamp.toMillis();
          } else if (typeof timestamp === 'object' && timestamp.seconds) {
            // Firestore Timestamp
            msgTime = timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000;
          }
        }
        
        // Message is unread if it's newer than last read time
        if (msgTime > copilotLastReadTime) {
          unreadCount++;
          console.log(`🤖 Unread Copilot message found: ${msg.text || 'itinerary'} (time: ${msgTime}, lastRead: ${copilotLastReadTime})`);
        }
      });
    } catch (copilotError: any) {
      console.log('⚠️ Could not fetch Copilot messages (chat may not exist):', copilotError.message);
    }
    
    console.log(`✅ Total unread message count: ${unreadCount}`);
    return unreadCount;
  } catch (error) {
    console.error('❌ Error calculating unread message count:', error);
    return 0;
  }
}

/**
 * Calculate actual unread notification count from Firestore
 */
export async function calculateUnreadNotificationCount(userId: string): Promise<number> {
  try {
    // Check if notifications collection exists
    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      where('read', '==', false)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    // If notifications collection doesn't exist, return 0
    console.log('Notifications collection may not exist:', error);
    return 0;
  }
}

/**
 * Get unread notification count for a user (from cache or calculate)
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  try {
    // Try to calculate from actual notifications
    const count = await calculateUnreadNotificationCount(userId);
    return count;
  } catch (error) {
    console.error('Error getting unread notification count:', error);
    return 0;
  }
}

/**
 * Get unread message count for a user (from cache or calculate)
 */
export async function getUnreadMessageCount(userId: string): Promise<number> {
  try {
    // Calculate from actual messages
    const count = await calculateUnreadMessageCount(userId);
    return count;
  } catch (error) {
    console.error('Error getting unread message count:', error);
    return 0;
  }
}

/**
 * Mark notifications as read (update last read timestamp)
 */
export async function markNotificationsAsRead(userId: string): Promise<void> {
  try {
    // Mark all notifications as read
    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      where('read', '==', false)
    );
    
    const snapshot = await getDocs(q);
    const batch = await import('firebase/firestore').then(m => m.writeBatch(db));
    
    snapshot.forEach((doc) => {
      batch.update(doc.ref, { read: true, readAt: serverTimestamp() });
    });
    
    await batch.commit();
    
    // Also update last read timestamp
    const lastReadRef = doc(db, 'users', userId, 'lastRead', 'notifications');
    await setDoc(lastReadRef, {
      timestamp: serverTimestamp(),
      lastReadAt: Date.now(),
    }, { merge: true });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    // Fallback: just update timestamp
    try {
      const lastReadRef = doc(db, 'users', userId, 'lastRead', 'notifications');
      await setDoc(lastReadRef, {
        timestamp: serverTimestamp(),
        lastReadAt: Date.now(),
      }, { merge: true });
    } catch (e) {
      console.error('Error updating last read timestamp:', e);
    }
  }
}

/**
 * Mark messages as read (update last read timestamp)
 */
export async function markMessagesAsRead(userId: string): Promise<void> {
  try {
    // Update last read timestamp for messages
    const lastReadRef = doc(db, 'users', userId, 'lastRead', 'messages');
    await setDoc(lastReadRef, {
      timestamp: serverTimestamp(),
      lastReadAt: Date.now(),
    }, { merge: true });
  } catch (error) {
    console.error('Error marking messages as read:', error);
  }
}

/**
 * Listen to unread counts changes (real-time calculation)
 */
export function listenToUnreadCounts(
  userId: string,
  callback: (counts: { notifications: number; messages: number }) => void
): () => void {
  let unsubscribeNotifications: (() => void) | null = null;
  let unsubscribeMessages: (() => void) | null = null;
  let unsubscribeCopilot: (() => void) | null = null;
  
  const updateCounts = async () => {
    try {
      const [notifications, messages] = await Promise.all([
        calculateUnreadNotificationCount(userId),
        calculateUnreadMessageCount(userId),
      ]);
      console.log('📊 Unread counts updated:', { notifications, messages, userId });
      callback({ notifications, messages });
    } catch (error) {
      console.error('Error updating unread counts:', error);
      callback({ notifications: 0, messages: 0 });
    }
  };
  
  // Initial calculation
  updateCounts();
  
  // Listen to notifications changes
  try {
    const notificationsRef = collection(db, 'notifications');
    const notificationsQuery = query(
      notificationsRef,
      where('userId', '==', userId)
    );
    
    unsubscribeNotifications = onSnapshot(
      notificationsQuery,
      () => updateCounts(),
      (error) => {
        console.error('Error listening to notifications:', error);
        updateCounts();
      }
    );
  } catch (error) {
    console.log('Notifications collection may not exist');
  }
  
  // Listen to messages changes - listen to both regular messages and Copilot chat
  try {
    const messagesRef = collection(db, 'messages');
    
    // Try query with recipientId first
    let messagesQuery;
    try {
      messagesQuery = query(
        messagesRef,
        where('recipientId', '==', userId)
      );
    } catch (queryError) {
      // If that fails, listen to all messages (less efficient but works)
      console.log('⚠️ recipientId query not available, listening to all messages');
      messagesQuery = query(messagesRef);
    }
    
    unsubscribeMessages = onSnapshot(
      messagesQuery,
      (snapshot) => {
        console.log(`📨 Messages snapshot: ${snapshot.size} messages (filtered for user ${userId})`);
        updateCounts();
      },
      (error) => {
        console.error('❌ Error listening to messages:', error);
        // Fallback: listen to all messages
        try {
          const fallbackQuery = query(messagesRef);
          onSnapshot(fallbackQuery, () => {
            console.log('📨 Fallback: All messages changed, updating counts');
            updateCounts();
          }, () => updateCounts());
        } catch (e) {
          console.error('❌ Fallback query also failed:', e);
          updateCounts();
        }
      }
    );
    
    // Also listen to Copilot chat messages
    try {
      const copilotMessagesRef = collection(db, 'users', userId, 'chats', 'sanchari-copilot', 'messages');
      unsubscribeCopilot = onSnapshot(
        copilotMessagesRef,
        (snapshot) => {
          console.log(`🤖 Copilot messages snapshot: ${snapshot.size} messages for user ${userId}`);
          updateCounts();
        },
        (error) => {
          console.log('⚠️ Could not listen to Copilot messages (chat may not exist):', error);
        }
      );
    } catch (copilotError) {
      console.log('⚠️ Copilot chat may not exist yet');
    }
  } catch (error) {
    console.error('Error setting up messages listener:', error);
    // Still try to calculate counts
    updateCounts();
  }
  
  // Also listen to lastRead changes
  const lastReadRef = doc(db, 'users', userId, 'lastRead', 'notifications');
  const unsubscribeLastRead = onSnapshot(
    lastReadRef,
    () => updateCounts(),
    () => {}
  );
  
  const lastReadMessagesRef = doc(db, 'users', userId, 'lastRead', 'messages');
  const unsubscribeLastReadMessages = onSnapshot(
    lastReadMessagesRef,
    () => updateCounts(),
    () => {}
  );

  return () => {
    if (unsubscribeNotifications) unsubscribeNotifications();
    if (unsubscribeMessages) unsubscribeMessages();
    if (unsubscribeCopilot) unsubscribeCopilot();
    unsubscribeLastRead();
    unsubscribeLastReadMessages();
  };
}

/**
 * Increment notification count (called when new notification arrives)
 */
export async function incrementNotificationCount(userId: string): Promise<void> {
  try {
    const unreadRef = doc(db, UNREAD_COUNTS_COLLECTION, userId);
    const unreadDoc = await getDoc(unreadRef);
    
    if (unreadDoc.exists()) {
      const currentCount = unreadDoc.data().notifications || 0;
      await setDoc(unreadRef, {
        notifications: currentCount + 1,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } else {
      await setDoc(unreadRef, {
        notifications: 1,
        messages: 0,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error('Error incrementing notification count:', error);
  }
}

/**
 * Increment message count (called when new message arrives)
 */
export async function incrementMessageCount(userId: string): Promise<void> {
  try {
    const unreadRef = doc(db, UNREAD_COUNTS_COLLECTION, userId);
    const unreadDoc = await getDoc(unreadRef);
    
    if (unreadDoc.exists()) {
      const currentCount = unreadDoc.data().messages || 0;
      await setDoc(unreadRef, {
        messages: currentCount + 1,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } else {
      await setDoc(unreadRef, {
        notifications: 0,
        messages: 1,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error('Error incrementing message count:', error);
  }
}

