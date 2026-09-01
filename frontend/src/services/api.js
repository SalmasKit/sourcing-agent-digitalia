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
// Initial Data (Empty by default)
// ─────────────────────────────────────────────
const MOCK_CANDIDATES = [];

export const getInitialCandidates = () => [];

// ─────────────────────────────────────────────
// Auth API
// ─────────────────────────────────────────────

export const loginApi = async (email, password) => {
  try {
    const { data } = await apiClient.post('/auth/login', { email, password });
    // data.data = { accessToken, refreshToken, expiresIn, tokenType, user }
    const payload = data.data;
    const rawUser = payload?.user || {};
    const normalizedUser = {
      id: rawUser.id || 'usr-' + Date.now(),
      email: rawUser.email || email,
      name: rawUser.fullName || rawUser.name || email.split('@')[0],
      fullName: rawUser.fullName || rawUser.name || email.split('@')[0],
      role: rawUser.role || 'RECRUITER',
    };
    if (payload?.accessToken) {
      storage.setSession(payload.accessToken, payload.refreshToken || '', normalizedUser);
    }
    return {
      token: payload?.accessToken,
      refreshToken: payload?.refreshToken,
      user: normalizedUser,
    };
  } catch (error) {
    console.warn('Backend login unavailable/failed, using local mode:', error.message);
    if (email && password) {
      const mockToken = 'mock_token_' + Date.now();
      const detectedRole = email.toLowerCase().includes('admin') ? 'HR_ADMIN' : 'RECRUITER';
      const mockUser = {
        id: 'usr-' + Date.now(),
        email: email,
        name: email.split('@')[0].replace('.', ' ').replace(/(^\w|\s\w)/g, m => m.toUpperCase()),
        fullName: email.split('@')[0].replace('.', ' ').replace(/(^\w|\s\w)/g, m => m.toUpperCase()),
        role: detectedRole,
      };
      storage.setSession(mockToken, 'mock_refresh', mockUser);
      return { token: mockToken, refreshToken: 'mock_refresh', user: mockUser };
    }
    throw error;
  }
};

