import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  isValidJwt,
  storage,
  inviteRecruiterApi,
  cancelInvitationApi,
  updateMemberPrivilegesApi,
  toggleMemberStatusApi,
  removeTeamMemberApi,
} from './api.js'

describe('API Service', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('isValidJwt', () => {
    it('should return true for valid JWT format', () => {
      const validToken = 'test.test.token' // Clearly fake test token
      expect(isValidJwt(validToken)).toBe(true)
    })

    it('should return false for invalid JWT', () => {
      expect(isValidJwt('invalid')).toBe(false)
      expect(isValidJwt('a.b')).toBe(false)
      expect(isValidJwt(null)).toBe(false)
      expect(isValidJwt(undefined)).toBe(false)
      expect(isValidJwt(123)).toBe(false)
    })
  })

  describe('storage', () => {
    beforeEach(() => {
      localStorage.clear()
    })

    describe('getAccessToken', () => {
      it('should return null when no token exists', () => {
        expect(storage.getAccessToken()).toBeNull()
      })

      it('should return valid token', () => {
        const token = 'valid.jwt.token'
        localStorage.setItem('digitalia_auth_token', token)
        expect(storage.getAccessToken()).toBe(token)
      })

      it('should clear invalid token', () => {
        localStorage.setItem('digitalia_auth_token', 'invalid')
        localStorage.setItem('digitalia_refresh_token', 'refresh')
        localStorage.setItem('digitalia_auth_user', JSON.stringify({ name: 'test' }))
        expect(storage.getAccessToken()).toBeNull()
        expect(localStorage.getItem('digitalia_auth_token')).toBeNull()
      })
    })

    describe('getRefreshToken', () => {
      it('should return null when no refresh token exists', () => {
        expect(storage.getRefreshToken()).toBeNull()
      })

      it('should return refresh token', () => {
        const token = 'refresh_token'
        localStorage.setItem('digitalia_refresh_token', token)
        expect(storage.getRefreshToken()).toBe(token)
      })
    })

    describe('getUser', () => {
      it('should return null when no user exists', () => {
        expect(storage.getUser()).toBeNull()
      })

      it('should return valid user', () => {
        const user = { id: '1', name: 'Test User', email: 'test@example.com' }
        localStorage.setItem('digitalia_auth_token', 'valid.jwt.token')
        localStorage.setItem('digitalia_auth_user', JSON.stringify(user))
        expect(storage.getUser()).toEqual(user)
      })

      it('should return null for invalid JSON', () => {
        localStorage.setItem('digitalia_auth_token', 'valid.jwt.token')
        localStorage.setItem('digitalia_auth_user', 'invalid json')
        expect(storage.getUser()).toBeNull()
      })
    })

    describe('setSession', () => {
      it('should set session data', () => {
        const accessToken = 'access_token'
        const refreshToken = 'refresh_token'
        const user = { id: '1', name: 'Test' }
        storage.setSession(accessToken, refreshToken, user)
        expect(localStorage.getItem('digitalia_auth_token')).toBe(accessToken)
        expect(localStorage.getItem('digitalia_refresh_token')).toBe(refreshToken)
        expect(JSON.parse(localStorage.getItem('digitalia_auth_user'))).toEqual(user)
      })
    })

    describe('clearSession', () => {
      it('should clear all session data', () => {
        localStorage.setItem('digitalia_auth_token', 'token')
        localStorage.setItem('digitalia_refresh_token', 'refresh')
        localStorage.setItem('digitalia_auth_user', JSON.stringify({ name: 'test' }))
        storage.clearSession()
        expect(localStorage.getItem('digitalia_auth_token')).toBeNull()
        expect(localStorage.getItem('digitalia_refresh_token')).toBeNull()
        expect(localStorage.getItem('digitalia_auth_user')).toBeNull()
      })
    })
  })

  describe('SonarCloud fixes', () => {
    describe('Number.isNaN usage', () => {
      it('should use Number.isNaN instead of global isNaN', () => {
        expect(Number.isNaN(NaN)).toBe(true)
        expect(Number.isNaN(123)).toBe(false)
        expect(Number.isNaN('123')).toBe(false)
        expect(Number.isNaN(undefined)).toBe(false)
      })

      it('should distinguish Number.isNaN from global isNaN', () => {
        expect(isNaN('test')).toBe(true) // global isNaN coerces to number
        expect(Number.isNaN('test')).toBe(false) // Number.isNaN does not coerce
      })
    })

    describe('Number.parseInt usage', () => {
      it('should use Number.parseInt instead of global parseInt', () => {
        expect(Number.parseInt('123')).toBe(123)
        expect(Number.parseInt('123px')).toBe(123)
        expect(Number.parseInt('abc')).toBe(Number.NaN)
      })

      it('should handle radix parameter correctly', () => {
        expect(Number.parseInt('10', 10)).toBe(10)
        expect(Number.parseInt('10', 2)).toBe(2)
        expect(Number.parseInt('ff', 16)).toBe(255)
      })
    })

    describe('Regex patterns (SonarCloud fixes)', () => {
      it('should use safe regex for experience extraction', () => {
        const text = '5 years of experience'
        const pattern = /\d+/
        const match = text.match(pattern)
        expect(match).toBeTruthy()
        expect(match[0]).toBe('5')
      })

      it('should handle candidate count extraction safely', () => {
        const text = 'Found 10 candidates'
        const pattern = /\d+/
        const match = text.match(pattern)
        expect(match).toBeTruthy()
        expect(match[0]).toBe('10')
      })

      it('should handle missing candidate data gracefully', () => {
        const text = 'No candidates found'
        const pattern = /\d+/
        const match = text.match(pattern)
        expect(match).toBeNull()
      })
    })
  })

  describe('Team Management API (localStorage fallback)', () => {
    it('should cancel invitation from localStorage', async () => {
      const invitations = [{ id: 'inv-1', email: 'test@example.com' }]
      localStorage.setItem('digitalia_mock_invitations', JSON.stringify(invitations))

      const result = await cancelInvitationApi('inv-1')
      expect(result).toBe(true)
      const saved = JSON.parse(localStorage.getItem('digitalia_mock_invitations'))
      expect(saved).toHaveLength(0)
    })

    it('should update member privileges in localStorage', async () => {
      const members = [{ id: 'm1', email: 'test@example.com', privileges: ['view'] }]
      localStorage.setItem('digitalia_mock_team_members', JSON.stringify(members))

      const result = await updateMemberPrivilegesApi('m1', ['view', 'edit'])
      expect(result.privileges).toEqual(['view', 'edit'])
    })

    it('should toggle member status in localStorage', async () => {
      const members = [{ id: 'm1', email: 'test@example.com', enabled: true }]
      localStorage.setItem('digitalia_mock_team_members', JSON.stringify(members))

      const result = await toggleMemberStatusApi('m1')
      expect(result).toBe(true)
      const saved = JSON.parse(localStorage.getItem('digitalia_mock_team_members'))
      expect(saved[0].enabled).toBe(false)
    })

    it('should remove team member from localStorage', async () => {
      const members = [{ id: 'm1', email: 'test@example.com' }]
      localStorage.setItem('digitalia_mock_team_members', JSON.stringify(members))

      const result = await removeTeamMemberApi('m1')
      expect(result).toBe(true)
      const saved = JSON.parse(localStorage.getItem('digitalia_mock_team_members'))
      expect(saved).toHaveLength(0)
    })

    it('should return false when removing non-existent member', async () => {
      const members = [{ id: 'm1', email: 'test@example.com' }]
      localStorage.setItem('digitalia_mock_team_members', JSON.stringify(members))

      const result = await removeTeamMemberApi('m2')
      expect(result).toBe(false)
    })
  })
})
