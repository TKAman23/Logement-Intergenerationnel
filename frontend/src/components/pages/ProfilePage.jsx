/**
 * ============================================================
 * pages/ProfilePage.jsx — User Profile Editor
 * ============================================================
 *
 * Sections:
 *   1. Basic Info  — name, bio, role, location, photo
 *   2. Housing     — rent offer/budget
 *   3. Lifestyle   — pets, smoking, commitment hours, interests, languages
 *   4. Vibe Questions — 8 free-text prompts → NLP scoring
 *   5. Vibe Preferences — sliders for desired housemate personality
 *   6. Account     — delete account
 *
 * The "Analyze My Answers" button POSTs to /api/profiles/score,
 * gets back VibeScores, then saves them as part of the profile PATCH.
 */

import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { apiRequest } from '../../utils/api'
import { deleteAccount } from '../../firebase/authHelpers'
import { useNavigate } from 'react-router-dom'
import {
  User, Home, Heart, Brain, Trash2, Camera,
  Save, Zap, CheckCircle, AlertTriangle
} from 'lucide-react'
import styles from './ProfilePage.module.css'

// ── Vibe dimension definitions ───────────────────────────────
// Each item maps to a VibeScores field, with labels for both ends
const VIBE_DIMS = [
  { key: 'introvert_extrovert', lowKey: 'vibe.introvert',     highKey: 'vibe.extrovert'    },
  { key: 'quiet_energetic',     lowKey: 'vibe.quiet',         highKey: 'vibe.energetic'    },
  { key: 'friendliness',        lowKey: 'vibe.reserved',      highKey: 'vibe.friendly'     },
  { key: 'assertiveness',       lowKey: 'vibe.passive',       highKey: 'vibe.assertive'    },
  { key: 'empathy',             lowKey: 'vibe.analytical',    highKey: 'vibe.empathetic'   },
  { key: 'inquisitiveness',     lowKey: 'vibe.routine',       highKey: 'vibe.curious'      },
  { key: 'noisiness',           lowKey: 'vibe.silenceLoving', highKey: 'vibe.noisy'        },
  { key: 'early_night',         lowKey: 'vibe.earlyBird',     highKey: 'vibe.nightOwl'     },
]

// Default neutral vibe values
const DEFAULT_VIBES = Object.fromEntries(VIBE_DIMS.map(d => [d.key, 0.5]))

// The 8 lifestyle question keys
const Q_KEYS = ['q1_social','q2_morning','q3_home_energy','q4_conflict','q5_others','q6_curiosity','q7_noise','q8_schedule']
const Q_TRANSLATION_KEYS = ['q1','q2','q3','q4','q5','q6','q7','q8']

