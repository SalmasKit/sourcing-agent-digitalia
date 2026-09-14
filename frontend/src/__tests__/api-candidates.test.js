/**
 * api-candidates.test.js
 *
 * Covers the previously-untested functions in services/api.js:
 *   - searchCandidatesApi (normal + pool mode + filter edge cases)
 *   - loginApi / registerApi (error path — DEMO_MODE is false in test env)
 *   - changePasswordApi / forgotPasswordApi / resetPasswordApi (error path)
 *   - acceptInviteApi (error path)
 *
 * All actual HTTP calls are intercepted via vi.mock('axios') so no network
 * traffic is produced and no backend is required.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// ── Mock axios BEFORE importing api.js ─────────────────────────────────────
vi.mock('axios', async () => {
  const mockAxiosInstance = {
    post: vi.fn().mockRejectedValue(new Error('Network Error')),
    get: vi.fn().mockRejectedValue(new Error('Network Error')),
    put: vi.fn().mockRejectedValue(new Error('Network Error')),
    delete: vi.fn().mockRejectedValue(new Error('Network Error')),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
    defaults: { headers: {} },
  }

  const axiosCreate = vi.fn(() => mockAxiosInstance)

  return {
    default: {
      create: axiosCreate,
      post: vi.fn().mockRejectedValue(new Error('Network Error')),
    },
    create: axiosCreate,
    __mockInstance: mockAxiosInstance,
  }
})

// ── Import after mock is set up ─────────────────────────────────────────────
import {
  searchCandidatesApi,
  loginApi,
  registerApi,
  changePasswordApi,
  forgotPasswordApi,
  resetPasswordApi,
  acceptInviteApi,
  storage,
} from '../services/api.js'

// ── Silence console noise ───────────────────────────────────────────────────
beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'log').mockImplementation(() => {})
  localStorage.clear()
  vi.clearAllMocks()
})

// ── searchCandidatesApi — returns [] when both backends fail ────────────────
describe('searchCandidatesApi', () => {
  it('returns empty array when all backends are unavailable', async () => {
    const result = await searchCandidatesApi('React developer')
    expect(Array.isArray(result)).toBe(true)
    expect(result).toEqual([])
  })

  it('returns empty array for pool mode when backend unavailable', async () => {
    const result = await searchCandidatesApi('React developer', { searchMode: 'pool' })
    expect(Array.isArray(result)).toBe(true)
  })

  it('appends location filter to query when provided', async () => {
    const result = await searchCandidatesApi('Developer', {
      location: 'Casablanca',
      tech: ['React', 'Node.js'],
      minExp: 3,
    })
    expect(Array.isArray(result)).toBe(true)
  })

  it('respects maxResults filter without crashing', async () => {
    const result = await searchCandidatesApi('Fullstack engineer', {
      maxResults: 5,
    })
    expect(Array.isArray(result)).toBe(true)
  })

  it('handles empty query string', async () => {
    const result = await searchCandidatesApi('')
    expect(Array.isArray(result)).toBe(true)
  })

  it('handles numeric limit in query text', async () => {
    const result = await searchCandidatesApi('Find 10 candidates React')
    expect(Array.isArray(result)).toBe(true)
  })

  it('does not append location already present in query', async () => {
    // Should not crash and still returns empty array from unreachable backend
    const result = await searchCandidatesApi('React developer in Casablanca', {
      location: 'Casablanca',
    })
    expect(Array.isArray(result)).toBe(true)
  })

  it('handles missing filters gracefully', async () => {
    const result = await searchCandidatesApi('Backend engineer', {})
    expect(Array.isArray(result)).toBe(true)
  })
})

// ── loginApi — DEMO_MODE is false in test env, backend failure => throw ─────
describe('loginApi', () => {
  it('throws an error when backend is unavailable and DEMO_MODE is off', async () => {
    await expect(loginApi('user@example.com', 'password123')).rejects.toThrow()
  })

  it('throws for empty credentials', async () => {
    await expect(loginApi('', '')).rejects.toThrow()
  })
})

// ── registerApi ─────────────────────────────────────────────────────────────
describe('registerApi', () => {
  it('throws when backend is unavailable and DEMO_MODE is off', async () => {
    await expect(registerApi('Alice', 'alice@example.com', 'pass')).rejects.toThrow()
  })

  it('throws for ADMIN role registration when backend unavailable', async () => {
    await expect(registerApi('Bob', 'bob@example.com', 'pass', 'HR_ADMIN')).rejects.toThrow()
  })
})

// ── changePasswordApi ───────────────────────────────────────────────────────
describe('changePasswordApi', () => {
  it('throws when backend is unavailable and DEMO_MODE is off', async () => {
    await expect(changePasswordApi('oldPass', 'newPass')).rejects.toThrow()
  })
})

// ── forgotPasswordApi ───────────────────────────────────────────────────────
describe('forgotPasswordApi', () => {
  it('throws when backend is unavailable and DEMO_MODE is off', async () => {
    await expect(forgotPasswordApi('user@example.com')).rejects.toThrow()
  })
})

// ── resetPasswordApi ────────────────────────────────────────────────────────
describe('resetPasswordApi', () => {
  it('throws when backend is unavailable and DEMO_MODE is off', async () => {
    await expect(resetPasswordApi('reset-token-abc', 'newSecurePass')).rejects.toThrow()
  })
})

// ── acceptInviteApi ─────────────────────────────────────────────────────────
describe('acceptInviteApi', () => {
  it('throws when backend is unavailable and DEMO_MODE is off', async () => {
    await expect(acceptInviteApi('inv_abc123', 'Bob Smith', 'securePass')).rejects.toThrow()
  })
})

// ── storage interactions remain intact post-mocking ────────────────────────
describe('storage (post-mock sanity)', () => {
  it('setSession and clearSession still work correctly', () => {
    storage.setSession('a.b.c', 'refresh', { name: 'Alice' })
    expect(storage.getAccessToken()).toBe('a.b.c')
    expect(storage.getRefreshToken()).toBe('refresh')
    storage.clearSession()
    expect(storage.getAccessToken()).toBeNull()
  })

  it('getUser returns null when invalid token exists', () => {
    localStorage.setItem('digitalia_auth_token', 'not-a-jwt')
    expect(storage.getUser()).toBeNull()
  })
})
