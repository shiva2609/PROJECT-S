/**
 * Groups API
 * 
 * Minimal group CRUD for chat groups.
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  limit as firestoreLimit,
  orderBy,
  startAfter,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../auth/authService';
import { createConversation } from './MessagesAPI';

// ---------- Types ----------

interface PaginationOptions {
  limit?: number;
  lastDoc?: any;
}

interface PaginationResult {
  groups: any[];
  nextCursor?: any;
}

// ---------- Exported Functions ----------

/**
 * Create a group (internal function)
 * @param creatorId - Creator user ID
 * @param memberIds - Array of member user IDs (includes creator)
 * @param meta - Optional metadata (groupName, description, etc.)
 * @returns Group ID
 */
async function createGroupInternal(
  creatorId: string,
  memberIds: string[],
  meta?: any
): Promise<{ groupId: string }> {
  try {
    // Ensure creator is in member list
    const allMembers = [...new Set([creatorId, ...memberIds])];
    
    // Create conversation for the group
    const conversation = await createConversation(allMembers, {
      isGroup: true,
      groupName: meta?.groupName || 'Group Chat',
      ...meta,
    });
    
    // Create group document
    const groupsRef = collection(db, 'groups');
    const groupData = {
      conversationId: conversation.conversationId,
      creatorId,
      members: allMembers,
      createdAt: serverTimestamp(),
      ...meta,
    };
    
    const groupDoc = doc(groupsRef, conversation.conversationId);
    await setDoc(groupDoc, groupData);
    
    return { groupId: conversation.conversationId };
  } catch (error: any) {
    console.error('Error creating group:', error);
    throw { code: 'create-group-failed', message: 'Failed to create group' };
  }
}

/**
 * Add a member to a group
 * @param groupId - Group ID
 * @param userId - User ID to add
 */
export async function addGroupMember(groupId: string, userId: string): Promise<void> {
  try {
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, {
      members: arrayUnion(userId),
      updatedAt: serverTimestamp(),
    });
    
    // Also update conversation participants
    const conversationRef = doc(db, 'conversations', groupId);
    await updateDoc(conversationRef, {
      participants: arrayUnion(userId),
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    console.error('Error adding group member:', error);
    throw { code: 'add-member-failed', message: 'Failed to add group member' };
  }
}

/**
 * Remove a member from a group
 * @param groupId - Group ID
 * @param userId - User ID to remove
 */
export async function removeGroupMember(groupId: string, userId: string): Promise<void> {
  try {
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, {
      members: arrayRemove(userId),
      updatedAt: serverTimestamp(),
    });
    
    // Also update conversation participants
    const conversationRef = doc(db, 'conversations', groupId);
    await updateDoc(conversationRef, {
      participants: arrayRemove(userId),
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    console.error('Error removing group member:', error);
    throw { code: 'remove-member-failed', message: 'Failed to remove group member' };
  }
}

/**
 * Fetch groups for a user
 * @param userId - User ID
 * @param options - Pagination options
 * @returns Paginated groups
 */
export async function fetchGroups(
  userId: string,
  options?: PaginationOptions
): Promise<PaginationResult> {
  try {
    const limit = options?.limit || 20;
    const groupsRef = collection(db, 'groups');
    
    let q = query(
      groupsRef,
      where('members', 'array-contains', userId),
      orderBy('createdAt', 'desc'),
      firestoreLimit(limit)
    );
    
    if (options?.lastDoc) {
      q = query(q, startAfter(options.lastDoc));
    }
    
    const querySnapshot = await getDocs(q);
    const groups = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
    
    return {
      groups,
      nextCursor: querySnapshot.docs.length === limit ? lastDoc : undefined,
    };
  } catch (error: any) {
    console.error('Error fetching groups:', error);
    throw { code: 'fetch-groups-failed', message: 'Failed to fetch groups' };
  }
}

// Convenience function for hooks
// Note: Hook calls createGroup(userIds, groupName) without creatorId
// This wrapper gets creatorId from the first userId (assuming it's the creator)
// In production, hook should get creatorId from auth context
export async function createGroup(userIds: string[], groupName?: string): Promise<any> {
  if (userIds.length === 0) {
    throw { code: 'no-members', message: 'Group must have at least one member' };
  }
  
  // First userId is assumed to be creator (hook should ensure this)
  const creatorId = userIds[0];
  const result = await createGroupInternal(creatorId, userIds, { groupName });
  
  // Return conversation-like object for hook
  return {
    id: result.groupId,
    participants: userIds,
    isGroup: true,
    groupName: groupName || 'Group Chat',
  };
}

