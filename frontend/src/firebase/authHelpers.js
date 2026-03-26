/**
 * ============================================================
 * firebase/authHelpers.js — Firebase Auth Operations
 * ============================================================
 *
 * Thin wrappers around Firebase Auth methods.
 * Also calls the backend /api/accounts/init on first sign-in.
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  deleteUser,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { auth } from './config'
import { apiRequest } from '../utils/api'

// ── Sign Up ─────────────────────────────────────────────────
export async function signUp(email, password, displayName) {
  const credential = await createUserWithEmailAndPassword(auth, email, password)
  // Set display name on Firebase Auth profile
  await updateProfile(credential.user, { displayName })
  // Create Firestore document via backend
  await apiRequest('POST', '/api/accounts/init')
  return credential.user
}

// ── Sign In ─────────────────────────────────────────────────
export async function signIn(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email, password)
  // Ensure Firestore doc exists (idempotent)
  await apiRequest('POST', '/api/accounts/init')
  return credential.user
}

// ── Sign Out ────────────────────────────────────────────────
export async function logOut() {
  await signOut(auth)
}

// ── Password Reset ──────────────────────────────────────────
export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email)
}

// ── Delete Account ──────────────────────────────────────────
export async function deleteAccount() {
  await apiRequest('DELETE', '/api/accounts/me')
  // Also delete Firebase Auth user
  if (auth.currentUser) {
    await deleteUser(auth.currentUser)
  }
}

// ── Get ID Token ────────────────────────────────────────────
// Used by apiRequest to attach Authorization header
export async function getIdToken() {
  if (!auth.currentUser) return null
  return auth.currentUser.getIdToken()
}
