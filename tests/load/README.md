# Load Testing with k6

This directory contains load testing scripts for the Sourcing Agent application using k6.

## Prerequisites

- k6 installed: `brew install k6` (macOS) or download from https://k6.io
- Backend running at `http://localhost:8080`
- Test user exists: `admin@digitalia.com` / `admin123`

## Test Scripts

### 1. Smoke Test (`smoke-test.js`)
Quick sanity check with minimal load.
- **VUs:** 5
- **Iterations:** 10
- **Duration:** ~10s
- **Purpose:** Verify basic functionality (health, search creation, listing)

**Run:**
```bash
k6 run smoke-test.js
```

### 2. Load Test (`load-test.js`)
Simulates realistic team RH usage with gradual ramp-up.
- **Stages:**
  - 30s → 10 VUs
  - 1m → 20 VUs
  - 2m → 50 VUs
  - 2m → 50 VUs (sustained)
  - 1m → 0 VUs
- **Total Duration:** ~6.5 minutes
- **Purpose:** Validate performance under normal load

**Run:**
```bash
k6 run load-test.js
```

### 3. Stress Test (`stress-test.js`)
Intentional burst to trigger rate limiter.
- **Stages:**
  - 10s → 10 VUs (warm up)
  - 30s → 100 VUs (burst)
  - 1m → 100 VUs (sustained burst)
  - 20s → 0 VUs
- **Total Duration:** ~2 minutes
- **Purpose:** Verify rate limiting (429 responses) and system resilience

**Run:**
```bash
k6 run stress-test.js
```

### 4. Soak Test (`soak-test.js`)
Long-duration stability test.
- **Stages:**
  - 2m → 20 VUs
  - 10m → 20 VUs (sustained)
  - 2m → 0 VUs
- **Total Duration:** ~14 minutes
- **Purpose:** Detect memory leaks, connection pool issues, JVM stability

**Run:**
```bash
k6 run soak-test.js
```

## Environment Variables

Override the default base URL:
```bash
BASE_URL=http://localhost:8080 k6 run smoke-test.js
```

## SLO Thresholds

Each test has built-in SLO thresholds:

| Test | p(95) Latency | p(99) Latency | Error Rate |
|------|---------------|---------------|------------|
| Smoke | <500ms | <1000ms | <10% |
| Load | <1000ms | <2000ms | <5% |
| Stress | <2000ms | - | <50% |
| Soak | <1000ms | <2000ms | <2% |

## Monitoring During Tests

While running load tests, monitor:
- **Grafana Business Dashboard:** http://localhost:3001 (uid: sourcing-backend-obs)
  - Search Rate
  - Agent Call Duration
  - Rate Limit Rejections
  - HikariCP Connection Pool
- **Grafana Basic Dashboard:** http://localhost:3001 (uid: sourcing-backend)
  - Request Rate
  - Response Time (p95)
  - JVM Heap Memory Usage
  - JVM Threads

## Docker Alternative

Run k6 in Docker:
```bash
docker run --rm -i grafana/k6 run - < smoke-test.js
```

With custom base URL:
```bash
docker run --rm -i -e BASE_URL=http://host.docker.internal:8080 grafana/k6 run - < smoke-test.js
```
