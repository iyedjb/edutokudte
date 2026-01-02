# Firebase Realtime Database Security Rules for QR Authentication

## Overview
The QR authentication system uses a fully server-mediated approach to prevent session enumeration and token theft:
1. All QR session data is completely locked down in RTDB
2. All read/write operations go through authenticated backend endpoints
3. Sessions are managed exclusively by Firebase Admin SDK
4. Clients never directly access RTDB for QR sessions

## Recommended Security Rules

Add these rules to your Firebase Realtime Database security rules (in Firebase Console):

```json
{
  "rules": {
    "qrSessions": {
      ".read": false,
      ".write": false
    }
  }
}
```

## Rule Explanation

### Complete Lockdown
- `.read: false` - **No client can read QR sessions** - Prevents session enumeration attacks
- `.write: false` - **No client can write QR sessions** - All writes go through Firebase Admin SDK

### Why This is Secure
1. **Prevents enumeration** - Attackers cannot list or scan for active sessions
2. **Prevents token theft** - Custom tokens are never exposed to clients
3. **Server-mediated** - All operations go through authenticated backend endpoints
4. **Admin SDK only** - Only the backend (using Admin SDK) can read/write sessions

### How Operations Work

**Desktop creates session:**
- POST `/api/auth/qr/session` → Backend creates session in RTDB using Admin SDK
- Returns sessionId + secret to desktop (secret stored in browser memory)

**Mobile authorizes session:**
- POST `/api/auth/qr/authorize` with sessionId → Backend writes approval using Admin SDK

**Desktop retrieves token:**
- POST `/api/auth/qr/retrieve-token` with sessionId + secret → Backend reads session using Admin SDK
- Verifies secret, returns custom token, marks session as consumed

### Security Benefits
1. **No session enumeration** - RTDB is completely locked down to clients
2. **Token protection** - Custom tokens never leave the backend until consumed
3. **Secret binding** - Only desktop with correct secret can retrieve token
4. **Server validation** - All security checks happen server-side
5. **Rate limiting** - Maximum 5 authorization attempts per minute per user
6. **Server-side expiration** - Sessions expire server-side after 90 seconds
7. **Age validation** - Sessions older than 2 minutes are automatically rejected
8. **Atomic updates** - Session status updates prevent race conditions
9. **One-time use** - Sessions marked as consumed after token retrieval
10. **Automatic cleanup** - Backend periodically deletes old sessions

## Security Model

### Architecture
The QR authentication uses a secure polling model with session binding:

1. **Desktop creates session**: Backend generates sessionId + secret, returns both to desktop
2. **Desktop stores secret locally**: Secret never leaves desktop memory
3. **QR code contains only sessionId**: Plain text, no sensitive data
4. **Mobile scans sessionId**: Extracts sessionId from QR code
5. **Mobile authorizes**: Calls `/api/auth/qr/authorize` with sessionId
6. **Backend approves**: Writes customToken to RTDB (protected by rules)
7. **Desktop polls with secret**: Calls `/api/auth/qr/retrieve-token` with sessionId + secret
8. **Backend verifies secret**: Compares SHA-256 hash, returns token if valid
9. **Token removed immediately**: CustomToken deleted from RTDB after retrieval
10. **Desktop logs in**: Uses custom token to authenticate

### Security Guarantees
- **Secret never exposed**: Secret stays in desktop memory, never in QR or RTDB
- **Session binding**: Only desktop with correct secret can retrieve token
- **Physical security**: Scanning QR gives sessionId but not secret
- **Short-lived tokens**: 90-second expiration window
- **One-time use**: Sessions marked as consumed after token retrieval
- **Rate limiting**: 5 authorization attempts per minute per user
- **Token protection**: Custom tokens never publicly readable in RTDB
- **Atomic operations**: Session status updates prevent race conditions

## Implementation Notes
- The backend uses Firebase Admin SDK which bypasses these security rules
- The cleanup function runs every 5 minutes to remove expired sessions
- Sessions expire after 90 seconds (configurable in backend)
- Custom tokens are single-use and expire with the session

## Testing Security
To test the security rules:
1. Try to write a custom token from the client (should fail)
2. Try to modify an existing session (should fail)
3. Verify that the backend can still approve sessions
4. Check that sessions are cleaned up after 5 minutes
