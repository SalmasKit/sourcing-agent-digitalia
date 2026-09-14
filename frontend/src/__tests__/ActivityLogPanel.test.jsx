import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { ActivityLogPanel } from '../components/ActivityLogPanel';
import { useLanguage } from '../context/LanguageContext';
import { getTeamActivitiesApi } from '../services/api';

/* ---------------------------------------------------------------------
   Mocks
--------------------------------------------------------------------- */

vi.mock('../context/LanguageContext', () => ({
    useLanguage: vi.fn(),
}));

vi.mock('../services/api', () => ({
    getTeamActivitiesApi: vi.fn(),
}));

const useLanguageMock = vi.mocked(useLanguage);
const getTeamActivitiesApiMock = vi.mocked(getTeamActivitiesApi);

/* ---------------------------------------------------------------------
   Fixtures
--------------------------------------------------------------------- */

const makeActivity = (overrides = {}) => ({
    id: 'a1',
    actionType: 'ROLE_CREATED',
    actorName: 'Sara Bennani',
    actorRole: 'RECRUITER',
    targetTitle: 'Senior Backend Engineer',
    details: null,
    createdAt: new Date().toISOString(),
    ...overrides,
});

beforeEach(() => {
    vi.clearAllMocks();

    useLanguageMock.mockReturnValue({ lang: 'EN' });

    // Default to a never-resolving promise unless a test overrides it —
    // keeps any accidental live fetch from throwing on an unmocked value.
    getTeamActivitiesApiMock.mockResolvedValue([]);
});

afterEach(() => {
    vi.restoreAllMocks();
});

/* =======================================================================
   RENDERING
======================================================================= */

describe('rendering', () => {
    it('shows a loading state while activities are being fetched', () => {
        getTeamActivitiesApiMock.mockReturnValue(new Promise(() => { }));

        render(<ActivityLogPanel />);

        expect(screen.getByText('Loading…')).toBeInTheDocument();
    });

    it('renders provided activities immediately without calling the API', () => {
        render(<ActivityLogPanel activities={[makeActivity()]} />);

        expect(getTeamActivitiesApiMock).not.toHaveBeenCalled();
        expect(screen.getByText('Sara Bennani')).toBeInTheDocument();
    });

    it('renders the default title and subtitle in English', () => {
        render(<ActivityLogPanel activities={[]} />);

        expect(screen.getByText('Team Activity & Audit Feed')).toBeInTheDocument();
        expect(
            screen.getByText('History of actions and activity across your team')
        ).toBeInTheDocument();
    });

    it('renders the default title and subtitle in French', () => {
        useLanguageMock.mockReturnValue({ lang: 'FR' });

        render(<ActivityLogPanel activities={[]} />);

        expect(screen.getByText("Journal d'activité de l'équipe")).toBeInTheDocument();
        expect(
            screen.getByText("Historique des actions et de l'activité de votre équipe")
        ).toBeInTheDocument();
    });

    it('renders a custom title when provided, overriding the default', () => {
        render(<ActivityLogPanel activities={[]} title="Custom Feed" />);

        expect(screen.getByText('Custom Feed')).toBeInTheDocument();
        expect(screen.queryByText('Team Activity & Audit Feed')).not.toBeInTheDocument();
    });

    it('hides the header (title and filters) when showFilter is false', () => {
        render(<ActivityLogPanel activities={[]} showFilter={false} />);

        expect(screen.queryByText('Team Activity & Audit Feed')).not.toBeInTheDocument();
        expect(screen.queryByText('All')).not.toBeInTheDocument();
    });

    it('shows the empty state when there are no activities', () => {
        render(<ActivityLogPanel activities={[]} />);

        expect(screen.getByText('No team activity recorded yet.')).toBeInTheDocument();
    });
});

/* =======================================================================
   FETCHING
======================================================================= */

describe('fetching activities', () => {
    it('calls getTeamActivitiesApi and renders the results when no activities prop is passed', async () => {
        getTeamActivitiesApiMock.mockResolvedValue([
            makeActivity({ actorName: 'Yassine El Idrissi' }),
        ]);

        render(<ActivityLogPanel />);

        await waitFor(() => {
            expect(screen.getByText('Yassine El Idrissi')).toBeInTheDocument();
        });

        expect(getTeamActivitiesApiMock).toHaveBeenCalledWith(50);
    });

    it('falls back to an empty list and stops loading when the API call fails', async () => {
        getTeamActivitiesApiMock.mockRejectedValue(new Error('network error'));
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

        render(<ActivityLogPanel />);

        await waitFor(() => {
            expect(screen.getByText('No team activity recorded yet.')).toBeInTheDocument();
        });

        expect(warnSpy).toHaveBeenCalled();
    });
});

/* =======================================================================
   FILTERS
======================================================================= */

