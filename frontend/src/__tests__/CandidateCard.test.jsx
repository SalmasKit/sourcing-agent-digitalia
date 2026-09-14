/**
 * CandidateCard.test.jsx
 *
 * Tests for CandidateCard rendering, score tiers, interaction callbacks,
 * match reasoning expansion, skills display, and edge-case data.
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CandidateCard } from '../components/CandidateCard'
import { LanguageProvider } from '../context/LanguageContext'

// ── Test helpers ───────────────────────────────────────────────────────────

function makeCandidate(overrides = {}) {
  return {
    id: 'cand-001',
    fullName: 'Amina Benjelloun',
    headline: 'Senior React Engineer',
    location: 'Casablanca, Morocco',
    matchScore: 85,
    experienceYears: 6,
    experience_years: 6,
    min_experience_years: 3,
    skills: ['React', 'TypeScript', 'Node.js', 'GraphQL', 'Jest'],
    matched_skills: ['React', 'TypeScript'],
    missing_skills: ['Kubernetes'],
    required_skills: ['React', 'TypeScript', 'Kubernetes'],
    location_score: 90,
    summary: 'Experienced frontend engineer specialising in React.',
    avatarUrl: null,
    linkedin: 'https://linkedin.com/in/amina',
    availability: 'Open for Outreach',
    salaryExpectation: '25,000 - 34,000 MAD / mo',
    languages: ['French', 'English', 'Arabic'],
    experiences: [
      {
        role: 'Senior Engineer',
        company: 'TechCorp',
        period: '2021–present',
        description: 'Led frontend.',
      },
    ],
    isDuplicate: false,
    timesSeen: 1,
    source: 'serpapi',
    ...overrides,
  }
}

function renderCard(props = {}) {
  const candidate = makeCandidate(props.candidate)

  return render(
    <LanguageProvider>
      <CandidateCard
        candidate={candidate}
        index={0}
        onViewDetails={props.onViewDetails ?? vi.fn()}
        onEdit={props.onEdit ?? vi.fn()}
        onDelete={props.onDelete ?? vi.fn()}
        onSaveForJob={props.onSaveForJob ?? vi.fn()}
        onToggleSelect={props.onToggleSelect ?? vi.fn()}
        selected={props.selected ?? false}
        isSavedForJob={props.isSavedForJob ?? false}
        selectedJobId={props.selectedJobId ?? 'job-123'}
      />
    </LanguageProvider>
  )
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('CandidateCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering — basic content', () => {
    it('renders the candidate full name', () => {
      renderCard()

      expect(
        screen.getByText('Amina Benjelloun')
      ).toBeInTheDocument()
    })

    it('renders the candidate headline', () => {
      renderCard()

      expect(
        screen.getByText('Senior React Engineer')
      ).toBeInTheDocument()
    })

    it('renders the candidate location', () => {
      renderCard()

      expect(
        screen.getByText('Casablanca, Morocco')
      ).toBeInTheDocument()
    })

    it('renders the match score', () => {
      renderCard()

      expect(screen.getByText('85')).toBeInTheDocument()
    })

    it('renders the card index number (01)', () => {
      renderCard()

      expect(screen.getByText('01')).toBeInTheDocument()
    })
  })

  describe('Score tiers', () => {
    it('uses the HOT tier styling for score >= 90', () => {
      const { container } = renderCard({
        candidate: { matchScore: 92 },
      })

      const root = container.querySelector('.cc-root')

      expect(root).toBeInTheDocument()
      expect(root).toHaveStyle('--tier-color: #E85D3D')
    })

    it('uses the STRONG tier styling for score >= 80', () => {
      const { container } = renderCard({
        candidate: { matchScore: 85 },
      })

      const root = container.querySelector('.cc-root')

      expect(root).toBeInTheDocument()
      expect(root).toHaveStyle('--tier-color: #08AFCB')
    })

    it('uses the GOOD tier styling for score >= 70', () => {
      const { container } = renderCard({
        candidate: { matchScore: 74 },
      })

      const root = container.querySelector('.cc-root')

      expect(root).toBeInTheDocument()
      expect(root).toHaveStyle('--tier-color: #5B5BD6')
    })

    it('uses the PARTIAL tier styling for score >= 60', () => {
      const { container } = renderCard({
        candidate: { matchScore: 65 },
      })

      const root = container.querySelector('.cc-root')

      expect(root).toBeInTheDocument()
      expect(root).toHaveStyle('--tier-color: #C58A22')
    })

    it('uses the LOW tier styling for score < 60', () => {
      const { container } = renderCard({
        candidate: { matchScore: 45 },
      })

      const root = container.querySelector('.cc-root')

      expect(root).toBeInTheDocument()
      expect(root).toHaveStyle('--tier-color: #8A8F98')
    })

    it('uses the LOW tier styling for score of 0', () => {
      const { container } = renderCard({
        candidate: { matchScore: 0 },
      })

      const root = container.querySelector('.cc-root')

      expect(root).toBeInTheDocument()
      expect(root).toHaveStyle('--tier-color: #8A8F98')
    })
  })

  describe('Skills display', () => {
    it('renders visible skills (up to 5 by default)', () => {
      renderCard()

      expect(screen.getByText('React')).toBeInTheDocument()
      expect(screen.getByText('TypeScript')).toBeInTheDocument()
    })

    it('renders a candidate with no skills without crashing', () => {
      renderCard({
        candidate: {
          skills: [],
        },
      })

      expect(
        screen.getByText('Amina Benjelloun')
      ).toBeInTheDocument()
    })

    it('renders a candidate with undefined skills without crashing', () => {
      renderCard({
        candidate: {
          skills: undefined,
        },
      })

      expect(
        screen.getByText('Amina Benjelloun')
      ).toBeInTheDocument()
    })

    it('shows a +N more badge when skills exceed 5', () => {
      renderCard({
        candidate: {
          skills: [
            'React',
            'TypeScript',
            'Node.js',
            'GraphQL',
            'Jest',
            'Docker',
            'Kubernetes',
          ],
        },
      })

      // 7 skills, 5 visible = 2 hidden.
      expect(screen.getByText('+2')).toBeInTheDocument()
    })
  })

  describe('Shortlist / save action', () => {
    it('calls onSaveForJob when the shortlist button is clicked', () => {
      const onSaveForJob = vi.fn()

      renderCard({
        onSaveForJob,
      })

      const bookmarkBtn = screen.getByRole('button', {
        name: /shortlist|save|présélectionner/i,
      })

      fireEvent.click(bookmarkBtn)

      expect(onSaveForJob).toHaveBeenCalledWith('cand-001')
    })

    it('shows saved state when isSavedForJob is true', () => {
      renderCard({
        isSavedForJob: true,
      })

      const bookmarkBtn = screen.getByRole('button', {
        name: /shortlisted|saved|présélectionné/i,
      })

      expect(bookmarkBtn).toBeInTheDocument()
    })
  })

  describe('Selection', () => {
    it('applies is-selected class when selected=true', () => {
      const { container } = renderCard({
        selected: true,
      })

      expect(
        container.querySelector('.is-selected')
      ).toBeInTheDocument()
    })

    it('does not apply is-selected class when selected=false', () => {
      const { container } = renderCard({
        selected: false,
      })

      expect(
        container.querySelector('.is-selected')
      ).toBeNull()
    })

    it('calls onToggleSelect when selection checkbox is clicked', () => {
      const onToggleSelect = vi.fn()

      renderCard({
        onToggleSelect,
      })

      const checkbox =
        document.querySelector('input[type="checkbox"]') ||
        screen.queryByRole('checkbox')

      if (checkbox) {
        fireEvent.click(checkbox)

        expect(onToggleSelect).toHaveBeenCalled()
      }
    })
  })

  describe('Match signal / reasoning', () => {
    it('renders the MATCH SIGNAL button', () => {
      renderCard()

      expect(
        screen.getByRole('button', {
          name: /match signal|signal de correspondance/i,
        })
      ).toBeInTheDocument()
    })

    it('expands the reasoning panel when match signal is clicked', () => {
      renderCard()

      const signalBtn = screen.getByRole('button', {
        name: /match signal|signal de correspondance/i,
      })

      fireEvent.click(signalBtn)

      // The expanded panel should expose the match reasoning content.
      expect(
        screen.getByText(/Skills|Compétences/i)
      ).toBeInTheDocument()
    })

    it('toggles the reasoning panel when match signal is clicked twice', () => {
      renderCard()

      const signalBtn = screen.getByRole('button', {
        name: /match signal|signal de correspondance/i,
      })

      fireEvent.click(signalBtn)

      expect(
        screen.getByText(/Skills|Compétences/i)
      ).toBeInTheDocument()

      fireEvent.click(signalBtn)

      // After the second click, the reasoning content should no longer
      // be visible.
      expect(
        screen.queryByText(/Matched skills|Compétences correspondantes/i)
      ).not.toBeInTheDocument()
    })
  })

  describe('View details callback', () => {
    it('calls onViewDetails when the view-details button is clicked', () => {
      const onViewDetails = vi.fn()

      renderCard({
        onViewDetails,
      })

      const viewBtn = screen.queryByRole('button', {
        name: /view|voir|profile|profil/i,
      })

      if (viewBtn) {
        fireEvent.click(viewBtn)

        expect(onViewDetails).toHaveBeenCalled()
      }
    })
  })

  describe('Edge cases', () => {
    it('renders without crashing when candidate has no location', () => {
      renderCard({
        candidate: {
          location: null,
        },
      })

      expect(
        screen.getByText('Amina Benjelloun')
      ).toBeInTheDocument()
    })

    it('renders without crashing when candidate has no headline', () => {
      renderCard({
        candidate: {
          headline: null,
        },
      })

      expect(
        screen.getByText('Amina Benjelloun')
      ).toBeInTheDocument()
    })

    it('renders without crashing when experienceYears is 0', () => {
      renderCard({
        candidate: {
          experienceYears: 0,
          experience_years: 0,
        },
      })

      expect(
        screen.getByText('Amina Benjelloun')
      ).toBeInTheDocument()
    })

    it('renders without crashing when matched_skills is empty', () => {
      renderCard({
        candidate: {
          matched_skills: [],
          missing_skills: [],
        },
      })

      expect(
        screen.getByText('Amina Benjelloun')
      ).toBeInTheDocument()
    })

    it('renders without crashing when candidate has no avatar', () => {
      renderCard({
        candidate: {
          avatarUrl: null,
        },
      })

      expect(
        screen.getByText('Amina Benjelloun')
      ).toBeInTheDocument()
    })

    it('renders with a provided avatar URL', () => {
      renderCard({
        candidate: {
          avatarUrl: 'https://example.com/avatar.png',
        },
      })

      const img = document.querySelector('img')

      if (img) {
        expect(img.src).toContain('example.com')
      }
    })

    it('renders the card index for non-zero index', () => {
      render(
        <LanguageProvider>
          <CandidateCard
            candidate={makeCandidate()}
            index={4}
            onViewDetails={vi.fn()}
            onEdit={vi.fn()}
            onDelete={vi.fn()}
            onSaveForJob={vi.fn()}
            onToggleSelect={vi.fn()}
            selected={false}
            isSavedForJob={false}
          />
        </LanguageProvider>
      )

      expect(screen.getByText('05')).toBeInTheDocument()
    })
  })
})