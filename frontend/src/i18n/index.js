/**
 * ============================================================
 * i18n/index.js — react-i18next Configuration
 * ============================================================
 *
 * Initializes i18next with English and French translations.
 * Language preference is persisted to localStorage.
 * Default language is French (primary audience), fallback English.
 */

import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en.json'
import fr from './fr.json'

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
    },
    // Default to saved language, then browser language, then French
    lng: localStorage.getItem('lang') ||
         (navigator.language.startsWith('en') ? 'en' : 'fr'),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React handles XSS escaping
    },
  })

// Persist language choice whenever it changes
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('lang', lng)
  // Update the HTML lang attribute for accessibility
  document.documentElement.lang = lng
})

export default i18n
