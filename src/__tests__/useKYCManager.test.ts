/**
 * Unit tests for useKYCManager hook
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { useKYCManager } from '../hooks/useKYCManager';
import { getRequiredStepsForRole } from '../config/rolesMetadata';
import { AccountType } from '../types/account';

// Mock Firebase
jest.mock('../api/authService', () => ({
  db: {},
  storage: {},
}));

describe('useKYCManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getRequiredStepsForRole', () => {
    it('should return empty steps for Traveler', () => {
      const steps = getRequiredStepsForRole('Traveler');
      expect(steps).toEqual([]);
    });

    it('should return steps for Host', () => {
      const steps = getRequiredStepsForRole('Host');
      expect(steps.length).toBeGreaterThan(0);
      expect(steps[0].key).toBe('kyc');
    });

    it('should return steps for Agency', () => {
      const steps = getRequiredStepsForRole('Agency');
      expect(steps.length).toBeGreaterThan(0);
      // Agency should have multiple steps
      expect(steps.length).toBeGreaterThan(2);
    });
  });

  describe('requiresVerification', () => {
    it('should return false for Traveler', () => {
      // This would be tested via the hook
      // For now, we test the logic directly
      const { requiresVerification } = require('../hooks/useKYCManager');
      expect(requiresVerification('Traveler')).toBe(false);
    });

    it('should return true for Host', () => {
      const { requiresVerification } = require('../hooks/useKYCManager');
      expect(requiresVerification('Host')).toBe(true);
    });
  });
});

describe('Validation', () => {
  describe('validateField', () => {
    const { validateField } = require('../config/rolesMetadata');

    it('should validate required field', () => {
      const field = {
        key: 'fullName',
        label: 'Full Name',
        type: 'text' as const,
        required: true,
      };

      const result1 = validateField('', field);
      expect(result1.isValid).toBe(false);

      const result2 = validateField('John Doe', field);
      expect(result2.isValid).toBe(true);
    });

    it('should validate PAN format', () => {
      const field = {
        key: 'panNumber',
        label: 'PAN Number',
        type: 'pan' as const,
        required: true,
        validation: {
          pattern: '^[A-Z]{5}[0-9]{4}[A-Z]{1}$',
          message: 'Invalid PAN format',
        },
      };

      const result1 = validateField('ABCDE1234F', field);
      expect(result1.isValid).toBe(true);

      const result2 = validateField('INVALID', field);
      expect(result2.isValid).toBe(false);
    });

    it('should validate email format', () => {
      const field = {
        key: 'email',
        label: 'Email',
        type: 'email' as const,
        required: true,
      };

      const result1 = validateField('test@example.com', field);
      expect(result1.isValid).toBe(true);

      const result2 = validateField('invalid-email', field);
      expect(result2.isValid).toBe(false);
    });
  });
});

