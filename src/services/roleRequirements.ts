import { db } from '../api/authService';
import { doc, getDoc } from 'firebase/firestore';

export interface RolesConfigDoc {
  [roleKey: string]: { required: string[] };
}

export async function fetchRolesConfig(): Promise<RolesConfigDoc> {
  try {
    const snap = await getDoc(doc(db, 'roleRequirements', 'config'));
    if (snap.exists()) return snap.data() as RolesConfigDoc;
  } catch (e) {
    // ignore
  }
  return {} as RolesConfigDoc;
}
