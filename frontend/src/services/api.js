// Digitalia Enterprise Sourcing API Client
import axios from 'axios';

const API_BASE_URL = '/api/v1';

// ─────────────────────────────────────────────
// Storage helpers
// ─────────────────────────────────────────────
const TOKEN_KEY   = 'digitalia_auth_token';
const REFRESH_KEY = 'digitalia_refresh_token';
const USER_KEY    = 'digitalia_auth_user';

export const storage = {
  getAccessToken:  () => localStorage.getItem(TOKEN_KEY),
  getRefreshToken: () => localStorage.getItem(REFRESH_KEY),
  getUser:         () => { try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; } },
  setSession: (accessToken, refreshToken, user) => {
    localStorage.setItem(TOKEN_KEY,   accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
    localStorage.setItem(USER_KEY,    JSON.stringify(user));
  },
  clearSession: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

// ─────────────────────────────────────────────
// Axios instance
// ─────────────────────────────────────────────
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach Bearer token
apiClient.interceptors.request.use(
  (config) => {
    const token = storage.getAccessToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─────────────────────────────────────────────
// Token refresh logic (single-flight)
// ─────────────────────────────────────────────
let isRefreshing = false;
let pendingQueue = []; // Requests waiting for a new access token

const processPendingQueue = (error, token = null) => {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  pendingQueue = [];
};

// Response interceptor — auto-refresh on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only attempt refresh once per request; skip auth endpoints
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/auth/')
    ) {
      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = storage.getRefreshToken();
      if (!refreshToken) {
        isRefreshing = false;
        storage.clearSession();
        window.dispatchEvent(new CustomEvent('auth:session-expired'));
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken, user } = data.data;
        storage.setSession(accessToken, newRefreshToken, user);

        apiClient.defaults.headers['Authorization'] = `Bearer ${accessToken}`;
        originalRequest.headers['Authorization']    = `Bearer ${accessToken}`;

        processPendingQueue(null, accessToken);
        return apiClient(originalRequest);
      } catch (refreshError) {
        processPendingQueue(refreshError, null);
        storage.clearSession();
        window.dispatchEvent(new CustomEvent('auth:session-expired'));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ─────────────────────────────────────────────
// Initial Mock Data (offline fallback)
// ─────────────────────────────────────────────
const MOCK_CANDIDATES = [
  {
    id: 'cand-101',
    fullName: 'Sophia Martinez',
    headline: 'Senior Full-Stack Engineer & Cloud Architect',
    location: 'Paris, France (Hybrid)',
    experienceYears: 7,
    matchScore: 96,
    summary: 'Expert Java & React engineer with deep experience in microservices, Spring Boot, Docker, and AWS. Built high-scale fintech systems.',
    skills: ['Java 21', 'Spring Boot 3', 'React', 'TypeScript', 'Docker', 'AWS', 'PostgreSQL'],
    salaryExpectation: '€75,000 - €85,000 / year',
    availability: 'Immediate (2 weeks notice)',
    verifiedMatchReasons: [
      '7+ years experience matching requested Java/React stack',
      'Proven expertise in Docker containerized deployments',
      'Located in Paris with hybrid availability'
    ],
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80',
    email: 's.martinez@example.com',
    linkedin: 'linkedin.com/in/sophiamartinez-dev',
    github: 'github.com/smartinez-code',
    education: 'M.Sc. Computer Science - Sorbonne University',
    shortlisted: false
  },
  {
    id: 'cand-102',
    fullName: 'Alexandre Dubois',
    headline: 'Lead Backend Developer & AI Systems Integrator',
    location: 'Lyon, France (Remote)',
    experienceYears: 9,
    matchScore: 92,
    summary: 'Backend wizard specialized in high-concurrency Spring Boot microservices, AI LLM integrations, and Redis caching architectures.',
    skills: ['Java 21', 'Spring Security', 'Python', 'FastAPI', 'Redis', 'Kafka', 'PostgreSQL'],
    salaryExpectation: '€80,000 - €90,000 / year',
    availability: '1 month notice',
    verifiedMatchReasons: [
      'Lead backend role background with 9 years Java engineering',
      'Hands-on experience integrating Python AI agents with Spring Boot',
      'Strong knowledge of rate limiting, Redis, and security'
    ],
    avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=256&q=80',
    email: 'alex.dubois@example.com',
    linkedin: 'linkedin.com/in/alexandredubois-dev',
    github: 'github.com/adubois-tech',
    education: 'Eng. Degree - INSA Lyon',
    shortlisted: true
  },
  {
    id: 'cand-103',
    fullName: 'Elena Rostova',
    headline: 'Senior Frontend & Design System Specialist',
    location: 'Paris, France (On-site)',
    experienceYears: 6,
    matchScore: 89,
    summary: 'Passionate UI/UX Engineer focused on React 19, Tailwind CSS, accessible component libraries, and performance optimization.',
    skills: ['React', 'TypeScript', 'Tailwind CSS', 'Next.js', 'Figma', 'Jest', 'Vite'],
    salaryExpectation: '€68,000 - €75,000 / year',
    availability: 'Immediate',
    verifiedMatchReasons: [
      'Deep mastery of modern Tailwind CSS & React design systems',
      'Strong portfolio of accessible enterprise dashboards'
    ],
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=256&q=80',
    email: 'elena.rostova@example.com',
    linkedin: 'linkedin.com/in/elenarostova-ui',
    github: 'github.com/elena-codes',
    education: 'B.Sc. Software Engineering - EPITA',
    shortlisted: false
  },
  {
    id: 'cand-104',
    fullName: 'Thomas Moreau',
    headline: 'DevOps & Site Reliability Engineer',
    location: 'Bordeaux, France (Remote)',
    experienceYears: 8,
    matchScore: 85,
    summary: 'DevOps professional specializing in Kubernetes cluster orchestration, CI/CD pipelines (GitHub Actions), Terraform, and Docker Compose.',
    skills: ['Docker', 'Kubernetes', 'Terraform', 'GitHub Actions', 'Java', 'Linux', 'Prometheus'],
    salaryExpectation: '€72,000 - €82,000 / year',
    availability: '3 weeks notice',
    verifiedMatchReasons: [
      'Extensive experience with automated CI/CD and Docker containerization',
      'Solid infrastructure background supporting Java applications'
    ],
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
    email: 't.moreau@example.com',
    linkedin: 'linkedin.com/in/thomasmoreau-devops',
    github: 'github.com/tmoreau-infra',
    education: 'Master in Cloud Infrastructure - ENSEIRB-MATMECA',
    shortlisted: false
  }
];

// ─────────────────────────────────────────────
// Auth API
// ─────────────────────────────────────────────

export const loginApi = async (email, password) => {
  try {
    const { data } = await apiClient.post('/auth/login', { email, password });
    // data.data = { accessToken, refreshToken, expiresIn, tokenType, user }
    const payload = data.data;
    if (payload?.accessToken) {
      storage.setSession(payload.accessToken, payload.refreshToken, payload.user);
    }
    return {
      token: payload?.accessToken,
      refreshToken: payload?.refreshToken,
      user: payload?.user,
    };
  } catch (error) {
    console.warn('Backend login fallback used:', error.message);
    // Offline mock fallback
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockToken = 'mock-jwt-token-digitalia-enterprise-' + Date.now();
        resolve({
          token: mockToken,
          refreshToken: 'mock-refresh-' + Date.now(),
          user: {
            id: 'usr-99',
            name: email.split('@')[0].replace('.', ' ').toUpperCase(),
            email,
            role: 'Talent Acquisition Director'
          }
        });
      }, 600);
    });
  }
};

