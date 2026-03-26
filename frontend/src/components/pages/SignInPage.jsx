/**
 * ============================================================
 * pages/SignInPage.jsx — Sign In Form
 * ============================================================
 */

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { signIn, resetPassword } from '../../firebase/authHelpers'
import { LogIn, Mail, Lock } from 'lucide-react'
import styles from './AuthPage.module.css'

export default function SignInPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [resetMsg, setResetMsg] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
      navigate('/account')
    } catch (err) {
      setError(t('auth.errorInvalid'))
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async () => {
    if (!email) { setError('Enter your email first.'); return }
    try {
      await resetPassword(email)
      setResetMsg(t('auth.resetSent'))
    } catch {
      setError(t('errors.generic'))
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.iconWrap}><LogIn size={22}/></div>
          <h2>{t('auth.signIn')}</h2>
        </div>

        {error   && <div className="alert alert-error">{error}</div>}
        {resetMsg && <div className="alert alert-success">{resetMsg}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label><Mail size={13}/> {t('auth.email')}</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required/>
          </div>
          <div className="form-group">
            <label><Lock size={13}/> {t('auth.password')}</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required/>
          </div>

          <button className={`btn btn-primary ${styles.submitBtn}`} disabled={loading}>
            {loading ? <span className="spinner"/> : t('auth.signIn')}
          </button>
        </form>

        <div className={styles.footer}>
          <button className={styles.linkBtn} onClick={handleReset}>
            {t('auth.forgotPassword')}
          </button>
          <span>{t('auth.noAccount')} <Link to="/signup">{t('auth.signUp')}</Link></span>
        </div>
      </div>
    </div>
  )
}
