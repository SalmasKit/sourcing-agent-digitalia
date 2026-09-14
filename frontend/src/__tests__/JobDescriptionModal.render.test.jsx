// src/__tests__/JobDescriptionModal.render.test.jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'

const confirmMock = vi.hoisted(() => vi.fn())
const langRef = vi.hoisted(() => ({ current: 'EN' }))
const searchLocationsMock = vi.hoisted(() => vi.fn())
const agentPostMock = vi.hoisted(() => vi.fn())

vi.mock('../context/ConfirmDialogContext', () => ({
    useConfirm: () => ({ confirm: confirmMock }),
}))

vi.mock('../context/LanguageContext', () => ({
    useLanguage: () => ({ lang: langRef.current }),
}))

vi.mock('../utils/geocoding', () => ({
    searchLocations: searchLocationsMock,
}))

vi.mock('../services/api', () => ({
    agentClient: { post: agentPostMock },
}))

const { JobDescriptionModal } = await import('../components/JobDescriptionModal.jsx')

beforeEach(() => {
    langRef.current = 'EN'
    confirmMock.mockReset()
    confirmMock.mockResolvedValue(true)
    searchLocationsMock.mockReset()
    searchLocationsMock.mockResolvedValue([])
    agentPostMock.mockReset()
})

afterEach(() => {
    // Belt-and-braces: unmount any lingering render and make sure no fake
    // timer or pending real timeout survives into the next test. Several
    // tests below exercise the 400ms location-search debounce with fake
    // timers; if one leaks past its test, later tests can see stray state
    // updates ("not wrapped in act") or hang waiting on unrelated timers.
    cleanup()
    vi.clearAllTimers()
    vi.useRealTimers()
})

const setup = (props = {}) =>
    render(
        <JobDescriptionModal
            isOpen
            onClose={vi.fn()}
            onCreate={vi.fn()}
            onEdit={vi.fn()}
            {...props}
        />
    )

const goToStep2 = () => {
    fireEvent.change(screen.getByPlaceholderText(/Digital Marketing Lead/), {
        target: { value: 'Backend Engineer' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Next/ }))
}

const goToStep3 = () => {
    goToStep2()
    fireEvent.click(screen.getByRole('button', { name: /Next/ }))
}

// The "N profiles" string is rendered twice once step 3 is reached: once
// in the live search-preview banner (.jd-preview) and once in the step's
// own counter. This resolves to the counter instance specifically.
const getProfilesCounter = (pattern) => {
    const matches = screen.getAllByText(pattern)
    const outsidePreview = matches.find(el => !el.closest('.jd-preview'))
    expect(outsidePreview).toBeTruthy()
    return outsidePreview
}

describe('JobDescriptionModal — visibility', () => {
    it('renders nothing when isOpen is false', () => {
        const { container } = setup({ isOpen: false })
        expect(container).toBeEmptyDOMElement()
    })

    it('shows the "new" title by default and the "edit" title when editing', () => {
        const { rerender } = setup()
        expect(screen.getByText('New job description')).toBeInTheDocument()

        rerender(
            <JobDescriptionModal
                isOpen
                onClose={vi.fn()}
                onCreate={vi.fn()}
                onEdit={vi.fn()}
                editingJob={{ id: 'j1', title: 'Old Title' }}
            />
        )
        expect(screen.getByText('Edit job description')).toBeInTheDocument()
    })

    it('calls onClose from the header close button', () => {
        const onClose = vi.fn()
        setup({ onClose })
        fireEvent.click(screen.getByLabelText('Close'))
        expect(onClose).toHaveBeenCalled()
    })
})

