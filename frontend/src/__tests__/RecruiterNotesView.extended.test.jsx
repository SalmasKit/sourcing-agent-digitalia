// src/__tests__/RecruiterNotesView.extended.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'

const langRef = vi.hoisted(() => ({ current: 'EN' }))

vi.mock('../context/LanguageContext', () => ({
    useLanguage: () => ({
        lang: langRef.current,
        toggleLanguage: vi.fn(),
        t: (key) => key,
    }),
}))

vi.mock('../utils/avatar', () => ({
    getAvatarUrl: (name, avatarUrl) => avatarUrl || `https://avatar.test/${name || 'U'}`,
}))

const { RecruiterNotesView } = await import('../components/RecruiterNotesView.jsx')

const note = (id, text, createdAt) => ({ id, text, ...(createdAt ? { createdAt } : {}) })

const candidate = (overrides = {}) => ({
    id: 'c1',
    fullName: 'Alice Martin',
    headline: 'Backend Engineer',
    notes: [note('n1', 'first note', '2024-01-15T10:30:00Z')],
    ...overrides,
})

const setup = (props = {}) =>
    render(
        <RecruiterNotesView
            candidates={[]}
            jobDescriptions={[]}
            savedRoleCandidates={{}}
            jobResultsCache={{}}
            {...props}
        />
    )

const selectJob = (jobId) =>
    fireEvent.change(screen.getByRole('combobox'), { target: { value: jobId } })

// Locale-agnostic: there is only one text input in the toolbar, so query
// by role rather than by the (locale-dependent) placeholder text.
const typeSearch = (value) =>
    fireEvent.change(screen.getByRole('textbox'), { target: { value } })

beforeEach(() => {
    langRef.current = 'EN'
})

describe('RecruiterNotesView — candidate/note filtering', () => {
    it('hides candidates that have no notes at all', () => {
        setup({ candidates: [candidate({ notes: [] }), candidate({ id: 'c2', fullName: 'Bob Reed' })] })

        expect(screen.queryByText('Alice Martin')).not.toBeInTheDocument()
        expect(screen.getByText('Bob Reed')).toBeInTheDocument()
    })

    it('keeps every note when the search matches the candidate name', () => {
        setup({
            candidates: [
                candidate({ notes: [note('n1', 'alpha'), note('n2', 'beta')] }),
            ],
        })

        typeSearch('alice')

        expect(screen.getByText('alpha')).toBeInTheDocument()
        expect(screen.getByText('beta')).toBeInTheDocument()
    })

    it('keeps every note when the search matches the candidate headline', () => {
        setup({
            candidates: [candidate({ notes: [note('n1', 'alpha'), note('n2', 'beta')] })],
        })

        typeSearch('backend')

        expect(screen.getByText('alpha')).toBeInTheDocument()
        expect(screen.getByText('beta')).toBeInTheDocument()
    })

    it('falls back to current_role and currentRole when headline is absent', () => {
        setup({
            candidates: [
                candidate({ headline: undefined, current_role: 'Data Scientist' }),
                candidate({
                    id: 'c2',
                    fullName: 'Bob Reed',
                    headline: undefined,
                    current_role: undefined,
                    currentRole: 'Data Analyst',
                }),
            ],
        })

        typeSearch('data')

        expect(screen.getByText('Alice Martin')).toBeInTheDocument()
        expect(screen.getByText('Bob Reed')).toBeInTheDocument()
    })

    it('shows the generic role label when the candidate has no role fields', () => {
        setup({
            candidates: [
                candidate({ headline: undefined, current_role: undefined, currentRole: undefined }),
            ],
        })

        expect(screen.getByText('Candidate')).toBeInTheDocument()
    })

    it('filters down to the matching notes and shows a partial-match badge', () => {
        setup({
            candidates: [
                candidate({ notes: [note('n1', 'apple pie'), note('n2', 'banana bread')] }),
            ],
        })

        typeSearch('apple')

        expect(screen.getByText('apple pie')).toBeInTheDocument()
        expect(screen.queryByText('banana bread')).not.toBeInTheDocument()
        expect(screen.getByText('1/2')).toBeInTheDocument()
    })

    it('treats a note with no text as non-matching', () => {
        setup({ candidates: [candidate({ notes: [{ id: 'n1' }] })] })

        typeSearch('anything')

        expect(screen.getByText('No results')).toBeInTheDocument()
    })

    it('drops the candidate entirely when no note matches the search', () => {
        setup({ candidates: [candidate({ notes: [note('n1', 'apple pie')] })] })

        typeSearch('zebra')

        expect(screen.queryByText('Alice Martin')).not.toBeInTheDocument()
        expect(screen.getByText('No results')).toBeInTheDocument()
        expect(screen.getByText('0 notes found')).toBeInTheDocument()
    })
})

