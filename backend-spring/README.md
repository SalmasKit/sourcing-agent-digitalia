# Targetalent — Backend Service

The central orchestration and persistence engine of **Targetalent** (*Target Talent*), an AI-powered talent sourcing agent built for **Digitalia Solutions**.

Built with **Spring Boot 3.3.5** and **Java 21** (leveraging Virtual Threads), this service acts as the secure API gateway between the React frontend, PostgreSQL database, and Python AI Agent Service.

---

## Tech Stack & Highlights

| Technology | Version | Purpose |
|------------|---------|---------|
| **Java** | 21 | High-concurrency runtime with Project Loom Virtual Threads (`spring.threads.virtual.enabled=true`) |
| **Spring Boot** | 3.3.5 | Core application framework |
| **Spring Security** | 6.x | Stateless JWT authentication, role-based access control (RBAC), and security headers |
| **JJWT** | 0.12.x | Cryptographic JWT signing and HMAC SHA-256 verification |
| **Spring WebFlux (WebClient)** | 3.3.5 | Non-blocking, reactive HTTP client communicating with `agent-service` |
| **Spring Data JPA / Hibernate** | 6.x | Relational persistence with auditing (`@CreatedDate`, `@LastModifiedDate`) |
| **PostgreSQL** | 16 | Primary relational database with `pgvector` and JSONB indexing |
| **Flyway** | 10.x | Version-controlled, idempotent database schema migrations |
| **Bucket4j** | 8.x | Sliding-window, in-memory IP rate limiting (`10 req/min` for search endpoints) |
| **Spring Mail** | 3.3.5 | Transactional email delivery (Mailpit in development, SMTP in production) |
| **Springdoc OpenAPI** | 2.6.x | Interactive Swagger UI documentation at `/swagger-ui/index.html` |
| **JaCoCo** | 0.8.12 | Automated unit & integration code coverage enforcement (>93% application code) |
| **Testcontainers** | 1.20.x | Ephemeral, isolated PostgreSQL test container for integration test suite |

---

## Architecture & Package Structure

The backend follows a **Domain-Driven Design (DDD)** modular structure:

```
backend-spring/
├── pom.xml                                 # Maven dependencies & build plugins
├── Dockerfile                              # Multi-stage Eclipse Temurin JRE build
├── BACKEND.md                              # Deep-dive architectural technical specification
├── README.md                               # This file
├── sonar-project.properties                # SonarQube static analysis configuration
├── .env.example                            # Local development environment template
└── src/
    ├── main/
    │   ├── java/com/digitalia/sourcing/
    │   │   ├── SourcingApplication.java    # Spring Boot entrypoint (@EnableAsync, @EnableScheduling)
    │   │   │
    │   │   ├── config/                     # Infrastructure configuration
    │   │   │   ├── SecurityConfig.java     # Spring Security filter chain & CSRF/CORS rules
    │   │   │   ├── CorsConfig.java         # Externalized CORS policy
    │   │   │   ├── AgentClientConfig.java  # WebClient bean for agent-service with retries & timeouts
    │   │   │   ├── RateLimitConfig.java    # Bucket4j interceptor registration
    │   │   │   ├── OpenApiConfig.java      # OpenAPI 3.0 / Swagger metadata
    │   │   │   └── JpaConfig.java          # JPA auditing provider
    │   │   │
    │   │   ├── shared/                     # Cross-cutting primitives
    │   │   │   ├── response/ApiResponse.java    # Standard envelope { success, data, message, timestamp }
    │   │   │   ├── exception/GlobalExceptionHandler.java # Centralized RFC 7807 error responses
    │   │   │   ├── entity/AuditableEntity.java  # Base JPA entity with audit timestamps
    │   │   │   └── interceptor/RateLimitingInterceptor.java # IP bucket enforcement
    │   │   │
    │   │   └── domain/                     # Business domain modules
    │   │       ├── auth/                   # Authentication & User Management
    │   │       │   ├── model/              # User, Role (RECRUITER, HR_ADMIN, SUPER_ADMIN), RefreshToken
    │   │       │   ├── dto/                # LoginRequest, RegisterRequest, AuthResponse, PasswordReset
    │   │       │   ├── repository/         # UserRepository, RefreshTokenRepository
    │   │       │   ├── service/            # AuthService, JwtTokenProvider, TokenBlacklistService
    │   │       │   └── controller/         # AuthController (/api/auth/*)
    │   │       │
    │   │       ├── search/                 # Sourcing Orchestration
    │   │       │   ├── model/              # SearchRequestEntity, SearchStatus (PENDING, PROCESSING, COMPLETED, FAILED)
    │   │       │   ├── dto/                # SourcingQueryDto, SourcingResultDto
    │   │       │   ├── repository/         # SearchRequestRepository
    │   │       │   ├── service/            # SearchOrchestratorService, AgentClientService
    │   │       │   └── controller/         # SearchController (/api/search/*)
    │   │       │
    │   │       └── profile/                # Candidate Profiles & Pipelines
    │   │           ├── model/              # CandidateProfile, RecruitmentStage, RecruiterNote
    │   │           ├── dto/                # CandidateDto, ShortlistUpdateDto, NoteDto
    │   │           ├── repository/         # CandidateProfileRepository, RecruiterNoteRepository
    │   │           ├── service/            # CandidateProfileService, PipelineService
    │   │           └── controller/         # CandidateController (/api/candidates/*)
    │   │
    │   └── resources/
    │       ├── application.yml             # Main Spring configuration
    │       ├── application-test.yml        # Test profile configuration
    │       └── db/migration/               # Flyway SQL migrations (V1__init.sql, V2__indexes.sql, ...)
    │
    └── test/                               # Comprehensive JUnit 5 + Mockito + Testcontainers suite
```

