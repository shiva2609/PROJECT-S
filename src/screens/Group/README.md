# Group Chat Screens

This folder contains all screens related to group chat functionality.

## Screens

### SelectMembersScreen.tsx
**Purpose:** Select members to add to a group (supports both create and add modes)

**Route Params:**
- `groupId?` - Group ID (only for add mode)
- `mode?` - 'create' | 'add' (defaults to 'create')

**Features:**
- Shows followed users by default
- Search functionality
- Multiple selection with checkboxes
- Existing members disabled in add mode
- Selected members shown as chips

**Navigation:**
- From: ChatsScreen, ProfileOptions, GroupInfoScreen
- To: GroupDetailsScreen (create mode) or back to GroupInfoScreen (add mode)

---

### GroupDetailsScreen.tsx
**Purpose:** Set group name, description, and photo (step 2 of group creation)

**Route Params:**
- `selectedUsers` - Array of selected member objects

**Features:**
- Group name input (required, 1-100 chars)
- Description input (optional, up to 500 chars)
- Group photo picker (placeholder)
- Character counters
- Creates group and navigates to chat

**Navigation:**
- From: SelectMembersScreen
- To: GroupChatScreen

---

### GroupChatScreen.tsx
**Purpose:** Main group chat interface with real-time messaging

**Route Params:**
- `groupId` - Group ID (required)
- `groupName` - Group name for header
- `groupPhotoUrl?` - Group photo URL
- `memberCount` - Number of members

**Features:**
- Real-time message updates
- Send messages
- Sender avatars and names
- Auto-scroll to latest
- Navigate to sender profiles
- Custom group header

**Navigation:**
- From: ChatsScreen (Groups tab), GroupDetailsScreen
- To: GroupInfoScreen, UserProfileDetail

---

### GroupInfoScreen.tsx
**Purpose:** View and manage group details and members

**Route Params:**
- `groupId` - Group ID (required)

**Features:**
- Group details display
- Full member list with roles
- Add members (admin only)
- Remove members (admin only)
- Leave group option
- Placeholder options (mute, clear, report)

**Navigation:**
- From: GroupChatScreen
- To: SelectMembersScreen (add mode), UserProfileDetail

---

## Navigation Flow

### Create Group Flow
```
ChatsScreen / ProfileOptions
→ SelectMembersScreen (mode: 'create')
→ GroupDetailsScreen
→ GroupChatScreen
```

### Add Members Flow
```
GroupInfoScreen (admin)
→ SelectMembersScreen (mode: 'add', groupId)
→ [addGroupMembers() called]
→ Back to GroupInfoScreen
```

---

## Notes

- All screens use SafeAreaView for proper spacing
- All screens support dark mode (via theme colors)
- TypeScript interfaces defined for all props
- Firestore operations handled via groupService.ts
- Real-time listeners properly cleaned up in useEffect
