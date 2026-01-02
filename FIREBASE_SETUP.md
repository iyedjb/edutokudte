# Firebase Setup for Coolify VPS Deployment

## Why Login Fails on Your VPS

Your app works on Replit but fails on Coolify because the Firebase Admin SDK credentials aren't properly configured. This is needed for student CPF login.

## Step-by-Step Setup

### 1. Get Your Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Click **Settings** (gear icon) → **Project Settings**
4. Go to **Service Accounts** tab
5. Click **Generate New Private Key** (Node.js selected)
6. Save the JSON file to your computer

### 2. Extract the Three Required Values

Open the downloaded JSON file. You need exactly 3 values:

**Example JSON file:**
```json
{
  "type": "service_account",
  "project_id": "gepo-86dbb",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkq...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-abc123@gepo-86dbb.iam.gserviceaccount.com",
  ...
}
```

Extract these 3 values:
- **FIREBASE_PROJECT_ID** = `project_id` value
- **FIREBASE_CLIENT_EMAIL** = `client_email` value  
- **FIREBASE_PRIVATE_KEY** = `private_key` value (with the newline characters)

### 3. Format the Private Key Correctly

The private key format is critical. It should look like:
```
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAAOCA...
[more lines here]
-----END PRIVATE KEY-----
```

**In Coolify, paste it exactly as it appears in the JSON file** (with `\n` as literal characters, not actual line breaks).

### 4. Add to Coolify Environment Variables

In Coolify dashboard:
1. Go to **Configuration** for your service
2. Go to **Advanced** → **Environment Variables** (or **Secrets**)
3. Add these three variables:

```
FIREBASE_PROJECT_ID=gepo-86dbb
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-abc123@gepo-86dbb.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAAOCAQ8AMIIEv...\n-----END PRIVATE KEY-----\n
```

**Make sure:**
- Check "Available at Runtime" ✓
- Check "Available at Buildtime" ✓ (if available)
- Copy the ENTIRE private key including `-----BEGIN` and `-----END` lines

### 5. Redeploy

1. Click **Redeploy** in Coolify
2. Wait for build to complete
3. Check the logs for:
   ```
   ✅ Firebase Admin SDK initialized
   ✅ Educfy2 Firebase Admin SDK initialized
   ```

If you see those messages, it worked! If you see:
```
❌ Firebase Admin SDK not configured
```

Then something is wrong. Check the logs for more details about what went wrong.

### 6. Test Login

1. Go to your app URL
2. Enter a CPF and birthdate
3. Click "Entrar"
4. Should now work! 

---

## Troubleshooting

### Error: "CPF não encontrado"
This means Firebase isn't initialized. Check:
- Are all 3 env vars in Coolify?
- Is the private key copied completely?
- Did you redeploy after adding env vars?

### Error in logs: "Invalid private key format"
The private key is malformed. Make sure:
- It starts with `-----BEGIN PRIVATE KEY-----`
- It ends with `-----END PRIVATE KEY-----`
- Copy the ENTIRE value from the JSON file

### Error in logs: "Missing BEGIN marker" or "Missing END marker"
Same as above - the key is incomplete or truncated.

### Still not working?
Check your Coolify logs and look for any error messages about Firebase initialization. The updated code will now show you exactly what's wrong.

---

## Files Changed

The code was updated to better handle Firebase private key formatting:
- `server/routes.ts` - Added `processFirebasePrivateKey()` function

These changes handle both formats:
- Private key with literal `\n` newlines (Coolify style)
- Private key with actual newline characters

Simply redeploy and it should work!