---

## Core Capabilities

### 1. Asynchronous Sourcing Orchestration
- When a recruiter submits a natural language search query, the backend immediately records a `SearchRequestEntity` with status `PENDING` and returns an immediate tracking ID.
- An asynchronous task (leveraging Java 21 Virtual Threads) delegates the query to the Python `agent-service` via a resilient `WebClient` pipeline configured with:
  - Connect timeout: `10s`, Read timeout: `120s` (to accommodate LLM and SerpAPI processing)
  - Exponential backoff retry with jitter (up to 3 attempts for transient network anomalies)
- Upon completion, candidate profiles are extracted, mapped to domain entities, persisted in PostgreSQL, and updated to status `COMPLETED`.

### 2. Multi-Tier Security & RBAC
- **Roles:**
  - `RECRUITER`: Execute candidate searches, view candidate profiles, manage private notes and shortlists.
  - `HR_ADMIN`: All `RECRUITER` permissions + team management, inviting recruiters, and role assignment.
  - `SUPER_ADMIN`: Full administrative control, system metrics, and audit logs.
- **Stateless JWT Rotation:**
  - Access tokens expire after 15 minutes.
  - Refresh tokens expire after 7 days and are stored as SHA-256 hashes with revocation detection.
- **Bucket4j Rate Limiting:**
  - Sensitive operations (authentication and AI search initiation) are rate-limited per remote IP address to defend against brute force and resource exhaustion.

### 3. Database & Versioned Migrations
- Managed by **Flyway**: migrations are applied automatically at boot, ensuring identical schema across development, CI/CD, and production environments.
- Candidate profiles are stored with structured JSONB fields for flexible skills and work history, optimized with PostgreSQL GIN indexing for high-speed search queries.

---

## REST API Reference

