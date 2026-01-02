# EDucfy+ - Plataforma Educacional

## Overview
EDucfy+ is a modern educational platform designed to provide an engaging and secure learning environment. Built with React + TypeScript, an Express backend, and Firebase Realtime Database, it integrates Groq AI for an intelligent assistant. The platform features a clean white and blue theme, a mobile-first design, and comprehensive LGPD (Brazilian General Data Protection Law) compliance. Key capabilities include student dashboards, assignment management, a study resource library, an interactive calendar, a gamified profile, and a TikTok-like educational video feed (EduTok).

## User Preferences
- **Coding Style**: The project uses React with TypeScript, Tailwind CSS, and Shadcn UI for the frontend. Backend is Node.js with Express.
- **Language**: All texts, comments, and documentation should be in Brazilian Portuguese.
- **Testing**: Prioritize `data-testids` for all interactive elements to facilitate testing.
- **Component Reusability**: Develop reusable components outside of `App.tsx`.
- **State Management**: Use TanStack Query with array-based `queryKey` for all queries. Mutations should automatically invalidate the cache.
- **User Feedback**: Implement loading states with skeletons or spinners and use toasts for action feedback.
- **Performance**: Implement lazy loading for videos, debounce search inputs, and optimize images. Virtualization for long lists is a future consideration.
- **Security**: Crucially, Firebase Realtime Database security rules defined in `database.rules.json` *must* be deployed to Firebase for proper security enforcement. Without these rules, admin access controls are client-side only and can be bypassed.

## Recent Bug Fixes (Dec 11, 2025)

### Fixed Issues:
1. **Firebase Educfy2 Project ID Configuration**
   - **Bug**: Hardcoded `projectId: "educfy2"` in Firebase Admin SDK initialization
   - **Fix**: Now uses `FIREBASE_EDUCFY2_PROJECT_ID` environment variable with fallback
   - **Impact**: Allows flexible configuration for different educfy2 projects

2. **Image Size Validation for AI API**
   - **Bug**: No size validation for base64 images sent to Groq API, causing potential failures
   - **Fix**: Added image size check (max 20MB) with descriptive error message
   - **Impact**: Prevents API errors and gives users clear feedback on image requirements

3. **Firebase Educfy2 Database URL Configuration**
   - **Bug**: Hardcoded database URL `https://educfy2-default-rtdb.firebaseio.com`
   - **Fix**: Now uses `FIREBASE_EDUCFY2_DATABASE_URL` environment variable with fallback
   - **Impact**: Supports custom educfy2 database URLs if needed

## System Architecture

### UI/UX Decisions
- **Theme**: White and blue (`#0B72FF`) color scheme with Inter font family.
- **Design System**: Shadcn UI components with Tailwind CSS for styling, featuring rounded-xl cards, shadow-md, and automatic hover/active elevations.
- **Mobile Navigation**: Floating island design for the bottom navigation bar with 5 icons (Home, EduFeed, Chat, Grades, AI), smooth animations, selection pill, and notification badges.
- **Dashboard**: Premium header with gradient, quick action cards, stats overview, responsive class grid, and a sidebar for upcoming events and recent grades.
- **Gamification**: Badges for achievements.

