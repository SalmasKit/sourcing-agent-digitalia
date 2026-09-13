import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from './AuthContext.jsx'
import * as api from '../services/api.js'

// Mock API functions
vi.mock('../services/api.js', () => ({
  loginApi: vi.fn(),
  registerApi: vi.fn(),
  logoutApi: vi.fn(),
  acceptInviteApi: vi.fn(),
  storage: {
    getAccessToken: vi.fn(),
    getRefreshToken: vi.fn(),
    getUser: vi.fn(),
    setSession: vi.fn(),
    clearSession: vi.fn(),
  },
}))

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Clean up event listeners is handled by jsdom automatically
  })

  const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>

  describe('initial state', () => {
    it('should restore session from localStorage on mount', async () => {
      const mockUser = { id: '1', name: 'Test User', email: 'test@example.com' }
      const mockToken = 'test_token'
      api.storage.getAccessToken.mockReturnValue(mockToken)
      api.storage.getUser.mockReturnValue(mockUser)

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.user).toEqual(mockUser)
      expect(result.current.token).toBe(mockToken)
    })

    it('should clear session and set null user when no saved session', async () => {
      api.storage.getAccessToken.mockReturnValue(null)
      api.storage.getUser.mockReturnValue(null)

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.user).toBeNull()
      expect(result.current.token).toBeNull()
      expect(api.storage.clearSession).toHaveBeenCalled()
    })
  })

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockUser = { id: '1', name: 'Test User', email: 'test@example.com' }
      const mockToken = 'access_token'
      const mockRefreshToken = 'refresh_token'
      api.loginApi.mockResolvedValue({
        token: mockToken,
        refreshToken: mockRefreshToken,
        user: mockUser,
      })

      const { result } = renderHook(() => useAuth(), { wrapper })

      let success
      await act(async () => {
        success = await result.current.login('test@example.com', 'password')
      })

      expect(success).toBe(true)
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.token).toBe(mockToken)
      expect(api.storage.setSession).toHaveBeenCalledWith(mockToken, mockRefreshToken, mockUser)
    })

    it('should return false on login failure', async () => {
      api.loginApi.mockResolvedValue(null)

      const { result } = renderHook(() => useAuth(), { wrapper })

      let success
      await act(async () => {
        success = await result.current.login('test@example.com', 'wrong')
      })

      expect(success).toBe(false)
      expect(result.current.user).toBeNull()
    })
  })

  describe('register', () => {
    it('should register and login successfully', async () => {
      const mockUser = { id: '1', name: 'Test User', email: 'test@example.com' }
      const mockToken = 'access_token'
      const mockRefreshToken = 'refresh_token'
      api.registerApi.mockResolvedValue({
        token: mockToken,
        refreshToken: mockRefreshToken,
        user: mockUser,
      })

      const { result } = renderHook(() => useAuth(), { wrapper })

      let success
      await act(async () => {
        success = await result.current.register('Test User', 'test@example.com', 'password')
      })

      expect(success).toBe(true)
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.token).toBe(mockToken)
    })

    it('should fallback to login if register returns user without token', async () => {
      const mockUser = { id: '1', name: 'Test User', email: 'test@example.com' }
      api.registerApi.mockResolvedValue({ user: mockUser })
      api.loginApi.mockResolvedValue({
        token: 'access_token',
        refreshToken: 'refresh_token',
        user: mockUser,
      })

      const { result } = renderHook(() => useAuth(), { wrapper })

      let success
      await act(async () => {
        success = await result.current.register('Test User', 'test@example.com', 'password')
      })

      expect(success).toBe(true)
      expect(api.loginApi).toHaveBeenCalledWith('test@example.com', 'password')
    })

    it('should return false on register failure', async () => {
      api.registerApi.mockResolvedValue(null)

      const { result } = renderHook(() => useAuth(), { wrapper })

      let success
      await act(async () => {
        success = await result.current.register('Test User', 'test@example.com', 'password')
      })

      expect(success).toBe(false)
    })
  })

  describe('acceptInvitation', () => {
    it('should accept invitation successfully', async () => {
      const mockUser = { id: '1', name: 'Test User', email: 'test@example.com' }
      const mockToken = 'access_token'
      const mockRefreshToken = 'refresh_token'
      api.acceptInviteApi.mockResolvedValue({
        token: mockToken,
        refreshToken: mockRefreshToken,
        user: mockUser,
      })

      const { result } = renderHook(() => useAuth(), { wrapper })

      let success
      await act(async () => {
        success = await result.current.acceptInvitation('invite_token', 'Test User', 'password')
      })

      expect(success).toBe(true)
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.token).toBe(mockToken)
    })

    it('should return false on accept invitation failure', async () => {
      api.acceptInviteApi.mockResolvedValue(null)

      const { result } = renderHook(() => useAuth(), { wrapper })

      let success
      await act(async () => {
        success = await result.current.acceptInvitation('invite_token', 'Test User', 'password')
      })

      expect(success).toBe(false)
    })
  })

  describe('hasPrivilege', () => {
    it('should return true for HR_ADMIN regardless of privileges', () => {
      api.storage.getAccessToken.mockReturnValue('token')
      api.storage.getUser.mockReturnValue({
        id: '1',
        role: 'HR_ADMIN',
        privileges: [],
      })

      const { result } = renderHook(() => useAuth(), { wrapper })

      expect(result.current.hasPrivilege('any_privilege')).toBe(true)
    })

    it('should return true for SUPER_ADMIN regardless of privileges', () => {
      api.storage.getAccessToken.mockReturnValue('token')
      api.storage.getUser.mockReturnValue({
        id: '1',
        role: 'SUPER_ADMIN',
        privileges: [],
      })

      const { result } = renderHook(() => useAuth(), { wrapper })

      expect(result.current.hasPrivilege('any_privilege')).toBe(true)
    })

    it('should return true when user has the privilege in array', () => {
      api.storage.getAccessToken.mockReturnValue('token')
      api.storage.getUser.mockReturnValue({
        id: '1',
        role: 'RECRUITER',
        privileges: ['privilege1', 'privilege2'],
      })

      const { result } = renderHook(() => useAuth(), { wrapper })

      expect(result.current.hasPrivilege('privilege1')).toBe(true)
    })

    it('should return false when user does not have the privilege', () => {
      api.storage.getAccessToken.mockReturnValue('token')
      api.storage.getUser.mockReturnValue({
        id: '1',
        role: 'RECRUITER',
        privileges: ['privilege1'],
      })

      const { result } = renderHook(() => useAuth(), { wrapper })

      expect(result.current.hasPrivilege('privilege2')).toBe(false)
    })

    it('should handle string privileges', () => {
      api.storage.getAccessToken.mockReturnValue('token')
      api.storage.getUser.mockReturnValue({
        id: '1',
        role: 'RECRUITER',
        privileges: 'privilege1, privilege2',
      })

      const { result } = renderHook(() => useAuth(), { wrapper })

      expect(result.current.hasPrivilege('privilege1')).toBe(true)
    })

    it('should return false when user is null', () => {
      api.storage.getAccessToken.mockReturnValue(null)
      api.storage.getUser.mockReturnValue(null)

      const { result } = renderHook(() => useAuth(), { wrapper })

      expect(result.current.hasPrivilege('any_privilege')).toBe(false)
    })
  })

  describe('updateUser', () => {
    it('should update user data and persist to storage', async () => {
      const mockUser = { id: '1', name: 'Test User', email: 'test@example.com' }
      api.storage.getAccessToken.mockReturnValue('token')
      api.storage.getRefreshToken.mockReturnValue('refresh')
      api.storage.getUser.mockReturnValue(mockUser)

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        result.current.updateUser({ name: 'Updated Name' })
      })

      expect(result.current.user.name).toBe('Updated Name')
      expect(api.storage.setSession).toHaveBeenCalled()
    })
  })

  describe('logout', () => {
    it('should logout and clear session', async () => {
      const mockUser = { id: '1', name: 'Test User', email: 'test@example.com' }
      api.storage.getAccessToken.mockReturnValue('token')
      api.storage.getUser.mockReturnValue(mockUser)
      api.logoutApi.mockResolvedValue({})

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.logout()
      })

      expect(result.current.user).toBeNull()
      expect(result.current.token).toBeNull()
      expect(api.logoutApi).toHaveBeenCalled()
    })
  })

  describe('session expiry event', () => {
    it('should clear session on auth:session-expired event', async () => {
      const mockUser = { id: '1', name: 'Test User', email: 'test@example.com' }
      api.storage.getAccessToken.mockReturnValue('token')
      api.storage.getUser.mockReturnValue(mockUser)

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        window.dispatchEvent(new CustomEvent('auth:session-expired'))
      })

      expect(result.current.user).toBeNull()
      expect(result.current.token).toBeNull()
      expect(api.storage.clearSession).toHaveBeenCalled()
    })
  })
})
