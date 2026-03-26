/**
 * ============================================================
 * pages/AboutPage.jsx — Mission & Values Page
 * ============================================================
 */

import { useTranslation } from 'react-i18next'
import { Heart, Shield, Eye, Users } from 'lucide-react'
import styles from './AboutPage.module.css'

export default function AboutPage() {
  const { t } = useTranslation()
  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.hero}>
        <h1>{t('about.title')}</h1>
        <p className={styles.mission}>{t('about.mission')}</p>
      </div>

      <div className={styles.divider}/>

      <h2 className={styles.valuesTitle}>{t('about.values')}</h2>
      <div className={styles.valuesGrid}>
        <ValueCard icon={<Heart size={22}/>} text={t('about.v1')}/>
        <ValueCard icon={<Eye size={22}/>}   text={t('about.v2')}/>
        <ValueCard icon={<Shield size={22}/>} text={t('about.v3')}/>
        <ValueCard icon={<Users size={22}/>} text={t('about.v4')}/>
      </div>
    </div>
  )
}

function ValueCard({ icon, text }) {
  return (
    <div className={`card ${styles.valueCard}`}>
      <span className={styles.valueIcon}>{icon}</span>
      <p>{text}</p>
    </div>
  )
}
