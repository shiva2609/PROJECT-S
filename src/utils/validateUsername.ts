/**
 * Username validation utility
 * Validates format: no spaces, only letters/numbers/underscores
 */

export interface UsernameValidationResult {
  valid: boolean;
  message: string;
}

const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 30;
const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;

/**
 * Validate username format
 * Rules:
 * - No spaces
 * - Only letters, numbers, and underscores
 * - 3-30 characters
 */
export function validateUsername(username: string): UsernameValidationResult {
  if (!username || username.trim().length === 0) {
    return {
      valid: false,
      message: 'Username is required',
    };
  }

  const trimmed = username.trim();

  if (trimmed.length < USERNAME_MIN_LENGTH) {
    return {
      valid: false,
      message: `Username must be at least ${USERNAME_MIN_LENGTH} characters`,
    };
  }

  if (trimmed.length > USERNAME_MAX_LENGTH) {
    return {
      valid: false,
      message: `Username must be no more than ${USERNAME_MAX_LENGTH} characters`,
    };
  }

  if (trimmed.includes(' ')) {
    return {
      valid: false,
      message: 'Username cannot contain spaces',
    };
  }

  if (!USERNAME_REGEX.test(trimmed)) {
    return {
      valid: false,
      message: 'Username can only contain letters, numbers, and underscores',
    };
  }

  return {
    valid: true,
    message: 'Username is valid',
  };
}

