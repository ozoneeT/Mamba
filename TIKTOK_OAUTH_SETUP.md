# TikTok OAuth Setup Checklist

## ✅ Step 1: Verify Client Key (No Spaces!)

Your sandbox client key: `sbawm6gpdx9i8rt00u`

1. Go to TikTok Developer Portal → Your Sandbox App
2. Copy the client key EXACTLY (no spaces, no quotes)
3. Verify it matches: `sbawm6gpdx9i8rt00u`

---

## ✅ Step 2: Add Redirect URI in Sandbox Settings

**CRITICAL**: Must be EXACT match (including https, path, no trailing slash)

1. Go to Developer Portal → Sandbox App → Login Kit Settings
2. Add this EXACT redirect URI:
   ```
   https://mya-colorable-elusively.ngrok-free.dev/api/tiktok/auth/callback
   ```
3. Click **"Apply Changes"** or **"Save"** (IMPORTANT!)

---

## ✅ Step 3: Enable Minimal Scopes

For testing, enable ONLY these two scopes:
- ✅ `user.info.basic`
- ✅ `video.list`

(We simplified to minimal scopes to avoid permission issues)

---

## ✅ Step 4: Add Yourself as Sandbox Tester

**CRITICAL**: Only sandbox testers can authorize!

1. Go to Developer Portal → Sandbox → Test Users
2. Add your TikTok account (the one you'll use to log in)
3. Save changes

---

## ✅ Step 5: Verify App is Active

Make sure your sandbox app status shows:
- "Active" or "In Development" or "Sandbox Mode"
- NOT "Pending Review" or "Disabled"

---

## ✅ Step 6: Test the OAuth Flow

1. Make sure ngrok is running: `ngrok http 3001`
2. Backend server is running: `npm run dev` (in /server)
3. Frontend is running: `npm run dev`
4. Go to `http://localhost:5173`
5. Click "Connect TikTok"
6. **Log in with the SAME TikTok account you added as a sandbox tester**

---

## 🔍 Troubleshooting

### Still getting "unauthorized_client"?

**Check these:**
1. ❌ Did you click "Apply Changes" in TikTok portal?
2. ❌ Is the redirect URI EXACTLY matching (no trailing slash)?
3. ❌ Did you add yourself as a sandbox tester?
4. ❌ Are you logging in with the tester account?
5. ❌ Is Login Kit enabled as a product?

### Check the OAuth URL being generated

The URL should look like:
```
https://www.tiktok.com/v2/auth/authorize/?client_key=sbawm6gpdx9i8rt00u&scope=user.info.basic,video.list&response_type=code&redirect_uri=https://mya-colorable-elusively.ngrok-free.dev/api/tiktok/auth/callback&state=...&code_challenge=...&code_challenge_method=S256
```

### Common Issues:
- ❌ Redirect URI has trailing slash in portal but not in code (or vice versa)
- ❌ Using production client key in sandbox environment
- ❌ Forgot to save/apply changes in portal
- ❌ Not added as sandbox tester
- ❌ Login Kit product not enabled

---

## 📝 Current Configuration

**Backend (.env):**
- Client Key: `sbawm6gpdx9i8rt00u`
- Redirect URI: `https://mya-colorable-elusively.ngrok-free.dev/api/tiktok/auth/callback`
- Scopes: `user.info.basic,video.list`

**What to verify in TikTok Portal:**
- Same client key
- Same redirect URI (EXACT match)
- Scopes enabled: user.info.basic, video.list
- You are added as sandbox tester
- Changes are saved/applied