describe('JobDescriptionModal — step 1 (role basics)', () => {
    it('blocks advancing to step 2 without a title and shows the error', () => {
        setup()
        fireEvent.click(screen.getByRole('button', { name: /Next/ }))

        expect(screen.getByText('Add a job title to continue')).toBeInTheDocument()
        expect(screen.getByText('Role basics')).toBeInTheDocument()
    })

    it('clears the title error once the user types', () => {
        setup()
        fireEvent.click(screen.getByRole('button', { name: /Next/ }))
        expect(screen.getByText('Add a job title to continue')).toBeInTheDocument()

        fireEvent.change(screen.getByPlaceholderText(/Digital Marketing Lead/), {
            target: { value: 'X' },
        })
        expect(screen.queryByText('Add a job title to continue')).not.toBeInTheDocument()
    })

    it('advances to step 2 once a title is present', () => {
        setup()
        goToStep2()
        expect(screen.getByText('Target location')).toBeInTheDocument()
    })

    it('selects a seniority level', () => {
        setup()
        fireEvent.click(screen.getByText('Junior'))
        expect(screen.getByText('Junior').closest('button')).toHaveClass('active')
    })

    it('selects a contract type', () => {
        setup()
        fireEvent.click(screen.getByText('Fixed-term (CDD)'))
        expect(screen.getByText('Fixed-term (CDD)').closest('button')).toHaveClass('active')
    })

    it('blocks jumping ahead via the stepper without a title', () => {
        setup()
        fireEvent.click(screen.getByText('Where & what'))

        expect(screen.getByText('Add a job title to continue')).toBeInTheDocument()
        expect(screen.queryByText('Target location')).not.toBeInTheDocument()
    })

    it('allows jumping back via the stepper freely', () => {
        setup()
        goToStep3()
        fireEvent.click(screen.getByText('Role basics'))
        expect(screen.getByPlaceholderText(/Digital Marketing Lead/)).toBeInTheDocument()
    })
})

describe('JobDescriptionModal — step 2 (location & skills)', () => {
    it('debounces and calls searchLocations, then shows suggestions', async () => {
        vi.useFakeTimers()
        searchLocationsMock.mockResolvedValueOnce([{ label: 'Casablanca, Morocco' }])

        setup()
        goToStep2()

        fireEvent.change(screen.getByPlaceholderText(/Search city/), {
            target: { value: 'Casa' },
        })

        await vi.advanceTimersByTimeAsync(400)
        vi.useRealTimers()

        await waitFor(() =>
            expect(screen.getByText('Casablanca, Morocco')).toBeInTheDocument()
        )
        expect(searchLocationsMock).toHaveBeenCalledWith('Casa', 'en')
    })

    it('does not search for a query under 2 characters', () => {
        vi.useFakeTimers()
        setup()
        goToStep2()

        fireEvent.change(screen.getByPlaceholderText(/Search city/), {
            target: { value: 'C' },
        })
        vi.advanceTimersByTime(500)
        vi.useRealTimers()

        expect(searchLocationsMock).not.toHaveBeenCalled()
    })

    it('selects a location suggestion and clears the dropdown', async () => {
        vi.useFakeTimers()
        searchLocationsMock.mockResolvedValueOnce([{ label: 'Rabat, Morocco' }])

        setup()
        goToStep2()
        fireEvent.change(screen.getByPlaceholderText(/Search city/), {
            target: { value: 'Rabat' },
        })
        await vi.advanceTimersByTimeAsync(400)
        vi.useRealTimers()

        await waitFor(() => screen.getByText('Rabat, Morocco'))
        fireEvent.click(screen.getByText('Rabat, Morocco'))

        expect(screen.getByPlaceholderText(/Search city/)).toHaveValue('Rabat, Morocco')
        expect(screen.queryByText('Rabat, Morocco')).not.toBeInTheDocument()
    })

    it('falls back to an empty suggestion list when the search rejects', async () => {
        vi.useFakeTimers()
        searchLocationsMock.mockRejectedValueOnce(new Error('geocoding down'))

        setup()
        goToStep2()
        fireEvent.change(screen.getByPlaceholderText(/Search city/), {
            target: { value: 'Casa' },
        })
        await vi.advanceTimersByTimeAsync(400)
        vi.useRealTimers()

        await waitFor(() => expect(searchLocationsMock).toHaveBeenCalled())
        expect(screen.queryByText('Casablanca, Morocco')).not.toBeInTheDocument()
    })

    it('adds required skills on Enter and dedupes them', () => {
        setup()
        goToStep2()

        const input = screen.getByPlaceholderText('Type a skill and press Enter...')
        fireEvent.change(input, { target: { value: 'React' } })
        fireEvent.keyDown(input, { key: 'Enter' })
        fireEvent.change(input, { target: { value: 'React' } })
        fireEvent.keyDown(input, { key: 'Enter' })

        expect(screen.getAllByText('React')).toHaveLength(1)
    })

    it('adds multiple comma-separated skills on blur', () => {
        setup()
        goToStep2()

        const input = screen.getByPlaceholderText('Type a skill and press Enter...')
        fireEvent.change(input, { target: { value: 'Go, Rust' } })
        fireEvent.blur(input)

        expect(screen.getByText('Go')).toBeInTheDocument()
        expect(screen.getByText('Rust')).toBeInTheDocument()
    })

    it('removes a required skill and can backspace the last one', () => {
        setup()
        goToStep2()

        const input = screen.getByPlaceholderText('Type a skill and press Enter...')
        fireEvent.change(input, { target: { value: 'Java' } })
        fireEvent.keyDown(input, { key: 'Enter' })
        expect(screen.getByText('Java')).toBeInTheDocument()

        fireEvent.click(screen.getByLabelText('Required skills (must-have) Java'))
        expect(screen.queryByText('Java')).not.toBeInTheDocument()

        fireEvent.change(input, { target: { value: 'Kotlin' } })
        fireEvent.keyDown(input, { key: 'Enter' })
        fireEvent.keyDown(input, { key: 'Backspace' })
        expect(screen.queryByText('Kotlin')).not.toBeInTheDocument()
    })

    it('adds and removes nice-to-have skills', () => {
        setup()
        goToStep2()

        const input = screen.getByPlaceholderText('Optional skills that add value...')
        fireEvent.change(input, { target: { value: 'Docker' } })
        fireEvent.keyDown(input, { key: ',' })

        expect(screen.getByText('Docker')).toBeInTheDocument()

        fireEvent.click(screen.getByLabelText('Nice-to-have skills (bonus) Docker'))
        expect(screen.queryByText('Docker')).not.toBeInTheDocument()
    })

    it('placeholder switches once a required skill exists', () => {
        setup()
        goToStep2()

        const input = screen.getByPlaceholderText('Type a skill and press Enter...')
        fireEvent.change(input, { target: { value: 'SQL' } })
        fireEvent.keyDown(input, { key: 'Enter' })

        expect(screen.getByPlaceholderText('Press Enter or comma to add')).toBeInTheDocument()
    })
})

