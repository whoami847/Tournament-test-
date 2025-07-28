import admin from 'firebase-admin';

// Use environment variables for Firebase Admin SDK configuration
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID || "aff-tour-1-0",
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || "ded34c8d34abbbbd29e23d93d6b2c7676e7c7794",
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || 
    "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCmPslnXdVorgNn\nTXiB0peWLTD7PBVY8V7NNVDOkDcI5OiWVcPa7/CxBsB0bNWsnQ0HL85x4W/mWNT1\n2eR+J5hn1wseHiUQtuSVBmh8Z9JXek5hrZ3uT9vZbfLhwG9LPB/XjGd/PtyJ0NYT\nHJrBqtAaPg3YbWAUnu1y4etdfN7dOA46V9ZY/5veMEexZKiaABM9X1iRY4HdrbhZ\nGh7sQFKlagDFzWXndBAEvqDoqoKP0INXfqlVWYIanMNTbxOWILcEkFnkgDnw31SY\n1BGvsOtFTPlva6jn9uLLpqoczUCuQNIDXl/gFKi/ASY22ZQ4iPeOzgYmHneaUdbp\nSK5k9vjbAgMBAAECggEADDcCIWAu9Vlj0qFJ63AHx0xcFE7z2pcm5LkNeOqhFebh\nLWVGgL2vLQgBTWH5yTcOOqrz5kDZh06bnHzStxo9rn40c5VkxSJLD/q/4/QqQQHc\nOdJsj5K6j/KY1/wwW+d3siS/g1qhEFc8g3xPOqT2/sFJzyR/h28DT1+eJZOujwkY\nNWb4X1rNMt9JZFQA4zNkDCu0ETxdvADGPBpPuyR/HnvpW8KF3rKKbQJhAwMl58u3\nfs6/ogURx9Vm9bea7aeR/Z4ojP42uBq55LrOQzi2ZJsRLjrZe+DevdYXPfniM3vB\nEWqoMspGgrqL8rBrtS3PF/+90ChtEF8ZCuBau+fm4QKBgQDliN/chQII8fmbQQkM\nBkjSCBxHOqQ+IOIJ2eMQwcwyqQ3scazZJHJ+0jjhtbbLlE1t9Gve+A5GeSaBm5Ls\nP14gX1cSLq/U6DzwGB6YMz0fr4yI0lRH/sAU5J7XaooXNcvE9OwA0EMGJm4KEb0y\nbtc9F7x5+3Ncx47uoeyl/E8SWQKBgQC5ac/9vrK5yOwx+H0TUNJELE7tokmCTxwo\nlagN6UxqZeM6uuqOL3kpKZ58CGCUjaAc8ZwJBWUdz6a8Ls9THTXvymUT8EnoAv45\nSsOQNAb46qEex3qPuiC56S8JKutKgEHFphVtMn3i+g5Fgug5pynmGtawEzpwhBId\n3nJh2fd2UwKBgHIw8g3nLef9WcxfQnz0821qE4dsKSGvgkScXVaM02WwrPigZPly\nJHPradkAafxFv2+gVboLdi6hPwLjvuhBbjZ0uACXsWoeT5KyrSXS9+m3kBbRbJSU\rEK4qj1JB4IchU9q+a497do1bDEeOh3I/tOp515YNkBGF1movO6m4z+hAoGAdj5v\n4Y/zJR5o2zlwcpgRcF6de1kK7iqLd6pxgWWuURBnSHYZzdGiwEiFhO5GwZZMbQj8\njJg/MzLRT6O+nm+7jRATRBLy3x7BiEIQ0+8KH0ZquFlY5T47TrTSRVN0uI9w4p6X\nfYs80zrLTTM97D6aLuAg2Ct7EnR3pUrOwW6jLXcCgYEAmpBTzmyBpVUdNKGtqN9c\nDH1PvOJKr1ldFPKKT+gnPP3cXozV7b24fR4ojvMg6HNbTON07lyVv1mer/kl7aN0\nzI+MuQTdmcsiPMFKrZ+09e8WSkur41vw/ZCmZUZtk+Xcg30AV2a+At7XcowhKDH+\nxnGPImcAkgjWUMbZRcGjQPo=\n-----END PRIVATE KEY-----\n",
  client_email: process.env.FIREBASE_CLIENT_EMAIL || "firebase-adminsdk-fbsvc@aff-tour-1-0.iam.gserviceaccount.com",
  client_id: process.env.FIREBASE_CLIENT_ID || "100951730782338138156",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL || "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40aff-tour-1-0.iam.gserviceaccount.com",
  universe_domain: "googleapis.com"
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
