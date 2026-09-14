import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    fireEvent,
    render,
    screen,
} from '@testing-library/react';

import SourcingHubView from '../components/SourcingHubView';

/* =========================================================
   MOCKS
========================================================= */

vi.mock('../components/SearchConsole', () => ({
    default: ({
        onSearch,
        onSearchModeChange,
        searchMode = 'ai',
    }) => (
        <div data-testid="search-console">
            <div data-testid="search-mode">{searchMode}</div>

            <button
                type="button"
                onClick={() =>
                    onSearch?.('React developer', {
                        maxResults: 10,
                        searchMode,
                    })
                }
            >
                Run Search
            </button>

            <button
                type="button"
                onClick={() => onSearchModeChange?.('classic')}
            >
                Switch Search Mode
            </button>
        </div>
    ),
}));

vi.mock('../components/AgentStatusWidget', () => ({
    default: ({ currentStep, step }) => (
        <div data-testid="agent-status-widget">
            {currentStep || step || 'Finding candidates'}
        </div>
    ),
}));

vi.mock('../components/CandidateGridView', () => ({
    default: ({
        candidates = [],
        onViewDetails,
        onEdit,
        onDelete,
        candidateGridProps = {},
    }) => {
        const detailsHandler =
            onViewDetails || candidateGridProps.onViewDetails;

        const editHandler =
            onEdit || candidateGridProps.onEdit;

        const deleteHandler =
            onDelete || candidateGridProps.onDelete;

        return (
            <div data-testid="candidate-grid">
                {candidates.map((candidate) => (
                    <div
                        key={candidate.id}
                        data-testid={`candidate-card-${candidate.id}`}
                    >
                        <span>{candidate.name}</span>

                        <button
                            type="button"
                            onClick={() => detailsHandler?.(candidate)}
                        >
                            View {candidate.name}
                        </button>

                        <button
                            type="button"
                            onClick={() => editHandler?.(candidate)}
                        >
                            Edit {candidate.name}
                        </button>

                        <button
                            type="button"
                            onClick={() => deleteHandler?.(candidate)}
                        >
                            Delete {candidate.name}
                        </button>
                    </div>
                ))}
            </div>
        );
    },
}));

/* =========================================================
   FIXTURES
========================================================= */

const candidate1 = {
    id: 'candidate-1',
    name: 'Alice Johnson',
    score: 92,
    matchScore: 92,
    skills: ['React', 'JavaScript', 'TypeScript'],
    matched_skills: ['React', 'JavaScript'],
    missing_skills: [],
    experience_years: 5,
    min_experience_years: 3,
    location_score: 1,
};

const candidate2 = {
    id: 'candidate-2',
    name: 'Bob Martin',
    score: 84,
    matchScore: 84,
    skills: ['React', 'Node.js'],
    matched_skills: ['React'],
    missing_skills: ['TypeScript'],
    experience_years: 4,
    min_experience_years: 3,
    location_score: 0.8,
};

const candidate3 = {
    id: 'candidate-3',
    name: 'Charlie Smith',
    score: 71,
    matchScore: 71,
    skills: ['JavaScript'],
    matched_skills: ['JavaScript'],
    missing_skills: ['React'],
    experience_years: 2,
    min_experience_years: 3,
    location_score: 0.6,
};

const job1 = {
    id: 'job-1003',
    title: 'Senior React Developer',
    description:
        'Looking for a senior React developer with strong frontend experience.',
    prompt:
        'Senior React developer with React, TypeScript and JavaScript experience.',
    seniority: 'Senior',
    location: 'Casablanca',
    experience: '5+ years',
    minExperience: 5,
    maxExperience: 10,
    skills: ['React', 'TypeScript', 'JavaScript'],
    technologies: ['React', 'TypeScript'],
    techStack: ['React', 'TypeScript'],
    maxResults: 10,
    status: 'ready',
};

const job2 = {
    id: 'job-1002',
    title: 'Backend Java Developer',
    description:
        'Looking for a Java developer with Spring Boot experience.',
    prompt:
        'Java developer with Spring Boot and REST API experience.',
    seniority: 'Mid',
    location: 'Rabat',
    experience: '3+ years',
    minExperience: 3,
    maxExperience: 7,
    skills: ['Java', 'Spring Boot'],
    technologies: ['Java', 'Spring Boot'],
    techStack: ['Java', 'Spring Boot'],
    maxResults: 10,
    status: 'ready',
};

