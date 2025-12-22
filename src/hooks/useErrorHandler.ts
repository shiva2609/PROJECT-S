import { useCallback, useRef } from 'react';
import { Alert, Linking } from 'react-native';
import { useAuth } from '../providers/AuthProvider';
import { AppError, ErrorType } from '../utils/AppError';

interface ErrorHandlerOptions {
    onRetry?: () => void | Promise<void>;
    onDismiss?: () => void;
    title?: string;
    message?: string;
}

/**
 * useErrorHandler
 * 
 * A canonical hook to display standardized, actionable errors to the user.
 * adherence to Phase 5E requirements.
 */
export function useErrorHandler() {
    const { resetSession } = useAuth();
    const isAlertOpen = useRef(false);

    const handleError = useCallback((error: unknown, options?: ErrorHandlerOptions) => {
        // 1. Flood Control: Prevent stacking alerts
        if (isAlertOpen.current) return;

        // 2. Normalize Error
        const appError = AppError.fromError(error);
        const { type, action } = appError;
        const title = options?.title || appError.title;
        const message = options?.message || appError.message;

        const buttons: any[] = [];

        // 3. Determine Actions based on Error Type & Context

        // SESSION / AUTH -> Blocking "Sign In"
        if (action === 'LOGIN' || type === ErrorType.SESSION || type === ErrorType.AUTH) {
            buttons.push({
                text: 'Sign In',
                onPress: async () => {
                    isAlertOpen.current = false;
                    await resetSession();
                    // Logic relies on AuthProvider clearing user, which triggers RootNavigator switch
                }
            });
        }
        // PERMISSION / SETTINGS -> "Open Settings"
        else if (action === 'SETTINGS' || type === ErrorType.PERMISSION) {
            buttons.push({
                text: 'Cancel',
                style: 'cancel',
                onPress: () => {
                    isAlertOpen.current = false;
                    options?.onDismiss?.();
                }
            });
            buttons.push({
                text: 'Open Settings',
                onPress: () => {
                    isAlertOpen.current = false;
                    Linking.openSettings();
                }
            });
        }
        // RETRY -> "Retry" (Only if callback provided)
        else if (action === 'RETRY' && options?.onRetry) {
            buttons.push({
                text: 'Cancel',
                style: 'cancel',
                onPress: () => {
                    isAlertOpen.current = false;
                    options?.onDismiss?.();
                }
            });
            buttons.push({
                text: 'Retry',
                onPress: () => {
                    isAlertOpen.current = false;
                    // Fire and forget retry, or await?
                    // Using void return mostly, component handles 'loading' state usually
                    options.onRetry?.();
                }
            });
        }
        // DEFAULT -> Just "OK"
        else {
            buttons.push({
                text: 'OK',
                onPress: () => {
                    isAlertOpen.current = false;
                    options?.onDismiss?.();
                }
            });
        }

        // 4. Show Alert
        isAlertOpen.current = true;
        Alert.alert(title, message, buttons, {
            cancelable: false, // Enforce button usage
            onDismiss: () => {
                isAlertOpen.current = false;
                options?.onDismiss?.();
            }
        });

    }, [resetSession]);

    return { handleError };
}