describe('JobDescriptionModal — step 3 (sourcing brief)', () => {
    it('shows the search preview once a title or skill exists', () => {
        setup()
        goToStep2()
        expect(screen.getByText(/Search preview/)).toBeInTheDocument()
    })

    it('generates a prompt via the agent and shows it for review', async () => {
        agentPostMock.mockResolvedValueOnce({ data: { description: 'Generated description text' } })

        setup()
        goToStep3()
        fireEvent.click(screen.getByRole('button', { name: /Generate prompt with AI/ }))

        await waitFor(() =>
            expect(screen.getByText('Generated description text')).toBeInTheDocument()
        )
        expect(screen.getByText('AI agent generated prompt')).toBeInTheDocument()
    })

    it('appends nice-to-have skills to the generated prompt when missing', async () => {
        agentPostMock.mockResolvedValueOnce({ data: { description: 'Base description.' } })

        setup()
        goToStep2()
        fireEvent.change(screen.getByPlaceholderText('Optional skills that add value...'), {
            target: { value: 'GraphQL' },
        })
        fireEvent.keyDown(screen.getByPlaceholderText('Optional skills that add value...'), {
            key: 'Enter',
        })
        fireEvent.click(screen.getByRole('button', { name: /Next/ }))

        fireEvent.click(screen.getByRole('button', { name: /Generate prompt with AI/ }))

        await waitFor(() =>
            expect(screen.getByText(/Bonus skills that add value: GraphQL/)).toBeInTheDocument()
        )
    })

    it('falls back to a template description when the agent call fails', async () => {
        agentPostMock.mockRejectedValueOnce(new Error('agent down'))

        setup()
        goToStep3()
        fireEvent.click(screen.getByRole('button', { name: /Generate prompt with AI/ }))

        await waitFor(() =>
            expect(screen.getByText(/Looking for a Senior/)).toBeInTheDocument()
        )
    })

    it('does not disable generation once a title exists', () => {
        setup()
        goToStep3()
        expect(
            screen.getByRole('button', { name: /Generate prompt with AI/ })
        ).not.toBeDisabled()
    })

    it('approving the review copies the prompt into the description field', async () => {
        agentPostMock.mockResolvedValueOnce({ data: { description: 'Preview text.' } })

        setup()
        goToStep3()
        fireEvent.click(screen.getByRole('button', { name: /Generate prompt with AI/ }))
        await waitFor(() => screen.getByText('Preview text.'))

        fireEvent.click(screen.getByRole('button', { name: /Approve and apply/ }))

        expect(screen.getByPlaceholderText(/Detailed responsibilities/)).toHaveValue('Preview text.')
        expect(screen.queryByText('AI agent generated prompt')).not.toBeInTheDocument()
    })

    it('cancelling the review discards the preview panel without touching the field', async () => {
        agentPostMock.mockResolvedValueOnce({ data: { description: 'Preview text.' } })

        setup()
        goToStep3()
        fireEvent.click(screen.getByRole('button', { name: /Generate prompt with AI/ }))
        await waitFor(() => screen.getByText('Preview text.'))

        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

        expect(screen.queryByText('AI agent generated prompt')).not.toBeInTheDocument()
        expect(screen.getByPlaceholderText(/Detailed responsibilities/)).toHaveValue('')
    })

    it('sets maxResults via the quick-pick buttons and the slider', () => {
        setup()
        goToStep3()

        fireEvent.click(screen.getByRole('button', { name: '20' }))
        expect(getProfilesCounter(/20/)).toBeInTheDocument()

        fireEvent.change(screen.getByRole('slider'), { target: { value: '7' } })
        expect(getProfilesCounter(/7/)).toBeInTheDocument()
    })
})

