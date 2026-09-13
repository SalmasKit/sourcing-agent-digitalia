import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { 
  getEmptyWorkspaceState, 
  loadInitialWorkspaceData, 
  mergeCandidateResults, 
  tagFreshResults 
} from './App.jsx'

describe('App Utility Functions', () => {
  beforeEach(() => {
    // Vitest doesn't provide localStorage in jsdom, so we need to mock it
    const localStorageMock = (() => {
      let store = {}
      return {
        getItem: (key) => store[key] || null,
        setItem: (key, value) => { store[key] = String(value) },
        removeItem: (key) => { delete store[key] },
        clear: () => { store = {} }
      }
    })()
    Object.defineProperty(global, 'localStorage', { value: localStorageMock })
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('getEmptyWorkspaceState', () => {
    it('should return empty workspace state', () => {
      const state = getEmptyWorkspaceState()
      expect(state).toEqual({
        jobDescriptions: [],
        savedRoleCandidates: {},
        candidatePipelineStage: {},
        searchHistory: [],
        jobResultsCache: {},
        shortlist: []
      })
    })
  })

  describe('loadInitialWorkspaceData', () => {
    it('should load data from team key storage', () => {
      const teamKey = 'test-team'
      const userKey = 'test@example.com'
      
      localStorage.setItem('targetalent_team_test-team_job_descriptions', JSON.stringify([{ id: 1, title: 'Test Job' }]))
      
      const data = loadInitialWorkspaceData(teamKey, userKey)
      expect(data.jobDescriptions).toEqual([{ id: 1, title: 'Test Job' }])
    })

    it('should fallback to user key storage', () => {
      const teamKey = 'test-team'
      const userKey = 'test@example.com'
      
      localStorage.setItem('targetalent_user_test@example.com_job_descriptions', JSON.stringify([{ id: 2, title: 'Fallback Job' }]))
      
      const data = loadInitialWorkspaceData(teamKey, userKey)
      expect(data.jobDescriptions).toEqual([{ id: 2, title: 'Fallback Job' }])
    })

    it('should return empty state when no data exists', () => {
      const data = loadInitialWorkspaceData('test-team', 'test@example.com')
      expect(data.jobDescriptions).toEqual([])
      expect(data.savedRoleCandidates).toEqual({})
    })

    it('should handle invalid JSON gracefully', () => {
      const teamKey = 'test-team'
      const userKey = 'test@example.com'
      
      localStorage.setItem('targetalent_team_test-team_job_descriptions', 'invalid json')
      
      const data = loadInitialWorkspaceData(teamKey, userKey)
      expect(data.jobDescriptions).toEqual([])
    })
  })

  describe('mergeCandidateResults', () => {
    it('should merge empty lists', () => {
      const result = mergeCandidateResults([], [])
      expect(result).toEqual([])
    })

    it('should merge new results with empty existing', () => {
      const newResults = [
        { id: '1', fullName: 'John Doe', isNew: true }
      ]
      const result = mergeCandidateResults([], newResults)
      expect(result).toHaveLength(1)
      expect(result[0].isNew).toBe(true)
    })

    it('should mark duplicates by ID', () => {
      const existing = [
        { id: '1', fullName: 'John Doe', notes: ['Initial note'] }
      ]
      const newResults = [
        { id: '1', fullName: 'John Doe', isNew: true }
      ]
      const result = mergeCandidateResults(existing, newResults)
      expect(result).toHaveLength(1)
      expect(result[0].isNew).toBe(false)
      expect(result[0].timesSeen).toBe(2)
      expect(result[0].notes).toEqual(['Initial note'])
    })

    it('should mark duplicates by name when ID missing', () => {
      const existing = [
        { fullName: 'John Doe', notes: ['Initial note'] }
      ]
      const newResults = [
        { fullName: 'John Doe', isNew: true }
      ]
      const result = mergeCandidateResults(existing, newResults)
      expect(result).toHaveLength(1)
      expect(result[0].isNew).toBe(false)
      expect(result[0].timesSeen).toBe(2)
    })

    it('should append unmatched existing candidates', () => {
      const existing = [
        { id: '1', fullName: 'John Doe' },
        { id: '2', fullName: 'Jane Smith' }
      ]
      const newResults = [
        { id: '1', fullName: 'John Doe' }
      ]
      const result = mergeCandidateResults(existing, newResults)
      expect(result).toHaveLength(2)
      expect(result[0].isNew).toBe(false)
      expect(result[1].isNew).toBe(false)
      expect(result[1].fullName).toBe('Jane Smith')
    })

    it('should handle null candidates gracefully', () => {
      const existing = [
        { id: '1', fullName: 'John Doe' },
        null,
        { id: '2', fullName: 'Jane Smith' }
      ]
      const newResults = [
        { id: '3', fullName: 'Bob Wilson' }
      ]
      const result = mergeCandidateResults(existing, newResults)
      expect(result).toHaveLength(3)
    })
  })

  describe('tagFreshResults', () => {
    it('should tag all results as new', () => {
      const results = [
        { id: '1', fullName: 'John Doe' },
        { id: '2', fullName: 'Jane Smith' }
      ]
      const result = tagFreshResults(results)
      expect(result).toHaveLength(2)
      expect(result[0].isNew).toBe(true)
      expect(result[1].isNew).toBe(true)
      expect(result[0].isPrevious).toBe(false)
      expect(result[1].isPrevious).toBe(false)
    })

    it('should add sourcedAt timestamp', () => {
      const results = [
        { id: '1', fullName: 'John Doe' }
      ]
      const result = tagFreshResults(results)
      expect(result[0].sourcedAt).toBeDefined()
      expect(new Date(result[0].sourcedAt)).toBeInstanceOf(Date)
    })

    it('should handle empty array', () => {
      const result = tagFreshResults([])
      expect(result).toEqual([])
    })

    it('should handle null candidates gracefully', () => {
      const results = [
        { id: '1', fullName: 'John Doe' },
        null,
        { id: '2', fullName: 'Jane Smith' }
      ]
      const result = tagFreshResults(results)
      expect(result).toHaveLength(3)
    })

    it('should preserve existing candidate properties', () => {
      const results = [
        { id: '1', fullName: 'John Doe', skills: ['JavaScript', 'React'], location: 'Remote' }
      ]
      const result = tagFreshResults(results)
      expect(result[0].skills).toEqual(['JavaScript', 'React'])
      expect(result[0].location).toBe('Remote')
    })
  })
})
