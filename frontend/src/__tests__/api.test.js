import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * These tests mock axios directly so we can control resolved/rejected
 * responses precisely and exercise both:
 *  - the "happy path" branches of api.js that only run when the backend
 *    actually answers (the unmocked-network tests in api.test.js /
 *    api.extended.test.js only ever hit the failure/fallback branches,
 *    since there's no real server in the test environment), and
 *  - the localStorage-fallback branches inside the `catch` blocks of the
 *    team-management / activity-logging functions, which only run when a
 *    backend call rejects and nothing else in the suite drives them.
 *
 * axios.create() is called twice in api.js (once for the Spring Boot client
 * with baseURL '/api/v1', once for the agent-service client with baseURL
 * '/agent-api'). We differentiate the two mock instances by that baseURL so
 * calls route to the right mock.
 */
const { apiClientMock, agentClientMock } = vi.hoisted(() => {
  const makeInstance = () => ({
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
    defaults: { headers: {} },
  })

  return { apiClientMock: makeInstance(), agentClientMock: makeInstance() }
})

vi.mock('axios', () => ({
  default: {
    create: vi.fn((config) =>
      config?.baseURL === '/agent-api' ? agentClientMock : apiClientMock
    ),
    post: vi.fn(),
  },
}))

const {
  storage,
  loginApi,
  registerApi,
  acceptInviteApi,
  changePasswordApi,
  forgotPasswordApi,
  resetPasswordApi,
  getTeamMembersApi,
  getPendingInvitationsApi,
  inviteRecruiterApi,
  cancelInvitationApi,
  updateMemberPrivilegesApi,
  toggleMemberStatusApi,
  removeTeamMemberApi,
  getTeamActivitiesApi,
  logActivityApi,
  draftOutreachApi,
  searchCandidatesApi,
} = await import('../services/api.js')

beforeEach(() => {
  localStorage.clear()
  vi.resetAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('API Service (success paths)', () => {
  describe('loginApi', () => {
    it('normalizes a successful login response and persists the session', async () => {
      apiClientMock.post.mockResolvedValueOnce({
        data: {
          data: {
            accessToken: 'aaa.bbb.ccc',
            refreshToken: 'refresh-1',
            user: {
              id: 'u1',
              email: 'jane@corp.com',
              fullName: 'Jane Doe',
              role: 'RECRUITER',
              teamId: 'team-1',
              privileges: 'view, edit',
            },
          },
        },
      })

      const result = await loginApi('jane@corp.com', 'pw')

      expect(result.token).toBe('aaa.bbb.ccc')
      expect(result.user.privileges).toEqual(['view', 'edit'])
      expect(result.user.fullName).toBe('Jane Doe')
      expect(storage.getAccessToken()).toBe('aaa.bbb.ccc')
      expect(storage.getRefreshToken()).toBe('refresh-1')
    })

    it('forces the full default privilege set for HR_ADMIN users, ignoring any provided privileges', async () => {
      apiClientMock.post.mockResolvedValueOnce({
        data: {
          data: {
            accessToken: 'aaa.bbb.ccc',
            refreshToken: 'refresh-1',
            user: { email: 'admin@corp.com', role: 'HR_ADMIN', privileges: 'ignored' },
          },
        },
      })

      const result = await loginApi('admin@corp.com', 'pw')

      expect(result.user.privileges).toEqual([
        'create_roles',
        'shortlist_candidates',
        'manage_notes',
        'source_candidates',
        'export_data',
      ])
    })

    it('derives a display name from the email when no name is returned', async () => {
      apiClientMock.post.mockResolvedValueOnce({
        data: {
          data: {
            accessToken: 'aaa.bbb.ccc',
            refreshToken: 'refresh-1',
            user: { email: 'noname@corp.com', role: 'RECRUITER' },
          },
        },
      })

      const result = await loginApi('noname@corp.com', 'pw')

      expect(result.user.name).toBe('noname')
      expect(result.user.fullName).toBe('noname')
    })
  })

  describe('registerApi', () => {
    it('normalizes a successful registration response', async () => {
      apiClientMock.post.mockResolvedValueOnce({
        data: { data: { id: 'u2', email: 'new@corp.com', fullName: 'New Person', role: 'RECRUITER' } },
      })

      const result = await registerApi('New Person', 'new@corp.com', 'pw')

      expect(result.user).toEqual({
        id: 'u2',
        email: 'new@corp.com',
        name: 'New Person',
        fullName: 'New Person',
        role: 'RECRUITER',
      })
    })
  })

  describe('acceptInviteApi', () => {
    it('normalizes a successful invite-acceptance response and persists the session', async () => {
      apiClientMock.post.mockResolvedValueOnce({
        data: {
          data: {
            accessToken: 'aaa.bbb.ccc',
            refreshToken: 'refresh-2',
            user: {
              id: 'u3',
              email: 'invitee@corp.com',
              role: 'RECRUITER',
              privileges: 'shortlist_candidates,manage_notes',
            },
          },
        },
      })

      const result = await acceptInviteApi('invite-token', 'Invitee Name', 'pw')

      expect(result.token).toBe('aaa.bbb.ccc')
      expect(result.user.fullName).toBe('Invitee Name')
      expect(result.user.privileges).toEqual(['shortlist_candidates', 'manage_notes'])
      expect(storage.getAccessToken()).toBe('aaa.bbb.ccc')
    })

    it('falls back to default privileges when the server does not return any', async () => {
      apiClientMock.post.mockResolvedValueOnce({
        data: {
          data: {
            accessToken: 'aaa.bbb.ccc',
            refreshToken: 'refresh-2',
            user: { email: 'invitee2@corp.com' },
          },
        },
      })

      const result = await acceptInviteApi('invite-token', 'Invitee Two', 'pw')

      expect(result.user.privileges).toEqual([
        'shortlist_candidates',
        'manage_notes',
        'source_candidates',
      ])
      expect(result.user.role).toBe('RECRUITER')
    })
  })

  describe('team management (server success)', () => {
    it('getTeamMembersApi returns the server list', async () => {
      apiClientMock.get.mockResolvedValueOnce({ data: { data: [{ id: 'm1' }] } })

      const result = await getTeamMembersApi()

      expect(result).toEqual([{ id: 'm1' }])
    })

    it('getPendingInvitationsApi returns the server list', async () => {
      apiClientMock.get.mockResolvedValueOnce({ data: { data: [{ id: 'inv-1' }] } })

      const result = await getPendingInvitationsApi()

      expect(result).toEqual([{ id: 'inv-1' }])
    })

    it('inviteRecruiterApi returns the server-created invitation without touching localStorage', async () => {
      apiClientMock.post.mockResolvedValueOnce({ data: { data: { id: 'server-inv-1' } } })

      const result = await inviteRecruiterApi('new@corp.com', 'New Person')

      expect(result).toEqual({ id: 'server-inv-1' })
      expect(localStorage.getItem('digitalia_mock_invitations')).toBeNull()
    })

    it('cancelInvitationApi returns true on a successful delete', async () => {
      apiClientMock.delete.mockResolvedValueOnce({})

      const result = await cancelInvitationApi('inv-1')

      expect(result).toBe(true)
      expect(apiClientMock.delete).toHaveBeenCalledWith('/team/invitations/inv-1')
    })

    it('updateMemberPrivilegesApi returns the server-updated member', async () => {
      apiClientMock.put.mockResolvedValueOnce({
        data: { data: { id: 'm1', privileges: ['view', 'edit'] } },
      })

      const result = await updateMemberPrivilegesApi('m1', ['view', 'edit'])

      expect(result).toEqual({ id: 'm1', privileges: ['view', 'edit'] })
    })

    it('toggleMemberStatusApi returns true on a successful server call', async () => {
      apiClientMock.put.mockResolvedValueOnce({})

      const result = await toggleMemberStatusApi('m1')

      expect(result).toBe(true)
      expect(apiClientMock.put).toHaveBeenCalledWith('/team/members/m1/toggle-status')
    })

    it('toggleMemberStatusApi falls back to false when the member is not found locally', async () => {
      apiClientMock.put.mockRejectedValueOnce(new Error('unreachable'))
      localStorage.setItem(
        'digitalia_mock_team_members',
        JSON.stringify([{ id: 'someone-else', enabled: true }])
      )

      const result = await toggleMemberStatusApi('missing-id')

      expect(result).toBe(false)
    })

    it('removeTeamMemberApi returns true on a successful delete', async () => {
      apiClientMock.delete.mockResolvedValueOnce({})

      const result = await removeTeamMemberApi('m1')

      expect(result).toBe(true)
      expect(apiClientMock.delete).toHaveBeenCalledWith('/team/members/m1')
    })
  })

  describe('activity log (server success)', () => {
    it('getTeamActivitiesApi returns the server list and respects a custom limit', async () => {
      apiClientMock.get.mockResolvedValueOnce({ data: { data: [{ id: 'act-1' }] } })

      const result = await getTeamActivitiesApi(10)

      expect(result).toEqual([{ id: 'act-1' }])
      expect(apiClientMock.get).toHaveBeenCalledWith('/team/activities?limit=10')
    })

    it('logActivityApi posts the truncated payload and returns the server record', async () => {
      apiClientMock.post.mockResolvedValueOnce({ data: { data: { id: 'server-act-1' } } })

      const result = await logActivityApi('ROLE_CREATED', 'A Title', 'Some details', 'role-1')

      expect(result).toEqual({ id: 'server-act-1' })
      expect(apiClientMock.post).toHaveBeenCalledWith('/team/activities', {
        actionType: 'ROLE_CREATED',
        targetId: 'role-1',
        targetTitle: 'A Title',
        details: 'Some details',
      })
    })
  })

  describe('draftOutreachApi', () => {
    it('posts the normalized candidate payload and returns the draft', async () => {
      agentClientMock.post.mockResolvedValueOnce({
        data: { subject: 'Hi there', body: 'Draft body' },
      })

      const candidate = {
        full_name: 'Karim Alaoui',
        headline: 'Backend Engineer',
        skills: ['Java'],
        experiences: [],
      }

      const result = await draftOutreachApi(candidate, { title: 'Backend Role' }, 'email')

      expect(result).toEqual({ subject: 'Hi there', body: 'Draft body' })
      expect(agentClientMock.post).toHaveBeenCalledWith('/api/outreach', {
        candidate: {
          full_name: 'Karim Alaoui',
          headline: 'Backend Engineer',
          skills: ['Java'],
          experiences: [],
        },
        job_context: { title: 'Backend Role' },
        channel: 'email',
      })
    })
  })

  describe('searchCandidatesApi', () => {
    it('maps talent-pool results when searchMode is "pool"', async () => {
      agentClientMock.post.mockResolvedValueOnce({
        data: {
          candidates: [
            {
              id: 'pool-1',
              full_name: 'Jane Doe',
              headline: 'Senior Engineer at Acme',
              email: 'jane@corp.com',
              skills: ['React'],
              experience_years: 6,
              pool_similarity: 88,
            },
          ],
        },
      })

      const result = await searchCandidatesApi('react dev', { searchMode: 'pool' })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: 'pool-1',
        fullName: 'Jane Doe',
        email: 'jane@corp.com',
        matchScore: 88,
        experienceYears: 6,
        source: 'talent_pool',
      })
    })

    it('filters out placeholder talent-pool emails', async () => {
      agentClientMock.post.mockResolvedValueOnce({
        data: {
          candidates: [
            {
              full_name: 'No Email Person',
              email: 'placeholder@talent-candidate.ma',
              headline: 'Engineer',
            },
          ],
        },
      })

      const result = await searchCandidatesApi('engineer', { searchMode: 'pool' })

      expect(result[0].email).toBeNull()
    })

    it('maps agent-service results in the default search mode', async () => {
      agentClientMock.post.mockResolvedValueOnce({
        data: {
          profiles: [
            {
              full_name: 'Yassine El Idrissi',
              headline: 'Senior Backend Engineer at TechCo',
              email: 'yassine@corp.com',
              match_score: 91,
              skills: ['Node.js'],
            },
          ],
        },
      })
      apiClientMock.post.mockResolvedValue({ data: {} })

      const result = await searchCandidatesApi('senior backend engineer', { maxResults: 5 })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        fullName: 'Yassine El Idrissi',
        email: 'yassine@corp.com',
        matchScore: 91,
        source: 'serpapi',
        experienceYears: 5, // inferred from "Senior" in the headline
      })
      expect(agentClientMock.post).toHaveBeenCalledWith(
        '/api/search',
        expect.objectContaining({ max_results: 5 })
      )
    })

    it('falls back to the Spring Boot backend when the agent service fails', async () => {
      agentClientMock.post.mockRejectedValueOnce(new Error('agent unavailable'))
      apiClientMock.post.mockResolvedValueOnce({ data: { data: { id: 'search-123' } } })
      apiClientMock.get.mockResolvedValueOnce({
        data: {
          data: {
            content: [
              {
                id: 'p1',
                fullName: 'Karim Alaoui',
                headline: 'Backend Developer at Acme',
                experienceYears: 4,
                email: 'karim@corp.com',
                score: 82,
              },
            ],
          },
        },
      })

      vi.useFakeTimers()
      const resultPromise = searchCandidatesApi('backend developer')
      await vi.advanceTimersByTimeAsync(2500)
      const result = await resultPromise
      vi.useRealTimers()

      expect(result).toHaveLength(1)
      expect(result[0].fullName).toBe('Karim Alaoui')
      expect(result[0].matchScore).toBe(82)
    })

    it('returns an empty array when the agent service returns no profiles and the backend has none either', async () => {
      agentClientMock.post.mockResolvedValueOnce({ data: { profiles: [] } })
      apiClientMock.post.mockResolvedValueOnce({ data: { data: { id: 'search-456' } } })
      apiClientMock.get.mockResolvedValueOnce({ data: { data: { content: [] } } })

      vi.useFakeTimers()
      const resultPromise = searchCandidatesApi('nonexistent role')
      await vi.advanceTimersByTimeAsync(2500)
      const result = await resultPromise
      vi.useRealTimers()

      expect(result).toEqual([])
    })
  })
})

