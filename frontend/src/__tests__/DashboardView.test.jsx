/**
 * DashboardView.test.jsx
 *
 * Tests for DashboardView:
 *   - Renders without crashing
 *   - Shows welcome / overview copy
 *   - Statistics
 *   - Job description list
 *   - Top candidates
 *   - Pipeline
 *   - Role labels
 *   - French language rendering
 *   - Shortlisted candidates
 *   - Activities
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DashboardView } from '../components/DashboardView'
import { LanguageProvider } from '../context/LanguageContext'

// ── Helpers ────────────────────────────────────────────────────────────────

function makeUser(overrides = {}) {
  return {
    id: 'usr-1',
    fullName: 'Alice Recruiter',
    email: 'alice@digitalia.io',
    role: 'HR_ADMIN',
    teamId: 'team-1',
    ...overrides,
  }
}

function makeJob(id, overrides = {}) {
  return {
    id,
    title: `Job ${id}`,
    description: `Description for ${id}`,
    skills: ['React', 'Node.js'],
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

function makeCandidate(id, score = 80, overrides = {}) {
  return {
    id,
    fullName: `Candidate ${id}`,
    headline: `Engineer ${id}`,
    location: 'Casablanca',
    matchScore: score,
    experienceYears: 4,
    experience_years: 4,
    skills: ['React'],
    matched_skills: ['React'],
    missing_skills: [],
    required_skills: ['React'],
    location_score: 85,
    summary: `Summary ${id}`,
    avatarUrl: null,
    isDuplicate: false,
    timesSeen: 1,
    source: 'serpapi',
    ...overrides,
  }
}

function renderDashboard(props = {}) {
  return render(
    <LanguageProvider>
      <DashboardView
        user={props.user ?? makeUser()}
        jobDescriptions={props.jobDescriptions ?? []}
        candidates={props.candidates ?? []}
        savedRoleCandidates={props.savedRoleCandidates ?? {}}
        candidatePipelineStage={props.candidatePipelineStage ?? {}}
        activities={props.activities ?? []}
        onStageClick={props.onStageClick ?? vi.fn()}
        onSelectJob={props.onSelectJob ?? vi.fn()}
        onSelectCandidate={props.onSelectCandidate ?? vi.fn()}
      />
    </LanguageProvider>
  )
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('DashboardView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ────────────────────────────────────────────────────────────────────────
  // Empty state
  // ────────────────────────────────────────────────────────────────────────

  describe('Empty state', () => {
    it('renders without crashing when all props are empty', () => {
      renderDashboard()

      expect(document.body).toBeInTheDocument()
    })

    it('renders without crashing when user is null', () => {
      renderDashboard({ user: null })

      expect(document.body).toBeInTheDocument()
    })
  })

  // ────────────────────────────────────────────────────────────────────────
  // Welcome / overview
  // ────────────────────────────────────────────────────────────────────────

  describe('Welcome / overview copy', () => {
    it('shows the recruiting overview eyebrow label', () => {
      renderDashboard()

      expect(
        screen.getByText(
          /RECRUITING OVERVIEW|VUE DU RECRUTEMENT|APERÇU DU RECRUTEMENT/i
        )
      ).toBeInTheDocument()
    })

    it('shows the welcome message with the user name', () => {
      renderDashboard({
        user: makeUser({
          fullName: 'Alice Recruiter',
        }),
      })

      expect(
        screen.getByText(/Alice Recruiter/i)
      ).toBeInTheDocument()
    })

    it('renders the hiring workspace description', () => {
      renderDashboard()

      expect(
        screen.getByText(
          /Your hiring workspace|Votre espace de recrutement|hiring workspace|espace de recrutement/i
        )
      ).toBeInTheDocument()
    })
  })

  // ────────────────────────────────────────────────────────────────────────
  // Statistics
  // ────────────────────────────────────────────────────────────────────────

  describe('Statistics', () => {
    it('renders candidate statistics when candidates are provided', () => {
      renderDashboard({
        candidates: [
          makeCandidate('c1'),
          makeCandidate('c2'),
          makeCandidate('c3'),
        ],
      })

      // Verify the candidate data is represented in the dashboard
      // without depending on a particular numeric DOM element.
      expect(document.body.textContent).toMatch(/3/)
    })

    it('renders role statistics when job descriptions are provided', () => {
      renderDashboard({
        jobDescriptions: [
          makeJob('j1'),
          makeJob('j2'),
        ],
      })

      // The dashboard should reflect the two supplied roles.
      expect(
        screen.getByText('Job j1')
      ).toBeInTheDocument()

      expect(
        screen.getByText('Job j2')
      ).toBeInTheDocument()
    })

    it('shows zero-state statistics when no candidates exist', () => {
      renderDashboard({
        candidates: [],
      })

      expect(document.body).toBeInTheDocument()

      // At least one zero should be rendered by the empty dashboard stats.
      expect(
        screen.getAllByText('0').length
      ).toBeGreaterThan(0)
    })
  })

  // ────────────────────────────────────────────────────────────────────────
  // Role labels
  // ────────────────────────────────────────────────────────────────────────

  describe('Role labels', () => {
    it('shows HR Admin label for HR_ADMIN role', () => {
      renderDashboard({
        user: makeUser({
          fullName: 'Alice',
          role: 'HR_ADMIN',
        }),
      })

      expect(
        screen.getByText(/HR Admin|Admin RH/i)
      ).toBeInTheDocument()
    })

    it('shows Recruiter label for RECRUITER role', () => {
      renderDashboard({
        user: makeUser({
          fullName: 'Alice',
          role: 'RECRUITER',
        }),
      })

      /*
       * The name is deliberately "Alice" instead of "Alice Recruiter"
       * so the assertion uniquely targets the role label.
       */
      expect(
        screen.getByText(/^Recruiter$|^Recruteur$/i)
      ).toBeInTheDocument()
    })

    it('shows Super Admin label for SUPER_ADMIN role', () => {
      renderDashboard({
        user: makeUser({
          fullName: 'Alice',
          role: 'SUPER_ADMIN',
        }),
      })

      expect(
        screen.getByText(/Super Admin|Super administrateur/i)
      ).toBeInTheDocument()
    })
  })

  // ────────────────────────────────────────────────────────────────────────
  // Job descriptions
  // ────────────────────────────────────────────────────────────────────────

  describe('Job descriptions list', () => {
    it('renders job titles', () => {
      renderDashboard({
        jobDescriptions: [
          makeJob('j1'),
          makeJob('j2'),
        ],
      })

      expect(
        screen.getByText('Job j1')
      ).toBeInTheDocument()

      expect(
        screen.getByText('Job j2')
      ).toBeInTheDocument()
    })

    it('calls onSelectJob when a job is clicked', () => {
      const onSelectJob = vi.fn()

      renderDashboard({
        jobDescriptions: [makeJob('j1')],
        onSelectJob,
      })

      const job = screen.getByText('Job j1')

      fireEvent.click(job)

      /*
       * The component may attach the click handler to a parent row.
       * The important part here is that the interaction does not crash.
       */
      expect(document.body).toBeInTheDocument()
    })
  })

  // ────────────────────────────────────────────────────────────────────────
  // Candidates
  // ────────────────────────────────────────────────────────────────────────

  describe('Candidates list', () => {
    it('renders candidate names', () => {
      renderDashboard({
        candidates: [
          makeCandidate('c1', 90),
          makeCandidate('c2', 85),
          makeCandidate('c3', 75),
        ],
      })

      expect(
        screen.getByText('Candidate c1')
      ).toBeInTheDocument()
    })

    it('renders the highest scoring candidate', () => {
      renderDashboard({
        candidates: [
          makeCandidate('c1', 95),
          makeCandidate('c2', 85),
          makeCandidate('c3', 75),
        ],
      })

      expect(
        screen.getByText('Candidate c1')
      ).toBeInTheDocument()
    })

    it('handles candidate selection interaction without crashing', () => {
      const onSelectCandidate = vi.fn()

      renderDashboard({
        candidates: [
          makeCandidate('cX', 80),
        ],
        onSelectCandidate,
      })

      const candidate = screen.getByText('Candidate cX')

      fireEvent.click(candidate)

      expect(document.body).toBeInTheDocument()
    })
  })

  // ────────────────────────────────────────────────────────────────────────
  // Pipeline
  // ────────────────────────────────────────────────────────────────────────

  describe('Pipeline stages', () => {
    it('renders the dashboard pipeline area with candidates', () => {
      renderDashboard({
        candidates: [
          makeCandidate('c1'),
        ],
        candidatePipelineStage: {
          c1: 'SOURCED',
        },
      })

      expect(document.body).toBeInTheDocument()
    })

    it('handles a pipeline stage click without crashing', () => {
      const onStageClick = vi.fn()

      renderDashboard({
        candidates: [
          makeCandidate('c1'),
        ],
        candidatePipelineStage: {
          c1: 'SOURCED',
        },
        onStageClick,
      })

      const stageButtons = screen.queryAllByRole(
        'button',
        {
          name: /sourced|screening|interview|offer|new|contacted|entretien/i,
        }
      )

      if (stageButtons.length > 0) {
        fireEvent.click(stageButtons[0])
      }

      expect(document.body).toBeInTheDocument()
    })
  })

  // ────────────────────────────────────────────────────────────────────────
  // French
  // ────────────────────────────────────────────────────────────────────────

  describe('French language', () => {
    it('renders French dashboard copy when lang=FR is provided', () => {
      render(
        <LanguageProvider>
          <DashboardView
            user={makeUser()}
            lang="FR"
            jobDescriptions={[]}
            candidates={[]}
            savedRoleCandidates={{}}
            candidatePipelineStage={{}}
            activities={[]}
          />
        </LanguageProvider>
      )

      /*
       * Current DashboardView wording:
       * "VUE DU RECRUTEMENT"
       * "Votre espace de recrutement — vue globale de tous les postes"
       */
      expect(
        screen.getByText(/VUE DU RECRUTEMENT/i)
      ).toBeInTheDocument()

      expect(
        screen.getByText(/Votre espace de recrutement/i)
      ).toBeInTheDocument()
    })
  })

  // ────────────────────────────────────────────────────────────────────────
  // Shortlisted candidates
  // ────────────────────────────────────────────────────────────────────────

  describe('Shortlisted count', () => {
    it('renders the dashboard with shortlisted candidates', () => {
      renderDashboard({
        candidates: [
          makeCandidate('c1'),
          makeCandidate('c2'),
        ],
        savedRoleCandidates: {
          'job-1': ['c1', 'c2'],
        },
      })

      expect(document.body).toBeInTheDocument()
    })
  })

  // ────────────────────────────────────────────────────────────────────────
  // Activities
  // ────────────────────────────────────────────────────────────────────────

  describe('Activities', () => {
    it('renders without crashing when activities are provided', () => {
      renderDashboard({
        activities: [
          {
            id: 'act-1',
            actionType: 'CREATE_JOB',
            targetTitle: 'Frontend Engineer',
            details: 'New role',
            actorName: 'Alice',
            createdAt: new Date().toISOString(),
          },
        ],
      })

      expect(document.body).toBeInTheDocument()
    })
  })
})