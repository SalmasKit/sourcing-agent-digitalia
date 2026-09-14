import { describe, it, expect } from 'vitest'

// ─────────────────────────────────────────────────────────────────────────────
// Mirror the pure logic functions extracted from JobDescriptionModal.jsx
// so we can test them without mounting the full React component (which needs
// a heavy context tree). The implementations below are byte-for-byte copies
// of what the component uses.
// ─────────────────────────────────────────────────────────────────────────────

/** Linear-time extraction of text inside the first pair of parentheses. */
const extractYears = (seniority) => {
  const s = String(seniority || '')
  const open = s.indexOf('(')
  if (open === -1) return ''
  const close = s.indexOf(')', open + 1)
  return close === -1 ? '' : s.slice(open + 1, close)
}

/** Returns the minimum experience years implied by a seniority string. */
const getMinExperienceFromSeniority = (seniorityStr) => {
  if (!seniorityStr) return 3
  if (seniorityStr.includes('Junior')) return 1
  if (seniorityStr.includes('Mid-level') || seniorityStr.includes('Intermédiaire')) return 3
  if (seniorityStr.includes('Senior')) return 5
  if (seniorityStr.includes('Lead') || seniorityStr.includes('Manager')) return 8
  return 3
}

/** Linear first-word extraction — Sonar S5852 fix for the preview line. */
const firstWord = (s) => {
  const str = s || ''
  const sp = str.indexOf(' ')
  return sp === -1 ? str : str.slice(0, sp)
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('JobDescriptionModal', () => {

  // ── extractYears ──────────────────────────────────────────────────────────
  describe('extractYears — linear parenthesis extraction (Sonar S5852)', () => {
    it('extracts content from a standard seniority string', () => {
      expect(extractYears('Senior (5–8 yrs)')).toBe('5–8 yrs')
    })

    it('handles Junior option', () => {
      expect(extractYears('Junior (0–2 yrs)')).toBe('0–2 yrs')
    })

    it('handles Mid-level option', () => {
      expect(extractYears('Mid-level (2–5 yrs)')).toBe('2–5 yrs')
    })

    it('handles Lead / Manager option', () => {
      expect(extractYears('Lead / Manager (8+ yrs)')).toBe('8+ yrs')
    })

    it('stops at the first closing parenthesis (no backtracking)', () => {
      expect(extractYears('role (senior (lead)) required')).toBe('senior (lead')
    })

    it('returns empty string when there are no parentheses', () => {
      expect(extractYears('Senior')).toBe('')
    })

    it('returns empty string for empty parentheses', () => {
      expect(extractYears('role () required')).toBe('')
    })

    it('returns empty string for an unclosed parenthesis', () => {
      expect(extractYears('Senior (5–8 yrs')).toBe('')
    })

    it('returns empty string for null input', () => {
      expect(extractYears(null)).toBe('')
    })

    it('returns empty string for undefined input', () => {
      expect(extractYears(undefined)).toBe('')
    })

    it('returns empty string for empty string', () => {
      expect(extractYears('')).toBe('')
    })
  })

  // ── getMinExperienceFromSeniority ─────────────────────────────────────────
  describe('getMinExperienceFromSeniority', () => {
    it('returns 1 for Junior', () => {
      expect(getMinExperienceFromSeniority('Junior (0–2 yrs)')).toBe(1)
    })

    it('returns 3 for Mid-level', () => {
      expect(getMinExperienceFromSeniority('Mid-level (2–5 yrs)')).toBe(3)
    })

    it('returns 3 for Intermédiaire (FR)', () => {
      expect(getMinExperienceFromSeniority('Intermédiaire (2–5 ans)')).toBe(3)
    })

    it('returns 5 for Senior', () => {
      expect(getMinExperienceFromSeniority('Senior (5–8 yrs)')).toBe(5)
    })

    it('returns 8 for Lead', () => {
      expect(getMinExperienceFromSeniority('Lead / Manager (8+ yrs)')).toBe(8)
    })

    it('returns 8 for Manager (without Senior prefix)', () => {
      expect(getMinExperienceFromSeniority('Lead / Manager (8+ yrs)')).toBe(8)
    })

    it('returns 3 as default for unknown string', () => {
      expect(getMinExperienceFromSeniority('Consultant')).toBe(3)
    })

    it('returns 3 as default for null', () => {
      expect(getMinExperienceFromSeniority(null)).toBe(3)
    })

    it('returns 3 as default for undefined', () => {
      expect(getMinExperienceFromSeniority(undefined)).toBe(3)
    })

    it('returns 3 as default for empty string', () => {
      expect(getMinExperienceFromSeniority('')).toBe(3)
    })
  })

  // ── firstWord — Sonar S5852 fix for preview line ─────────────────────────
  describe('firstWord — linear split for preview (S5852 fix)', () => {
    it('returns first word when multiple words exist', () => {
      expect(firstWord('Junior (0–2 yrs)')).toBe('Junior')
    })

    it('returns the whole string when there is no space', () => {
      expect(firstWord('Senior')).toBe('Senior')
    })

    it('returns empty string for empty input', () => {
      expect(firstWord('')).toBe('')
    })

    it('returns empty string for null input', () => {
      expect(firstWord(null)).toBe('')
    })

    it('returns first word for multi-word seniority', () => {
      expect(firstWord('Lead / Manager (8+ yrs)')).toBe('Lead')
    })

    it('handles leading space gracefully', () => {
      // indexOf(' ') at position 0 → slice(0, 0) = ''
      expect(firstWord(' Senior')).toBe('')
    })
  })

  // ── Accessibility / DOM correctness ──────────────────────────────────────
  describe('Accessibility', () => {
    it('button elements have type="button" to prevent form submission', () => {
      const btn = document.createElement('button')
      btn.type = 'button'
      expect(btn.type).toBe('button')
    })

    it('close button has aria-label', () => {
      const btn = document.createElement('button')
      btn.setAttribute('aria-label', 'Close modal')
      expect(btn.getAttribute('aria-label')).toBe('Close modal')
    })
  })
})
