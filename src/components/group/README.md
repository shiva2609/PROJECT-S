# Group Chat Components

This folder contains reusable components for group chat functionality.

## Components

### MemberChip.tsx
**Purpose:** Display selected member as a removable chip

**Props:**
```typescript
{
  userId: string;
  username: string;
  photoUrl?: string;
  onRemove: (userId: string) => void;
}
```

**Usage:**
- Used in SelectMembersScreen to show selected members
- Displays avatar + username
- Remove icon (X) triggers onRemove callback
- Orange theme matching app colors

---

### MemberListItem.tsx
**Purpose:** Display member in a list (selectable or informational)

**Props:**
```typescript
{
  userId: string;
  username: string;
  name?: string;
  photoUrl?: string;
  role?: 'admin' | 'member';
  isSelected?: boolean;
  onPress: (userId: string) => void;
  showCheckbox?: boolean;
  showRole?: boolean;
  disabled?: boolean;
}
```

**Features:**
- Shows avatar, name, username
- Optional checkbox for selection
- Admin badge when role='admin'
- Disabled state (grayed out, non-clickable)
- Handles tap events

**Usage:**
- SelectMembersScreen: Selectable members
- GroupInfoScreen: View-only member list

---

### GroupMessageBubble.tsx
**Purpose:** Display group message with sender information

**Props:**
```typescript
{
  messageId: string;
  text: string;
  isOwnMessage: boolean;
  senderName: string;
  senderPhotoUrl?: string;
  timestamp: string;
  onSenderPress: () => void;
  showAvatar?: boolean;
}
```

**Features:**
- Sender avatar (28x28, rounded, clickable)
- Sender name in orange
- Message text
- Timestamp
- Different styling for own vs others' messages
- Conditional avatar display

**Usage:**
- GroupChatScreen: Render group messages

---

### GroupChatHeader.tsx
**Purpose:** Custom header for group chat screen

**Props:**
```typescript
{
  groupName: string;
  groupPhotoUrl?: string;
  memberCount: number;
  onBackPress: () => void;
  onInfoPress: () => void;
}
```

**Features:**
- Group photo (48x48, clickable)
- Group name
- Member count in green
- Back button
- Info button (opens GroupInfoScreen)

**Usage:**
- GroupChatScreen: Replace default navigation header

---

## Design Guidelines

### Colors
- Primary: `#E87A5D` (Orange)
- Text Primary: `#1C1C1C`
- Text Secondary: `#666666`
- Success: `#4CAF50` (Green - for member count)
- Background: `#F5EDE7` (Cream)
- Card Background: `#FFFFFF`

### Spacing
- Small: 4px
- Medium: 8px
- Large: 12px
- XLarge: 16px

### Avatar Sizes
- Small: 28x28 (Message sender)
- Medium: 48x48 (Group header, member chip)
- Large: 52x52 (Member list)

---

## Notes

- All components are TypeScript
- All components use StyleSheet.create for performance
- SmartImage used for all avatars (handles loading states)
- Icons from react-native-vector-icons/Ionicons
- No Redux/MobX - uses local state and props
