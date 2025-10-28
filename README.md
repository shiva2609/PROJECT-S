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
