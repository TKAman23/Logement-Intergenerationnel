/**
 * ============================================================
 * pages/AccountHome.jsx — Authenticated User Dashboard
 * ============================================================
 *
 * Shows:
 *   - Welcome message
 *   - Profile completion nudge (if incomplete)
 *   - Floating connection request notification widget
 *   - Accepted connections list with contact info
 */

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { apiRequest } from '../../utils/api'
import {
  Bell, UserCheck, Mail, ArrowRight, CheckCircle,
  XCircle, User, Search, Home, Clock
} from 'lucide-react'
import styles from './AccountHome.module.css'

export default function AccountHome() {
  const { t }    = useTranslation()
  const { user } = useAuth()

  // ── State ────────────────────────────────────────────────
  const [pending,    setPending]    = useState([])   // Incoming connection requests
  const [accepted,   setAccepted]   = useState([])   // Accepted connections
  const [notifOpen,  setNotifOpen]  = useState(false) // Notification widget open
  const [loading,    setLoading]    = useState(true)
  const [actionMsg,  setActionMsg]  = useState('')   // Feedback after accept/decline

  // ── Load data ────────────────────────────────────────────
  useEffect(() => {
    async function loadData() {
      try {
        const [pendingData, acceptedData] = await Promise.all([
          apiRequest('GET', '/api/connections/pending'),
          apiRequest('GET', '/api/connections/accepted'),
        ])
        setPending(pendingData)
        setAccepted(acceptedData)
      } catch (err) {
        console.error('Failed to load connections:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // ── Accept / Decline a connection request ────────────────
  const handleResponse = async (connectionId, action) => {
    try {
      await apiRequest('PATCH', `/api/connections/${connectionId}`, { action })
      // Remove from pending list
      setPending(prev => prev.filter(c => c.id !== connectionId))
      setActionMsg(action === 'accept' ? '✓ Connection accepted!' : 'Request declined.')
      // Reload accepted if we just accepted
      if (action === 'accept') {
        const updated = await apiRequest('GET', '/api/connections/accepted')
        setAccepted(updated)
      }
      setTimeout(() => setActionMsg(''), 3000)
    } catch (err) {
      setActionMsg('Something went wrong.')
    }
  }

  return (
    <div className={`container ${styles.page}`}>

      {/* ── Welcome Header ───────────────────────────── */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.welcome}>
            {t('account.title')}, {user?.displayName?.split(' ')[0] || 'there'} 👋
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.3rem' }}>
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* ── Floating Notification Button ────────────── */}
        <div className={styles.notifWrap}>
          <button
            className={styles.notifBtn}
            onClick={() => setNotifOpen(p => !p)}
          >
            <Bell size={18}/>
            {pending.length > 0 && (
              <span className={styles.notifBadge}>{pending.length}</span>
            )}
          </button>

          {/* Notification Dropdown */}
          {notifOpen && (
            <>
              <div className="page-dim" onClick={() => setNotifOpen(false)}/>
              <div className={styles.notifDropdown}>
                <div className={styles.notifHeader}>
                  <Bell size={16}/> {t('account.pendingRequests')}
                </div>

                {pending.length === 0 ? (
                  <p className={styles.emptyMsg}>{t('account.noRequests')}</p>
                ) : (
                  <div className={styles.notifList}>
                    {pending.map(conn => (
                      <div key={conn.id} className={styles.notifItem}>
                        <div className={styles.notifAvatar}>
                          {(conn.from_email || '?')[0].toUpperCase()}
                        </div>
                        <div className={styles.notifInfo}>
                          <span className={styles.notifEmail}>{conn.from_email}</span>
                          {conn.message && (
                            <p className={styles.notifMsg}>"{conn.message}"</p>
                          )}
                        </div>
                        <div className={styles.notifActions}>
                          <button
                            className={`btn btn-primary ${styles.notifActionBtn}`}
                            onClick={() => handleResponse(conn.id, 'accept')}
                          >
                            <CheckCircle size={14}/> {t('account.accept')}
                          </button>
                          <button
                            className={`btn btn-secondary ${styles.notifActionBtn}`}
                            onClick={() => handleResponse(conn.id, 'decline')}
                          >
                            <XCircle size={14}/> {t('account.decline')}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Action Message ───────────────────────────── */}
      {actionMsg && (
        <div className={`alert ${actionMsg.startsWith('✓') ? 'alert-success' : 'alert-error'}`}>
          {actionMsg}
        </div>
      )}

      {/* ── Quick Actions Grid ───────────────────────── */}
      <div className={styles.quickGrid}>
        <Link to="/profile" className={styles.quickCard}>
          <User size={24} color="var(--brand-blue)"/>
          <span>{t('nav.profile')}</span>
        </Link>
        <Link to="/matches" className={styles.quickCard}>
          <Search size={24} color="var(--accent)"/>
          <span>{t('nav.matches')}</span>
        </Link>
        <div className={`${styles.quickCard} ${styles.quickStat}`}>
          <UserCheck size={24} color="var(--success)"/>
          <span>{accepted.length} connections</span>
        </div>
        <div className={`${styles.quickCard} ${styles.quickStat}`}>
          <Bell size={24} color="var(--warning)"/>
          <span>{pending.length} pending</span>
        </div>
      </div>

      <div className="divider"/>

      {/* ── Accepted Connections ─────────────────────── */}
      <section>
        <h2 className={styles.sectionTitle}>
          <UserCheck size={20}/> {t('account.connections')}
        </h2>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
            <span className="spinner"/>
          </div>
        ) : accepted.length === 0 ? (
          <div className={styles.emptyState}>
            <Home size={40} color="var(--text-muted)"/>
            <p>{t('account.noConnections')}</p>
            <Link to="/matches" className="btn btn-primary" style={{ marginTop: '1rem' }}>
              {t('nav.matches')} <ArrowRight size={15}/>
            </Link>
          </div>
        ) : (
          <div className={styles.connectionsList}>
            {accepted.map(conn => (
              <ConnectionCard key={conn.id} conn={conn} currentUid={user?.uid}/>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

// ── Connection Card sub-component ───────────────────────────
function ConnectionCard({ conn, currentUid }) {
  // Figure out which email is "the other person"
  const otherEmail = conn.from_uid === currentUid
    ? conn.to_email
    : conn.from_email

  return (
    <div className={`card ${styles.connectionCard}`}>
      <div className={styles.connectionAvatar}>
        {(otherEmail || '?')[0].toUpperCase()}
      </div>
      <div className={styles.connectionInfo}>
        <div className={styles.connectionEmail}>
          <Mail size={14}/> {otherEmail || 'Contact info unavailable'}
        </div>
        <div className={styles.connectionMeta}>
          <Clock size={12}/> Connected
        </div>
      </div>
      <a
        href={`mailto:${otherEmail}`}
        className="btn btn-secondary"
        style={{ flexShrink: 0 }}
      >
        <Mail size={14}/> Email
      </a>
    </div>
  )
}
