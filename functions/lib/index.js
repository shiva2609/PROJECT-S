"use strict";
/**
 * Cloud Functions for Account Change Approval and AI Services
 *
 * Environment Configuration:
 * - Local: Uses .env file (via dotenv)
 * - Production: Uses Firebase Functions config
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTravelerCardIfMissing = exports.onUserCreated = exports.buildItinerary = exports.autoVerifyStep = exports.onUpgradeRequestRejected = exports.onUpgradeRequestApproved = void 0;
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
    // Production: functions.config().gemini.api_key
    let apiKey;
    try {
        // Try Firebase Functions config first (production)
        apiKey = functions.config().gemini?.api_key;
    }
    catch (error) {
        // Fallback to process.env for local development
        apiKey = process.env.GEMINI_API_KEY;
    }
    // If still not found, try process.env directly (emulator)
    if (!apiKey) {
        apiKey = process.env.GEMINI_API_KEY;
    }
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
// Story Features
__exportStar(require("./stories"), exports);
// ============================================================================
// TRAVELER CARD PHASE 1 - AUTO CREATION & REPAIR
// ============================================================================
/**
 * Generate a 16-char unique Traveler ID
 * Format: 16 uppercase alphanumeric characters [A-Z0-9]
 */
const generateTravelerId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 16; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};
/**
 * onUserCreated
 * Trigger: Auth Create
 * Goal: Auto-create Traveler Card for new signups
 */
exports.onUserCreated = functions.auth.user().onCreate(async (user) => {
    const { uid, displayName, metadata } = user;
    const db = admin.firestore();
    const cardRef = db.collection('traveller_cards').doc(uid);
    const cardSnap = await cardRef.get();
    if (cardSnap.exists) {
        console.log(`Traveler Card already exists for ${uid}`);
        return;
    }
    // Format "Member Since" date (MMM YYYY)
    let sinceDate = 'Unknown';
    if (metadata.creationTime) {
        const date = new Date(metadata.creationTime);
        if (!isNaN(date.getTime())) {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            sinceDate = `${months[date.getMonth()]} ${date.getFullYear()}`;
        }
    }
    const travelerId = generateTravelerId();
    const newCard = {
        userId: uid,
        travelerId: travelerId,
        displayName: displayName || 'Traveler',
        verifiedName: null,
        since: sinceDate,
        nationality: 'India', // Legacy default or optional
        emergencyInfoStatus: 'empty',
        trustTier: 'UNPROVEN',
        travelHistoryCount: 0, // travelHistoryCount matches schema
        verificationState: 'COMING_SOON',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    try {
        await cardRef.set(newCard); // Create document
        console.log(`✅ Traveler Card created for new user ${uid}: ${travelerId}`);
    }
    catch (error) {
        console.error(`❌ Error creating Traveler Card for ${uid}:`, error);
    }
});
/**
 * createTravelerCardIfMissing
 * Trigger: Callable
 * Goal: Repair/Create card for existing users who pre-date the feature
 */
exports.createTravelerCardIfMissing = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
    }
    const uid = context.auth.uid;
    const db = admin.firestore();
    const cardRef = db.collection('traveller_cards').doc(uid);
    const cardSnap = await cardRef.get();
    if (cardSnap.exists) {
        // Idempotent success
        return { success: true, message: 'Card already exists', card: cardSnap.data() };
    }
    // Fetch user record for metadata
    let sinceDate = 'Unknown';
    let displayName = 'Traveler';
    try {
        const userRecord = await admin.auth().getUser(uid);
        displayName = userRecord.displayName || 'Traveler';
        if (userRecord.metadata.creationTime) {
            const date = new Date(userRecord.metadata.creationTime);
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            sinceDate = `${months[date.getMonth()]} ${date.getFullYear()}`;
        }
    }
    catch (e) {
        console.warn(`Could not fetch user record for ${uid}`, e);
        // Fallback: Use current date
        const now = new Date();
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        sinceDate = `${months[now.getMonth()]} ${now.getFullYear()}`;
    }
    const travelerId = generateTravelerId();
    const newCard = {
        userId: uid,
        travelerId: travelerId,
        displayName: displayName,
        verifiedName: null,
        since: sinceDate,
        nationality: 'India', // Legacy default
        emergencyInfoStatus: 'empty',
        trustTier: 'UNPROVEN',
        travelHistoryCount: 0,
        verificationState: 'COMING_SOON',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await cardRef.set(newCard);
    console.log(`✅ Auto-repaired (Created) Traveler Card for existing user ${uid}`);
    return { success: true, message: 'Card created successfully' };
});
//# sourceMappingURL=index.js.map