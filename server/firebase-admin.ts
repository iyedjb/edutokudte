import admin from "firebase-admin";

// Initialize Firebase Admin SDK
// In production, you would use a service account JSON file
// For development, we'll use the database URL directly
if (!admin.apps || admin.apps.length === 0) {
  admin.initializeApp({
    databaseURL: "https://edufy-vurodev-default-rtdb.firebaseio.com",
    // Note: For production, add service account credentials
    // credential: admin.credential.cert(serviceAccount)
  });
}

// Primary database (resets monthly)
export const database = admin.database;

// Permanent database for users, teachers, grades (educfy2 - never resets)
export function profileNotasDatabase() {
  return admin.app().database("https://educfy2-default-rtdb.firebaseio.com");
}

export { admin };