describe('filters', () => {
    const activities = [
        makeActivity({ id: '1', actionType: 'ROLE_CREATED', actorName: 'RoleUser' }),
        makeActivity({ id: '2', actionType: 'CANDIDATE_SHORTLISTED', actorName: 'ShortlistUser' }),
        makeActivity({ id: '3', actionType: 'NOTE_ADDED', actorName: 'NoteUser' }),
        makeActivity({ id: '4', actionType: 'RECRUITER_INVITED', actorName: 'TeamUser' }),
        makeActivity({ id: '5', actionType: 'STAGE_CHANGED', actorName: 'StageUser' }),
    ];

    it('shows all activities by default', () => {
        render(<ActivityLogPanel activities={activities} />);

        ['RoleUser', 'ShortlistUser', 'NoteUser', 'TeamUser', 'StageUser'].forEach((name) => {
            expect(screen.getByText(name)).toBeInTheDocument();
        });
    });

    it('filters to role-related activities when Roles is clicked', () => {
        render(<ActivityLogPanel activities={activities} />);

        fireEvent.click(screen.getByText('Roles'));

        expect(screen.getByText('RoleUser')).toBeInTheDocument();
        expect(screen.queryByText('ShortlistUser')).not.toBeInTheDocument();
        expect(screen.queryByText('NoteUser')).not.toBeInTheDocument();
    });

    it('filters to shortlist activities when Shortlists is clicked', () => {
        render(<ActivityLogPanel activities={activities} />);

        fireEvent.click(screen.getByText('Shortlists'));

        expect(screen.getByText('ShortlistUser')).toBeInTheDocument();
        expect(screen.queryByText('RoleUser')).not.toBeInTheDocument();
    });

    it('filters to note activities when Notes is clicked', () => {
        render(<ActivityLogPanel activities={activities} />);

        fireEvent.click(screen.getByText('Notes'));

        expect(screen.getByText('NoteUser')).toBeInTheDocument();
        expect(screen.queryByText('TeamUser')).not.toBeInTheDocument();
    });

    it('filters to team-related activities when Team is clicked', () => {
        render(<ActivityLogPanel activities={activities} />);

        fireEvent.click(screen.getByText('Team'));

        expect(screen.getByText('TeamUser')).toBeInTheDocument();
        expect(screen.queryByText('NoteUser')).not.toBeInTheDocument();
    });

    it('returns to showing all activities when All is clicked after another filter', () => {
        render(<ActivityLogPanel activities={activities} />);

        fireEvent.click(screen.getByText('Notes'));
        fireEvent.click(screen.getByText('All'));

        ['RoleUser', 'ShortlistUser', 'NoteUser', 'TeamUser', 'StageUser'].forEach((name) => {
            expect(screen.getByText(name)).toBeInTheDocument();
        });
    });

    it('applies the active styling to the currently selected filter button', () => {
        render(<ActivityLogPanel activities={activities} />);

        fireEvent.click(screen.getByText('Roles'));

        expect(screen.getByText('Roles')).toHaveClass('active');
        expect(screen.getByText('All')).not.toHaveClass('active');
    });

    it('uses the externally controlled filterType when provided, ignoring internal clicks', () => {
        render(<ActivityLogPanel activities={activities} filterType="NOTES" />);

        expect(screen.getByText('NoteUser')).toBeInTheDocument();
        expect(screen.queryByText('RoleUser')).not.toBeInTheDocument();

        // Clicking a different filter button updates internal state, but the
        // external filterType prop still wins, so results shouldn't change.
        fireEvent.click(screen.getByText('Roles'));

        expect(screen.getByText('NoteUser')).toBeInTheDocument();
        expect(screen.queryByText('RoleUser')).not.toBeInTheDocument();
    });
});

/* =======================================================================
   MAX ITEMS
======================================================================= */

describe('maxItems', () => {
    it('limits the number of rendered activities to maxItems', () => {
        const many = Array.from({ length: 5 }, (_, index) =>
            makeActivity({ id: `id-${index}`, actorName: `Actor ${index}` })
        );

        render(<ActivityLogPanel activities={many} maxItems={2} />);

        expect(screen.getByText('Actor 0')).toBeInTheDocument();
        expect(screen.getByText('Actor 1')).toBeInTheDocument();
        expect(screen.queryByText('Actor 2')).not.toBeInTheDocument();
    });
});

/* =======================================================================
   ACTIVITY ITEM CONTENT
======================================================================= */