describe('RecruiterNotesView — note ordering', () => {
    it('sorts notes by createdAt, newest first', () => {
        const { container } = setup({
            candidates: [
                candidate({
                    notes: [
                        note('n1', 'oldest', '2024-01-01T10:00:00Z'),
                        note('n2', 'newest', '2024-06-01T10:00:00Z'),
                    ],
                }),
            ],
        })

        const texts = [...container.querySelectorAll('.rn-note-item-text')].map(n => n.textContent)
        expect(texts).toEqual(['newest', 'oldest'])
    })

    it('falls back to reverse insertion order when createdAt is missing', () => {
        const { container } = setup({
            candidates: [
                candidate({ notes: [note('n1', 'added first'), note('n2', 'added second')] }),
            ],
        })

        const texts = [...container.querySelectorAll('.rn-note-item-text')].map(n => n.textContent)
        expect(texts).toEqual(['added second', 'added first'])
    })

    it('falls back to insertion order when only one note has a createdAt', () => {
        const { container } = setup({
            candidates: [
                candidate({
                    notes: [note('n1', 'no date'), note('n2', 'dated', '2024-01-01T10:00:00Z')],
                }),
            ],
        })

        const texts = [...container.querySelectorAll('.rn-note-item-text')].map(n => n.textContent)
        expect(texts).toEqual(['dated', 'no date'])
    })

    it('adds the scrollable class only past the note threshold', () => {
        const { container, rerender } = setup({
            candidates: [candidate({ notes: [note('n1', 'a'), note('n2', 'b')] })],
        })
        expect(container.querySelector('.rn-notes-list-scrollable')).toBeNull()

        rerender(
            <RecruiterNotesView
                candidates={[candidate({ notes: [note('n1', 'a'), note('n2', 'b'), note('n3', 'c')] })]}
                jobDescriptions={[]}
                savedRoleCandidates={{}}
                jobResultsCache={{}}
            />
        )
        expect(container.querySelector('.rn-notes-list-scrollable')).not.toBeNull()
    })
})

