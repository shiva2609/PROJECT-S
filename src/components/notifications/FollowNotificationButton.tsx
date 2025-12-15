import React, { useState, useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { useFollowStatus } from '../../global/hooks/useFollowStatus';
import { useAuth } from '../../providers/AuthProvider';

interface FollowNotificationButtonProps {
    targetUserId: string;
}

export default function FollowNotificationButton({ targetUserId }: FollowNotificationButtonProps) {
    const { user } = useAuth();
    const { isFollowing, isFollowedBy, loading, toggleFollow } = useFollowStatus(user?.uid, targetUserId);
    const [localLoading, setLocalLoading] = useState(false);

    const handlePress = async () => {
        setLocalLoading(true);
        try {
            await toggleFollow();
        } catch (error) {
            console.error("Follow action failed", error);
        } finally {
            setLocalLoading(false);
        }
    };

    const isLoading = loading || localLoading;

    // Render logic matches "Instagram Style"
    // If I am following them: "Following" (Gray)
    // If I am NOT following them:
    //    If they follow me: "Follow Back" (Blue)
    //    If they don't follow me (rare in notif context?): "Follow" (Blue)

    if (isFollowing) {
        return (
            <TouchableOpacity
                style={[styles.button, styles.buttonFollowing]}
                onPress={handlePress}
                disabled={isLoading}
            >
                {isLoading ? (
                    <ActivityIndicator size="small" color={Colors.black.secondary} />
                ) : (
                    <Text style={[styles.text, styles.textFollowing]}>Following</Text>
                )}
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity
            style={[styles.button, styles.buttonPrimary]}
            onPress={handlePress}
            disabled={isLoading}
        >
            {isLoading ? (
                <ActivityIndicator size="small" color={Colors.white.primary} />
            ) : (
                <Text style={[styles.text, styles.textPrimary]}>
                    {isFollowedBy ? 'Follow Back' : 'Follow'}
                </Text>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 8,
        minWidth: 90,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonPrimary: {
        backgroundColor: Colors.brand.primary,
    },
    buttonFollowing: {
        backgroundColor: Colors.white.tertiary, // Light gray
        borderWidth: 1,
        borderColor: Colors.white.tertiary,
    },
    text: {
        fontSize: 12,
        fontFamily: Fonts.semibold,
    },
    textPrimary: {
        color: Colors.white.primary,
    },
    textFollowing: {
        color: Colors.black.secondary,
    },
});
