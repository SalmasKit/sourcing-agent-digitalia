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
    // Only clear session on 401 (unauthenticated) — 403 means authenticated but forbidden
    if (error.response?.status === 401) {
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

// Response interceptor — auto-refresh on 401 only (403 means authenticated but forbidden)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    // Attempt refresh or session expiry on 401 only for non-auth endpoints
    // 403 means the user is authenticated but lacks specific permissions — don't auto-refresh
    if (
      status === 401 &&
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
    const defaultPrivileges = rawUser.role === 'HR_ADMIN'
      ? ['create_roles', 'shortlist_candidates', 'manage_notes', 'source_candidates', 'export_data']
      : (typeof rawUser.privileges === 'string' ? rawUser.privileges.split(',').map(s => s.trim()) : (rawUser.privileges || ['create_roles', 'shortlist_candidates', 'manage_notes', 'source_candidates', 'export_data']));

    const normalizedUser = {
      id: rawUser.id || 'usr-' + Date.now(),
      email: rawUser.email || email,
      name: rawUser.fullName || rawUser.name || email.split('@')[0],
      fullName: rawUser.fullName || rawUser.name || email.split('@')[0],
      role: rawUser.role || 'RECRUITER',
      teamId: rawUser.teamId || 'digitalia_workspace',
      privileges: defaultPrivileges,
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
      console.warn('[DEMO_MODE] Backend login unavailable, falling back to local session:', error.message);
      const mockToken = 'mock_token_' + Date.now();
      const detectedRole = (email.toLowerCase().includes('admin') || email.toLowerCase().includes('hr')) ? 'HR_ADMIN' : 'RECRUITER';
      
      // Look up if this user exists in mock team storage to keep privileges
      const mockTeam = JSON.parse(localStorage.getItem('digitalia_mock_team_members') || '[]');
      const existingMember = mockTeam.find(m => m.email.toLowerCase() === email.toLowerCase());
      const role = existingMember?.role || detectedRole;
      
      const mockUser = {
        id: existingMember?.id || ('usr-' + Date.now()),
        email: email,
        name: existingMember?.fullName || email.split('@')[0].replace('.', ' ').replace(/(^\w|\s\w)/g, m => m.toUpperCase()),
        fullName: existingMember?.fullName || email.split('@')[0].replace('.', ' ').replace(/(^\w|\s\w)/g, m => m.toUpperCase()),
        role: role,
        teamId: 'digitalia_workspace',
        privileges: role === 'HR_ADMIN'
          ? ['create_roles', 'shortlist_candidates', 'manage_notes', 'source_candidates', 'export_data']
          : (existingMember?.privileges || ['create_roles', 'shortlist_candidates', 'manage_notes', 'source_candidates', 'export_data']),
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
      role,
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
        experience_years: exp,
        min_experience_years: p.min_experience_years ?? p.raw_data?.min_experience_years ?? 0,
        matched_skills: p.matched_skills ?? p.raw_data?.matched_skills ?? [],
        missing_skills: p.missing_skills ?? p.raw_data?.missing_skills ?? [],
        required_skills: p.required_skills ?? p.raw_data?.required_skills ?? [],
        location_score: p.score_breakdown?.location ?? p.location_score ?? p.raw_data?.location_score ?? 0,
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
    // Only fall back to regex extraction when maxResults was NOT explicitly provided
    if (!limit || isNaN(limit)) {
      const countMatch = fullPrompt.match(/\b(?:top|find|source|get|first)?\s*(\d{1,2})\s*(?:candidates?|profils?|profiles?|développeurs?|developpeurs?|engineers?|candidats?)\b/i);
      if (countMatch) {
        const extracted = parseInt(countMatch[1], 10);
        if (extracted >= 1 && extracted <= 50) {
          limit = extracted;
        }
      }
    }
    if (!limit || isNaN(limit)) {
      limit = 10;
    }

    const response = await agentClient.post('/api/search', {
      query: fullPrompt,
      max_results: limit,
      offset: Number(filters.offset) || 0,
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
          experience_years: exp,
          min_experience_years: p.min_experience_years ?? p.raw_data?.min_experience_years ?? 0,
          matched_skills: p.matched_skills ?? p.raw_data?.matched_skills ?? [],
          missing_skills: p.missing_skills ?? p.raw_data?.missing_skills ?? [],
          required_skills: p.required_skills ?? p.raw_data?.required_skills ?? [],
          location_score: p.score_breakdown?.location ?? p.location_score ?? p.raw_data?.location_score ?? 0,
          email: candEmail,
          email_status: p.email_status,
          extrapolated_email_confidence: p.extrapolated_email_confidence,
          match_confidence: p.match_confidence,
          photo_url: p.photo_url,
          linkedin: p.linkedin_url || p.source_url,
          github_url: p.github_url,
          organization_name: p.organization_name,
          organization_domain: p.organization_domain,
          organization_departments: p.organization_departments,
          organization_functions: p.organization_functions,
          organization_seniority: p.organization_seniority,
          matchScore: p.match_score || p.score || 80,
          summary: p.summary || p.about || p.bio || p.headline,
          skills: Array.isArray(p.skills) ? p.skills : (p.skills?.skills || []),
          avatarUrl: p.avatar_url || p.photo_url || defaultAvatar,
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
      if (Array.isArray(pData) && pData.length > 0) {
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
    }
  } catch (backendError) {
    console.warn('Backend search fallback failed:', backendError.message);
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

// ─────────────────────────────────────────────
// Password & Invitation APIs
// ─────────────────────────────────────────────

export const changePasswordApi = async (currentPassword, newPassword) => {
  try {
    const { data } = await apiClient.post('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return data;
  } catch (error) {
    if (DEMO_MODE) {
      console.log('[DEMO_MODE] Simulated password change successful');
      return { success: true, message: 'Password updated' };
    }
    throw error;
  }
};

export const forgotPasswordApi = async (email) => {
  try {
    const { data } = await apiClient.post('/auth/forgot-password', { email });
    return data.data || data;
  } catch (error) {
    if (DEMO_MODE) {
      const mockToken = 'mock_reset_' + Date.now();
      console.log('[DEMO_MODE] Simulated password reset token:', mockToken);
      return { message: 'Reset instructions generated', resetToken: mockToken };
    }
    throw error;
  }
};

export const resetPasswordApi = async (token, newPassword) => {
  try {
    const { data } = await apiClient.post('/auth/reset-password', {
      token,
      newPassword,
    });
    return data;
  } catch (error) {
    if (DEMO_MODE) {
      console.log('[DEMO_MODE] Simulated password reset completed with token:', token);
      return { success: true, message: 'Password has been reset' };
    }
    throw error;
  }
};

export const acceptInviteApi = async (token, fullName, password) => {
  try {
    const { data } = await apiClient.post('/auth/accept-invite', {
      token,
      fullName,
      password,
    });
    const payload = data.data;
    const rawUser = payload?.user || {};
    const normalizedUser = {
      id: rawUser.id || 'usr-' + Date.now(),
      email: rawUser.email,
      name: rawUser.fullName || fullName,
      fullName: rawUser.fullName || fullName,
      role: rawUser.role || 'RECRUITER',
      teamId: rawUser.teamId || 'digitalia_workspace',
      privileges: rawUser.privileges ? (typeof rawUser.privileges === 'string' ? rawUser.privileges.split(',') : rawUser.privileges) : ['shortlist_candidates', 'manage_notes', 'source_candidates'],
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
    if (DEMO_MODE) {
      const mockToken = 'mock_token_' + Date.now();
      const mockUser = {
        id: 'usr-' + Date.now(),
        email: 'recruiter_' + Date.now() + '@digitalia.io',
        name: fullName,
        fullName: fullName,
        role: 'RECRUITER',
        teamId: 'digitalia_workspace',
        privileges: ['shortlist_candidates', 'manage_notes', 'source_candidates'],
      };
      storage.setSession(mockToken, 'mock_refresh', mockUser);
      return { token: mockToken, refreshToken: 'mock_refresh', user: mockUser };
    }
    throw error;
  }
};

// ─────────────────────────────────────────────
// Team Management APIs (HR Admin)
// ─────────────────────────────────────────────

const DEFAULT_TEAM_MEMBERS = [];

export const getTeamMembersApi = async () => {
  try {
    const { data } = await apiClient.get('/team/members');
    return data.data || [];
  } catch (error) {
    const saved = localStorage.getItem('digitalia_mock_team_members');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  }
};

export const getPendingInvitationsApi = async () => {
  try {
    const { data } = await apiClient.get('/team/invitations');
    return data.data || [];
  } catch (error) {
    const saved = localStorage.getItem('digitalia_mock_invitations');
    return saved ? JSON.parse(saved) : [];
  }
};

export const inviteRecruiterApi = async (email, fullName = '', privileges = ['shortlist_candidates', 'manage_notes', 'source_candidates'], role = 'RECRUITER') => {
  try {
    const { data } = await apiClient.post('/team/invite', {
      email,
      fullName,
      role,
      privileges,
    });
    return data.data;
  } catch (error) {
    // Mock invitation creation
    const rawToken = 'inv_' + crypto.randomUUID().replace(/-/g, '').substring(0, 16);
    const newInvitation = {
      id: 'inv-' + Date.now(),
      email,
      fullName,
      teamId: 'digitalia_workspace',
      role: role || 'RECRUITER',
      privileges,
      token: rawToken,
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      createdAt: new Date().toISOString(),
    };
    const saved = JSON.parse(localStorage.getItem('digitalia_mock_invitations') || '[]');
    saved.unshift(newInvitation);
    localStorage.setItem('digitalia_mock_invitations', JSON.stringify(saved));
    return newInvitation;
  }
};

export const cancelInvitationApi = async (invitationId) => {
  try {
    await apiClient.delete(`/team/invitations/${invitationId}`);
    return true;
  } catch (error) {
    const saved = JSON.parse(localStorage.getItem('digitalia_mock_invitations') || '[]');
    const updated = saved.filter(inv => inv.id !== invitationId);
    localStorage.setItem('digitalia_mock_invitations', JSON.stringify(updated));
    return true;
  }
};

export const updateMemberPrivilegesApi = async (memberId, privileges) => {
  try {
    const { data } = await apiClient.put(`/team/members/${memberId}/privileges`, { privileges });
    return data.data;
  } catch (error) {
    const saved = JSON.parse(localStorage.getItem('digitalia_mock_team_members') || JSON.stringify(DEFAULT_TEAM_MEMBERS));
    const updated = saved.map(m => m.id === memberId ? { ...m, privileges } : m);
    localStorage.setItem('digitalia_mock_team_members', JSON.stringify(updated));
    return updated.find(m => m.id === memberId);
  }
};

export const toggleMemberStatusApi = async (memberId) => {
  try {
    await apiClient.put(`/team/members/${memberId}/toggle-status`);
    return true;
  } catch (error) {
    const saved = JSON.parse(localStorage.getItem('digitalia_mock_team_members') || JSON.stringify(DEFAULT_TEAM_MEMBERS));
    const updated = saved.map(m => m.id === memberId ? { ...m, enabled: !m.enabled } : m);
    localStorage.setItem('digitalia_mock_team_members', JSON.stringify(updated));
    return true;
  }
};

export const removeTeamMemberApi = async (memberId) => {
  try {
    await apiClient.delete(`/team/members/${memberId}`);
    return true;
  } catch (error) {
    const saved = JSON.parse(localStorage.getItem('digitalia_mock_team_members') || JSON.stringify(DEFAULT_TEAM_MEMBERS));
    const updated = saved.filter(m => m.id !== memberId);
    localStorage.setItem('digitalia_mock_team_members', JSON.stringify(updated));
    return true;
  }
};

// ─────────────────────────────────────────────
// Team Activity & Audit Logging APIs
// ─────────────────────────────────────────────

const DEFAULT_ACTIVITIES = [];

export const getTeamActivitiesApi = async (limit = 30) => {
  try {
    const { data } = await apiClient.get(`/team/activities?limit=${limit}`);
    return data.data || [];
  } catch (error) {
    const saved = localStorage.getItem('digitalia_shared_team_activities');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  }
};

export const logActivityApi = async (actionType, targetTitle, details = '', targetId = '') => {
  const safeTargetTitle = typeof targetTitle === 'string' ? targetTitle.slice(0, 200) : String(targetTitle || '').slice(0, 200);
  const safeDetails = typeof details === 'string' ? details.slice(0, 1000) : String(details || '').slice(0, 1000);
  const safeTargetId = typeof targetId === 'string' ? targetId.slice(0, 100) : String(targetId || '').slice(0, 100);

  try {
    const { data } = await apiClient.post('/team/activities', {
      actionType,
      targetId: safeTargetId,
      targetTitle: safeTargetTitle,
      details: safeDetails,
    });
    return data.data;
  } catch (error) {
    // Fallback locally
    const user = storage.getUser() || { fullName: 'Team Member', email: 'user@digitalia.io', role: 'RECRUITER' };
    const newAct = {
      id: 'act-' + Date.now() + '-' + crypto.randomUUID().substring(0, 8),
      teamId: 'digitalia_workspace',
      actorName: user.fullName || user.name || 'Team Member',
      actorEmail: user.email || 'user@digitalia.io',
      actorRole: user.role || 'RECRUITER',
      actionType,
      targetId: safeTargetId,
      targetTitle: safeTargetTitle,
      details: safeDetails,
      createdAt: new Date().toISOString(),
    };
    const current = JSON.parse(localStorage.getItem('digitalia_shared_team_activities') || JSON.stringify(DEFAULT_ACTIVITIES));
    current.unshift(newAct);
    localStorage.setItem('digitalia_shared_team_activities', JSON.stringify(current.slice(0, 100)));
    return newAct;
  }
};

export default apiClient;

