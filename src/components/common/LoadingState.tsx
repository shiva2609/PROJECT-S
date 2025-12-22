/**
 * STANDARDIZED LOADING STATE COMPONENT
 * 
 * Provides consistent loading indicators across the app
 */

import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';

export interface LoadingStateProps {
    /** Loading message (optional) */
    message?: string;

    /** Size of the loading indicator */
    size?: 'small' | 'large';

    /** Color of the loading indicator */
    color?: string;

    /** Full screen loading (default: false) */
    fullScreen?: boolean;
}

/**
 * Standard loading state component
 * 
 * Usage:
 * ```tsx
 * <LoadingState message="Loading posts..." />
 * <LoadingState fullScreen />
 * ```
 */
export function LoadingState({
    message,
    size = 'large',
    color = Colors.brand.primary,
    fullScreen = false,
}: LoadingStateProps) {
    return (
        <View style={[styles.container, fullScreen && styles.fullScreen]}>
            <ActivityIndicator size={size} color={color} />
            {message && <Text style={styles.message}>{message}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    fullScreen: {
        flex: 1,
    },
    message: {
        marginTop: 16,
        fontSize: 14,
        fontFamily: Fonts.regular,
        color: Colors.black.secondary,
        textAlign: 'center',
    },
});
