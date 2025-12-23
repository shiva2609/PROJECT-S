"use strict";
/**
 * Cloud Functions for Account Change Approval and AI Services
 *
 * Environment Configuration:
 * - Local: Uses .env file (via dotenv)
 * - Production: Uses Firebase Functions config
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.geminiHealthCheck = exports.buildItinerary = exports.autoVerifyStep = exports.onUpgradeRequestRejected = exports.onUpgradeRequestApproved = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
// Load environment variables for local development
// In production, Firebase Functions config takes precedence
if (process.env.NODE_ENV !== 'production') {
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require('dotenv').config();
    }
    catch (error) {
        // dotenv not installed or .env file missing - that's okay
        console.log('Running without .env file');
    }
}
admin.initializeApp();
/**
 * When an upgrade request is approved, update the user's accountType
 */
exports.onUpgradeRequestApproved = functions.firestore
    .document('upgrade_requests/{requestId}')
    .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const requestId = context.params.requestId;
    // Only process if status changed to 'approved'
    if (before.status !== 'approved' && after.status === 'approved') {
        const { uid, toRole, fromRole } = after;
        try {
            const userRef = admin.firestore().doc(`users/${uid}`);
            const userSnap = await userRef.get();
            if (!userSnap.exists) {
                console.error(`User ${uid} not found`);
                return;
            }
            const userData = userSnap.data();
            const pendingChange = userData?.pendingAccountChange;
            // Verify the request matches the pending change
            if (pendingChange?.requestId !== requestId) {
                console.error(`Request ID mismatch: ${requestId} vs ${pendingChange?.requestId}`);
                return;
            }
            // Update user's accountType
            await userRef.update({
                accountType: toRole,
                'pendingAccountChange.status': 'approved',
                'pendingAccountChange.approvedAt': admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: Date.now(),
            });
            // Move uploaded docs to verifiedDocs (optional - keep for audit)
            if (pendingChange.uploadedDocs) {
                await userRef.update({
                    verificationDocs: pendingChange.uploadedDocs,
                });
            }
            // Save previous KYC info
            await userRef.update({
                previousKYC: {
                    type: fromRole,
                    verifiedAt: userData?.verifiedAt || null,
                    kycStatus: userData?.kycStatus || 'not_required',
                },
            });
            console.log(`✅ Account type updated for user ${uid}: ${fromRole} -> ${toRole}`);
            // Optional: Send notification to user
            // You can add FCM notification here if needed
        }
        catch (error) {
            console.error(`❌ Error updating account type for ${uid}:`, error);
            throw error;
        }
    }
});
/**
 * When an upgrade request is rejected, update pending status
 */
exports.onUpgradeRequestRejected = functions.firestore
    .document('upgrade_requests/{requestId}')
    .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const requestId = context.params.requestId;
    // Only process if status changed to 'rejected'
    if (before.status !== 'rejected' && after.status === 'rejected') {
        const { uid } = after;
        try {
            const userRef = admin.firestore().doc(`users/${uid}`);
            const userSnap = await userRef.get();
            if (!userSnap.exists) {
                console.error(`User ${uid} not found`);
                return;
            }
            const userData = userSnap.data();
            const pendingChange = userData?.pendingAccountChange;
            // Verify the request matches the pending change
            if (pendingChange?.requestId !== requestId) {
                console.error(`Request ID mismatch: ${requestId} vs ${pendingChange?.requestId}`);
                return;
            }
            // Update pending status to rejected
            await userRef.update({
                'pendingAccountChange.status': 'rejected',
                'pendingAccountChange.rejectedAt': admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: Date.now(),
            });
            console.log(`✅ Account change rejected for user ${uid}`);
            // Optional: Send notification to user
        }
        catch (error) {
            console.error(`❌ Error rejecting account change for ${uid}:`, error);
            throw error;
        }
    }
});
/**
 * Optional: Auto-approve certain verification steps (e.g., PAN validation)
 * This is a placeholder - implement actual validation logic based on your needs
 */
exports.autoVerifyStep = functions.https.onCall(async (data, context) => {
    // Verify user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    // Verify user is superAdmin
    const userDoc = await admin.firestore().doc(`users/${context.auth.uid}`).get();
    if (userDoc.data()?.accountType !== 'superAdmin') {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can auto-verify');
    }
    const { stepKey } = data;
    // Implement your auto-verification logic here
    // For example, validate PAN number via third-party API
    return { success: true, stepKey };
});
/**
 * Build AI-Powered Itinerary
 *
 * Generates travel itineraries using Google Gemini AI
 *
 * Security:
 * - Requires authentication
 * - API key stored in environment variable
 * - Input validation and sanitization
 * - Error sanitization (no sensitive data leaked)
 *
 * @param data - Itinerary request parameters
 * @param context - Firebase callable context
 * @returns { itineraryText: string }
 */
