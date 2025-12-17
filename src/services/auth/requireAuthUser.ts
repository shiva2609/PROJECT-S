import auth from '@react-native-firebase/auth';

/**
 * Mandatory auth gate for all upload operations.
 * Guarantees a valid, token-refreshed user or throws.
 * 
 * CRITICAL: This is the ONLY auth check needed before uploads.
 * Do NOT add additional auth checks elsewhere.
 */
export async function requireAuthUser() {
    const currentUser = auth().currentUser;

    if (currentUser) {
        // FORCE token refresh – critical for real devices
        await currentUser.getIdToken(true);
        return currentUser;
    }

    // Wait for auth state to hydrate
    return new Promise((resolve, reject) => {
        const unsubscribe = auth().onAuthStateChanged(async user => {
            if (user) {
                unsubscribe();
                await user.getIdToken(true);
                resolve(user);
            }
        });

        // 4 second timeout for auth hydration
        setTimeout(() => {
            unsubscribe();
            reject(new Error('AUTH_NOT_READY'));
        }, 4000);
    });
}
