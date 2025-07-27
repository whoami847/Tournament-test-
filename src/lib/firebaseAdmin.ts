
import admin from 'firebase-admin';

let serviceAccount: any;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch (error) {
    console.error('Error parsing FIREBASE_SERVICE_ACCOUNT:', error);
  }
} else {
  console.warn(
    'FIREBASE_SERVICE_ACCOUNT environment variable not found. Firebase Admin SDK not initialized.'
  );
}


// Check if the service account has been configured.
// @ts-ignore
if (!serviceAccount || !serviceAccount.project_id) {
    console.warn(
      'Firebase Admin SDK not initialized. Please configure your service account key in src/lib/firebaseAdmin.ts'
    );
}


if (!admin.apps.length && serviceAccount) {
    try {
        admin.initializeApp({
            // @ts-ignore
            credential: admin.credential.cert(serviceAccount),
        });
    } catch (error: any) {
        console.error('Firebase Admin Initialization Error:', error.message);
    }
}

export const db = admin.firestore();
export default admin;