describe('JobDescriptionModal — submit flow', () => {
    it('confirms and creates a job with a generated fallback description', async () => {
        const onCreate = vi.fn()
        const onClose = vi.fn()
        setup({ onCreate, onClose })

        goToStep3()
        fireEvent.click(screen.getByRole('button', { name: /Create and start sourcing/ }))

        await waitFor(() => expect(confirmMock).toHaveBeenCalled())
        expect(confirmMock).toHaveBeenCalledWith(
            expect.objectContaining({ title: 'Create Job Description?' })
        )

        await waitFor(() => expect(onCreate).toHaveBeenCalled())
        const jobData = onCreate.mock.calls[0][0]
        expect(jobData.title).toBe('Backend Engineer')
        expect(jobData.description).toMatch(/Sourcing for Senior \([^)]*\) Backend Engineer/)
        expect(jobData.minExperience).toBe(5)
        expect(onClose).toHaveBeenCalled()
    })

    it('does not create the job when the confirmation is declined', async () => {
        confirmMock.mockResolvedValueOnce(false)
        const onCreate = vi.fn()
        setup({ onCreate })

        goToStep3()
        fireEvent.click(screen.getByRole('button', { name: /Create and start sourcing/ }))

        await waitFor(() => expect(confirmMock).toHaveBeenCalled())
        expect(onCreate).not.toHaveBeenCalled()
    })

    it('uses onEdit and the update confirmation copy when editing an existing job', async () => {
        const onEdit = vi.fn()
        setup({
            editingJob: { id: 'j9', title: 'Existing Role', status: 'active' },
            onEdit,
        })

        fireEvent.click(screen.getByRole('button', { name: /Next/ }))
        fireEvent.click(screen.getByRole('button', { name: /Next/ }))
        fireEvent.click(screen.getByRole('button', { name: /Save changes/ }))

        await waitFor(() =>
            expect(confirmMock).toHaveBeenCalledWith(
                expect.objectContaining({ title: 'Update Job Description?' })
            )
        )
        await waitFor(() => expect(onEdit).toHaveBeenCalled())
        expect(onEdit.mock.calls[0][0].id).toBe('j9')
    })

    it('appends bonus skills to a manually written description', async () => {
        const onCreate = vi.fn()
        setup({ onCreate })

        goToStep2()
        fireEvent.change(screen.getByPlaceholderText('Optional skills that add value...'), {
            target: { value: 'Terraform' },
        })
        fireEvent.keyDown(screen.getByPlaceholderText('Optional skills that add value...'), {
            key: 'Enter',
        })
        fireEvent.click(screen.getByRole('button', { name: /Next/ }))

        fireEvent.change(screen.getByPlaceholderText(/Detailed responsibilities/), {
            target: { value: 'A short hand-written description.' },
        })
        fireEvent.click(screen.getByRole('button', { name: /Create and start sourcing/ }))

        await waitFor(() => expect(onCreate).toHaveBeenCalled())
        expect(onCreate.mock.calls[0][0].description).toMatch(
            /Bonus skills that add value: Terraform/
        )
    })

    it(
        'defaults location to "All Locations" when left blank',
        async () => {
            const onCreate = vi.fn()
            setup({ onCreate })

            goToStep3()
            fireEvent.click(screen.getByRole('button', { name: /Create and start sourcing/ }))

            await waitFor(() => expect(confirmMock).toHaveBeenCalled())
            await waitFor(() => expect(onCreate).toHaveBeenCalled())
            expect(onCreate.mock.calls[0][0].location).toBe('All Locations')
        },
        10000
    )

    it('does not require re-confirming the title when advancing past step 1', () => {
        // Once step 0's title guard has been passed, later Next/step-forward
        // actions carry no additional title validation.
        setup()
        goToStep3()
        expect(screen.queryByText('Add a job title to continue')).not.toBeInTheDocument()
        expect(screen.getByText('Sourcing brief')).toBeInTheDocument()
    })
})

