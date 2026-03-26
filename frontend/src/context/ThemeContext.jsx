/**
 * ============================================================
 * context/ThemeContext.jsx — Dark / Light Mode Provider
 * ============================================================
 *
 * Persists theme preference to localStorage.
 * Applies a data-theme attribute to <html> which CSS variables
 * in globals.css respond to.
 *
 * Usage:
 *   const { theme, toggleTheme } = useTheme()
 */

import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  // Initialize from localStorage or system preference
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme')
    if (saved) return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  // Apply theme to <html> element whenever it changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () =>
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
