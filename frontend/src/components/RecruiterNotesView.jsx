/**
 * RecruiterNotesView
 *
 * Redesigned as a dense recruiter workspace:
 * - Candidate lanes instead of large stacked cards
 * - Latest note gets visual priority
 * - Compact note timeline for additional notes
 * - Persistent filter / search controls
 * - Optimized for large note collections
 * - Matches the CandidateGridView visual language
 * - Header typography matches KanbanPipeline header exactly
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  NotebookPen,
  Trash2,
  Clock,
  ChevronRight,
  ChevronLeft,
  Search,
  X,
  Briefcase,
  FileText,
  Filter,
  RotateCcw,
  ArrowUpRight,
  Layers3,
  Sparkles,
  Plus,
} from 'lucide-react';

import { getAvatarUrl as getAvatarUrlUtil } from '../utils/avatar';
import { useLanguage } from '../context/LanguageContext';

function getAvatarUrl(name, avatarUrl) {
  return getAvatarUrlUtil(name, avatarUrl);
}

export function formatNoteTimestamp(n, isFR = false) {
  if (!n) return '';

  const dateObj = n.createdAt
    ? new Date(n.createdAt)
    : typeof n.id === 'number' && n.id > 1600000000000
      ? new Date(n.id)
      : null;

  if (dateObj && !Number.isNaN(dateObj.getTime())) {
    const day = dateObj.toLocaleDateString(isFR ? 'fr-FR' : 'en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const time = dateObj.toLocaleTimeString(isFR ? 'fr-FR' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return isFR ? `${day} à ${time}` : `${day} at ${time}`;
  }

  return n.time || '';
}

export function RecruiterNotesView({
  candidates = [],
  jobDescriptions = [],
  savedRoleCandidates = {},
  jobResultsCache = {},
  onViewCandidate = () => { },
  onDeleteNote = () => { },
  onAddNote = () => { },
}) {
  const { lang } = useLanguage();

  const [selectedJobId, setSelectedJobId] = useState('all');
  const [filterText, setFilterText] = useState('');
  const [page, setPage] = useState(0);
  const [addingNoteCandidateId, setAddingNoteCandidateId] = useState(null);
  const [newNoteText, setNewNoteText] = useState('');

  const PAGE_SIZE = 6;
  const NOTES_SCROLL_AFTER = 2;

  const fontsLoaded = useRef(false);

  const handleCompleteNote = (candidateId) => {
    if (newNoteText.trim()) {
      onAddNote(candidateId, newNoteText.trim());
      setNewNoteText('');
      setAddingNoteCandidateId(null);
    }
  };

  useEffect(() => {
    if (fontsLoaded.current) return;

    fontsLoaded.current = true;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap';

    document.head.appendChild(link);
  }, []);

  const isFR = lang === 'FR';
  const cleanFilter = filterText.trim().toLowerCase();

  /*
   * ============================================================
   * DATA
   * ============================================================
   */

  const candidatesWithNotes = useMemo(
    () => candidates.filter(c => c.notes && c.notes.length > 0),
    [candidates]
  );

  const totalNotes = useMemo(
    () =>
      candidatesWithNotes.reduce(
        (sum, candidate) => sum + candidate.notes.length,
        0
      ),
    [candidatesWithNotes]
  );

  const normalizeId = value => {
    if (value === null || value === undefined) return '';
    return String(value).trim();
  };

  const getCandidateIds = candidate => {
    const ids = [
      candidate.id,
      candidate.candidateId,
      candidate.profileId,
      candidate.linkedinId,
    ]
      .map(normalizeId)
      .filter(Boolean);

    return new Set(ids);
  };

  const isCandidateInJob = (candidate, jobId) => {
    if (jobId === 'all') return true;

    const normalizedJobId = normalizeId(jobId);
    const candidateIds = getCandidateIds(candidate);

    // 1) Candidate explicitly saved to this role.
    const savedIds =
      savedRoleCandidates[jobId] ||
      savedRoleCandidates[normalizedJobId] ||
      [];

    if (
      savedIds.some(savedId =>
        candidateIds.has(normalizeId(savedId))
      )
    ) {
      return true;
    }

    // 2) Candidate exists in this role's cached sourcing results.
    const cachedList =
      jobResultsCache[jobId] ||
      jobResultsCache[normalizedJobId] ||
      [];

    if (
      cachedList.some(cachedCandidate => {
        const cachedIds = getCandidateIds(cachedCandidate);

        return [...cachedIds].some(id =>
          candidateIds.has(id)
        );
      })
    ) {
      return true;
    }

    // 3) Candidate object explicitly carries this job/role id.
    const directJobIds = [
      candidate.jobId,
      candidate.savedJobId,
      candidate.roleId,
      candidate.savedRoleId,
      candidate.jobDescriptionId,
      candidate.sourceJobId,
    ]
      .map(normalizeId)
      .filter(Boolean);

    if (directJobIds.includes(normalizedJobId)) {
      return true;
    }

    // 4) Support candidates associated with several roles.
    const multiJobIds = [
      ...(Array.isArray(candidate.jobIds)
        ? candidate.jobIds
        : []),
      ...(Array.isArray(candidate.roleIds)
        ? candidate.roleIds
        : []),
      ...(Array.isArray(candidate.savedJobIds)
        ? candidate.savedJobIds
        : []),
      ...(Array.isArray(candidate.savedRoleIds)
        ? candidate.savedRoleIds
        : []),
    ]
      .map(normalizeId)
      .filter(Boolean);

    return multiJobIds.includes(normalizedJobId);
  };

  const filteredCandidates = useMemo(() => {
    return candidatesWithNotes
      .filter(candidate =>
        isCandidateInJob(candidate, selectedJobId)
      )
      .map(candidate => {
        const candidateName = (
          candidate.fullName ||
          candidate.name ||
          ''
        ).toLowerCase();

        const candidateRole = (
          candidate.headline ||
          candidate.current_role ||
          candidate.currentRole ||
          ''
        ).toLowerCase();

        const candidateMatchesSearch =
          Boolean(cleanFilter) &&
          (
            candidateName.includes(cleanFilter) ||
            candidateRole.includes(cleanFilter)
          );

        // If the search matches the candidate's name/role,
        // keep all their notes.
        //
        // Otherwise, only show notes whose text matches
        // the search.
        const matchingNotes =
          !cleanFilter || candidateMatchesSearch
            ? candidate.notes
            : candidate.notes.filter(note =>
              (note.text || '')
                .toLowerCase()
                .includes(cleanFilter)
            );

        const sortedNotes = matchingNotes
          .map((note, idx) => ({ note, idx })) // idx = original chronological position
          .sort((a, b) => {
            const aTime = a.note.createdAt ? new Date(a.note.createdAt).getTime() : Number.NaN;
            const bTime = b.note.createdAt ? new Date(b.note.createdAt).getTime() : Number.NaN;

            if (!Number.isNaN(aTime) && !Number.isNaN(bTime)) {
              return bTime - aTime; // newest createdAt first
            }

            // Fallback when createdAt is missing: rely on insertion order (newest = highest idx)
            return b.idx - a.idx;
          })
          .map(x => x.note);

        return {
          ...candidate,
          displayNotes: sortedNotes,
        };
      })
      .filter(candidate => candidate.displayNotes.length > 0);
  }, [
    candidatesWithNotes,
    selectedJobId,
    cleanFilter,
    savedRoleCandidates,
    jobResultsCache,
  ]);

  const totalFilteredNotes = useMemo(
    () =>
      filteredCandidates.reduce(
        (sum, candidate) =>
          sum + candidate.displayNotes.length,
        0
      ),
    [filteredCandidates]
  );

  const totalPages = Math.ceil(
    filteredCandidates.length / PAGE_SIZE
  );

  const paginatedCandidates = filteredCandidates.slice(
    page * PAGE_SIZE,
    page * PAGE_SIZE + PAGE_SIZE
  );

  useEffect(() => {
    setPage(0);
  }, [selectedJobId, cleanFilter]);

  const hasActiveFilters =
    selectedJobId !== 'all' || Boolean(filterText);

  /*
   * ============================================================
   * HELPERS
   * ============================================================
   */

  const resetFilters = () => {
    setSelectedJobId('all');
    setFilterText('');
  };

  const getInitials = name =>
    (name || '?')
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="rn-root">
      <style>{`

        /* ======================================================
           DESIGN TOKENS
        ====================================================== */

        .rn-root {
          --rn-paper: #F7F5F1;
          --rn-surface: #FFFFFF;
          --rn-sunken: #F1F1EC;

          --rn-border: #E4E1D9;
          --rn-border-strong: #D8D4CA;

          --rn-ink-900: #12151B;
          --rn-ink-800: #1E232C;
          --rn-ink-700: #38414F;
          --rn-ink-500: #63666E;
          --rn-ink-400: #9B9C9E;

          --rn-cyan: #0E7C8C;
          --rn-cyan-dark: #0A5C68;
          --rn-cyan-soft: #E1F2F3;

          --rn-slate: #8A8F98;
          --rn-slate-soft: #F1F1F2;

          --rn-danger: #C1361F;
          --rn-danger-soft: #FCEBE6;

          --rn-font-display:
            'Space Grotesk',
            'Inter',
            sans-serif;

          --rn-font-body:
            'Inter',
            system-ui,
            sans-serif;

          --rn-font-mono:
            'JetBrains Mono',
            ui-monospace,
            monospace;

          font-family: var(--rn-font-body);
          color: var(--rn-ink-900);
        }

        .rn-root *,
        .rn-root *::before,
        .rn-root *::after {
          box-sizing: border-box;
        }

        .rn-display {
          font-family: var(--rn-font-display);
          letter-spacing: -0.015em;
        }

        .rn-mono {
          font-family: var(--rn-font-mono);
        }

        /* ======================================================
           HEADER
           (aligned to KanbanPipeline .kb-header / .kb-header-title)
        ====================================================== */

        .rn-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 32px;
          padding-bottom: 20px;
          margin-bottom: 4px;
          border-bottom: 1px solid var(--rn-border);
          flex-wrap: wrap;
        }

        .rn-header-left {
          min-width: 0;
        }

        .rn-title {
          margin: 0;
          font-family: var(--rn-font-display);
          font-size: 26px;
          letter-spacing: -.03em;
          color: var(--rn-ink-900);
        }

        .rn-subtitle {
          max-width: 620px;
          margin: 7px 0 0;
          color: var(--rn-ink-500);
          font-size: 13px;
          line-height: 1.6;
        }

        .rn-header-stats {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .rn-stat {
          min-width: 72px;
          padding: 8px 11px;
          border: 1px solid var(--rn-border);
          background: var(--rn-paper);
          border-radius: 10px;
          text-align: center;
        }

        .rn-stat-value {
          font-family: var(--rn-font-display);
          font-size: 17px;
          font-weight: 700;
          line-height: 1.1;
          color: var(--rn-ink-900);
        }

        .rn-stat-label {
          margin-top: 3px;
          color: var(--rn-ink-400);
          font-size: 8px;
          font-weight: 700;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        /* ======================================================
           FILTER BAR
        ====================================================== */

        .rn-toolbar {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 0 14px;
        }

        .rn-search {
          position: relative;
          flex: 1;
          min-width: 180px;
        }

        .rn-search-icon {
          position: absolute;
          left: 11px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--rn-ink-400);
          pointer-events: none;
        }

        .rn-search-input {
          width: 100%;
          height: 36px;
          padding: 0 34px 0 34px;
          border: 1px solid var(--rn-border);
          border-radius: 9px;
          background: var(--rn-surface);
          color: var(--rn-ink-900);
          outline: none;
          font-family: var(--rn-font-body);
          font-size: 11px;
          transition:
            border-color .18s ease,
            box-shadow .18s ease,
            background .18s ease;
        }

        .rn-search-input::placeholder {
          color: var(--rn-ink-400);
        }

        .rn-search-input:focus {
          border-color: rgba(14, 124, 140, .42);
          box-shadow: 0 0 0 3px rgba(14, 124, 140, .08);
        }

        .rn-search-clear {
          position: absolute;
          right: 8px;
          top: 50%;
          width: 23px;
          height: 23px;
          transform: translateY(-50%);
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          border-radius: 6px;
          background: transparent;
          color: var(--rn-ink-400);
          cursor: pointer;
        }

        .rn-search-clear:hover {
          background: var(--rn-slate-soft);
          color: var(--rn-ink-700);
        }

        .rn-job-select-wrap {
          position: relative;
          flex-shrink: 0;
        }

        .rn-job-icon {
          position: absolute;
          left: 10px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--rn-cyan);
          pointer-events: none;
        }

        .rn-job-select {
          height: 36px;
          min-width: 205px;
          padding: 0 30px 0 31px;
          border: 1px solid var(--rn-border);
          border-radius: 9px;
          background: var(--rn-surface);
          color: var(--rn-ink-700);
          outline: none;
          font-family: var(--rn-font-body);
          font-size: 10.5px;
          font-weight: 600;
          cursor: pointer;
        }

        .rn-reset-btn {
          height: 36px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 0 10px;
          border: 1px solid var(--rn-border);
          border-radius: 9px;
          background: var(--rn-surface);
          color: var(--rn-ink-500);
          font-size: 10px;
          font-weight: 700;
          cursor: pointer;
          transition:
            background .18s ease,
            color .18s ease,
            border-color .18s ease;
        }

        .rn-reset-btn:hover {
          background: var(--rn-paper);
          border-color: var(--rn-border-strong);
          color: var(--rn-ink-800);
        }

        .rn-filter-status {
          display: flex;
          align-items: center;
          gap: 6px;
          padding-left: 4px;
          color: var(--rn-ink-400);
          font-size: 9px;
          white-space: nowrap;
        }

        .rn-filter-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--rn-cyan);
          box-shadow: 0 0 0 3px var(--rn-cyan-soft);
        }

        /* ======================================================
           EMPTY STATE
        ====================================================== */

        .rn-empty {
          padding: 52px 24px;
          border: 1px dashed var(--rn-border-strong);
          border-radius: 16px;
          background:
            radial-gradient(
              circle at 50% 0%,
              rgba(14, 124, 140, .06),
              transparent 42%
            ),
            var(--rn-surface);
          text-align: center;
        }

        .rn-empty-icon {
          width: 44px;
          height: 44px;
          margin: 0 auto 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          background: var(--rn-cyan-soft);
          color: var(--rn-cyan-dark);
        }

        .rn-empty-title {
          margin: 0;
          font-family: var(--rn-font-display);
          font-size: 15px;
          font-weight: 700;
          color: var(--rn-ink-800);
        }

        .rn-empty-text {
          max-width: 390px;
          margin: 7px auto 0;
          color: var(--rn-ink-500);
          font-size: 11px;
          line-height: 1.6;
        }

        /* ======================================================
           CARD GRID
        ====================================================== */

        .rn-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        /* ======================================================
           CANDIDATE CARD
        ====================================================== */

        .rn-candidate {
          position: relative;
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
          background:
            linear-gradient(
              180deg,
              #FFFFFF 0%,
              #FCFCFA 100%
            );
          border: 1px solid var(--rn-border);
          border-radius: 16px;
          box-shadow:
            0 2px 5px rgba(18, 21, 27, .025),
            0 8px 22px rgba(18, 21, 27, .025);
          transition:
            transform .2s ease,
            border-color .2s ease,
            box-shadow .2s ease;
        }

        .rn-candidate::before {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          top: 0;
          height: 2px;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(14, 124, 140, .35) 50%,
            transparent 100%
          );
          opacity: 0;
          transition: opacity .2s ease;
        }

        .rn-candidate:hover {
          transform: translateY(-3px);
          border-color: #CFE6EA;
          box-shadow:
            0 10px 28px rgba(18, 21, 27, .07),
            0 2px 6px rgba(14, 124, 140, .04);
        }

        .rn-candidate:hover::before {
          opacity: 1;
        }

        .rn-candidate-expanded {
          border-color: rgba(14, 124, 140, .30);
          box-shadow:
            0 10px 28px rgba(14, 124, 140, .08),
            0 2px 6px rgba(18, 21, 27, .04);
        }

        .rn-candidate-expanded::before {
          opacity: 1;
        }

        /* ======================================================
           CANDIDATE HEADER
        ====================================================== */

        .rn-candidate-head {
          position: relative;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          background:
            linear-gradient(
              135deg,
              rgba(225, 242, 243, .30),
              rgba(255, 255, 255, .92) 55%
            );
          border-bottom: 1px solid var(--rn-border);
        }

        .rn-avatar {
          width: 42px;
          height: 42px;
          flex-shrink: 0;
          object-fit: cover;
          border-radius: 12px;
          border: 2px solid #FFFFFF;
          box-shadow:
            0 0 0 1px rgba(14, 124, 140, .20),
            0 4px 10px rgba(18, 21, 27, .08);
          transition:
            transform .2s ease,
            box-shadow .2s ease;
        }

        .rn-candidate:hover .rn-avatar {
          transform: translateY(-1px);
          box-shadow:
            0 0 0 1px rgba(14, 124, 140, .35),
            0 6px 13px rgba(18, 21, 27, .11);
        }

        .rn-avatar-fallback {
          width: 42px;
          height: 42px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          background: var(--rn-ink-900);
          color: #FFFFFF;
          font-family: var(--rn-font-display);
          font-size: 12px;
          font-weight: 800;
          box-shadow:
            0 0 0 1px rgba(14, 124, 140, .22),
            0 4px 10px rgba(18, 21, 27, .08);
        }

        .rn-candidate-copy {
          min-width: 0;
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 3px;
        }

        .rn-candidate-name {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-family: var(--rn-font-display);
          font-size: 14px;
          font-weight: 700;
          line-height: 1.2;
          letter-spacing: -.015em;
          color: var(--rn-ink-900);
        }

        .rn-candidate-role {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: var(--rn-ink-500);
          font-size: 10.5px;
          font-weight: 500;
          line-height: 1.35;
        }

        /*
         * IMPORTANT:
         * No note-count badge here.
         * The total note count is intentionally shown only
         * once in the footer below.
         */

        .rn-candidate-head-meta {
          display: flex;
          align-items: center;
          gap: 5px;
          flex-shrink: 0;
        }

        .rn-match-count {
          display: inline-flex;
          align-items: center;
          padding: 4px 7px;
          border-radius: 6px;
          background: var(--rn-sunken);
          color: var(--rn-ink-500);
          font-family: var(--rn-font-mono);
          font-size: 8.5px;
          font-weight: 600;
        }

        /* ======================================================
           NOTES
        ====================================================== */

        .rn-notes {
          display: flex;
          flex: 1;
          min-height: 0;
          flex-direction: column;
        }

        .rn-notes-list {
          display: flex;
          flex-direction: column;
        }

        .rn-notes-list-scrollable {
          max-height: 132px;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: #D8D4CA transparent;
        }

        .rn-notes-list-scrollable::-webkit-scrollbar {
          width: 5px;
        }

        .rn-notes-list-scrollable::-webkit-scrollbar-track {
          background: transparent;
        }

        .rn-notes-list-scrollable::-webkit-scrollbar-thumb {
          background: #D8D4CA;
          border-radius: 999px;
        }

        .rn-note-item {
          position: relative;
          display: flex;
          gap: 10px;
          padding: 11px 16px;
          border-bottom: 1px solid var(--rn-border);
          transition:
            background .18s ease,
            padding-left .18s ease;
        }

        .rn-note-item:last-child {
          border-bottom: none;
        }

        .rn-note-item:hover {
          background: #FAFAF7;
          padding-left: 18px;
        }

        .rn-note-item-latest {
          background:
            linear-gradient(
              90deg,
              rgba(225, 242, 243, .52),
              rgba(255, 255, 255, 0)
            );
        }

        .rn-note-item-latest:hover {
          background:
            linear-gradient(
              90deg,
              rgba(225, 242, 243, .70),
              rgba(255, 255, 255, 0)
            );
        }

        .rn-note-item-spine {
          width: 3px;
          min-height: 100%;
          flex-shrink: 0;
          border-radius: 999px;
          background: var(--rn-border);
          transition:
            width .18s ease,
            background .18s ease,
            box-shadow .18s ease;
        }

        .rn-note-item-latest .rn-note-item-spine {
          width: 4px;
          background: var(--rn-cyan);
          box-shadow: 0 0 8px rgba(14, 124, 140, .18);
        }

        .rn-note-item-body {
          flex: 1;
          min-width: 0;
        }

        .rn-note-item-head {
          display: flex;
          align-items: center;
          gap: 8px;
          min-height: 22px;
          margin-bottom: 4px;
        }

        .rn-note-item-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: var(--rn-cyan-dark);
          font-size: 8.5px;
          font-weight: 800;
          letter-spacing: .06em;
          text-transform: uppercase;
        }

        .rn-note-item-time {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: var(--rn-ink-400);
          font-family: var(--rn-font-mono);
          font-size: 8.5px;
        }

        .rn-note-item-delete {
          width: 24px;
          height: 24px;
          margin-left: auto;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          border-radius: 7px;
          background: transparent;
          color: var(--rn-ink-400);
          cursor: pointer;
          opacity: .25;
          transition:
            opacity .15s ease,
            background .15s ease,
            color .15s ease,
            transform .15s ease;
        }

        .rn-note-item:hover .rn-note-item-delete {
          opacity: 1;
        }

        .rn-note-item-delete:hover {
          color: var(--rn-danger);
          background: var(--rn-danger-soft);
          transform: scale(1.04);
        }

        .rn-note-item-text {
          min-width: 0;
          color: var(--rn-ink-700);
          font-size: 11.5px;
          line-height: 1.6;
          word-break: break-word;
        }

        .rn-note-item-latest .rn-note-item-text {
          color: var(--rn-ink-800);
          font-weight: 500;
        }

        /* ======================================================
           FOOTER
        ====================================================== */

        .rn-notes-footer {
          margin-top: auto;
          flex-shrink: 0;
          padding: 10px 16px;
          border-top: 1px solid var(--rn-border);
          background: rgba(247, 245, 241, .48);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        /*
         * SINGLE SOURCE FOR NOTE COUNT
         */

        .rn-note-index {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: var(--rn-ink-400);
          font-family: var(--rn-font-mono);
          font-size: 8.5px;
          font-weight: 500;
          letter-spacing: -.01em;
        }

        .rn-note-index::before {
          content: "";
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--rn-cyan);
          box-shadow: 0 0 0 3px var(--rn-cyan-soft);
        }

        .rn-profile-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 7px 10px;
          border: 1px solid rgba(14, 124, 140, .16);
          border-radius: 8px;
          background: var(--rn-cyan-soft);
          color: var(--rn-cyan-dark);
          font-size: 9.5px;
          font-weight: 700;
          cursor: pointer;
          transition:
            background .18s ease,
            border-color .18s ease,
            transform .18s ease,
            box-shadow .18s ease;
        }

        .rn-profile-btn svg {
          transition: transform .18s ease;
        }

        .rn-profile-btn:hover {
          background: #D9F1F6;
          border-color: rgba(14, 124, 140, .28);
          transform: translateY(-1px);
          box-shadow: 0 4px 10px rgba(14, 124, 140, .10);
        }

        .rn-profile-btn:hover svg {
          transform: translate(1px, -1px);
        }

        .rn-footer-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .rn-add-inline-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          height: 30px;
          padding: 0 10px;
          border: 1px solid rgba(14, 124, 140, .24);
          border-radius: 7px;
          background: var(--rn-cyan-soft);
          color: var(--rn-cyan-dark);
          font-size: 9.5px;
          font-weight: 700;
          cursor: pointer;
          transition:
            background .18s ease,
            border-color .18s ease,
            transform .18s ease;
        }

        .rn-add-inline-btn:hover {
          background: #D9F1F6;
          border-color: rgba(14, 124, 140, .36);
          transform: translateY(-1px);
        }

        .rn-new-note-textarea {
          width: 100%;
          padding: 8px;
          border: 1px solid var(--rn-border);
          border-radius: 6px;
          background: var(--rn-paper);
          color: var(--rn-ink-800);
          font-family: var(--rn-font-body);
          font-size: 11.5px;
          line-height: 1.6;
          resize: vertical;
          min-height: 60px;
        }

        .rn-new-note-textarea:focus {
          outline: none;
          border-color: rgba(14, 124, 140, .42);
          box-shadow: 0 0 0 3px rgba(14, 124, 140, .08);
        }

        .rn-new-note-actions {
          display: flex;
          justify-content: flex-end;
          margin-top: 8px;
        }

        .rn-new-note-done {
          height: 28px;
          padding: 0 12px;
          border: none;
          border-radius: 6px;
          background: var(--rn-cyan);
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          cursor: pointer;
          transition:
            background .18s ease,
            transform .18s ease;
        }

        .rn-new-note-done:hover:not(:disabled) {
          background: var(--rn-cyan-dark);
          transform: translateY(-1px);
        }

        .rn-new-note-done:disabled {
          background: var(--rn-border-strong);
          color: var(--rn-ink-400);
          cursor: not-allowed;
        }

        /* ======================================================
           PAGINATION
        ====================================================== */

        .rn-pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 20px 0 8px;
        }

        .rn-pagination-button {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          height: 34px;
          padding: 0 12px;
          border: 1px solid var(--rn-border);
          border-radius: 8px;
          background: var(--rn-surface);
          color: var(--rn-ink-800);
          font-size: 10px;
          font-weight: 600;
          cursor: pointer;
          transition:
            background .15s ease,
            border-color .15s ease,
            transform .15s ease;
        }

        .rn-pagination-button:hover:not(:disabled) {
          background: var(--rn-paper);
          border-color: var(--rn-border-strong);
          transform: translateY(-1px);
        }

        .rn-pagination-button:disabled {
          background: var(--rn-paper);
          color: var(--rn-ink-400);
          cursor: not-allowed;
        }

        .rn-pagination-pages {
          display: flex;
          gap: 6px;
        }

        .rn-pagination-page {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--rn-border);
          border-radius: 8px;
          background: var(--rn-surface);
          color: var(--rn-ink-900);
          font-size: 10px;
          font-weight: 600;
          cursor: pointer;
          transition:
            background .15s ease,
            border-color .15s ease,
            color .15s ease,
            transform .15s ease;
        }

        .rn-pagination-page:hover {
          background: var(--rn-paper);
          border-color: var(--rn-border-strong);
          transform: translateY(-1px);
        }

        .rn-pagination-page-active {
          border-color: var(--rn-cyan);
          background: var(--rn-cyan);
          color: #FFFFFF;
        }

        .rn-pagination-page-active:hover {
          border-color: var(--rn-cyan);
          background: var(--rn-cyan);
          color: #FFFFFF;
        }

        /* ======================================================
           RESPONSIVE
        ====================================================== */

        @media (max-width: 900px) {
          .rn-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 700px) {
          .rn-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .rn-header-stats {
            width: 100%;
          }

          .rn-stat {
            flex: 1;
          }

          .rn-toolbar {
            flex-wrap: wrap;
          }

          .rn-search {
            flex-basis: 100%;
          }

          .rn-job-select-wrap {
            flex: 1;
          }

          .rn-job-select {
            width: 100%;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .rn-root *,
          .rn-root *::before,
          .rn-root *::after {
            scroll-behavior: auto !important;
            transition-duration: .01ms !important;
            animation-duration: .01ms !important;
            animation-iteration-count: 1 !important;
          }
        }

      `}</style>

      {/* ========================================================
          HEADER
      ======================================================== */}

      <div className="rn-header">

        <div className="rn-header-left">

          <h2 className="rn-title">
            {isFR ? 'Notes recruteur' : 'Recruiter Notes'}
          </h2>

          <p className="rn-subtitle">
            {isFR
              ? 'Retrouvez et gérez les notes associées à vos candidats.'
              : 'Review and manage notes attached to your candidates.'}
          </p>

        </div>

        <div className="rn-header-stats">

          <div className="rn-stat">
            <div className="rn-stat-value">
              {candidatesWithNotes.length}
            </div>

            <div className="rn-stat-label">
              {isFR ? 'Candidats' : 'Candidates'}
            </div>
          </div>

          <div className="rn-stat">
            <div className="rn-stat-value">
              {totalNotes}
            </div>

            <div className="rn-stat-label">
              Notes
            </div>
          </div>

          {hasActiveFilters && (
            <div className="rn-stat">
              <div className="rn-stat-value">
                {filteredCandidates.length}
              </div>

              <div className="rn-stat-label">
                {isFR ? 'Résultats' : 'Results'}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* ========================================================
          TOOLBAR
      ======================================================== */}

      <div className="rn-toolbar">

        <div className="rn-search">

          <Search
            className="rn-search-icon"
            size={15}
          />

          <input
            className="rn-search-input"
            type="text"
            value={filterText}
            onChange={e => setFilterText(e.target.value)}
            placeholder={
              isFR
                ? 'Rechercher dans les notes...'
                : 'Search within notes...'
            }
          />

          {filterText && (
            <button
              type="button"
              className="rn-search-clear"
              onClick={() => setFilterText('')}
              aria-label={
                isFR
                  ? 'Effacer la recherche'
                  : 'Clear search'
              }
            >
              <X size={12} />
            </button>
          )}

        </div>

        <div className="rn-job-select-wrap">

          <Briefcase
            className="rn-job-icon"
            size={13}
          />

          <select
            className="rn-job-select"
            value={selectedJobId}
            onChange={e => setSelectedJobId(e.target.value)}
          >
            <option value="all">
              {isFR
                ? 'Tous les postes'
                : 'All roles'}
            </option>

            {jobDescriptions.map(job => (
              <option
                key={job.id}
                value={job.id}
              >
                {job.title}
              </option>
            ))}
          </select>

        </div>

        {hasActiveFilters && (
          <>
            <button
              type="button"
              className="rn-reset-btn"
              onClick={resetFilters}
            >
              <RotateCcw size={11} />

              {isFR
                ? 'Réinitialiser'
                : 'Reset'}
            </button>

            <div className="rn-filter-status">
              <span className="rn-filter-dot" />

              {totalFilteredNotes}{' '}
              {isFR
                ? 'notes trouvées'
                : 'notes found'}
            </div>
          </>
        )}

      </div>

      {/* ========================================================
          CONTENT
      ======================================================== */}

      {filteredCandidates.length === 0 ? (

        <div className="rn-empty">

          <div className="rn-empty-icon">
            {hasActiveFilters ? (
              <Filter size={19} />
            ) : (
              <NotebookPen size={19} />
            )}
          </div>

          <h3 className="rn-empty-title">
            {hasActiveFilters
              ? isFR
                ? 'Aucun résultat'
                : 'No results'
              : isFR
                ? 'Aucune note pour le moment'
                : 'No notes yet'}
          </h3>

          <p className="rn-empty-text">
            {hasActiveFilters
              ? isFR
                ? 'Essayez de modifier votre recherche ou de réinitialiser les filtres.'
                : 'Try changing your search or resetting the filters.'
              : isFR
                ? 'Les notes ajoutées aux profils candidats apparaîtront ici.'
                : 'Notes added to candidate profiles will appear here.'}
          </p>

          {hasActiveFilters && (
            <button
              type="button"
              className="rn-reset-btn"
              onClick={resetFilters}
              style={{
                marginTop: 16,
              }}
            >
              <RotateCcw size={11} />

              {isFR
                ? 'Réinitialiser les filtres'
                : 'Reset filters'}
            </button>
          )}

        </div>

      ) : (

        <>

          <div className="rn-grid">

            {paginatedCandidates.map(candidate => {

              const notes = candidate.displayNotes || [];

              const isScrollable =
                notes.length > NOTES_SCROLL_AFTER;

              const visibleNotes = notes;

              const isPartiallyFiltered =
                cleanFilter &&
                notes.length <
                candidate.notes.length;

              const initials =
                getInitials(
                  candidate.fullName
                );

              return (
                <div
                  key={candidate.id}
                  className="rn-candidate"
                >

                  {/* ==================================================
                      CANDIDATE HEADER
                  ================================================== */}

                  <div className="rn-candidate-head">

                    <img
                      className="rn-avatar"
                      src={getAvatarUrl(
                        candidate.fullName,
                        candidate.avatarUrl
                      )}
                      alt={candidate.fullName}
                      onError={e => {
                        e.currentTarget.style.display =
                          'none';

                        if (
                          e.currentTarget.nextSibling
                        ) {
                          e.currentTarget.nextSibling.style.display =
                            'flex';
                        }
                      }}
                    />

                    <div
                      className="rn-avatar-fallback"
                      style={{
                        display: 'none',
                      }}
                    >
                      {initials}
                    </div>

                    <div className="rn-candidate-copy">

                      <div className="rn-candidate-name">
                        {candidate.fullName}
                      </div>

                      <div className="rn-candidate-role">
                        {candidate.headline ||
                          candidate.current_role ||
                          candidate.currentRole ||
                          (isFR
                            ? 'Candidat'
                            : 'Candidate')}
                      </div>

                    </div>

                    {/* No duplicate note-count badge here */}
                    <div className="rn-candidate-head-meta">

                      {isPartiallyFiltered && (
                        <span className="rn-match-count">
                          {notes.length}/
                          {candidate.notes.length}
                        </span>
                      )}

                    </div>

                  </div>

                  {/* ==================================================
                      NOTES LIST
                  ================================================== */}

                  <div className="rn-notes">

                    <div
                      className={`rn-notes-list ${isScrollable
                          ? 'rn-notes-list-scrollable'
                          : ''
                        }`}
                    >

                      {addingNoteCandidateId === candidate.id && (
                        <div className="rn-note-item rn-note-item-latest">
                          <div className="rn-note-item-spine" />
                          <div className="rn-note-item-body">
                            <div className="rn-note-item-head">
                              <span className="rn-note-item-time">
                                <Clock size={9} />
                                {isFR ? 'Maintenant' : 'Now'}
                              </span>
                              <button
                                type="button"
                                className="rn-note-item-delete"
                                onClick={() => {
                                  setNewNoteText('');
                                  setAddingNoteCandidateId(null);
                                }}
                                title={isFR ? 'Annuler' : 'Cancel'}
                              >
                                <X size={11} />
                              </button>
                            </div>
                            <textarea
                              className="rn-new-note-textarea"
                              rows={3}
                              value={newNoteText}
                              onChange={e => setNewNoteText(e.target.value)}
                              placeholder={isFR ? 'Écrire une note...' : 'Write a note...'}
                            />
                            <div className="rn-new-note-actions">
                              <button
                                type="button"
                                className="rn-new-note-done"
                                disabled={!newNoteText.trim()}
                                onClick={() => handleCompleteNote(candidate.id)}
                              >
                                {isFR ? 'Terminé' : 'Done'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {visibleNotes.map(
                        (note, noteIndex) => (

                          <div
                            key={note.id}
                            className={`rn-note-item ${noteIndex === 0 && addingNoteCandidateId !== candidate.id
                                ? 'rn-note-item-latest'
                                : ''
                              }`}
                          >

                            <div className="rn-note-item-spine" />

                            <div className="rn-note-item-body">

                              <div className="rn-note-item-head">

                                <span className="rn-note-item-time">

                                  <Clock size={9} />

                                  {formatNoteTimestamp(
                                    note,
                                    isFR
                                  )}

                                </span>

                                <button
                                  type="button"
                                  className="rn-note-item-delete"
                                  onClick={() =>
                                    onDeleteNote(
                                      candidate.id,
                                      note.id
                                    )
                                  }
                                  title={
                                    isFR
                                      ? 'Supprimer la note'
                                      : 'Delete note'
                                  }
                                >
                                  <Trash2 size={11} />
                                </button>

                              </div>

                              <div className="rn-note-item-text">
                                {note.text}
                              </div>

                            </div>

                          </div>

                        )
                      )}

                    </div>

                    {/* ==================================================
                        FOOTER
                        SINGLE NOTE COUNT LOCATION
                    ================================================== */}

                    <div className="rn-notes-footer">

                      <span className="rn-note-index">
                        {String(
                          notes.length
                        ).padStart(2, '0')}{' '}
                        {isFR
                          ? 'note(s) au total'
                          : 'total note(s)'}
                      </span>

                      <div className="rn-footer-actions">
                        {addingNoteCandidateId !== candidate.id && (
                          <>
                            <button
                              type="button"
                              className="rn-add-inline-btn"
                              onClick={() => setAddingNoteCandidateId(candidate.id)}
                            >
                              <Plus size={11} />
                              {isFR ? 'Ajouter' : 'Add'}
                            </button>

                            <button
                              type="button"
                              className="rn-profile-btn"
                              onClick={() =>
                                onViewCandidate(
                                  candidate
                                )
                              }
                            >

                              {isFR
                                ? 'Voir profil'
                                : 'View profile'}

                              <ArrowUpRight size={11} />

                            </button>
                          </>
                        )}
                      </div>

                    </div>

                  </div>

                </div>
              );
            })}

          </div>

          {/* ========================================================
              PAGINATION
          ======================================================== */}

          {totalPages > 1 && (

            <div className="rn-pagination">

              <button
                type="button"
                className="rn-pagination-button"
                onClick={() =>
                  setPage(p =>
                    Math.max(0, p - 1)
                  )
                }
                disabled={page === 0}
              >
                <ChevronLeft size={13} />

                {isFR
                  ? 'Précédent'
                  : 'Previous'}
              </button>

              <div className="rn-pagination-pages">

                {Array.from(
                  { length: totalPages },
                  (_, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`rn-pagination-page ${page === i
                          ? 'rn-pagination-page-active'
                          : ''
                        }`}
                      onClick={() =>
                        setPage(i)
                      }
                    >
                      {i + 1}
                    </button>
                  )
                )}

              </div>

              <button
                type="button"
                className="rn-pagination-button"
                onClick={() =>
                  setPage(p =>
                    Math.min(
                      totalPages - 1,
                      p + 1
                    )
                  )
                }
                disabled={
                  page >= totalPages - 1
                }
              >
                {isFR
                  ? 'Suivant'
                  : 'Next'}

                <ChevronRight size={13} />
              </button>

            </div>

          )}

        </>
      )}

    </div>
  );
}

export default RecruiterNotesView;