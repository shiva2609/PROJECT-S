/**
 * Custom hook for fetching reports data
 */

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../api/authService';

export interface Report {
  id: string;
  type: 'user' | 'trip' | 'host';
  reportedUserId?: string;
  reportedTripId?: string;
  reportedHostId?: string;
  reporterId: string;
  reason: string;
  description: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: any;
  resolvedAt?: any;
  resolvedBy?: string;
}

export function useReports(type?: 'user' | 'trip' | 'host') {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
    
    if (type) {
      q = query(
        collection(db, 'reports'),
        where('type', '==', type),
        orderBy('createdAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data: Report[] = [];
        snapshot.forEach((doc) => {
          data.push({
            id: doc.id,
            ...doc.data(),
          } as Report);
        });
        setReports(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching reports:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [type]);

  return { reports, loading, error };
}

