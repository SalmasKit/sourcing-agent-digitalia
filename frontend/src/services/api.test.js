import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  isValidJwt,
  storage,
} from './api.js'

describe('API Service', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('isValidJwt', () => {
    it('should return true for valid JWT format', () => {
      const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
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
})