describe('activity item content', () => {
    it('shows the Admin tag for HR_ADMIN actors', () => {
        render(
            <ActivityLogPanel
                activities={[makeActivity({ actorRole: 'HR_ADMIN', actorName: 'Admin Person' })]}
            />
        );

        expect(screen.getByText('Admin')).toBeInTheDocument();
    });

    it('shows the Admin tag for SUPER_ADMIN actors', () => {
        render(
            <ActivityLogPanel
                activities={[makeActivity({ actorRole: 'SUPER_ADMIN', actorName: 'Super Admin' })]}
            />
        );

        expect(screen.getByText('Admin')).toBeInTheDocument();
    });

    it('shows the Recruiter tag for non-admin actors', () => {
        render(
            <ActivityLogPanel
                activities={[makeActivity({ actorRole: 'RECRUITER', actorName: 'Reg Person' })]}
            />
        );

        expect(screen.getByText('Recruiter')).toBeInTheDocument();
    });

    it('renders the actor initial in the avatar', () => {
        render(<ActivityLogPanel activities={[makeActivity({ actorName: 'zoe' })]} />);

        expect(screen.getByText('zoe')).toBeInTheDocument();
        expect(screen.getByText('Z')).toBeInTheDocument();
    });

    it('falls back to "User" when actorName is missing', () => {
        render(<ActivityLogPanel activities={[makeActivity({ actorName: undefined })]} />);

        expect(screen.getByText('User')).toBeInTheDocument();
        expect(screen.getByText('U')).toBeInTheDocument();
    });

    it('shows the mapped English label for a known action type', () => {
        render(
            <ActivityLogPanel activities={[makeActivity({ actionType: 'CANDIDATE_SHORTLISTED' })]} />
        );

        expect(screen.getByText('Shortlisted Candidate')).toBeInTheDocument();
    });

    it('shows the mapped French label for a known action type when lang is FR', () => {
        useLanguageMock.mockReturnValue({ lang: 'FR' });

        render(
            <ActivityLogPanel activities={[makeActivity({ actionType: 'CANDIDATE_SHORTLISTED' })]} />
        );

        expect(screen.getByText('A sélectionné un candidat')).toBeInTheDocument();
    });

    it('falls back to the raw actionType as the label when it is not recognized', () => {
        render(
            <ActivityLogPanel activities={[makeActivity({ actionType: 'SOMETHING_UNKNOWN' })]} />
        );

        expect(screen.getByText('SOMETHING_UNKNOWN')).toBeInTheDocument();
    });

    it('renders the target title when present', () => {
        render(
            <ActivityLogPanel activities={[makeActivity({ targetTitle: 'Backend Engineer' })]} />
        );

        expect(screen.getByText('Backend Engineer')).toBeInTheDocument();
    });

    it('does not render a target title block when absent', () => {
        render(
            <ActivityLogPanel activities={[makeActivity({ targetTitle: undefined })]} />
        );

        expect(screen.queryByText('Senior Backend Engineer')).not.toBeInTheDocument();
    });

    it('renders extra details when present', () => {
        render(
            <ActivityLogPanel
                activities={[makeActivity({ details: 'Moved from Screening to Interview' })]}
            />
        );

        expect(screen.getByText('Moved from Screening to Interview')).toBeInTheDocument();
    });

    it('does not render a details block when absent', () => {
        render(<ActivityLogPanel activities={[makeActivity({ details: null })]} />);

        expect(document.querySelector('.alp-details')).not.toBeInTheDocument();
    });
});

/* =======================================================================
   RELATIVE TIME FORMATTING
======================================================================= */

describe('relative time formatting', () => {
    it('shows "Just now" for very recent activity', () => {
        render(
            <ActivityLogPanel activities={[makeActivity({ createdAt: new Date().toISOString() })]} />
        );

        expect(screen.getByText('Just now')).toBeInTheDocument();
    });

    it('shows minutes ago for activity within the last hour', () => {
        const createdAt = new Date(Date.now() - 5 * 60 * 1000).toISOString();

        render(<ActivityLogPanel activities={[makeActivity({ createdAt })]} />);

        expect(screen.getByText('5m ago')).toBeInTheDocument();
    });

    it('shows hours ago for activity within the last day', () => {
        const createdAt = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();

        render(<ActivityLogPanel activities={[makeActivity({ createdAt })]} />);

        expect(screen.getByText('3h ago')).toBeInTheDocument();
    });

    it('shows days ago for activity within the last week', () => {
        const createdAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

        render(<ActivityLogPanel activities={[makeActivity({ createdAt })]} />);

        expect(screen.getByText('2d ago')).toBeInTheDocument();
    });

    it('renders relative time in French when lang is FR', () => {
        useLanguageMock.mockReturnValue({ lang: 'FR' });
        const createdAt = new Date(Date.now() - 5 * 60 * 1000).toISOString();

        render(<ActivityLogPanel activities={[makeActivity({ createdAt })]} />);

        expect(screen.getByText('Il y a 5 min')).toBeInTheDocument();
    });

    it('still renders the activity item when the timestamp is missing', () => {
        render(
            <ActivityLogPanel
                activities={[
                    makeActivity({ createdAt: undefined, details: 'No timestamp here' }),
                ]}
            />
        );

        expect(screen.getByText('No timestamp here')).toBeInTheDocument();
    });
});