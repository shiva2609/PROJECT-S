// scripts/check_bad_docs.js
/**
 * Read-only scanner. Lists suspicious documents that may cause Firestore internal assertions.
 * Run with Node.js using a service account or ADC (gcloud auth application-default login).
 *
 * Usage:
 *   node scripts/check_bad_docs.js
 */
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}
const db = admin.firestore();

const checks = [
  { collection: 'posts', required: ['createdAt','createdBy'] },
  { collection: 'users', required: ['createdAt'] },
  { collection: 'follows', required: ['followerId','followingId','createdAt'] },
  { collection: 'messages', required: ['threadId','createdAt','participants'] },
  { collection: 'conversations', required: ['participants','updatedAt'] },
  { collection: 'notifications', required: ['userId','timestamp'] },
];

function isTimestamp(val) {
  return val && (typeof val.toDate === 'function' || (val._seconds !== undefined && val._nanoseconds !== undefined));
}

(async function run() {
  console.log('Starting Firestore schema scan...');
  for (const c of checks) {
    console.log(`\nChecking collection: ${c.collection}`);
    // read first 1000 docs for speed; adjust if needed
    const snapshot = await db.collection(c.collection).limit(1000).get();
    const bad = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      for (const field of c.required) {
        if (data[field] === undefined || data[field] === null) {
          bad.push({ id: doc.id, reason: `${field} missing` });
          break;
        }
        if (/(createdAt|updatedAt|timestamp)/i.test(field) && !isTimestamp(data[field])) {
          bad.push({ id: doc.id, reason: `${field} not a Timestamp (type=${typeof data[field]})` });
          break;
        }
      }
    });
    if (bad.length) {
      console.log(`Found ${bad.length} suspicious docs in ${c.collection}. Sample:`, bad.slice(0, 20));
    } else {
      console.log(`No obvious issues found in ${c.collection} (sample ${snapshot.size})`);
    }
  }
  console.log('\nScan complete. Review above results and run fix script for collections that have issues.');
  process.exit(0);
})();


