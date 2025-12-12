import { useCallback } from 'react';
import { useAuth } from '../providers/AuthProvider';
import * as UsersAPI from '../services/users/usersService';
import { uploadMedia } from '../utils/uploadMedia';
import { validateUsername } from '../utils/validateUsername';

export interface ProfileUpdateData {
  name?: string;
  username?: string;
  bio?: string;
  photo?: string;
}

interface UseProfileManagerReturn {
  updateProfile: (data: ProfileUpdateData) => Promise<{ success: boolean; message: string }>;
  changeProfilePhoto: (localUri: string) => Promise<{ success: boolean; message: string; photoUrl?: string }>;
  validateUsername: (username: string) => Promise<{ valid: boolean; message: string }>;
}

/**
 * Global hook for managing user profile updates
 * Handles profile field updates, photo uploads, and username validation
 */
export function useProfileManager(): UseProfileManagerReturn {
  const { user } = useAuth();

  const updateProfile = useCallback(async (data: ProfileUpdateData): Promise<{ success: boolean; message: string }> => {
    if (!user?.uid) {
      return { success: false, message: 'User not authenticated' };
    }

    try {
      await UsersAPI.updateProfile(user.uid, data);
      return { success: true, message: 'Profile updated successfully' };
    } catch (error: any) {
      const message = error.message || 'Failed to update profile. Please try again.';
      return { success: false, message };
    }
  }, [user?.uid]);

  const changeProfilePhoto = useCallback(async (localUri: string): Promise<{ success: boolean; message: string; photoUrl?: string }> => {
    if (!user?.uid) {
      return { success: false, message: 'User not authenticated' };
    }

    try {
      // Upload profile photo using uploadMedia utility
      const uploadedFile = await uploadMedia({
        uri: localUri,
        type: 'image',
      });

      if (!uploadedFile?.uri) {
        return { success: false, message: 'Failed to upload photo' };
      }

      // Update profile with new photo URL
      await UsersAPI.updateProfile(user.uid, {
        photo: uploadedFile.uri,
      });

      return {
        success: true,
        message: 'Profile photo updated successfully',
        photoUrl: uploadedFile.uri,
      };
    } catch (error: any) {
      const message = error.message || 'Failed to update profile photo. Please try again.';
      return { success: false, message };
    }
  }, [user?.uid]);

  const validateUsernameField = useCallback(async (username: string): Promise<{ valid: boolean; message: string }> => {
    // First, validate format
    const formatValidation = validateUsername(username);
    if (!formatValidation.valid) {
      return formatValidation;
    }

    // Then, check uniqueness via API
    try {
      const isAvailable = await UsersAPI.checkUsername(username);
      if (!isAvailable) {
        return {
          valid: false,
          message: 'This username is already taken',
        };
      }

      return {
        valid: true,
        message: 'Username is available',
      };
    } catch (error: any) {
      return {
        valid: false,
        message: error.message || 'Failed to check username availability',
      };
    }
  }, []);

  return {
    updateProfile,
    changeProfilePhoto,
    validateUsername: validateUsernameField,
  };
}