describe('RecruiterNotesView — isCandidateInJob branches', () => {
    const jobs = [{ id: 'j1', title: 'Software Engineer' }]

    it('matches via savedRoleCandidates', () => {
        setup({
            candidates: [candidate()],
            jobDescriptions: jobs,
            savedRoleCandidates: { j1: ['c1'] },
        })

        selectJob('j1')
        expect(screen.getByText('Alice Martin')).toBeInTheDocument()
    })

    it('matches via savedRoleCandidates when ids differ in type', () => {
        setup({
            candidates: [candidate({ id: 42 })],
            jobDescriptions: jobs,
            savedRoleCandidates: { j1: [' 42 '] },
        })

        selectJob('j1')
        expect(screen.getByText('Alice Martin')).toBeInTheDocument()
    })

    it('matches via an alternate candidate id field', () => {
        setup({
            candidates: [candidate({ id: 'local-1', profileId: 'p-9' })],
            jobDescriptions: jobs,
            savedRoleCandidates: { j1: ['p-9'] },
        })

        selectJob('j1')
        expect(screen.getByText('Alice Martin')).toBeInTheDocument()
    })

    it('ignores null/undefined ids when building the id set', () => {
        setup({
            candidates: [candidate({ candidateId: null, linkedinId: undefined })],
            jobDescriptions: jobs,
            savedRoleCandidates: { j1: [null, undefined, 'c1'] },
        })

        selectJob('j1')
        expect(screen.getByText('Alice Martin')).toBeInTheDocument()
    })

    it('matches via jobResultsCache', () => {
        setup({
            candidates: [candidate()],
            jobDescriptions: jobs,
            jobResultsCache: { j1: [{ id: 'c1' }] },
        })

        selectJob('j1')
        expect(screen.getByText('Alice Martin')).toBeInTheDocument()
    })

    it('matches via a direct job id on the candidate', () => {
        setup({
            candidates: [candidate({ jobDescriptionId: 'j1' })],
            jobDescriptions: jobs,
        })

        selectJob('j1')
        expect(screen.getByText('Alice Martin')).toBeInTheDocument()
    })

    it('matches via a multi-role id array on the candidate', () => {
        setup({
            candidates: [candidate({ savedRoleIds: ['j0', 'j1'] })],
            jobDescriptions: jobs,
        })

        selectJob('j1')
        expect(screen.getByText('Alice Martin')).toBeInTheDocument()
    })

    it('ignores non-array multi-role fields', () => {
        setup({
            candidates: [candidate({ jobIds: 'j1', roleIds: null })],
            jobDescriptions: jobs,
        })

        selectJob('j1')
        expect(screen.getByText('No results')).toBeInTheDocument()
    })

    it('excludes a candidate with no link to the selected role', () => {
        setup({ candidates: [candidate()], jobDescriptions: jobs })

        selectJob('j1')
        expect(screen.queryByText('Alice Martin')).not.toBeInTheDocument()
    })
})

describe('RecruiterNotesView — filter controls', () => {
    it('shows a results stat only once a filter is active', () => {
        setup({ candidates: [candidate()], jobDescriptions: [{ id: 'j1', title: 'Role' }] })

        expect(screen.queryByText('Results')).not.toBeInTheDocument()
        typeSearch('alice')
        expect(screen.getByText('Results')).toBeInTheDocument()
    })

    it('clears the search via the clear button', () => {
        setup({ candidates: [candidate()] })

        typeSearch('alice')
        fireEvent.click(screen.getByLabelText('Clear search'))

        expect(screen.getByRole('textbox')).toHaveValue('')
    })

    it('resets both filters from the toolbar', () => {
        setup({ candidates: [candidate()], jobDescriptions: [{ id: 'j1', title: 'Role' }] })

        typeSearch('alice')
        selectJob('j1')
        fireEvent.click(screen.getByRole('button', { name: /^Reset$/ }))

        expect(screen.getByRole('combobox')).toHaveValue('all')
        expect(screen.getByRole('textbox')).toHaveValue('')
    })

    it('resets filters from the empty state', () => {
        setup({ candidates: [candidate()] })

        typeSearch('zebra')
        fireEvent.click(screen.getByRole('button', { name: /Reset filters/ }))

        expect(screen.getByText('Alice Martin')).toBeInTheDocument()
    })

    it('shows the neutral empty state when there are no notes and no filters', () => {
        setup({ candidates: [] })
        expect(screen.getByText('No notes yet')).toBeInTheDocument()
    })
})

