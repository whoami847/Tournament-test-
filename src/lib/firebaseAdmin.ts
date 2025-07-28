import admin from 'firebase-admin';

// IMPORTANT: Replace this with your actual service account key JSON content
const serviceAccount = {
  // "type": "service_account",
  // "project_id": "...",
  // "private_key_id": "...",
  // "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  // "client_email": "...",
  // "client_id": "...",
  // "auth_uri": "...",
  // "token_uri": "...",
  // "auth_provider_x509_cert_url": "...",
  // "client_x509_cert_url": "..."
};


// Check if the service account has been configured.
// @ts-ignore
if (!serviceAccount.project_id) {
    console.warn(
      'Firebase Admin SDK not initialized. Please configure your service account key in src/lib/firebaseAdmin.ts'
    );
}


if (!admin.apps.length) {
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
