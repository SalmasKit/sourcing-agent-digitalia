# Targetalent — Frontend

React 19 + Vite single-page application for **Targetalent** (*Target Talent*), an AI-native talent sourcing platform built for **Digitalia Solutions**.

---

## Tech Stack

| Tool | Version | Role |
|------|---------|------|
| React | 19 | UI framework |
| Vite | 8 | Dev server & bundler |
| TailwindCSS | 4 | Utility-first styling |
| Lucide React | 1.x | Icon library |
| Axios | 1.x | HTTP client |
| Vitest | 5 | Unit & component testing |
| Oxlint | 1.x | JS/JSX static analysis |
| Nginx | 1.x | Production static server |

---

## Project Structure

```
frontend/
├── index.html                  # App entry point
├── vite.config.js              # Vite + React plugin config
├── vitest.config.js            # Test runner config
├── nginx.conf                  # Production server with OWASP security headers
├── Dockerfile                  # Multi-stage: build -> nginx serve
│
└── src/
    ├── main.jsx                # React root mount
    ├── App.jsx                 # Routing, global state, auth context
    ├── index.css               # Global resets
    ├── App.css                 # App-level styles
    │
    ├── components/             # Feature components
    │   ├── AuthPage.jsx        # Login / register screens
    │   ├── AuthModal.jsx       # Inline auth modal
    │   ├── Navbar.jsx          # Top navigation bar
    │   ├── DashboardView.jsx   # Main dashboard with metrics
    │   ├── SourcingHubView.jsx # AI query console + candidate grid
    │   ├── SearchConsole.jsx   # Natural-language search input
    │   ├── CandidateGridView.jsx      # Paginated candidate cards
    │   ├── CandidateCard.jsx          # Individual candidate card
    │   ├── CandidateDetailPanel.jsx   # Full profile drawer/panel
    │   ├── CandidateComparator.jsx    # Side-by-side comparison
    │   ├── AgentStatusWidget.jsx      # Live LangGraph pipeline status
    │   ├── ActivityLogPanel.jsx       # Search activity timeline
    │   ├── KanbanPipeline.jsx         # Drag-and-drop recruitment pipeline
    │   ├── RecruiterNotesView.jsx     # Per-candidate recruiter notes
    │   ├── JobDescriptionModal.jsx    # Job description editor
    │   ├── TeamManagementView.jsx     # HR Admin user management
    │   ├── SearchMergeModal.jsx       # Merge multiple search results
    │   ├── EditCandidateModal.jsx     # Edit candidate profile
    │   ├── ChangePasswordModal.jsx    # Password change form
    │   ├── ForgotPasswordModal.jsx    # Password reset flow
    │   └── ConfirmationModal.jsx      # Generic confirm dialog
    │
    ├── services/
    │   └── api.js              # Axios instance + all API calls (auth, search, profiles)
    │
    ├── context/                # React context providers (auth, i18n, ...)
    ├── locales/                # i18n translation files
    ├── styles/                 # Shared CSS modules
    └── utils/                  # Helper functions
```

---

## Getting Started

### Development

```bash
npm install
npm run dev          # http://localhost:5173
```

The dev server proxies `/api` requests to `http://localhost:8081` (Spring Boot). Configure the target in `vite.config.js`.

### Environment Variables

Copy and populate:

```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | Spring Boot backend URL (default: `http://localhost:8081`) |

### Production Build

```bash
npm run build        # outputs to dist/
```

The `Dockerfile` automates this — the output is served by Nginx with OWASP-recommended security headers.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Production bundle → `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm test` | Run Vitest in watch mode |
| `npm run test:coverage` | Coverage report |
| `npm run lint` | Oxlint static analysis |

---

## Key Views

| View | Component | Description |
|------|-----------|-------------|
| Login / Register | `AuthPage.jsx` | JWT-based authentication |
| Dashboard | `DashboardView.jsx` | KPIs, recent searches, team activity |
| Sourcing Hub | `SourcingHubView.jsx` | AI query → ranked candidate results |
| Candidate Detail | `CandidateDetailPanel.jsx` | Full profile, score breakdown, notes |
| Comparison | `CandidateComparator.jsx` | Side-by-side candidate comparison |
| Kanban | `KanbanPipeline.jsx` | Drag-and-drop recruitment stages |
| Team Management | `TeamManagementView.jsx` | User management (HR_ADMIN only) |

---

## Testing

```bash
npm test                  # watch mode
npm run test:coverage     # V8 coverage report in coverage/
npm run lint              # Oxlint JS/JSX static analysis
```

Tests live in `src/__tests__/` and `src/test/`.
