/**
 * STANDARD RETRY UI COMPONENT
 * 
 * Provides consistent retry UI across all screens
 * Works identically everywhere
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';

export interface RetryUIProps {
    /** Error to display */
    error: Error | null;

    /** Retry callback */
    onRetry: () => void;

    /** Custom message (optional) */
    message?: string;

    /** Show full error details (default: __DEV__) */
    showDetails?: boolean;
}

/**
 * Standard retry UI component
 * 
 * Usage:
 * ```typescript
 * {hasError && (
 *   <RetryUI
 *     error={error}
 *     onRetry={retry}
 *     message="Failed to load posts"
 *   />
 * )}
 * ```
 */
export function RetryUI({ error, onRetry, message, showDetails = __DEV__ }: RetryUIProps) {
    if (!error) return null;

    const displayMessage = message || getErrorMessage(error);

    return (
        <View style={styles.container}>
            <Icon name="alert-circle-outline" size={48} color={Colors.accent.red} />

            <Text style={styles.title}>Something went wrong</Text>

            <Text style={styles.message}>{displayMessage}</Text>

            {showDetails && error.message && (
                <Text style={styles.details}>{error.message}</Text>
            )}

            <TouchableOpacity
                style={styles.retryButton}
                onPress={onRetry}
                activeOpacity={0.7}
            >
                <Icon name="refresh" size={20} color="#FFFFFF" style={styles.retryIcon} />
                <Text style={styles.retryText}>Tap to retry</Text>
            </TouchableOpacity>
        </View>
    );
}

/**
 * Get user-friendly error message
 */
function getErrorMessage(error: Error): string {
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch')) {
        return 'Network connection failed. Please check your internet connection.';
    }

    if (message.includes('permission') || message.includes('unauthorized')) {
        return 'Permission denied. Please check your account permissions.';
    }

    if (message.includes('timeout')) {
        return 'Request timed out. Please try again.';
    }

    return 'Unable to load data. Please try again.';
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
        backgroundColor: '#FFFFFF',
    },
    title: {
        fontFamily: Fonts.semibold,
        fontSize: 20,
        color: '#1C1C1C',
        marginTop: 16,
        marginBottom: 8,
    },
    message: {
        fontFamily: Fonts.regular,
        fontSize: 16,
        color: '#666666',
        textAlign: 'center',
        marginBottom: 8,
    },
    details: {
        fontFamily: Fonts.regular,
        fontSize: 12,
        color: '#999999',
        textAlign: 'center',
        marginBottom: 16,
        paddingHorizontal: 16,
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.brand.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        marginTop: 16,
    },
    retryIcon: {
        marginRight: 8,
    },
    retryText: {
        fontFamily: Fonts.semibold,
        fontSize: 16,
        color: '#FFFFFF',
    },
});
