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
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  NotebookPen,
  Trash2,
  Clock,
  ChevronRight,
  Search,
  X,
  Briefcase,
  FileText,
  Filter,
  RotateCcw,
  ArrowUpRight,
  Layers3,
  Sparkles,
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

  if (dateObj && !isNaN(dateObj.getTime())) {
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
  onViewCandidate = () => {},
  onDeleteNote = () => {},
}) {
  const { lang } = useLanguage();

  const [selectedJobId, setSelectedJobId] = useState('all');
  const [filterText, setFilterText] = useState('');
  const [expandedCandidates, setExpandedCandidates] = useState(new Set());

  const fontsLoaded = useRef(false);

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
   * ------------------------------------------------------------
   * DATA
   * ------------------------------------------------------------
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

  const isCandidateInJob = (candidate, jobId) => {
    if (jobId === 'all') return true;

    // 1. Saved candidate in specific job role
    const savedIds = savedRoleCandidates[jobId] || [];

    if (savedIds.includes(candidate.id)) return true;

    // 2. Candidate returned in search cache
    const cachedList = jobResultsCache[jobId] || [];

    if (cachedList.some(c => c.id === candidate.id)) return true;

    // 3. Direct candidate association
    if (
      candidate.jobId === jobId ||
      candidate.savedJobId === jobId
    ) {
      return true;
    }

    // 4. Smart match against job title
    const job = jobDescriptions.find(j => j.id === jobId);

    if (job && job.title) {
      const titleLower = job.title.toLowerCase();

      const candHeadline = (
        candidate.headline || ''
      ).toLowerCase();

      const candRole = (
        candidate.current_role ||
        candidate.currentRole ||
        ''
      ).toLowerCase();

      if (
        candHeadline.includes(titleLower) ||
        candRole.includes(titleLower)
      ) {
        return true;
      }

      const tokens = titleLower
        .split(/[\s,/-]+/)
        .filter(token => token.length > 3);

      if (
        tokens.length > 0 &&
        tokens.some(
          token =>
            candHeadline.includes(token) ||
            candRole.includes(token)
        )
      ) {
        return true;
      }
    }

    return false;
  };

  const filteredCandidates = useMemo(() => {
    return candidatesWithNotes
      .filter(candidate =>
        isCandidateInJob(candidate, selectedJobId)
      )
      .map(candidate => {
        const matchingNotes = cleanFilter
          ? candidate.notes.filter(note =>
              (note.text || '')
                .toLowerCase()
                .includes(cleanFilter)
            )
          : candidate.notes;

        /*
         * Sort newest first when a timestamp is available.
         * Falls back to original ordering when timestamps aren't usable.
         */
        const sortedNotes = [...matchingNotes].sort((a, b) => {
          const aDate = a.createdAt
            ? new Date(a.createdAt).getTime()
            : typeof a.id === 'number'
              ? a.id
              : 0;

          const bDate = b.createdAt
            ? new Date(b.createdAt).getTime()
            : typeof b.id === 'number'
              ? b.id
              : 0;

          if (!aDate && !bDate) return 0;

          return bDate - aDate;
        });

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
    jobDescriptions,
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

  const hasActiveFilters =
    selectedJobId !== 'all' || Boolean(filterText);

  /*
   * ------------------------------------------------------------
   * HELPERS
   * ------------------------------------------------------------
   */

  const toggleCandidate = candidateId => {
    setExpandedCandidates(prev => {
      const next = new Set(prev);

      if (next.has(candidateId)) {
        next.delete(candidateId);
      } else {
        next.add(candidateId);
      }

      return next;
    });
  };

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
   * ------------------------------------------------------------
   * RENDER
   * ------------------------------------------------------------
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
        ====================================================== */

        .rn-header {
          background: var(--rn-surface);
          border: 1px solid var(--rn-border);
          border-radius: 16px;
          padding: 18px 20px;

          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;

          box-shadow:
            0 1px 3px rgba(18, 21, 27, 0.04);
        }

        .rn-header-left {
          display: flex;
          align-items: center;
          gap: 13px;
          min-width: 0;
        }

        .rn-header-icon {
          width: 42px;
          height: 42px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 12px;

          background: var(--rn-cyan-soft);
          border: 1px solid rgba(14, 124, 140, 0.18);

          color: var(--rn-cyan);

          flex-shrink: 0;
        }

        .rn-header-copy {
          min-width: 0;
        }

        .rn-title {
          font-size: 16px;
          font-weight: 800;
          line-height: 1.2;
        }

        .rn-subtitle {
          margin-top: 3px;
          color: var(--rn-ink-500);
          font-size: 12px;
          line-height: 1.45;
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
          font-family: var(--rn-font-mono);
          font-size: 13px;
          font-weight: 700;
          color: var(--rn-ink-900);
        }

        .rn-stat-label {
          margin-top: 2px;
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .06em;
          color: var(--rn-ink-400);
        }

        .rn-stat-primary {
          background: var(--rn-cyan-soft);
          border-color: rgba(14, 124, 140, 0.22);
        }

        .rn-stat-primary .rn-stat-value {
          color: var(--rn-cyan-dark);
        }

        /* ======================================================
           FILTER BAR
        ====================================================== */

        .rn-controls {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .rn-control-row {
          display: flex;
          gap: 9px;
          align-items: stretch;
        }

        .rn-search {
          flex: 1;
          min-width: 240px;

          display: flex;
          align-items: center;
          gap: 9px;

          padding: 0 13px;

          background: var(--rn-surface);
          border: 1px solid var(--rn-border);
          border-radius: 11px;

          transition:
            border-color .15s ease,
            box-shadow .15s ease;
        }

        .rn-search:focus-within {
          border-color: var(--rn-cyan);
          box-shadow:
            0 0 0 3px rgba(14, 124, 140, .10);
        }

        .rn-search-input {
          flex: 1;
          min-width: 0;

          border: none;
          outline: none;
          background: transparent;

          height: 42px;

          font-family: var(--rn-font-body);
          font-size: 12.5px;
          color: var(--rn-ink-900);
        }

        .rn-search-input::placeholder {
          color: var(--rn-ink-400);
        }

        .rn-search-clear {
          width: 25px;
          height: 25px;

          display: flex;
          align-items: center;
          justify-content: center;

          border: none;
          background: transparent;
          color: var(--rn-ink-400);

          border-radius: 7px;
          cursor: pointer;
        }

        .rn-search-clear:hover {
          background: var(--rn-sunken);
          color: var(--rn-ink-900);
        }

        .rn-job-select {
          width: 260px;

          display: flex;
          align-items: center;
          gap: 9px;

          padding: 0 13px;

          background: var(--rn-surface);
          border: 1px solid var(--rn-border);
          border-radius: 11px;

          transition:
            border-color .15s ease,
            box-shadow .15s ease;
        }

        .rn-job-select:focus-within {
          border-color: var(--rn-cyan);
          box-shadow:
            0 0 0 3px rgba(14, 124, 140, .10);
        }

        .rn-select {
          flex: 1;
          min-width: 0;

          height: 42px;

          border: none;
          outline: none;
          background: transparent;

          color: var(--rn-ink-900);

          font-family: var(--rn-font-body);
          font-size: 12.5px;
          font-weight: 600;

          cursor: pointer;
        }

        .rn-reset {
          display: inline-flex;
          align-items: center;
          gap: 6px;

          height: 42px;
          padding: 0 13px;

          border: 1px solid var(--rn-border);
          border-radius: 11px;

          background: var(--rn-surface);
          color: var(--rn-ink-500);

          font-size: 11.5px;
          font-weight: 700;

          cursor: pointer;

          transition:
            background .15s ease,
            border-color .15s ease,
            color .15s ease;
        }

        .rn-reset:hover {
          background: var(--rn-sunken);
          border-color: var(--rn-border-strong);
          color: var(--rn-ink-900);
        }

        /* ======================================================
           JOB CHIPS
        ====================================================== */

        .rn-job-chips {
          display: flex;
          gap: 7px;

          overflow-x: auto;
          padding-bottom: 2px;

          scrollbar-width: none;
        }

        .rn-job-chips::-webkit-scrollbar {
          display: none;
        }

        .rn-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;

          flex-shrink: 0;

          padding: 7px 11px;

          border: 1px solid var(--rn-border);
          border-radius: 999px;

          background: var(--rn-surface);
          color: var(--rn-ink-700);

          font-size: 11px;
          font-weight: 700;

          cursor: pointer;

          transition:
            background .15s ease,
            border-color .15s ease,
            color .15s ease,
            transform .15s ease;
        }

        .rn-chip:hover {
          background: var(--rn-paper);
          border-color: var(--rn-border-strong);
          transform: translateY(-1px);
        }

        .rn-chip-active {
          background: var(--rn-ink-900);
          border-color: var(--rn-ink-900);
          color: #fff;
        }

        .rn-chip-count {
          font-family: var(--rn-font-mono);
          font-size: 9px;
          padding: 2px 5px;
          border-radius: 5px;

          background: rgba(18, 21, 27, .07);
        }

        .rn-chip-active .rn-chip-count {
          background: rgba(255,255,255,.14);
          color: #fff;
        }

        /* ======================================================
           FILTER STATUS
        ====================================================== */

        .rn-filter-status {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;

          padding: 8px 12px;

          border: 1px dashed var(--rn-border-strong);
          border-radius: 9px;

          background: var(--rn-paper);
        }

        .rn-filter-status-copy {
          min-width: 0;

          font-size: 11px;
          color: var(--rn-ink-500);

          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .rn-filter-status-copy strong {
          color: var(--rn-ink-800);
        }

        .rn-filter-reset {
          display: inline-flex;
          align-items: center;
          gap: 5px;

          flex-shrink: 0;

          border: none;
          background: transparent;

          color: var(--rn-cyan-dark);

          font-size: 10.5px;
          font-weight: 800;

          cursor: pointer;
        }

        /* ======================================================
           MAIN LIST
        ====================================================== */

        .rn-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        /*
         * Candidate lane
         *
         * The important change:
         * candidate identity and note activity live in one
         * horizontal workspace instead of a giant card.
         */

        .rn-candidate {
          background: var(--rn-surface);
          border: 1px solid var(--rn-border);
          border-radius: 14px;

          overflow: hidden;

          box-shadow:
            0 1px 3px rgba(18, 21, 27, .035);

          transition:
            border-color .15s ease,
            box-shadow .15s ease,
            transform .15s ease;
        }

        .rn-candidate:hover {
          border-color: var(--rn-border-strong);
          box-shadow:
            0 4px 14px rgba(18, 21, 27, .055);
        }

        .rn-candidate-expanded {
          border-color: rgba(14, 124, 140, .28);
        }

        /* ======================================================
           CANDIDATE IDENTITY COLUMN
        ====================================================== */

        .rn-candidate-top {
          display: grid;
          grid-template-columns: minmax(230px, 0.75fr) minmax(0, 2fr);
          min-height: 116px;
        }

        .rn-candidate-identity {
          position: relative;

          padding: 15px 16px;

          display: flex;
          align-items: center;
          gap: 12px;

          background:
            linear-gradient(
              135deg,
              var(--rn-paper),
              #fff
            );

          border-right: 1px solid var(--rn-border);
        }

        .rn-candidate-accent {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;

          width: 3px;

          background: var(--rn-cyan);

          opacity: .85;
        }

        .rn-avatar {
          width: 42px;
          height: 42px;

          object-fit: cover;

          border-radius: 11px;

          border: 1px solid var(--rn-border);

          flex-shrink: 0;
        }

        .rn-avatar-fallback {
          width: 42px;
          height: 42px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 11px;

          background: var(--rn-ink-900);
          color: #fff;

          font-family: var(--rn-font-display);
          font-size: 12px;
          font-weight: 800;

          flex-shrink: 0;
        }

        .rn-candidate-copy {
          min-width: 0;
        }

        .rn-candidate-name {
          font-size: 13px;
          font-weight: 800;

          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .rn-candidate-role {
          margin-top: 3px;

          color: var(--rn-ink-500);

          font-size: 10.5px;
          font-weight: 500;

          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .rn-candidate-meta {
          display: flex;
          align-items: center;
          gap: 5px;

          margin-top: 7px;
        }

        .rn-note-count {
          display: inline-flex;
          align-items: center;
          gap: 4px;

          padding: 3px 7px;

          border-radius: 6px;

          background: var(--rn-cyan-soft);
          color: var(--rn-cyan-dark);

          font-family: var(--rn-font-mono);
          font-size: 9px;
          font-weight: 700;
        }

        .rn-match-count {
          display: inline-flex;
          align-items: center;

          padding: 3px 7px;

          border-radius: 6px;

          background: var(--rn-sunken);
          color: var(--rn-ink-500);

          font-family: var(--rn-font-mono);
          font-size: 9px;
          font-weight: 600;
        }

        /* ======================================================
           FEATURED NOTE
        ====================================================== */

        .rn-featured {
          padding: 14px 16px;

          display: flex;
          flex-direction: column;
          justify-content: center;

          min-width: 0;
        }

        .rn-featured-label {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;

          margin-bottom: 7px;
        }

        .rn-latest-label {
          display: inline-flex;
          align-items: center;
          gap: 5px;

          color: var(--rn-cyan-dark);

          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .07em;
        }

        .rn-latest-time {
          display: inline-flex;
          align-items: center;
          gap: 4px;

          color: var(--rn-ink-400);

          font-family: var(--rn-font-mono);
          font-size: 9px;

          white-space: nowrap;
        }

        .rn-featured-text {
          color: var(--rn-ink-700);

          font-size: 12.5px;
          line-height: 1.55;

          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;

          overflow: hidden;
        }

        .rn-featured-footer {
          margin-top: 9px;

          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .rn-note-index {
          color: var(--rn-ink-400);

          font-family: var(--rn-font-mono);
          font-size: 9px;
        }

        .rn-profile-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;

          padding: 6px 9px;

          border: 1px solid var(--rn-border);
          border-radius: 7px;

          background: transparent;
          color: var(--rn-ink-700);

          font-size: 10px;
          font-weight: 700;

          cursor: pointer;

          transition:
            background .15s ease,
            border-color .15s ease,
            color .15s ease;
        }

        .rn-profile-btn:hover {
          background: var(--rn-ink-900);
          border-color: var(--rn-ink-900);
          color: #fff;
        }

        /* ======================================================
           EXPANDED TIMELINE
        ====================================================== */

        .rn-expanded {
          border-top: 1px solid var(--rn-border);
          background: var(--rn-paper);

          padding: 12px 16px 14px;
        }

        .rn-expanded-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;

          margin-bottom: 8px;
        }

        .rn-expanded-title {
          display: flex;
          align-items: center;
          gap: 6px;

          color: var(--rn-ink-700);

          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .05em;
        }

        .rn-collapse {
          border: none;
          background: transparent;
          color: var(--rn-ink-400);

          font-size: 10px;
          font-weight: 700;

          cursor: pointer;
        }

        .rn-collapse:hover {
          color: var(--rn-ink-900);
        }

        .rn-timeline {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .rn-note {
          display: grid;
          grid-template-columns: 105px minmax(0, 1fr) auto;
          gap: 12px;
          align-items: center;

          padding: 9px 10px;

          background: var(--rn-surface);
          border: 1px solid var(--rn-border);
          border-radius: 9px;

          transition:
            border-color .15s ease,
            background .15s ease;
        }

        .rn-note:hover {
          border-color: var(--rn-border-strong);
        }

        .rn-note-time {
          display: flex;
          align-items: center;
          gap: 5px;

          color: var(--rn-ink-400);

          font-family: var(--rn-font-mono);
          font-size: 9px;
        }

        .rn-note-text {
          min-width: 0;

          color: var(--rn-ink-700);

          font-size: 11.5px;
          line-height: 1.5;

          word-break: break-word;
        }

        .rn-delete {
          width: 28px;
          height: 28px;

          display: flex;
          align-items: center;
          justify-content: center;

          border: 1px solid var(--rn-border);
          border-radius: 7px;

          background: var(--rn-surface);
          color: var(--rn-ink-400);

          cursor: pointer;

          transition:
            background .15s ease,
            border-color .15s ease,
            color .15s ease;
        }

        .rn-delete:hover {
          color: var(--rn-danger);
          background: var(--rn-danger-soft);
          border-color: rgba(193,54,31,.22);
        }

        /* ======================================================
           SHOW MORE
        ====================================================== */

        .rn-expand-row {
          display: flex;
          justify-content: center;

          border-top: 1px solid var(--rn-border);

          background: #fff;
        }

        .rn-expand-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;

          padding: 8px 13px;

          border: none;
          background: transparent;

          color: var(--rn-ink-500);

          font-size: 10.5px;
          font-weight: 700;

          cursor: pointer;

          transition: color .15s ease;
        }

        .rn-expand-btn:hover {
          color: var(--rn-cyan-dark);
        }

        /* ======================================================
           EMPTY
        ====================================================== */

        .rn-empty {
          min-height: 300px;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;

          padding: 50px 24px;

          background: var(--rn-surface);
          border: 1px solid var(--rn-border);
          border-radius: 16px;

          text-align: center;
        }

        .rn-empty-icon {
          width: 52px;
          height: 52px;

          display: flex;
          align-items: center;
          justify-content: center;

          margin-bottom: 14px;

          border-radius: 14px;

          background: var(--rn-sunken);
          border: 1px solid var(--rn-border);

          color: var(--rn-ink-400);
        }

        .rn-empty-title {
          font-size: 14px;
          font-weight: 800;

          color: var(--rn-ink-800);
        }

        .rn-empty-description {
          max-width: 390px;

          margin-top: 6px;

          color: var(--rn-ink-500);

          font-size: 11.5px;
          line-height: 1.55;
        }

        .rn-empty-action {
          display: inline-flex;
          align-items: center;
          gap: 6px;

          margin-top: 15px;
          padding: 8px 12px;

          border: 1px solid var(--rn-border);
          border-radius: 8px;

          background: var(--rn-surface);
          color: var(--rn-ink-700);

          font-size: 10.5px;
          font-weight: 700;

          cursor: pointer;
        }

        .rn-empty-action:hover {
          background: var(--rn-ink-900);
          border-color: var(--rn-ink-900);
          color: #fff;
        }

        /* ======================================================
           RESPONSIVE
        ====================================================== */

        @media (max-width: 850px) {

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

          .rn-control-row {
            flex-direction: column;
          }

          .rn-search,
          .rn-job-select {
            width: 100%;
          }

          .rn-candidate-top {
            grid-template-columns: 1fr;
          }

          .rn-candidate-identity {
            border-right: none;
            border-bottom: 1px solid var(--rn-border);
          }

          .rn-note {
            grid-template-columns: 1fr auto;
          }

          .rn-note-time {
            grid-column: 1 / -1;
            grid-row: 1;
          }

          .rn-note-text {
            grid-column: 1;
            grid-row: 2;
          }

          .rn-delete {
            grid-column: 2;
            grid-row: 2;
          }
        }

        @media (max-width: 560px) {

          .rn-header {
            padding: 15px;
          }

          .rn-header-icon {
            width: 38px;
            height: 38px;
          }

          .rn-subtitle {
            display: none;
          }

          .rn-candidate-top {
            min-height: 0;
          }

          .rn-featured {
            padding: 13px;
          }

          .rn-candidate-identity {
            padding: 13px;
          }

          .rn-expanded {
            padding: 10px;
          }

          .rn-note {
            padding: 9px;
          }

          .rn-reset {
            width: 100%;
            justify-content: center;
          }
        }

      `}</style>

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="rn-header">
        <div className="rn-header-left">
          <div className="rn-header-icon">
            <NotebookPen size={18} />
          </div>

          <div className="rn-header-copy">
            <div className="rn-title rn-display">
              {isFR ? 'Notes Recruteur' : 'Recruiter Notes'}
            </div>

            <div className="rn-subtitle">
              {isFR
                ? 'Un espace de travail pour suivre les observations et décisions sur les candidats.'
                : 'A focused workspace for candidate observations, decisions and follow-ups.'}
            </div>
          </div>
        </div>

        <div className="rn-header-stats">
          <div className="rn-stat rn-stat-primary">
            <div className="rn-stat-value">
              {totalFilteredNotes}
            </div>

            <div className="rn-stat-label">
              {isFR ? 'notes' : 'notes'}
            </div>
          </div>

          <div className="rn-stat">
            <div className="rn-stat-value">
              {filteredCandidates.length}
            </div>

            <div className="rn-stat-label">
              {isFR ? 'profils' : 'profiles'}
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================
          CONTROLS
      ====================================================== */}

      {candidatesWithNotes.length > 0 && (
        <div className="rn-controls">

          <div className="rn-control-row">

            <div className="rn-search">
              <Search
                size={15}
                color="var(--rn-ink-400)"
              />

              <input
                type="text"
                className="rn-search-input"
                value={filterText}
                onChange={e =>
                  setFilterText(e.target.value)
                }
                placeholder={
                  isFR
                    ? 'Rechercher dans les notes...'
                    : 'Search notes, keywords or observations...'
                }
              />

              {filterText && (
                <button
                  type="button"
                  className="rn-search-clear"
                  onClick={() => setFilterText('')}
                  title={
                    isFR
                      ? 'Effacer la recherche'
                      : 'Clear search'
                  }
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {jobDescriptions.length > 0 && (
              <div className="rn-job-select">

                <Briefcase
                  size={14}
                  color="var(--rn-cyan)"
                />

                <select
                  className="rn-select"
                  value={selectedJobId}
                  onChange={e =>
                    setSelectedJobId(e.target.value)
                  }
                >
                  <option value="all">
                    {isFR
                      ? 'Toutes les fiches de poste'
                      : 'All Job Descriptions'}
                    {' '}({candidatesWithNotes.length})
                  </option>

                  {jobDescriptions.map(job => {

                    const count =
                      candidatesWithNotes.filter(candidate =>
                        isCandidateInJob(
                          candidate,
                          job.id
                        )
                      ).length;

                    return (
                      <option
                        key={job.id}
                        value={job.id}
                      >
                        {job.title}
                        {count > 0
                          ? ` (${count})`
                          : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {hasActiveFilters && (
              <button
                type="button"
                className="rn-reset"
                onClick={resetFilters}
              >
                <RotateCcw size={13} />
                {isFR ? 'Réinitialiser' : 'Reset'}
              </button>
            )}
          </div>

          {/* Quick job navigation */}

          {jobDescriptions.length > 0 && (
            <div className="rn-job-chips">

              <button
                type="button"
                className={`rn-chip ${
                  selectedJobId === 'all'
                    ? 'rn-chip-active'
                    : ''
                }`}
                onClick={() =>
                  setSelectedJobId('all')
                }
              >
                <Layers3 size={11} />

                {isFR ? 'Toutes' : 'All'}

                <span className="rn-chip-count">
                  {totalNotes}
                </span>
              </button>

              {jobDescriptions.map(job => {

                const jobNotesCount =
                  candidatesWithNotes
                    .filter(candidate =>
                      isCandidateInJob(
                        candidate,
                        job.id
                      )
                    )
                    .reduce(
                      (sum, candidate) =>
                        sum + candidate.notes.length,
                      0
                    );

                const active =
                  selectedJobId === job.id;

                return (
                  <button
                    key={job.id}
                    type="button"
                    className={`rn-chip ${
                      active
                        ? 'rn-chip-active'
                        : ''
                    }`}
                    onClick={() =>
                      setSelectedJobId(job.id)
                    }
                    title={job.title}
                  >
                    <FileText size={10} />

                    <span>
                      {job.title}
                    </span>

                    {jobNotesCount > 0 && (
                      <span className="rn-chip-count">
                        {jobNotesCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Active filter summary */}

          {hasActiveFilters && (
            <div className="rn-filter-status">

              <div className="rn-filter-status-copy">

                <Filter
                  size={11}
                  style={{
                    marginRight: 5,
                    verticalAlign: '-1px',
                  }}
                />

                {isFR
                  ? 'Filtre actif : '
                  : 'Active filter: '}

                {selectedJobId !== 'all' && (
                  <strong>
                    {
                      jobDescriptions.find(
                        job =>
                          job.id === selectedJobId
                      )?.title
                    }
                  </strong>
                )}

                {filterText && (
                  <>
                    {' '}
                    <strong>
                      “{filterText}”
                    </strong>
                  </>
                )}

                {' '}•{' '}

                <strong>
                  {totalFilteredNotes}
                </strong>{' '}
                {isFR
                  ? 'notes affichées'
                  : 'notes shown'}
              </div>

              <button
                type="button"
                className="rn-filter-reset"
                onClick={resetFilters}
              >
                <RotateCcw size={11} />
                {isFR ? 'Effacer' : 'Clear'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ======================================================
          EMPTY — NO NOTES
      ====================================================== */}

      {candidatesWithNotes.length === 0 && (
        <div className="rn-empty">

          <div className="rn-empty-icon">
            <NotebookPen size={22} />
          </div>

          <div className="rn-empty-title rn-display">
            {isFR
              ? 'Aucune note enregistrée'
              : 'No notes yet'}
          </div>

          <div className="rn-empty-description">
            {isFR
              ? 'Ouvrez un profil candidat et ajoutez une note interne. Elle apparaîtra automatiquement dans cet espace.'
              : 'Open a candidate profile and add an internal note. It will automatically appear in this workspace.'}
          </div>
        </div>
      )}

      {/* ======================================================
          EMPTY — FILTERED
      ====================================================== */}

      {candidatesWithNotes.length > 0 &&
        filteredCandidates.length === 0 && (
          <div className="rn-empty">

            <div className="rn-empty-icon">
              <Filter size={21} />
            </div>

            <div className="rn-empty-title rn-display">
              {isFR
                ? 'Aucun résultat'
                : 'Nothing matches'}
            </div>

            <div className="rn-empty-description">
              {isFR
                ? 'Aucune note ne correspond aux filtres actuels.'
                : 'No candidate notes match the current filters or search.'}
            </div>

            <button
              type="button"
              className="rn-empty-action"
              onClick={resetFilters}
            >
              <RotateCcw size={12} />

              {isFR
                ? 'Réinitialiser les filtres'
                : 'Reset filters'}
            </button>
          </div>
        )}

      {/* ======================================================
          CANDIDATE NOTE LANES
      ====================================================== */}

      {filteredCandidates.length > 0 && (
        <div className="rn-list">

          {filteredCandidates.map(candidate => {

            const initials = getInitials(
              candidate.fullName
            );

            const notes =
              candidate.displayNotes;

            const latestNote = notes[0];

            const remainingNotes =
              notes.slice(1);

            const isExpanded =
              expandedCandidates.has(candidate.id);

            const isPartiallyFiltered =
              cleanFilter &&
              notes.length < candidate.notes.length;

            return (
              <div
                key={candidate.id}
                className={`rn-candidate ${
                  isExpanded
                    ? 'rn-candidate-expanded'
                    : ''
                }`}
              >

                {/* ==================================================
                    MAIN CANDIDATE LANE
                ================================================== */}

                <div className="rn-candidate-top">

                  {/* Candidate identity */}

                  <div className="rn-candidate-identity">

                    <div className="rn-candidate-accent" />

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
                      style={{ display: 'none' }}
                    >
                      {initials}
                    </div>

                    <div className="rn-candidate-copy">

                      <div className="rn-candidate-name rn-display">
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

                      <div className="rn-candidate-meta">

                        <span className="rn-note-count">
                          <NotebookPen size={9} />

                          {notes.length}
                        </span>

                        {isPartiallyFiltered && (
                          <span className="rn-match-count">
                            {notes.length}/
                            {candidate.notes.length}
                          </span>
                        )}

                      </div>

                    </div>
                  </div>

                  {/* Latest note */}

                  <div className="rn-featured">

                    <div className="rn-featured-label">

                      <span className="rn-latest-label">
                        <Sparkles size={10} />

                        {isFR
                          ? 'Dernière note'
                          : 'Latest note'}
                      </span>

                      <span className="rn-latest-time">
                        <Clock size={10} />

                        {formatNoteTimestamp(
                          latestNote,
                          isFR
                        )}
                      </span>
                    </div>

                    <div className="rn-featured-text">
                      {latestNote.text}
                    </div>

                    <div className="rn-featured-footer">

                      <span className="rn-note-index">
                        01 / {String(notes.length).padStart(
                          2,
                          '0'
                        )}
                      </span>

                      <button
                        type="button"
                        className="rn-profile-btn"
                        onClick={() =>
                          onViewCandidate(candidate)
                        }
                      >
                        {isFR
                          ? 'Voir profil'
                          : 'View profile'}

                        <ArrowUpRight size={11} />
                      </button>

                    </div>
                  </div>
                </div>

                {/* ==================================================
                    EXPAND / COLLAPSE
                ================================================== */}

                {remainingNotes.length > 0 && (
                  <>
                    <div className="rn-expand-row">

                      <button
                        type="button"
                        className="rn-expand-btn"
                        onClick={() =>
                          toggleCandidate(
                            candidate.id
                          )
                        }
                      >
                        {isExpanded
                          ? (
                            <>
                              {isFR
                                ? 'Masquer l’historique'
                                : 'Hide note history'}

                              <ChevronRight
                                size={12}
                                style={{
                                  transform:
                                    'rotate(-90deg)',
                                }}
                              />
                            </>
                          )
                          : (
                            <>
                              {isFR
                                ? `Voir ${remainingNotes.length} autre${remainingNotes.length > 1 ? 's' : ''} note${remainingNotes.length > 1 ? 's' : ''}`
                                : `View ${remainingNotes.length} more note${remainingNotes.length > 1 ? 's' : ''}`}

                              <ChevronRight size={12} />
                            </>
                          )}
                      </button>
                    </div>

                    {/* ==================================================
                        NOTE TIMELINE
                    ================================================== */}

                    {isExpanded && (
                      <div className="rn-expanded">

                        <div className="rn-expanded-header">

                          <div className="rn-expanded-title">
                            <Clock size={11} />

                            {isFR
                              ? 'Historique des notes'
                              : 'Note history'}
                          </div>

                          <button
                            type="button"
                            className="rn-collapse"
                            onClick={() =>
                              toggleCandidate(
                                candidate.id
                              )
                            }
                          >
                            {isFR
                              ? 'Réduire'
                              : 'Collapse'}
                          </button>

                        </div>

                        <div className="rn-timeline">

                          {remainingNotes.map(
                            (note, noteIndex) => (
                              <div
                                key={note.id}
                                className="rn-note"
                              >

                                <div className="rn-note-time">
                                  <Clock size={10} />

                                  {formatNoteTimestamp(
                                    note,
                                    isFR
                                  )}
                                </div>

                                <div className="rn-note-text">
                                  {note.text}
                                </div>

                                <button
                                  type="button"
                                  className="rn-delete"
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
                                  <Trash2 size={12} />
                                </button>

                              </div>
                            )
                          )}

                        </div>
                      </div>
                    )}
                  </>
                )}

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default RecruiterNotesView;