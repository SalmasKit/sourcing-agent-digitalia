import { describe, it, expect } from 'vitest'
import { formatNoteTimestamp } from './RecruiterNotesView.jsx'

describe('RecruiterNotesView Utilities', () => {
  describe('formatNoteTimestamp', () => {
    it('should return empty string for null/undefined note', () => {
      expect(formatNoteTimestamp(null)).toBe('')
      expect(formatNoteTimestamp(undefined)).toBe('')
    })

    it('should format timestamp with createdAt field', () => {
      const note = {
        createdAt: '2024-01-15T10:30:00Z'
      }
      const result = formatNoteTimestamp(note, false)
      expect(result).toContain('2024')
      expect(result).toContain('at')
    })

    it('should format timestamp in French', () => {
      const note = {
        createdAt: '2024-01-15T10:30:00Z'
      }
      const result = formatNoteTimestamp(note, true)
      expect(result).toContain('2024')
      expect(result).toContain('à')
    })

    it('should handle numeric id as timestamp', () => {
      const note = {
        id: 1705326600000 // Valid timestamp
      }
      const result = formatNoteTimestamp(note, false)
      expect(result).toContain('at')
    })

    it('should return time field if date parsing fails', () => {
      const note = {
        time: 'custom time'
      }
      const result = formatNoteTimestamp(note, false)
      expect(result).toBe('custom time')
    })

    it('should handle invalid date gracefully using Number.isNaN', () => {
      const note = {
        createdAt: 'invalid-date'
      }
      const result = formatNoteTimestamp(note, false)
      expect(result).toBe('')
    })

    it('should handle small numeric id as invalid timestamp', () => {
      const note = {
        id: 12345 // Too small to be a timestamp
      }
      const result = formatNoteTimestamp(note, false)
      expect(result).toBe('')
    })
  })
})
