
import { db } from '../../../core/firebase';
import functions from '@react-native-firebase/functions';
import { TravelerCard } from '../../../types/firestore';

const COLLECTION = 'traveller_cards';

export const getTravelerCard = async (userId: string): Promise<TravelerCard | null> => {
    try {
        const doc = await db.collection(COLLECTION).doc(userId).get();
        if (doc.exists) {
            return doc.data() as TravelerCard;
        }
        return null;
    } catch (error) {
        console.error('Error fetching traveler card:', error);
        return null;
    }
};

export const ensureTravelerCardExists = async (userId: string): Promise<void> => {
    try {
        const createFn = functions().httpsCallable('createTravelerCardIfMissing');
        await createFn();
        console.log('[TravelerService] Ensure card check completed.');
    } catch (error: any) {
        // If the function is not found, fallback to silent error
        console.warn('[TravelerService] Error calling createTravelerCardIfMissing:', error);
    }
};
