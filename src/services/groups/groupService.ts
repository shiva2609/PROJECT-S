/**
 * Group Chat Service
 * Handles all group-related operations: create, update, delete, members, messages
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  increment,
  Timestamp,
} from '../../core/firebase/compat';
import { db } from '../../core/firebase';

// ---------- Types ----------

export interface GroupMember {
  userId: string;
  username: string;
  photoUrl?: string;
  role: 'admin' | 'member';
  joinedAt: number;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  photoUrl?: string;
  createdBy: string;
  createdAt: number;
  memberCount: number;
  members: GroupMember[];
  adminIds: string[];
  lastMessage?: {
    text: string;
    senderId: string;
    senderName: string;
    timestamp: number;
  };
}

export interface GroupMessage {
  id: string;
  groupId: string;
  senderId: string;
  senderName: string;
  senderPhotoUrl?: string;
  text: string;
  timestamp: number;
  createdAt: any;
}

// ---------- Group CRUD ----------

/**
 * Create a new group
 */
export async function createGroup(
  creatorId: string,
  creatorUsername: string,
  creatorPhotoUrl: string,
  name: string,
  description: string,
  photoUrl: string,
  memberIds: string[],
  memberData: { [userId: string]: { username: string; photoUrl?: string } }
): Promise<string> {
  try {
    const groupRef = doc(collection(db, 'groups'));
    const groupId = groupRef.id;

    // Build members array
    const members: GroupMember[] = [
      {
        userId: creatorId,
        username: creatorUsername,
        photoUrl: creatorPhotoUrl,
        role: 'admin',
        joinedAt: Date.now(),
      },
      ...memberIds.map((userId) => ({
        userId,
        username: memberData[userId]?.username || 'Unknown',
        photoUrl: memberData[userId]?.photoUrl,
        role: 'member' as const,
        joinedAt: Date.now(),
      })),
    ];

    const groupData: Omit<Group, 'id'> = {
      name,
      description: description || '',
      photoUrl: photoUrl || '',
      createdBy: creatorId,
      createdAt: Date.now(),
      memberCount: members.length,
      members,
      adminIds: [creatorId],
    };

    await setDoc(groupRef, groupData);

    // Add group to each member's groups list
    for (const member of members) {
      const userGroupRef = doc(db, 'users', member.userId, 'groups', groupId);
      await setDoc(userGroupRef, {
        groupId,
        groupName: name,
        groupPhotoUrl: photoUrl || '',
        joinedAt: serverTimestamp(),
        unreadCount: 0,
      });
    }

    return groupId;
  } catch (error) {
    if (__DEV__) console.error('Error creating group:', error);
    throw error;
  }
}

/**
 * Get group by ID
 */
export async function getGroup(groupId: string): Promise<Group | null> {
  try {
    const groupRef = doc(db, 'groups', groupId);
    const groupSnap = await getDoc(groupRef);

    if (!groupSnap.exists()) {
      return null;
    }

    return {
      id: groupSnap.id,
      ...groupSnap.data(),
    } as Group;
  } catch (error) {
    if (__DEV__) console.error('Error getting group:', error);
    return null;
  }
}

/**
 * Update group details (admin only)
 */
export async function updateGroup(
  groupId: string,
  updates: {
    name?: string;
    description?: string;
    photoUrl?: string;
  }
): Promise<void> {
  try {
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, updates);
  } catch (error) {
    if (__DEV__) console.error('Error updating group:', error);
    throw error;
  }
}

/**
 * Delete group (admin only)
 */
export async function deleteGroup(groupId: string): Promise<void> {
  try {
    const groupRef = doc(db, 'groups', groupId);
    await deleteDoc(groupRef);
  } catch (error) {
    if (__DEV__) console.error('Error deleting group:', error);
    throw error;
  }
}

// ---------- Group Members ----------

/**
 * Add members to group
 */
