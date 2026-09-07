// Digitalia Enterprise Sourcing API Client
import axios from 'axios';

const API_BASE_URL = '/api/v1';

// Read from environment — set VITE_DEMO_MODE=true only for offline demos.
// NEVER enable in production; doing so allows auth bypass on backend failures.
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

// ─────────────────────────────────────────────
// Storage helpers
// ─────────────────────────────────────────────
const TOKEN_KEY   = 'digitalia_auth_token';
const REFRESH_KEY = 'digitalia_refresh_token';
const USER_KEY    = 'digitalia_auth_user';

export const isValidJwt = (token) => typeof token === 'string' && token.split('.').length === 3;

export const storage = {
  getAccessToken:  () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    if (!DEMO_MODE && !isValidJwt(token)) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_KEY);
      localStorage.removeItem(USER_KEY);
      return null;
    }
    return token;
  },
  getRefreshToken: () => localStorage.getItem(REFRESH_KEY),
  getUser:         () => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!DEMO_MODE && (!token || !isValidJwt(token))) {
        return null;
      }
      return JSON.parse(localStorage.getItem(USER_KEY));
    } catch {
      return null;
    }
  },
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
// Shared JWT request interceptor
// Attaches the Bearer token to any axios instance.
// ─────────────────────────────────────────────
const jwtRequestInterceptor = (config) => {
  const token = storage.getAccessToken();
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
};

// ─────────────────────────────────────────────
// Primary API client  →  /api/v1  (Spring Boot)
// ─────────────────────────────────────────────
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(jwtRequestInterceptor, (e) => Promise.reject(e));

// ─────────────────────────────────────────────
// Agent-service client  →  /agent-api  (Vite proxy → Python agent)
// The URL never appears in the browser bundle; the Vite dev proxy
// (and the Spring Boot reverse-proxy in production) re-route
// /agent-api/* to the agent-service internally.
// Every request carries the same JWT Bearer token as apiClient.
// ─────────────────────────────────────────────
export const agentClient = axios.create({
  baseURL: '/agent-api',
  headers: { 'Content-Type': 'application/json' },
});

agentClient.interceptors.request.use(jwtRequestInterceptor, (e) => Promise.reject(e));
agentClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      storage.clearSession();
      window.dispatchEvent(new CustomEvent('auth:session-expired'));
    }
    return Promise.reject(error);
  }
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

// Response interceptor — auto-refresh on 401 / 403
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    // Attempt refresh or session expiry on 401 / 403 for non-auth endpoints
    if (
      (status === 401 || status === 403) &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/')
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
    if (DEMO_MODE && email && password) {
      // Demo-mode only: create a local session when the backend is unreachable.
      // This code path is disabled in production (VITE_DEMO_MODE != 'true').
      console.warn('[DEMO_MODE] Backend login unavailable, falling back to local session:', error.message);
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
    if (DEMO_MODE) {
      // Demo-mode only: create a local session when the backend is unreachable.
      console.warn('[DEMO_MODE] Backend register unavailable, falling back to local session:', error.message);
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
    throw error;
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

async function searchTalentPoolApi(searchQuery, filters = {}) {
  const limit = (Number(filters.maxResults) > 0 ? Number(filters.maxResults) : null) || (Number(filters.limit) > 0 ? Number(filters.limit) : null) || 10;
  try {
    const response = await agentClient.post('/api/pool/search', {
      query: searchQuery,
      limit,
    });
    const profiles = response.data?.candidates || response.data?.profiles || [];
    return profiles.map(p => {
      const name = p.full_name || 'Candidate';
      const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0284c7&color=fff&bold=true`;
      const uniqueId = p.id && !p.id.startsWith('serpapi-')
        ? p.id
        : `cand-${name.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Math.abs(name.split('').reduce((a, c) => a + c.charCodeAt(0), 0))}`;
      const exp = typeof p.experience_years === 'number' && !isNaN(p.experience_years)
        ? p.experience_years
        : parseExperienceYears(p.experience_years, p.headline, p.summary);
      const candEmail = (p.email && !p.email.endsWith('@talent-candidate.ma'))
        ? p.email
        : (p.email_address && !p.email_address.endsWith('@talent-candidate.ma') ? p.email_address : null);
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
        matchScore: p.pool_similarity || p.match_score || 0,
        summary: p.summary || p.headline,
        skills: Array.isArray(p.skills) ? p.skills : (p.skills?.skills || []),
        linkedin: p.linkedin_url || p.source_url,
        avatarUrl: p.avatar_url || defaultAvatar,
        verifiedMatchReasons: [`${p.pool_similarity || p.match_score}% semantic match to your query — from your existing talent pool.`],
        availability: p.availability || 'Open for Outreach (Contact Candidate)',
        salaryExpectation: p.salary_expectation || p.salaryExpectation || (exp >= 5 ? '[Est. Market Benchmark] 25,000 - 34,000 MAD / mo' : '[Est. Market Benchmark] 16,000 - 24,000 MAD / mo'),
        languages: Array.isArray(p.languages) && p.languages.length > 0 ? p.languages : [],
        experiences: candExperiences,
        source: 'talent_pool',
        isDuplicate: false,
        timesSeen: Number(p.times_seen) || 1,
      };
    });
  } catch (err) {
    console.warn('Talent pool search failed:', err.message);
    return [];
  }
}

export const searchCandidatesApi = async (searchQuery, filters = {}) => {
  if (filters.searchMode === 'pool') {
    return searchTalentPoolApi(searchQuery, filters);
  }

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

  // 1. Agent-service call for real-time SerpAPI sourcing.
  //    Routed through the /agent-api Vite proxy (dev) / Spring Boot reverse-proxy
  //    (prod) so the agent-service URL is never exposed to the browser and every
  //    request carries a valid JWT Bearer token via agentClient's interceptor.
  try {
    let limit = Number(filters.maxResults || filters.limit);
    const countMatch = fullPrompt.match(/\b(?:top|find|source|get|first)?\s*(\d{1,2})\s*(?:candidates?|profils?|profiles?|développeurs?|developpeurs?|engineers?|candidats?)\b/i);
    if (countMatch) {
      const extracted = parseInt(countMatch[1], 10);
      if (extracted >= 1 && extracted <= 50) {
        limit = extracted;
      }
    }
    if (!limit || isNaN(limit)) {
      limit = 10;
    }

    const response = await agentClient.post('/api/search', {
      query: fullPrompt,
      max_results: limit,
    });

    const agentData = response.data;
    const rawProfiles = agentData?.profiles || [];
    const profiles = rawProfiles.slice(0, limit);

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
        const candEmail = (p.email && !p.email.endsWith('@talent-candidate.ma'))
          ? p.email
          : (p.email_address && !p.email_address.endsWith('@talent-candidate.ma') ? p.email_address : null);
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
          isDuplicate: Boolean(p.is_duplicate),
          timesSeen: Number(p.times_seen) || 1,
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
        const candEmail = (p.email && !p.email.endsWith('@talent-candidate.ma'))
          ? p.email
          : (p.emailAddress && !p.emailAddress.endsWith('@talent-candidate.ma') ? p.emailAddress : null);
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

export const draftOutreachApi = async (candidate, jobContext = {}, channel = 'linkedin') => {
  const response = await agentClient.post('/api/outreach', {
    candidate: {
      full_name: candidate.fullName || candidate.full_name,
      headline: candidate.headline,
      skills: candidate.skills,
      experiences: candidate.experiences,
    },
    job_context: jobContext,
    channel,
  });
  return response.data;
};

export default apiClient;