describe('API Service (localStorage fallback branches)', () => {
  describe('getTeamMembersApi', () => {
    it('returns the parsed localStorage list when the backend call rejects', async () => {
      apiClientMock.get.mockRejectedValueOnce(new Error('down'))
      localStorage.setItem(
        'digitalia_mock_team_members',
        JSON.stringify([{ id: 'local-1' }])
      )

      const result = await getTeamMembersApi()

      expect(result).toEqual([{ id: 'local-1' }])
    })

    it('returns an empty array when the backend rejects and nothing is stored locally', async () => {
      apiClientMock.get.mockRejectedValueOnce(new Error('down'))

      const result = await getTeamMembersApi()

      expect(result).toEqual([])
    })

    it('returns an empty array when the backend rejects and stored JSON is corrupt', async () => {
      apiClientMock.get.mockRejectedValueOnce(new Error('down'))
      localStorage.setItem('digitalia_mock_team_members', '{not-json')

      const result = await getTeamMembersApi()

      expect(result).toEqual([])
    })
  })

  describe('getPendingInvitationsApi', () => {
    it('returns the parsed localStorage list when the backend call rejects', async () => {
      apiClientMock.get.mockRejectedValueOnce(new Error('down'))
      localStorage.setItem(
        'digitalia_mock_invitations',
        JSON.stringify([{ id: 'inv-local-1' }])
      )

      const result = await getPendingInvitationsApi()

      expect(result).toEqual([{ id: 'inv-local-1' }])
    })

    it('returns an empty array when the backend rejects and nothing is stored locally', async () => {
      apiClientMock.get.mockRejectedValueOnce(new Error('down'))

      const result = await getPendingInvitationsApi()

      expect(result).toEqual([])
    })
  })

  describe('inviteRecruiterApi', () => {
    it('creates and persists a mock invitation when the backend call rejects', async () => {
      apiClientMock.post.mockRejectedValueOnce(new Error('down'))

      const result = await inviteRecruiterApi('new@corp.com', 'New Person', ['manage_notes'], 'RECRUITER')

      expect(result).toMatchObject({
        email: 'new@corp.com',
        fullName: 'New Person',
        role: 'RECRUITER',
        privileges: ['manage_notes'],
        status: 'PENDING',
      })
      expect(result.token).toMatch(/^inv_/)

      const saved = JSON.parse(localStorage.getItem('digitalia_mock_invitations'))
      expect(saved).toHaveLength(1)
      expect(saved[0].email).toBe('new@corp.com')
    })

    it('prepends new mock invitations to any already stored', async () => {
      apiClientMock.post.mockRejectedValueOnce(new Error('down'))
      localStorage.setItem(
        'digitalia_mock_invitations',
        JSON.stringify([{ id: 'existing-inv' }])
      )

      await inviteRecruiterApi('another@corp.com')

      const saved = JSON.parse(localStorage.getItem('digitalia_mock_invitations'))
      expect(saved).toHaveLength(2)
      expect(saved[0].email).toBe('another@corp.com')
      expect(saved[1]).toEqual({ id: 'existing-inv' })
    })
  })

  describe('cancelInvitationApi', () => {
    it('removes the matching invitation from localStorage and returns true', async () => {
      apiClientMock.delete.mockRejectedValueOnce(new Error('down'))
      localStorage.setItem(
        'digitalia_mock_invitations',
        JSON.stringify([{ id: 'inv-1' }, { id: 'inv-2' }])
      )

      const result = await cancelInvitationApi('inv-1')

      expect(result).toBe(true)
      const saved = JSON.parse(localStorage.getItem('digitalia_mock_invitations'))
      expect(saved).toEqual([{ id: 'inv-2' }])
    })

    it('returns false when the invitation is not found locally', async () => {
      apiClientMock.delete.mockRejectedValueOnce(new Error('down'))
      localStorage.setItem(
        'digitalia_mock_invitations',
        JSON.stringify([{ id: 'inv-2' }])
      )

      const result = await cancelInvitationApi('missing-id')

      expect(result).toBe(false)
    })
  })

  describe('updateMemberPrivilegesApi', () => {
    it('updates and persists the member privileges locally when the backend rejects', async () => {
      apiClientMock.put.mockRejectedValueOnce(new Error('down'))
      localStorage.setItem(
        'digitalia_mock_team_members',
        JSON.stringify([{ id: 'm1', privileges: ['view'] }])
      )

      const result = await updateMemberPrivilegesApi('m1', ['view', 'edit'])

      expect(result).toEqual({ id: 'm1', privileges: ['view', 'edit'] })
      const saved = JSON.parse(localStorage.getItem('digitalia_mock_team_members'))
      expect(saved).toEqual([{ id: 'm1', privileges: ['view', 'edit'] }])
    })

    it('returns null when the member is not found locally', async () => {
      apiClientMock.put.mockRejectedValueOnce(new Error('down'))

      const result = await updateMemberPrivilegesApi('missing-id', ['view'])

      expect(result).toBeNull()
    })
  })

  describe('toggleMemberStatusApi', () => {
    it('flips the member enabled flag locally and returns true when found', async () => {
      apiClientMock.put.mockRejectedValueOnce(new Error('down'))
      localStorage.setItem(
        'digitalia_mock_team_members',
        JSON.stringify([{ id: 'm1', enabled: true }])
      )

      const result = await toggleMemberStatusApi('m1')

      expect(result).toBe(true)
      const saved = JSON.parse(localStorage.getItem('digitalia_mock_team_members'))
      expect(saved).toEqual([{ id: 'm1', enabled: false }])
    })
  })

  describe('removeTeamMemberApi', () => {
    it('removes the member locally and returns true when the backend rejects', async () => {
      apiClientMock.delete.mockRejectedValueOnce(new Error('down'))
      localStorage.setItem(
        'digitalia_mock_team_members',
        JSON.stringify([{ id: 'm1' }, { id: 'm2' }])
      )

      const result = await removeTeamMemberApi('m1')

      expect(result).toBe(true)
      const saved = JSON.parse(localStorage.getItem('digitalia_mock_team_members'))
      expect(saved).toEqual([{ id: 'm2' }])
    })

    it('returns false when the member does not exist locally', async () => {
      apiClientMock.delete.mockRejectedValueOnce(new Error('down'))
      localStorage.setItem(
        'digitalia_mock_team_members',
        JSON.stringify([{ id: 'm2' }])
      )

      const result = await removeTeamMemberApi('missing-id')

      expect(result).toBe(false)
    })
  })

  describe('getTeamActivitiesApi', () => {
    it('returns the parsed localStorage activities when the backend rejects', async () => {
      apiClientMock.get.mockRejectedValueOnce(new Error('down'))
      localStorage.setItem(
        'digitalia_shared_team_activities',
        JSON.stringify([{ id: 'act-local-1' }])
      )

      const result = await getTeamActivitiesApi()

      expect(result).toEqual([{ id: 'act-local-1' }])
    })

    it('returns an empty array when the backend rejects and nothing is stored', async () => {
      apiClientMock.get.mockRejectedValueOnce(new Error('down'))

      const result = await getTeamActivitiesApi()

      expect(result).toEqual([])
    })

    it('returns an empty array when the backend rejects and stored JSON is corrupt', async () => {
      apiClientMock.get.mockRejectedValueOnce(new Error('down'))
      localStorage.setItem('digitalia_shared_team_activities', '{not-json')

      const result = await getTeamActivitiesApi()

      expect(result).toEqual([])
    })
  })

  describe('logActivityApi', () => {
    it('builds and persists a local activity record from the current user when the backend rejects', async () => {
      apiClientMock.post.mockRejectedValueOnce(new Error('down'))
      // storage.getUser() only returns the stored user when the access
      // token is JWT-shaped (three dot-separated parts) — see isValidJwt.
      storage.setSession('aaa.bbb.ccc', 'refresh', {
        fullName: 'Jane Doe',
        email: 'jane@corp.com',
        role: 'HR_ADMIN',
      })

      const result = await logActivityApi('ROLE_CREATED', 'A Title', 'Some details', 'role-1')

      expect(result).toMatchObject({
        actorName: 'Jane Doe',
        actorEmail: 'jane@corp.com',
        actorRole: 'HR_ADMIN',
        actionType: 'ROLE_CREATED',
        targetId: 'role-1',
        targetTitle: 'A Title',
        details: 'Some details',
      })

      const saved = JSON.parse(localStorage.getItem('digitalia_shared_team_activities'))
      expect(saved).toHaveLength(1)
      expect(saved[0].id).toBe(result.id)
    })

    it('falls back to default actor info when no user session is stored', async () => {
      apiClientMock.post.mockRejectedValueOnce(new Error('down'))

      const result = await logActivityApi('ROLE_CREATED', 'A Title')

      expect(result).toMatchObject({
        actorName: 'Team Member',
        actorEmail: 'user@digitalia.io',
        actorRole: 'RECRUITER',
      })
    })

    it('prepends to existing local activities and caps the stored list at 100 entries', async () => {
      apiClientMock.post.mockRejectedValueOnce(new Error('down'))
      const existing = Array.from({ length: 100 }, (_, i) => ({ id: `act-${i}` }))
      localStorage.setItem('digitalia_shared_team_activities', JSON.stringify(existing))

      await logActivityApi('ROLE_CREATED', 'Newest')

      const saved = JSON.parse(localStorage.getItem('digitalia_shared_team_activities'))
      expect(saved).toHaveLength(100)
      expect(saved[0].targetTitle).toBe('Newest')
    })
  })
})

