import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, setLogLevel, disableNetwork } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with specific database ID if present
export const db = getFirestore(
  app,
  firebaseConfig.firestoreDatabaseId || undefined
);

// Suppress internal SDK verbose logs when quota limits are reached on free tier
try {
  setLogLevel("silent");
} catch (_) {}

const QUOTA_KEY = "firestore_quota_exceeded_v2";
try {
  if (typeof localStorage !== "undefined" && localStorage.getItem(QUOTA_KEY)) {
    disableNetwork(db).catch(() => {});
  }
} catch (_) {}

export default app;
