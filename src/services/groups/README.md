# Group Services

This folder contains backend services for group chat functionality.

## Files

### groupService.ts
**Purpose:** Centralized service for all group-related Firestore operations

## API Functions

### Group CRUD

#### createGroup()
Creates a new group with members
```typescript
async function createGroup(
  creatorId: string,
  creatorName: string,
  creatorPhotoUrl: string,
  groupName: string,
  description: string,
  photoUrl: string | undefined,
  memberIds: string[],
  memberData: { [userId: string]: { username: string; photoUrl?: string } }
): Promise<string>
```

#### getGroup()
Fetches group details by ID
```typescript
async function getGroup(groupId: string): Promise<Group | null>
```

#### updateGroup()
Updates group properties
```typescript
async function updateGroup(
  groupId: string,
  updates: Partial<Group>
): Promise<void>
```

#### deleteGroup()
Deletes a group
```typescript
async function deleteGroup(groupId: string): Promise<void>
```

---

### Member Management

#### addGroupMembers()
Adds new members to existing group
```typescript
async function addGroupMembers(
  groupId: string,
  memberIds: string[],
  memberData: { [userId: string]: { username: string; photoUrl?: string } }
): Promise<void>
```

#### removeGroupMember()
Removes a member from group
```typescript
async function removeGroupMember(
  groupId: string,
  memberId: string
): Promise<void>
```

#### leaveGroup()
User leaves a group
```typescript
async function leaveGroup(
  groupId: string,
  userId: string
): Promise<void>
```

#### makeGroupAdmin()
Promotes user to admin
```typescript
async function makeGroupAdmin(
  groupId: string,
  userId: string
): Promise<void>
```

---

### Messaging

#### sendGroupMessage()
Sends a message to group
```typescript
async function sendGroupMessage(
  groupId: string,
  senderId: string,
  senderName: string,
  senderPhotoUrl: string,
  text: string
): Promise<void>
```

#### listenToGroupMessages()
Real-time listener for group messages
```typescript
function listenToGroupMessages(
  groupId: string,
  callback: (messages: GroupMessage[]) => void
): () => void  // Returns unsubscribe function
```

---

### Listeners

#### listenToUserGroups()
Real-time listener for user's groups
```typescript
function listenToUserGroups(
  userId: string,
  callback: (groups: Group[]) => void
): () => void  // Returns unsubscribe function
```

---

## Data Models

### Group
```typescript
interface Group {
  id: string;
  name: string;
  description?: string;
  photoUrl?: string;
  creatorId: string;
  adminIds: string[];
  members: GroupMember[];
  memberCount: number;
  createdAt: number;
  lastMessage?: {
    text: string;
    senderId: string;
    senderName: string;
    timestamp: number;
  };
}
```

### GroupMember
```typescript
interface GroupMember {
  userId: string;
  username: string;
  photoUrl?: string;
  role: 'admin' | 'member';
  joinedAt: number;
}
```

### GroupMessage
```typescript
interface GroupMessage {
  id: string;
  groupId: string;
  senderId: string;
  senderName: string;
  senderPhotoUrl: string;
  text: string;
  timestamp: number;
  createdAt: FieldValue;
}
```

---

## Firestore Structure

```
/groups/{groupId}
  - id: string
  - name: string
  - description?: string
  - photoUrl?: string
  - creatorId: string
  - adminIds: string[]
  - members: GroupMember[]
  - memberCount: number
  - createdAt: number
  - lastMessage?: object

/groups/{groupId}/messages/{messageId}
  - id: string
  - groupId: string
  - senderId: string
  - senderName: string
  - senderPhotoUrl: string
  - text: string
  - timestamp: number
  - createdAt: FieldValue

/users/{userId}/groups/{groupId}
  - groupId: string
  - groupName: string
  - groupPhotoUrl?: string
  - lastMessage?: string
  - lastMessageTime?: number
  - unreadCount: number
  - joinedAt: number
```

---

## Usage Examples

### Create a group
```typescript
const groupId = await createGroup(
  user.uid,
  user.displayName,
  user.photoURL,
  'Travel Buddies',
  'Planning our Europe trip',
  undefined,
  ['userId1', 'userId2'],
  {
    userId1: { username: 'john_doe', photoUrl: 'https://...' },
    userId2: { username: 'jane_smith', photoUrl: 'https://...' }
  }
);
```

### Listen to messages
```typescript
useEffect(() => {
  const unsubscribe = listenToGroupMessages(groupId, (messages) => {
    setMessages(messages);
  });
  
  return () => unsubscribe();
}, [groupId]);
```

### Add members
```typescript
await addGroupMembers(
  groupId,
  ['userId3'],
  {
    userId3: { username: 'bob_jones', photoUrl: 'https://...' }
  }
);
```

---

## Notes

- All functions are async (except listeners)
- Listeners return cleanup functions - always call in useEffect cleanup
- All Firestore operations wrapped in try-catch
- Errors logged to console in __DEV__ mode
- Uses Firestore compat API for backward compatibility
- All timestamps stored as Unix milliseconds
- serverTimestamp() used for createdAt fields
