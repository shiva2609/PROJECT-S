/**
 * Custom hook for fetching user data
 */

import { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../api/authService';
import { AccountType } from '../../types/account';

export interface User {
  uid: string;
  email: string;
  username: string;
  accountType: AccountType;
  verificationStatus: 'pending' | 'verified' | 'rejected' | 'none';
  suspended?: boolean;
  suspendedAt?: any;
  suspendedBy?: string;
  createdAt: any;
}

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data: User[] = [];
        snapshot.forEach((docSnap) => {
          data.push({
            uid: docSnap.id,
            ...docSnap.data(),
          } as User);
        });
        setUsers(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching users:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { users, loading, error };
}

export async function suspendUser(uid: string, adminUid: string): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    suspended: true,
    suspendedAt: new Date(),
    suspendedBy: adminUid,
  });
}

export async function unsuspendUser(uid: string): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    suspended: false,
    suspendedAt: null,
    suspendedBy: null,
  });
}

/**
 * Approve a user - updates verification status and marks as verified
 * Only super admins can approve users
 */
export async function approveUser(uid: string, adminUid: string, newRole?: AccountType): Promise<void> {
  const userRef = doc(db, 'users', uid);
  const updateData: any = {
    verificationStatus: 'verified',
    verified: true,
    verifiedAt: serverTimestamp(),
    reviewedBy: adminUid,
    reviewedAt: serverTimestamp(),
    updatedAt: Date.now(),
  };

  // If a new role is provided, update accountType
  if (newRole) {
    updateData.accountType = newRole;
  }

  await updateDoc(userRef, updateData);
}

