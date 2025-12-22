/**
 * AppError.ts
 * 
 * Standardized error handling for the application.
 * Normalizes errors from Firebase, Network, etc. into a consistent format.
 */

export enum ErrorType {
    NETWORK = 'NETWORK',
    TIMEOUT = 'TIMEOUT',
    PERMISSION = 'PERMISSION',
    VALIDATION = 'VALIDATION',
    SERVER = 'SERVER',
    AUTH = 'AUTH',          // Authentication failed (login error)
    SESSION = 'SESSION',    // Session expired or invalid
    UNKNOWN = 'UNKNOWN',
}

export interface AppErrorConfig {
    code?: string;
    recoverable?: boolean;
    originalError?: any;
    action?: 'LOGIN' | 'RETRY' | 'NONE' | 'SETTINGS'; // Actionable suggestion
    title?: string;
}

export class AppError extends Error {
    public type: ErrorType;
    public code: string;
    public title: string; // 🆕 Added Title
    public recoverable: boolean;
    public originalError: any;
    public action?: 'LOGIN' | 'RETRY' | 'NONE' | 'SETTINGS'; // Added SETTINGS

    constructor(message: string, type: ErrorType, config?: AppErrorConfig & { title?: string }) {
        super(message);
        this.name = 'AppError';
        this.type = type;
        this.code = config?.code || 'UNKNOWN';
        this.title = config?.title || 'Error';
        this.recoverable = config?.recoverable ?? true;
        this.originalError = config?.originalError;
        this.action = config?.action as any;
    }

    static fromError(error: any): AppError {
        if (error instanceof AppError) return error;

        const code = error?.code || '';
        const message = error?.message || '';

        // Handle Network Errors (Firebase)
        if (code === 'auth/network-request-failed' || message.includes('network')) {
            return new AppError('No internet connection. Please check your network.', ErrorType.NETWORK, {
                title: 'Connection Failed',
                code: 'NETWORK_ERROR',
                recoverable: true,
                originalError: error,
                action: 'RETRY',
            });
        }

        // Handle Timeouts
        if (code === 'deadline-exceeded' || message.includes('timeout')) {
            return new AppError('The operation took too long. Please try again.', ErrorType.TIMEOUT, {
                title: 'Request Timed Out',
                code: 'TIMEOUT',
                recoverable: true,
                originalError: error,
                action: 'RETRY',
            });
        }

        // Handle Session/Auth Errors
        if (code === 'auth/id-token-expired' || code === 'auth/user-token-expired') {
            return new AppError('Your session has expired. Please sign in again.', ErrorType.SESSION, {
                title: 'Session Expired',
                code: 'SESSION_EXPIRED',
                recoverable: false,
                originalError: error,
                action: 'LOGIN',
            });
        }

        if (code === 'auth/user-disabled' || code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
            return new AppError('We could not verify your identity. Please sign in again.', ErrorType.AUTH, {
                title: 'Authentication Failed',
                code: 'AUTH_INVALID',
                recoverable: false,
                originalError: error,
                action: 'LOGIN',
            });
        }

        // Handle Permissions (Firebase)
        if (code === 'permission-denied' || message.includes('permission')) {
            return new AppError('You do not have permission to access this resource.', ErrorType.PERMISSION, {
                title: 'Access Denied',
                code: 'PERMISSION_DENIED',
                recoverable: false,
                originalError: error,
                action: 'NONE', // Or SETTINGS if we infer it's system permission? Usually Firebase perm is NONE.
            });
        }

        // Handle Storage/Camera Permissions (Native)
        if (message.includes('camera') || message.includes('storage') || message.includes('photo')) {
            return new AppError('We need access to your camera/photos to continue.', ErrorType.PERMISSION, {
                title: 'Permission Required',
                code: 'SYSTEM_PERMISSION',
                recoverable: true,
                originalError: error,
                action: 'SETTINGS',
            });
        }

        // Default
        return new AppError(
            message || 'An unexpected error occurred.',
            ErrorType.UNKNOWN,
            {
                title: 'Something went wrong',
                originalError: error,
                action: 'NONE'
            }
        );
    }
}

/**
 * Utility to run a promise with a timeout
 */
export function withTimeout<T>(promise: Promise<T>, ms: number = 15000, errorMessage = 'Operation timed out'): Promise<T> {
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            reject(new AppError(errorMessage, ErrorType.TIMEOUT, { code: 'TIMEOUT' }));
        }, ms);

        promise
            .then((res) => {
                clearTimeout(timeoutId);
                resolve(res);
            })
            .catch((err) => {
                clearTimeout(timeoutId);
                reject(AppError.fromError(err));
            });
    });
}
