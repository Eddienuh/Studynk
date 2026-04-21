# Test Credentials for Studynk

## Master Tester (No OTP required)
- **Email**: admin@studynk.com
- **Password**: BetaPass123!
- **Notes**: Bypasses email verification, goes directly to dashboard

## Email/Password Auth (Regular user - OTP required)
- **Email**: test@studymatch.com
- **Password**: test123456
- **Notes**: Any valid email format is now accepted for registration

## Notes
- Email domain restrictions REMOVED — any RFC-compliant email works
- After registration, a 6-digit OTP is sent via SMTP to the user's email
- OTP expires after 10 minutes, max 5 attempts
- Google OAuth is available as secondary option via the login screen
