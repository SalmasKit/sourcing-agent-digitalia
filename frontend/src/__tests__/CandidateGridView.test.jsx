import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import CandidateGridView from '../components/CandidateGridView';
import { useConfirm } from '../context/ConfirmDialogContext';
import { useLanguage } from '../context/LanguageContext';

vi.mock('../context/ConfirmDialogContext', () => ({
  useConfirm: vi.fn(),
}));

vi.mock('../context/LanguageContext', () => ({
  useLanguage: vi.fn(),
}));

vi.mock('../components/CandidateCard', () => ({
  CandidateCard: ({
    candidate,
    index,
    selected,
    onToggleSelect,
    onViewDetails,
    onDelete,
    onSaveForJob,
  }) => (
    <div data-testid={`candidate-card-${candidate.id}`}>
      <span>{String(index + 1).padStart(2, '0')}</span>

      <span data-testid={`candidate-name-${candidate.id}`}>
        {candidate.name}
      </span>

      <button
        type="button"
        aria-label={`Select ${candidate.name}`}
        aria-pressed={selected}
        onClick={() => onToggleSelect(candidate.id)}
      >
        Select
      </button>

      <button
        type="button"
        aria-label={`View ${candidate.name}`}
        onClick={(event) =>
          onViewDetails(candidate, event)
        }
      >
        View Profile
      </button>

      <button
        type="button"
        aria-label={`Delete ${candidate.name}`}
        onClick={() => onDelete?.(candidate.id)}
      >
        Delete Candidate
      </button>

      <button
        type="button"
        aria-label={`Save ${candidate.name}`}
        onClick={() => onSaveForJob?.(candidate.id)}
      >
        Save
      </button>
    </div>
  ),
}));

const makeCandidate = (number, score = number * 10) => ({
  id: `candidate-${number}`,
  name: `Candidate ${number}`,
  matchScore: score,
});

const makeCandidates = (count, scores = null) =>
  Array.from({ length: count }, (_, index) =>
    makeCandidate(
      index + 1,
      scores?.[index] ?? (index + 1) * 10
    )
  );

const renderGrid = (props = {}) => {
  const defaultProps = {
    candidates: [],
    shortlist: [],
    selectedJobId: 'job-1',
    savedRoleCandidates: {},
    onViewDetails: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onToggleSaveForJob: vi.fn(),
    onOpenComparator: vi.fn(),
    onBulkDelete: vi.fn(),
    onBulkToggleSaveForJob: vi.fn(),
  };

  return render(
    <CandidateGridView
      {...defaultProps}
      {...props}
    />
  );
};

const getNextButton = () =>
  screen.getByRole('button', {
    name: /next/i,
  });

const getPreviousButton = () =>
  screen.getByRole('button', {
    name: /previous/i,
  });

const getScoreSelect = () =>
  screen.getByRole('combobox', {
    name: /score/i,
  });

/*
 * IMPORTANT:
 * Do not use the displayed 01/02/03/04 values to test sorting.
 * Those are positions in the current page.
 *
 * The candidate card test id contains the actual candidate identity,
 * so this helper tells us which candidates are currently rendered.
 */
const getCandidateIds = () =>
  Array.from(
    document.querySelectorAll(
      '[data-testid^="candidate-card-"]'
    )
  ).map((element) =>
    element
      .getAttribute('data-testid')
      .replace('candidate-card-', '')
  );

const selectCandidates = async (count) => {
  for (let i = 1; i <= count; i += 1) {
    fireEvent.click(
      screen.getByRole('button', {
        name: `Select Candidate ${i}`,
      })
    );
  }

  await waitFor(() => {
    expect(
      screen.getByText(String(count))
    ).toBeInTheDocument();
  });
};

