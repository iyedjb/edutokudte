# VPS Deployment Guide - Fixing Login Issues

## Problem
Your app works on Replit but login fails on your VPS (Coolify OS). This is because the Firebase Admin SDK credentials are not configured on your VPS.

## Root Cause
The student login via CPF requires `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PROJECT_ID` environment variables. Without these, the backend cannot process student authentication.

## Solution

### Step 1: Get Your Firebase Credentials
You need to create a Firebase Service Account JSON file:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Settings** → **Service Accounts**
4. Click **Generate New Private Key**
5. Download the JSON file
6. Open it and find these three values:
   - `project_id` → Copy to `FIREBASE_PROJECT_ID`
   - `private_key` → Copy to `FIREBASE_PRIVATE_KEY`
   - `client_email` → Copy to `FIREBASE_CLIENT_EMAIL`

### Step 2: Set Environment Variables in Coolify

In your Coolify dashboard, go to your project's **Environment Variables** section and add:

```
FIREBASE_PROJECT_ID=your_project_id_here
FIREBASE_CLIENT_EMAIL=your_email_here@iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvQIBA...\n-----END PRIVATE KEY-----\n
```

**IMPORTANT:** When copying the private key:
- Include the full key including the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` lines
- Make sure line breaks are preserved as `\n` (newlines as literal `\n` text, not actual line breaks)

### Step 3: Redeploy
1. In Coolify, trigger a redeploy of your application
2. Wait for the build to complete
3. Test login with a student CPF

## Testing
After deployment:
1. Open your app URL
2. Try logging in with a CPF and birthdate
3. If successful, you'll see the dashboard
4. If it still fails, check the Coolify logs for error messages

## Alternative: Use Email/Password Login
If you don't have Firebase credentials yet, users can still log in using:
- Email signup/signin
- Google OAuth (if configured)

Student CPF login is optional and requires the Firebase Admin SDK configuration.

## Troubleshooting

### "CPF não encontrado" Error
- Check that all three Firebase environment variables are set correctly
- Ensure the `FIREBASE_PRIVATE_KEY` includes the full BEGIN/END lines
- Check Coolify logs for connection errors

### Container keeps restarting
- Check the server logs in Coolify terminal
- Verify all environment variable values are correct
- Look for "Firebase Admin SDK initialization error" messages

### Still not working?
Check your Coolify logs with this pattern:
- Look for: "Firebase Admin SDK initialized" (means it worked)
- Or: "Firebase Admin SDK not configured" (means env vars are missing)

## Database URL
If you're using Neon serverless database, you may also need:
```
DATABASE_URL=postgresql://user:password@host/database
```

This is only needed if switching from in-memory storage to persistent database.
