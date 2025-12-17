/**
 * KYC Auth Redirect Helper
 * 
 * Utility functions for auto-redirecting users to verification screens
 * based on their account type and verification status
 */

import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../core/firebase';
import { AccountType, UserAccountData } from '../types/account';
import { requiresVerification } from '../hooks/useKYCManager';
import { navigateToVerification } from './kycNavigation';

/**
 * Hook to check and redirect user to verification if needed
 * Use this in your main app component or AuthContext
 */
export function useKYCRedirect(userId: string | null, initialized: boolean) {
  const navigation = useNavigation();

  useEffect(() => {
    if (!initialized || !userId) {
      return;
    }

    const checkAndRedirect = async () => {
      try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          return;
        }

        const userData = userSnap.data() as UserAccountData;
        const accountType = userData.accountType || 'Traveler';
        const kycStatus = userData.kycStatus || 'not_required';
        const verificationStatus = userData.verificationStatus || 'none';

        // Check if verification is required and not completed
        if (requiresVerification(accountType as AccountType)) {
          const isVerified = kycStatus === 'approved' || kycStatus === 'verified' || verificationStatus === 'verified';

          if (!isVerified) {
            // Small delay to ensure navigation is ready
            setTimeout(() => {
              navigateToVerification(navigation, accountType as AccountType);
            }, 500);
          }
        }
      } catch (error) {
        console.error('Error checking KYC redirect:', error);
      }
    };

    checkAndRedirect();
  }, [userId, initialized, navigation]);
}

/**
 * Check if user needs verification without redirecting
 */
export async function needsVerification(userId: string): Promise<{
  needsVerification: boolean;
  accountType: AccountType | null;
  isVerified: boolean;
}> {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return { needsVerification: false, accountType: null, isVerified: false };
    }

    const userData = userSnap.data() as UserAccountData;
    const accountType = (userData.accountType || 'Traveler') as AccountType;
    const kycStatus = userData.kycStatus || 'not_required';
    const verificationStatus = userData.verificationStatus || 'none';

    const needsVerif = requiresVerification(accountType);
    const isVerified = kycStatus === 'approved' || kycStatus === 'verified' || verificationStatus === 'verified';

    return {
      needsVerification: needsVerif && !isVerified,
      accountType: needsVerif ? accountType : null,
      isVerified,
    };
  } catch (error) {
    console.error('Error checking verification needs:', error);
    return { needsVerification: false, accountType: null, isVerified: false };
  }
}

