/**
 * CandidateGridView
 *
 * Grid view for displaying candidate cards in a responsive grid layout.
 */

import React, { useState, useEffect } from 'react';
import { Trash2, BookmarkCheck, ArrowRightLeft, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { CandidateCard } from './CandidateCard';

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
}) {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 6;

  const handleToggleSelect = (candidateId) => {
    setSelectedIds(prev => {
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

  const handleBulkDelete = () => {
    selectedIds.forEach(id => onDelete(id));
    setSelectedIds(new Set());
  };

  const handleBulkShortlist = () => {
    selectedIds.forEach(id => onToggleSaveForJob(id, selectedJobId));
    setSelectedIds(new Set());
  };

  const handleBulkCompare = () => {
    const selectedCandidates = candidates.filter(c => selectedIds.has(c.id));
    if (onOpenComparator && selectedCandidates.length > 0) {
      onOpenComparator(selectedCandidates);
    }
  };

  const selectedCount = selectedIds.size;

  // Pagination logic
  const totalPages = Math.ceil(candidates.length / PAGE_SIZE);
  const paginatedCandidates = candidates.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  // Reset to page 0 when candidates change
  useEffect(() => {
    setPage(0);
  }, [candidates.length]);

  return (
    <div>
      {/* Bulk Action Bar */}
      {selectedCount > 0 && (
        <div style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          marginBottom: 16,
          padding: '12px 20px',
          background: '#12151B',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 4px 12px rgba(18,21,27,0.15)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            color: '#fff',
            fontFamily: "'Inter', system-ui, sans-serif",
          }}>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              fontWeight: 700,
              background: '#E85D3D',
              padding: '4px 10px',
              borderRadius: 6,
            }}>
              {selectedCount}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              {selectedCount === 1 ? 'candidate selected' : 'candidates selected'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={handleBulkShortlist}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                border: '1px solid #2A2E37',
                borderRadius: 8,
                background: 'transparent',
                color: '#fff',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#2A2E37';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
              }}
            >
              <BookmarkCheck size={14} />
              Shortlist
            </button>

            <button
              onClick={handleBulkCompare}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                border: '1px solid #2A2E37',
                borderRadius: 8,
                background: 'transparent',
                color: '#fff',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#2A2E37';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
              }}
            >
              <ArrowRightLeft size={14} />
              Compare
            </button>

            <button
              onClick={handleBulkDelete}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                border: '1px solid #C1361F',
                borderRadius: 8,
                background: 'transparent',
                color: '#E85D3D',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#C1361F';
                e.target.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
                e.target.style.color = '#E85D3D';
              }}
            >
              <Trash2 size={14} />
              Delete
            </button>

            <button
              onClick={handleClearSelection}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                border: '1px solid #2A2E37',
                borderRadius: 8,
                background: 'transparent',
                color: '#9B9C9E',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                marginLeft: 8,
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#2A2E37';
                e.target.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
                e.target.style.color = '#9B9C9E';
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <div style={{ 
        padding: 20, 
        display: 'grid', 
        gridTemplateColumns: 'repeat(2, 1fr)', 
        gap: 16,
        minHeight: paginatedCandidates.length > 0 ? 'auto' : '200px'
      }}>
        {paginatedCandidates.length > 0 ? (
          paginatedCandidates.map((candidate, idx) => (
            <CandidateCard
              key={candidate.id}
              index={idx}
              candidate={candidate}
              selected={selectedIds.has(candidate.id)}
              onToggleSelect={handleToggleSelect}
              onViewDetails={(candidate, event) => onViewDetails(candidate, event)}
              onEdit={onEdit}
              onDelete={onDelete}
              isShortlisted={shortlist.some(c => c.id === candidate.id)}
              selectedJobId={selectedJobId}
              isSavedForJob={selectedJobId ? (savedRoleCandidates[selectedJobId] || []).includes(candidate.id) : false}
              onSaveForJob={id => onToggleSaveForJob(id, selectedJobId)}
            />
          ))
        ) : (
          <div style={{
            gridColumn: '1 / -1',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px',
            color: '#9B9C9E',
            fontSize: '13px',
          }}>
            <div style={{
              fontSize: '24px',
              marginBottom: '12px',
            }}>
              No candidates found
            </div>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          padding: '20px',
          marginTop: '10px',
        }}>
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 12px',
              border: '1px solid #E4E1D9',
              borderRadius: 8,
              background: page === 0 ? '#F7F5F1' : '#FFFFFF',
              color: page === 0 ? '#9B9C9E' : '#12151B',
              fontSize: 12,
              fontWeight: 600,
              cursor: page === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (page !== 0) {
                e.target.style.background = '#F7F5F1';
                e.target.style.borderColor = '#D8D4CA';
              }
            }}
            onMouseLeave={(e) => {
              if (page !== 0) {
                e.target.style.background = '#FFFFFF';
                e.target.style.borderColor = '#E4E1D9';
              }
            }}
          >
            <ChevronLeft size={14} />
            Previous
          </button>

          <div style={{
            display: 'flex',
            gap: 6,
          }}>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 32,
                  height: 32,
                  border: page === i ? '1px solid #0E7C8C' : '1px solid #E4E1D9',
                  borderRadius: 8,
                  background: page === i ? '#0E7C8C' : '#FFFFFF',
                  color: page === i ? '#FFFFFF' : '#12151B',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (page !== i) {
                    e.target.style.background = '#F7F5F1';
                    e.target.style.borderColor = '#D8D4CA';
                  }
                }}
                onMouseLeave={(e) => {
                  if (page !== i) {
                    e.target.style.background = '#FFFFFF';
                    e.target.style.borderColor = '#E4E1D9';
                  }
                }}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 12px',
              border: '1px solid #E4E1D9',
              borderRadius: 8,
              background: page >= totalPages - 1 ? '#F7F5F1' : '#FFFFFF',
              color: page >= totalPages - 1 ? '#9B9C9E' : '#12151B',
              fontSize: 12,
              fontWeight: 600,
              cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (page < totalPages - 1) {
                e.target.style.background = '#F7F5F1';
                e.target.style.borderColor = '#D8D4CA';
              }
            }}
            onMouseLeave={(e) => {
              if (page < totalPages - 1) {
                e.target.style.background = '#FFFFFF';
                e.target.style.borderColor = '#E4E1D9';
              }
            }}
          >
            Next
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
