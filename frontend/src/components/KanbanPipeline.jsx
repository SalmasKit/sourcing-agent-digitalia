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
  Kanban,
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

function useLanguage() {
  return { lang: 'EN' };
}

function getAvatarUrl(name) {
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
    name
  )}&backgroundColor=12151B&textColor=ffffff&fontWeight=600&fontSize=38`;
}

export const STAGES = [
  { id: 'new', labelFR: 'Nouveau', labelEN: 'New', icon: Users },
  { id: 'contacted', labelFR: 'Contacté', labelEN: 'Contacted', icon: Mail },
  { id: 'interview', labelFR: 'Entretien', labelEN: 'Interview', icon: Calendar },
  { id: 'offer', labelFR: 'Offre Proposée', labelEN: 'Offer Extended', icon: Award },
  { id: 'hired', labelFR: 'Recruté', labelEN: 'Hired', icon: CheckCircle2 },
  { id: 'rejected', labelFR: 'Refusé / Archivé', labelEN: 'Refused / Archived', icon: XCircle },
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
  },
  FR: {
    title: 'Pipeline de recrutement',
    sub: 'Faites évoluer les candidats dans votre processus',
    allRoles: 'Tous les postes',
    dropHere: 'Déposer ici',
    viewProfile: 'Profil',
    advanceNext: 'Suivant',
    searchPh: 'Filtrer par nom, poste ou compétence…',
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
      'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap';

    document.head.appendChild(link);
  }, []);
}

export function KanbanPipeline({
  candidates = [],
  jobDescriptions = [],
  savedRoleCandidates = {},
  candidatePipelineStage = {},
  onUpdateStage = () => {},
  onViewDetails = () => {},
}) {
  useFonts();

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

  const jobFiltered = candidates.filter((candidate) => {
    if (selectedJobFilter === 'all') return true;

    const savedIds = savedRoleCandidates[selectedJobFilter] || [];

    return (
      savedIds.includes(candidate.id) ||
      candidate.jobId === selectedJobFilter
    );
  });

  const filteredCandidates = query.trim()
    ? jobFiltered.filter((candidate) => {
        const q = query.toLowerCase();

        const skills = Array.isArray(candidate.skills)
          ? candidate.skills.join(' ')
          : candidate.skills || '';

        return (
          candidate.fullName?.toLowerCase().includes(q) ||
          candidate.headline?.toLowerCase().includes(q) ||
          skills.toLowerCase().includes(q)
        );
      })
    : jobFiltered;

  const getCandidateStage = (id) =>
    candidatePipelineStage[id] || 'new';

  function scrollToStage(stageId) {
    columnRefs.current[stageId]?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    });
  }

  function toggleCollapse(stageId) {
    setCollapsed((prev) => ({
      ...prev,
      [stageId]: !prev[stageId],
    }));
  }

  function handleStagePageChange(stageId, newPage) {
    setStagePages(prev => ({
      ...prev,
      [stageId]: newPage
    }));
  }

  function getPaginatedStageCandidates(stageCandidates, stageId) {
    const currentPage = stagePages[stageId] || 0;
    const totalPages = Math.ceil(stageCandidates.length / CARDS_PER_PAGE);
    const validPage = Math.min(currentPage, totalPages - 1);
    
    if (totalPages <= 1) return stageCandidates;
    
    return stageCandidates.slice(
      validPage * CARDS_PER_PAGE,
      validPage * CARDS_PER_PAGE + CARDS_PER_PAGE
    );
  }

  function handleDragStart(e, candidateId) {
    e.dataTransfer.setData('text/plain', candidateId);
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
      e.dataTransfer.getData('text/plain') || draggedId;

    if (candidateId) {
      onUpdateStage(candidateId, targetStageId);
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
            border-color: #0E7C8C;
          }
        }

        .kb-root {
          --cyan: #0E7C8C;
          --cyan-soft: #E1F2F3;
          --cyan-light: #8CCDD3;

          --ink: #12151B;
          --ink-2: #3A414B;
          --muted: #8A929C;

          --paper: #FBFAF7;
          --surface: #FFFFFF;

          --line: #E4E1D9;
          --line-soft: #EFEDE7;

          font-family: 'Inter', system-ui, sans-serif;
          color: var(--ink);
          background: var(--paper);

          max-width: 1220px;
          margin: 0 auto;
          padding: 24px;

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
          align-items: center;
          justify-content: space-between;
          gap: 16px;

          padding: 4px 0 10px;

          flex-wrap: wrap;
        }

        .kb-header-left {
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .kb-header-icon {
          width: 34px;
          height: 34px;

          border-radius: 9px;

          background: var(--cyan-soft);
          color: var(--cyan);

          display: flex;
          align-items: center;
          justify-content: center;

          flex-shrink: 0;
        }

        .kb-header-title {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 17px;
          line-height: 1.1;
          font-weight: 700;
          margin: 0;
          letter-spacing: -0.02em;
        }

        .kb-header-sub {
          font-size: 11px;
          color: var(--muted);
          margin-top: 4px;
        }

        .kb-header-right {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
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
          box-shadow: 0 0 0 3px rgba(14,124,140,.08);
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

          background: #DDE1E5;

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
          color: var(--cyan);
        }

        .kb-stage-item.active .kb-stage-dot {
          background: var(--cyan);
          border-color: var(--cyan);
        }

        .kb-stage-count {
          font-family: 'JetBrains Mono', monospace;
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

          background: var(--surface);
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

          background: #F7F7F4;

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
          background: #F4FAFB;
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

          font-size: 10.5px;
          font-weight: 700;

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
          font-family: 'JetBrains Mono', monospace;

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
          color: var(--cyan);
          background: var(--cyan-soft);
        }

        .kb-col-vertical {
          writing-mode: vertical-rl;
          transform: rotate(180deg);

          font-size: 10px;
          font-weight: 700;

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
          font-size: 11.5px;
          font-weight: 700;

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

        /* Simple score — no pill/background */

        .kb-score {
          font-family: 'JetBrains Mono', monospace;

          font-size: 9px;
          font-weight: 700;

          color: var(--cyan);

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

          background: #F4F4F1;

          border: 1px solid #E7E5DF;

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
          color: var(--cyan);
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
          .kb-root {
            padding: 16px;
          }

          .kb-header {
            align-items: flex-start;
          }

          .kb-header-right {
            width: 100%;
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
          <div className="kb-header-icon">
            <Kanban size={17} />
          </div>

          <div>
            <h2 className="kb-header-title">
              {t.title}
            </h2>

            <div className="kb-header-sub">
              {t.sub}
            </div>
          </div>
        </div>

        <div className="kb-header-right">
          <div className="kb-search">
            <Search size={13} color="#9B9C9E" />

            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.searchPh}
            />
          </div>

          <div className="kb-filter-wrap">
            <Filter size={13} color="#9B9C9E" />

            <select
              className="kb-filter-select"
              value={selectedJobFilter}
              onChange={(e) =>
                setSelectedJobFilter(e.target.value)
              }
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
            const count = filteredCandidates.filter(
              (candidate) =>
                getCandidateStage(candidate.id) === stage.id
            ).length;

            const isActive = count > 0;

            return (
              <div
                key={stage.id}
                className={`kb-stage-item${
                  isActive ? ' active' : ''
                }`}
                onClick={() => scrollToStage(stage.id)}
              >
                <div className="kb-stage-dot">
                  <span className="kb-stage-count">
                    {count}
                  </span>
                </div>

                <span className="kb-stage-name">
                  {isFR
                    ? stage.labelFR
                    : stage.labelEN}
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
                getCandidateStage(candidate.id) === stage.id
            );

          const isOver =
            dragOverStage === stage.id;

          const isCollapsed =
            collapsed[stage.id];

          const Icon = stage.icon;

          /* COLLAPSED COLUMN */

          if (isCollapsed) {
            return (
              <div
                key={stage.id}
                ref={(el) =>
                  (columnRefs.current[stage.id] = el)
                }
                className={`kb-col collapsed${
                  isOver ? ' over' : ''
                }`}
                onDragOver={(e) =>
                  handleDragOver(e, stage.id)
                }
                onDrop={(e) =>
                  handleDrop(e, stage.id)
                }
              >
                <button
                  className="kb-col-collapse-btn"
                  onClick={() =>
                    toggleCollapse(stage.id)
                  }
                  aria-label="Expand column"
                >
                  <ChevronDown size={14} />
                </button>

                <div className="kb-col-vertical">
                  {isFR
                    ? stage.labelFR
                    : stage.labelEN}
                </div>

                <span className="kb-col-count">
                  {stageCandidates.length}
                </span>
              </div>
            );
          }

          /* NORMAL COLUMN */

          return (
            <div
              key={stage.id}
              ref={(el) =>
                (columnRefs.current[stage.id] = el)
              }
              onDragOver={(e) =>
                handleDragOver(e, stage.id)
              }
              onDragLeave={() =>
                handleDragLeave(stage.id)
              }
              onDrop={(e) =>
                handleDrop(e, stage.id)
              }
              className={`kb-col${
                isOver ? ' over' : ''
              }`}
            >
              <div className="kb-col-head">
                <span className="kb-col-title">
                  <Icon
                    className="kb-col-title-icon"
                    size={13}
                  />

                  <span>
                    {isFR
                      ? stage.labelFR
                      : stage.labelEN}
                  </span>
                </span>

                <div className="kb-col-right">
                  <span className="kb-col-count">
                    {stageCandidates.length}
                  </span>

                  <button
                    className="kb-col-collapse-btn"
                    onClick={() =>
                      toggleCollapse(stage.id)
                    }
                    aria-label="Collapse column"
                  >
                    <ChevronUp size={14} />
                  </button>
                </div>
              </div>

              {stageCandidates.length === 0 ? (
                <div className="kb-empty-drop">
                  {t.dropHere}
                </div>
              ) : (
                (() => {
                  const paginatedCandidates = getPaginatedStageCandidates(stageCandidates, stage.id);
                  const totalPages = Math.ceil(stageCandidates.length / CARDS_PER_PAGE);
                  const currentPage = stagePages[stage.id] || 0;

                  return (
                    <>
                      {paginatedCandidates.map((candidate) => {
                        const skills = Array.isArray(
                          candidate.skills
                        )
                          ? candidate.skills
                          : (
                              candidate.skills || ''
                            )
                              .split(',')
                              .map((skill) =>
                                skill.trim()
                              )
                              .filter(Boolean);

                        return (
                    <div
                      key={candidate.id}
                      draggable
                      onDragStart={(e) =>
                        handleDragStart(
                          e,
                          candidate.id
                        )
                      }
                      onDragEnd={() =>
                        setDraggedId(null)
                      }
                      className={`kb-card${
                        draggedId === candidate.id
                          ? ' dragging'
                          : ''
                      }`}
                    >
                      <div
                        className="kb-card-top"
                        onClick={() =>
                          onViewDetails(candidate)
                        }
                      >
                        <div className="kb-person">
                          <img
                            className="kb-avatar"
                            src={getAvatarUrl(
                              candidate.fullName
                            )}
                            alt={
                              candidate.fullName
                            }
                          />

                          <div className="kb-person-info">
                            <div
                              className="kb-name"
                              title={
                                candidate.fullName
                              }
                            >
                              {candidate.fullName}
                            </div>

                            <div
                              className="kb-headline"
                              title={
                                candidate.headline
                              }
                            >
                              {candidate.headline}
                            </div>
                          </div>
                        </div>

                        {candidate.matchScore != null && (
                          <span className="kb-score">
                            {candidate.matchScore}%
                          </span>
                        )}
                      </div>

                      {skills.length > 0 && (
                        <div className="kb-skills">
                          {skills
                            .slice(0, 2)
                            .map((skill, i) => (
                              <span
                                className="kb-skill"
                                key={i}
                              >
                                {skill}
                              </span>
                            ))}

                          {skills.length > 2 && (
                            <span className="kb-skill">
                              +{skills.length - 2}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="kb-card-foot">
                        <button
                          type="button"
                          draggable={false}
                          onMouseDown={(e) =>
                            e.stopPropagation()
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewDetails(candidate);
                          }}
                          className="kb-action-btn"
                        >
                          <Eye size={11} />
                          <span>
                            {t.viewProfile}
                          </span>
                        </button>

                        {stage.id !== 'hired' &&
                          stage.id !== 'rejected' && (
                            <button
                              type="button"
                              draggable={false}
                              onMouseDown={(e) =>
                                e.stopPropagation()
                              }
                              onClick={(e) => {
                                e.stopPropagation();

                                const order = [
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
                                  idx !== -1 &&
                                  idx <
                                    order.length - 1
                                ) {
                                  onUpdateStage(
                                    candidate.id,
                                    order[idx + 1]
                                  );
                                }
                              }}
                              className="kb-action-btn"
                            >
                              <span>
                                {t.advanceNext}
                              </span>

                              <ChevronRight
                                size={11}
                              />
                            </button>
                          )}
                      </div>
                    </div>
                      );
                    })}

                {/* Pagination Controls for Stage */}
                {totalPages > 1 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '8px 4px',
                    marginTop: '4px',
                  }}>
                    <button
                      onClick={() => handleStagePageChange(stage.id, Math.max(0, currentPage - 1))}
                      disabled={currentPage === 0}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 24,
                        height: 24,
                        border: '1px solid #D8D4CA',
                        borderRadius: 6,
                        background: currentPage === 0 ? '#F7F5F1' : '#FFFFFF',
                        color: currentPage === 0 ? '#9B9C9E' : '#12151B',
                        cursor: currentPage === 0 ? 'not-allowed' : 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (currentPage !== 0) {
                          e.target.style.background = '#F7F5F1';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (currentPage !== 0) {
                          e.target.style.background = '#FFFFFF';
                        }
                      }}
                    >
                      <ChevronLeft size={12} />
                    </button>

                    <span style={{
                      fontSize: '9px',
                      fontWeight: 600,
                      color: '#737A83',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      {currentPage + 1}/{totalPages}
                    </span>

                    <button
                      onClick={() => handleStagePageChange(stage.id, Math.min(totalPages - 1, currentPage + 1))}
                      disabled={currentPage >= totalPages - 1}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 24,
                        height: 24,
                        border: '1px solid #D8D4CA',
                        borderRadius: 6,
                        background: currentPage >= totalPages - 1 ? '#F7F5F1' : '#FFFFFF',
                        color: currentPage >= totalPages - 1 ? '#9B9C9E' : '#12151B',
                        cursor: currentPage >= totalPages - 1 ? 'not-allowed' : 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (currentPage < totalPages - 1) {
                          e.target.style.background = '#F7F5F1';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (currentPage < totalPages - 1) {
                          e.target.style.background = '#FFFFFF';
                        }
                      }}
                    >
                      <ChevronRight size={12} />
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