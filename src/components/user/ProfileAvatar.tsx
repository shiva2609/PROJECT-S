/**
 * ProfileAvatar Component
 * 
 * Global reusable component for rendering user profile avatars
 * Automatically shows a person icon when no profile image is available
 * 
 * Usage:
 * <ProfileAvatar 
 *   uri={user.photoURL} 
 *   size={40} 
 *   userId={user.uid}
 * />
 */

import React from 'react';
import { View, Image, StyleSheet, ViewStyle, ImageStyle } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../theme/colors';

interface ProfileAvatarProps {
    uri?: string | null;
    size?: number;
    borderColor?: string;
    borderWidth?: number;
    backgroundColor?: string;
    iconColor?: string;
    iconSize?: number;
    userId?: string;
    style?: ViewStyle;
    imageStyle?: ImageStyle;
    showBorder?: boolean;
}

/**
 * Checks if a URI is empty, null, undefined, or a default placeholder
 */
function isEmptyProfilePhoto(uri?: string | null): boolean {
    if (!uri) return true;
    if (uri.trim() === '') return true;

    // Check for common default/placeholder patterns
    const lowerUri = uri.toLowerCase();
    if (lowerUri.includes('default') ||
        lowerUri.includes('placeholder') ||
        lowerUri.includes('avatar-placeholder')) {
        return true;
    }

    return false;
}

export default function ProfileAvatar({
    uri,
    size = 40,
    borderColor = '#FFE3D6',
    borderWidth = 2,
    backgroundColor = '#F5F5F5',
    iconColor = '#8E8E8E',
    iconSize,
    userId,
    style,
    imageStyle,
    showBorder = true,
}: ProfileAvatarProps) {
    const isEmpty = isEmptyProfilePhoto(uri);
    const calculatedIconSize = iconSize || Math.floor(size * 0.5);

    const containerStyle: ViewStyle = {
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        ...(showBorder && {
            borderWidth,
            borderColor,
        }),
    };

    // If no image, show person icon
    if (isEmpty) {
        return (
            <View style={[containerStyle, style]}>
                <Icon name="person" size={calculatedIconSize} color={iconColor} />
            </View>
        );
    }

    // Show image with fallback to person icon on error
    return (
        <View style={[containerStyle, style]}>
            <Image
                source={{ uri: uri! }}
                style={[
                    {
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                    },
                    imageStyle,
                ]}
                resizeMode="cover"
                onError={() => {
                    // Image failed to load - the View will show the background color
                    // You could add state here to show the icon on error if needed
                }}
            />
        </View>
    );
}

/**
 * Compact variant for small avatars (e.g., in lists)
 */
export function ProfileAvatarSmall(props: Omit<ProfileAvatarProps, 'size'>) {
    return <ProfileAvatar {...props} size={32} />;
}

/**
 * Medium variant for standard use cases
 */
export function ProfileAvatarMedium(props: Omit<ProfileAvatarProps, 'size'>) {
    return <ProfileAvatar {...props} size={40} />;
}

/**
 * Large variant for profile screens
 */
export function ProfileAvatarLarge(props: Omit<ProfileAvatarProps, 'size'>) {
    return <ProfileAvatar {...props} size={80} />;
}

/**
 * Extra large variant for detailed profile views
 */
export function ProfileAvatarXL(props: Omit<ProfileAvatarProps, 'size'>) {
    return <ProfileAvatar {...props} size={120} />;
}

const styles = StyleSheet.create({
    // Styles can be added here if needed
});
