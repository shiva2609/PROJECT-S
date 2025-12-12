/**
 * Cloud Functions for Account Change Approval
 * 
 * This function handles the final approval of account change requests
 * and updates the user's accountType in Firestore.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

/**
 * When an upgrade request is approved, update the user's accountType
 */
export const onUpgradeRequestApproved = functions.firestore
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
      } catch (error) {
        console.error(`❌ Error updating account type for ${uid}:`, error);
        throw error;
      }
    }
  });

/**
 * When an upgrade request is rejected, update pending status
 */
export const onUpgradeRequestRejected = functions.firestore
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
      } catch (error) {
        console.error(`❌ Error rejecting account change for ${uid}:`, error);
        throw error;
      }
    }
  });

/**
 * Optional: Auto-approve certain verification steps (e.g., PAN validation)
 * This is a placeholder - implement actual validation logic based on your needs
 */
export const autoVerifyStep = functions.https.onCall(async (data, context) => {
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