export async function addGroupMembers(
  groupId: string,
  memberIds: string[],
  memberData: { [userId: string]: { username: string; photoUrl?: string } }
): Promise<void> {
  try {
    const groupRef = doc(db, 'groups', groupId);
    const group = await getGroup(groupId);

    if (!group) throw new Error('Group not found');

    const newMembers: GroupMember[] = memberIds.map((userId) => ({
      userId,
      username: memberData[userId]?.username || 'Unknown',
      photoUrl: memberData[userId]?.photoUrl,
      role: 'member',
      joinedAt: Date.now(),
    }));

    await updateDoc(groupRef, {
      members: arrayUnion(...newMembers),
      memberCount: increment(memberIds.length),
    });

    // Add group to each new member's groups list
    for (const member of newMembers) {
      const userGroupRef = doc(db, 'users', member.userId, 'groups', groupId);
      await setDoc(userGroupRef, {
        groupId,
        groupName: group.name,
        groupPhotoUrl: group.photoUrl || '',
        joinedAt: serverTimestamp(),
        unreadCount: 0,
      });
    }
  } catch (error) {
    if (__DEV__) console.error('Error adding members:', error);
    throw error;
  }
}

/**
 * Remove member from group (admin only)
 */
export async function removeGroupMember(
  groupId: string,
  userId: string
): Promise<void> {
  try {
    const group = await getGroup(groupId);
    if (!group) throw new Error('Group not found');

    const memberToRemove = group.members.find((m) => m.userId === userId);
    if (!memberToRemove) return;

    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, {
      members: arrayRemove(memberToRemove),
      memberCount: increment(-1),
    });

    // Remove group from user's groups list
    const userGroupRef = doc(db, 'users', userId, 'groups', groupId);
    await deleteDoc(userGroupRef);
  } catch (error) {
    if (__DEV__) console.error('Error removing member:', error);
    throw error;
  }
}

/**
 * Leave group
 */
export async function leaveGroup(groupId: string, userId: string): Promise<void> {
  return removeGroupMember(groupId, userId);
}

/**
 * Make user admin
 */
export async function makeGroupAdmin(groupId: string, userId: string): Promise<void> {
  try {
    const group = await getGroup(groupId);
    if (!group) throw new Error('Group not found');

    // Update member role
    const updatedMembers = group.members.map((m) =>
      m.userId === userId ? { ...m, role: 'admin' as const } : m
    );

    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, {
      members: updatedMembers,
      adminIds: arrayUnion(userId),
    });
  } catch (error) {
    if (__DEV__) console.error('Error making admin:', error);
    throw error;
  }
}

// ---------- Group Messages ----------

/**
 * Send message to group
 */
export async function sendGroupMessage(
  groupId: string,
  senderId: string,
  senderName: string,
  senderPhotoUrl: string,
  text: string
): Promise<void> {
  try {
    const messageRef = doc(collection(db, 'groups', groupId, 'messages'));

    const messageData = {
      groupId,
      senderId,
      senderName,
      senderPhotoUrl: senderPhotoUrl || '',
      text,
      timestamp: Date.now(),
      createdAt: serverTimestamp(),
    };

    await setDoc(messageRef, messageData);

    // Update group's last message
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, {
      lastMessage: {
        text,
        senderId,
        senderName,
        timestamp: Date.now(),
      },
    });
  } catch (error) {
    if (__DEV__) console.error('Error sending group message:', error);
    throw error;
  }
}

/**
 * Listen to group messages
 */
export function listenToGroupMessages(
  groupId: string,
  callback: (messages: GroupMessage[]) => void
): () => void {
  const messagesRef = collection(db, 'groups', groupId, 'messages');
  const q = query(messagesRef, orderBy('timestamp', 'asc'));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const messages: GroupMessage[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as GroupMessage[];

      callback(messages);
    },
    (error) => {
      if (__DEV__) console.error('Error listening to group messages:', error);
    }
  );

  return unsubscribe;
}

/**
 * Listen to user's groups
 */
export function listenToUserGroups(
  userId: string,
  callback: (groups: Group[]) => void
): () => void {
  const groupsRef = collection(db, 'groups');
  const q = query(groupsRef, where('members', 'array-contains', userId));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const groups: Group[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Group[];

      callback(groups);
    },
    (error) => {
      if (__DEV__) console.error('Error listening to groups:', error);
    }
  );

  return unsubscribe;
}
