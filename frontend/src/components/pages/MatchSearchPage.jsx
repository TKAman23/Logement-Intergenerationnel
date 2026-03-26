/**
 * ============================================================
 * pages/MatchSearchPage.jsx — Match Discovery Interface
 * ============================================================
 *
 * The main match-browsing experience:
 *   - Fetches ranked match results from /api/matching/results
 *   - Shows cards with compatibility score bar, vibe tags, details
 *   - Client-side filters: location, max rent, pets, smoking
 *   - Connection request modal with optional message
 *   - Creative loading screen while results compute
 */

import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { apiRequest } from '../../utils/api'
import {
  Search, Filter, MapPin, DollarSign, Heart, Wind,
  Users, Clock, Star, Send, X, ChevronDown, ArrowUpRight,
  Home, Cigarette, PawPrint, CheckCircle, AlertTriangle
} from 'lucide-react'
import styles from './MatchSearchPage.module.css'

export default function MatchSearchPage() {
  const { t } = useTranslation()

  // ── Data state ───────────────────────────────────────────
  const [matches,    setMatches]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')

  // ── Filter state ─────────────────────────────────────────
  const [filterLocation, setFilterLocation] = useState('all')
  const [filterMaxRent,  setFilterMaxRent]  = useState('')
  const [filterPets,     setFilterPets]     = useState(false)
  const [filterSmoking,  setFilterSmoking]  = useState(false)
  const [filtersOpen,    setFiltersOpen]    = useState(false)

  // ── Connection modal state ────────────────────────────────
  const [modalTarget,  setModalTarget]  = useState(null)   // MatchResult object
  const [modalMsg,     setModalMsg]     = useState('')      // Optional message
  const [sending,      setSending]      = useState(false)
  const [sentUids,     setSentUids]     = useState(new Set())  // UIDs we've already requested
  const [sendSuccess,  setSendSuccess]  = useState('')

  // ── Load matches on mount ─────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const data = await apiRequest('GET', '/api/matching/results?top_n=30')
        setMatches(data)
      } catch (err) {
        setError(err.message || t('errors.generic'))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // ── Apply client-side filters ────────────────────────────
  const filtered = useMemo(() => {
    return matches.filter(m => {
      if (filterLocation !== 'all' && m.location !== filterLocation) return false
      if (filterMaxRent) {
        const rent = m.rent_offer ?? m.rent_budget ?? 0
        if (rent > parseFloat(filterMaxRent)) return false
      }
      if (filterPets    && !m.pets)    return false
      if (filterSmoking && !m.smoking) return false
      return true
    })
  }, [matches, filterLocation, filterMaxRent, filterPets, filterSmoking])

  // ── Send connection request ──────────────────────────────
  const handleSendRequest = async () => {
    if (!modalTarget) return
    setSending(true)
    try {
      await apiRequest('POST', '/api/connections/request', {
        to_uid:  modalTarget.uid,
        message: modalMsg,
      })
      setSentUids(prev => new Set([...prev, modalTarget.uid]))
      setSendSuccess(`Request sent to ${modalTarget.display_name}!`)
      setModalTarget(null)
      setModalMsg('')
      setTimeout(() => setSendSuccess(''), 4000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  // ── Score → visual percentage ────────────────────────────
  // Lower score = better. Invert for display (100% = perfect match)
  const scoreToPercent = (score) => {
    const maxPossible = 5.0
    return Math.max(0, Math.round((1 - score / maxPossible) * 100))
  }

  // ── Score → color ────────────────────────────────────────
  const scoreColor = (pct) => {
    if (pct >= 80) return 'var(--success)'
    if (pct >= 60) return 'var(--brand-blue)'
    if (pct >= 40) return 'var(--warning)'
    return 'var(--error)'
  }

  // ── Loading screen ───────────────────────────────────────
  if (loading) return <LoadingScreen t={t}/>

  return (
    <div className={`container ${styles.page}`}>

      {/* ── Page Header ──────────────────────────────── */}
      <div className={styles.pageHeader}>
        <div>
          <h1>{t('matching.title')}</h1>
          <p className={styles.subtitle}>{t('matching.subtitle')}</p>
        </div>
        <div className={styles.headerMeta}>
          <span className="badge badge-blue">
            {filtered.length} résultats
          </span>
          <button
            className={`btn btn-secondary ${styles.filterToggle}`}
            onClick={() => setFiltersOpen(p => !p)}
          >
            <Filter size={15}/> {t('matching.filtersTitle')}
            <ChevronDown size={14} style={{ transform: filtersOpen ? 'rotate(180deg)' : 'none', transition: '0.2s' }}/>
          </button>
        </div>
      </div>

      {/* ── Success / Error messages ──────────────────── */}
      {sendSuccess && <div className="alert alert-success"><CheckCircle size={14}/> {sendSuccess}</div>}
      {error       && <div className="alert alert-error"><AlertTriangle size={14}/> {error}</div>}

      {/* ── Filter Panel ─────────────────────────────── */}
      {filtersOpen && (
        <div className={`card ${styles.filterPanel}`}>
          <div className={styles.filterGrid}>
            <div className="form-group" style={{ margin: 0 }}>
              <label><MapPin size={12}/> {t('matching.filterLocation')}</label>
              <select value={filterLocation} onChange={e => setFilterLocation(e.target.value)}>
                <option value="all">{t('matching.filterAll')}</option>
                <option value="urban">{t('profile.locationUrban')}</option>
                <option value="suburban">{t('profile.locationSuburban')}</option>
                <option value="rural">{t('profile.locationRural')}</option>
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label><DollarSign size={12}/> {t('matching.filterRent')} ($)</label>
              <input
                type="number" placeholder="e.g. 800"
                value={filterMaxRent}
                onChange={e => setFilterMaxRent(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <label className="checkbox-row">
                <input type="checkbox" checked={filterPets} onChange={e => setFilterPets(e.target.checked)}/>
                <PawPrint size={14}/> {t('matching.pets')}
              </label>
              <label className="checkbox-row">
                <input type="checkbox" checked={filterSmoking} onChange={e => setFilterSmoking(e.target.checked)}/>
                <Cigarette size={14}/> {t('matching.smoking')}
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ── Match Cards Grid ──────────────────────────── */}
      {filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <Search size={48} color="var(--text-muted)"/>
          <p>{t('matching.noMatches')}</p>
          <Link to="/profile" className="btn btn-primary" style={{ marginTop: '1rem' }}>
            Complete Profile <ArrowUpRight size={15}/>
          </Link>
        </div>
      ) : (
        <div className={styles.matchGrid}>
          {filtered.map((match, idx) => {
            const pct     = scoreToPercent(match.match_score)
            const color   = scoreColor(pct)
            const alreadySent = sentUids.has(match.uid)

            return (
              <div key={match.uid} className={`card ${styles.matchCard}`}>

                {/* ── Match Rank ─────────────────────── */}
                <div className={styles.rankBadge}>#{idx + 1}</div>

                {/* ── Avatar + Name ──────────────────── */}
                <div className={styles.cardTop}>
                  <div className={styles.avatar} style={{ background: avatarColor(idx) }}>
                    {match.photo_url
                      ? <img src={match.photo_url} alt={match.display_name}/>
                      : match.display_name[0]?.toUpperCase()
                    }
                  </div>
                  <div className={styles.cardTopInfo}>
                    <h3 className={styles.matchName}>{match.display_name}</h3>
                    <div className={styles.metaRow}>
                      <span className="badge badge-blue">
                        {match.role === 'elder' ? '🏠 Elder' : match.role === 'youth' ? '🎓 Youth' : '👥 Either'}
                      </span>
                      <span className={styles.metaItem}>
                        <MapPin size={12}/> {match.location}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── Compatibility Score ────────────── */}
                <div className={styles.scoreSection}>
                  <div className={styles.scoreLabel}>
                    <Star size={13} fill={color} stroke="none"/>
                    <span>{t('matching.matchScore')}</span>
                    <strong style={{ color, marginLeft: 'auto' }}>{pct}%</strong>
                  </div>
                  <div className={styles.scoreBar}>
                    <div
                      className={styles.scoreFill}
                      style={{ width: `${pct}%`, background: color }}
                    />
                  </div>
                </div>

                {/* ── Bio ────────────────────────────── */}
                {match.bio && (
                  <p className={styles.bio}>{match.bio}</p>
                )}

                {/* ── Details ────────────────────────── */}
                <div className={styles.details}>
                  {(match.rent_offer || match.rent_budget) && (
                    <DetailChip
                      icon={<DollarSign size={12}/>}
                      text={`$${match.rent_offer ?? match.rent_budget}/mo`}
                    />
                  )}
                  <DetailChip icon={<Clock size={12}/>} text={`${match.commitment_hours}h/wk`}/>
                  {match.pets    && <DetailChip icon={<PawPrint size={12}/>}  text="Pets OK"/>}
                  {match.smoking && <DetailChip icon={<Cigarette size={12}/>} text="Smoking OK"/>}
                </div>

                {/* ── Interests ──────────────────────── */}
                {match.interests?.length > 0 && (
                  <div className={styles.tags}>
                    {match.interests.slice(0, 4).map(tag => (
                      <span key={tag} className={`badge badge-orange ${styles.tag}`}>{tag}</span>
                    ))}
                  </div>
                )}

                {/* ── Languages ──────────────────────── */}
                {match.languages?.length > 0 && (
                  <div className={styles.langRow}>
                    <Wind size={12} color="var(--text-muted)"/>
                    <span>{match.languages.join(', ')}</span>
                  </div>
                )}

                {/* ── Connect Button ──────────────────── */}
                <button
                  className={`btn ${alreadySent ? 'btn-secondary' : 'btn-primary'} ${styles.connectBtn}`}
                  onClick={() => !alreadySent && setModalTarget(match)}
                  disabled={alreadySent}
                >
                  {alreadySent
                    ? <><CheckCircle size={14}/> {t('matching.requestSent')}</>
                    : <><Send size={14}/> {t('matching.sendRequest')}</>
                  }
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Connection Request Modal ──────────────────── */}
      {modalTarget && (
        <>
          <div className="page-dim" onClick={() => setModalTarget(null)}/>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>{t('matching.requestConfirm')}</h3>
              <button className="btn btn-ghost" onClick={() => setModalTarget(null)}>
                <X size={18}/>
              </button>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Sending to: <strong>{modalTarget.display_name}</strong>
            </p>

            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label>{t('matching.sendMessage')}</label>
              <textarea
                value={modalMsg}
                onChange={e => setModalMsg(e.target.value)}
                placeholder="Hi! I came across your profile and think we'd be a great match..."
                style={{ minHeight: 90 }}
              />
            </div>

            <div className={styles.modalActions}>
              <button className="btn btn-secondary" onClick={() => setModalTarget(null)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSendRequest}
                disabled={sending}
              >
                {sending
                  ? <><span className="spinner"/> Sending...</>
                  : <><Send size={14}/> Send Request</>
                }
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Helper sub-components ────────────────────────────────────
function DetailChip({ icon, text }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
      fontSize: '0.78rem', color: 'var(--text-muted)',
      background: 'var(--bg-primary)', borderRadius: '6px',
      padding: '0.2rem 0.5rem', border: '1px solid var(--border)',
    }}>
      {icon} {text}
    </span>
  )
}

// ── Loading screen — creative animation ─────────────────────
function LoadingScreen({ t }) {
  const [step, setStep] = useState(0)
  const steps = [
    '🏠 Finding compatible homes...',
    '🤖 Running personality analysis...',
    '🧮 Computing compatibility scores...',
    '✨ Sorting your best matches...',
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setStep(s => (s + 1) % steps.length)
    }, 1400)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className={styles.loadingScreen}>
      <div className={styles.loadingIcon}>
        <Home size={36} color="var(--accent)"/>
        <Heart size={18} color="var(--brand-blue)" className={styles.heartFloat}/>
      </div>
      <h2 style={{ fontFamily: 'Playfair Display, serif' }}>
        {t('matching.loading')}
      </h2>
      <p className={styles.loadingStep}>{steps[step]}</p>
      <div className={styles.loadingDots}>
        {[0,1,2].map(i => (
          <div key={i} className={styles.dot} style={{ animationDelay: `${i * 0.2}s` }}/>
        ))}
      </div>
    </div>
  )
}

// ── Avatar color from index ──────────────────────────────────
function avatarColor(i) {
  const colors = [
    'var(--brand-blue)', 'var(--accent)', 'var(--success)',
    'var(--brand-blue-dk)', 'var(--accent-dk)',
  ]
  return colors[i % colors.length]
}
