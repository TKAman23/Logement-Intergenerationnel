/**
 * ============================================================
 * pages/ProfilePage.jsx — User Profile Editor (v2)
 * ============================================================
 * CHANGES:
 *   - No "Either/Flexible" role — only Elder or Youth
 *   - Location is free-text (city/address), label differs by role
 *   - Smoking split into "I smoke" + "I'm OK with smoking"
 *   - Interests + languages use tag-chip UI (no manual comma parsing)
 *   - Padding improved on section titles
 *   - Firebase Storage / photo code removed
 */

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { apiRequest } from '../../utils/api'
import { deleteAccount } from '../../firebase/authHelpers'
import { useNavigate } from 'react-router-dom'
import { User, Home, Heart, Brain, Trash2, Save, Zap, CheckCircle, AlertTriangle, X } from 'lucide-react'
import styles from './ProfilePage.module.css'

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
const DEFAULT_VIBES = Object.fromEntries(VIBE_DIMS.map(d => [d.key, 0.5]))
const Q_KEYS = ['q1_social','q2_morning','q3_home_energy','q4_conflict','q5_others','q6_curiosity','q7_noise','q8_schedule']
const Q_T_KEYS = ['q1','q2','q3','q4','q5','q6','q7','q8']

export default function ProfilePage() {
  const { t }    = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [displayName,    setDisplayName]    = useState('')
  const [bio,            setBio]            = useState('')
  const [role,           setRole]           = useState('youth')
  const [location,       setLocation]       = useState('')
  const [rentOffer,      setRentOffer]      = useState('')
  const [rentBudget,     setRentBudget]     = useState('')
  const [pets,           setPets]           = useState(false)
  const [smoker,         setSmoker]         = useState(false)
  const [smokingOk,      setSmokingOk]      = useState(false)
  const [commitHours,    setCommitHours]    = useState(5)
  const [interests,      setInterests]      = useState([])
  const [languages,      setLanguages]      = useState([])
  const [interestInput,  setInterestInput]  = useState('')
  const [languageInput,  setLanguageInput]  = useState('')
  const [answers,        setAnswers]        = useState(Object.fromEntries(Q_KEYS.map(k => [k, ''])))
  const [vibeScores,     setVibeScores]     = useState(null)
  const [vibePrefs,      setVibePrefs]      = useState({ ...DEFAULT_VIBES })
  const [loading,        setLoading]        = useState(true)
  const [saving,         setSaving]         = useState(false)
  const [scoring,        setScoring]        = useState(false)
  const [successMsg,     setSuccessMsg]     = useState('')
  const [errorMsg,       setErrorMsg]       = useState('')

  useEffect(() => {
    if (!user) return
    async function load() {
      try {
        const d = await apiRequest('GET', `/api/profiles/${user.uid}`)
        if (!d) return
        setDisplayName(d.display_name || user.displayName || '')
        setBio(d.bio || '')
        setRole(d.role === 'elder' ? 'elder' : 'youth')
        setLocation(d.location || '')
        setRentOffer(d.rent_offer ?? '')
        setRentBudget(d.rent_budget ?? '')
        setPets(d.pets || false)
        setSmoker(d.smoker || false)
        setSmokingOk(d.smoking_ok || d.smoking || false)
        setCommitHours(d.commitment_hours || 5)
        setInterests(d.interests || [])
        setLanguages(d.languages || [])
        if (d.lifestyle_answers) setAnswers(d.lifestyle_answers)
        if (d.vibe_scores)       setVibeScores(d.vibe_scores)
        if (d.vibe_preferences)  setVibePrefs(d.vibe_preferences)
      } catch { setDisplayName(user.displayName || '') }
      finally  { setLoading(false) }
    }
    load()
  }, [user])

  // ── Tag helpers ──────────────────────────────────────────
  const addTag = (val, list, setList, setInput) => {
    // Handle pasted comma-separated input gracefully
    const parts = val.split(',').map(s => s.trim()).filter(s => s && !list.includes(s))
    if (parts.length) setList([...list, ...parts])
    setInput('')
  }
  const removeTag   = (tag, list, setList) => setList(list.filter(t => t !== tag))
  const tagKeyDown  = (e, val, list, setList, setInput) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(val, list, setList, setInput) }
    if (e.key === 'Backspace' && val === '' && list.length) setList(list.slice(0, -1))
  }

  const handleScore = async () => {
    if (!Object.values(answers).some(v => v.trim().length > 20)) {
      setErrorMsg('Please fill in at least a few lifestyle questions first.'); return
    }
    setScoring(true); setErrorMsg('')
    try {
      const scores = await apiRequest('POST', '/api/profiles/score', { lifestyle_answers: answers })
      setVibeScores(scores)
      setSuccessMsg(t('profile.scoreSuccess'))
      setTimeout(() => setSuccessMsg(''), 4000)
    } catch (err) { setErrorMsg(err.message || t('errors.generic')) }
    finally { setScoring(false) }
  }

  const handleSave = async () => {
    if (!role) { setErrorMsg('Please select a role.'); return }
    setSaving(true); setErrorMsg('')
    try {
      await apiRequest('PATCH', `/api/profiles/${user.uid}`, {
        profile: {
          display_name: displayName, bio, role, location,
          rent_offer:   rentOffer  ? parseFloat(rentOffer)  : null,
          rent_budget:  rentBudget ? parseFloat(rentBudget) : null,
          pets, smoker, smoking_ok: smokingOk,
          smoking: smoker || smokingOk,  // legacy compat
          commitment_hours: parseInt(commitHours),
          interests, languages,
          lifestyle_answers: answers,
          vibe_scores: vibeScores,
          vibe_preferences: vibePrefs,
        }
      })
      setSuccessMsg(t('profile.saveSuccess'))
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) { setErrorMsg(err.message || t('errors.generic')) }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!window.confirm(t('profile.deleteConfirm'))) return
    try { await deleteAccount(); navigate('/') }
    catch (err) { setErrorMsg(err.message) }
  }

  if (loading) return (
    <div className={styles.loadingWrap}><span className="spinner"/><p>{t('loading.generic')}</p></div>
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

        {/* ══ LEFT ══ */}
        <div className={styles.leftCol}>

          {/* Basic Info */}
          <div className={`card ${styles.section}`}>
            <h3 className={styles.sectionTitle}><User size={17}/> {t('profile.basicInfo')}</h3>

            <div className="form-group">
              <label>{t('profile.displayName')}</label>
              <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}/>
            </div>

            <div className="form-group">
              <label>{t('profile.bio')}</label>
              <textarea value={bio} onChange={e => setBio(e.target.value)}
                placeholder={t('profile.bioPlaceholder')} style={{ minHeight: 90 }}/>
            </div>

            {/* Role toggle — no "either" */}
            <div className="form-group">
              <label>{t('profile.role')}</label>
              <div className={styles.roleToggle}>
                <button type="button"
                  className={`${styles.roleBtn} ${role === 'elder' ? styles.roleActive : ''}`}
                  onClick={() => setRole('elder')}>
                  🏠 {t('profile.roleElder')}
                </button>
                <button type="button"
                  className={`${styles.roleBtn} ${role === 'youth' ? styles.roleActive : ''}`}
                  onClick={() => setRole('youth')}>
                  🎓 {t('profile.roleYouth')}
                </button>
              </div>
            </div>

            {/* Location — free text, role-aware label */}
            <div className="form-group">
              <label>
                {role === 'elder' ? t('profile.locationElder') : t('profile.locationYouth')}
              </label>
              <input type="text" value={location} onChange={e => setLocation(e.target.value)}
                placeholder={role === 'elder'
                  ? 'e.g. Plateau-Mont-Royal, Montréal'
                  : 'e.g. Downtown Montréal, or anywhere in the city'}
              />
              <span className={styles.fieldHint}>
                {role === 'elder' ? t('profile.locationElderHint') : t('profile.locationYouthHint')}
              </span>
            </div>
          </div>

          {/* Housing */}
          <div className={`card ${styles.section}`}>
            <h3 className={styles.sectionTitle}><Home size={17}/> {t('profile.housing')}</h3>
            {role === 'elder' && (
              <div className="form-group">
                <label>{t('profile.rentOffer')} ($)</label>
                <input type="number" min="0" step="50" value={rentOffer}
                  onChange={e => setRentOffer(e.target.value)} placeholder="e.g. 600"/>
              </div>
            )}
            {role === 'youth' && (
              <div className="form-group">
                <label>{t('profile.rentBudget')} ($)</label>
                <input type="number" min="0" step="50" value={rentBudget}
                  onChange={e => setRentBudget(e.target.value)} placeholder="e.g. 800"/>
              </div>
            )}
          </div>

          {/* Lifestyle */}
          <div className={`card ${styles.section}`}>
            <h3 className={styles.sectionTitle}><Heart size={17}/> {t('profile.lifestyle')}</h3>

            <label className="checkbox-row" style={{ marginBottom: '0.65rem' }}>
              <input type="checkbox" checked={pets} onChange={e => setPets(e.target.checked)}/>
              {t('profile.pets')}
            </label>

            {/* Split smoking */}
            <label className="checkbox-row" style={{ marginBottom: '0.5rem' }}>
              <input type="checkbox" checked={smoker} onChange={e => setSmoker(e.target.checked)}/>
              {t('profile.smoker')}
            </label>
            <label className="checkbox-row" style={{ marginBottom: '1.1rem' }}>
              <input type="checkbox" checked={smokingOk} onChange={e => setSmokingOk(e.target.checked)}/>
              {t('profile.smokingOk')}
            </label>

            <div className="form-group">
              <label>{t('profile.commitmentHours')}: <strong>{commitHours}h</strong></label>
              <input type="range" min="0" max="40" step="1"
                value={commitHours} onChange={e => setCommitHours(e.target.value)}/>
            </div>

            {/* Interests tag input */}
            <div className="form-group">
              <label>{t('profile.interests')}</label>
              <TagInput tags={interests} input={interestInput} setInput={setInterestInput}
                onAdd={() => addTag(interestInput, interests, setInterests, setInterestInput)}
                onKeyDown={e => tagKeyDown(e, interestInput, interests, setInterests, setInterestInput)}
                onRemove={tag => removeTag(tag, interests, setInterests)}
                placeholder={t('profile.interestsPlaceholder')}/>
              <span className={styles.fieldHint}>{t('profile.tagHint')}</span>
            </div>

            {/* Languages tag input */}
            <div className="form-group">
              <label>{t('profile.languages')}</label>
              <TagInput tags={languages} input={languageInput} setInput={setLanguageInput}
                onAdd={() => addTag(languageInput, languages, setLanguages, setLanguageInput)}
                onKeyDown={e => tagKeyDown(e, languageInput, languages, setLanguages, setLanguageInput)}
                onRemove={tag => removeTag(tag, languages, setLanguages)}
                placeholder={t('profile.languagesPlaceholder')}/>
              <span className={styles.fieldHint}>{t('profile.tagHint')}</span>
            </div>
          </div>
        </div>

        {/* ══ RIGHT ══ */}
        <div className={styles.rightCol}>

          {/* Lifestyle questions */}
          <div className={`card ${styles.section}`}>
            <h3 className={styles.sectionTitle}><Brain size={17}/> {t('profile.vibeQuestions')}</h3>
            <p className={styles.sectionHint}>{t('profile.vibeSubtitle')}</p>

            {Q_KEYS.map((key, i) => (
              <div className="form-group" key={key}>
                <label>{t(`profile.${Q_T_KEYS[i]}`)}</label>
                <textarea value={answers[key]}
                  onChange={e => setAnswers(prev => ({ ...prev, [key]: e.target.value }))}
                  style={{ minHeight: 75 }}/>
              </div>
            ))}

            <button className="btn btn-secondary" onClick={handleScore} disabled={scoring}
              style={{ width: '100%', justifyContent: 'center' }}>
              {scoring
                ? <><span className="spinner"/> {t('profile.scoring')}</>
                : <><Zap size={15}/> {t('profile.scoreAnswers')}</>}
            </button>

            {vibeScores && (
              <div className={styles.scoresDisplay}>
                <p className={styles.scoresTitle}>{t('profile.personalityProfile')}</p>
                {VIBE_DIMS.map(dim => (
                  <VibeMeter key={dim.key} dim={dim} value={vibeScores[dim.key]} t={t}/>
                ))}
              </div>
            )}
          </div>

          {/* Vibe preferences */}
          <div className={`card ${styles.section}`}>
            <h3 className={styles.sectionTitle}>{t('profile.vibePreferences')}</h3>
            <p className={styles.sectionHint}>{t('profile.vibePrefsSubtitle')}</p>
            {VIBE_DIMS.map(dim => (
              <div className="form-group" key={dim.key}>
                <div className={styles.sliderLabelRow}>
                  <span>{t(dim.lowKey)}</span>
                  <span>{t(dim.highKey)}</span>
                </div>
                <input type="range" min="0" max="1" step="0.05"
                  value={vibePrefs[dim.key]}
                  onChange={e => setVibePrefs(prev => ({ ...prev, [dim.key]: parseFloat(e.target.value) }))}/>
              </div>
            ))}
          </div>

          {/* Save */}
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}
            style={{ width: '100%', justifyContent: 'center', padding: '0.85rem', fontSize: '1rem' }}>
            {saving
              ? <><span className="spinner"/> {t('loading.saving')}</>
              : <><Save size={16}/> {t('profile.save')}</>}
          </button>

          {/* Danger zone */}
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