describe('JobDescriptionModal — editing an existing job populates fields', () => {
    it('hydrates all fields from editingJob', () => {
        setup({
            editingJob: {
                id: 'j1',
                title: 'Staff Engineer',
                description: 'Existing description',
                location: 'Casablanca',
                requiredSkills: ['Go'],
                niceToHaveSkills: ['Rust'],
                seniority: 'Lead / Manager (8+ yrs)',
                contractType: 'Freelance / Contract',
                maxResults: 15,
            },
        })

        expect(screen.getByPlaceholderText(/Digital Marketing Lead/)).toHaveValue('Staff Engineer')

        fireEvent.click(screen.getByRole('button', { name: /Next/ }))
        expect(screen.getByPlaceholderText(/Search city/)).toHaveValue('Casablanca')
        expect(screen.getByText('Go')).toBeInTheDocument()
        expect(screen.getByText('Rust')).toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', { name: /Next/ }))
        expect(screen.getByPlaceholderText(/Detailed responsibilities/)).toHaveValue(
            'Existing description'
        )
        expect(getProfilesCounter(/15/)).toBeInTheDocument()
    })

    it('treats "All Locations" on editingJob as an empty location field', () => {
        setup({
            editingJob: { id: 'j2', title: 'X', location: 'All Locations' },
        })

        fireEvent.click(screen.getByRole('button', { name: /Next/ }))
        expect(screen.getByPlaceholderText(/Search city/)).toHaveValue('')
    })
})

describe('JobDescriptionModal — French locale', () => {
    beforeEach(() => {
        langRef.current = 'FR'
    })

    it('renders French copy for the header and steps', () => {
        setup()
        expect(screen.getByText('Nouvelle fiche de poste')).toBeInTheDocument()
        expect(screen.getByText('Informations du poste')).toBeInTheDocument()
    })

    it('passes the French locale code to searchLocations', async () => {
        vi.useFakeTimers()
        setup()
        fireEvent.change(screen.getByPlaceholderText(/Responsable marketing/), {
            target: { value: 'Ingénieur' },
        })
        fireEvent.click(screen.getByRole('button', { name: /Suivant/ }))

        fireEvent.change(screen.getByPlaceholderText(/Rechercher une ville/), {
            target: { value: 'Casa' },
        })
        await vi.advanceTimersByTimeAsync(400)
        vi.useRealTimers()

        await waitFor(() => expect(searchLocationsMock).toHaveBeenCalledWith('Casa', 'fr'))
    })

    it('shows the French confirmation copy on submit', async () => {
        setup()
        fireEvent.change(screen.getByPlaceholderText(/Responsable marketing/), {
            target: { value: 'Ingénieur' },
        })
        fireEvent.click(screen.getByRole('button', { name: /Suivant/ }))
        fireEvent.click(screen.getByRole('button', { name: /Suivant/ }))
        fireEvent.click(screen.getByRole('button', { name: /Créer et lancer le sourcing/ }))

        await waitFor(() =>
            expect(confirmMock).toHaveBeenCalledWith(
                expect.objectContaining({ title: 'Créer la fiche de poste ?' })
            )
        )
    })
})