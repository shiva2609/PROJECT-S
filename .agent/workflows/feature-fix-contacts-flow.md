# Feature Refinement - Contacts Suggestions Flow

## Objective
Fix the UX flow for Contact-based friend suggestions, ensuring permission cards disappear after granting and matched contacts appear in a distinct section.

## Changes Implemented

### 1. State Management (`useSuggestions.ts`)
- Added persistent state tracking:
  - `contactsPermissionGranted`: Tracks OS permission status.
  - `contactsProcessed`: Tracks if contacts hash has been uploaded via `hasUploadedContacts`.
- Exposed these states to the UI components.
- Added logic to fetch and categorize "People you may know" contacts into a distinct suggestion category.

### 2. UI Logic (`FollowingSuggestions.tsx`)
- Implemented strict visibility rule for `ContactsPermissionCard`:
  ```typescript
  const shouldShowContactsCard = showContactsCard && !contactsPermissionGranted && !contactsProcessed;
  ```
- This ensures the card **permanently disappears** once contacts are uploaded/processed, complying with the "One-time permission request" rule.
- "People you may know" category provided by the hook is rendered automatically as a distinct section with standard profile cards.

### 3. Fallback Handling
- If contacts are processed but no matches found, the permission card remains hidden, and the user sees either other suggestions or a clean empty state.
- If permission is denied, the card remains visible to allow retry (via `!contactsPermissionGranted` check).

## Verification
1. **Fresh Install**: Permission card should be visible.
2. **Grant Permission**:
   - Card should disappear immediately.
   - "People you may know" section should appear (if mock/real data exists).
3. **Restart App**: Card should NOT reappear.
4. **Deny Permission**: Card should remain visible.

## Files Modified
- `src/hooks/useSuggestions.ts`
- `src/components/suggestions/FollowingSuggestions.tsx`
