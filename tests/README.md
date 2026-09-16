# Targetalent — Test Strategy & Suite Guide

Comprehensive testing guidelines for **Targetalent** (*Target Talent*), built for **Digitalia Solutions**.

Quality assurance across the platform follows a **Testing Pyramid** approach spanning unit, integration, static security analysis, and load/stress testing.

---

## Testing Matrix Overview

```
                   /\
                  /  \      Load & Stress Tests (k6)
                 /────\     tests/load/*.js
                /      \
               /  E2E   \   API & Contract Tests
              /──────────\  Testcontainers + WebClient
             /            \
            / Integration  \  Spring Boot @SpringBootTest, Slice Tests
           /────────────────\ Pytest LangGraph pipeline
          /                  \
         /     Unit Tests     \ JUnit 5, Mockito, Vitest, Pytest
        /──────────────────────\
```

| Scope | Technology | Location | Coverage Target / Threshold |
|-------|------------|----------|-----------------------------|
| **Backend Unit & Slice** | JUnit 5 + Mockito | `backend-spring/src/test/` | >93% application code |
| **Backend Integration** | Testcontainers (PostgreSQL 16) | `backend-spring/src/test/` | Full repository & service tests |
| **AI Agent Unit & Graph** | Pytest + pytest-cov | `agent-service/tests/` | 100% LangGraph node pass rate |
| **Frontend Unit & Component** | Vitest + React Testing Library | `frontend/src/__tests__/` | Core components & utils |
| **Load & Stress Testing** | k6 | `tests/load/` | <200ms p95 latency under normal load |

---

## 1. Backend Testing (`backend-spring`)

```bash
cd backend-spring

# Run all unit and integration tests
./mvnw test

# Run tests and generate JaCoCo coverage report
./mvnw verify
```

The JaCoCo coverage report is written to:
`backend-spring/target/site/jacoco/index.html`

- **Unit Tests:** Fast, isolated tests verifying business rules in `domain/auth`, `domain/search`, and `domain/profile`.
- **Integration Tests:** Leverage **Testcontainers** to spin up a genuine PostgreSQL 16 database, validating Flyway schema migrations, JSONB indexing, and JPA auditing.

---

## 2. AI Agent Testing (`agent-service`)

```bash
cd agent-service

# Activate Python virtual environment
.venv\Scripts\Activate.ps1   # Windows
# or source .venv/bin/activate # Linux/macOS

# Run all pytest suites
pytest

# Run with missing line coverage reporting
pytest --cov=src --cov-report=term-missing tests/
```

- **Graph Tests:** Validates each LangGraph state transition (`interpret_request` → `search_profiles` → `score_profiles` → `format_output`).
- **Scoring Tests:** Validates mathematical weighting, embedding cosine calculations, and edge cases (e.g., zero skills overlap or remote location bonuses).
- **Mock Fallback Tests:** Verifies deterministic behavior using the synthetic candidate dataset when SerpAPI or Groq keys are absent.

---

## 3. Frontend Testing (`frontend`)

```bash
cd frontend

# Run Vitest in interactive watch mode
npm test

# Generate V8 coverage report
npm run test:coverage

# Static code quality check with Oxlint
npm run lint
```

- **Component Tests:** Verify state changes, modal interactions, candidate filtering, and search inputs.
- **Service Tests:** Validate Axios interceptors, token refresh mechanisms, and error handling envelopes.

---

## 4. Performance & Load Testing (`tests/load`)

The `tests/load/` directory contains **k6** benchmark suites:

| Script | Purpose | Target Scenario |
|--------|---------|-----------------|
| `smoke-test.js` | Minimal sanity check | 1 virtual user for 1 minute; verifies basic endpoint availability |
| `load-test.js` | Normal production load | Ramps up to 50 concurrent virtual users over 10 minutes |
| `stress-test.js` | Breaking point analysis | Ramps up to 200 virtual users to verify rate limiting (Bucket4j) and graceful degradation |
| `soak-test.js` | Long-duration endurance | Sustained load over 1-2 hours to detect memory leaks and connection pool exhaustion |

### Executing k6 Load Tests
```bash
# Ensure the full stack is running
docker compose up -d

# Execute smoke test
k6 run tests/load/smoke-test.js

# Execute load test with environment variables
k6 run -e BASE_URL=http://localhost:8081 tests/load/load-test.js
```

Detailed scenario options and thresholds are documented in [`tests/load/README.md`](./load/README.md).
