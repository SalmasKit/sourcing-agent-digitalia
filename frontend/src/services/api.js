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
    if (payload?.accessToken) {
      storage.setSession(payload.accessToken, payload.refreshToken, payload.user);
    }
    return {
      token: payload?.accessToken,
      refreshToken: payload?.refreshToken,
      user: payload?.user,
    };
  } catch (error) {
    console.error('Backend login failed:', error.message);
    throw error;
  }
};

export const registerApi = async (name, email, password) => {
  try {
    const { data } = await apiClient.post('/auth/register', {
      fullName: name,
      email,
      password,
    });
    return { user: data.data };
  } catch (error) {
    console.error('Backend register failed:', error.message);
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

// ─────────────────────────────────────────────
// Search / Candidates API
// ─────────────────────────────────────────────

export const searchCandidatesApi = async (searchQuery, filters = {}) => {
  let fullPrompt = searchQuery || '';

  // Append location filter if specified
  const locFilter = (filters.location || '').trim();
  if (locFilter && locFilter !== 'All Locations') {
    if (!fullPrompt.toLowerCase().includes(locFilter.toLowerCase())) {
      fullPrompt = fullPrompt ? `${fullPrompt} in ${locFilter}` : `Candidates in ${locFilter}`;
    }
  } else if (!fullPrompt.toLowerCase().includes('morocco') && !fullPrompt.toLowerCase().includes('maroc')) {
    fullPrompt = fullPrompt ? `${fullPrompt} in Morocco` : `Candidates in Morocco`;
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

  try {
    // 1. Try Spring Boot orchestration backend first
    const { data } = await apiClient.post('/searches', {
      rawDescription: fullPrompt,
    });
    const searchObj = data.data || data;
    if (searchObj && searchObj.id) {
      // Poll for saved profiles from Spring Boot after agent completes execution
      await new Promise((r) => setTimeout(r, 2500));
      try {
        const profilesRes = await apiClient.get(`/searches/${searchObj.id}/profiles`);
        const pData = profilesRes.data?.data?.content || profilesRes.data?.content || [];
        if (pData.length > 0) {
          return pData.map(p => {
            const name = p.fullName || 'Candidate';
            const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0284c7&color=fff&bold=true`;
            const uniqueId = p.id && !p.id.startsWith('serpapi-')
              ? p.id
              : `cand-${name.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Math.abs(name.split('').reduce((a, c) => a + c.charCodeAt(0), 0))}`;
            return {
              id: uniqueId,
              fullName: name,
              headline: p.headline,
              location: p.location,
              experienceYears: p.experienceYears,
              matchScore: Math.round(p.score || 80),
              summary: p.headline || p.fullName,
              skills: Array.isArray(p.skills) ? p.skills : (p.skills?.skills || []),
              linkedin: p.sourceUrl,
              source: p.sourcePlatform,
              avatarUrl: p.avatarUrl || p.avatar_url || defaultAvatar,
            };
          });
        }
      } catch (pErr) {
        console.warn('Could not fetch stored profiles from backend, trying direct agent endpoint:', pErr.message);
      }
    }
  } catch (backendError) {
    console.warn('Backend /searches endpoint failed or unauthenticated, invoking agent-service directly:', backendError.message);
  }

  // 2. Direct agent-service call for real-time live SerpAPI sourcing
  try {
    const response = await axios.post('http://localhost:8001/api/search', {
      query: fullPrompt,
      max_results: 8,
    });
    const agentData = response.data;
    const profiles = agentData?.profiles || [];
    return profiles.map(p => {
      const name = p.full_name || 'Candidate';
      const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0284c7&color=fff&bold=true`;
      const uniqueId = p.id && !p.id.startsWith('serpapi-')
        ? p.id
        : `cand-${name.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Math.abs(name.split('').reduce((a, c) => a + c.charCodeAt(0), 0))}`;
      return {
        id: uniqueId,
        fullName: name,
        headline: p.headline,
        location: p.location,
        experienceYears: p.experience_years || 5,
        matchScore: p.match_score || p.score || 80,
        summary: p.summary || p.headline,
        skills: Array.isArray(p.skills) ? p.skills : (p.skills?.skills || []),
        linkedin: p.linkedin_url || p.source_url,
        avatarUrl: p.avatar_url || defaultAvatar,
        verifiedMatchReasons: p.match_rationale || [],
        source: p.source || 'serpapi',
      };
    });
  } catch (agentErr) {
    console.error('Direct agent-service call failed:', agentErr.message);
    return [];
  }
};

export default apiClient;
