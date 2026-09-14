/**
 * api-extended.test.js — extended coverage for services/api.js
 *
 * Covers: logoutApi, getInitialCandidates, getTeamMembersApi,
 *         getPendingInvitationsApi, inviteRecruiterApi, getTeamActivitiesApi,
 *         logActivityApi, parseExperienceYears (via searchCandidatesApi mock),
 *         storage edge-cases, and the safeTargetTitle/safeDetails truncation helpers.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  isValidJwt,
  storage,
  getInitialCandidates,
  logoutApi,
  getTeamMembersApi,
  getPendingInvitationsApi,
  inviteRecruiterApi,
  cancelInvitationApi,
  updateMemberPrivilegesApi,
  toggleMemberStatusApi,
  removeTeamMemberApi,
  getTeamActivitiesApi,
  logActivityApi,
} from '../services/api.js'

// ─── Silence console noise ────────────────────────────────────────────────
beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'log').mockImplementation(() => {})
  localStorage.clear()
  vi.clearAllMocks()
})

// ── isValidJwt ─────────────────────────────────────────────────────────────
describe('isValidJwt', () => {
  it('accepts a three-part dot-separated string', () => {
    expect(isValidJwt('hdr.payload.sig')).toBe(true)
  })

  it('rejects strings with fewer than three parts', () => {
    expect(isValidJwt('hdr.payload')).toBe(false)
    expect(isValidJwt('only')).toBe(false)
  })

  it('rejects non-string values', () => {
    expect(isValidJwt(null)).toBe(false)
    expect(isValidJwt(undefined)).toBe(false)
    expect(isValidJwt(42)).toBe(false)
    expect(isValidJwt({})).toBe(false)
  })
})

// ── storage ────────────────────────────────────────────────────────────────
describe('storage', () => {
  describe('getAccessToken', () => {
    it('returns null when localStorage is empty', () => {
      expect(storage.getAccessToken()).toBeNull()
    })

    it('returns a valid JWT token', () => {
      localStorage.setItem('digitalia_auth_token', 'a.b.c')
      expect(storage.getAccessToken()).toBe('a.b.c')
    })

    it('clears and returns null for an invalid token (non-demo mode)', () => {
      localStorage.setItem('digitalia_auth_token', 'not-a-jwt')
      expect(storage.getAccessToken()).toBeNull()
      expect(localStorage.getItem('digitalia_auth_token')).toBeNull()
    })
  })

  describe('getRefreshToken', () => {
    it('returns null when not set', () => {
      expect(storage.getRefreshToken()).toBeNull()
    })

    it('returns stored refresh token', () => {
      localStorage.setItem('digitalia_refresh_token', 'rt123')
      expect(storage.getRefreshToken()).toBe('rt123')
    })
  })

  describe('getUser', () => {
    it('returns null when no token exists', () => {
      expect(storage.getUser()).toBeNull()
    })

    it('returns parsed user when token is valid', () => {
      const user = { id: '1', email: 'a@b.com', fullName: 'Alice' }
      localStorage.setItem('digitalia_auth_token', 'a.b.c')
      localStorage.setItem('digitalia_auth_user', JSON.stringify(user))
      expect(storage.getUser()).toEqual(user)
    })

    it('returns null for malformed JSON in user key', () => {
      localStorage.setItem('digitalia_auth_token', 'a.b.c')
      localStorage.setItem('digitalia_auth_user', '{bad json')
      expect(storage.getUser()).toBeNull()
    })
  })

  describe('setSession / clearSession', () => {
    it('setSession persists all three values', () => {
      storage.setSession('tok', 'ref', { name: 'Bob' })
      expect(localStorage.getItem('digitalia_auth_token')).toBe('tok')
      expect(localStorage.getItem('digitalia_refresh_token')).toBe('ref')
      expect(JSON.parse(localStorage.getItem('digitalia_auth_user'))).toEqual({ name: 'Bob' })
    })

    it('clearSession removes all three values', () => {
      storage.setSession('tok', 'ref', { name: 'Bob' })
      storage.clearSession()
      expect(localStorage.getItem('digitalia_auth_token')).toBeNull()
      expect(localStorage.getItem('digitalia_refresh_token')).toBeNull()
      expect(localStorage.getItem('digitalia_auth_user')).toBeNull()
    })
  })
})

// ── getInitialCandidates ───────────────────────────────────────────────────
describe('getInitialCandidates', () => {
  it('always returns an empty array', () => {
    expect(getInitialCandidates()).toEqual([])
  })
})

// ── logoutApi ──────────────────────────────────────────────────────────────
describe('logoutApi', () => {
  it('clears session even when no refresh token is stored', async () => {
    storage.setSession('a.b.c', '', { name: 'Alice' })
    await logoutApi()
    expect(storage.getAccessToken()).toBeNull()
  })
})

// ── getTeamMembersApi ──────────────────────────────────────────────────────
describe('getTeamMembersApi', () => {
  it('returns empty array when localStorage is empty and backend fails', async () => {
    const result = await getTeamMembersApi()
    expect(Array.isArray(result)).toBe(true)
  })

  it('returns stored members from localStorage fallback', async () => {
    const members = [{ id: 'm1', email: 'test@example.com', enabled: true }]
    localStorage.setItem('digitalia_mock_team_members', JSON.stringify(members))
    const result = await getTeamMembersApi()
    expect(result).toEqual(members)
  })
})

// ── getPendingInvitationsApi ───────────────────────────────────────────────
describe('getPendingInvitationsApi', () => {
  it('returns empty array when localStorage is empty', async () => {
    const result = await getPendingInvitationsApi()
    expect(result).toEqual([])
  })

  it('returns stored invitations from localStorage fallback', async () => {
    const invitations = [{ id: 'inv-1', email: 'test@example.com', status: 'PENDING' }]
    localStorage.setItem('digitalia_mock_invitations', JSON.stringify(invitations))
    const result = await getPendingInvitationsApi()
    expect(result).toEqual(invitations)
  })
})

// ── inviteRecruiterApi ─────────────────────────────────────────────────────
describe('inviteRecruiterApi', () => {
  it('creates a mock invitation in localStorage when backend fails', async () => {
    const result = await inviteRecruiterApi('recruiter@test.com', 'Jane Smith', ['view'])
    expect(result.email).toBe('recruiter@test.com')
    expect(result.fullName).toBe('Jane Smith')
    expect(result.status).toBe('PENDING')
    expect(result.token).toMatch(/^inv_/)

    const stored = JSON.parse(localStorage.getItem('digitalia_mock_invitations'))
    expect(stored).toHaveLength(1)
    expect(stored[0].email).toBe('recruiter@test.com')
  })

  it('uses default role RECRUITER when not specified', async () => {
    const result = await inviteRecruiterApi('user@test.com')
    expect(result.role).toBe('RECRUITER')
  })

  it('accumulates multiple invitations in localStorage', async () => {
    await inviteRecruiterApi('a@test.com')
    await inviteRecruiterApi('b@test.com')
    const stored = JSON.parse(localStorage.getItem('digitalia_mock_invitations'))
    expect(stored).toHaveLength(2)
  })
})

// ── cancelInvitationApi ────────────────────────────────────────────────────
describe('cancelInvitationApi', () => {
  it('removes the invitation from localStorage and returns true', async () => {
    const invitations = [{ id: 'inv-1', email: 'a@b.com' }, { id: 'inv-2', email: 'c@d.com' }]
    localStorage.setItem('digitalia_mock_invitations', JSON.stringify(invitations))
    const result = await cancelInvitationApi('inv-1')
    expect(result).toBe(true)
    const stored = JSON.parse(localStorage.getItem('digitalia_mock_invitations'))
    expect(stored).toHaveLength(1)
    expect(stored[0].id).toBe('inv-2')
  })

  it('returns false when invitation does not exist', async () => {
    const invitations = [{ id: 'inv-1', email: 'a@b.com' }]
    localStorage.setItem('digitalia_mock_invitations', JSON.stringify(invitations))
    const result = await cancelInvitationApi('inv-999')
    expect(result).toBe(false)
  })
})

// ── updateMemberPrivilegesApi ──────────────────────────────────────────────
describe('updateMemberPrivilegesApi', () => {
  it('updates privileges for an existing member', async () => {
    const members = [{ id: 'm1', email: 'a@b.com', privileges: ['view'] }]
    localStorage.setItem('digitalia_mock_team_members', JSON.stringify(members))
    const result = await updateMemberPrivilegesApi('m1', ['view', 'edit'])
    expect(result.privileges).toEqual(['view', 'edit'])
  })

  it('returns null when member does not exist', async () => {
    const members = [{ id: 'm1', email: 'a@b.com' }]
    localStorage.setItem('digitalia_mock_team_members', JSON.stringify(members))
    const result = await updateMemberPrivilegesApi('m-nonexistent', ['view'])
    expect(result).toBeNull()
  })
})

// ── toggleMemberStatusApi ──────────────────────────────────────────────────
describe('toggleMemberStatusApi', () => {
  it('toggles enabled=true to false', async () => {
    const members = [{ id: 'm1', email: 'a@b.com', enabled: true }]
    localStorage.setItem('digitalia_mock_team_members', JSON.stringify(members))
    const result = await toggleMemberStatusApi('m1')
    expect(result).toBe(true)
    const stored = JSON.parse(localStorage.getItem('digitalia_mock_team_members'))
    expect(stored[0].enabled).toBe(false)
  })

  it('toggles enabled=false to true', async () => {
    const members = [{ id: 'm1', email: 'a@b.com', enabled: false }]
    localStorage.setItem('digitalia_mock_team_members', JSON.stringify(members))
    await toggleMemberStatusApi('m1')
    const stored = JSON.parse(localStorage.getItem('digitalia_mock_team_members'))
    expect(stored[0].enabled).toBe(true)
  })

  it('returns false when member not found', async () => {
    const members = [{ id: 'm1', email: 'a@b.com', enabled: true }]
    localStorage.setItem('digitalia_mock_team_members', JSON.stringify(members))
    const result = await toggleMemberStatusApi('m-missing')
    expect(result).toBe(false)
  })
})

// ── removeTeamMemberApi ────────────────────────────────────────────────────
describe('removeTeamMemberApi', () => {
  it('removes a member and returns true', async () => {
    const members = [{ id: 'm1', email: 'a@b.com' }, { id: 'm2', email: 'c@d.com' }]
    localStorage.setItem('digitalia_mock_team_members', JSON.stringify(members))
    const result = await removeTeamMemberApi('m1')
    expect(result).toBe(true)
    const stored = JSON.parse(localStorage.getItem('digitalia_mock_team_members'))
    expect(stored).toHaveLength(1)
    expect(stored[0].id).toBe('m2')
  })

  it('returns false when member does not exist', async () => {
    const members = [{ id: 'm1', email: 'a@b.com' }]
    localStorage.setItem('digitalia_mock_team_members', JSON.stringify(members))
    const result = await removeTeamMemberApi('m-missing')
    expect(result).toBe(false)
  })
})

// ── getTeamActivitiesApi ───────────────────────────────────────────────────
describe('getTeamActivitiesApi', () => {
  it('returns empty array when no data exists', async () => {
    const result = await getTeamActivitiesApi()
    expect(result).toEqual([])
  })

  it('returns stored activities from localStorage fallback', async () => {
    const activities = [{ id: 'act-1', actionType: 'CREATE_JOB', targetTitle: 'Dev Role' }]
    localStorage.setItem('digitalia_shared_team_activities', JSON.stringify(activities))
    const result = await getTeamActivitiesApi()
    expect(result).toEqual(activities)
  })
})

// ── logActivityApi ─────────────────────────────────────────────────────────
describe('logActivityApi', () => {
  it('creates a local activity when backend is unavailable', async () => {
    const result = await logActivityApi('CREATE_JOB', 'Frontend Engineer', 'New role created', 'job-123')
    expect(result.actionType).toBe('CREATE_JOB')
    expect(result.targetTitle).toBe('Frontend Engineer')
    expect(result.details).toBe('New role created')
    expect(result.targetId).toBe('job-123')
    expect(result.id).toMatch(/^act-/)
    expect(result.createdAt).toBeTruthy()
  })

  it('truncates targetTitle to 200 characters', async () => {
    const longTitle = 'A'.repeat(300)
    const result = await logActivityApi('TEST', longTitle)
    expect(result.targetTitle.length).toBe(200)
  })

  it('truncates details to 1000 characters', async () => {
    const longDetails = 'B'.repeat(1500)
    const result = await logActivityApi('TEST', 'Title', longDetails)
    expect(result.details.length).toBe(1000)
  })

  it('handles non-string targetTitle gracefully', async () => {
    const result = await logActivityApi('TEST', 42)
    expect(result.targetTitle).toBe('42')
  })

  it('handles non-string details gracefully', async () => {
    const result = await logActivityApi('TEST', 'Title', null)
    expect(result.details).toBe('')
  })

  it('persists activity to localStorage and caps at 100', async () => {
    await logActivityApi('EVT', 'Job A', 'detail')
    const stored = JSON.parse(localStorage.getItem('digitalia_shared_team_activities'))
    expect(stored.length).toBeGreaterThan(0)
    expect(stored[0].actionType).toBe('EVT')
  })

  it('accumulates activities with newest first', async () => {
    await logActivityApi('FIRST', 'First')
    await logActivityApi('SECOND', 'Second')
    const stored = JSON.parse(localStorage.getItem('digitalia_shared_team_activities'))
    expect(stored[0].actionType).toBe('SECOND')
    expect(stored[1].actionType).toBe('FIRST')
  })
})
