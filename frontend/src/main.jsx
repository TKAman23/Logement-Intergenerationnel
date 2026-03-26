/**
 * ============================================================
 * main.jsx — React App Entry Point
 * ============================================================
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './i18n/index.js'        // Initialize i18next (EN/FR)
import './styles/globals.css'   // Global CSS variables + reset

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