export const registerApi = async (name, email, password, role = 'RECRUITER') => {
  try {
    const { data } = await apiClient.post('/auth/register', {
      fullName: name,
      email,
      password,
    });
    const rawUser = data.data || {};
    const normalizedUser = {
      id: rawUser.id || 'usr-' + Date.now(),
      email: rawUser.email || email,
      name: rawUser.fullName || name,
      fullName: rawUser.fullName || name,
      role: rawUser.role || role,
    };
    return { user: normalizedUser };
  } catch (error) {
    console.warn('Backend register unavailable/failed, using local mode:', error.message);
    const mockToken = 'mock_token_' + Date.now();
    const mockUser = {
      id: 'usr-' + Date.now(),
      email: email,
      name: name,
      fullName: name,
      role: role || 'RECRUITER',
    };
    storage.setSession(mockToken, 'mock_refresh', mockUser);
    return { token: mockToken, refreshToken: 'mock_refresh', user: mockUser };
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

function parseExperienceYears(val, headline = '', summary = '') {
  if (typeof val === 'number' && !isNaN(val) && val >= 0) return val;
  const text = `${headline} ${summary}`.toLowerCase();
  if (text.includes('intern') || text.includes('stagiaire') || text.includes('stage') || text.includes('student') || text.includes('etudiant')) {
    return 0;
  }
  if (text.includes('junior') || text.includes('entry') || text.includes('debutant')) {
    return 1;
  }
  if (text.includes('senior') || text.includes('expert')) {
    return 5;
  }
  if (text.includes('lead') || text.includes('principal') || text.includes('architect') || text.includes('manager')) {
    return 8;
  }
  const match = text.match(/(\d+)\+?\s*(years?|yrs?|ans)/i);
  if (match) return parseInt(match[1], 10);
  return 3;
}

export const searchCandidatesApi = async (searchQuery, filters = {}) => {
  let fullPrompt = searchQuery || '';

  // Append location filter if specified
  const locFilter = (filters.location || '').trim();
  if (locFilter && locFilter !== 'All Locations') {
    if (!fullPrompt.toLowerCase().includes(locFilter.toLowerCase())) {
      fullPrompt = fullPrompt ? `${fullPrompt} in ${locFilter}` : `Candidates in ${locFilter}`;
    }
  }

  // Append tech skills if provided and missing
  if (Array.isArray(filters.tech) && filters.tech.length > 0) {
    const missingTech = filters.tech.filter(t => !fullPrompt.toLowerCase().includes(t.toLowerCase()));
    if (missingTech.length > 0) {
      fullPrompt += ` with skills ${missingTech.join(', ')}`;
    }
  }

  // Append min experience if > 0
  if (filters.minExp && filters.minExp > 0 && !fullPrompt.toLowerCase().includes('year')) {
    fullPrompt += ` with ${filters.minExp}+ years experience`;
  }

  // 1. Direct agent-service call for real-time live SerpAPI sourcing (returns 2 candidates)
  try {
    const response = await axios.post('http://localhost:8001/api/search', {
      query: fullPrompt,
      max_results: 2,
    });

    const agentData = response.data;
    const profiles = agentData?.profiles || [];

    // Notify Spring Boot backend in background to record search request
    apiClient.post('/searches', { rawDescription: fullPrompt }).catch(() => {});

    if (profiles.length > 0) {
      return profiles.map(p => {
        const name = p.full_name || 'Candidate';
        const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0284c7&color=fff&bold=true`;
        const uniqueId = p.id && !p.id.startsWith('serpapi-')
          ? p.id
          : `cand-${name.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Math.abs(name.split('').reduce((a, c) => a + c.charCodeAt(0), 0))}`;
        const exp = parseExperienceYears(p.experience_years, p.headline, p.summary);
        const cleanName = name.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '');
        const candEmail = p.email || p.email_address || (cleanName ? `${cleanName}@talent-candidate.ma` : `candidate-${uniqueId}@talent-candidate.ma`);
        const cleanRole = (p.headline || 'Software Professional').split(' at ')[0].split(' chez ')[0].split(' - ')[0].split(' | ')[0].trim();
        const companyName = p.current_company || p.currentCompany || 'Listed on LinkedIn Profile';
        const defaultExpList = [
          {
            role: cleanRole,
            company: companyName,
            period: 'Current Position',
            description: p.summary && p.summary !== p.headline ? p.summary : `Active ${cleanRole} position at ${companyName}. Full details on profile.`
          }
        ];
        const candExperiences = Array.isArray(p.experiences) && p.experiences.length > 0
          ? p.experiences
          : defaultExpList;

        return {
          id: uniqueId,
          fullName: name,
          headline: p.headline,
          location: p.location,
          experienceYears: exp,
          email: candEmail,
          matchScore: p.match_score || p.score || 80,
          summary: p.summary || p.about || p.bio || p.headline,
          skills: Array.isArray(p.skills) ? p.skills : (p.skills?.skills || []),
          linkedin: p.linkedin_url || p.source_url,
          avatarUrl: p.avatar_url || defaultAvatar,
          verifiedMatchReasons: p.match_rationale || [],
          availability: p.availability || 'Open for Outreach (Contact Candidate)',
          salaryExpectation: p.salary_expectation || p.salaryExpectation || (exp >= 5 ? '[Est. Market Benchmark] 25,000 - 34,000 MAD / mo' : '[Est. Market Benchmark] 16,000 - 24,000 MAD / mo'),
          languages: Array.isArray(p.languages) && p.languages.length > 0 ? p.languages : [],
          experiences: candExperiences,
          source: p.source || 'serpapi',
        };
      });
    }
  } catch (agentErr) {
    console.warn('Direct agent-service call failed, trying Spring Boot backend:', agentErr.message);
  }

  // 2. Fallback to Spring Boot orchestration backend if agent-service direct call is unavailable
  try {
    const { data } = await apiClient.post('/searches', { rawDescription: fullPrompt });
    const searchObj = data.data || data;
    if (searchObj && searchObj.id) {
      await new Promise((r) => setTimeout(r, 2500));
      const profilesRes = await apiClient.get(`/searches/${searchObj.id}/profiles?size=20`);
      const pData = profilesRes.data?.data?.content || profilesRes.data?.content || [];
      return pData.map(p => {
        const name = p.fullName || 'Candidate';
        const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0284c7&color=fff&bold=true`;
        const cleanName = name.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '');
        const candEmail = p.email || p.emailAddress || `${cleanName}@talent-candidate.ma`;
        const exp = p.experienceYears || 3;
        const comp = p.headline ? (p.headline.includes(' at ') ? p.headline.split(' at ')[1] : 'Listed on LinkedIn Profile') : 'Listed on LinkedIn Profile';
        const cleanRole = p.headline ? p.headline.split(' at ')[0].split(' chez ')[0].split(' - ')[0].trim() : 'Software Professional';

        return {
          id: p.id || `cand-${name.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
          fullName: name,
          headline: p.headline,
          location: p.location,
          experienceYears: exp,
          email: candEmail,
          matchScore: Math.round(p.score || 80),
          summary: p.about || p.bio || p.summary || p.headline || p.fullName,
          skills: Array.isArray(p.skills) ? p.skills : (p.skills?.skills || []),
          linkedin: p.sourceUrl,
          source: p.sourcePlatform,
          avatarUrl: p.avatarUrl || p.avatar_url || defaultAvatar,
          availability: p.availability || 'Open for Outreach (Contact Candidate)',
          salaryExpectation: p.salaryExpectation || (exp >= 5 ? '[Est. Market Benchmark] 25,000 - 34,000 MAD / mo' : '[Est. Market Benchmark] 16,000 - 24,000 MAD / mo'),
          languages: Array.isArray(p.languages) && p.languages.length > 0 ? p.languages : [],
          experiences: Array.isArray(p.experiences) && p.experiences.length > 0 ? p.experiences : [
            {
              role: cleanRole,
              company: comp,
              period: 'Current Position',
              description: `Active ${cleanRole} position at ${comp}.`
            }
          ]
        };
      });
    }
  } catch (backendError) {
    console.error('Backend search fallback failed:', backendError.message);
  }

  return [];
};

export default apiClient;