### Technical Implementations
- **Frontend**: React + TypeScript with Vite, Wouter for routing, TanStack Query for state management/data fetching, and Firebase Auth for authentication.
- **Backend**: Node.js + Express, acting as an API Proxy for Groq AI, handling content moderation, and providing LGPD endpoints (consent, data export, account deletion). It uses Firebase Admin SDK for server-side RTDB operations.
- **LGPD Compliance**: Features privacy policy, terms of service, cookie consent, a Data Subject Rights Portal for data access/export/deletion, consent logging, and DPO contact information.
- **Authentication**: Email/password, Google Login, initial name and optional phone number collection.
- **Key Features**:
    - **Student Dashboard**: Personalized greeting, quick actions, academic statistics, class overview, upcoming events, recent grades.
    - **Assignments**: View, filter, detailed task info, visual status, grade display, direct upload.
    - **Study Resources (Library)**: Search, filter, informative cards, tags, preview/download.
    - **Calendar**: Interactive monthly grid, event highlights, details, upcoming events list.
    - **Profile**: Personal info, avatar, editing, academic stats, progress bars, gamified achievements.
    - **EduTok**: Vertical educational video feed with swipe navigation, likes, comments, sharing.
    - **Chat System**: Modern UI, Class Chat (group) and Teacher-Student Chat (private with approval), dynamic Teacher Role Badges, file uploads with AI moderation, chat search.
    - **Grades and Performance**: User-inputted grades for 10 subjects, editing, per-semester view, GPA calculation, visual progress, history.
    - **AI Assistant (Groq)**: Conversational AI with suggested questions.
    - **Notifications**: Real-time in-app and push notifications for messages, grades, and Efeed post likes.
    - **Role Management**: Centralized role management with `useRole` hook for fast access control, role-based navigation, and student access to all teachers.
    - **Teacher Verification System**: Admin panel for adding teachers globally with specific roles, dynamic role badges in chat, and verified badges on Efeed posts.
    - **Efeed Redesign**: Modern social media layout with horizontal stories, friend suggestions, enhanced post cards, follow/unfollow functionality, and optimized performance.
    - **Developer API Key System** (`/devtools/ai/apikeys`): Self-service API key management for developers to integrate EduTok AI into their applications.
      - Keys start with `edu_` prefix, stored as SHA-256 hashes
      - 500 tokens/day limit per key with automatic midnight UTC reset
      - 60 requests/minute rate limiting
      - Analytics dashboard with Recharts charts showing tokens, requests, and estimated costs
      - Max 5 active keys per user
      - OpenAI-compatible proxy endpoint at `/api/v1/chat/completions`

### System Design Choices
- **Database**: Firebase Realtime Database.
  - `/users/{uid}`: User profiles.
  - `/classes/{classId}`: Class information.
  - `/directMessages/{chatRoomId}`: Direct messages.
  - `/grades/{uid}`: User grades.
  - `/videos/{videoId}`: EduTok video metadata.
  - `/events/{eventId}`: Calendar events.
  - `/assignments/{assignmentId}`: School assignments.
  - `/resources/{resourceId}`: Study materials.
  - `/announcements/{announcementId}`: Announcements.
  - `/consentLog/{uid}`: LGPD consent history.
  - `/deletionRequests/{uid}`: Account deletion requests.
  - `/teachers/{teacherId}`: Global teacher profiles.
  - `/userProfiles/{uid}`: User profiles with `verified` flag for teachers.
  - `/eduApiKeys/{keyId}`: Developer API keys with usage tracking.
  - `/eduApiKeyLogs/{keyId}`: Detailed usage logs per API key.
  - `/eduApiKeyAnalytics/{keyId}/{date}`: Daily aggregated analytics.
  - **Dual Firebase Projects**: Primary (volatile, `gepo-86dbb`) for general app data and Secondary (persistent, `educfy2`) for grades, authentication, and student profiles.
- **Folder Structure**: `client/`, `server/`, and `shared/` for clear separation.
- **Environment Variables**: 
  - `VITE_` prefix for frontend variables
  - `GROQ_API_KEY` for Groq AI service
  - `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PROJECT_ID` for Firebase Admin SDK
  - `FIREBASE_EDUCFY2_PROJECT_ID` (optional) for custom educfy2 project ID
  - `FIREBASE_EDUCFY2_DATABASE_URL` (optional) for custom educfy2 database URL

## External Dependencies
- **Firebase**:
  - **Firebase Realtime Database**: Primary database for real-time data.
  - **Firebase Authentication**: User authentication.
  - **Firebase Admin SDK**: Server-side database operations and security.
  - **Firebase Cloud Messaging (FCM)**: For push notifications.
- **Groq AI**: AI Assistant feature, integrated via a protected backend proxy.
- **TanStack Query**: Data fetching, caching, and state synchronization.
- **Wouter**: Client-side routing for React.
- **Shadcn UI**: UI component library.
- **Tailwind CSS**: Utility-first CSS framework.
- **Inter (Google Fonts)**: Typography.
