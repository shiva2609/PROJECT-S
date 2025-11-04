/**
 * KYC Navigation Helper
 * 
 * Utility functions for navigating to appropriate verification screens
 * based on account type
 */

import { AccountType } from '../types/account';
import { requiresVerification } from '../hooks/useKYCManager';

/**
 * Get the route name for a verification screen based on account type
 */
export function getVerificationRoute(accountType: AccountType): string | null {
  if (!requiresVerification(accountType)) {
    return null;
  }

  const routeMap: Record<AccountType, string | null> = {
    Traveler: null,
    Host: 'HostVerification',
    Agency: 'AgencyVerification',
    AdventurePro: 'AdventureProVerification', // Can be created similarly
    Creator: 'CreatorVerification',
    StayHost: 'StayHostVerification',
    RideCreator: 'RideCreatorVerification', // Can be created similarly
    EventOrganizer: 'EventOrganizerVerification', // Can be created similarly
    superAdmin: null,
  };

  return routeMap[accountType] || null;
}

/**
 * Navigate to verification screen if required
 */
export function navigateToVerification(navigation: any, accountType: AccountType): boolean {
  const route = getVerificationRoute(accountType);
  if (route) {
    navigation.navigate(route);
    return true;
  }
  return false;
}

