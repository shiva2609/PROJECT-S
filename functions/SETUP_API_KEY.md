# Gemini API Key Configuration Guide

## Overview

This guide explains how to securely configure the Gemini API key for Firebase Cloud Functions in both **local development** and **production** environments.

---

## 🔐 Security Principles

✅ **API key NEVER in client code**  
✅ **API key NEVER committed to Git**  
✅ **API key accessible ONLY in Cloud Functions**  
✅ **Different methods for local vs production**

---

## 📋 Configuration Methods

### **Local Development** (Emulator)
- Uses `.env` file
- File is gitignored
- Loaded via `dotenv` package

### **Production** (Deployed Functions)
- Uses Firebase Functions config
- Stored securely in Firebase
- Set via Firebase CLI

---

## 🚀 Setup Instructions

### **Step 1: Get Your Gemini API Key**

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated key (starts with `AIza...`)

---

### **Step 2: Local Development Setup**

#### **2.1 Create .env File**

```bash
cd functions
cp .env.example .env
```

#### **2.2 Add Your API Key**

Edit `functions/.env`:

```bash
GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**Replace** `AIzaSyXXX...` with your actual API key.

#### **2.3 Install Dependencies**

```bash
npm install
```

This installs `dotenv` and other dependencies.

#### **2.4 Verify .env is Gitignored**

Check that `.env` is in `.gitignore`:

```bash
cat .gitignore | grep .env
```

Should show:
```
.env
.env.local
.env.*.local
```

---

### **Step 3: Production Setup**

#### **3.1 Set Firebase Functions Config**

```bash
firebase functions:config:set gemini.api_key="YOUR_ACTUAL_API_KEY_HERE"
```

**Important:** Replace `YOUR_ACTUAL_API_KEY_HERE` with your real key.

#### **3.2 Verify Configuration**

```bash
firebase functions:config:get
```

Should show:
```json
{
  "gemini": {
    "api_key": "AIzaSy..."
  }
}
```

#### **3.3 Deploy Functions**

```bash
npm run deploy
```

Or deploy specific function:
```bash
firebase deploy --only functions:buildItinerary
```

---

## 🧪 Testing

### **Local Testing (Emulator)**

#### **Start Emulator**

```bash
cd functions
npm run serve
```

The emulator will:
1. Load `.env` file automatically
2. Make `GEMINI_API_KEY` available to functions
3. Run on `http://localhost:5001`

#### **Test from Client**

```typescript
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const functions = getFunctions();
connectFunctionsEmulator(functions, 'localhost', 5001);

// Now call buildItinerary - it will use local .env
```

---

### **Production Testing**

After deployment, test with real Firebase:

```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const buildItinerary = httpsCallable(functions, 'buildItinerary');

const result = await buildItinerary({
  destination: 'Paris',
  startDate: '2024-06-01T00:00:00.000Z',
  endDate: '2024-06-05T00:00:00.000Z',
  travelers: 2
});
```

---

## ✅ Verification Checklist

### **Security Verification**

Run these checks to ensure security:

#### **1. Check .env is NOT Committed**

```bash
git status
```

Should NOT show `.env` in changes.

```bash
git ls-files | grep .env
```

Should only show `.env.example`, NOT `.env`.

#### **2. Check Client Bundle**

Search client code for API key:

```bash
cd ..  # Go to project root
grep -r "AIza" src/
```

Should return **NO RESULTS** (except Firebase keys, which are safe).

#### **3. Check Functions Code**

```bash
cd functions
grep -r "AIza" src/
```

Should return **NO RESULTS** (key is in .env, not code).

#### **4. Verify .gitignore**

```bash
cat .gitignore | grep -E "\.env|runtimeconfig"
```

Should show:
```
.env
.env.local
.env.*.local
.runtimeconfig.json
```

---

## 🔄 How It Works

### **Code Flow**

```typescript
// functions/src/index.ts

// 1. Load .env for local development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

// 2. In buildItinerary function
export const buildItinerary = functions.https.onCall(async (data, context) => {
  // 3. Try Firebase config first (production)
  let apiKey = functions.config().gemini?.api_key;
  
  // 4. Fallback to .env (local)
  if (!apiKey) {
    apiKey = process.env.GEMINI_API_KEY;
  }
  
  // 5. Use the key
  const genAI = new GoogleGenerativeAI(apiKey);
  // ...
});
```

### **Environment Resolution**

| Environment | Source | Method |
|-------------|--------|--------|
| **Local Emulator** | `.env` file | `process.env.GEMINI_API_KEY` |
| **Production** | Firebase config | `functions.config().gemini.api_key` |

---

## 🚨 Troubleshooting

### **Error: "AI service is not properly configured"**

**Cause:** API key not found.

**Solutions:**

#### **For Local Development:**
1. Check `.env` file exists: `ls -la functions/.env`
2. Check key is set: `cat functions/.env | grep GEMINI`
3. Restart emulator: `npm run serve`

#### **For Production:**
1. Check config: `firebase functions:config:get`
2. Set if missing: `firebase functions:config:set gemini.api_key="YOUR_KEY"`
3. Redeploy: `npm run deploy`

---

### **Error: ".env file not found"**

**Solution:**

```bash
cd functions
cp .env.example .env
# Edit .env and add your key
```

---

### **Key Appears in Git**

**If you accidentally committed .env:**

```bash
# Remove from Git (keeps local file)
git rm --cached functions/.env

# Add to .gitignore if not already there
echo ".env" >> functions/.gitignore

# Commit the removal
git commit -m "Remove .env from version control"

# IMPORTANT: Rotate your API key immediately!
# Go to Google AI Studio and create a new key
```

---

## 📁 File Structure

```
functions/
├── .env                    # ❌ NOT committed (your local key)
├── .env.example           # ✅ Committed (template)
├── .gitignore             # ✅ Committed (includes .env)
├── package.json           # ✅ Committed
├── src/
│   └── index.ts          # ✅ Committed (no hardcoded keys)
└── README_ITINERARY.md   # ✅ Committed (docs)
```

---

## 🔑 Best Practices

### **DO:**
✅ Use `.env` for local development  
✅ Use Firebase config for production  
✅ Keep `.env` in `.gitignore`  
✅ Commit `.env.example` as template  
✅ Rotate keys if exposed  
✅ Use different keys for dev/prod (optional)

### **DON'T:**
❌ Hardcode API keys in source code  
❌ Commit `.env` to Git  
❌ Share API keys in chat/email  
❌ Use production keys locally  
❌ Log API keys in console  
❌ Return API keys in responses

---

## 📊 Quick Reference

### **Local Development**

```bash
# Setup
cd functions
cp .env.example .env
# Edit .env with your key
npm install
npm run serve

# Test
# Point client to localhost:5001
```

### **Production**

```bash
# Setup
firebase functions:config:set gemini.api_key="YOUR_KEY"
firebase functions:config:get  # Verify

# Deploy
npm run deploy

# Monitor
firebase functions:log --only buildItinerary
```

---

## 🆘 Support

If you encounter issues:

1. **Check logs:**
   - Local: Terminal output from `npm run serve`
   - Production: `firebase functions:log`

2. **Verify configuration:**
   - Local: `cat functions/.env`
   - Production: `firebase functions:config:get`

3. **Test API key:**
   - Visit [Google AI Studio](https://makersuite.google.com/)
   - Verify key is active

---

**Last Updated:** December 23, 2024