describe('CandidateGridView', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useLanguage.mockReturnValue({
      lang: 'EN',
    });

    useConfirm.mockReturnValue({
      confirm: vi.fn().mockResolvedValue(true),
    });
  });

  describe('Rendering', () => {
    it('renders candidates', () => {
      renderGrid({
        candidates: makeCandidates(3),
      });

      expect(
        screen.getByTestId(
          'candidate-card-candidate-1'
        )
      ).toBeInTheDocument();

      expect(
        screen.getByTestId(
          'candidate-card-candidate-2'
        )
      ).toBeInTheDocument();

      expect(
        screen.getByTestId(
          'candidate-card-candidate-3'
        )
      ).toBeInTheDocument();
    });

    it('renders the score sorting control', () => {
      renderGrid({
        candidates: makeCandidates(3),
      });

      expect(getScoreSelect()).toBeInTheDocument();
      expect(getScoreSelect()).toHaveValue('default');
    });

    it('renders the empty state when there are no candidates', () => {
      renderGrid({
        candidates: [],
      });

      expect(
        screen.getByText('No candidates found')
      ).toBeInTheDocument();
    });

    it('renders only six candidates on the first page', () => {
      renderGrid({
        candidates: makeCandidates(8),
      });

      expect(
        screen.getByTestId(
          'candidate-card-candidate-1'
        )
      ).toBeInTheDocument();

      expect(
        screen.getByTestId(
          'candidate-card-candidate-6'
        )
      ).toBeInTheDocument();

      expect(
        screen.queryByTestId(
          'candidate-card-candidate-7'
        )
      ).not.toBeInTheDocument();

      expect(
        screen.queryByTestId(
          'candidate-card-candidate-8'
        )
      ).not.toBeInTheDocument();
    });

    it('does not render pagination when there is only one page', () => {
      renderGrid({
        candidates: makeCandidates(6),
      });

      expect(
        screen.queryByRole('button', {
          name: /next/i,
        })
      ).not.toBeInTheDocument();

      expect(
        screen.queryByRole('button', {
          name: /previous/i,
        })
      ).not.toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    it('shows a next page button when there are more than PAGE_SIZE candidates', async () => {
      renderGrid({
        candidates: makeCandidates(7),
      });

      await waitFor(() => {
        expect(getNextButton()).toBeInTheDocument();
      });

      expect(getNextButton()).not.toBeDisabled();
    });

    it('moves to the next page', async () => {
      renderGrid({
        candidates: makeCandidates(8),
      });

      await waitFor(() => {
        expect(getNextButton()).not.toBeDisabled();
      });

      fireEvent.click(getNextButton());

      await waitFor(() => {
        expect(
          screen.getByTestId(
            'candidate-card-candidate-7'
          )
        ).toBeInTheDocument();

        expect(
          screen.getByTestId(
            'candidate-card-candidate-8'
          )
        ).toBeInTheDocument();
      });

      expect(
        screen.queryByTestId(
          'candidate-card-candidate-1'
        )
      ).not.toBeInTheDocument();
    });

    it('disables next on the last page', async () => {
      renderGrid({
        candidates: makeCandidates(8),
      });

      await waitFor(() => {
        expect(getNextButton()).not.toBeDisabled();
      });

      fireEvent.click(getNextButton());

      await waitFor(() => {
        expect(getNextButton()).toBeDisabled();
      });
    });

    it('moves back to the previous page', async () => {
      renderGrid({
        candidates: makeCandidates(8),
      });

      await waitFor(() => {
        expect(getNextButton()).not.toBeDisabled();
      });

      fireEvent.click(getNextButton());

      await waitFor(() => {
        expect(
          screen.getByTestId(
            'candidate-card-candidate-7'
          )
        ).toBeInTheDocument();
      });

      fireEvent.click(getPreviousButton());

      await waitFor(() => {
        expect(
          screen.getByTestId(
            'candidate-card-candidate-1'
          )
        ).toBeInTheDocument();

        expect(
          screen.queryByTestId(
            'candidate-card-candidate-7'
          )
        ).not.toBeInTheDocument();
      });
    });

    it('disables previous on the first page', async () => {
      renderGrid({
        candidates: makeCandidates(8),
      });

      await waitFor(() => {
        expect(getPreviousButton()).toBeDisabled();
      });
    });

    it('supports direct page navigation', async () => {
      renderGrid({
        candidates: makeCandidates(14),
      });

      fireEvent.click(
        screen.getByRole('button', {
          name: 'Page 3',
        })
      );

      await waitFor(() => {
        expect(
          screen.getByTestId(
            'candidate-card-candidate-13'
          )
        ).toBeInTheDocument();

        expect(
          screen.getByTestId(
            'candidate-card-candidate-14'
          )
        ).toBeInTheDocument();
      });
    });

    it('resets to the first page when candidates change', async () => {
      const { rerender } = renderGrid({
        candidates: makeCandidates(8),
      });

      await waitFor(() => {
        expect(getNextButton()).not.toBeDisabled();
      });

      fireEvent.click(getNextButton());

      await waitFor(() => {
        expect(
          screen.getByTestId(
            'candidate-card-candidate-7'
          )
        ).toBeInTheDocument();
      });

      rerender(
        <CandidateGridView
          candidates={makeCandidates(10)}
          shortlist={[]}
          selectedJobId="job-1"
          savedRoleCandidates={{}}
          onViewDetails={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onToggleSaveForJob={vi.fn()}
          onOpenComparator={vi.fn()}
          onBulkDelete={vi.fn()}
          onBulkToggleSaveForJob={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByTestId(
            'candidate-card-candidate-1'
          )
        ).toBeInTheDocument();
      });
    });

    it('resets to the first page when score sorting changes', async () => {
      const candidates = makeCandidates(
        8,
        [10, 20, 30, 40, 50, 60, 70, 80]
      );

      renderGrid({
        candidates,
      });

      await waitFor(() => {
        expect(getNextButton()).not.toBeDisabled();
      });

      fireEvent.click(getNextButton());

      await waitFor(() => {
        expect(getCandidateIds()).toEqual([
          'candidate-7',
          'candidate-8',
        ]);
      });

      fireEvent.change(getScoreSelect(), {
        target: {
          value: 'high',
        },
      });

      await waitFor(() => {
        expect(getScoreSelect()).toHaveValue('high');

        expect(getCandidateIds()).toEqual([
          'candidate-8',
          'candidate-7',
          'candidate-6',
          'candidate-5',
          'candidate-4',
          'candidate-3',
        ]);
      });
    });
  });

  describe('Score sorting', () => {
    it('keeps default order initially', () => {
      renderGrid({
        candidates: makeCandidates(
          4,
          [40, 10, 30, 20]
        ),
      });

      expect(getCandidateIds()).toEqual([
        'candidate-1',
        'candidate-2',
        'candidate-3',
        'candidate-4',
      ]);
    });

    it('sorts candidates from high to low', async () => {
      renderGrid({
        candidates: makeCandidates(
          4,
          [40, 10, 30, 20]
        ),
      });

      fireEvent.change(getScoreSelect(), {
        target: {
          value: 'high',
        },
      });

      await waitFor(() => {
        expect(getCandidateIds()).toEqual([
          'candidate-1',
          'candidate-3',
          'candidate-4',
          'candidate-2',
        ]);
      });
    });

    it('sorts candidates from low to high', async () => {
      renderGrid({
        candidates: makeCandidates(
          4,
          [40, 10, 30, 20]
        ),
      });

      fireEvent.change(getScoreSelect(), {
        target: {
          value: 'low',
        },
      });

      await waitFor(() => {
        expect(getCandidateIds()).toEqual([
          'candidate-2',
          'candidate-4',
          'candidate-3',
          'candidate-1',
        ]);
      });
    });

    it('changes candidate order when sorting low-to-high', async () => {
      renderGrid({
        candidates: makeCandidates(
          4,
          [40, 10, 30, 20]
        ),
      });

      const before = getCandidateIds();

      fireEvent.change(getScoreSelect(), {
        target: {
          value: 'low',
        },
      });

      await waitFor(() => {
        expect(getCandidateIds()).toEqual([
          'candidate-2',
          'candidate-4',
          'candidate-3',
          'candidate-1',
        ]);

        expect(getCandidateIds()).not.toEqual(
          before
        );
      });
    });
  });

  describe('Selection', () => {
    it('selects one candidate', async () => {
      renderGrid({
        candidates: makeCandidates(3),
      });

      fireEvent.click(
        screen.getByRole('button', {
          name: 'Select Candidate 1',
        })
      );

      await waitFor(() => {
        expect(
          screen.getByText('1')
        ).toBeInTheDocument();

        expect(
          screen.getByText('candidate selected')
        ).toBeInTheDocument();
      });
    });

    it('supports selecting multiple candidates', async () => {
      renderGrid({
        candidates: makeCandidates(3),
      });

      await selectCandidates(2);

      expect(
        screen.getByText('2')
      ).toBeInTheDocument();

      expect(
        screen.getByText('candidates selected')
      ).toBeInTheDocument();
    });

    it('clears the selection', async () => {
      renderGrid({
        candidates: makeCandidates(3),
      });

      await selectCandidates(2);

      fireEvent.click(
        screen.getByRole('button', {
          name: /clear selection/i,
        })
      );

      await waitFor(() => {
        expect(
          screen.queryByText(
            'candidates selected'
          )
        ).not.toBeInTheDocument();
      });
    });

    it('toggles a selected candidate off', async () => {
      renderGrid({
        candidates: makeCandidates(2),
      });

      fireEvent.click(
        screen.getByRole('button', {
          name: 'Select Candidate 1',
        })
      );

      await waitFor(() => {
        expect(
          screen.getByText(
            'candidate selected'
          )
        ).toBeInTheDocument();
      });

      fireEvent.click(
        screen.getByRole('button', {
          name: 'Select Candidate 1',
        })
      );

      await waitFor(() => {
        expect(
          screen.queryByText(
            'candidate selected'
          )
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('Bulk shortlist', () => {
    it('calls onBulkToggleSaveForJob for selected candidates', async () => {
      const onBulkToggleSaveForJob =
        vi.fn().mockResolvedValue(undefined);

      renderGrid({
        candidates: makeCandidates(3),
        selectedJobId: 'job-1',
        savedRoleCandidates: {
          'job-1': [],
        },
        onBulkToggleSaveForJob,
      });

      await selectCandidates(2);

      fireEvent.click(
        screen.getByRole('button', {
          name: /^shortlist$/i,
        })
      );

      await waitFor(() => {
        expect(
          onBulkToggleSaveForJob
        ).toHaveBeenCalledWith(
          [
            'candidate-1',
            'candidate-2',
          ],
          'job-1'
        );
      });

      await waitFor(() => {
        expect(
          screen.queryByText(
            'candidates selected'
          )
        ).not.toBeInTheDocument();
      });
    });

    it('does not re-save candidates already shortlisted', async () => {
      const onBulkToggleSaveForJob =
        vi.fn().mockResolvedValue(undefined);

      renderGrid({
        candidates: makeCandidates(3),
        selectedJobId: 'job-1',
        savedRoleCandidates: {
          'job-1': ['candidate-1'],
        },
        onBulkToggleSaveForJob,
      });

      await selectCandidates(2);

      fireEvent.click(
        screen.getByRole('button', {
          name: /^shortlist$/i,
        })
      );

      await waitFor(() => {
        expect(
          onBulkToggleSaveForJob
        ).toHaveBeenCalledWith(
          ['candidate-2'],
          'job-1'
        );
      });
    });

    it('clears selection when all selected candidates are already shortlisted', async () => {
      const onBulkToggleSaveForJob = vi.fn();

      renderGrid({
        candidates: makeCandidates(2),
        selectedJobId: 'job-1',
        savedRoleCandidates: {
          'job-1': [
            'candidate-1',
            'candidate-2',
          ],
        },
        onBulkToggleSaveForJob,
      });

      await selectCandidates(2);

      fireEvent.click(
        screen.getByRole('button', {
          name: /^shortlist$/i,
        })
      );

      await waitFor(() => {
        expect(
          screen.queryByText(
            'candidates selected'
          )
        ).not.toBeInTheDocument();
      });

      expect(
        onBulkToggleSaveForJob
      ).not.toHaveBeenCalled();
    });

    it('disables shortlist when no job is selected', async () => {
      renderGrid({
        candidates: makeCandidates(2),
        selectedJobId: undefined,
      });

      await selectCandidates(2);

      const shortlistButton =
        screen.getByRole('button', {
          name: /^shortlist$/i,
        });

      expect(shortlistButton).toBeDisabled();
    });

    it('uses individual save callback when bulk callback is unavailable', async () => {
      const onToggleSaveForJob = vi.fn();

      renderGrid({
        candidates: makeCandidates(2),
        selectedJobId: 'job-1',
        savedRoleCandidates: {
          'job-1': [],
        },
        onBulkToggleSaveForJob: undefined,
        onToggleSaveForJob,
      });

      await selectCandidates(2);

      fireEvent.click(
        screen.getByRole('button', {
          name: /^shortlist$/i,
        })
      );

      await waitFor(() => {
        expect(
          onToggleSaveForJob
        ).toHaveBeenCalledTimes(2);

        expect(
          onToggleSaveForJob
        ).toHaveBeenNthCalledWith(
          1,
          'candidate-1',
          'job-1'
        );

        expect(
          onToggleSaveForJob
        ).toHaveBeenNthCalledWith(
          2,
          'candidate-2',
          'job-1'
        );
      });
    });
  });

  describe('Bulk compare', () => {
    it('opens comparator with selected candidates', async () => {
      const onOpenComparator = vi.fn();

      renderGrid({
        candidates: makeCandidates(3),
        onOpenComparator,
      });

      await selectCandidates(2);

      fireEvent.click(
        screen.getByRole('button', {
          name: /^compare$/i,
        })
      );

      expect(
        onOpenComparator
      ).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 'candidate-1',
        }),
        expect.objectContaining({
          id: 'candidate-2',
        }),
      ]);
    });

    it('does not render compare without a selection', () => {
      const onOpenComparator = vi.fn();

      renderGrid({
        candidates: makeCandidates(3),
        onOpenComparator,
      });

      expect(
        screen.queryByRole('button', {
          name: /^compare$/i,
        })
      ).not.toBeInTheDocument();

      expect(
        onOpenComparator
      ).not.toHaveBeenCalled();
    });
  });

  describe('Bulk delete', () => {
    it('calls onBulkDelete after confirmation', async () => {
      const onBulkDelete =
        vi.fn().mockResolvedValue(undefined);

      const confirmMock =
        vi.fn().mockResolvedValue(true);

      useConfirm.mockReturnValue({
        confirm: confirmMock,
      });

      renderGrid({
        candidates: makeCandidates(2),
        onBulkDelete,
      });

      await selectCandidates(2);

      fireEvent.click(
        screen.getByRole('button', {
          name: /^delete$/i,
        })
      );

      await waitFor(() => {
        expect(
          confirmMock
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            title:
              'Delete 2 Candidate Profiles?',
            confirmText:
              'Delete Selected',
            cancelText: 'Cancel',
            type: 'danger',
          })
        );

        expect(
          onBulkDelete
        ).toHaveBeenCalledWith([
          'candidate-1',
          'candidate-2',
        ]);
      });

      await waitFor(() => {
        expect(
          screen.queryByText(
            'candidates selected'
          )
        ).not.toBeInTheDocument();
      });
    });

    it('does nothing when delete confirmation is rejected', async () => {
      const onBulkDelete = vi.fn();

      const confirmMock =
        vi.fn().mockResolvedValue(false);

      useConfirm.mockReturnValue({
        confirm: confirmMock,
      });

      renderGrid({
        candidates: makeCandidates(2),
        onBulkDelete,
      });

      await selectCandidates(2);

      fireEvent.click(
        screen.getByRole('button', {
          name: /^delete$/i,
        })
      );

      await waitFor(() => {
        expect(
          confirmMock
        ).toHaveBeenCalled();
      });

      expect(
        onBulkDelete
      ).not.toHaveBeenCalled();

      expect(
        screen.getByText('2')
      ).toBeInTheDocument();

      expect(
        screen.getByText(
          'candidates selected'
        )
      ).toBeInTheDocument();
    });

    it('uses individual onDelete when bulk delete callback is unavailable', async () => {
      const onDelete = vi.fn();

      const confirmMock =
        vi.fn().mockResolvedValue(true);

      useConfirm.mockReturnValue({
        confirm: confirmMock,
      });

      renderGrid({
        candidates: makeCandidates(2),
        onDelete,
        onBulkDelete: undefined,
      });

      await selectCandidates(2);

      fireEvent.click(
        screen.getByRole('button', {
          name: /^delete$/i,
        })
      );

      await waitFor(() => {
        expect(
          onDelete
        ).toHaveBeenCalledTimes(2);

        expect(
          onDelete
        ).toHaveBeenNthCalledWith(
          1,
          'candidate-1'
        );

        expect(
          onDelete
        ).toHaveBeenNthCalledWith(
          2,
          'candidate-2'
        );
      });
    });

    it('passes singular confirmation data for one selected candidate', async () => {
      const confirmMock =
        vi.fn().mockResolvedValue(true);

      useConfirm.mockReturnValue({
        confirm: confirmMock,
      });

      renderGrid({
        candidates: makeCandidates(1),
        onBulkDelete: vi.fn(),
      });

      await selectCandidates(1);

      fireEvent.click(
        screen.getByRole('button', {
          name: /^delete$/i,
        })
      );

      await waitFor(() => {
        expect(
          confirmMock
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            title:
              'Delete 1 Candidate Profile?',
            confirmText:
              'Delete Selected',
            cancelText: 'Cancel',
            type: 'danger',
          })
        );
      });
    });

    it('does not call confirmation when nothing is selected', () => {
      const confirmMock = vi.fn();

      useConfirm.mockReturnValue({
        confirm: confirmMock,
      });

      renderGrid({
        candidates: makeCandidates(2),
      });

      expect(
        screen.queryByRole('button', {
          name: /^delete$/i,
        })
      ).not.toBeInTheDocument();

      expect(
        confirmMock
      ).not.toHaveBeenCalled();
    });
  });

  describe('Candidate callbacks', () => {
    it('passes view details callback to CandidateCard', () => {
      const onViewDetails = vi.fn();

      renderGrid({
        candidates: makeCandidates(1),
        onViewDetails,
      });

      fireEvent.click(
        screen.getByRole('button', {
          name: 'View Candidate 1',
        })
      );

      expect(
        onViewDetails
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'candidate-1',
          name: 'Candidate 1',
        }),
        expect.anything()
      );
    });

    it('passes delete callback to CandidateCard', () => {
      const onDelete = vi.fn();

      renderGrid({
        candidates: makeCandidates(1),
        onDelete,
      });

      fireEvent.click(
        screen.getByRole('button', {
          name: 'Delete Candidate 1',
        })
      );

      expect(onDelete).toHaveBeenCalledWith(
        'candidate-1'
      );
    });

    it('passes the save callback to CandidateCard', () => {
      const onToggleSaveForJob = vi.fn();

      renderGrid({
        candidates: makeCandidates(1),
        selectedJobId: 'job-1',
        onToggleSaveForJob,
      });

      fireEvent.click(
        screen.getByRole('button', {
          name: 'Save Candidate 1',
        })
      );

      expect(
        onToggleSaveForJob
      ).toHaveBeenCalledWith(
        'candidate-1',
        'job-1'
      );
    });
  });

  describe('French language', () => {
    it('renders French empty state', () => {
      useLanguage.mockReturnValue({
        lang: 'FR',
      });

      renderGrid({
        candidates: [],
      });

      expect(
        screen.getByText(
          'Aucun candidat trouvé'
        )
      ).toBeInTheDocument();
    });

    it('renders French sorting labels', () => {
      useLanguage.mockReturnValue({
        lang: 'FR',
      });

      renderGrid({
        candidates: makeCandidates(3),
      });

      expect(
        screen.getByText('Score')
      ).toBeInTheDocument();

      expect(
        screen.getByRole('option', {
          name: 'Ordre par défaut',
        })
      ).toBeInTheDocument();

      expect(
        screen.getByRole('option', {
          name: 'Score : élevé → faible',
        })
      ).toBeInTheDocument();

      expect(
        screen.getByRole('option', {
          name: 'Score : faible → élevé',
        })
      ).toBeInTheDocument();
    });

    it('renders French selection text', async () => {
      useLanguage.mockReturnValue({
        lang: 'FR',
      });

      renderGrid({
        candidates: makeCandidates(2),
      });

      fireEvent.click(
        screen.getByRole('button', {
          name: 'Select Candidate 1',
        })
      );

      await waitFor(() => {
        expect(
          screen.getByText(
            'candidat sélectionné'
          )
        ).toBeInTheDocument();
      });
    });

    it('renders French plural selection text', async () => {
      useLanguage.mockReturnValue({
        lang: 'FR',
      });

      renderGrid({
        candidates: makeCandidates(3),
      });

      await selectCandidates(2);

      expect(
        screen.getByText(
          'candidats sélectionné'
        )
      ).toBeInTheDocument();
    });
  });

  describe('Shortlist state', () => {
    it('passes shortlisted state to the candidate card', () => {
      renderGrid({
        candidates: makeCandidates(2),
        shortlist: [
          {
            id: 'candidate-1',
          },
        ],
      });

      expect(
        screen.getByTestId(
          'candidate-card-candidate-1'
        )
      ).toBeInTheDocument();

      expect(
        screen.getByTestId(
          'candidate-card-candidate-2'
        )
      ).toBeInTheDocument();
    });

    it('passes saved-for-job state based on selected job', () => {
      renderGrid({
        candidates: makeCandidates(2),
        selectedJobId: 'job-1',
        savedRoleCandidates: {
          'job-1': ['candidate-1'],
        },
      });

      expect(
        screen.getByTestId(
          'candidate-card-candidate-1'
        )
      ).toBeInTheDocument();
    });
  });
});