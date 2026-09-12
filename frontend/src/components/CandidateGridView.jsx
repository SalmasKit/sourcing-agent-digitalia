/**
 * CandidateGridView
 *
 * Grid view for displaying candidate cards in a responsive grid layout.
 */

import React, { useState, useEffect } from 'react';
import {
  Trash2,
  BookmarkCheck,
  ArrowRightLeft,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import { CandidateCard } from './CandidateCard';
import { useConfirm } from '../context/ConfirmDialogContext';
import { useLanguage } from '../context/LanguageContext';

export default function CandidateGridView({
  candidates = [],
  shortlist = [],
  selectedJobId,
  savedRoleCandidates = {},
  onViewDetails,
  onEdit,
  onDelete,
  onToggleSaveForJob,
  onOpenComparator,
  onBulkDelete,
  onBulkToggleSaveForJob,
}) {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [page, setPage] = useState(0);

  const PAGE_SIZE = 6;

  const { confirm } = useConfirm();
  const { lang } = useLanguage();

  const isFrench = lang === 'FR';

  const text = {
    candidate: isFrench ? 'candidat' : 'candidate',
    candidates: isFrench ? 'candidats' : 'candidates',

    selected: isFrench ? 'sélectionné' : 'selected',
    selectedProfiles: isFrench
      ? 'Profils sélectionnés'
      : 'Selected Profiles',

    shortlist: isFrench
      ? 'Présélectionner'
      : 'Shortlist',

    compare: isFrench
      ? 'Comparer'
      : 'Compare',

    delete: isFrench
      ? 'Supprimer'
      : 'Delete',

    cancel: isFrench
      ? 'Annuler'
      : 'Cancel',

    deleteSelected: isFrench
      ? 'Supprimer la sélection'
      : 'Delete Selected',

    deleteTitle: isFrench
      ? 'Supprimer les profils sélectionnés ?'
      : 'Delete Candidate Profiles?',

    deleteMessage: isFrench
      ? 'Êtes-vous sûr de vouloir supprimer les profils candidats sélectionnés de votre espace de travail ?'
      : 'Are you sure you want to delete these selected candidate profiles from your workspace?',

    noCandidates: isFrench
      ? 'Aucun candidat trouvé'
      : 'No candidates found',

    previous: isFrench
      ? 'Précédent'
      : 'Previous',

    next: isFrench
      ? 'Suivant'
      : 'Next',
  };

  const handleToggleSelect = (candidateId) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);

      if (newSet.has(candidateId)) {
        newSet.delete(candidateId);
      } else {
        newSet.add(candidateId);
      }

      return newSet;
    });
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    const selectedCount = selectedIds.size;

    const confirmed = await confirm({
      title: isFrench
        ? `Supprimer ${selectedCount} profil${selectedCount > 1 ? 's' : ''} candidat${selectedCount > 1 ? 's' : ''} ?`
        : `Delete ${selectedCount} Candidate Profile${selectedCount > 1 ? 's' : ''}?`,

      message: isFrench
        ? `Êtes-vous sûr de vouloir supprimer ces ${selectedCount} profil${selectedCount > 1 ? 's' : ''} candidat${selectedCount > 1 ? 's' : ''} sélectionné${selectedCount > 1 ? 's' : ''} de votre espace de travail ?`
        : `Are you sure you want to delete these ${selectedCount} selected candidate profile${selectedCount > 1 ? 's' : ''} from your workspace?`,

      itemBadge: `${selectedCount} ${text.selectedProfiles}`,

      confirmText: text.deleteSelected,

      cancelText: text.cancel,

      type: 'danger',
    });

    if (!confirmed) return;

    const ids = Array.from(selectedIds);

    if (onBulkDelete) {
      await onBulkDelete(ids);
    } else if (onDelete) {
      for (const id of ids) {
        onDelete(id);
      }
    }

    setSelectedIds(new Set());
  };

  /*
   * Bulk shortlist should be additive: candidates already saved for the
   * selected job must stay saved. Toggling everything in the selection
   * would instead un-shortlist any already-saved candidate whenever the
   * selection contains a mix of saved and unsaved candidates.
   */
  const handleBulkShortlist = async () => {
    if (!selectedJobId) {
      return;
    }

    const alreadySaved =
      savedRoleCandidates[selectedJobId] || [];

    const idsToSave = Array.from(selectedIds).filter(
      (id) => !alreadySaved.includes(id)
    );

    if (idsToSave.length === 0) {
      setSelectedIds(new Set());
      return;
    }

    if (onBulkToggleSaveForJob) {
      await onBulkToggleSaveForJob(idsToSave, selectedJobId);
    } else if (onToggleSaveForJob) {
      for (const id of idsToSave) {
        onToggleSaveForJob(id, selectedJobId);
      }
    }

    setSelectedIds(new Set());
  };

  const handleBulkCompare = () => {
    const selectedCandidates = candidates.filter((candidate) =>
      selectedIds.has(candidate.id)
    );

    if (
      onOpenComparator &&
      selectedCandidates.length > 0
    ) {
      onOpenComparator(selectedCandidates);
    }
  };

  const selectedCount = selectedIds.size;

  /*
   * Pagination
   */
  const totalPages = Math.ceil(
    candidates.length / PAGE_SIZE
  );

  const paginatedCandidates = candidates.slice(
    page * PAGE_SIZE,
    page * PAGE_SIZE + PAGE_SIZE
  );

  /*
   * Reset to first page when candidate count changes.
   */
  useEffect(() => {
    setPage(0);
  }, [candidates.length]);

  /*
   * Make sure the current page remains valid if
   * candidates are removed.
   */
  useEffect(() => {
    if (totalPages > 0 && page >= totalPages) {
      setPage(totalPages - 1);
    }
  }, [page, totalPages]);

  return (
    <div>
      {/* =====================================================
          BULK ACTION BAR
          ===================================================== */}

      {selectedCount > 0 && (
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 100,
            marginBottom: 16,
            padding: '12px 20px',
            background: '#FFFFFF',
            border: '1px solid #E4E1D9',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow:
              '0 4px 12px rgba(18,21,27,0.06)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              color: '#12151B',
              fontFamily:
                "'Inter', system-ui, sans-serif",
            }}
          >
            <span
              style={{
                fontFamily:
                  "'JetBrains Mono', monospace",
                fontSize: 12,
                fontWeight: 700,
                background: '#E85D3D',
                color: '#FFFFFF',
                padding: '4px 10px',
                borderRadius: 6,
              }}
            >
              {selectedCount}
            </span>

            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {selectedCount === 1
                ? `${text.candidate} ${text.selected}`
                : `${text.candidates} ${text.selected}`}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {/* SHORTLIST */}
            <button
              type="button"
              onClick={handleBulkShortlist}
              disabled={!selectedJobId}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                border:
                  '1px solid #E4E1D9',
                borderRadius: 8,
                background: 'transparent',
                color: !selectedJobId
                  ? '#9B9C9E'
                  : '#12151B',
                fontSize: 12,
                fontWeight: 600,
                cursor: !selectedJobId
                  ? 'not-allowed'
                  : 'pointer',
                transition:
                  'all 0.15s ease',
                opacity: !selectedJobId
                  ? 0.6
                  : 1,
              }}
              onMouseEnter={(e) => {
                if (selectedJobId) {
                  e.currentTarget.style.background =
                    '#F7F5F1';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background =
                  'transparent';
              }}
            >
              <BookmarkCheck size={14} />
              {text.shortlist}
            </button>

            {/* COMPARE */}
            <button
              type="button"
              onClick={handleBulkCompare}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                border:
                  '1px solid #E4E1D9',
                borderRadius: 8,
                background: 'transparent',
                color: '#12151B',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition:
                  'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background =
                  '#F7F5F1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background =
                  'transparent';
              }}
            >
              <ArrowRightLeft size={14} />
              {text.compare}
            </button>

            {/* DELETE */}
            <button
              type="button"
              onClick={handleBulkDelete}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                border:
                  '1px solid #F3C9C4',
                borderRadius: 8,
                background: 'transparent',
                color: '#C1361F',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition:
                  'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background =
                  '#FBEAE9';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background =
                  'transparent';
              }}
            >
              <Trash2 size={14} />
              {text.delete}
            </button>

            {/* CLEAR SELECTION */}
            <button
              type="button"
              onClick={handleClearSelection}
              aria-label={
                isFrench
                  ? 'Effacer la sélection'
                  : 'Clear selection'
              }
              title={
                isFrench
                  ? 'Effacer la sélection'
                  : 'Clear selection'
              }
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                border:
                  '1px solid #E4E1D9',
                borderRadius: 8,
                background: 'transparent',
                color: '#9B9C9E',
                cursor: 'pointer',
                transition:
                  'all 0.15s ease',
                marginLeft: 8,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background =
                  '#F7F5F1';

                e.currentTarget.style.color =
                  '#12151B';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background =
                  'transparent';

                e.currentTarget.style.color =
                  '#9B9C9E';
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* =====================================================
          CANDIDATE GRID
          ===================================================== */}

      <div
        style={{
          padding: 20,
          display: 'grid',
          gridTemplateColumns:
            'repeat(2, 1fr)',
          gap: 16,
          minHeight:
            paginatedCandidates.length > 0
              ? 'auto'
              : '200px',
        }}
      >
        {paginatedCandidates.length > 0 ? (
          paginatedCandidates.map(
            (candidate, idx) => (
              <CandidateCard
                key={candidate.id}
                index={
                  page * PAGE_SIZE + idx
                }
                candidate={candidate}
                selected={selectedIds.has(
                  candidate.id
                )}
                onToggleSelect={
                  handleToggleSelect
                }
                onViewDetails={(
                  candidate,
                  event
                ) =>
                  onViewDetails(
                    candidate,
                    event
                  )
                }
                onEdit={onEdit}
                onDelete={onDelete}
                isShortlisted={shortlist.some(
                  (c) =>
                    c.id === candidate.id
                )}
                selectedJobId={
                  selectedJobId
                }
                isSavedForJob={
                  selectedJobId
                    ? (
                      savedRoleCandidates[
                      selectedJobId
                      ] || []
                    ).includes(
                      candidate.id
                    )
                    : false
                }
                onSaveForJob={(id) =>
                  onToggleSaveForJob(
                    id,
                    selectedJobId
                  )
                }
              />
            )
          )
        ) : (
          <div
            style={{
              gridColumn: '1 / -1',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px',
              color: '#9B9C9E',
              fontSize: 13,
            }}
          >
            <div
              style={{
                fontSize: 24,
                marginBottom: 12,
              }}
            >
              {text.noCandidates}
            </div>
          </div>
        )}
      </div>

      {/* =====================================================
          PAGINATION
          ===================================================== */}

      {totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            padding: '20px',
            marginTop: 10,
          }}
        >
          {/* PREVIOUS */}
          <button
            type="button"
            onClick={() =>
              setPage((p) =>
                Math.max(0, p - 1)
              )
            }
            disabled={page === 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 12px',
              border:
                '1px solid #E4E1D9',
              borderRadius: 8,
              background:
                page === 0
                  ? '#F7F5F1'
                  : '#FFFFFF',
              color:
                page === 0
                  ? '#9B9C9E'
                  : '#12151B',
              fontSize: 12,
              fontWeight: 600,
              cursor:
                page === 0
                  ? 'not-allowed'
                  : 'pointer',
              transition:
                'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (page !== 0) {
                e.currentTarget.style.background =
                  '#F7F5F1';

                e.currentTarget.style.borderColor =
                  '#D8D4CA';
              }
            }}
            onMouseLeave={(e) => {
              if (page !== 0) {
                e.currentTarget.style.background =
                  '#FFFFFF';

                e.currentTarget.style.borderColor =
                  '#E4E1D9';
              }
            }}
          >
            <ChevronLeft size={14} />
            {text.previous}
          </button>

          {/* PAGE NUMBERS */}
          <div
            style={{
              display: 'flex',
              gap: 6,
            }}
          >
            {Array.from(
              { length: totalPages },
              (_, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() =>
                    setPage(i)
                  }
                  aria-label={
                    isFrench
                      ? `Page ${i + 1}`
                      : `Page ${i + 1}`
                  }
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 32,
                    height: 32,
                    border:
                      page === i
                        ? '1px solid #0E7C8C'
                        : '1px solid #E4E1D9',
                    borderRadius: 8,
                    background:
                      page === i
                        ? '#0E7C8C'
                        : '#FFFFFF',
                    color:
                      page === i
                        ? '#FFFFFF'
                        : '#12151B',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition:
                      'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (page !== i) {
                      e.currentTarget.style.background =
                        '#F7F5F1';

                      e.currentTarget.style.borderColor =
                        '#D8D4CA';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (page !== i) {
                      e.currentTarget.style.background =
                        '#FFFFFF';

                      e.currentTarget.style.borderColor =
                        '#E4E1D9';
                    }
                  }}
                >
                  {i + 1}
                </button>
              )
            )}
          </div>

          {/* NEXT */}
          <button
            type="button"
            onClick={() =>
              setPage((p) =>
                Math.min(
                  totalPages - 1,
                  p + 1
                )
              )
            }
            disabled={
              page >= totalPages - 1
            }
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 12px',
              border:
                '1px solid #E4E1D9',
              borderRadius: 8,
              background:
                page >= totalPages - 1
                  ? '#F7F5F1'
                  : '#FFFFFF',
              color:
                page >= totalPages - 1
                  ? '#9B9C9E'
                  : '#12151B',
              fontSize: 12,
              fontWeight: 600,
              cursor:
                page >= totalPages - 1
                  ? 'not-allowed'
                  : 'pointer',
              transition:
                'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (
                page <
                totalPages - 1
              ) {
                e.currentTarget.style.background =
                  '#F7F5F1';

                e.currentTarget.style.borderColor =
                  '#D8D4CA';
              }
            }}
            onMouseLeave={(e) => {
              if (
                page <
                totalPages - 1
              ) {
                e.currentTarget.style.background =
                  '#FFFFFF';

                e.currentTarget.style.borderColor =
                  '#E4E1D9';
              }
            }}
          >
            {text.next}
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}