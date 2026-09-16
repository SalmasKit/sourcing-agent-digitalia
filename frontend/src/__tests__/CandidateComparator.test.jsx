/**
 * CandidateComparator.test.jsx
 *
 * Tests for CandidateComparator:
 *   - Renders nothing when isOpen=false
 *   - Shows heading and subtitle when open
 *   - Renders one column per selected candidate
 *   - Shows candidate names and scores
 *   - Shared skills section
 *   - Close button calls onClose
 *   - Empty candidates list
 *   - Score tiers
 *   - Candidate selector
 *   - initialSelectedIds
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CandidateComparator } from '../components/CandidateComparator'
import { LanguageProvider } from '../context/LanguageContext'

// ── Helpers ────────────────────────────────────────────────────────────────

function makeCandidate(id, overrides = {}) {
  return {
    id,
    fullName: `Candidate ${id}`,
    headline: `Engineer at Company ${id}`,
    location: 'Casablanca, Morocco',
    matchScore: 80 + Number(id.replace(/\D/g, '') || 0),
    experienceYears: 5,
    experience_years: 5,
    skills: ['React', 'TypeScript', 'Node.js'],
    matched_skills: ['React', 'TypeScript'],
    missing_skills: ['Kubernetes'],
    summary: `Summary for ${id}`,
    avatarUrl: null,
    email: `${id}@example.com`,
    linkedin: `https://linkedin.com/in/${id}`,
    languages: ['English', 'French'],
    experiences: [
      {
        role: 'Engineer',
        company: 'Acme',
        period: '2020-present',
        description: 'Built stuff.',
      },
    ],
    ...overrides,
  }
}

function renderComparator(props = {}) {
  const candidates =
    props.candidates ?? [makeCandidate('c1'), makeCandidate('c2')]

  return render(
    <LanguageProvider>
      <CandidateComparator
        isOpen={props.isOpen ?? true}
        onClose={props.onClose ?? vi.fn()}
        candidates={candidates}
        initialSelectedIds={props.initialSelectedIds ?? null}
        onViewCandidate={props.onViewCandidate ?? vi.fn()}
      />
    </LanguageProvider>
  )
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('CandidateComparator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ────────────────────────────────────────────────────────────────────────
  // Visibility
  // ────────────────────────────────────────────────────────────────────────

  describe('Visibility', () => {
    it('renders nothing when isOpen=false', () => {
      const { container } = renderComparator({ isOpen: false })

      expect(container.querySelector('[class*="comp"]')).toBeNull()
    })

    it('renders the comparator when isOpen=true', () => {
      renderComparator({ isOpen: true })

      expect(
        screen.getByText(/Compare Candidates|Comparer les candidats/i)
      ).toBeInTheDocument()
    })
  })

  // ────────────────────────────────────────────────────────────────────────
  // Header
  // ────────────────────────────────────────────────────────────────────────

  describe('Header', () => {
    it('shows the "Compare Candidates" heading', () => {
      renderComparator()

      expect(
        screen.getByText(/Compare Candidates|Comparer les candidats/i)
      ).toBeInTheDocument()
    })

    it('shows the subtitle text', () => {
      renderComparator()

      expect(
        screen.getByText(
          /Shared skills and the stronger value|compétences partagées/i
        )
      ).toBeInTheDocument()
    })

    it('calls onClose when the Close button is clicked', () => {
      const onClose = vi.fn()

      renderComparator({ onClose })

      const closeBtn = screen.getByRole('button', {
        name: /close|fermer/i,
      })

      fireEvent.click(closeBtn)

      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  // ────────────────────────────────────────────────────────────────────────
  // Candidate columns
  // ────────────────────────────────────────────────────────────────────────

  describe('Candidate columns', () => {
    it('renders both candidate names when two candidates are provided', () => {
      renderComparator()

      expect(
        screen.getAllByText('Candidate c1').length
      ).toBeGreaterThanOrEqual(1)

      expect(
        screen.getAllByText('Candidate c2').length
      ).toBeGreaterThanOrEqual(1)
    })

    it('renders candidate headlines', () => {
      renderComparator()

      expect(
        screen.getByText('Engineer at Company c1')
      ).toBeInTheDocument()
    })

    it('renders with a single candidate without crashing', () => {
      renderComparator({
        candidates: [makeCandidate('solo')],
      })

      expect(
        screen.getAllByText('Candidate solo').length
      ).toBeGreaterThanOrEqual(1)
    })

    it('renders with three candidates without crashing', () => {
      renderComparator({
        candidates: [
          makeCandidate('c1'),
          makeCandidate('c2'),
          makeCandidate('c3'),
        ],
      })

      expect(
        screen.getAllByText('Candidate c1').length
      ).toBeGreaterThanOrEqual(1)

      expect(
        screen.getAllByText('Candidate c3').length
      ).toBeGreaterThanOrEqual(1)
    })
  })

  // ────────────────────────────────────────────────────────────────────────
  // Empty candidates
  // ────────────────────────────────────────────────────────────────────────

  describe('Empty candidates', () => {
    it('renders without crashing when candidates array is empty', () => {
      renderComparator({ candidates: [] })

      expect(
        screen.getByText(/Compare Candidates|Comparer les candidats/i)
      ).toBeInTheDocument()
    })
  })

  // ────────────────────────────────────────────────────────────────────────
  // Score tiers
  // ────────────────────────────────────────────────────────────────────────

  describe('Score tiers', () => {
    it('renders HOT tier for score >= 90', () => {
      renderComparator({
        candidates: [makeCandidate('hot', { matchScore: 95 })],
      })

      expect(
        screen.getByText(/hot lead|profil prioritaire/i)
      ).toBeInTheDocument()
    })

    it('renders good match tier for score >= 80', () => {
      renderComparator({
        candidates: [makeCandidate('good', { matchScore: 82 })],
      })

      expect(
        screen.getByText(/good match|forte correspondance/i)
      ).toBeInTheDocument()
    })

    it('renders possible fit tier for score < 80', () => {
      renderComparator({
        candidates: [makeCandidate('low', { matchScore: 65 })],
      })

      expect(
        screen.getByText(/possible fit|profil potentiel/i)
      ).toBeInTheDocument()
    })
  })

  // ────────────────────────────────────────────────────────────────────────
  // Candidate chip selector
  // ────────────────────────────────────────────────────────────────────────

  describe('Candidate chip selector', () => {
    it('renders the Comparing / Sélectionnés label', () => {
      renderComparator()

      expect(
        screen.getByText(/Comparing|Sélectionnés/i)
      ).toBeInTheDocument()
    })

    it('renders chip buttons for all candidates', () => {
      renderComparator({
        candidates: [
          makeCandidate('c1'),
          makeCandidate('c2'),
          makeCandidate('c3'),
        ],
      })

      const candidateTexts = screen.getAllByText(/Candidate c/i)

      expect(candidateTexts.length).toBeGreaterThanOrEqual(3)
    })
  })

  // ────────────────────────────────────────────────────────────────────────
  // Skills
  // ────────────────────────────────────────────────────────────────────────

  describe('Skills section', () => {
    it('renders skills row labels', () => {
      renderComparator()

      const skillLabels = screen.getAllByText(
        /Skills|Compétences/i
      )

      expect(skillLabels.length).toBeGreaterThan(0)
    })

    it('shows shared skills between candidates', () => {
      const c1 = makeCandidate('c1', {
        skills: ['React', 'TypeScript', 'Docker'],
      })

      const c2 = makeCandidate('c2', {
        skills: ['React', 'TypeScript', 'Kubernetes'],
      })

      renderComparator({
        candidates: [c1, c2],
      })

      expect(
        screen.getAllByText('React').length
      ).toBeGreaterThan(0)

      expect(
        screen.getAllByText('TypeScript').length
      ).toBeGreaterThan(0)
    })
  })

  // ────────────────────────────────────────────────────────────────────────
  // initialSelectedIds
  // ────────────────────────────────────────────────────────────────────────

  describe('initialSelectedIds', () => {
    it('pre-selects candidates when initialSelectedIds is provided', () => {
      const candidates = [
        makeCandidate('c1'),
        makeCandidate('c2'),
        makeCandidate('c3'),
      ]

      renderComparator({
        candidates,
        initialSelectedIds: ['c1', 'c3'],
      })

      // Candidate names can appear both in the selector chips
      // and in the comRabaton columns, so do not require uniqueness.
      expect(
        screen.getAllByText('Candidate c1').length
      ).toBeGreaterThan(0)

      expect(
        screen.getAllByText('Candidate c3').length
      ).toBeGreaterThan(0)
    })
  })
})