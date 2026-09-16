# Targetalent — AI Agent Service

The artificial intelligence core of **Targetalent** (*Target Talent*), an autonomous talent sourcing platform built for **Digitalia Solutions**.

Built with **Python 3.12**, **FastAPI**, **LangGraph**, and **FastMCP**, this microservice processes natural language queries from recruiters, queries candidate talent pools, executes hybrid semantic and heuristic scoring, and generates LLM-backed rationales.

---

## Tech Stack & Architecture

| Component | Technology | Role |
|-----------|------------|------|
| **Runtime** | Python 3.12 | Async Python runtime |
| **API Framework** | FastAPI >= 0.115 | Asynchronous REST API, CORS middleware, lifespan events |
| **AI Orchestration** | LangGraph >= 0.2 | Stateful DAG workflow (`StateGraph`) connecting sourcing stages |
| **LLM Inference** | Groq API (Llama 3.3 70B Versatile) | Low-latency query interpretation and qualitative candidate justifications |
| **Embeddings** | `sentence-transformers` (`all-MiniLM-L6-v2`) | Local, CPU-optimized semantic similarity vectors |
| **Protocol / Tools** | FastMCP >= 2.0 | Model Context Protocol server exposing tool capabilities |
| **Sourcing Integration**| SerpAPI / Apollo.io | Google/LinkedIn candidate search & LinkedIn profile enrichment |
| **Configuration** | Pydantic Settings v2 | Strictly typed configuration loaded from `.env` |
| **Quality & Security** | Ruff, Pyright, Bandit, Pytest | SAST security scans, static typing, and automated unit test suite |

---

## LangGraph 4-Node Pipeline

The core intelligence is modeled as a compiled `StateGraph` running an asynchronous four-node pipeline:

```
Recruiter Query ("Senior React developer with TypeScript, Rabat, 5+ yrs")
                               │
                               ▼
     ┌───────────────────────────────────────────────────┐
     │  Node 1: interpret_request                        │
     │  • Invokes Llama 3.3 70B via Groq                 │
     │  • Extracts structured criteria (skills, exp, loc) │
     │  • Graceful regex fallback if API key not set     │
     └───────────────────────────────────────────────────┘
                               │
                               ▼
     ┌───────────────────────────────────────────────────┐
     │  Node 2: search_node                              │
     │  • Executes MCP search_profiles tool              │
     │  • Fetches live candidate profiles via SerpAPI    │
     │  • Returns up to 8 candidate profile objects      │
     └───────────────────────────────────────────────────┘
                               │
                               ▼
     ┌───────────────────────────────────────────────────┐
     │  Node 3: score_node                               │
     │  • Runs 5-dimension hybrid scoring engine         │
     │  • Computes embeddings cosine similarity (async)  │
     │  • Assembles Groq qualitative match evaluations   │
     │  • Sorts candidate profiles by descending score   │
     └───────────────────────────────────────────────────┘
                               │
                               ▼
     ┌───────────────────────────────────────────────────┐
     │  Node 4: format_output                            │
     │  • Constructs standardized response payload       │
     │  • Generates executive summary for recruiter      │
     └───────────────────────────────────────────────────┘
                               │
                               ▼
     Final Ranked Candidates Payload → Spring Boot Backend
```

### Shared State Schema (`SourcingState`)
All nodes mutate and pass a central typed dictionary:
- `raw_query`: The initial natural-language prompt.
- `job_id`: Optional identifier linking to a job opening.
- `criteria`: Structured JSON parameters extracted from the prompt.
- `raw_profiles`: Profiles returned from the search tool.
- `scored_profiles`: Profiles with normalized scores and qualitative explanations.
- `final_output`: Polished response delivered to the backend.
- `error`: Non-fatal error logs enabling resilient degradation.

---

## 5-Dimension Hybrid Scoring Engine

Profiles are evaluated using a multi-factor scoring formula:

$$\text{Base Score} = (0.40 \times \text{Skill}) + (0.25 \times \text{Exp}) + (0.20 \times \text{Loc}) + (0.15 \times \text{Embedding})$$

$$\text{Final Score} = 0.50 \times \text{Base Score} + 0.50 \times \text{LLM Score}$$