exports.buildItinerary = functions.https.onCall(async (data, context) => {
    // 1. Authentication Check
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Authentication required to generate itineraries');
    }
    const userId = context.auth.uid;
    console.log(`Itinerary request from user: ${userId}`);
    // 2. Input Validation
    const { destination, startDate, endDate, travelers, preferences } = data;
    // Validate destination
    if (!destination || typeof destination !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'Destination is required and must be a string');
    }
    if (destination.trim().length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'Destination cannot be empty');
    }
    if (destination.length > 100) {
        throw new functions.https.HttpsError('invalid-argument', 'Destination must be 100 characters or less');
    }
    // Validate dates
    if (!startDate || typeof startDate !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'Start date is required and must be an ISO string');
    }
    if (!endDate || typeof endDate !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'End date is required and must be an ISO string');
    }
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    if (isNaN(startDateObj.getTime())) {
        throw new functions.https.HttpsError('invalid-argument', 'Start date is not a valid ISO date string');
    }
    if (isNaN(endDateObj.getTime())) {
        throw new functions.https.HttpsError('invalid-argument', 'End date is not a valid ISO date string');
    }
    if (endDateObj <= startDateObj) {
        throw new functions.https.HttpsError('invalid-argument', 'End date must be after start date');
    }
    // Validate travelers
    if (typeof travelers !== 'number') {
        throw new functions.https.HttpsError('invalid-argument', 'Travelers must be a number');
    }
    if (!Number.isInteger(travelers)) {
        throw new functions.https.HttpsError('invalid-argument', 'Travelers must be an integer');
    }
    if (travelers < 1 || travelers > 20) {
        throw new functions.https.HttpsError('invalid-argument', 'Travelers must be between 1 and 20');
    }
    // Validate preferences (optional)
    if (preferences !== undefined && preferences !== null) {
        if (typeof preferences !== 'string') {
            throw new functions.https.HttpsError('invalid-argument', 'Preferences must be a string');
        }
        if (preferences.length > 300) {
            throw new functions.https.HttpsError('invalid-argument', 'Preferences must be 300 characters or less');
        }
    }
    // 3. Get API Key from Environment
    // Local: process.env.GEMINI_API_KEY (from .env file)
    // Production: process.env.GEMINI_API_KEY (from environment variables)
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('GEMINI_API_KEY not configured in environment');
        throw new functions.https.HttpsError('failed-precondition', 'AI service is not properly configured. Please contact support.');
    }
    // 4. Generate Itinerary using Gemini AI
    try {
        // Import Gemini SDK (only in this function)
        const { GoogleGenerativeAI } = await Promise.resolve().then(() => require('@google/generative-ai'));
        const genAI = new GoogleGenerativeAI(apiKey);
        // Use gemini-1.5-flash
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        // Calculate trip duration
        const durationDays = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24));
        // Build prompt
        const prompt = `Create a detailed ${durationDays}-day travel itinerary for ${destination}.

Trip Details:
- Destination: ${destination}
- Start Date: ${startDate}
- End Date: ${endDate}
- Number of Travelers: ${travelers}
${preferences ? `- Preferences: ${preferences}` : ''}

Please provide:
1. A day-by-day breakdown with morning, afternoon, and evening activities
2. Recommended places to visit
3. Local cuisine suggestions
4. Transportation tips
5. Budget-friendly options where applicable

Format the response in a clear, structured manner with headings for each day.`;
        console.log(`Generating itinerary for ${destination} (${durationDays} days)`);
        // Call Gemini API
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const itineraryText = response.text();
        if (!itineraryText || itineraryText.trim().length === 0) {
            throw new Error('AI returned empty response');
        }
        console.log(`Itinerary generated successfully (${itineraryText.length} chars)`);
        // 5. Return sanitized response (ONLY the itinerary text)
        return {
            itineraryText: itineraryText.trim(),
        };
    }
    catch (error) {
        // 6. Error Handling - Sanitize errors before returning
        console.error('❌ Error in buildItinerary:', error);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('Error details:', JSON.stringify(error, null, 2));
        // Don't expose internal error details to client
        if (error.message?.includes('API key') || error.message?.includes('not found for API')) {
            throw new functions.https.HttpsError('failed-precondition', 'AI service authentication failed. Please contact support.');
        }
        if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
            throw new functions.https.HttpsError('resource-exhausted', 'AI service is temporarily unavailable. Please try again later.');
        }
        if (error.message?.includes('timeout')) {
            throw new functions.https.HttpsError('deadline-exceeded', 'Request timed out. Please try again.');
        }
        // Generic error for anything else
        throw new functions.https.HttpsError('internal', 'Failed to generate itinerary. Please try again later.');
    }
});
/**
 * TEMPORARY: diagnostic health check for Gemini API
 */
exports.geminiHealthCheck = functions.https.onRequest(async (req, res) => {
    const rawKey = process.env.GEMINI_API_KEY;
    const apiKey = rawKey?.trim();
    if (!apiKey) {
        res.status(500).send('Missing internal config: GEMINI_API_KEY is undefined');
        return;
    }
    // Debug info (safe to return)
    const keyInfo = {
        length: apiKey.length,
        firstFour: apiKey.substring(0, 4),
        lastFour: apiKey.substring(apiKey.length - 4),
        isClean: rawKey === apiKey,
        nodeEnv: process.env.NODE_ENV
    };
    try {
        // Dynamic import to keep cold starts fast if not using this function
        const { GoogleGenerativeAI } = await Promise.resolve().then(() => require('@google/generative-ai'));
        const genAI = new GoogleGenerativeAI(apiKey);
        // Try primary model, fallback to legacy pro if needed
        const modelsToTry = ['gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-pro'];
        let lastError;
        for (const modelName of modelsToTry) {
            try {
                console.log(`Attempting health check with model: ${modelName}`);
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent('Reply with the word OK');
                const response = await result.response;
                const text = response.text();
                res.status(200).send(`SUCCESS: ${text} | Model: ${modelName} | Key used: ${keyInfo.firstFour}...${keyInfo.lastFour}`);
                return; // Success, exit
            }
            catch (e) {
                console.warn(`Model ${modelName} failed:`, e.message);
                lastError = e;
                // Continue to next model
            }
        }
        // If we get here, all models failed
        throw lastError;
    }
    catch (error) {
        console.error('Health check failed:', error);
        res.status(500).send({
            message: `Health check failed after trying all models. Last error: ${error.message}`,
            debug: keyInfo,
            errorDetails: JSON.stringify(error, Object.getOwnPropertyNames(error))
        });
    }
});
//# sourceMappingURL=index.js.map