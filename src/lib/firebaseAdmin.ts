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

// Create a mock db object to prevent build errors
export const db = {
  collection: () => ({
    doc: () => ({
      get: () => Promise.resolve({ exists: false }),
      set: () => Promise.resolve(),
      update: () => Promise.resolve()
    }),
    add: () => Promise.resolve()
  }),
  runTransaction: () => Promise.resolve()
};

export default null;