export const registerApi = async (name, email, password) => {
  try {
    const { data } = await apiClient.post('/auth/register', {
      fullName: name,
      email,
      password,
    });
    // Registration returns the created user; login separately to obtain tokens
    return { user: data.data };
  } catch (error) {
    console.warn('Backend register fallback used:', error.message);
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockToken = 'mock-jwt-token-digitalia-enterprise-' + Date.now();
        resolve({
          token: mockToken,
          refreshToken: 'mock-refresh-' + Date.now(),
          user: {
            id: 'usr-100',
            name,
            email,
            role: 'Sourcing Specialist'
          }
        });
      }, 600);
    });
  }
};

/**
 * Invalidates the refresh token server-side and clears local storage.
 * Safe to call even if the backend is unreachable.
 */
export const logoutApi = async () => {
  const refreshToken = storage.getRefreshToken();
  if (refreshToken) {
    try {
      await apiClient.post('/auth/logout', { refreshToken });
    } catch (error) {
      // Non-blocking: local session is cleared regardless
      console.warn('Server-side logout failed (token may already be expired):', error.message);
    }
  }
  storage.clearSession();
};

// ─────────────────────────────────────────────
// Search / Candidates API
// ─────────────────────────────────────────────

export const searchCandidatesApi = async (searchQuery, filters = {}) => {
  try {
    const { data } = await apiClient.post('/searches', {
      query: searchQuery,
      filters,
    });
    return data.data || data;
  } catch (error) {
    console.warn('Backend service offline, returning mock data:', error.message);
  }

  // Offline mock fallback
  return new Promise((resolve) => {
    setTimeout(() => {
      let filtered = [...MOCK_CANDIDATES];
      if (searchQuery?.trim()) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter((c) =>
          c.fullName.toLowerCase().includes(q) ||
          c.headline.toLowerCase().includes(q) ||
          c.summary.toLowerCase().includes(q) ||
          c.skills.some((s) => s.toLowerCase().includes(q))
        );
      }
      resolve(filtered);
    }, 1200);
  });
};

export const getInitialCandidates = () => MOCK_CANDIDATES;

export default apiClient;
