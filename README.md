# StudyMatch - AI-Powered Study Group Matcher

**Find your perfect study group** - Get matched with compatible university students in your course based on multiple factors for better study outcomes.

## 🎯 Features

### Smart Matching Engine
- **Course-based matching**: Exact course/module matching required
- **Schedule compatibility**: Overlapping time slot analysis
- **Study style alignment**: Active, Passive, or Mixed styles
- **Grade goal matching**: High achiever vs. Pass-focused
- **Location preference**: Library, Home, or Campus spaces
- **Compatibility scoring**: 0-100% compatibility scores for transparency

### User Profile System
- **University verification**: .ac.uk email required
- **Comprehensive preferences**: Study habits, goals, and availability
- **Weekly schedule input**: Calendar-style availability tracking
- **Work ethic signals**: Self-reported consistency and commitment

### Group Dashboard
- **Assigned study groups**: 2-4 highly compatible students
- **Member profiles**: View study styles and preferences
- **Compatibility insights**: Clear scoring with breakdown
- **Group health tracking**: Activity-based group health indicator

### Communication
- **Async messaging**: Simple group chat (no real-time required)
- **Group notifications**: Session reminders and updates
- **Member coordination**: Shared schedules and meeting planning

### Retention Features
- **Study streaks**: Track consecutive study days
- **Attendance check-in**: Simple session attendance tracking
- **Re-match option**: Leave group and find new matches
- **Group health score**: Based on activity and attendance

## 🏗️ Tech Stack

### Frontend
- **Expo** (React Native for mobile-first experience)
- **React Navigation** (Tab-based navigation)
- **AsyncStorage** (Local data persistence)
- **React Hook Form** (Form management)
- **Zustand** (State management)
- **Expo Router** (File-based routing)

### Backend
- **FastAPI** (Python web framework)
- **Motor** (Async MongoDB driver)
- **Pydantic** (Data validation)
- **Google OAuth** (via Emergent Auth)

### Database
- **MongoDB** (Document database)
- Collections: users, user_sessions, groups, messages, attendance_sessions

## 📱 App Structure

```
app/
├── frontend/
│   ├── app/
│   │   ├── (tabs)/           # Main tab screens
│   │   │   ├── index.tsx     # Home/Dashboard
│   │   │   ├── groups.tsx    # Group details
│   │   │   ├── messages.tsx  # Group chat
│   │   │   └── profile.tsx   # User profile
│   │   ├── index.tsx         # Landing page
│   │   ├── auth-callback.tsx # OAuth callback
│   │   ├── onboarding.tsx    # Profile setup
│   │   └── _layout.tsx       # Root layout
│   └── contexts/
│       └── AuthContext.tsx   # Auth state management
└── backend/
    └── server.py             # FastAPI backend
```

## 🚀 Getting Started

### Prerequisites
- University email (.ac.uk domain)
- Google account for authentication

### Installation

1. **Access the app** via the preview URL or Expo Go QR code

2. **Sign in with Google** using your university email

3. **Complete onboarding**:
   - Enter university and course information
   - Set study preferences (style, goals, location)
   - Add weekly availability slots
   - Submit profile

4. **Find your match**:
   - Tap "Find Matches" on the home screen
   - System matches you with 1-3 compatible students
   - Group created automatically with compatibility score

5. **Start studying**:
   - View your group in the Groups tab
   - Message your group in the Messages tab
   - Check in to sessions for streak tracking

## 🔧 Development

### Backend Testing
All backend endpoints have been tested and verified:
- ✅ Authentication (Google OAuth)
- ✅ User profile management
- ✅ Matching algorithm
- ✅ Group management
- ✅ Messaging system
- ✅ Attendance tracking
- ✅ Streak calculation

### API Endpoints

#### Authentication
- `POST /api/auth/session` - Exchange session_id for user data
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user

#### User Profile
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update profile

#### Matching
- `POST /api/matching/find-matches` - Find compatible matches

#### Groups
- `GET /api/groups/my-group` - Get user's group
- `POST /api/groups/leave` - Leave current group

#### Messaging
- `POST /api/messages/send` - Send message
- `GET /api/messages/group/{group_id}` - Get messages

#### Attendance
- `POST /api/attendance/checkin` - Check in to session
- `GET /api/attendance/streak` - Get study streak

## 🎨 Design Philosophy

### Mobile-First
- **Thumb-friendly UI**: All actions within easy reach
- **Clean design**: Forest green (#2E7D32) with neutral tones
- **Touch targets**: Minimum 44x44pt for accessibility
- **Responsive**: Works on all screen sizes

### User Experience
- **Simple onboarding**: 3-step profile setup
- **Clear feedback**: Loading states and success messages
- **Intuitive navigation**: Bottom tabs for main features
- **Pull-to-refresh**: Easy data updates

## 📊 Matching Algorithm

The compatibility algorithm uses weighted scoring:

| Factor | Weight | Description |
|--------|--------|-------------|
| Course | 30% | Must match exactly (filtered before scoring) |
| Schedule | 25% | Overlapping time slots |
| Study Style | 20% | Active/Passive/Mixed compatibility |
| Grade Goal | 15% | High achiever vs. Pass-focused |
| Location | 10% | Preferred study location |

**Minimum threshold**: 60% compatibility required for group formation

## 💰 Monetization (Future)

### Freemium Model
- **Free**: Match for 1 course
- **Paid** (£5-£10/semester): 
  - Unlimited course matching
  - Priority matching
  - Advanced filters

### University Licensing
- £3k-£5k per year per university
- Branded campus version
- Custom features

## 🔐 Security

- **Google OAuth**: Secure authentication
- **University verification**: .ac.uk domain required
- **Session management**: 7-day session tokens
- **Protected routes**: All endpoints require authentication
- **CORS enabled**: Secure cross-origin requests

## 📝 Data Models

### User
- Basic info: email, name, picture
- Academic: university, course
- Preferences: study style, grade goals, location
- Availability: weekly time slots
- Status: onboarding completed, matching status, group ID

### Group
- Members: 2-4 user IDs
- Course: shared course/module
- Compatibility: calculated score
- Suggested times: overlapping schedules
- Health score: activity-based (100% default)

### Message
- Group ID, sender info
- Content, timestamp
- Simple async delivery

### Attendance Session
- Group ID, scheduled date
- Attendees: list of checked-in users
- Status: scheduled/completed/missed

## 🎯 Future Enhancements

1. **Real-time messaging** (Socket.io)
2. **Push notifications** (Expo Notifications)
3. **Advanced analytics** (Study patterns, success metrics)
4. **Calendar integration** (Google Calendar sync)
5. **Study resources sharing** (Files, links, notes)
6. **Video call integration** (Quick study sessions)
7. **Gamification** (Badges, leaderboards)
8. **AI insights** (LLM-powered compatibility explanations)

## 🐛 Known Limitations

- Messaging is async (5-second polling), not real-time
- Single course matching only (free tier)
- Basic streak calculation (consecutive days only)
- No push notifications yet
- No file/image sharing in chat

## 📄 License

Built for university students with ❤️

## 🙋 Support

For issues or questions, contact support through the app Profile → Help & Support.

---

**Version**: 1.0.0  
**Last Updated**: January 2025  
**Built with**: Expo, FastAPI, MongoDB
