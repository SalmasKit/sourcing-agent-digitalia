import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  vus: 5,
  iterations: 10,
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.1'],
    errors: ['rate<0.1'],
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

  // Test health endpoint
  const healthRes = http.get(`${BASE_URL}/actuator/health`);
  check(healthRes, {
    'health status is 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  // Test search creation
  const searchRes = http.post(`${BASE_URL}/api/v1/searches`, JSON.stringify({
    rawDescription: 'Senior Java Developer with Spring Boot experience'
  }), { headers });

  check(searchRes, {
    'search created status is 201': (r) => r.status === 201,
    'search has ID': (r) => r.json('data.id') !== undefined,
  }) || errorRate.add(1);

  // Test search listing
  const listRes = http.get(`${BASE_URL}/api/v1/searches?page=0&size=10`, { headers });
  check(listRes, {
    'search list status is 200': (r) => r.status === 200,
    'search list has content': (r) => r.json('data.content') !== undefined,
  }) || errorRate.add(1);

  sleep(1);
}
