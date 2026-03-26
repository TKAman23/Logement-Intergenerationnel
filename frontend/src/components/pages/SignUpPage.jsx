/**
 * ============================================================
 * pages/SignUpPage.jsx — Registration Form
 * ============================================================
 */

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { signUp } from '../../firebase/authHelpers'
import { UserPlus, User, Mail, Lock } from 'lucide-react'
import styles from './AuthPage.module.css'

export default function SignUpPage() {
  const { t }    = useTranslation()
  const navigate = useNavigate()

  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError(t('auth.errorWeak')); return }
    setLoading(true)
    try {
      await signUp(email, password, name)
      navigate('/profile')  // Go straight to profile on sign-up
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') setError(t('auth.errorExists'))
      else setError(t('errors.generic'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.iconWrap}><UserPlus size={22}/></div>
          <h2>{t('auth.signUp')}</h2>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label><User size={13}/> {t('auth.displayName')}</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required/>
          </div>
          <div className="form-group">
            <label><Mail size={13}/> {t('auth.email')}</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required/>
          </div>
          <div className="form-group">
            <label><Lock size={13}/> {t('auth.password')}</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required/>
          </div>

          <button className={`btn btn-primary ${styles.submitBtn}`} disabled={loading}>
            {loading ? <span className="spinner"/> : t('auth.signUp')}
          </button>
        </form>

        <div className={styles.footer}>
          <span>{t('auth.hasAccount')} <Link to="/signin">{t('auth.signIn')}</Link></span>
        </div>
      </div>
    </div>
  )
}
