/**
 * ============================================================
 * pages/HomePage.jsx — Main Landing Page
 * ============================================================
 *
 * Sections:
 *   1. Hero — tagline, CTA buttons
 *   2. Stats — key numbers (proof/social validation)
 *   3. How It Works — 4-step flow with icons
 *   4. Benefits — 4 benefit cards
 */

import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import {
  ArrowRight, Heart, Home, Users, TrendingUp,
  UserCheck, Brain, MessageCircle, Handshake,
  Shield, Sparkles, TreePine, Building2
} from 'lucide-react'
import styles from './HomePage.module.css'

export default function HomePage() {
  const { t }  = useTranslation()
  const { user } = useAuth()

  return (
    <div className={styles.page}>

      {/* ── Hero Section ─────────────────────────────── */}
      <section className={styles.hero}>
        <div className={`container ${styles.heroInner}`}>

          {/* Left: Text content */}
          <div className={styles.heroText}>
            <div className={styles.heroBadge}>
              <Heart size={13} fill="var(--accent)" stroke="none"/>
              Logement Intergénérationnel
            </div>

            <h1 className={styles.heroTitle}>
              {t('home.hero.title')}<br/>
              <span className={styles.heroAccent}>{t('home.hero.titleAccent')}</span>
            </h1>

            <p className={styles.heroSubtitle}>{t('home.hero.subtitle')}</p>

            <div className={styles.heroCTAs}>
              <Link
                to={user ? '/matches' : '/signup'}
                className="btn btn-primary"
                style={{ fontSize: '1rem', padding: '0.75rem 1.75rem' }}
              >
                {t('home.hero.cta')} <ArrowRight size={16}/>
              </Link>
              <Link
                to="/about"
                className="btn btn-secondary"
                style={{ fontSize: '1rem', padding: '0.75rem 1.75rem' }}
              >
                {t('home.hero.ctaSecondary')}
              </Link>
            </div>
          </div>

          {/* Right: Illustrated SVG scene */}
          <div className={styles.heroIllustration} aria-hidden="true">
            <HeroIllustration />
          </div>
        </div>
      </section>

      {/* ── Stats Bar ────────────────────────────────── */}
      <section className={styles.statsBar}>
        <div className="container">
          <div className={styles.statsGrid}>
            <StatItem value="1,240+" label={t('home.stats.matches')} icon={<Handshake size={20}/>}/>
            <StatItem value="32"     label={t('home.stats.cities')}  icon={<Building2 size={20}/>}/>
            <StatItem value="94%"    label={t('home.stats.satisfaction')} icon={<TrendingUp size={20}/>}/>
            <StatItem value="$480"   label={t('home.stats.saved')}   icon={<Shield size={20}/>}/>
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────── */}
      <section className={`section ${styles.howSection}`}>
        <div className="container">
          <h2 className={styles.sectionTitle}>{t('home.howItWorks.title')}</h2>

          <div className={styles.stepsGrid}>
            <StepCard
              num="01"
              icon={<UserCheck size={26}/>}
              title={t('home.howItWorks.step1Title')}
              desc={t('home.howItWorks.step1Desc')}
            />
            <StepCard
              num="02"
              icon={<Brain size={26}/>}
              title={t('home.howItWorks.step2Title')}
              desc={t('home.howItWorks.step2Desc')}
            />
            <StepCard
              num="03"
              icon={<Users size={26}/>}
              title={t('home.howItWorks.step3Title')}
              desc={t('home.howItWorks.step3Desc')}
            />
            <StepCard
              num="04"
              icon={<MessageCircle size={26}/>}
              title={t('home.howItWorks.step4Title')}
              desc={t('home.howItWorks.step4Desc')}
            />
          </div>
        </div>
      </section>

      {/* ── Benefits ─────────────────────────────────── */}
      <section className={`section ${styles.benefitsSection}`}>
        <div className="container">
          <h2 className={styles.sectionTitle}>{t('home.benefits.title')}</h2>

          <div className={styles.benefitsGrid}>
            <BenefitCard
              icon={<Home size={28}/>}
              title={t('home.benefits.b1Title')}
              desc={t('home.benefits.b1Desc')}
              color="var(--accent)"
            />
            <BenefitCard
              icon={<Heart size={28}/>}
              title={t('home.benefits.b2Title')}
              desc={t('home.benefits.b2Desc')}
              color="var(--brand-blue)"
            />
            <BenefitCard
              icon={<Sparkles size={28}/>}
              title={t('home.benefits.b3Title')}
              desc={t('home.benefits.b3Desc')}
              color="var(--success)"
            />
            <BenefitCard
              icon={<TreePine size={28}/>}
              title={t('home.benefits.b4Title')}
              desc={t('home.benefits.b4Desc')}
              color="var(--accent-dk)"
            />
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ───────────────────────────────── */}
      {!user && (
        <section className={styles.bottomCTA}>
          <div className="container">
            <div className={styles.ctaBox}>
              <h2>Ready to find your match?</h2>
              <p>Join hundreds of households already living better, together.</p>
              <Link to="/signup" className="btn btn-primary" style={{ marginTop: '1rem', fontSize: '1rem' }}>
                Get Started — It's Free <ArrowRight size={16}/>
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────

function StatItem({ value, label, icon }) {
  return (
    <div className={styles.statItem}>
      <span className={styles.statIcon}>{icon}</span>
      <span className={styles.statValue}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  )
}

function StepCard({ num, icon, title, desc }) {
  return (
    <div className={styles.stepCard}>
      <div className={styles.stepNum}>{num}</div>
      <div className={styles.stepIconWrap}>{icon}</div>
      <h3>{title}</h3>
      <p>{desc}</p>
    </div>
  )
}

function BenefitCard({ icon, title, desc, color }) {
  return (
    <div className={`card ${styles.benefitCard}`}>
      <div className={styles.benefitIcon} style={{ color }}>
        {icon}
      </div>
      <h3>{title}</h3>
      <p>{desc}</p>
    </div>
  )
}

// ── Hero SVG Illustration ────────────────────────────────────
// An abstract intergenerational scene — elder and youth in a home
function HeroIllustration() {
  return (
    <svg
      viewBox="0 0 400 340"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={styles.heroSvg}
    >
      {/* Background house shape */}
      <path d="M60 180 L200 60 L340 180 L340 310 L60 310 Z"
        fill="var(--brand-blue-lt)" opacity="0.6"/>

      {/* Roof */}
      <path d="M40 190 L200 50 L360 190"
        stroke="var(--accent)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>

      {/* Door */}
      <rect x="165" y="230" width="70" height="80" rx="35" fill="var(--accent)" opacity="0.7"/>
      <circle cx="228" cy="272" r="5" fill="var(--bg-card)"/>

      {/* Left window (elder) */}
      <rect x="85" y="190" width="70" height="70" rx="8" fill="var(--bg-card)" opacity="0.9"/>
      {/* Elder figure — rounder, with cane */}
      <circle cx="120" cy="210" r="14" fill="var(--brand-blue)" opacity="0.8"/>
      <path d="M113 228 Q120 245 127 228" stroke="var(--brand-blue)" strokeWidth="3" fill="none"/>
      <line x1="110" y1="235" x2="108" y2="252" stroke="var(--brand-blue)" strokeWidth="2.5"/>
      {/* Grey hair suggestion */}
      <path d="M109 208 Q120 198 131 208" stroke="var(--text-muted)" strokeWidth="2" fill="none"/>

      {/* Right window (youth) */}
      <rect x="245" y="190" width="70" height="70" rx="8" fill="var(--bg-card)" opacity="0.9"/>
      {/* Youth figure — taller, energetic pose */}
      <circle cx="280" cy="208" r="13" fill="var(--accent)" opacity="0.8"/>
      <path d="M272 226 Q280 240 288 226" stroke="var(--accent)" strokeWidth="3" fill="none"/>
      {/* Arms raised slightly */}
      <line x1="272" y1="232" x2="264" y2="222" stroke="var(--accent)" strokeWidth="2.5"/>
      <line x1="288" y1="232" x2="296" y2="222" stroke="var(--accent)" strokeWidth="2.5"/>

      {/* Heart connecting the two */}
      <path d="M186 175 C186 168 196 162 200 170 C204 162 214 168 214 175 C214 182 200 195 200 195 C200 195 186 182 186 175Z"
        fill="var(--accent)" opacity="0.7"/>

      {/* Stars/sparkles */}
      <circle cx="155" cy="100" r="3" fill="var(--accent)" opacity="0.5"/>
      <circle cx="250" cy="90"  r="2" fill="var(--brand-blue)" opacity="0.6"/>
      <circle cx="320" cy="140" r="3" fill="var(--accent)" opacity="0.4"/>
      <circle cx="80"  cy="150" r="2" fill="var(--brand-blue)" opacity="0.5"/>

      {/* Ground line with grass tufts */}
      <line x1="30" y1="310" x2="370" y2="310" stroke="var(--border)" strokeWidth="2"/>
      <path d="M90 310 Q95 295 100 310" stroke="var(--success)" strokeWidth="2.5" fill="none"/>
      <path d="M290 310 Q295 295 300 310" stroke="var(--success)" strokeWidth="2.5" fill="none"/>
      <path d="M190 310 Q195 298 200 310" stroke="var(--success)" strokeWidth="2" fill="none"/>
    </svg>
  )
}
