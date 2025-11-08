/**
 * Custom hook for fetching trip data
 */

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../api/authService';

export interface Trip {
  id: string;
  hostId: string;
  title: string;
  status: 'pending' | 'approved' | 'denied' | 'active' | 'completed';
  destination?: string;
  startDate?: any;
  endDate?: any;
  price?: number;
  images?: string[];
  createdAt: any;
  reviewedAt?: any;
  reviewedBy?: string;
  deniedReason?: string;
}

export function useTrips(status?: 'pending' | 'approved' | 'denied') {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let q = query(collection(db, 'trips'), orderBy('createdAt', 'desc'));
    
    if (status) {
      q = query(
        collection(db, 'trips'),
        where('status', '==', status),
        orderBy('createdAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data: Trip[] = [];
        snapshot.forEach((doc) => {
          data.push({
            id: doc.id,
            ...doc.data(),
          } as Trip);
        });
        setTrips(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching trips:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [status]);

  return { trips, loading, error };
}

