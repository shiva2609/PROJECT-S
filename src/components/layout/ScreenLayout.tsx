/**
 * STANDARD SCREEN LAYOUT WRAPPER
 * 
 * 🔐 UX INVARIANTS:
 * 1. No content may hide behind the bottom tab bar
 * 2. Safe areas must behave identically across screens
 * 3. Primary actions must always be reachable
 * 4. Scrolling behavior must feel consistent everywhere
 * 
 * This component provides:
 * - Consistent SafeAreaView handling
 * - Tab bar-aware bottom spacing
 * - Platform-specific keyboard avoidance
 * - Standardized background colors
 * - Optional scroll behavior
 */

import React, { ReactNode } from 'react';
import {
    View,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    ViewStyle,
    StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../theme/colors';

export interface ScreenLayoutProps {
    /** Child components to render */
    children: ReactNode;

    /** Enable scrolling (default: false) */
    scrollable?: boolean;

    /** Include bottom safe area inset (default: true for tab screens, false for modals) */
    includeBottomInset?: boolean;

    /** Include top safe area inset (default: true) */
    includeTopInset?: boolean;

    /** Background color (default: white) */
    backgroundColor?: string;

    /** Enable keyboard avoidance (default: true) */
    keyboardAvoiding?: boolean;

    /** Custom content container style */
    contentContainerStyle?: ViewStyle;

    /** Custom scroll view props */
    scrollViewProps?: any;

    /** Show status bar (default: true) */
    showStatusBar?: boolean;

    /** Status bar style */
    statusBarStyle?: 'light-content' | 'dark-content';
}

/**
 * Standard screen layout wrapper
 * 
 * Usage:
 * ```tsx
 * // Tab screen with scroll
 * <ScreenLayout scrollable>
 *   <YourContent />
 * </ScreenLayout>
 * 
 * // Modal screen without bottom inset
 * <ScreenLayout includeBottomInset={false}>
 *   <YourContent />
 * </ScreenLayout>
 * 
 * // Form with keyboard avoidance
 * <ScreenLayout scrollable keyboardAvoiding>
 *   <YourForm />
 * </ScreenLayout>
 * ```
 */
export function ScreenLayout({
    children,
    scrollable = false,
    includeBottomInset = true,
    includeTopInset = true,
    backgroundColor = Colors.white.primary,
    keyboardAvoiding = true,
    contentContainerStyle,
    scrollViewProps,
    showStatusBar = true,
    statusBarStyle = 'dark-content',
}: ScreenLayoutProps) {
    const insets = useSafeAreaInsets();

    // Calculate safe area edges
    const safeAreaEdges: ('top' | 'bottom' | 'left' | 'right')[] = [];
    if (includeTopInset) safeAreaEdges.push('top');
    if (includeBottomInset) safeAreaEdges.push('bottom');
    safeAreaEdges.push('left', 'right');

    // Content wrapper
    const ContentWrapper = scrollable ? ScrollView : View;

    // Keyboard avoiding view wrapper
    const content = (
        <ContentWrapper
            style={[
                scrollable ? styles.scrollView : styles.view,
                { backgroundColor },
                contentContainerStyle,
            ]}
            contentContainerStyle={scrollable ? styles.scrollContentContainer : undefined}
            keyboardShouldPersistTaps={scrollable ? 'handled' : undefined}
            showsVerticalScrollIndicator={scrollable ? true : undefined}
            {...scrollViewProps}
        >
            {children}
        </ContentWrapper>
    );

    return (
        <>
            {showStatusBar && (
                <StatusBar
                    barStyle={statusBarStyle}
                    backgroundColor={backgroundColor}
                />
            )}

            <SafeAreaView
                style={[styles.container, { backgroundColor }]}
                edges={safeAreaEdges}
            >
                {keyboardAvoiding ? (
                    <KeyboardAvoidingView
                        style={styles.keyboardAvoidingView}
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                    >
                        {content}
                    </KeyboardAvoidingView>
                ) : (
                    content
                )}
            </SafeAreaView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    keyboardAvoidingView: {
        flex: 1,
    },
    view: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContentContainer: {
        flexGrow: 1,
    },
});