// ── TagInput ─────────────────────────────────────────────────
function TagInput({ tags, input, setInput, onAdd, onKeyDown, onRemove, placeholder }) {
  return (
    <div style={{
      border: '1.5px solid var(--border)', borderRadius: '8px',
      padding: '0.4rem 0.6rem', background: 'var(--bg-secondary)',
      display: 'flex', flexWrap: 'wrap', gap: '0.35rem',
      alignItems: 'center', minHeight: '42px', cursor: 'text',
    }}>
      {tags.map(tag => (
        <span key={tag} style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
          background: 'var(--accent-lt)', color: 'var(--accent-dk)',
          border: '1px solid var(--accent)', borderRadius: '100px',
          padding: '0.15rem 0.55rem', fontSize: '0.8rem', fontWeight: 500,
        }}>
          {tag}
          <button type="button" onClick={() => onRemove(tag)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: 0, color: 'var(--accent-dk)', display: 'flex', lineHeight: 1,
          }}>
            <X size={11}/>
          </button>
        </span>
      ))}
      <input type="text" value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => input.trim() && onAdd()}
        placeholder={tags.length === 0 ? placeholder : ''}
        style={{
          border: 'none', outline: 'none', background: 'transparent',
          flex: 1, minWidth: '100px', fontSize: '0.9rem',
          color: 'var(--text-primary)', padding: '0.1rem 0', fontFamily: 'inherit',
        }}/>
    </div>
  )
}

// ── VibeMeter ────────────────────────────────────────────────
function VibeMeter({ dim, value, t }) {
  const pct = Math.round(value * 100)
  return (
    <div style={{ marginBottom: '0.85rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between',
        fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
        <span>{t(dim.lowKey)}</span>
        <span>{t(dim.highKey)}</span>
      </div>
      <div style={{ position: 'relative', height: '6px',
        background: 'var(--brand-blue-lt)', borderRadius: '3px' }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, height: '100%', width: `${pct}%`,
          background: 'linear-gradient(90deg, var(--brand-blue), var(--accent))',
          borderRadius: '3px', transition: 'width 0.5s ease',
        }}/>
        <div style={{
          position: 'absolute', top: '50%', left: `${pct}%`,
          transform: 'translate(-50%, -50%)',
          width: '14px', height: '14px', borderRadius: '50%',
          background: 'var(--accent)', border: '2px solid var(--bg-card)',
          transition: 'left 0.5s ease',
        }}/>
      </div>
    </div>
  )
}
