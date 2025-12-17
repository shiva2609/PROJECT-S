import { useAuth } from '../providers/AuthProvider';

export function useAuthReady() {
    const { user, authReady } = useAuth();
    return { ready: authReady, user };
}
