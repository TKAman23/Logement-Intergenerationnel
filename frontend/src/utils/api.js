/**
 * ============================================================
 * utils/api.js — Backend API Request Helper
 * ============================================================
 *
 * Wraps fetch() to:
 *   - Prepend the VITE_API_URL base
 *   - Attach the Firebase ID token as Authorization header
 *   - Parse JSON responses
 *   - Throw errors with readable messages
 *
 * Usage:
 *   const results = await apiRequest('GET', '/api/matching/results')
 *   const scores  = await apiRequest('POST', '/api/profiles/score', { lifestyle_answers: {...} })
 */

import { getIdToken } from '../firebase/authHelpers'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

/**
 * Make an authenticated request to the FastAPI backend.
 *
 * @param {string} method  - HTTP method: GET, POST, PATCH, DELETE
 * @param {string} path    - API path, e.g. '/api/profiles/score'
 * @param {object} [body]  - Optional JSON body for POST/PATCH
 * @returns {Promise<any>} - Parsed JSON response
 */
export async function apiRequest(method, path, body = null) {
  const token = await getIdToken()

  const headers = {
    'Content-Type': 'application/json',
  }

  // Attach auth token if user is signed in
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const options = {
    method,
    headers,
  }

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body)
  }

  const response = await fetch(`${BASE_URL}${path}`, options)

  // Parse JSON even for error responses (FastAPI sends JSON errors)
  let data
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    const message = data?.detail || `Request failed: ${response.status}`
    throw new Error(message)
  }

  return data
}
