/**
 * ============================================================
 * firebase/config.js — Firebase Initialization
 * ============================================================
 *
 * Initializes the Firebase app, Auth, Firestore, and Storage.
 * All Firebase config values come from .env.local (VITE_ prefix).
 *
 * Import individual services from here:
 *   import { auth, db, storage } from '../firebase/config'
 */

import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

// ── Firebase project config ─────────────────────────────────
// These values come from your .env.local file.
// Never commit actual credentials to git.
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
}

// ── Initialize app ──────────────────────────────────────────
const app = initializeApp(firebaseConfig)

// ── Export service instances ────────────────────────────────
export const auth    = getAuth(app)
export const db      = getFirestore(app)
export const storage = getStorage(app)

export default app
