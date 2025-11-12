/**
 * RewardPopCard Component Tests
 * 
 * Test outline for the RewardPopCard component using Jest and
 * @testing-library/react-native
 * 
 * Run tests with: npm test -- RewardPopCard.test.tsx
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import RewardPopCard from '../components/RewardPopCard';

// Mock react-native-vector-icons
jest.mock('react-native-vector-icons/Ionicons', () => {
  const { View } = require('react-native');
  return ({ name, size, color }: any) => (
    <View testID={`icon-${name}`} style={{ width: size, height: size }} />
  );
});

describe('RewardPopCard', () => {
  const mockOnClose = jest.fn();
  const mockOnViewWallet = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should not render when visible is false', () => {
      const { queryByText } = render(
        <RewardPopCard visible={false} onClose={mockOnClose} />
      );
      expect(queryByText('150 Explorer Points')).toBeNull();
    });

    it('should render when visible is true', () => {
      const { getByText } = render(
        <RewardPopCard visible={true} onClose={mockOnClose} />
      );
      expect(getByText('150 Explorer Points')).toBeTruthy();
      expect(getByText(/Welcome! 150 Explorer Points added to your wallet/)).toBeTruthy();
    });

    it('should display custom points value', () => {
      const { getByText } = render(
        <RewardPopCard visible={true} onClose={mockOnClose} points={200} />
      );
      expect(getByText('200 Explorer Points')).toBeTruthy();
    });

    it('should render close button', () => {
      const { getByLabelText } = render(
        <RewardPopCard visible={true} onClose={mockOnClose} />
      );
      expect(getByLabelText('Close reward card')).toBeTruthy();
    });

    it('should render View Wallet button', () => {
      const { getByLabelText } = render(
        <RewardPopCard visible={true} onClose={mockOnClose} onViewWallet={mockOnViewWallet} />
      );
      expect(getByLabelText('View wallet')).toBeTruthy();
    });
  });

  describe('Interactions', () => {
    it('should call onClose when close button is pressed', () => {
      const { getByLabelText } = render(
        <RewardPopCard visible={true} onClose={mockOnClose} />
      );
      const closeButton = getByLabelText('Close reward card');
      fireEvent.press(closeButton);
      // Note: Actual close happens after animation, so we may need to wait
      // In a real test, you might want to mock Animated or wait for animation
    });

    it('should call onViewWallet when View Wallet button is pressed', () => {
      const { getByLabelText } = render(
        <RewardPopCard visible={true} onClose={mockOnClose} onViewWallet={mockOnViewWallet} />
      );
      const viewWalletButton = getByLabelText('View wallet');
      fireEvent.press(viewWalletButton);
      // Note: onViewWallet is called after close animation starts
    });

    it('should call onClose when backdrop is pressed', () => {
      const { getByTestId } = render(
        <RewardPopCard visible={true} onClose={mockOnClose} />
      );
      // You may need to adjust testID based on your Modal implementation
      // This is a placeholder - adjust based on actual component structure
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels', () => {
      const { getByLabelText } = render(
        <RewardPopCard visible={true} onClose={mockOnClose} onViewWallet={mockOnViewWallet} />
      );
      expect(getByLabelText('Close reward card')).toBeTruthy();
      expect(getByLabelText('View wallet')).toBeTruthy();
    });

    it('should have accessibility hints', () => {
      const { getByLabelText } = render(
        <RewardPopCard visible={true} onClose={mockOnClose} onViewWallet={mockOnViewWallet} />
      );
      const closeButton = getByLabelText('Close reward card');
      expect(closeButton.props.accessibilityHint).toBe('Dismisses the welcome reward notification');
    });
  });

  describe('Animations', () => {
    it('should initialize animations when visible becomes true', () => {
      const { rerender } = render(
        <RewardPopCard visible={false} onClose={mockOnClose} />
      );
      rerender(<RewardPopCard visible={true} onClose={mockOnClose} />);
      // In a real test, you might want to check animation values
      // This requires mocking Animated API or using a testing library that supports it
    });
  });
});

