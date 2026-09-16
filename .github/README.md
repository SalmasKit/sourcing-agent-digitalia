# Targetalent — CI/CD & DevSecOps Workflows

This directory houses the **CI/CD pipelines**, **automated security quality gates**, and **dependency management configuration** for **Targetalent** (*Target Talent*), built for **Digitalia Solutions**.

---

## Directory Overview

```
.github/
├── README.md                   # This overview document
├── dependabot.yml              # Automated dependency update schedules
└── workflows/                  # GitHub Actions workflow definitions
    ├── backend-ci.yml          # Spring Boot build, test, JaCoCo, SonarCloud
    ├── agent-ci.yml            # Python FastAPI tests, Ruff, Pyright, Bandit SAST
    ├── frontend-ci.yml         # React/Vite test coverage, Oxlint, build check
    ├── security-gitleaks.yml   # Pre-merge and commit secret scanning
    ├── iac-and-supply-chain.yml# Checkov IaC, Trivy filesystem scan, CycloneDX SBOM
    ├── backend-nightly-security.yml # Scheduled OWASP Dependency-Check (CVSS >= 7)
    └── dast-zap-scan.yml       # Dynamic Application Security Testing (OWASP ZAP)
```

---

## 5-Pillar DevSecOps Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. CODE SECURITY (SAST & Secret Scanning)                                   │
│    • Java / Spring Boot  ──► SonarCloud & JaCoCo Coverage                   │
│    • Python Agent        ──► Bandit SAST & Ruff Linting                     │
│    • React Frontend      ──► Oxlint Static Analyzer                         │
│    • Secrets             ──► Gitleaks (pre-commit & CI/CD workflow)         │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. SUPPLY CHAIN & DEPENDENCY SECURITY (SCA)                                 │
│    • Automated CVE PRs   ──► Dependabot (Maven, npm, pip, Docker, Actions)  │
│    • Frontend Auditing   ──► npm audit (--audit-level=high)                 │
│    • Java Deep SCA       ──► OWASP Dependency-Check (CVSS threshold: 7)     │
│    • Universal Scans     ──► Trivy Filesystem Vulnerability Scanner         │
│    • Software Inventory  ──► CycloneDX SBOM Generation (Syft & Maven)       │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. CONTAINER & INFRASTRUCTURE AS CODE (IaC) SECURITY                        │
│    • Base Images         ──► Minimal Alpine / slim bases, non-root users    │
│    • IaC Static Scan     ──► Checkov & Trivy Config Scanner                 │
│    • Image Signing       ──► Cosign / Sigstore Keyless Signing              │
│    • Network Isolation   ──► Internal bridge networks, read-only configs    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 4. APPLICATION & RUNTIME SECURITY (DAST & Defense-in-Depth)                 │
│    • Dynamic Testing     ──► OWASP ZAP Baseline Security Scan               │
│    • Hardened Headers    ──► CSP, X-Frame-Options, X-Content-Type, HSTS     │
│    • Authentication      ──► Stateless JWT + BCrypt (Strength 12) + RBAC    │
│    • Abuse Prevention    ──► Rate Limiting (Bucket4j sliding-window)        │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 5. OBSERVABILITY & SECURITY OPERATIONS (SecOps)                             │
│    • Metric Scraping     ──► Prometheus with Basic Auth Scraper             │
│    • Real-time Dashboards──► Grafana (pre-provisioned dashboards)            │
│    • Structured Auditing ──► Python-json-logger with correlation IDs        │
│    • Health Probes       ──► PostgreSQL & Docker Healthchecks               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Workflow Reference

| Workflow | Triggers | Focus Area | Quality Gate & Failure Criteria |
|----------|----------|------------|---------------------------------|
| `backend-ci.yml` | Push & PR to `main` (`backend-spring/**`) | Spring Boot 3.3 / Java 21 | • Maven compile & unit tests pass<br>• JaCoCo coverage threshold met<br>• SonarCloud quality gate pass |
| `agent-ci.yml` | Push & PR to `main` (`agent-service/**`) | Python 3.12 / FastAPI / LangGraph | • Pytest suite pass<br>• Ruff & Pyright check with zero errors<br>• Bandit SAST detects no high/medium vulnerabilities |
| `frontend-ci.yml` | Push & PR to `main` (`frontend/**`) | React 19 / Vite | • Vitest test suite pass<br>• Oxlint static analysis clean<br>• Production `npm run build` succeeds |
| `security-gitleaks.yml` | All pushes & PRs | Entire repository | • Zero leaked credentials matching `.gitleaks.toml` rules (Groq, SerpAPI, JWT) |
| `iac-and-supply-chain.yml` | Push & PR (`docker*`, `Dockerfile*`) | Docker & IaC configuration | • Checkov passes CIS benchmarks<br>• Trivy finds no CRITICAL vulnerabilities<br>• CycloneDX SBOM generated |
| `backend-nightly-security.yml` | Nightly cron schedule | Backend dependency tree | • OWASP Dependency-Check flags no CVE with CVSS $\ge 7.0$ |
| `dast-zap-scan.yml` | Nightly or on-demand dispatch | Live web application | • OWASP ZAP Baseline scan reports no high-severity runtime vulnerabilities |

---

## Automated Dependency Updates (`dependabot.yml`)

Dependabot monitors dependencies across five ecosystems with automated weekly pull requests:

- **npm**: `frontend/`
- **maven**: `backend-spring/`
- **pip**: `agent-service/`
- **docker**: Container base images (`Dockerfile` in all services)
- **github-actions**: CI/CD action version bumps
