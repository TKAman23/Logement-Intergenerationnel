/**
 * ============================================================
 * App.jsx — Root Component: Providers + Router
 * ============================================================
 *
 * Wraps the app with:
 *   - ThemeProvider (dark/light mode)
 *   - AuthProvider (Firebase auth state)
 *   - React Router (page routing)
 *
 * Route structure:
 *   /                 → HomePage
 *   /about            → AboutPage
 *   /signin           → SignInPage
 *   /signup           → SignUpPage
 *   /account          → AccountHome (protected)
 *   /profile          → ProfilePage (protected)
 *   /matches          → MatchSearchPage (protected)
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import Navbar from './components/layout/Navbar'
import HomePage from './components/pages/HomePage'
import AboutPage from './components/pages/AboutPage'
import SignInPage from './components/pages/SignInPage'
import SignUpPage from './components/pages/SignUpPage'
import AccountHome from './components/pages/AccountHome'
import ProfilePage from './components/pages/ProfilePage'
import MatchSearchPage from './components/pages/MatchSearchPage'

// ── Protected Route wrapper ──────────────────────────────────
// Redirects to /signin if user is not authenticated
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}><div className="spinner" /></div>
  if (!user) return <Navigate to="/signin" replace />
  return children
}

// ── App with auth context (needs to be inside AuthProvider) ──
function AppRoutes() {
  return (
    <>
      <Navbar />
      <div className="page-wrapper">
        <Routes>
          <Route path="/"        element={<HomePage />} />
          <Route path="/about"   element={<AboutPage />} />
          <Route path="/signin"  element={<SignInPage />} />
          <Route path="/signup"  element={<SignUpPage />} />
          <Route path="/account" element={<ProtectedRoute><AccountHome /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/matches" element={<ProtectedRoute><MatchSearchPage /></ProtectedRoute>} />
          {/* Catch-all → home */}
          <Route path="*"        element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
