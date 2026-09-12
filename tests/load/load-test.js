import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 VUs
    { duration: '1m', target: 20 },   // Ramp up to 20 VUs
    { duration: '2m', target: 50 },   // Ramp up to 50 VUs (simulating team RH)
    { duration: '2m', target: 50 },   // Stay at 50 VUs
    { duration: '1m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    http_req_failed: ['rate<0.05'],
    errors: ['rate<0.05'],
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

  // Simulate user workflow: list searches, create search, list again
  const listRes = http.get(`${BASE_URL}/api/v1/searches?page=0&size=20`, { headers });
  check(listRes, {
    'search list status is 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(Math.random() * 2); // NOSONAR - load test think time, not security-sensitive

  const searchDescriptions = [
    'Senior Java Developer with Spring Boot experience',
    'Python Developer with Django and REST API knowledge',
    'Full Stack Developer with React and Node.js',
    'DevOps Engineer with Kubernetes and Docker',
    'Data Scientist with Python and Machine Learning',
  ];

  const randomDesc = searchDescriptions[Math.floor(Math.random() * searchDescriptions.length)]; // NOSONAR
  const searchRes = http.post(`${BASE_URL}/api/v1/searches`, JSON.stringify({
    rawDescription: randomDesc
  }), { headers });

  check(searchRes, {
    'search created status is 201': (r) => r.status === 201,
    'search has ID': (r) => r.json('data.id') !== undefined,
  }) || errorRate.add(1);

  sleep(Math.random() * 3); // NOSONAR - load test think time, not security-sensitive
}