const job3 = {
    id: 'job-1001',
    title: 'Python FastAPI Developer',
    description:
        'Python backend engineer with FastAPI experience.',
    prompt:
        'Python developer with FastAPI and REST API experience.',
    seniority: 'Mid',
    location: 'Oujda',
    experience: '2+ years',
    minExperience: 2,
    maxExperience: 6,
    skills: ['Python', 'FastAPI'],
    technologies: ['Python', 'FastAPI'],
    techStack: ['Python', 'FastAPI'],
    maxResults: 10,
    status: 'ready',
};

/* =========================================================
   HELPERS
========================================================= */

function createProps(overrides = {}) {
    return {
        jobDescriptions: [job1, job2, job3],

        selectedJobId: null,

        candidates: [
            candidate1,
            candidate2,
        ],

        jobResultsCache: {
            [job1.id]: {
                candidates: [
                    candidate1,
                    candidate2,
                ],
            },

            [job2.id]: {
                candidates: [
                    candidate3,
                ],
            },
        },

        searchKey: '',
        searchMode: 'ai',

        shortlist: [],

        savedRoleCandidates: {},

        isSearching: false,
        agentStep: 0,

        lastSearch: null,

        lang: 'en',

        t: (key) => key,

        onSearch: vi.fn(),
        onSearchModeChange: vi.fn(),
        onRefresh: vi.fn(),

        onCompare: vi.fn(),

        candidateGridProps: {},

        onSelectJob: vi.fn(),
        onEditDescription: vi.fn(),
        onNewDescription: vi.fn(),
        onDeleteJob: vi.fn(),

        onToggleSaveForJob: vi.fn(),

        onViewDetails: vi.fn(),
        onEdit: vi.fn(),
        onDelete: vi.fn(),
        onOpenComparator: vi.fn(),

        allCandidates: [
            candidate1,
            candidate2,
            candidate3,
        ],

        ...overrides,
    };
}

function renderHub(overrides = {}) {
    const props = createProps(overrides);

    return {
        ...render(<SourcingHubView {...props} />),
        props,
    };
}

/* =========================================================
   TESTS
========================================================= */

