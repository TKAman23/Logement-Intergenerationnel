/**
 * ============================================================
 * components/layout/Navbar.jsx — Top Navigation Bar
 * ============================================================
 *
 * Features:
 *   - Fixed top, glass-morphism style
 *   - Auth-aware: shows different links when signed in
 *   - Dark/light mode toggle
 *   - EN/FR language toggle
 *   - Account dropdown menu
 *   - Page dims when menu is open
 */

import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { logOut } from '../../firebase/authHelpers'
import {
  Home, Info, LogIn, UserPlus, LogOut, User,
  Search, Sun, Moon, ChevronDown, Menu, X, Languages
} from 'lucide-react'
import styles from './Navbar.module.css'

export default function Navbar() {
  const { t, i18n }      = useTranslation()
  const { user }         = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate         = useNavigate()
  const location         = useLocation()

  const [menuOpen,   setMenuOpen]   = useState(false)  // Account dropdown
  const [mobileOpen, setMobileOpen] = useState(false)  // Mobile nav
  const menuRef = useRef(null)

  // Close menu when clicking outside
  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Close mobile nav on route change
  useEffect(() => {
    setMobileOpen(false)
    setMenuOpen(false)
  }, [location])

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language === 'fr' ? 'en' : 'fr')
  }

  const handleSignOut = async () => {
    await logOut()
    navigate('/')
  }

  return (
    <>
      {/* Page dim when mobile nav or account menu is open */}
      {(menuOpen || mobileOpen) && (
        <div
          className="page-dim"
          onClick={() => { setMenuOpen(false); setMobileOpen(false) }}
        />
      )}

      <nav className={styles.navbar}>
        <div className={styles.inner}>

          {/* ── Logo ─────────────────────────────────────── */}
          <Link to="/" className={styles.logo}>
            {/* SVG House Icon */}
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className={styles.logoIcon}>
              <path d="M3 9.5L12 3l9 6.5V21a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"
                fill="var(--accent)" opacity="0.9"/>
              <path d="M9 21V12h6v9" stroke="var(--bg-card)" strokeWidth="1.5"/>
              {/* Two small figures inside */}
              <circle cx="10" cy="8" r="1.2" fill="var(--bg-card)" opacity="0.8"/>
              <circle cx="14" cy="8" r="1.2" fill="var(--bg-card)" opacity="0.8"/>
            </svg>
            <span className={styles.logoText}>
              Logement<span className={styles.logoAccent}>IG</span>
            </span>
          </Link>

          {/* ── Desktop Nav Links ─────────────────────── */}
          <div className={styles.links}>
            <Link to="/"      className={styles.navLink}><Home size={15}/> {t('nav.home')}</Link>
            <Link to="/about" className={styles.navLink}><Info size={15}/> {t('nav.about')}</Link>
            {user && (
              <Link to="/matches" className={styles.navLink}>
                <Search size={15}/> {t('nav.matches')}
              </Link>
            )}
          </div>

          {/* ── Right Controls ────────────────────────── */}
          <div className={styles.controls}>

            {/* Language toggle */}
            <button
              className={`btn btn-ghost ${styles.iconBtn}`}
              onClick={toggleLang}
              title="Toggle language"
            >
              <Languages size={17}/>
              <span className={styles.langLabel}>
                {i18n.language === 'fr' ? 'EN' : 'FR'}
              </span>
            </button>

            {/* Dark/Light toggle */}
            <button
              className={`btn btn-ghost ${styles.iconBtn}`}
              onClick={toggleTheme}
              title={theme === 'dark' ? t('nav.lightMode') : t('nav.darkMode')}
            >
              {theme === 'dark' ? <Sun size={17}/> : <Moon size={17}/>}
            </button>

            {/* Auth controls */}
            {user ? (
              // ── Account Menu ───────────────────────────
              <div className={styles.accountMenu} ref={menuRef}>
                <button
                  className={styles.accountBtn}
                  onClick={() => setMenuOpen(p => !p)}
                >
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="avatar" className={styles.avatar}/>
                  ) : (
                    <div className={styles.avatarPlaceholder}>
                      {(user.displayName || user.email || '?')[0].toUpperCase()}
                    </div>
                  )}
                  <span className={styles.userName}>
                    {user.displayName?.split(' ')[0] || t('nav.myAccount')}
                  </span>
                  <ChevronDown size={14} className={menuOpen ? styles.chevronOpen : ''}/>
                </button>

                {menuOpen && (
                  <div className={styles.dropdown}>
                    <Link to="/account" className={styles.dropItem}>
                      <Home size={15}/> {t('nav.myAccount')}
                    </Link>
                    <Link to="/profile" className={styles.dropItem}>
                      <User size={15}/> {t('nav.profile')}
                    </Link>
                    <Link to="/matches" className={styles.dropItem}>
                      <Search size={15}/> {t('nav.matches')}
                    </Link>
                    <div className={styles.dropDivider}/>
                    <button className={styles.dropItem} onClick={handleSignOut}>
                      <LogOut size={15}/> {t('nav.signOut')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              // ── Sign In / Sign Up ──────────────────────
              <div className={styles.authBtns}>
                <Link to="/signin" className="btn btn-secondary">{t('nav.signIn')}</Link>
                <Link to="/signup" className="btn btn-primary">{t('nav.signUp')}</Link>
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              className={`btn btn-ghost ${styles.mobileToggle}`}
              onClick={() => setMobileOpen(p => !p)}
            >
              {mobileOpen ? <X size={20}/> : <Menu size={20}/>}
            </button>
          </div>
        </div>

        {/* ── Mobile Nav ──────────────────────────────── */}
        {mobileOpen && (
          <div className={styles.mobileNav}>
            <Link to="/"      className={styles.mobileLink}><Home size={16}/> {t('nav.home')}</Link>
            <Link to="/about" className={styles.mobileLink}><Info size={16}/> {t('nav.about')}</Link>
            {user ? (
              <>
                <Link to="/account"  className={styles.mobileLink}><Home size={16}/> {t('nav.myAccount')}</Link>
                <Link to="/profile"  className={styles.mobileLink}><User size={16}/> {t('nav.profile')}</Link>
                <Link to="/matches"  className={styles.mobileLink}><Search size={16}/> {t('nav.matches')}</Link>
                <button className={styles.mobileLink} onClick={handleSignOut}>
                  <LogOut size={16}/> {t('nav.signOut')}
                </button>
              </>
            ) : (
              <>
                <Link to="/signin" className={styles.mobileLink}><LogIn size={16}/> {t('nav.signIn')}</Link>
                <Link to="/signup" className={styles.mobileLink}><UserPlus size={16}/> {t('nav.signUp')}</Link>
              </>
            )}
          </div>
        )}
      </nav>
    </>
  )
}
