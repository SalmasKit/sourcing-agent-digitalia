/**
 * KanbanPipeline — simplified redesign
 *
 * Design direction:
 *  - Neutral workspace with cyan used only as the interaction accent.
 *  - No colored rectangles, score backgrounds, or stage-color pills.
 *  - Funnel becomes a minimal stage navigation rail.
 *  - Columns feel like one continuous pipeline instead of separate cards.
 *  - Candidate cards stay compact and information-dense.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  Eye,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Mail,
  Calendar,
  Award,
  XCircle,
  Filter,
  Search,
  ChevronLeft,
} from 'lucide-react';

import { useLanguage } from '../context/LanguageContext';

function getAvatarUrl(name, avatar) {
  if (avatar) {
    return avatar;
  }

  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
    name || 'Candidate'
  )}&backgroundColor=12151B&textColor=ffffff&fontWeight=600&fontSize=38`;
}

export const STAGES = [
  {
    id: 'new',
    labelFR: 'Nouveau',
    labelEN: 'New',
    icon: Users,
  },
  {
    id: 'contacted',
    labelFR: 'Contacté',
    labelEN: 'Contacted',
    icon: Mail,
  },
  {
    id: 'interview',
    labelFR: 'Entretien',
    labelEN: 'Interview',
    icon: Calendar,
  },
  {
    id: 'offer',
    labelFR: 'Offre proposée',
    labelEN: 'Offer Extended',
    icon: Award,
  },
  {
    id: 'hired',
    labelFR: 'Recruté',
    labelEN: 'Hired',
    icon: CheckCircle2,
  },
  {
    id: 'rejected',
    labelFR: 'Refusé / Archivé',
    labelEN: 'Refused / Archived',
    icon: XCircle,
  },
];

const COPY = {
  EN: {
    title: 'Recruitment pipeline',
    sub: 'Move candidates through your hiring stages',
    allRoles: 'All job roles',
    dropHere: 'Drop candidate here',
    viewProfile: 'Profile',
    advanceNext: 'Next',
    searchPh: 'Filter by name, role, or skill…',

    expandColumn: 'Expand column',
    collapseColumn: 'Collapse column',

    previousPage: 'Previous page',
    nextPage: 'Next page',
    page: 'Page',
  },

  FR: {
    title: 'Pipeline de recrutement',
    sub: 'Faites évoluer les candidats dans votre processus de recrutement',
    allRoles: 'Tous les postes',
    dropHere: 'Déposez le candidat ici',
    viewProfile: 'Profil',
    advanceNext: 'Suivant',
    searchPh: 'Filtrer par nom, poste ou compétence…',

    expandColumn: 'Développer la colonne',
    collapseColumn: 'Réduire la colonne',

    previousPage: 'Page précédente',
    nextPage: 'Page suivante',
    page: 'Page',
  },
};

function useFonts() {
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;

    loaded.current = true;

    const link = document.createElement('link');

    link.rel = 'stylesheet';

    link.href =
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap';

    document.head.appendChild(link);
  }, []);
}

export function KanbanPipeline({
  candidates = [],
  jobDescriptions = [],
  savedRoleCandidates = {},
  candidatePipelineStage = {},
  onUpdateStage = () => { },
  onViewDetails = () => { },
}) {
  useFonts();

  /*
   * IMPORTANT:
   * Use the real LanguageContext from the application.
   * The previous version had a fake useLanguage() returning EN,
   * which prevented the UI from switching to French.
   */
  const { lang } = useLanguage();

  const isFR = lang === 'FR';

  const t = COPY[lang] || COPY.EN;

  const [selectedJobFilter, setSelectedJobFilter] = useState('all');

  const [query, setQuery] = useState('');

  const [draggedId, setDraggedId] = useState(null);

  const [dragOverStage, setDragOverStage] = useState(null);

  const [collapsed, setCollapsed] = useState({});

  const [stagePages, setStagePages] = useState({});

  const columnRefs = useRef({});

  const CARDS_PER_PAGE = 5;

  /*
   * ------------------------------------------------
   * FILTER BY ROLE
   * ------------------------------------------------
   */

  const jobFiltered = candidates.filter((candidate) => {
    if (selectedJobFilter === 'all') {
      return true;
    }

    const savedIds =
      savedRoleCandidates[selectedJobFilter] || [];

    return (
      savedIds.includes(candidate.id) ||
      candidate.jobId === selectedJobFilter
    );
  });

  /*
   * ------------------------------------------------
   * SEARCH
   * ------------------------------------------------
   */

  const filteredCandidates = query.trim()
    ? jobFiltered.filter((candidate) => {
      const q = query.toLowerCase();

      const skills = Array.isArray(candidate.skills)
        ? candidate.skills.join(' ')
        : candidate.skills || '';

      return (
        candidate.fullName
          ?.toLowerCase()
          .includes(q) ||
        candidate.headline
          ?.toLowerCase()
          .includes(q) ||
        skills.toLowerCase().includes(q)
      );
    })
    : jobFiltered;

  /*
   * ------------------------------------------------
   * CANDIDATE STAGE
   * ------------------------------------------------
   */

  const getCandidateStage = (id) =>
    candidatePipelineStage[id] || 'new';

  /*
   * ------------------------------------------------
   * SCROLL TO STAGE
   * ------------------------------------------------
   */

  function scrollToStage(stageId) {
    columnRefs.current[stageId]?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    });
  }

  /*
   * ------------------------------------------------
   * COLLAPSE / EXPAND
   * ------------------------------------------------
   */

  function toggleCollapse(stageId) {
    setCollapsed((prev) => ({
      ...prev,
      [stageId]: !prev[stageId],
    }));
  }

  /*
   * ------------------------------------------------
   * PAGINATION
   * ------------------------------------------------
   */

  function handleStagePageChange(stageId, newPage) {
    setStagePages((prev) => ({
      ...prev,
      [stageId]: newPage,
    }));
  }

  function getPaginatedStageCandidates(
    stageCandidates,
    stageId
  ) {
    const currentPage = stagePages[stageId] || 0;

    const totalPages = Math.ceil(
      stageCandidates.length / CARDS_PER_PAGE
    );

    const validPage = Math.max(
      0,
      Math.min(
        currentPage,
        Math.max(0, totalPages - 1)
      )
    );

    if (totalPages <= 1) {
      return stageCandidates;
    }

    return stageCandidates.slice(
      validPage * CARDS_PER_PAGE,
      validPage * CARDS_PER_PAGE + CARDS_PER_PAGE
    );
  }

  /*
   * ------------------------------------------------
   * DRAG & DROP
   * ------------------------------------------------
   */

  function handleDragStart(e, candidateId) {
    e.dataTransfer.setData(
      'text/plain',
      candidateId
    );

    e.dataTransfer.effectAllowed = 'move';

    setDraggedId(candidateId);
  }

  function handleDragOver(e, stageId) {
    e.preventDefault();

    e.dataTransfer.dropEffect = 'move';

    if (dragOverStage !== stageId) {
      setDragOverStage(stageId);
    }
  }

  function handleDragLeave(stageId) {
    if (dragOverStage === stageId) {
      setDragOverStage(null);
    }
  }

  function handleDrop(e, targetStageId) {
    e.preventDefault();

    const candidateId =
      e.dataTransfer.getData('text/plain') ||
      draggedId;

    if (candidateId) {
      onUpdateStage(
        candidateId,
        targetStageId
      );
    }

    setDraggedId(null);

    setDragOverStage(null);
  }

  return (
    <div className="kb-root">
      <style>{`
        @keyframes kbIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes kbPulse {
          0%, 100% {
            border-color: #D8DEE5;
          }

          50% {
            border-color: #0BA5C9;
          }
        }

        .kb-root {
          --cyan: #0BA5C9;
          --cyan-dark: #087F9B;
          --cyan-soft: #EAF9FC;
          --cyan-light: #9EDDEC;

          --ink: #12151B;
          --ink-2: #3A414B;
          --muted: #6C7078;

          --paper: #F7F5F1;
          --surface: #FFFFFF;

          --line: #E5E2DB;
          --line-soft: #ECE9E3;

          font-family: Inter, sans-serif;
          color: var(--ink);
          background: transparent;

          width: 100%;

          display: flex;
          flex-direction: column;
          gap: 16px;

          box-sizing: border-box;
        }

        /* ------------------------------------------------
           HEADER
        ------------------------------------------------ */

        .kb-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 32px;

          padding: 0;
          margin-bottom: 11px;

          flex-wrap: wrap;
        }

        .kb-header-left {
          display: block;
          min-width: 0;
          flex: 1 1 auto;
        }

        .kb-header-title {
          margin: 0;

          font-family: "Space Grotesk", sans-serif;
          font-size: 26px;
          letter-spacing: -.03em;

          color: var(--ink);
        }

        .kb-header-sub {
          max-width: 620px;

          margin: 7px 0 0;

          color: var(--muted);
          font-size: 13px;
          line-height: 1.6;
        }

        .kb-header-right {
          display: flex;
          align-items: center;
          gap: 8px;

          flex-wrap: wrap;
          flex-shrink: 0;

          padding-top: 25px;
        }

        .kb-search {
          display: flex;
          align-items: center;
          gap: 7px;

          min-width: 220px;

          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 9px;

          padding: 8px 11px;

          transition:
            border-color .15s ease,
            box-shadow .15s ease;
        }

        .kb-search:focus-within {
          border-color: var(--cyan-light);
          box-shadow: 0 0 0 3px var(--cyan-soft);
        }

        .kb-search input {
          border: none;
          outline: none;
          background: none;

          font-size: 11.5px;
          color: var(--ink);

          width: 100%;
          font-family: inherit;
        }

        .kb-search input::placeholder {
          color: #A1A7AE;
        }

        .kb-filter-wrap {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .kb-filter-select {
          font-family: inherit;
          font-size: 11.5px;
          font-weight: 600;

          color: var(--ink-2);
          background: var(--surface);

          border: 1px solid var(--line);
          border-radius: 9px;

          padding: 8px 11px;

          outline: none;
          cursor: pointer;
        }

        .kb-filter-select:focus {
          border-color: var(--cyan-light);
        }

        /* ------------------------------------------------
           STAGE NAVIGATION
        ------------------------------------------------ */

        .kb-stage-nav {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 13px;

          padding: 14px 16px 12px;
        }

        .kb-stage-track {
          display: flex;
          align-items: center;
          gap: 0;

          position: relative;
        }

        .kb-stage-track-line {
          position: absolute;
          left: 9px;
          right: 9px;
          top: 10px;

          height: 1px;

          background: var(--line);

          pointer-events: none;
        }

        .kb-stage-item {
          position: relative;
          z-index: 1;

          flex: 1;

          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;

          cursor: pointer;
          min-width: 0;
        }

        .kb-stage-dot {
          width: 20px;
          height: 20px;

          border-radius: 50%;

          background: var(--surface);
          border: 1px solid #CBD2D9;

          display: flex;
          align-items: center;
          justify-content: center;

          transition:
            border-color .15s ease,
            background .15s ease,
            transform .15s ease;
        }

        .kb-stage-item:hover .kb-stage-dot {
          border-color: var(--cyan);
          background: var(--cyan-soft);
          transform: scale(1.08);
        }

        .kb-stage-item:hover .kb-stage-name {
          color: var(--cyan-dark);
        }

        .kb-stage-item.active .kb-stage-dot {
          background: var(--cyan);
          border-color: var(--cyan);
        }

        .kb-stage-count {
          font-family: Inter, sans-serif;
          font-size: 8px;
          font-weight: 700;
          color: var(--surface);
        }

        .kb-stage-name {
          font-size: 9.5px;
          font-weight: 600;
          color: #636A73;

          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;

          max-width: 100%;
        }

        /* ------------------------------------------------
           BOARD
        ------------------------------------------------ */

        .kb-board {
          display: flex;
          align-items: flex-start;
          gap: 0;

          overflow-x: auto;

          min-height: 480px;

          border-top: 1px solid var(--line);
          border-bottom: 1px solid var(--line);

          background: transparent;
        }

        .kb-board::-webkit-scrollbar {
          height: 6px;
        }

        .kb-board::-webkit-scrollbar-thumb {
          background: #D1D4D7;
          border-radius: 999px;
        }

        /* ------------------------------------------------
           COLUMNS
        ------------------------------------------------ */

        .kb-col {
          position: relative;

          background: transparent;

          border-right: 1px solid var(--line);

          padding: 13px 10px;

          min-height: 480px;

          width: 220px;
          min-width: 210px;
          flex: 0 0 220px;

          display: flex;
          flex-direction: column;
          gap: 8px;

          box-sizing: border-box;

          transition:
            background .15s ease,
            border-color .15s ease;
        }

        .kb-col:first-child {
          border-left: 1px solid var(--line);
        }

        .kb-col.over {
          background: var(--cyan-soft);
          border-color: var(--cyan-light);

          animation: kbPulse 1.2s ease-in-out infinite;
        }

        .kb-col.collapsed {
          width: 42px;
          min-width: 42px;
          flex: 0 0 42px;

          align-items: center;

          padding: 13px 7px;
        }

        .kb-col-head {
          display: flex;
          align-items: center;
          justify-content: space-between;

          padding-bottom: 9px;

          border-bottom: 1px solid var(--line);

          margin-bottom: 1px;
        }

        .kb-col-title {
          display: flex;
          align-items: center;
          gap: 6px;

          font-family: "Space Grotesk", sans-serif;
          font-size: 11.5px;
          font-weight: 650;
          letter-spacing: -.01em;

          color: var(--ink-2);

          min-width: 0;
        }

        .kb-col-title span {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .kb-col-title-icon {
          color: #858D96;
          flex-shrink: 0;
        }

        .kb-col-right {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .kb-col-count {
          font-family: Inter, sans-serif;

          font-size: 9px;
          font-weight: 700;

          color: #737A83;

          min-width: 18px;
          text-align: center;
        }

        .kb-col-collapse-btn {
          width: 20px;
          height: 20px;

          padding: 0;

          display: flex;
          align-items: center;
          justify-content: center;

          background: none;
          border: none;

          color: #9AA1A9;

          cursor: pointer;
          border-radius: 5px;

          transition:
            color .15s ease,
            background .15s ease;
        }

        .kb-col-collapse-btn:hover {
          color: var(--cyan-dark);
          background: var(--cyan-soft);
        }

        .kb-col-vertical {
          writing-mode: vertical-rl;
          transform: rotate(180deg);

          font-family: "Space Grotesk", sans-serif;
          font-size: 10.5px;
          font-weight: 650;
          letter-spacing: -.01em;

          color: #727982;

          margin: 12px 0 10px;
        }

        /* ------------------------------------------------
           CANDIDATE CARD
        ------------------------------------------------ */

        .kb-card {
          position: relative;

          background: var(--surface);

          border: 1px solid var(--line);
          border-radius: 9px;

          padding: 9px 10px;

          display: flex;
          flex-direction: column;
          gap: 7px;

          cursor: grab;

          box-shadow: 0 1px 2px rgba(18,21,27,.025);

          transition:
            border-color .15s ease,
            box-shadow .15s ease,
            transform .15s ease;

          animation: kbIn .25s ease both;
        }

        .kb-card:hover {
          border-color: #C9D0D6;

          box-shadow:
            0 5px 14px -7px rgba(18,21,27,.18);

          transform: translateY(-1px);
        }

        .kb-card:active {
          cursor: grabbing;
        }

        .kb-card.dragging {
          opacity: .55;
          transform: rotate(-1.5deg) scale(.98);
        }

        .kb-card-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 7px;

          cursor: pointer;
        }

        .kb-person {
          display: flex;
          align-items: center;
          gap: 8px;

          min-width: 0;
        }

        .kb-avatar {
          width: 29px;
          height: 29px;

          border-radius: 7px;

          object-fit: cover;

          flex-shrink: 0;
        }

        .kb-person-info {
          min-width: 0;
        }

        .kb-name {
          font-family: "Space Grotesk", sans-serif;
          font-size: 11.5px;
          font-weight: 650;
          letter-spacing: -.01em;

          color: var(--ink);

          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .kb-headline {
          font-size: 9.5px;
          color: #9299A1;

          font-weight: 500;

          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;

          margin-top: 1px;
        }

        .kb-score {
          font-family: Inter, sans-serif;

          font-size: 9px;
          font-weight: 700;

          color: var(--cyan-dark);

          flex-shrink: 0;

          padding-top: 1px;
        }

        .kb-skills {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }

        .kb-skill {
          font-size: 8.5px;
          font-weight: 500;

          color: #737A83;

          background: var(--paper);

          border: 1px solid var(--line-soft);

          padding: 2px 5px;

          border-radius: 4px;
        }

        .kb-card-foot {
          display: flex;
          align-items: center;
          justify-content: space-between;

          border-top: 1px solid var(--line-soft);

          padding-top: 6px;
          margin-top: 1px;
        }

        .kb-action-btn {
          display: flex;
          align-items: center;
          gap: 3px;

          font-size: 9.5px;
          font-weight: 700;

          background: none;
          border: none;

          cursor: pointer;

          color: #777F88;

          padding: 0;
        }

        .kb-action-btn:hover {
          color: var(--cyan-dark);
        }

        /* ------------------------------------------------
           EMPTY STATE
        ------------------------------------------------ */

        .kb-empty-drop {
          font-size: 9.5px;
          font-weight: 500;

          color: #A0A6AD;

          text-align: center;

          padding: 22px 6px;

          border: 1px dashed #D5D8DA;
          border-radius: 8px;

          background: rgba(255,255,255,.45);
        }

        /* ------------------------------------------------
           MOBILE
        ------------------------------------------------ */

        @media (max-width: 760px) {
          .kb-header {
            align-items: flex-start;
            gap: 18px;
            margin-bottom: 0;
          }

          .kb-header-title {
            font-size: 22px;
          }

          .kb-header-right {
            width: 100%;
            padding-top: 0;
          }

          .kb-search {
            min-width: 0;
            flex: 1;
          }

          .kb-filter-wrap {
            flex-shrink: 0;
          }

          .kb-stage-nav {
            overflow-x: auto;
          }

          .kb-stage-track {
            min-width: 560px;
          }
        }
      `}</style>

      {/* HEADER */}

      <div className="kb-header">
        <div className="kb-header-left">
          <h1 className="kb-header-title">
            {t.title}
          </h1>

          <p className="kb-header-sub">
            {t.sub}
          </p>
        </div>

        <div className="kb-header-right">
          <div className="kb-search">
            <Search
              size={13}
              color="#9B9C9E"
            />

            <input
              value={query}
              onChange={(e) =>
                setQuery(e.target.value)
              }
              placeholder={t.searchPh}
              aria-label={t.searchPh}
            />
          </div>

          <div className="kb-filter-wrap">
            <Filter
              size={13}
              color="#9B9C9E"
            />

            <select
              className="kb-filter-select"
              value={selectedJobFilter}
              onChange={(e) =>
                setSelectedJobFilter(
                  e.target.value
                )
              }
              aria-label={t.allRoles}
            >
              <option value="all">
                {t.allRoles}
              </option>

              {jobDescriptions.map((job) => (
                <option
                  key={job.id}
                  value={job.id}
                >
                  {job.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* SIMPLE STAGE NAVIGATION */}

      <div className="kb-stage-nav">
        <div className="kb-stage-track">
          <div className="kb-stage-track-line" />

          {STAGES.map((stage) => {
            const count =
              filteredCandidates.filter(
                (candidate) =>
                  getCandidateStage(
                    candidate.id
                  ) === stage.id
              ).length;

            const isActive = count > 0;

            const stageLabel = isFR
              ? stage.labelFR
              : stage.labelEN;

            return (
              <div
                key={stage.id}
                className={`kb-stage-item${isActive ? ' active' : ''
                  }`}
                onClick={() =>
                  scrollToStage(stage.id)
                }
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (
                    e.key === 'Enter' ||
                    e.key === ' '
                  ) {
                    e.preventDefault();

                    scrollToStage(stage.id);
                  }
                }}
                aria-label={`${stageLabel}: ${count}`}
              >
                <div className="kb-stage-dot">
                  <span className="kb-stage-count">
                    {count}
                  </span>
                </div>

                <span className="kb-stage-name">
                  {stageLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* BOARD */}

      <div className="kb-board">
        {STAGES.map((stage) => {
          const stageCandidates =
            filteredCandidates.filter(
              (candidate) =>
                getCandidateStage(
                  candidate.id
                ) === stage.id
            );

          const isOver =
            dragOverStage === stage.id;

          const isCollapsed =
            collapsed[stage.id];

          const Icon = stage.icon;

          const stageLabel = isFR
            ? stage.labelFR
            : stage.labelEN;

          /* COLLAPSED COLUMN */

          if (isCollapsed) {
            return (
              <div
                key={stage.id}
                ref={(el) => {
                  columnRefs.current[
                    stage.id
                  ] = el;
                }}
                className={`kb-col collapsed${isOver ? ' over' : ''
                  }`}
                onDragOver={(e) =>
                  handleDragOver(
                    e,
                    stage.id
                  )
                }
                onDrop={(e) =>
                  handleDrop(
                    e,
                    stage.id
                  )
                }
              >
                <button
                  type="button"
                  className="kb-col-collapse-btn"
                  onClick={() =>
                    toggleCollapse(
                      stage.id
                    )
                  }
                  aria-label={
                    t.expandColumn
                  }
                  title={
                    t.expandColumn
                  }
                >
                  <ChevronDown
                    size={14}
                  />
                </button>

                <div className="kb-col-vertical">
                  {stageLabel}
                </div>

                <span className="kb-col-count">
                  {
                    stageCandidates.length
                  }
                </span>
              </div>
            );
          }

          /* NORMAL COLUMN */

          return (
            <div
              key={stage.id}
              ref={(el) => {
                columnRefs.current[
                  stage.id
                ] = el;
              }}
              onDragOver={(e) =>
                handleDragOver(
                  e,
                  stage.id
                )
              }
              onDragLeave={() =>
                handleDragLeave(
                  stage.id
                )
              }
              onDrop={(e) =>
                handleDrop(
                  e,
                  stage.id
                )
              }
              className={`kb-col${isOver ? ' over' : ''
                }`}
            >
              <div className="kb-col-head">
                <span className="kb-col-title">
                  <Icon
                    className="kb-col-title-icon"
                    size={13}
                  />

                  <span>
                    {stageLabel}
                  </span>
                </span>

                <div className="kb-col-right">
                  <span className="kb-col-count">
                    {
                      stageCandidates.length
                    }
                  </span>

                  <button
                    type="button"
                    className="kb-col-collapse-btn"
                    onClick={() =>
                      toggleCollapse(
                        stage.id
                      )
                    }
                    aria-label={
                      t.collapseColumn
                    }
                    title={
                      t.collapseColumn
                    }
                  >
                    <ChevronUp
                      size={14}
                    />
                  </button>
                </div>
              </div>

              {stageCandidates.length ===
                0 ? (
                <div className="kb-empty-drop">
                  {t.dropHere}
                </div>
              ) : (
                (() => {
                  const paginatedCandidates =
                    getPaginatedStageCandidates(
                      stageCandidates,
                      stage.id
                    );

                  const totalPages =
                    Math.ceil(
                      stageCandidates.length /
                      CARDS_PER_PAGE
                    );

                  const currentPage =
                    stagePages[
                    stage.id
                    ] || 0;

                  return (
                    <>
                      {paginatedCandidates.map(
                        (candidate) => {
                          const skills =
                            Array.isArray(
                              candidate.skills
                            )
                              ? candidate.skills
                              : (
                                candidate.skills ||
                                ''
                              )
                                .split(',')
                                .map(
                                  (
                                    skill
                                  ) =>
                                    skill.trim()
                                )
                                .filter(
                                  Boolean
                                );

                          return (
                            <div
                              key={
                                candidate.id
                              }
                              draggable
                              onDragStart={(
                                e
                              ) =>
                                handleDragStart(
                                  e,
                                  candidate.id
                                )
                              }
                              onDragEnd={() =>
                                setDraggedId(
                                  null
                                )
                              }
                              className={`kb-card${draggedId ===
                                  candidate.id
                                  ? ' dragging'
                                  : ''
                                }`}
                            >
                              <div
                                className="kb-card-top"
                                onClick={() =>
                                  onViewDetails(
                                    candidate
                                  )
                                }
                                role="button"
                                tabIndex={0}
                                onKeyDown={(
                                  e
                                ) => {
                                  if (
                                    e.key ===
                                    'Enter' ||
                                    e.key ===
                                    ' '
                                  ) {
                                    e.preventDefault();

                                    onViewDetails(
                                      candidate
                                    );
                                  }
                                }}
                                aria-label={
                                  t.viewProfile
                                }
                              >
                                <div className="kb-person">
                                  <img
                                    className="kb-avatar"
                                    src={getAvatarUrl(
                                      candidate.fullName ||
                                      'Candidate',
                                      candidate.avatarUrl
                                    )}
                                    alt={
                                      candidate.fullName ||
                                      (isFR
                                        ? 'Candidat'
                                        : 'Candidate')
                                    }
                                  />

                                  <div className="kb-person-info">
                                    <div
                                      className="kb-name"
                                      title={
                                        candidate.fullName
                                      }
                                    >
                                      {
                                        candidate.fullName
                                      }
                                    </div>

                                    <div
                                      className="kb-headline"
                                      title={
                                        candidate.headline
                                      }
                                    >
                                      {
                                        candidate.headline
                                      }
                                    </div>
                                  </div>
                                </div>

                                {candidate.matchScore !=
                                  null && (
                                    <span className="kb-score">
                                      {
                                        candidate.matchScore
                                      }
                                      %
                                    </span>
                                  )}
                              </div>

                              {skills.length >
                                0 && (
                                  <div className="kb-skills">
                                    {skills
                                      .slice(0, 2)
                                      .map(
                                        (
                                          skill,
                                          i
                                        ) => (
                                          <span
                                            className="kb-skill"
                                            key={i}
                                          >
                                            {
                                              skill
                                            }
                                          </span>
                                        )
                                      )}

                                    {skills.length >
                                      2 && (
                                        <span className="kb-skill">
                                          +
                                          {skills.length -
                                            2}
                                        </span>
                                      )}
                                  </div>
                                )}

                              <div className="kb-card-foot">
                                <button
                                  type="button"
                                  draggable={false}
                                  onMouseDown={(
                                    e
                                  ) =>
                                    e.stopPropagation()
                                  }
                                  onClick={(
                                    e
                                  ) => {
                                    e.stopPropagation();

                                    onViewDetails(
                                      candidate
                                    );
                                  }}
                                  className="kb-action-btn"
                                  aria-label={
                                    t.viewProfile
                                  }
                                  title={
                                    t.viewProfile
                                  }
                                >
                                  <Eye
                                    size={11}
                                  />

                                  <span>
                                    {
                                      t.viewProfile
                                    }
                                  </span>
                                </button>

                                {stage.id !==
                                  'hired' &&
                                  stage.id !==
                                  'rejected' && (
                                    <button
                                      type="button"
                                      draggable={
                                        false
                                      }
                                      onMouseDown={(
                                        e
                                      ) =>
                                        e.stopPropagation()
                                      }
                                      onClick={(
                                        e
                                      ) => {
                                        e.stopPropagation();

                                        const order =
                                          [
                                            'new',
                                            'contacted',
                                            'interview',
                                            'offer',
                                            'hired',
                                          ];

                                        const idx =
                                          order.indexOf(
                                            stage.id
                                          );

                                        if (
                                          idx !==
                                          -1 &&
                                          idx <
                                          order.length -
                                          1
                                        ) {
                                          onUpdateStage(
                                            candidate.id,
                                            order[
                                            idx +
                                            1
                                            ]
                                          );
                                        }
                                      }}
                                      className="kb-action-btn"
                                      aria-label={
                                        t.advanceNext
                                      }
                                      title={
                                        t.advanceNext
                                      }
                                    >
                                      <span>
                                        {
                                          t.advanceNext
                                        }
                                      </span>

                                      <ChevronRight
                                        size={
                                          11
                                        }
                                      />
                                    </button>
                                  )}
                              </div>
                            </div>
                          );
                        }
                      )}

                      {/* PAGINATION */}

                      {totalPages > 1 && (
                        <div
                          style={{
                            display:
                              'flex',
                            alignItems:
                              'center',
                            justifyContent:
                              'center',
                            gap: 8,
                            padding:
                              '12px 8px',
                            marginTop:
                              '8px',
                          }}
                        >
                          {/* PREVIOUS */}

                          <button
                            type="button"
                            onClick={() =>
                              handleStagePageChange(
                                stage.id,
                                Math.max(
                                  0,
                                  currentPage -
                                  1
                                )
                              )
                            }
                            disabled={
                              currentPage ===
                              0
                            }
                            aria-label={
                              t.previousPage
                            }
                            title={
                              t.previousPage
                            }
                            style={{
                              display:
                                'flex',
                              alignItems:
                                'center',
                              gap: 4,
                              padding:
                                '6px 10px',
                              border:
                                '1px solid #E4E1D9',
                              borderRadius: 6,
                              background:
                                currentPage ===
                                  0
                                  ? '#F7F5F1'
                                  : '#FFFFFF',
                              color:
                                currentPage ===
                                  0
                                  ? '#9B9C9E'
                                  : '#12151B',
                              fontSize: 11,
                              fontWeight: 600,
                              cursor:
                                currentPage ===
                                  0
                                  ? 'not-allowed'
                                  : 'pointer',
                              transition:
                                'all 0.15s ease',
                            }}
                            onMouseEnter={(
                              e
                            ) => {
                              if (
                                currentPage !==
                                0
                              ) {
                                e.target.style.background =
                                  '#F7F5F1';

                                e.target.style.borderColor =
                                  '#D8D4CA';
                              }
                            }}
                            onMouseLeave={(
                              e
                            ) => {
                              if (
                                currentPage !==
                                0
                              ) {
                                e.target.style.background =
                                  '#FFFFFF';

                                e.target.style.borderColor =
                                  '#E4E1D9';
                              }
                            }}
                          >
                            <ChevronLeft
                              size={12}
                            />
                          </button>

                          {/* PAGE NUMBERS */}

                          <div
                            style={{
                              display:
                                'flex',
                              gap: 4,
                            }}
                          >
                            {Array.from(
                              {
                                length:
                                  totalPages,
                              },
                              (_, i) => (
                                <button
                                  type="button"
                                  key={i}
                                  onClick={() =>
                                    handleStagePageChange(
                                      stage.id,
                                      i
                                    )
                                  }
                                  aria-label={`${t.page} ${i + 1
                                    }`}
                                  title={`${t.page} ${i + 1
                                    }`}
                                  style={{
                                    display:
                                      'flex',
                                    alignItems:
                                      'center',
                                    justifyContent:
                                      'center',
                                    width: 28,
                                    height: 28,
                                    border:
                                      currentPage ===
                                        i
                                        ? '1px solid #0E7C8C'
                                        : '1px solid #E4E1D9',
                                    borderRadius: 6,
                                    background:
                                      currentPage ===
                                        i
                                        ? '#0E7C8C'
                                        : '#FFFFFF',
                                    color:
                                      currentPage ===
                                        i
                                        ? '#FFFFFF'
                                        : '#12151B',
                                    fontSize: 11,
                                    fontWeight: 600,
                                    cursor:
                                      'pointer',
                                    transition:
                                      'all 0.15s ease',
                                  }}
                                  onMouseEnter={(
                                    e
                                  ) => {
                                    if (
                                      currentPage !==
                                      i
                                    ) {
                                      e.target.style.background =
                                        '#F7F5F1';

                                      e.target.style.borderColor =
                                        '#D8D4CA';
                                    }
                                  }}
                                  onMouseLeave={(
                                    e
                                  ) => {
                                    if (
                                      currentPage !==
                                      i
                                    ) {
                                      e.target.style.background =
                                        '#FFFFFF';

                                      e.target.style.borderColor =
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
                              handleStagePageChange(
                                stage.id,
                                Math.min(
                                  totalPages -
                                  1,
                                  currentPage +
                                  1
                                )
                              )
                            }
                            disabled={
                              currentPage >=
                              totalPages - 1
                            }
                            aria-label={
                              t.nextPage
                            }
                            title={
                              t.nextPage
                            }
                            style={{
                              display:
                                'flex',
                              alignItems:
                                'center',
                              gap: 4,
                              padding:
                                '6px 10px',
                              border:
                                '1px solid #E4E1D9',
                              borderRadius: 6,
                              background:
                                currentPage >=
                                  totalPages - 1
                                  ? '#F7F5F1'
                                  : '#FFFFFF',
                              color:
                                currentPage >=
                                  totalPages - 1
                                  ? '#9B9C9E'
                                  : '#12151B',
                              fontSize: 11,
                              fontWeight: 600,
                              cursor:
                                currentPage >=
                                  totalPages - 1
                                  ? 'not-allowed'
                                  : 'pointer',
                              transition:
                                'all 0.15s ease',
                            }}
                            onMouseEnter={(
                              e
                            ) => {
                              if (
                                currentPage <
                                totalPages - 1
                              ) {
                                e.target.style.background =
                                  '#F7F5F1';

                                e.target.style.borderColor =
                                  '#D8D4CA';
                              }
                            }}
                            onMouseLeave={(
                              e
                            ) => {
                              if (
                                currentPage <
                                totalPages - 1
                              ) {
                                e.target.style.background =
                                  '#FFFFFF';

                                e.target.style.borderColor =
                                  '#E4E1D9';
                              }
                            }}
                          >
                            <ChevronRight
                              size={12}
                            />
                          </button>
                        </div>
                      )}
                    </>
                  );
                })()
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default KanbanPipeline;