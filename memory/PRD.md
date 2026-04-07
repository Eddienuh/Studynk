# StudyMatch - Product Requirements Document

## Overview
StudyMatch is an AI-powered group study matcher for university students. The app matches students in the same course/module into highly compatible study groups based on schedule, study style, grade goals, and location preferences.

## Core Features

### 1. Authentication System
- **Email/Password Registration**: Full registration with name, email, password, GDPR consent
- **Email/Password Login**: Standard login with email and password  
- **Google OAuth**: Alternative login via Google (Emergent Auth integration)
- **JWT Token Auth**: Bearer token stored in AsyncStorage, sent via Authorization header
- **Session Management**: 7-day token expiry, server-side session tracking

### 2. User Profile & Onboarding
- Multi-step onboarding flow (university, course, study preferences)
- Edit profile screen
- Profile photo support (planned)

### 3. Smart Matching Engine
- Compatibility scoring based on: course, schedule overlap, study style, grade goals, location
- Group creation with 2-4 members
- Re-matching support

### 4. Group Dashboard
- Group member list with compatibility scores
- Async messaging within groups
- Attendance check-in with streak tracking

### 5. Retention Features
- Study streaks with daily check-ins
- Referral program (3 referrals = 1 month Pro free)

### 6. Freemium Monetization
- Free tier: Basic matching, messaging
- Pro tier: Advanced matching, unlimited groups

### 7. Legal & Compliance (UK GDPR)
- Privacy Policy page
- Terms of Service page
- GDPR consent checkbox on registration
- Consent tracking with timestamps

### 8. Multi-language Support
- English, Spanish, French via i18n-js

## Tech Stack
- **Frontend**: Expo (React Native), expo-router, TypeScript
- **Backend**: FastAPI, Python
- **Database**: MongoDB
- **Auth**: JWT tokens, bcrypt, Emergent Auth (Google OAuth)

## Test Credentials
- Email: test@studymatch.com
- Password: test123456
