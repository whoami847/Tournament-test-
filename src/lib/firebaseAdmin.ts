import admin from 'firebase-admin';

// Attempt to initialize Firebase Admin using service account info from environment variables.
// If not available, fall back to default credentials to prevent build-time failures.

if (!admin.apps.length) {
  try {
    // Prefer a JSON string in FIREBASE_SERVICE_ACCOUNT env containing full credentials
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (serviceAccountJson) {
      const serviceAccount = JSON.parse(serviceAccountJson);
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    } else {
      // Fallback – uses Application Default Credentials or emulator creds
      admin.initializeApp();
    }
  } catch (err) {
    // Log the error but continue to prevent blocking the build
    console.warn('Firebase Admin initialization skipped:', (err as Error).message);
  }
}

// Export a Firestore instance if initialization succeeded; otherwise export a dummy object
// that implements the minimal API surface to avoid runtime crashes during static builds.

export const db = admin.apps.length ? admin.firestore() : ({
  collection: () => ({
    doc: () => ({
      get: async () => ({ exists: false }),
      set: async () => undefined,
      update: async () => undefined,
    }),
  }),
  runTransaction: async () => undefined,
} as unknown);

export default admin;