export default function ProfilePage() {
  const { t }    = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const fileRef  = useRef(null)

  // ── Form state ───────────────────────────────────────────
  const [displayName,   setDisplayName]   = useState('')
  const [bio,           setBio]           = useState('')
  const [role,          setRole]          = useState('either')
  const [location,      setLocation]      = useState('urban')
  const [rentOffer,     setRentOffer]     = useState('')
  const [rentBudget,    setRentBudget]    = useState('')
  const [pets,          setPets]          = useState(false)
  const [smoking,       setSmoking]       = useState(false)
  const [commitHours,   setCommitHours]   = useState(5)
  const [interests,     setInterests]     = useState('')
  const [languages,     setLanguages]     = useState('')
  const [answers,       setAnswers]       = useState(
    Object.fromEntries(Q_KEYS.map(k => [k, '']))
  )
  const [vibeScores,    setVibeScores]    = useState(null)
  const [vibePrefs,     setVibePrefs]     = useState({ ...DEFAULT_VIBES })

  // ── UI state ─────────────────────────────────────────────
  const [loading,       setLoading]       = useState(true)
  const [saving,        setSaving]        = useState(false)
  const [scoring,       setScoring]       = useState(false)
  const [successMsg,    setSuccessMsg]    = useState('')
  const [errorMsg,      setErrorMsg]      = useState('')

  // ── Load existing profile ────────────────────────────────
  useEffect(() => {
    if (!user) return
    async function load() {
      try {
        const data = await apiRequest('GET', `/api/profiles/${user.uid}`)
        if (!data) return

        setDisplayName(data.display_name || user.displayName || '')
        setBio(data.bio || '')
        setRole(data.role || 'either')
        setLocation(data.location || 'urban')
        setRentOffer(data.rent_offer ?? '')
        setRentBudget(data.rent_budget ?? '')
        setPets(data.pets || false)
        setSmoking(data.smoking || false)
        setCommitHours(data.commitment_hours || 5)
        setInterests((data.interests || []).join(', '))
        setLanguages((data.languages || []).join(', '))
        if (data.lifestyle_answers) setAnswers(data.lifestyle_answers)
        if (data.vibe_scores)       setVibeScores(data.vibe_scores)
        if (data.vibe_preferences)  setVibePrefs(data.vibe_preferences)
      } catch (err) {
        // Profile may not exist yet — that's fine
        setDisplayName(user.displayName || '')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user])

  // ── Score lifestyle answers via NLP ─────────────────────
  const handleScore = async () => {
    const anyFilled = Object.values(answers).some(v => v.trim().length > 20)
    if (!anyFilled) {
      setErrorMsg('Please fill in at least a few of the lifestyle questions before analyzing.')
      return
    }
    setScoring(true)
    setErrorMsg('')
    try {
      const scores = await apiRequest('POST', '/api/profiles/score', {
        lifestyle_answers: answers
      })
      setVibeScores(scores)
      setSuccessMsg(t('profile.scoreSuccess'))
      setTimeout(() => setSuccessMsg(''), 4000)
    } catch (err) {
      setErrorMsg(err.message || t('errors.generic'))
    } finally {
      setScoring(false)
    }
  }

  // ── Save full profile ────────────────────────────────────
  const handleSave = async () => {
    setSaving(true)
    setErrorMsg('')
    try {
      const profile = {
        display_name: displayName,
        bio,
        role,
        location,
        rent_offer:         rentOffer   ? parseFloat(rentOffer)   : null,
        rent_budget:        rentBudget  ? parseFloat(rentBudget)  : null,
        pets,
        smoking,
        commitment_hours:   parseInt(commitHours),
        interests:  interests.split(',').map(s => s.trim()).filter(Boolean),
        languages:  languages.split(',').map(s => s.trim()).filter(Boolean),
        lifestyle_answers:  answers,
        vibe_scores:        vibeScores,
        vibe_preferences:   vibePrefs,
      }
      await apiRequest('PATCH', `/api/profiles/${user.uid}`, { profile })
      setSuccessMsg(t('profile.saveSuccess'))
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      setErrorMsg(err.message || t('errors.generic'))
    } finally {
      setSaving(false)
    }
  }

  // ── Delete account ───────────────────────────────────────
  const handleDelete = async () => {
    if (!window.confirm(t('profile.deleteConfirm'))) return
    try {
      await deleteAccount()
      navigate('/')
    } catch (err) {
      setErrorMsg(err.message)
    }
  }

  if (loading) return (
    <div className={styles.loadingWrap}>
      <span className="spinner"/>
      <p>{t('loading.generic')}</p>
    </div>
  )

  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.pageHeader}>
        <h1>{t('profile.title')}</h1>
        <p className={styles.subtitle}>{t('profile.subtitle')}</p>
      </div>

      {successMsg && <div className="alert alert-success"><CheckCircle size={15}/> {successMsg}</div>}
      {errorMsg   && <div className="alert alert-error"><AlertTriangle size={15}/> {errorMsg}</div>}

      <div className={styles.grid}>

        {/* ── LEFT COLUMN ─────────────────────────────── */}
        <div className={styles.leftCol}>

          {/* ── Basic Info ──────────────────────────── */}
          <div className={`card ${styles.section}`}>
            <h3 className={styles.sectionTitle}><User size={17}/> {t('profile.basicInfo')}</h3>

            <div className="form-group">
              <label>{t('profile.displayName')}</label>
              <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}/>
            </div>

            <div className="form-group">
              <label>{t('profile.bio')}</label>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder={t('profile.bioPlaceholder')}
                style={{ minHeight: 90 }}
              />
            </div>

            <div className="form-group">
              <label>{t('profile.role')}</label>
              <select value={role} onChange={e => setRole(e.target.value)}>
                <option value="elder">{t('profile.roleElder')}</option>
                <option value="youth">{t('profile.roleYouth')}</option>
                <option value="either">{t('profile.roleEither')}</option>
              </select>
            </div>

            <div className="form-group">
              <label>{t('profile.location')}</label>
              <select value={location} onChange={e => setLocation(e.target.value)}>
                <option value="urban">{t('profile.locationUrban')}</option>
                <option value="suburban">{t('profile.locationSuburban')}</option>
                <option value="rural">{t('profile.locationRural')}</option>
              </select>
            </div>
          </div>

          {/* ── Housing & Finances ───────────────────── */}
          <div className={`card ${styles.section}`}>
            <h3 className={styles.sectionTitle}><Home size={17}/> {t('profile.housing')}</h3>

            <div className="form-group">
              <label>{t('profile.rentOffer')} ($)</label>
              <input
                type="number" min="0" step="50"
                value={rentOffer}
                onChange={e => setRentOffer(e.target.value)}
                placeholder="e.g. 600"
                disabled={role === 'youth'}
              />
            </div>
            <div className="form-group">
              <label>{t('profile.rentBudget')} ($)</label>
              <input
                type="number" min="0" step="50"
                value={rentBudget}
                onChange={e => setRentBudget(e.target.value)}
                placeholder="e.g. 800"
                disabled={role === 'elder'}
              />
            </div>
          </div>

          {/* ── Lifestyle ────────────────────────────── */}
          <div className={`card ${styles.section}`}>
            <h3 className={styles.sectionTitle}><Heart size={17}/> {t('profile.lifestyle')}</h3>

            <label className="checkbox-row" style={{ marginBottom: '0.75rem' }}>
              <input type="checkbox" checked={pets} onChange={e => setPets(e.target.checked)}/>
              {t('profile.pets')}
            </label>
            <label className="checkbox-row" style={{ marginBottom: '1rem' }}>
              <input type="checkbox" checked={smoking} onChange={e => setSmoking(e.target.checked)}/>
              {t('profile.smoking')}
            </label>

            <div className="form-group">
              <label>{t('profile.commitmentHours')}: <strong>{commitHours}h</strong></label>
              <input
                type="range" min="0" max="40" step="1"
                value={commitHours}
                onChange={e => setCommitHours(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>{t('profile.interests')}</label>
              <input type="text" value={interests} onChange={e => setInterests(e.target.value)}
                placeholder="Reading, Cooking, Gardening..."/>
            </div>
            <div className="form-group">
              <label>{t('profile.languages')}</label>
              <input type="text" value={languages} onChange={e => setLanguages(e.target.value)}
                placeholder="French, English..."/>
            </div>
          </div>

        </div>

        {/* ── RIGHT COLUMN ────────────────────────────── */}
        <div className={styles.rightCol}>

          {/* ── Lifestyle Questions ──────────────────── */}
          <div className={`card ${styles.section}`}>
            <h3 className={styles.sectionTitle}><Brain size={17}/> {t('profile.vibeQuestions')}</h3>
            <p className={styles.sectionHint}>{t('profile.vibeSubtitle')}</p>

            {Q_KEYS.map((key, i) => (
              <div className="form-group" key={key}>
                <label>{t(`profile.${Q_TRANSLATION_KEYS[i]}`)}</label>
                <textarea
                  value={answers[key]}
                  onChange={e => setAnswers(prev => ({ ...prev, [key]: e.target.value }))}
                  style={{ minHeight: 75 }}
                />
              </div>
            ))}

            <button
              className="btn btn-secondary"
              onClick={handleScore}
              disabled={scoring}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {scoring
                ? <><span className="spinner"/> {t('profile.scoring')}</>
                : <><Zap size={15}/> {t('profile.scoreAnswers')}</>
              }
            </button>

            {/* Show computed scores */}
            {vibeScores && (
              <div className={styles.scoresDisplay}>
                <p className={styles.scoresTitle}>Your Personality Profile:</p>
                {VIBE_DIMS.map(dim => (
                  <VibeMeter
                    key={dim.key}
                    dim={dim}
                    value={vibeScores[dim.key]}
                    t={t}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── Vibe Preferences ─────────────────────── */}
          <div className={`card ${styles.section}`}>
            <h3 className={styles.sectionTitle}>{t('profile.vibePreferences')}</h3>
            <p className={styles.sectionHint}>{t('profile.vibePrefsSubtitle')}</p>

            {VIBE_DIMS.map(dim => (
              <div className="form-group" key={dim.key}>
                <div className={styles.sliderLabelRow}>
                  <span>{t(dim.lowKey)}</span>
                  <span>{t(dim.highKey)}</span>
                </div>
                <input
                  type="range" min="0" max="1" step="0.05"
                  value={vibePrefs[dim.key]}
                  onChange={e =>
                    setVibePrefs(prev => ({ ...prev, [dim.key]: parseFloat(e.target.value) }))
                  }
                />
              </div>
            ))}
          </div>

          {/* ── Save Button ───────────────────────────── */}
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
            style={{ width: '100%', justifyContent: 'center', padding: '0.85rem', fontSize: '1rem' }}
          >
            {saving
              ? <><span className="spinner"/> {t('loading.saving')}</>
              : <><Save size={16}/> {t('profile.save')}</>
            }
          </button>

          {/* ── Danger Zone ──────────────────────────── */}
          <div className={`card ${styles.dangerZone}`}>
            <h4 style={{ color: 'var(--error)' }}><Trash2 size={15}/> Danger Zone</h4>
            <p style={{ fontSize: '0.85rem', marginTop: '0.4rem' }}>
              Permanently delete your account and all data.
            </p>
            <button className="btn btn-danger" onClick={handleDelete} style={{ marginTop: '0.75rem' }}>
              <Trash2 size={14}/> {t('profile.deleteAccount')}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}

// ── VibeMeter — horizontal score bar ────────────────────────
function VibeMeter({ dim, value, t }) {
  const pct = Math.round(value * 100)
  return (
    <div className={styles.meterRow}>
      <div className={styles.meterLabels}>
        <span>{t(dim.lowKey)}</span>
        <span>{t(dim.highKey)}</span>
      </div>
      <div className={styles.meterBar}>
        <div className={styles.meterFill} style={{ width: `${pct}%` }}/>
        <div className={styles.meterThumb} style={{ left: `${pct}%` }}/>
      </div>
    </div>
  )
}
