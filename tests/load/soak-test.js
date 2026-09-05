import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '2m', target: 20 },   // Ramp up to 20 VUs
    { duration: '10m', target: 20 },  // Sustained load for 10 minutes
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    http_req_failed: ['rate<0.02'],
    errors: ['rate<0.02'],
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

  // Simulate realistic user behavior over time
  const actions = [
    // List searches
    () => {
      const res = http.get(`${BASE_URL}/api/v1/searches?page=0&size=10`, { headers });
      check(res, {
        'search list status is 200': (r) => r.status === 200,
      }) || errorRate.add(1);
    },
    // Create search
    () => {
      const searchDescriptions = [
        'Software Engineer with cloud experience',
        'Product Manager with agile background',
        'UX Designer with Figma expertise',
        'Backend Developer with microservices experience',
      ];
      const randomDesc = searchDescriptions[Math.floor(Math.random() * searchDescriptions.length)];
      const res = http.post(`${BASE_URL}/api/v1/searches`, JSON.stringify({
        rawDescription: randomDesc
      }), { headers });
      check(res, {
        'search created status is 201': (r) => r.status === 201,
      }) || errorRate.add(1);
    },
    // Get search details
    () => {
      const res = http.get(`${BASE_URL}/api/v1/searches?page=0&size=5`, { headers });
      if (res.status === 200 && res.json('data.content') && res.json('data.content').length > 0) {
        const searchId = res.json('data.content')[0].id;
        const detailRes = http.get(`${BASE_URL}/api/v1/searches/${searchId}`, { headers });
        check(detailRes, {
          'search detail status is 200': (r) => r.status === 200,
        }) || errorRate.add(1);
      }
    },
  ];

  // Execute random action
  const randomAction = actions[Math.floor(Math.random() * actions.length)];
  randomAction();

  // Variable think time between 1-5 seconds
  sleep(1 + Math.random() * 4);
}