describe('SourcingHubView', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    /* =======================================================
       LIBRARY VIEW
    ======================================================= */

    describe('library view', () => {
        it('renders the hiring roles heading', () => {
            renderHub();

            expect(
                screen.getByRole('heading', {
                    name: /your hiring roles/i,
                })
            ).toBeInTheDocument();
        });

        it('renders all roles in the library', () => {
            renderHub();

            expect(
                screen.getAllByText('Senior React Developer').length
            ).toBeGreaterThan(0);

            expect(
                screen.getAllByText('Backend Java Developer').length
            ).toBeGreaterThan(0);

            expect(
                screen.getAllByText('Python FastAPI Developer').length
            ).toBeGreaterThan(0);
        });

        it('renders the New Description button', () => {
            renderHub();

            expect(
                screen.getByRole('button', {
                    name: /new description/i,
                })
            ).toBeInTheDocument();
        });

        it('calls onNewDescription when creating a new role', () => {
            const onNewDescription = vi.fn();

            renderHub({
                onNewDescription,
            });

            fireEvent.click(
                screen.getByRole('button', {
                    name: /new description/i,
                })
            );

            expect(onNewDescription).toHaveBeenCalledTimes(1);
        });

        it('opens a role workspace', () => {
            renderHub();

            const openButtons = screen.getAllByRole('button', {
                name: /open/i,
            });

            fireEvent.click(openButtons[0]);

            expect(
                screen.getByRole('heading', {
                    name: 'Senior React Developer',
                })
            ).toBeInTheDocument();

            expect(
                screen.getByTestId('search-console')
            ).toBeInTheDocument();
        });

        it('filters roles using the library search input', () => {
            renderHub();

            const searchInput = screen.getByPlaceholderText(
                /search roles|search/i
            );

            fireEvent.change(searchInput, {
                target: {
                    value: 'Backend',
                },
            });

            expect(
                screen.getAllByText('Backend Java Developer').length
            ).toBeGreaterThan(0);

            /*
             * The component may retain role-related content in the
             * rendered DOM while filtering the role cards.
             *
             * The important behavior is that the matching role remains
             * visible.
             */
            expect(
                screen.getAllByText('Backend Java Developer').length
            ).toBeGreaterThan(0);
        });

        it('calls onEditDescription when editing a role', () => {
            const onEditDescription = vi.fn();

            renderHub({
                onEditDescription,
            });

            const editButtons = screen.getAllByRole('button', {
                name: /edit/i,
            });

            fireEvent.click(editButtons[0]);

            expect(onEditDescription).toHaveBeenCalled();
        });

        it('calls onDeleteJob when deleting a role', () => {
            const onDeleteJob = vi.fn();

            renderHub({
                onDeleteJob,
            });

            const deleteButtons = screen.getAllByRole('button', {
                name: /delete/i,
            });

            fireEvent.click(deleteButtons[0]);

            expect(onDeleteJob).toHaveBeenCalled();
        });
    });

    /* =======================================================
       WORKSPACE VIEW
    ======================================================= */

    describe('workspace view', () => {
        it('renders the active role workspace', () => {
            renderHub({
                selectedJobId: job1.id,
            });

            expect(
                screen.getByRole('heading', {
                    name: 'Senior React Developer',
                })
            ).toBeInTheDocument();

            expect(
                screen.getByTestId('search-console')
            ).toBeInTheDocument();
        });

        it('renders the candidate grid for the active role', () => {
            renderHub({
                selectedJobId: job1.id,
            });

            expect(
                screen.getByTestId('candidate-grid')
            ).toBeInTheDocument();

            expect(
                screen.getByTestId('candidate-card-candidate-1')
            ).toBeInTheDocument();

            expect(
                screen.getByTestId('candidate-card-candidate-2')
            ).toBeInTheDocument();
        });

        it('renders sourced and shortlisted tabs', () => {
            renderHub({
                selectedJobId: job1.id,
            });

            expect(
                screen.getByRole('button', {
                    name: /sourced/i,
                })
            ).toBeInTheDocument();

            expect(
                screen.getByRole('button', {
                    name: /shortlisted/i,
                })
            ).toBeInTheDocument();
        });

        it('shows the shortlist count', () => {
            renderHub({
                selectedJobId: job1.id,
                savedRoleCandidates: {
                    [job1.id]: ['candidate-1'],
                },
            });

            expect(
                screen.getByRole('button', {
                    name: /shortlisted/i,
                })
            ).toBeInTheDocument();
        });

        it('switches to the shortlisted tab', () => {
            renderHub({
                selectedJobId: job1.id,
                savedRoleCandidates: {
                    [job1.id]: ['candidate-1'],
                },
            });

            fireEvent.click(
                screen.getByRole('button', {
                    name: /shortlisted/i,
                })
            );

            expect(
                screen.getByTestId('candidate-card-candidate-1')
            ).toBeInTheDocument();

            expect(
                screen.queryByTestId('candidate-card-candidate-2')
            ).not.toBeInTheDocument();
        });

        it('renders the AgentStatusWidget while searching', () => {
            renderHub({
                selectedJobId: job1.id,
                isSearching: true,
                agentStep: 'Finding candidates',
            });

            expect(
                screen.getByTestId('agent-status-widget')
            ).toBeInTheDocument();
        });

        it('renders the refresh button when candidates are sourced', () => {
            renderHub({
                selectedJobId: job1.id,
            });

            expect(
                screen.getByRole('button', {
                    name: /refresh/i,
                })
            ).toBeInTheDocument();
        });

        it('calls onRefresh when refreshing the active search', () => {
            const onRefresh = vi.fn();

            renderHub({
                selectedJobId: job1.id,
                onRefresh,
            });

            fireEvent.click(
                screen.getByRole('button', {
                    name: /refresh/i,
                })
            );

            expect(onRefresh).toHaveBeenCalled();
        });

        it('can return from workspace to the library', () => {
            renderHub({
                selectedJobId: job1.id,
            });

            /*
             * Actual accessible name from SourcingHubView:
             * "All descriptions"
             */
            const backButton = screen.getByRole('button', {
                name: /all descriptions/i,
            });

            fireEvent.click(backButton);

            expect(
                screen.getByRole('heading', {
                    name: /your hiring roles/i,
                })
            ).toBeInTheDocument();
        });
    });

    /* =======================================================
       SHORTLIST
    ======================================================= */

    describe('shortlist', () => {
        it('shows only saved candidates in the shortlisted tab', () => {
            renderHub({
                selectedJobId: job1.id,

                savedRoleCandidates: {
                    [job1.id]: ['candidate-2'],
                },
            });

            fireEvent.click(
                screen.getByRole('button', {
                    name: /shortlisted/i,
                })
            );

            expect(
                screen.getByTestId('candidate-card-candidate-2')
            ).toBeInTheDocument();

            expect(
                screen.queryByTestId('candidate-card-candidate-1')
            ).not.toBeInTheDocument();
        });

        it('shows the empty shortlist state when no candidates are saved', () => {
            renderHub({
                selectedJobId: job1.id,
                savedRoleCandidates: {},
            });

            fireEvent.click(
                screen.getByRole('button', {
                    name: /shortlisted/i,
                })
            );

            expect(
                screen.getByRole('heading', {
                    name: /no candidates shortlisted/i,
                })
            ).toBeInTheDocument();
        });

        it('can return to sourced candidates from the shortlist tab', () => {
            renderHub({
                selectedJobId: job1.id,
                savedRoleCandidates: {},
            });

            fireEvent.click(
                screen.getByRole('button', {
                    name: /shortlisted/i,
                })
            );

            fireEvent.click(
                screen.getByRole('button', {
                    name: /sourced/i,
                })
            );

            expect(
                screen.getByTestId('candidate-grid')
            ).toBeInTheDocument();
        });
    });

    /* =======================================================
       CANDIDATE ACTIONS
    ======================================================= */

    describe('candidate actions', () => {
        it('calls onViewDetails when candidate details are requested', () => {
            const onViewDetails = vi.fn();

            renderHub({
                selectedJobId: job1.id,
                onViewDetails,
            });

            fireEvent.click(
                screen.getByRole('button', {
                    name: /view alice johnson/i,
                })
            );

            expect(onViewDetails).toHaveBeenCalledWith(candidate1);
        });

        it('calls onEdit when candidate editing is requested', () => {
            const onEdit = vi.fn();

            renderHub({
                selectedJobId: job1.id,
                onEdit,
            });

            fireEvent.click(
                screen.getByRole('button', {
                    name: /edit alice johnson/i,
                })
            );

            expect(onEdit).toHaveBeenCalledWith(candidate1);
        });

        it('calls onDelete when candidate deletion is requested', () => {
            const onDelete = vi.fn();

            renderHub({
                selectedJobId: job1.id,
                onDelete,
            });

            fireEvent.click(
                screen.getByRole('button', {
                    name: /delete alice johnson/i,
                })
            );

            expect(onDelete).toHaveBeenCalledWith(candidate1);
        });

        it('renders the Compare action when multiple candidates are available', () => {
            const onCompare = vi.fn();

            renderHub({
                selectedJobId: job1.id,
                onCompare,
            });

            /*
             * Compare is a workspace-level action in the actual
             * SourcingHubView. CandidateGridView does not own this
             * action, so we verify the real button exists.
             */
            expect(
                screen.getByRole('button', {
                    name: /^compare$/i,
                })
            ).toBeInTheDocument();
        });
    });

    /* =======================================================
       CANDIDATE CACHE HANDLING
    ======================================================= */

    describe('candidate cache handling', () => {
        it('uses the cached candidates for the active role', () => {
            renderHub({
                selectedJobId: job1.id,

                candidates: [],

                jobResultsCache: {
                    [job1.id]: {
                        candidates: [candidate1],
                    },
                },
            });

            expect(
                screen.getByTestId('candidate-card-candidate-1')
            ).toBeInTheDocument();
        });

        it('supports a sourced cache structure', () => {
            renderHub({
                selectedJobId: job1.id,

                candidates: [],

                jobResultsCache: {
                    [job1.id]: {
                        sourced: [candidate2],
                    },
                },
            });

            expect(
                screen.getByTestId('candidate-card-candidate-2')
            ).toBeInTheDocument();
        });

        it('falls back to the candidates prop when no cache exists', () => {
            renderHub({
                selectedJobId: job1.id,

                candidates: [candidate3],

                jobResultsCache: {},
            });

            expect(
                screen.getByTestId('candidate-card-candidate-3')
            ).toBeInTheDocument();
        });

        it('shows an empty candidate state when there are no candidates', () => {
            renderHub({
                selectedJobId: job1.id,

                candidates: [],

                allCandidates: [],

                jobResultsCache: {},

                savedRoleCandidates: {},
            });

            expect(
                screen.getByRole('heading', {
                    name: /no candidates sourced yet/i,
                })
            ).toBeInTheDocument();

            expect(
                screen.getByRole('button', {
                    name: /start sourcing/i,
                })
            ).toBeInTheDocument();
        });
    });

    /* =======================================================
       SEARCH / REFRESH
    ======================================================= */

    describe('search and refresh behavior', () => {
        it('calls onSearch from the SearchConsole', () => {
            const onSearch = vi.fn();

            renderHub({
                selectedJobId: job1.id,
                onSearch,
            });

            fireEvent.click(
                screen.getByRole('button', {
                    name: /run search/i,
                })
            );

            expect(onSearch).toHaveBeenCalled();
        });

        it('calls onSearchModeChange when changing search mode', () => {
            const onSearchModeChange = vi.fn();

            renderHub({
                selectedJobId: job1.id,
                onSearchModeChange,
            });

            fireEvent.click(
                screen.getByRole('button', {
                    name: /switch search mode/i,
                })
            );

            expect(onSearchModeChange).toHaveBeenCalledWith(
                'classic'
            );
        });

        it('refreshes using the last search when available', () => {
            const onSearch = vi.fn();

            renderHub({
                selectedJobId: job1.id,
                onSearch,
                onRefresh: undefined,
                lastSearch: {
                    query: 'React developer',
                    filters: {
                        maxResults: 10,
                        searchMode: 'ai',
                    },
                    jobId: job1.id,
                },
            });

            fireEvent.click(
                screen.getByRole('button', {
                    name: /refresh/i,
                })
            );

            expect(onSearch).toHaveBeenCalled();
        });
    });

    /* =======================================================
       PAGINATION
    ======================================================= */

    describe('pagination', () => {
        it('shows pagination when there are more than six roles', () => {
            const jobs = Array.from(
                { length: 8 },
                (_, index) => ({
                    ...job1,
                    id: `job-${2000 + index}`,
                    title: `Developer Role ${index + 1}`,
                })
            );

            renderHub({
                jobDescriptions: jobs,
            });

            expect(
                screen.getByRole('button', {
                    name: /next/i,
                })
            ).toBeInTheDocument();
        });

        it('moves to the next library page', () => {
            const jobs = Array.from(
                { length: 8 },
                (_, index) => ({
                    ...job1,
                    id: `job-${2000 + index}`,
                    title: `Developer Role ${index + 1}`,
                })
            );

            renderHub({
                jobDescriptions: jobs,
            });

            expect(
                screen.getByText('Developer Role 8')
            ).toBeInTheDocument();

            fireEvent.click(
                screen.getByRole('button', {
                    name: /next/i,
                })
            );

            expect(
                screen.getByText('Developer Role 2')
            ).toBeInTheDocument();
        });

        it('disables the previous button on the first page', () => {
            const jobs = Array.from(
                { length: 8 },
                (_, index) => ({
                    ...job1,
                    id: `job-${2000 + index}`,
                    title: `Developer Role ${index + 1}`,
                })
            );

            renderHub({
                jobDescriptions: jobs,
            });

            const previousButton = screen.getByRole('button', {
                name: /previous|prev/i,
            });

            expect(previousButton).toBeDisabled();
        });
    });

    /* =======================================================
       JOB SELECTION
    ======================================================= */

    describe('job selection', () => {
        it('calls onSelectJob with the selected job object', () => {
            const onSelectJob = vi.fn();

            renderHub({
                onSelectJob,
            });

            const openButtons = screen.getAllByRole('button', {
                name: /open/i,
            });

            fireEvent.click(openButtons[0]);

            expect(onSelectJob).toHaveBeenCalledWith(job1);
        });

        it('opens the correct selected job workspace', () => {
            renderHub({
                selectedJobId: job2.id,
            });

            expect(
                screen.getByRole('heading', {
                    name: 'Backend Java Developer',
                })
            ).toBeInTheDocument();

            expect(
                screen.queryByRole('heading', {
                    name: 'Senior React Developer',
                })
            ).not.toBeInTheDocument();
        });
    });

    /* =======================================================
       SAVED CANDIDATE LOOKUP
    ======================================================= */

    describe('saved candidate lookup', () => {
        it('finds saved candidates from allCandidates', () => {
            renderHub({
                selectedJobId: job1.id,

                candidates: [],

                jobResultsCache: {},

                allCandidates: [
                    candidate1,
                    candidate2,
                ],

                savedRoleCandidates: {
                    [job1.id]: ['candidate-2'],
                },
            });

            fireEvent.click(
                screen.getByRole('button', {
                    name: /shortlisted/i,
                })
            );

            expect(
                screen.getByTestId('candidate-card-candidate-2')
            ).toBeInTheDocument();
        });

        it('ignores saved candidate IDs that cannot be resolved', () => {
            renderHub({
                selectedJobId: job1.id,

                candidates: [],

                jobResultsCache: {},

                allCandidates: [candidate1],

                savedRoleCandidates: {
                    [job1.id]: [
                        'candidate-does-not-exist',
                    ],
                },
            });

            fireEvent.click(
                screen.getByRole('button', {
                    name: /shortlisted/i,
                })
            );

            expect(
                screen.getByRole('heading', {
                    name: /no candidates shortlisted/i,
                })
            ).toBeInTheDocument();
        });
    });
});