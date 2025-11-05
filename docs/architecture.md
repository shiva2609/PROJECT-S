---
title: Sanchari Architecture
author: Pranitha Reddy
version: 1.0.0
lastUpdated: 2025-11-05
description: Architecture overview covering folder structure, navigation, and Firebase integration.
keywords: Architecture, Folder Structure, Navigation, Firebase, Redux
---

# Architecture

## Folder Structure
- `src/api/` – API clients, Firebase wrappers
- `src/components/` – Reusable UI components
- `src/config/` – App configuration (roles metadata)
- `src/constants/` – Constants like verification templates
- `src/contexts/` – Context providers (e.g., Auth)
- `src/hooks/` – Custom hooks (e.g., KYC manager)
- `src/navigation/` – Navigators and stacks
- `src/screens/` – Screen components grouped by feature
- `src/services/` – Business logic helpers
- `src/store/` – Redux store setup (Redux Toolkit)
- `src/theme/` – Colors, fonts
- `src/types/` – Shared TypeScript types
- `src/utils/` – Utility helpers

## Technology Stack
- React Native 0.82 with React 19
- Redux Toolkit + React Redux
- React Navigation (native stack & tabs)
- Firebase: Auth, Firestore, Storage

## Core Flows
- Auth: Firebase Auth, AuthContext driving signed-in state
- KYC: Multi-step flows, document uploads, Firestore-backed status
- Navigation: Root navigator with authenticated/public stacks


