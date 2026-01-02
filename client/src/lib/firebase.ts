// Firebase configuration and initialization - based on firebase_barebones_javascript blueprint
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
import { getMessaging, isSupported } from "firebase/messaging";

// Firebase configuration from environment variables with fallbacks
// Note: Firebase web API keys are public and safe to include in client-side code
// The security is handled by Firebase Security Rules, not by hiding the API key
const primaryProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || "gepo-86dbb";
const primaryStorageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${primaryProjectId}.firebasestorage.app`;

// Primary Firebase instance - for all pages EXCEPT Profile and Notas (grades)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAl4zVbM1w38lINLxSpBxM0ymgvqTH3LMU",
  authDomain: `${primaryProjectId}.firebaseapp.com`,
  databaseURL: `https://${primaryProjectId}-default-rtdb.firebaseio.com`,
  projectId: primaryProjectId,
  storageBucket: primaryStorageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "858231278875",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:858231278875:web:3ab3b12c030fee60cb57be",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-V0JCZK2QVT"
};

// Secondary Firebase instance for Profile and Notas (educfy2)
const secondaryProjectId = import.meta.env.VITE_FIREBASE_SECONDARY_PROJECT_ID || "educfy2";
const secondaryStorageBucket = import.meta.env.VITE_FIREBASE_SECONDARY_STORAGE_BUCKET || `${secondaryProjectId}.firebasestorage.app`;

// Secondary Firebase instance - ONLY for Profile and Notas (grades) logic
// This uses the educfy2 database for permanent storage (grades, user profiles, auth)
const profileNotasConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_SECONDARY_API_KEY || "AIzaSyCikgHhycEV_SRH8Msl38F10EZNSq1lyVg",
  authDomain: `${secondaryProjectId}.firebaseapp.com`,
  databaseURL: `https://${secondaryProjectId}-default-rtdb.firebaseio.com`,
  projectId: secondaryProjectId,
  storageBucket: secondaryStorageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_SECONDARY_MESSAGING_SENDER_ID || "929250730100",
  appId: import.meta.env.VITE_FIREBASE_SECONDARY_APP_ID || "1:929250730100:web:43c3872b268aad9c0eb121",
  measurementId: import.meta.env.VITE_FIREBASE_SECONDARY_MEASUREMENT_ID || "G-83BRNGX5W9"
};

// Initialize primary app (gepo-86dbb) for most of the application
export const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
export const storage = getStorage(app);

// Initialize secondary app for Profile and Notas (educfy2)
// NOTE: Authentication is handled by the educfy2 database
export const profileNotasApp = initializeApp(profileNotasConfig, "profileNotasApp");
export const auth = getAuth(profileNotasApp);
export const profileNotasDatabase = getDatabase(profileNotasApp);

// Initialize messaging (only in browser environment)
let messaging: ReturnType<typeof getMessaging> | null = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      messaging = getMessaging(app);
    }
  });
}
export { messaging };

// Keep efeedDatabase as an alias to the primary database for backward compatibility
// All Efeed pages should use the primary database (gepo-86dbb)
export const efeedDatabase = database;
