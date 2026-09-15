import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, memoryLocalCache } from "firebase/firestore";
import config from "./config.json";
export const firebaseApp = initializeApp(config);
export const auth = getAuth(firebaseApp);
// Health-related drafts are not persisted to the device's disk cache.
export const database = initializeFirestore(firebaseApp, {
  localCache: memoryLocalCache(),
});
