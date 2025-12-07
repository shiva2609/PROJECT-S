/**
 * ProfileImage Component
 * 
 * Unified profile image component with offline fallback and error handling.
 * Automatically falls back to default image if CDN fails or device is offline.
 * 
 * Usage:
 *   <ProfileImage userId={userId} style={styles.circular} />
 *   <ProfileImage userId={userId} style={styles.rectangular} shape="rectangle" />
 */

import React, { useState } from 'react';
import { Image, ImageStyle, StyleSheet, View, Text } from 'react-native';
import { useProfilePhoto } from '../hooks/useProfilePhoto';
import { getDefaultProfilePhoto } from '../services/userProfilePhotoService';
import { Colors } from '../theme/colors';

interface ProfileImageProps {
  userId: string | null | undefined;
  style?: ImageStyle | ImageStyle[];
  shape?: 'circle' | 'rectangle';
  size?: number;
  defaultSource?: any;
  onError?: () => void;
}

export default function ProfileImage({
  userId,
  style,
  shape = 'circle',
  size,
  defaultSource,
  onError,
}: ProfileImageProps) {
  const profileUri = useProfilePhoto(userId, { shape });
  const defaultProfilePhoto = getDefaultProfilePhoto();
  const [imageError, setImageError] = useState(false);
  const [currentUri, setCurrentUri] = useState(profileUri);

  // Update URI when profileUri changes (but keep error state if it was set)
  React.useEffect(() => {
    if (profileUri && !imageError) {
      setCurrentUri(profileUri);
    }
  }, [profileUri, imageError]);

  const handleError = () => {
    // CDN failure or offline - use default image
    setImageError(true);
    setCurrentUri(defaultProfilePhoto);
    if (onError) {
      onError();
    }
  };

  // Determine final URI (use default if error occurred)
  const finalUri = imageError ? defaultProfilePhoto : currentUri;

  // Apply circular or rectangular styling
  const imageStyle: ImageStyle = size
    ? { width: size, height: size, borderRadius: shape === 'circle' ? size / 2 : 0 }
    : {};

  return (
    <Image
      source={{ uri: finalUri }}
      defaultSource={defaultSource || { uri: defaultProfilePhoto }}
      onError={handleError}
      style={[imageStyle, style]}
      resizeMode="cover"
    />
  );
}

