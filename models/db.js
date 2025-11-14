import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, 'pws4f2-firebase-adminsdk-fbsvc-e72fa5148a.json'))
);

// Initialize Firebase Admin
initializeApp({
  credential: cert(serviceAccount)
});

// Get Firestore instance
const db = getFirestore();

export { db };
