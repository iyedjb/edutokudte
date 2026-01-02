# Step-by-Step: Update GitHub and Redeploy to Coolify

## What Changed
The code was updated to better handle Firebase credentials. The changes allow both formats of the private key.

## Files Updated
- `server/routes.ts` - Added better Firebase private key processing

## Step 1: Commit and Push to GitHub

Open your terminal/command prompt:

```bash
cd your-project-folder

# See what changed
git status

# Add all changes
git add .

# Commit the changes
git commit -m "Fix: Improve Firebase private key handling for VPS deployment"

# Push to GitHub
git push origin main
```

(Replace `main` with your branch name if different)

## Step 2: In Coolify Dashboard

1. Go to your project in Coolify
2. Click **Deployments**
3. You should see your new commit appear automatically
4. If not, click **Refresh** or **Deploy from main**
5. Wait for the build to complete

## Step 3: Verify it Worked

In Coolify:
1. Go to your service
2. Click **Terminal** (or check logs)
3. Look for this message:
   ```
   ✅ Firebase Admin SDK initialized
   ✅ Educfy2 Firebase Admin SDK initialized
   ```

If you see those, SUCCESS! The fix worked.

## Step 4: Test the App

1. Open your app URL
2. Try logging in with a CPF and birthdate
3. Should work now!

---

## If Something Goes Wrong

Check the Coolify logs for error messages. The updated code now shows:
- `❌ Invalid private key format: missing BEGIN marker`
- `❌ Invalid private key format: missing END marker`
- `Firebase Admin SDK initialization error: [specific error]`

These messages will tell you exactly what's wrong.

## Common Issues

### Build fails after commit
- Wait a few seconds for webhook
- Manually click Deploy
- Check build logs for errors

### Still says "Firebase Admin SDK not configured"
- Check env vars in Coolify are set correctly
- Check "Available at Runtime" is checked
- Redeploy again

### "CPF não encontrado" still appears
- Firebase still not initializing
- Check the exact error in Coolify logs
- Read FIREBASE_SETUP.md to verify private key format

---

## Summary of Changes

### Before
```typescript
// Only handled escaped \n format
privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
```

### After
```typescript
// Handles both formats + validates the key
privateKey: processedPrivateKey,
// Where processedPrivateKey validates:
// - Has -----BEGIN PRIVATE KEY-----
// - Has -----END PRIVATE KEY-----
// - Handles both literal \n and escaped \\n
```

This is a small change, but it makes the code more robust for different environment variable formats from Coolify.
