/**
 * STANDARDIZED EMPTY STATE COMPONENT
 * 
 * Provides consistent empty states across the app
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';

export interface EmptyStateProps {
    /** Icon name from Ionicons */
    icon: string;

    /** Title text */
    title: string;

    /** Subtitle/description text */
    subtitle?: string;

    /** Action button text (optional) */
    actionText?: string;

    /** Action button callback */
    onAction?: () => void;

    /** Icon size (default: 64) */
    iconSize?: number;

    /** Icon color (default: gray) */
    iconColor?: string;
}

export function EmptyState({
    icon,
    title,
    subtitle,
    actionText,
    onAction,
    iconSize = 64,
    iconColor = Colors.black.qua,
}: EmptyStateProps) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(6)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
            }),
        ]).start();
    }, [fadeAnim, slideAnim]);

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }]
                }
            ]}
        >
            <Icon name={icon} size={iconSize} color={iconColor} />

            <Text style={styles.title}>{title}</Text>

            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

            {actionText && onAction && (
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={onAction}
                    activeOpacity={0.7}
                >
                    <Text style={styles.actionText}>{actionText}</Text>
                </TouchableOpacity>
            )}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        paddingVertical: 60,
    },
    title: {
        fontSize: 18,
        fontFamily: Fonts.semibold,
        color: Colors.black.primary,
        marginTop: 24,
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        fontFamily: Fonts.regular,
        color: Colors.black.qua,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    actionButton: {
        backgroundColor: Colors.brand.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        marginTop: 8,
        minWidth: 120,
        alignItems: 'center',
    },
    actionText: {
        fontSize: 16,
        fontFamily: Fonts.semibold,
        color: Colors.white.primary,
    },
});
