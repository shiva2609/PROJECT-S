import auth from '@react-native-firebase/auth';
import { useEffect, useState } from 'react';

export function useAuthReady() {
    const [ready, setReady] = useState(false);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const unsub = auth().onAuthStateChanged(u => {
            if (u) {
                setUser(u);
                setReady(true);
            }
        });
        return unsub;
    }, []);

    return { ready, user };
}
