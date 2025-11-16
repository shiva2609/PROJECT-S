/**
 * useRewardOnboarding Hook Tests
 * 
 * Test outline for the useRewardOnboarding hook using Jest
 * and @testing-library/react-hooks (or React Testing Library)
 * 
 * Run tests with: npm test -- useRewardOnboarding.test.ts
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useRewardOnboarding } from '../hooks/useRewardOnboarding';
import { doc, getDoc, runTransaction } from 'firebase/firestore';
import { db } from '../api/authService';

// Mock Firebase Firestore
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  runTransaction: jest.fn(),
}));

jest.mock('../api/authService', () => ({
  db: {},
}));

describe('useRewardOnboarding', () => {
  const mockUserId = 'test-user-123';
  const mockUserDocRef = { id: mockUserId };
  const mockGetDoc = getDoc as jest.MockedFunction<typeof getDoc>;
  const mockRunTransaction = runTransaction as jest.MockedFunction<typeof runTransaction>;
  const mockDoc = doc as jest.MockedFunction<typeof doc>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDoc.mockReturnValue(mockUserDocRef as any);
  });

  describe('Initial State', () => {
    it('should return initial state when userId is null', () => {
      const { result } = renderHook(() => useRewardOnboarding(null));
      
      expect(result.current.visible).toBe(false);
      expect(result.current.claimed).toBe(false);
      expect(result.current.points).toBe(0);
      expect(result.current.loading).toBe(true);
    });

    it('should start loading when userId is provided', () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          explorerPoints: 0,
          rewardClaimed: false,
        }),
      } as any);

      const { result } = renderHook(() => useRewardOnboarding(mockUserId));
      
      expect(result.current.loading).toBe(true);
    });
  });

  describe('Reward Status Check', () => {
    it('should show card when reward is not claimed', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          explorerPoints: 0,
          rewardClaimed: false,
        }),
      } as any);

      const { result } = renderHook(() => useRewardOnboarding(mockUserId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.visible).toBe(true);
      expect(result.current.claimed).toBe(false);
      expect(result.current.points).toBe(0);
    });

    it('should hide card when reward is already claimed', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          explorerPoints: 150,
          rewardClaimed: true,
        }),
      } as any);

      const { result } = renderHook(() => useRewardOnboarding(mockUserId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.visible).toBe(false);
      expect(result.current.claimed).toBe(true);
      expect(result.current.points).toBe(150);
    });

    it('should handle missing user document gracefully', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false,
        data: () => null,
      } as any);

      const { result } = renderHook(() => useRewardOnboarding(mockUserId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.visible).toBe(false);
    });

    it('should initialize points to 0 if not present in document', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          rewardClaimed: false,
          // explorerPoints is missing
        }),
      } as any);

      const { result } = renderHook(() => useRewardOnboarding(mockUserId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.points).toBe(0);
    });
  });

  describe('Grant Reward', () => {
    it('should grant reward using transaction', async () => {
      // Setup: User hasn't claimed reward
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          explorerPoints: 0,
          rewardClaimed: false,
        }),
      } as any);

      // Mock transaction
      mockRunTransaction.mockImplementation(async (dbInstance, updateFunction) => {
        const mockTransaction = {
          get: jest.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({
              explorerPoints: 0,
              rewardClaimed: false,
            }),
          }),
          update: jest.fn(),
        };
        await updateFunction(mockTransaction as any);
      });

      const { result } = renderHook(() => useRewardOnboarding(mockUserId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Grant reward
      await result.current.grantReward();

      expect(mockRunTransaction).toHaveBeenCalled();
      expect(result.current.claimed).toBe(true);
      expect(result.current.points).toBe(150);
      expect(result.current.visible).toBe(false);
    });

    it('should not grant reward if already claimed', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          explorerPoints: 150,
          rewardClaimed: true,
        }),
      } as any);

      const { result } = renderHook(() => useRewardOnboarding(mockUserId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Try to grant (should be skipped)
      await result.current.grantReward();

      expect(mockRunTransaction).not.toHaveBeenCalled();
    });

    it('should handle transaction errors gracefully', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          explorerPoints: 0,
          rewardClaimed: false,
        }),
      } as any);

      mockRunTransaction.mockRejectedValue(new Error('Transaction failed'));

      const { result } = renderHook(() => useRewardOnboarding(mockUserId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Grant reward (should fail)
      await result.current.grantReward();

      expect(result.current.error).toBeTruthy();
    });

    it('should prevent double-claiming in transaction', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          explorerPoints: 0,
          rewardClaimed: false,
        }),
      } as any);

      // Simulate race condition: reward was claimed between check and transaction
      mockRunTransaction.mockImplementation(async (dbInstance, updateFunction) => {
        const mockTransaction = {
          get: jest.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({
              explorerPoints: 150,
              rewardClaimed: true, // Already claimed!
            }),
          }),
          update: jest.fn(),
        };
        await updateFunction(mockTransaction as any);
      });

      const { result } = renderHook(() => useRewardOnboarding(mockUserId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.grantReward();

      // Transaction should detect already-claimed status and skip update
      expect(result.current.claimed).toBe(true);
    });
  });

  describe('Dismiss', () => {
    it('should hide card when dismissed', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          explorerPoints: 0,
          rewardClaimed: false,
        }),
      } as any);

      const { result } = renderHook(() => useRewardOnboarding(mockUserId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.visible).toBe(true);
      
      result.current.dismiss();
      
      expect(result.current.visible).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined userId', () => {
      const { result } = renderHook(() => useRewardOnboarding(undefined));
      expect(result.current.loading).toBe(true);
    });

    it('should handle Firestore errors', async () => {
      mockGetDoc.mockRejectedValue(new Error('Firestore error'));

      const { result } = renderHook(() => useRewardOnboarding(mockUserId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
    });
  });
});

