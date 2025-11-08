/**
 * Custom hook for fetching verification data
 */

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../api/authService';

export interface Verification {
  id: string;
  uid: string;
  type: 'host' | 'agency' | 'stay-host' | 'ride-partner' | 'adventure-pro' | 'creator';
  status: 'pending' | 'approved' | 'denied';
  documents?: any;
  scheduledDate?: any;
  assignedAdmin?: string;
  notes?: string;
  deniedReason?: string;
  createdAt: any;
  reviewedAt?: any;
  reviewedBy?: string;
}

export function useVerifications(status?: 'pending' | 'approved' | 'denied') {
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let q = query(collection(db, 'verifications'), orderBy('createdAt', 'desc'));
    
    if (status) {
      q = query(
        collection(db, 'verifications'),
        where('status', '==', status),
        orderBy('createdAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data: Verification[] = [];
        snapshot.forEach((doc) => {
          data.push({
            id: doc.id,
            ...doc.data(),
          } as Verification);
        });
        setVerifications(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching verifications:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [status]);

  return { verifications, loading, error };
}

export function useVerificationStats() {
  const [stats, setStats] = useState({
    approved: 0,
    denied: 0,
    pending: 0,
    upcoming: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribes: Array<() => void> = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Real-time snapshots for each stat
    const collections = [
      { 
        key: 'approved', 
        q: query(collection(db, 'verifications'), where('status', '==', 'approved')) 
      },
      { 
        key: 'denied', 
        q: query(collection(db, 'verifications'), where('status', '==', 'denied')) 
      },
      { 
        key: 'pending', 
        q: query(collection(db, 'verifications'), where('status', '==', 'pending')) 
      },
      { 
        key: 'upcoming', 
        q: query(collection(db, 'verifications'), where('scheduledDate', '>=', today)) 
      },
    ];

    collections.forEach(({ key, q }) => {
      const unsub = onSnapshot(
        q,
        (snapshot) => {
          setStats((prev) => ({
            ...prev,
            [key]: snapshot.size,
          }));
          setLoading(false);
        },
        (err) => {
          console.error(`Error fetching ${key} stats:`, err);
          setLoading(false);
        }
      );
      unsubscribes.push(unsub);
    });

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, []);

  return { stats, loading };
}

