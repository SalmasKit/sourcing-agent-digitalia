import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Navbar } from './Navbar.jsx'

// Mock the contexts
const mockLogout = vi.fn()
const mockToggleLanguage = vi.fn()
const mockConfirm = vi.fn()

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { fullName: 'Test User', email: 'test@example.com', role: 'RECRUITER' },
    logout: mockLogout
  })
}))

vi.mock('../context/LanguageContext', () => ({
  useLanguage: () => ({
    lang: 'EN',
    toggleLanguage: mockToggleLanguage,
    t: (key) => key
  })
}))

vi.mock('../context/ConfirmDialogContext', () => ({
  useConfirm: () => ({
    confirm: mockConfirm
  })
}))

vi.mock('./ChangePasswordModal', () => ({
  ChangePasswordModal: ({ isOpen, onClose }) => isOpen ? <div data-testid="password-modal">Password Modal</div> : null
}))

describe('Navbar Component', () => {
  beforeEach(() => {
    // Clear document head to avoid duplicate style tags
    const styles = document.head.querySelectorAll('style')
    styles.forEach(style => style.remove())
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should render navigation tabs', () => {
    render(<Navbar activeTab="dashboard" setActiveTab={vi.fn()} onOpenAuth={vi.fn()} onToast={vi.fn()} />)
    
    const dashboardButtons = screen.getAllByText('Dashboard')
    expect(dashboardButtons.length).toBeGreaterThan(0)
    const pipelineButtons = screen.getAllByText('Pipeline')
    expect(pipelineButtons.length).toBeGreaterThan(0)
    const notesButtons = screen.getAllByText('Notes')
    expect(notesButtons.length).toBeGreaterThan(0)
  })

  it('should call setActiveTab when clicking a nav item', () => {
    const setActiveTab = vi.fn()
    render(<Navbar activeTab="dashboard" setActiveTab={setActiveTab} onOpenAuth={vi.fn()} onToast={vi.fn()} />)
    
    const pipelineTab = screen.getAllByRole('button', { name: 'Pipeline' })[0]
    fireEvent.click(pipelineTab)
    
    expect(setActiveTab).toHaveBeenCalledWith('pipeline')
  })

  it('should render user name when user is logged in', () => {
    render(<Navbar activeTab="dashboard" setActiveTab={vi.fn()} onOpenAuth={vi.fn()} onToast={vi.fn()} />)
    
    expect(screen.getByText('Test User')).toBeInTheDocument()
  })

  it('should toggle language button', () => {
    render(<Navbar activeTab="dashboard" setActiveTab={vi.fn()} onOpenAuth={vi.fn()} onToast={vi.fn()} />)
    
    const langButton = screen.getByTitle('Switch language')
    fireEvent.click(langButton)
    
    expect(mockToggleLanguage).toHaveBeenCalled()
  })

  it('should show badge count when notesCount > 0', () => {
    render(<Navbar activeTab="dashboard" setActiveTab={vi.fn()} onOpenAuth={vi.fn()} onToast={vi.fn()} notesCount={5} />)
    
    const badges = screen.getAllByText('5')
    expect(badges.length).toBeGreaterThan(0)
  })

  it('should not show badge when count is 0', () => {
    render(<Navbar activeTab="dashboard" setActiveTab={vi.fn()} onOpenAuth={vi.fn()} onToast={vi.fn()} notesCount={0} />)
    
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  it('should have proper accessible button elements for navigation', () => {
    render(<Navbar activeTab="dashboard" setActiveTab={vi.fn()} onOpenAuth={vi.fn()} onToast={vi.fn()} />)
    
    const navButtons = screen.getAllByRole('button')
    expect(navButtons.length).toBeGreaterThan(0)
  })

  it('should render with active tab highlighted', () => {
    render(<Navbar activeTab="sourcing" setActiveTab={vi.fn()} onOpenAuth={vi.fn()} onToast={vi.fn()} />)
    
    const activeTab = screen.getAllByRole('button', { name: 'sourcingHub' })[0]
    expect(activeTab).toHaveClass('active')
  })
})