describe('RecruiterNotesView — pagination', () => {
    const many = Array.from({ length: 7 }, (_, i) =>
        candidate({ id: `c${i}`, fullName: `Person ${i}`, notes: [note(`n${i}`, `note ${i}`)] })
    )

    it('renders only one page of candidates at a time', () => {
        setup({ candidates: many })

        expect(screen.getByText('Person 0')).toBeInTheDocument()
        expect(screen.queryByText('Person 6')).not.toBeInTheDocument()
    })

    it('moves forward and back through pages', () => {
        setup({ candidates: many })

        fireEvent.click(screen.getByRole('button', { name: /Next/ }))
        expect(screen.getByText('Person 6')).toBeInTheDocument()
        expect(screen.queryByText('Person 0')).not.toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', { name: /Previous/ }))
        expect(screen.getByText('Person 0')).toBeInTheDocument()
    })

    it('jumps to a page via the numbered buttons', () => {
        setup({ candidates: many })

        fireEvent.click(screen.getByRole('button', { name: '2' }))
        expect(screen.getByText('Person 6')).toBeInTheDocument()
    })

    it('disables the edge buttons at each end', () => {
        setup({ candidates: many })

        expect(screen.getByRole('button', { name: /Previous/ })).toBeDisabled()
        fireEvent.click(screen.getByRole('button', { name: /Next/ }))
        expect(screen.getByRole('button', { name: /Next/ })).toBeDisabled()
    })

    it('returns to the first page when a filter changes', () => {
        setup({ candidates: many })

        fireEvent.click(screen.getByRole('button', { name: /Next/ }))
        typeSearch('person')

        expect(screen.getByText('Person 0')).toBeInTheDocument()
    })

    it('hides pagination when everything fits on one page', () => {
        setup({ candidates: [candidate()] })
        expect(screen.queryByRole('button', { name: /Next/ })).not.toBeInTheDocument()
    })
})

describe('RecruiterNotesView — inline note composer', () => {
    it('adds a note and closes the composer', () => {
        const onAddNote = vi.fn()
        setup({ candidates: [candidate()], onAddNote })

        fireEvent.click(screen.getByRole('button', { name: /Add/ }))
        fireEvent.change(screen.getByPlaceholderText('Write a note...'), {
            target: { value: '  drafted note  ' },
        })
        fireEvent.click(screen.getByRole('button', { name: 'Done' }))

        expect(onAddNote).toHaveBeenCalledWith('c1', 'drafted note')
        expect(screen.queryByPlaceholderText('Write a note...')).not.toBeInTheDocument()
    })

    it('keeps Done disabled while the draft is blank', () => {
        setup({ candidates: [candidate()] })

        fireEvent.click(screen.getByRole('button', { name: /Add/ }))
        expect(screen.getByRole('button', { name: 'Done' })).toBeDisabled()

        fireEvent.change(screen.getByPlaceholderText('Write a note...'), {
            target: { value: '   ' },
        })
        expect(screen.getByRole('button', { name: 'Done' })).toBeDisabled()
    })

    it('hides the footer actions while composing', () => {
        setup({ candidates: [candidate()] })

        fireEvent.click(screen.getByRole('button', { name: /Add/ }))

        expect(screen.queryByRole('button', { name: /View profile/ })).not.toBeInTheDocument()
        expect(screen.getByText('Now')).toBeInTheDocument()
    })

    it('discards the draft when cancelled', () => {
        const onAddNote = vi.fn()
        setup({ candidates: [candidate()], onAddNote })

        fireEvent.click(screen.getByRole('button', { name: /Add/ }))
        fireEvent.change(screen.getByPlaceholderText('Write a note...'), {
            target: { value: 'throwaway' },
        })
        fireEvent.click(screen.getByTitle('Cancel'))

        expect(onAddNote).not.toHaveBeenCalled()
        expect(screen.queryByPlaceholderText('Write a note...')).not.toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', { name: /Add/ }))
        expect(screen.getByPlaceholderText('Write a note...')).toHaveValue('')
    })

    it('does not mark an existing note as latest while composing', () => {
        const { container } = setup({ candidates: [candidate()] })

        fireEvent.click(screen.getByRole('button', { name: /Add/ }))

        const latest = container.querySelectorAll('.rn-note-item-latest')
        expect(latest).toHaveLength(1)
        expect(within(latest[0]).queryByText('first note')).not.toBeInTheDocument()
    })
})

