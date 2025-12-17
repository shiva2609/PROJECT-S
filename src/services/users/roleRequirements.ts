import { db } from '../../core/firebase';
import { doc, getDoc } from '../../core/firebase/compat';

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
