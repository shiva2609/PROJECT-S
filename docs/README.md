## Documentation Index

- [overview.md](./overview.md)
- [developer-setup.md](./developer-setup.md)
- [architecture.md](./architecture.md)
- [Project_Documentation.md](./Project_Documentation.md)
- [INSTALLATION_INSTRUCTIONS.md](./INSTALLATION_INSTRUCTIONS.md)
- [ADMIN_SETUP.md](./ADMIN_SETUP.md)
- [ACCOUNT_CHANGE_IMPLEMENTATION.md](./ACCOUNT_CHANGE_IMPLEMENTATION.md)
- [FONT_SETUP.md](./FONT_SETUP.md)
- [GOOGLESERVICE-INFO-SETUP.md](./GOOGLESERVICE-INFO-SETUP.md)
- [IOS_FIREBASE_SETUP_COMPLETE.md](./IOS_FIREBASE_SETUP_COMPLETE.md)
- [IOS_FIREBASE_SETUP_FINAL_SUMMARY.md](./IOS_FIREBASE_SETUP_FINAL_SUMMARY.md)
- [IOS_FIREBASE_SETUP_SUMMARY.md](./IOS_FIREBASE_SETUP_SUMMARY.md)
- [KYC_IMPLEMENTATION.md](./KYC_IMPLEMENTATION.md)
- [KYC_SETUP_GUIDE.md](./KYC_SETUP_GUIDE.md)
- [MIGRATION_CHECKLIST.md](./MIGRATION_CHECKLIST.md)
- [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)
- [README.md](./README.md)

# Sanchari

A social travel app scaffold (React Native CLI + TypeScript).

## Run

```bash
yarn install
cd ios && pod install && cd ..
yarn start
yarn ios
yarn android
```

## Env

Copy `.env.example` to `.env` and fill Firebase keys and API_URL.

## Features
- Navigation: Splash → Onboarding → Auth → Tabs; Profile → Account
- Tabs: Home, Explore, Create, Trips, Profile
- Redux Toolkit store (user, posts)
- Firebase Auth + Firestore (config wired)
- Image picker for creating posts

## Next Steps
- Travel reels (video feed)
- Google Maps integration
- Booking & payment flow
- Notifications (FCM)
- Profile editing and travel stories
- Theme switching (light/dark)
