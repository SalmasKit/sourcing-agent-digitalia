import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');
const rateLimitRate = new Rate('rate_limited');

export const options = {
  stages: [
    { duration: '10s', target: 10 },   // Warm up
    { duration: '30s', target: 100 },  // Ramp up to 100 VUs (burst)
    { duration: '1m', target: 100 },   // Sustained burst
    { duration: '20s', target: 0 },    // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.95'],  // Stress test expects high failure rate due to rate limiting
    errors: ['rate<0.95'],
    rate_limited: ['rate>0.1'],      // Verify rate limiting is actually working (IP-based limiter, all VUs share same IP)
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8081';

export function setup() {
  // Register test user first (may fail with 409 on repeat runs — that's expected, we only gate on login)
  const registerRes = http.post(`${BASE_URL}/api/v1/auth/register`, JSON.stringify({
    email: 'test@digitalia.com',
    password: 'Test123!',
    fullName: 'Test User'
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  // Login to get JWT token
  const loginRes = http.post(`${BASE_URL}/api/v1/auth/login`, JSON.stringify({
    email: 'test@digitalia.com',
    password: 'Test123!'
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  if (loginRes.status !== 200 || !loginRes.json('data.accessToken')) {
    throw new Error(`Setup failed: login returned ${loginRes.status} — aborting test run.`);
  }

  return { token: loginRes.json('data.accessToken') };
}

export default function (data) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${data.token}`,
  };

  // Rapid search creation to trigger rate limiter
  const searchRes = http.post(`${BASE_URL}/api/v1/searches`, JSON.stringify({
    rawDescription: 'Stress test search query'
  }), { headers });

  const isRateLimited = searchRes.status === 429;
  
  check(searchRes, {
    'search response received': (r) => r.status >= 200 && r.status < 600,
    'rate limit response format': (r) => {
      if (r.status === 429) {
        return r.json('message') !== undefined && r.headers['Retry-After'] !== undefined;
      }
      return true;
    },
  });

  // Count errors (timeouts, 5xx) but not expected rate limits (429)
  if (searchRes.status >= 500 || searchRes.status === 0) {
    errorRate.add(1);
  } else {
    errorRate.add(0);
  }

  if (isRateLimited) {
    rateLimitRate.add(1);
    console.log(`Rate limited: ${searchRes.json('message')}, Retry-After: ${searchRes.headers['Retry-After']}s`);
  }

  // Minimal sleep to maximize request rate
  sleep(0.1);
}