| Dimension | Weight | Evaluation Method |
|-----------|--------|-------------------|
| **Skill Overlap** | **40%** | Exact matches + fuzzy alias detection against required and optional skills |
| **Experience** | **25%** | `years_of_experience` measured against minimum required seniority |
| **Location Match** | **20%** | Target city/country match, with remote policy tolerance |
| **Semantic Embedding** | **15%** | Cosine similarity between query embedding and profile bio/skills embedding |
| **LLM Qualitative Evaluation** | **50% Blend** | Llama 3.3 70B evaluates career trajectory, relevance, and red flags |

### Match Level Tiers
- **Strong Match ($\ge 80$):** High alignment across skills, seniority, and domain relevance.
- **Good Match ($\ge 65$):** Core competencies met with minor seniority or secondary skill gaps.
- **Partial Match ($\ge 45$):** Potential transferable skills but misses primary criteria.
- **Not Recommended ($< 45$):** Insufficient overlap with requested profile.

---

## Directory Structure

```
agent-service/
├── pyproject.toml              # Project dependencies, build setup, ruff & pytest config
├── pyrightconfig.json          # Type checker configuration
├── requirements.txt            # Locked pip dependencies
├── Dockerfile                  # Python 3.12-slim non-root container image
├── run.py                      # Uvicorn entrypoint script
├── README.md                   # Complete service & architecture documentation
├── sonar-project.properties    # SonarQube quality gate rules
├── .env.example                # Template for service environment variables
│
├── src/
│   ├── main.py                 # FastAPI application instantiation & lifespan
│   ├── config.py               # Pydantic Settings with lru_cache
│   │
│   ├── agent/                  # LangGraph StateGraph pipeline
│   │   ├── state.py            # SourcingState TypedDict definition
│   │   ├── graph.py            # Graph assembly & node definitions
│   │   └── prompts.py          # Llama 3.3 system and few-shot prompts
│   │
│   ├── api/
│   │   └── routes.py           # /health, /api/search, /api/score, /api/models
│   │
│   ├── embeddings/
│   │   └── client.py           # sentence-transformers embedding provider
│   │
│   └── mcp_server/             # Model Context Protocol (FastMCP) integration
│       ├── server.py           # FastMCP server runner
│       └── tools/
│           ├── search_profiles.py  # SerpAPI Google X-Ray search tool
│           ├── score_profile.py    # Hybrid scoring algorithm
│           └── enrich_profile.py   # Apollo.io profile enrichment
│
└── tests/                      # Pytest unit tests, scoring tests, and pipeline assertions
```

---

## REST API Endpoints

The service listens on port `8001` (configurable via `APP_PORT`).

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Healthcheck returning Groq connectivity and search provider status |
| `POST` | `/api/search` | Trigger complete LangGraph sourcing and ranking pipeline |
| `POST` | `/api/score` | Score an isolated profile against specified criteria |
| `GET` | `/api/models` | List available Groq LLM models and active default |
| `GET` | `/docs` | Interactive Swagger / OpenAPI documentation UI |

### Example Request (`POST /api/search`)
```json
{
  "query": "Senior Spring Boot and Java developer in Rabat with 5+ years experience",
  "job_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "max_results": 5
}
```

---

## Getting Started Locally

### 1. Prerequisites
- Python 3.12+
- `uv` (recommended) or `pip` / `venv`

### 2. Setup Virtual Environment
```bash
cd agent-service

# Create virtual environment
python -m venv .venv

# Activate environment
# On Windows (PowerShell):
.venv\Scripts\Activate.ps1
# On Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Environment Variables
Create a `.env` file from `.env.example`:
```bash
cp .env.example .env
```

Key environment configurations:
```properties
APP_PORT=8001
APP_ENV=development

# LLM Inference
GROQ_API_KEY=gsk_your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile

# External Candidate Search & Enrichment APIs
SERPAPI_API_KEY=your_serpapi_key_here
APOLLO_API_KEY=your_apollo_key_here

# Embedding Engine
EMBEDDING_MODEL=all-MiniLM-L6-v2
```

### 4. Run the Service
```bash
# Start directly with run.py
python run.py

# Or via Uvicorn with hot-reload
uvicorn src.main:app --host 0.0.0.0 --port 8001 --reload
```

---

## Testing & Code Quality

```bash
# Run all unit tests
pytest

# Run tests with coverage reporting
pytest --cov=src --cov-report=term-missing tests/

# Static type checking
pyright

# Linting with Ruff
ruff check src/

# Security SAST scan with Bandit
bandit -r src/
```
