<p align="center">
  <img src="targetalent.svg" alt="Targetalent Logo" width="420" />
</p>

<h1 align="center">Targetalent — AI Sourcing Agent for Digitalia Solutions</h1>

<p align="center">
  <em>Target the right Talent.</em>
</p>

> **Targetalent** (*Target Talent*) is an AI-powered talent sourcing platform built for **Digitalia Solutions**. It turns a plain-language recruiter query into a ranked, enriched shortlist of qualified candidates in seconds.

---

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Microservices & Components](#microservices--components)
  - [Frontend (React 19 + Vite)](#frontend-react-19--vite)
  - [Backend (Spring Boot 3.3 / Java 21)](#backend-spring-boot-33--java-21)
  - [AI Agent Service (Python 3.12 / LangGraph)](#ai-agent-service-python-312--langgraph)
  - [Observability (Prometheus + Grafana)](#observability-prometheus--grafana)
  - [Test Suites (Unit, Integration, k6 Load)](#test-suites-unit-integration-k6-load)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Configuration](#environment-configuration)
  - [Running with Docker Compose](#running-with-docker-compose)
  - [Running Individual Services Locally](#running-individual-services-locally)
- [Port Map](#port-map)
- [API Reference](#api-reference)
- [DevSecOps & Security Lifecycle](#devsecops--security-lifecycle)
- [Project Structure](#project-structure)
- [License](#license)

---

## Overview

**Targetalent** is a full-stack, enterprise-grade AI sourcing platform built for **Digitalia Solutions**. Instead of manual keyword searches across multiple sourcing channels, recruiters submit natural language queries (e.g. *"Senior Java developer with Spring Boot, Paris, 5+ years experience"*).

The platform autonomously:
1. **Interprets** the recruiter's prompt using Llama 3.3 70B (via Groq) to extract structured criteria (skills, experience, location, seniority).
2. **Searches** for live candidate profiles via SerpAPI (Google X-Ray on LinkedIn) and enriches them with verified professional data via Apollo.io.
3. **Scores** profiles with a **5-dimension hybrid scoring engine** combining skill overlap, experience levels, location matching, local vector embeddings (`all-MiniLM-L6-v2`), and LLM qualitative justifications.
4. **Enriches** profiles with LinkedIn details and verified contact metadata.
5. **Presents** ranked results in an interactive React UI featuring candidate comparison, pipeline stage tracking, notes, and export.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             Browser (React 19)                              │
│             Vite • TailwindCSS • Lucide React • Axios • Context API         │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ REST / JSON (Stateless JWT Bearer)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Spring Boot 3.3 Backend (:8081)                          │
│   Java 21 Virtual Threads • Spring Security 6 • JJWT • Flyway • Bucket4j    │
│   Roles: RECRUITER / HR_ADMIN / SUPER_ADMIN                                 │
└───────────────────┬─────────────────────────────────────┬───────────────────┘
                    │                                     │
                    │ WebClient (Async / Retry)           │ JPA / Hibernate
                    ▼                                     ▼
┌──────────────────────────────────────┐  ┌───────────────────────────────────┐
│     Agent Service (:8001)            │  │  PostgreSQL 16 + pgvector (:5432) │
│ Python 3.12 • FastAPI • LangGraph    │  │  Flyway Migrations • JSONB GIN    │
│ Groq Llama 3.3 70B • FastMCP Tools   │  │  Candidate Profiles & Auditing    │
│ sentence-transformers Local Vectors  │  └───────────────────────────────────┘
└──────────────────────────────────────┘
                    │
                    ▼
       Metrics Scraped by Prometheus (:9090) ──► Grafana Dashboards (:3001)
```

---

## Microservices & Components

Each service is self-contained with its own dedicated documentation:

### Frontend (React 19 + Vite)
- **Directory:** [`frontend/`](./frontend)
- **Tech:** React 19, Vite 8, TailwindCSS 4, Lucide React, Vitest, Oxlint
- **Documentation:** [`frontend/README.md`](./frontend/README.md)
- **Highlights:** Dynamic Sourcing Hub query console, Candidate Grid, side-by-side comparison modal, drag-and-drop recruitment stage pipeline, and Nginx production server with OWASP security headers.

### Backend (Spring Boot 3.3 / Java 21)
- **Directory:** [`backend-spring/`](./backend-spring)
- **Tech:** Java 21 (Project Loom Virtual Threads), Spring Boot 3.3.5, Spring Security 6, JJWT 0.12, Spring Data JPA, PostgreSQL 16, Flyway, Bucket4j, Testcontainers
- **Documentation:** [`backend-spring/README.md`](./backend-spring/README.md)
- **Highlights:** Domain-driven structure (`domain/auth`, `domain/search`, `domain/profile`), non-blocking WebClient with exponential backoff to agent-service, sliding-window rate limiting per IP, and >93% application code test coverage.

### AI Agent Service (Python 3.12 / LangGraph)
- **Directory:** [`agent-service/`](./agent-service)
- **Tech:** Python 3.12, FastAPI, LangGraph, Groq (Llama 3.3 70B), sentence-transformers (`all-MiniLM-L6-v2`), FastMCP, SerpAPI, Apollo.io
- **Documentation:** [`agent-service/README.md`](./agent-service/README.md)
- **Highlights:** Stateful 4-node `StateGraph` (`interpret_request` → `search_profiles` → `score_profiles` → `format_output`), 5-dimension hybrid scoring engine, and FastMCP tools for real-time candidate search and enrichment.

### Observability (Prometheus + Grafana)
- **Directory:** [`observability/`](./observability)
- **Tech:** Prometheus v2.54, Grafana v11
- **Documentation:** [`observability/README.md`](./observability/README.md)
- **Highlights:** Authenticated scraping of Spring Boot Actuator `/actuator/prometheus`, pre-provisioned Grafana dashboards tracking JVM metrics, HTTP latency percentiles, error rates, and sourcing throughput.

### Test Suites (Unit, Integration, k6 Load)
- **Directory:** [`tests/`](./tests)
- **Tech:** JUnit 5, Testcontainers, Pytest, Vitest, k6
- **Documentation:** [`tests/README.md`](./tests/README.md) • [`tests/load/README.md`](./tests/load/README.md)
- **Highlights:** Smoke, load, stress, and soak test scripts validating system endurance under concurrent traffic.

---

## Port Map

| Component | Host Port | Container Port | Protocol | Notes |
|-----------|-----------|----------------|----------|-------|
| **Frontend** | `80` | `80` | HTTP | Production Nginx web server |
| **Frontend (Dev)** | `5173` | `5173` | HTTP | Vite development server with HMR |
| **Backend API** | `8081` | `8080` | HTTP | Spring Boot REST API & Swagger UI |
| **Agent Service** | `8001` | `8001` | HTTP | FastAPI AI agent REST & MCP server |
| **PostgreSQL** | `5432` | `5432` | TCP | Primary database with `pgvector` |
| **Prometheus** | `9090` | `9090` | HTTP | Metrics scraper & PromQL console |
| **Grafana** | `3001` | `3000` | HTTP | Pre-provisioned dashboards (`admin`/`admin`) |
| **Mailpit** | `8025` | `8025` | HTTP | Local mock SMTP web interface |

---

## Getting Started

### Prerequisites

| Prerequisite | Recommended Version |
|--------------|---------------------|
| **Docker Desktop** | 4.x (with Docker Compose v2) |
| **PowerShell** | 7+ (for `build.ps1` automated builds) |
| **Java JDK** | 21 (Eclipse Temurin) |
| **Node.js** | 20+ LTS |
| **Python** | 3.12+ |

---

### Environment Configuration

Create your local `.env` file from the provided template:

```bash
cp .env.example .env
```

Key environment variables:
```properties
# Groq API for LLM Inference
GROQ_API_KEY=gsk_your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile

# Candidate Search & Enrichment APIs
SERPAPI_API_KEY=your_serpapi_api_key
APOLLO_API_KEY=your_apollo_api_key

# Security & JWT
JWT_SECRET=generate-a-secure-256-bit-random-secret-key-here-1234567890
METRICS_SCRAPER_PASSWORD=secure_scraper_password

# Database Credentials
POSTGRES_DB=sourcing_db
POSTGRES_USER=sourcing_user
POSTGRES_PASSWORD=sourcing_secret
```

---

### Running with Docker Compose

**Option 1 — Build and launch the entire stack in one shot:**

```powershell
# On Windows PowerShell:
.\build.ps1
docker compose up -d
```

**Option 2 — Start services directly via Compose:**

```bash
docker compose up -d --build
```

Once running:
- **Application Web UI:** [http://localhost](http://localhost) (or `http://localhost:5173` in dev mode)
- **Backend Swagger UI:** [http://localhost:8081/swagger-ui/index.html](http://localhost:8081/swagger-ui/index.html)
- **Agent Service Docs:** [http://localhost:8001/docs](http://localhost:8001/docs)
- **Grafana Dashboards:** [http://localhost:3001](http://localhost:3001) (`admin` / `admin`)
- **Mailpit Web Mailbox:** [http://localhost:8025](http://localhost:8025)

To shut down the platform:
```bash
docker compose down
```

---

### Running Individual Services Locally

#### 1. Start PostgreSQL
```bash
docker compose up postgres mailpit -d
```

#### 2. Start Agent Service (Python)
```bash
cd agent-service
python -m venv .venv
.venv\Scripts\Activate.ps1    # On Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
uvicorn src.main:app --port 8001 --reload
```

#### 3. Start Backend (Spring Boot)
```bash
cd backend-spring
./mvnw spring-boot:run
```

#### 4. Start Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```

---

## API Reference

### Backend Service (`:8081`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/auth/register` | Register a new user | Public |
| `POST` | `/api/auth/login` | Authenticate user & return JWT tokens | Public |
| `POST` | `/api/auth/refresh` | Rotate access token via refresh token | Public |
| `GET`  | `/api/auth/me` | Fetch authenticated recruiter profile | Bearer JWT |
| `POST` | `/api/search` | Trigger AI sourcing query | `RECRUITER+` |
| `GET`  | `/api/search/{id}` | Poll search status & retrieve candidate results | `RECRUITER+` |
| `GET`  | `/api/candidates` | List & filter candidate profiles | `RECRUITER+` |
| `PATCH`| `/api/candidates/{id}/stage` | Transition candidate recruitment stage | `RECRUITER+` |
| `GET`  | `/actuator/prometheus` | Prometheus metric scrape endpoint | Basic Auth |

### Agent Service (`:8001`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/health` | Healthcheck (Groq status & search provider) |
| `POST` | `/api/search` | Execute complete 4-node LangGraph pipeline |
| `POST` | `/api/score` | Score an isolated profile against criteria |
| `GET`  | `/api/models` | List available Groq models |
| `GET`  | `/docs` | Interactive Swagger UI |

---

## DevSecOps & Security Lifecycle

The platform adheres to a **5-Pillar Security Lifecycle** implemented through 7 automated GitHub Actions workflows:

| Pillar | Focus | Automated Tools & Standards |
|--------|-------|-----------------------------|
| **1. Code Security** | SAST & Secret Detection | SonarQube • Bandit • Ruff • Oxlint • Gitleaks |
| **2. Supply Chain** | Dependency Vulnerabilities & SBOM | Dependabot • OWASP Dependency-Check (CVSS $\ge 7$) • Trivy • CycloneDX |
| **3. Container & IaC** | Hardening & Configurations | Checkov • Trivy IaC • Minimal base images • Non-root users |
| **4. Runtime Security** | Dynamic Testing & Defense | OWASP ZAP • Strict CSP/HSTS headers • BCrypt (Workload 12) • Bucket4j Rate Limiting |
| **5. Observability** | Security Operations & Auditing | Prometheus Basic Auth • Grafana monitoring • Structured JSON audit logs |

Security gates run automatically across CI/CD pipelines defined in [`.github/workflows/`](./.github/workflows). See [`.github/workflows/README.md`](./.github/workflows/README.md) for full pipeline specs.

---

## Project Structure

```
sourcing-agent-project/
├── .env.example                            # Root environment template
├── .gitleaks.toml                          # Secret scanning rules
├── build.ps1                               # One-shot build script for all images
├── docker-compose.yml                      # Full-stack Docker orchestration (7 services)
├── README.md                               # Global architecture & getting started guide
│
├── frontend/                               # React 19 + Vite Single-Page Application
│   ├── README.md                           # Frontend architecture & component documentation
│   ├── nginx.conf                          # Production web server with OWASP headers
│   ├── Dockerfile                          # Multi-stage build (Node -> Nginx)
│   └── src/                                # Components, context, and Axios services
│
├── backend-spring/                         # Spring Boot 3.3 + Java 21 REST API
│   ├── README.md                           # Backend overview, setup, and REST endpoints
│   ├── Dockerfile                          # Eclipse Temurin 21 JRE container
│   ├── pom.xml                             # Dependencies (Virtual Threads, JJWT, Flyway)
│   └── src/                                # Domain-driven modules & Flyway migrations
│
├── agent-service/                          # Python 3.12 FastAPI + LangGraph AI Service
│   ├── README.md                           # Agent service overview, pipeline, & scoring
│   ├── Dockerfile                          # Python 3.12 non-root container
│   └── src/                                # LangGraph StateGraph, FastMCP tools, scoring
│
├── observability/                          # Telemetry & Monitoring Infrastructure
│   ├── README.md                           # Metrics architecture & dashboard guide
│   ├── prometheus/                         # prometheus.yml scrape configuration
│   └── grafana/                            # Provisioned datasources & visual dashboards
│
├── tests/                                  # Multi-Tier Quality Assurance Suites
│   ├── README.md                           # End-to-end testing matrix guide
│   └── load/                               # k6 performance, smoke, stress, & soak scripts
│
└── .github/                                # CI/CD & DevSecOps Workflows
    ├── dependabot.yml                      # Automated dependency update configuration
    └── workflows/                          # 7 GitHub Actions automated security & CI pipelines
        └── README.md                       # DevSecOps 5-pillar lifecycle & workflow guide
```

---

## License

Built for **Digitalia Solutions**. All rights reserved.