All responses follow a consistent `ApiResponse<T>` envelope:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... },
  "timestamp": "2026-09-16T11:00:00Z"
}
```

### Authentication (`/api/auth`)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `POST` | `/api/auth/register` | Register a new user | Public |
| `POST` | `/api/auth/login` | Authenticate & receive JWT access + refresh tokens | Public |
| `POST` | `/api/auth/refresh` | Rotate access token using a valid refresh token | Public |
| `POST` | `/api/auth/logout` | Revoke current refresh token | Authenticated |
| `POST` | `/api/auth/forgot-password` | Request password reset token via email | Public |
| `POST` | `/api/auth/reset-password` | Set new password with valid reset token | Public |
| `GET`  | `/api/auth/me` | Fetch authenticated user profile & roles | Authenticated |

### Sourcing & Search (`/api/search`)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `POST` | `/api/search` | Submit natural-language sourcing request to AI agent | `RECRUITER+` |
| `GET`  | `/api/search/{id}` | Get status and candidate results for a search | `RECRUITER+` |
| `GET`  | `/api/search/history` | List paginated search history of current recruiter | `RECRUITER+` |

### Candidates & Pipeline (`/api/candidates`)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `GET`  | `/api/candidates` | Query candidate profiles with filtering & sorting | `RECRUITER+` |
| `GET`  | `/api/candidates/{id}` | Retrieve comprehensive candidate detail & scores | `RECRUITER+` |
| `PATCH`| `/api/candidates/{id}/stage` | Update candidate recruitment pipeline stage | `RECRUITER+` |
| `POST` | `/api/candidates/{id}/notes` | Add recruiter note to candidate profile | `RECRUITER+` |
| `GET`  | `/api/candidates/shortlist` | Retrieve active shortlist | `RECRUITER+` |

### Administration (`/api/admin`)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `GET`  | `/api/admin/users` | List all system users | `HR_ADMIN+` |
| `PATCH`| `/api/admin/users/{id}/role` | Update user role | `HR_ADMIN+` |
| `DELETE`| `/api/admin/users/{id}` | Deactivate or delete user | `SUPER_ADMIN` |

---

## Local Development & Setup

### Prerequisites
- **Java JDK 21** (Eclipse Temurin recommended)
- **Maven 3.9+** (or use included `./mvnw`)
- **PostgreSQL 16** running locally or via Docker
- Running instance of **agent-service** on `http://localhost:8001`

### 1. Configure Environment
Copy `.env.example` to `.env` or set environment variables:

```bash
cp .env.example .env
```

Key variables:
```properties
SPRING_PROFILES_ACTIVE=dev
DATABASE_URL=jdbc:postgresql://localhost:5432/sourcing_db
DATABASE_USERNAME=sourcing_user
DATABASE_PASSWORD=sourcing_secret
JWT_SECRET=your-secure-256-bit-minimum-secret-key-here-1234567890
AGENT_SERVICE_URL=http://localhost:8001
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### 2. Build & Run Locally
```bash
# Clean and compile with Maven Wrapper
./mvnw clean install -DskipTests

# Run the Spring Boot application
./mvnw spring-boot:run
```

The service will start on `http://localhost:8081`.
Interactive Swagger UI is accessible at `http://localhost:8081/swagger-ui/index.html`.

### 3. Run with Docker
```bash
docker build -t targetalent-backend:latest .
docker run -p 8081:8081 --env-file .env targetalent-backend:latest
```

---

## Testing & Quality Assurance

The backend maintains strict test quality and code coverage standards enforced in CI/CD:

```bash
# Run unit and slice tests
./mvnw test

# Run full integration tests with Testcontainers and generate JaCoCo report
./mvnw verify
```

The JaCoCo coverage HTML report is generated at:
`target/site/jacoco/index.html`

- **Overall Coverage:** >76%
- **Application Logic Coverage (excluding configs):** >93%
- **Static Analysis:** SonarQube scanning enabled via `mvn sonar:sonar`
- **SCA Security Scan:** OWASP Dependency-Check integrated into build verification

---

## Database Architecture & Performance

| Technique | Applied to | Purpose |
|-----------|-----------|---------|
| **UUID PKs (`gen_random_uuid()`)** | All tables | Avoids sequence contention & ID enumeration |
| **JSONB Columns** | `skills`, `extracted_criteria`, `score_breakdown` | Fast semi-structured profile attributes |
| **PostgreSQL GIN Index** | `skills` on `profiles` | Multi-criteria search acceleration |
| **Partial Index on Status** | `status` on `search_requests` | Indexes active searches only (`PENDING`, `RUNNING`) |
| **Composite Index** | `(search_request_id, score DESC)` | Index-only scans for ranked profile queries |
| **JPA Projections** | `ProfileSummaryDto` | Avoids serializing raw candidate data in list views |
| **Mandatory Pagination** | All list queries | Enforces `Pageable` limits against unbounded queries |