describe('RecruiterNotesView — row actions and avatar', () => {
    it('forwards the candidate to onViewCandidate', () => {
        const onViewCandidate = vi.fn()
        const c = candidate()
        setup({ candidates: [c], onViewCandidate })

        fireEvent.click(screen.getByRole('button', { name: /View profile/ }))

        expect(onViewCandidate).toHaveBeenCalledWith(expect.objectContaining({ id: 'c1' }))
    })

    it('forwards both ids to onDeleteNote', () => {
        const onDeleteNote = vi.fn()
        setup({ candidates: [candidate()], onDeleteNote })

        fireEvent.click(screen.getByTitle('Delete note'))

        expect(onDeleteNote).toHaveBeenCalledWith('c1', 'n1')
    })

    it('does not throw when the callbacks are left at their defaults', () => {
        setup({ candidates: [candidate()] })

        expect(() => {
            fireEvent.click(screen.getByTitle('Delete note'))
            fireEvent.click(screen.getByRole('button', { name: /View profile/ }))
        }).not.toThrow()
    })

    it('swaps in the initials fallback when the avatar fails to load', () => {
        const { container } = setup({ candidates: [candidate()] })

        const img = container.querySelector('.rn-avatar')
        const fallback = container.querySelector('.rn-avatar-fallback')
        expect(fallback).toHaveTextContent('AM')

        fireEvent.error(img)

        expect(img.style.display).toBe('none')
        expect(fallback.style.display).toBe('flex')
    })

    it('renders a placeholder initial when the candidate has no name', () => {
        const { container } = setup({
            candidates: [candidate({ fullName: undefined })],
        })

        expect(container.querySelector('.rn-avatar-fallback')).toHaveTextContent('?')
    })

    it('pads the total note count to two digits', () => {
        setup({ candidates: [candidate()] })
        expect(screen.getByText(/01 total note/)).toBeInTheDocument()
    })
})

describe('RecruiterNotesView — French locale', () => {
    beforeEach(() => {
        langRef.current = 'FR'
    })

    it('renders the French header, toolbar and footer strings', () => {
        setup({ candidates: [candidate()] })

        expect(screen.getByText('Notes recruteur')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Rechercher dans les notes...')).toBeInTheDocument()
        expect(screen.getByText('Tous les postes')).toBeInTheDocument()
        expect(screen.getByText(/note\(s\) au total/)).toBeInTheDocument()
        expect(screen.getByTitle('Supprimer la note')).toBeInTheDocument()
    })

    it('renders the French empty states', () => {
        setup({ candidates: [] })
        expect(screen.getByText('Aucune note pour le moment')).toBeInTheDocument()
    })

    it('renders the French filtered empty state and reset controls', () => {
        setup({ candidates: [candidate()] })

        typeSearch('zebra')

        expect(screen.getByText('Aucun résultat')).toBeInTheDocument()
        expect(screen.getByText(/notes trouvées/)).toBeInTheDocument()
        expect(screen.getByLabelText('Effacer la recherche')).toBeInTheDocument()
    })

    it('renders the French composer', () => {
        setup({ candidates: [candidate()] })

        fireEvent.click(screen.getByRole('button', { name: /Ajouter/ }))

        expect(screen.getByPlaceholderText('Écrire une note...')).toBeInTheDocument()
        expect(screen.getByText('Maintenant')).toBeInTheDocument()
        expect(screen.getByTitle('Annuler')).toBeInTheDocument()
    })

    it('renders French pagination labels', () => {
        const many = Array.from({ length: 7 }, (_, i) =>
            candidate({ id: `c${i}`, fullName: `Person ${i}`, notes: [note(`n${i}`, `note ${i}`)] })
        )
        setup({ candidates: many })

        expect(screen.getByRole('button', { name: /Précédent/ })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Suivant/ })).toBeInTheDocument()
    })
})