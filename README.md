# 🏠 Logement Intergénérationnel

> AI-powered intergenerational housing matching platform — connecting elders with young people for mutual benefit, companionship, and affordable living.

---

## 📋 Project Overview

This is a hackathon proof-of-concept for an intergenerational cohousing matchmaking platform. The system:

- Collects detailed personality/lifestyle profiles from both elders and young people
- Scores each profile across 8 "vibe" dimensions using free HuggingFace NLP models
- Matches candidates based on vibe compatibility, rent tolerance, location, lifestyle, and preferences
- Provides a bilingual (EN/FR) UI with a clean, accessible design

---

## 🏗️ Architecture

```
logement-intergenerationnel/
├── frontend/          # React + Vite app (Firebase Hosting)
│   └── src/
│       ├── components/   # UI, layout, pages, matching components
│       ├── context/      # Auth + Theme context providers
│       ├── hooks/        # Custom React hooks
│       ├── i18n/         # EN/FR translation files
│       ├── firebase/     # Firebase config + helpers
│       ├── utils/        # Shared utilities
│       └── styles/       # Global CSS variables + themes
├── backend/           # FastAPI app (Render)
│   └── app/
│       ├── routers/      # API route handlers
│       ├── models/       # Pydantic data models
│       ├── services/     # Business logic (scoring, matching)
│       └── utils/        # Firebase admin + helpers
└── docs/              # Architecture notes
```

### Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + React Router v6 |
| Styling | CSS Modules + CSS Variables (dark/light) |
| i18n | react-i18next |
| Auth & DB | Firebase Auth + Firestore |
| File Storage | Firebase Storage (profile photos) |
| Backend | FastAPI (Python 3.11) |
| NLP | HuggingFace Transformers (free models) |
| Hosting | Firebase Hosting + Render |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- Firebase project (free Spark plan works)
- Git

---

### 1. Clone & Setup

```bash
git clone https://github.com/YOUR_USERNAME/logement-intergenerationnel.git
cd logement-intergenerationnel
```

---

### 2. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project called `logement-intergenerationnel`
3. Enable **Authentication** → Email/Password
4. Enable **Firestore Database** (start in test mode)
5. Enable **Storage**
6. Enable **Hosting**
7. Go to Project Settings → Add Web App → copy the config object

---

### 3. Frontend Setup

```bash
cd frontend
npm install

# Create environment file
cp .env.example .env.local
# Fill in your Firebase config values in .env.local
```

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Deploy to Firebase Hosting
npm run deploy
```

---

### 4. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Download HuggingFace models (first run only — ~500MB total)
python app/services/download_models.py

# Create environment file
cp .env.example .env
# Fill in your Firebase service account credentials
```

```bash
# Run development server
uvicorn app.main:app --reload --port 8000

# The API docs will be at http://localhost:8000/docs
```

---

### 5. Deploying Backend to Render

1. Push your code to GitHub
2. Go to [Render.com](https://render.com) → New Web Service
3. Connect your GitHub repo
4. Set root directory to `backend/`
5. Build command: `pip install -r requirements.txt`
6. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
7. Add environment variables from your `.env` file
8. Note your Render URL and update `VITE_API_URL` in frontend `.env`

---

## 🧠 Vibe Scoring System

Each profile answer is run through HuggingFace models to extract scores (0.0–1.0) across 8 dimensions:

| Dimension | Model Used | Description |
|-----------|-----------|-------------|
| Introvert/Extrovert | `Minej/bert-base-socialmedia` | Social energy preference |
| Quiet/Energetic | `cardiffnlp/twitter-roberta-base-sentiment` | Activity level |
| Friendliness | `j-hartmann/emotion-english-distilroberta-base` (joy proxy) | Warmth & openness |
| Assertiveness | Custom lexicon | Directness & confidence |
| Empathy | `j-hartmann/emotion-english-distilroberta-base` | Emotional sensitivity |
| Inquisitiveness | Custom lexicon | Curiosity & learning |
| Noisiness | Custom lexicon | Tolerance for/creation of noise |
| Early Bird/Night Owl | Custom lexicon | Schedule preference |

### Matching Score Formula

```
match_score = Σ |candidate_vibe[i] - preference_vibe[i]| × weight[i]
            + |rent_candidate - rent_preference| × rent_weight
            + location_penalty (0 if match, large if mismatch)
            + interest_overlap_bonus
            + lifestyle_penalties (pets, smoking, etc.)
```

Lower score = better match. Top N matches are returned sorted ascending.

---

## 📁 Firestore Data Model

```
users/{uid}
  ├── displayName: string
  ├── email: string
  ├── role: "elder" | "youth" | "either"
  ├── photoURL: string | null
  ├── createdAt: timestamp
  ├── profile: {
  │     location: "urban" | "suburban" | "rural"
  │     bio: string
  │     rent_offer: number        # For elders: what they charge
  │     rent_budget: number       # For youth: max they'll pay
  │     pets: boolean
  │     smoking: boolean
  │     languages: string[]
  │     interests: string[]
  │     commitment_hours: number  # Hours/week of shared time expected
  │     lifestyle_answers: {      # Free-text answers to prompts
  │         q1: string, q2: string, ... q8: string
  │     }
  │     vibe_scores: {            # Computed by backend
  │         introvert_extrovert: float
  │         quiet_energetic: float
  │         friendliness: float
  │         assertiveness: float
  │         empathy: float
  │         inquisitiveness: float
  │         noisiness: float
  │         early_night: float
  │     }
  │     vibe_preferences: {       # What they want in a match
  │         introvert_extrovert: float
  │         ... (same keys)
  │     }
  │   }
  └── connections: string[]       # UIDs of accepted connections

connections/{connectionId}
  ├── from_uid: string
  ├── to_uid: string
  ├── status: "pending" | "accepted" | "declined"
  ├── createdAt: timestamp
  └── message: string
```

---

## 🌍 Bilingual Support

All UI strings are in `/frontend/src/i18n/en.json` and `/frontend/src/i18n/fr.json`.
Language is toggled in the navbar and persisted to `localStorage`.

---

## 🤝 Contributing / Hackathon Notes

This is a proof-of-concept. Key areas for improvement post-hackathon:

- Real-time connection notifications (Firebase onSnapshot)
- More sophisticated matching (ML-based collaborative filtering)
- Video profile introductions
- Admin dashboard for moderation
- Accessibility audit (WCAG AA)
