import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useLanguage } from '../context/LanguageContext'
import AgentStatusWidget from '../components/AgentStatusWidget.jsx'

// Mock LanguageContext
vi.mock('../context/LanguageContext', () => ({
  useLanguage: vi.fn(() => ({ lang: 'EN' })),
}))

describe('AgentStatusWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useLanguage.mockReturnValue({ lang: 'EN' })
  })

  it('should render with default props', () => {
    render(<AgentStatusWidget />)
    expect(screen.getAllByText('Understanding role')).toHaveLength(2) // One in current, one in steps
  })

  it('should render with custom current step', () => {
    render(<AgentStatusWidget currentStep={1} />)
    expect(screen.getAllByText('Finding candidates')).toHaveLength(2)
  })

  it('should render with candidates found', () => {
    render(<AgentStatusWidget totalCandidatesFound={5} />)
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('candidates found')).toBeInTheDocument()
  })

  it('should render singular candidate label', () => {
    render(<AgentStatusWidget totalCandidatesFound={1} />)
    expect(screen.getByText('candidate found')).toBeInTheDocument()
  })

  it('should normalize step value to valid range', () => {
    render(<AgentStatusWidget currentStep={10} />)
    expect(screen.getAllByText('Ranking matches')).toHaveLength(2)
  })

  it('should handle negative step value', () => {
    render(<AgentStatusWidget currentStep={-5} />)
    expect(screen.getAllByText('Understanding role')).toHaveLength(2)
  })
})
