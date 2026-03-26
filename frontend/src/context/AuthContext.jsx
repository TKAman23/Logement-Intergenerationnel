/**
 * ============================================================
 * context/AuthContext.jsx — Firebase Auth State Provider
 * ============================================================
 *
 * Wraps the app with Firebase auth state.
 * Provides: { user, loading } to any child via useAuth().
 *
 * user is null when signed out, Firebase User object when signed in.
 */

import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase/config'

// ── Create context ──────────────────────────────────────────
const AuthContext = createContext(null)

// ── Provider component ──────────────────────────────────────
export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true) // True until Firebase resolves

  useEffect(() => {
    // Subscribe to Firebase auth state changes
    // This fires immediately with the current user (or null)
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)
    })

    // Cleanup subscription on unmount
    return () => unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

// ── Custom hook ─────────────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