describe('API Service (remaining uncovered branches)', () => {
  describe('parseExperienceYears (exercised via searchCandidatesApi)', () => {
    it('infers 8 years from a "lead"/"principal"/"architect"/"manager" headline', async () => {
      agentClientMock.post.mockResolvedValueOnce({
        data: {
          profiles: [
            { full_name: 'Lead Person', headline: 'Lead Backend Architect at Acme' },
          ],
        },
      })
      apiClientMock.post.mockResolvedValue({ data: {} })

      const result = await searchCandidatesApi('lead engineer')

      expect(result[0].experienceYears).toBe(8)
    })

    it('extracts a numeric year count from headline text like "7 years"', async () => {
      agentClientMock.post.mockResolvedValueOnce({
        data: {
          profiles: [
            { full_name: 'Numeric Person', headline: 'Engineer with 7 years of experience' },
          ],
        },
      })
      apiClientMock.post.mockResolvedValue({ data: {} })

      const result = await searchCandidatesApi('experienced engineer')

      expect(result[0].experienceYears).toBe(7)
    })
  })

  describe('searchTalentPoolApi (pool mode failure)', () => {
    it('returns an empty array when the agent-service pool search rejects', async () => {
      agentClientMock.post.mockRejectedValueOnce(new Error('pool unavailable'))

      const result = await searchCandidatesApi('react dev', { searchMode: 'pool' })

      expect(result).toEqual([])
    })
  })

  describe('searchCandidatesApi (prompt-building branches)', () => {
    it('appends the location filter to the prompt when not already present', async () => {
      agentClientMock.post.mockResolvedValueOnce({ data: { profiles: [] } })
      apiClientMock.post.mockResolvedValue({ data: {} })

      await searchCandidatesApi('backend engineer', { location: 'Casablanca' })

      expect(agentClientMock.post).toHaveBeenCalledWith(
        '/api/search',
        expect.objectContaining({ query: expect.stringContaining('in Casablanca') })
      )
    })

    it('appends missing tech skills to the prompt', async () => {
      agentClientMock.post.mockResolvedValueOnce({ data: { profiles: [] } })
      apiClientMock.post.mockResolvedValue({ data: {} })

      await searchCandidatesApi('backend engineer', { tech: ['React', 'Node'] })

      expect(agentClientMock.post).toHaveBeenCalledWith(
        '/api/search',
        expect.objectContaining({ query: expect.stringContaining('with skills React, Node') })
      )
    })

    it('appends a minimum-experience clause when minExp is set and not already mentioned', async () => {
      agentClientMock.post.mockResolvedValueOnce({ data: { profiles: [] } })
      apiClientMock.post.mockResolvedValue({ data: {} })

      await searchCandidatesApi('backend engineer', { minExp: 3 })

      expect(agentClientMock.post).toHaveBeenCalledWith(
        '/api/search',
        expect.objectContaining({ query: expect.stringContaining('with 3+ years experience') })
      )
    })

    it('extracts a result limit from a count phrase in the query when maxResults/limit is not set', async () => {
      agentClientMock.post.mockResolvedValueOnce({ data: { profiles: [] } })
      apiClientMock.post.mockResolvedValue({ data: {} })

      await searchCandidatesApi('find 10 candidates for backend role')

      expect(agentClientMock.post).toHaveBeenCalledWith(
        '/api/search',
        expect.objectContaining({ max_results: 10 })
      )
    })
  })

  describe('changePasswordApi', () => {
    it('returns the server response on success', async () => {
      apiClientMock.post.mockResolvedValueOnce({ data: { success: true } })

      const result = await changePasswordApi('old-pw', 'new-pw')

      expect(result).toEqual({ success: true })
      expect(apiClientMock.post).toHaveBeenCalledWith('/auth/change-password', {
        currentPassword: 'old-pw',
        newPassword: 'new-pw',
      })
    })

    it('rethrows the error when the backend call fails (DEMO_MODE is off in tests)', async () => {
      apiClientMock.post.mockRejectedValueOnce(new Error('backend down'))

      await expect(changePasswordApi('old-pw', 'new-pw')).rejects.toThrow('backend down')
    })
  })

  describe('forgotPasswordApi', () => {
    it('returns the server payload on success', async () => {
      apiClientMock.post.mockResolvedValueOnce({ data: { data: { message: 'sent' } } })

      const result = await forgotPasswordApi('jane@corp.com')

      expect(result).toEqual({ message: 'sent' })
    })

    it('rethrows the error when the backend call fails', async () => {
      apiClientMock.post.mockRejectedValueOnce(new Error('backend down'))

      await expect(forgotPasswordApi('jane@corp.com')).rejects.toThrow('backend down')
    })
  })

  describe('resetPasswordApi', () => {
    it('returns the server response on success', async () => {
      apiClientMock.post.mockResolvedValueOnce({ data: { success: true } })

      const result = await resetPasswordApi('reset-token', 'new-pw')

      expect(result).toEqual({ success: true })
      expect(apiClientMock.post).toHaveBeenCalledWith('/auth/reset-password', {
        token: 'reset-token',
        newPassword: 'new-pw',
      })
    })

    it('rethrows the error when the backend call fails', async () => {
      apiClientMock.post.mockRejectedValueOnce(new Error('backend down'))

      await expect(resetPasswordApi('reset-token', 'new-pw')).rejects.toThrow('backend down')
    })
  })

  describe('acceptInviteApi (failure path)', () => {
    it('rethrows the error when the backend call fails (DEMO_MODE is off in tests)', async () => {
      apiClientMock.post.mockRejectedValueOnce(new Error('backend down'))

      await expect(acceptInviteApi('invite-token', 'Someone', 'pw')).rejects.toThrow('backend down')
    })
  })
})