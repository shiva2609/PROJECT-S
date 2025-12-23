# Firebase Cloud Functions - Itinerary Builder

## Overview

The `buildItinerary` Cloud Function generates AI-powered travel itineraries using Google Gemini AI.

## Security Features

✅ **Authentication Required** - Only authenticated users can call this function  
✅ **Input Validation** - Comprehensive validation of all parameters  
✅ **API Key Protection** - Gemini API key stored securely in environment variables  
✅ **Error Sanitization** - No sensitive data exposed in error messages  
✅ **No Raw Metadata** - Only returns the itinerary text, no model details

---

## Setup Instructions

### 1. Install Dependencies

```bash
cd functions
npm install
```

This will install:
- `firebase-admin`
- `firebase-functions`
- `@google/generative-ai`

### 2. Configure Environment Variable

Set the Gemini API key in Firebase Functions configuration:

```bash
firebase functions:config:set gemini.api_key="YOUR_GEMINI_API_KEY_HERE"
```

**Important:** Replace `YOUR_GEMINI_API_KEY_HERE` with your actual Google Gemini API key.

To verify the configuration:

```bash
firebase functions:config:get
```

### 3. Deploy the Function

```bash
npm run deploy
```

Or deploy only this specific function:

```bash
firebase deploy --only functions:buildItinerary
```

---

## Function Specification

### Name
`buildItinerary`

### Type
`https.onCall` (Firebase Callable Function)

### Authentication
**Required** - User must be authenticated via Firebase Auth

### Input Parameters

```typescript
{
  destination: string,    // Required, max 100 chars
  startDate: string,      // Required, ISO date string
  endDate: string,        // Required, ISO date string
  travelers: number,      // Required, integer 1-20
  preferences?: string    // Optional, max 300 chars
}
```

### Validation Rules

| Parameter | Type | Required | Validation |
|-----------|------|----------|------------|
| `destination` | string | ✅ Yes | Non-empty, max 100 characters |
| `startDate` | string | ✅ Yes | Valid ISO date string |
| `endDate` | string | ✅ Yes | Valid ISO date string, must be after startDate |
| `travelers` | number | ✅ Yes | Integer between 1 and 20 |
| `preferences` | string | ❌ No | Max 300 characters |

### Response

```typescript
{
  itineraryText: string  // Generated itinerary in markdown format
}
```

### Error Codes

| Code | Description |
|------|-------------|
| `unauthenticated` | User is not authenticated |
| `invalid-argument` | Invalid input parameters |
| `failed-precondition` | API key not configured or authentication failed |
| `resource-exhausted` | API quota exceeded or rate limited |
| `deadline-exceeded` | Request timeout |
| `internal` | Generic error (details sanitized) |

---

## Client Usage Example

### React Native (TypeScript)

```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const buildItinerary = httpsCallable(functions, 'buildItinerary');

async function generateItinerary() {
  try {
    const result = await buildItinerary({
      destination: 'Paris, France',
      startDate: '2024-06-01T00:00:00.000Z',
      endDate: '2024-06-05T00:00:00.000Z',
      travelers: 2,
      preferences: 'Romantic getaway, art museums, fine dining'
    });

    const { itineraryText } = result.data;
    console.log('Itinerary:', itineraryText);
    
  } catch (error: any) {
    console.error('Error:', error.code, error.message);
    
    switch (error.code) {
      case 'unauthenticated':
        // Show login prompt
        break;
      case 'invalid-argument':
        // Show validation error
        break;
      case 'resource-exhausted':
        // Show "try again later" message
        break;
      default:
        // Show generic error
        break;
    }
  }
}
```

---

## Security Best Practices

### ✅ What This Function Does Right

1. **No API Key in Client** - Gemini API key never exposed to client code
2. **Authentication Required** - Only authenticated users can generate itineraries
3. **Input Validation** - All inputs validated before processing
4. **Error Sanitization** - Internal errors not exposed to clients
5. **Logging** - User ID logged for audit trail (not API key)
6. **Dynamic Import** - Gemini SDK only loaded when needed

### ⚠️ Additional Recommendations

1. **Rate Limiting** - Consider implementing per-user rate limits
2. **Cost Tracking** - Monitor Gemini API usage and costs
3. **Caching** - Cache similar requests to reduce API calls
4. **Timeout** - Set appropriate timeout for long-running requests

---

## Environment Variables

The function reads the API key from:

```javascript
process.env.GEMINI_API_KEY
```

This is automatically populated from Firebase Functions config:

```bash
firebase functions:config:set gemini.api_key="YOUR_KEY"
```

**Never:**
- ❌ Hardcode the API key in source code
- ❌ Commit the API key to version control
- ❌ Log the API key in console
- ❌ Return the API key in responses

---

## Testing

### Local Emulator

```bash
npm run serve
```

Then call the function from your app pointing to the emulator:

```typescript
import { connectFunctionsEmulator } from 'firebase/functions';

const functions = getFunctions();
connectFunctionsEmulator(functions, 'localhost', 5001);
```

### Production Testing

After deployment, test with a real authenticated user:

```bash
firebase functions:log --only buildItinerary
```

---

## Monitoring

View function logs:

```bash
npm run logs
```

Or in Firebase Console:
1. Go to Functions section
2. Select `buildItinerary`
3. View Logs tab

---

## Troubleshooting

### Error: "AI service is not properly configured"

**Solution:** Set the Gemini API key:

```bash
firebase functions:config:set gemini.api_key="YOUR_KEY"
firebase deploy --only functions:buildItinerary
```

### Error: "Authentication required"

**Solution:** Ensure user is signed in before calling the function.

### Error: "Invalid argument"

**Solution:** Check that all required parameters are provided and valid.

---

## Cost Considerations

- Each itinerary generation = 1 Gemini API call
- Monitor usage in Google Cloud Console
- Consider implementing:
  - Request caching
  - User quotas (e.g., 10 itineraries per day)
  - Premium tier for unlimited access

---

## Support

For issues or questions:
1. Check Firebase Functions logs
2. Verify environment configuration
3. Test with Firebase emulator
4. Review input validation errors

---

**Last Updated:** December 23, 2024
