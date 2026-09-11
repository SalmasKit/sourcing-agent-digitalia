/**
 * DashboardView — workspace redesign
 *
 * Design direction:
 *  - One coherent dashboard instead of a collection of equal cards.
 *  - Cyan is the only accent, matching the candidate UI.
 *  - Large editorial hero with a dominant match-quality metric.
 *  - Pipeline becomes an interactive journey.
 *  - Candidates become a horizontal ranked queue.
 *  - Jobs/searches become a compact activity workspace.
 *  - AI performance is integrated into the dashboard rather than another card.
 *
 * Interactions:
 *  - Pipeline stages filter the dashboard.
 *  - "Clear" removes the stage filter.
 *  - Candidate rows/cards are clickable.
 *  - Job rows are selectable.
 *  - Search history can be rerun.
 *  - Score distribution segments are clickable.
 *
 * Layout fix:
 *  - "Highest matches" and "Match distribution" panels now stretch to
 *    equal height via CSS grid + flex, so the empty state in the
 *    candidates panel matches the score-distribution panel's height
 *    instead of collapsing to a small fixed box.
 */

import React, {
  useMemo,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  Users,
  FileText,
  TrendingUp,
  BookmarkCheck,
  Search,
  Sparkles,
  RotateCw,
  ArrowUpRight,
  ChevronRight,
  SlidersHorizontal,
  Target,
  BriefcaseBusiness,
  Check,
  X,
} from 'lucide-react';
import ActivityLogPanel from './ActivityLogPanel';

function useLanguage() {
  return { lang: 'EN' };
}

function getAvatarUrl(name) {
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
    name || 'Candidate'
  )}&backgroundColor=12151B&textColor=ffffff&fontWeight=600&fontSize=38`;
}

const COPY = {
  EN: {
    eyebrow: 'RECRUITING OVERVIEW',
    welcome: (n) => `Good to see you, ${n}`,
    workspaceNote:
      'Your hiring workspace — aggregate insights across all roles',
    matchQuality: 'Average match across all roles',
    activeJDs: 'Total roles',
    sourced: 'Total candidates',
    shortlisted: 'Total shortlisted',

    pipeline: 'Pipeline',
    allStages: 'All stages',
    clearFilter: 'Clear',
    candidates: 'candidates',

    leaderboard: 'Highest matches',
    noCandidates: 'No candidates sourced yet',

    scoreDist: 'Match distribution',
    scoreHint: 'Overview of candidate match scores',

    activity: 'Workspace activity',
    jobsTab: 'Roles',

    noJDs: 'No job descriptions yet',

    saved: 'shortlisted',
    results: 'results',

    agent: 'AI sourcing',
    avgMatch: 'avg match',
    inPipeline: 'in pipeline',
    profiles: 'profiles',

    selected: 'Selected',
    stage: 'Stage',

    stages: {
      new: 'New',
      contacted: 'Contacted',
      interview: 'Interview',
      offer: 'Offer Extended',
      hired: 'Hired',
    },

    ranges: {
      high: '90–100',
      strong: '80–89',
      potential: '70–79',
      low: '<70',
    },
  },

  FR: {
    eyebrow: 'VUE DU RECRUTEMENT',
    welcome: (n) => `Ravi de vous revoir, ${n}`,
    workspaceNote:
      'Votre espace de recrutement — vue globale de tous les postes',
    matchQuality: 'Score moyen tous postes confondus',
    activeJDs: 'Total des postes',
    sourced: 'Total candidats',
    shortlisted: 'Total shortlistés',

    pipeline: 'Pipeline',
    allStages: 'Toutes les étapes',
    clearFilter: 'Effacer',
    candidates: 'candidats',

    leaderboard: 'Meilleures correspondances',
    noCandidates: 'Aucun candidat sourcé',

    scoreDist: 'Distribution des scores',
    scoreHint: 'Aperçu des scores de correspondance',

    activity: 'Activité',
    jobsTab: 'Postes',

    noJDs: 'Aucune fiche de poste',

    saved: 'shortlistés',
    results: 'résultats',

    agent: 'Sourcing IA',
    avgMatch: 'score moyen',
    inPipeline: 'pipeline',
    profiles: 'profils',

    selected: 'Sélectionné',
    stage: 'Étape',

    stages: {
      new: 'Nouveau',
      contacted: 'Contacté',
      interview: 'Entretien',
      offer: 'Offre Proposée',
      hired: 'Recruté',
    },

    ranges: {
      high: '90–100',
      strong: '80–89',
      potential: '70–79',
      low: '<70',
    },
  },
};

/* -------------------------------------------------------
   Count-up
------------------------------------------------------- */

function useCountUp(target, duration = 700) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let frame;
    let start = null;

    const step = (timestamp) => {
      if (!start) start = timestamp;

      const progress = Math.min(
        (timestamp - start) / duration,
        1
      );

      setValue(Math.round(progress * target));

      if (progress < 1) {
        frame = requestAnimationFrame(step);
      }
    };

    frame = requestAnimationFrame(step);

    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

/* -------------------------------------------------------
   Match Ring
------------------------------------------------------- */

function MatchRing({ percentage, size = 138 }) {
  const [drawn, setDrawn] = useState(0);

  const radius = 53;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDrawn(percentage);
    }, 100);

    return () => clearTimeout(timer);
  }, [percentage]);

  return (
    <div className="db3-ring">
      <svg
        width={size}
        height={size}
        viewBox="0 0 132 132"
      >
        <circle
          cx="66"
          cy="66"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.10)"
          strokeWidth="9"
        />

        <circle
          cx="66"
          cy="66"
          r={radius}
          fill="none"
          stroke="#0BA5C9"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={
            circumference -
            (drawn / 100) * circumference
          }
          transform="rotate(-90 66 66)"
          style={{
            transition:
              'stroke-dashoffset 1s cubic-bezier(.22,1,.36,1)',
          }}
        />

        <text
          x="66"
          y="61"
          textAnchor="middle"
          fontSize="29"
          fontWeight="700"
          fill="#fff"
          fontFamily="'Space Grotesk', sans-serif"
        >
          {percentage}%
        </text>

        <text
          x="66"
          y="78"
          textAnchor="middle"
          fontSize="8.5"
          fontWeight="600"
          fill="rgba(255,255,255,.48)"
          fontFamily="'JetBrains Mono', monospace"
        >
          MATCH
        </text>
      </svg>
    </div>
  );
}

/* -------------------------------------------------------
   Fonts
------------------------------------------------------- */

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

/* -------------------------------------------------------
   Main
------------------------------------------------------- */

export function DashboardView({
  user = null,
  jobDescriptions = [],
  candidates = [],
  savedRoleCandidates = {},
  candidatePipelineStage = {},

  lang: langProp = null,
  activities = [],

  onStageClick = null,
  onSelectJob = null,
  onSelectCandidate = null,
}) {
  useFonts();

  const langContext = useLanguage();

  const t =
    COPY[langProp || langContext?.lang || 'EN'] ||
    COPY.EN;

  const [focusedStage, setFocusedStage] =
    useState(null);

  const [selectedJobId, setSelectedJobId] =
    useState(null);

  const [selectedRange, setSelectedRange] =
    useState(null);

  const [candidatePage, setCandidatePage] = useState(0);

  const CANDIDATE_PAGE_SIZE = 3;

  /* -------------------------------------------------------
     Stats
  ------------------------------------------------------- */

  const stats = useMemo(() => {
    const totalJDs = jobDescriptions.length;

    const activeJDs =
      jobDescriptions.filter(
        (job) => job.status !== 'archived'
      ).length;

    const totalCandidates = candidates.length;

    /*
     * IMPORTANT:
     * Pipeline membership must come from savedRoleCandidates,
     * not from every candidate in the global candidates array.
     *
     * A candidate is in the pipeline when they appear in at least
     * one role's saved candidate list.
     */

    const pipelineCandidateIds = new Set(
      Object.values(savedRoleCandidates)
        .flat()
        .filter(Boolean)
    );

    const pipelineCandidates = candidates.filter(
      (candidate) =>
        pipelineCandidateIds.has(candidate.id)
    );

    /*
     * Keep this EXACTLY aligned with KanbanPipeline.
     */

    const getCandidateStage = (candidate) =>
      candidatePipelineStage[candidate.id] || 'new';

    const stages = [
      'new',
      'contacted',
      'interview',
      'offer',
      'hired',
    ].reduce((acc, key) => {
      acc[key] = pipelineCandidates.filter(
        (candidate) =>
          getCandidateStage(candidate) === key
      ).length;

      return acc;
    }, {});

    const totalInPipeline =
      stages.new +
      stages.contacted +
      stages.interview +
      stages.offer +
      stages.hired;

    const uniqueSavedCount = totalInPipeline;

    const avgScore =
      totalCandidates > 0
        ? Math.round(
          candidates.reduce(
            (sum, candidate) =>
              sum + (candidate.matchScore || 0),
            0
          ) / totalCandidates
        )
        : 0;

    const ranked = [...candidates].sort(
      (a, b) =>
        (b.matchScore || 0) -
        (a.matchScore || 0)
    );

    const scoreDist = [
      {
        key: 'high',
        label: t.ranges.high,
        value: candidates.filter(
          (c) => (c.matchScore || 0) >= 90
        ).length,
      },
      {
        key: 'strong',
        label: t.ranges.strong,
        value: candidates.filter(
          (c) =>
            (c.matchScore || 0) >= 80 &&
            (c.matchScore || 0) < 90
        ).length,
      },
      {
        key: 'potential',
        label: t.ranges.potential,
        value: candidates.filter(
          (c) =>
            (c.matchScore || 0) >= 70 &&
            (c.matchScore || 0) < 80
        ).length,
      },
      {
        key: 'low',
        label: t.ranges.low,
        value: candidates.filter(
          (c) => (c.matchScore || 0) < 70
        ).length,
      },
    ];

    return {
      totalJDs,
      activeJDs,
      totalCandidates,
      uniqueSavedCount,
      avgScore,
      ranked,
      stages,
      totalInPipeline,
      scoreDist,
    };
  }, [
    jobDescriptions,
    candidates,
    savedRoleCandidates,
    candidatePipelineStage,
    t,
  ]);

  /* -------------------------------------------------------
     Pipeline
  ------------------------------------------------------- */

  const funnel = [
    {
      key: 'new',
      label: t.stages.new,
      value: stats.stages.new,
    },
    {
      key: 'contacted',
      label: t.stages.contacted,
      value: stats.stages.contacted,
    },
    {
      key: 'interview',
      label: t.stages.interview,
      value: stats.stages.interview,
    },
    {
      key: 'offer',
      label: t.stages.offer,
      value: stats.stages.offer,
    },
    {
      key: 'hired',
      label: t.stages.hired,
      value: stats.stages.hired,
    },
  ];

  /* -------------------------------------------------------
     Animated stats
  ------------------------------------------------------- */

  const activeJDsCount =
    useCountUp(stats.activeJDs);

  const sourcedCount =
    useCountUp(stats.totalCandidates);

  const shortlistedCount =
    useCountUp(
      stats.uniqueSavedCount
    );

  /* -------------------------------------------------------
     Filtered candidates
  ------------------------------------------------------- */

  const filteredCandidates = useMemo(() => {
    let result = stats.ranked;

    if (focusedStage) {
      result = result.filter(
        (candidate) =>
          (candidatePipelineStage[candidate.id] || 'new') ===
          focusedStage
      );
    }

    if (selectedRange) {
      result = result.filter((candidate) => {
        const score = candidate.matchScore || 0;

        if (selectedRange === 'high') {
          return score >= 90;
        }

        if (selectedRange === 'strong') {
          return score >= 80 && score < 90;
        }

        if (selectedRange === 'potential') {
          return score >= 70 && score < 80;
        }

        return score < 70;
      });
    }

    return result;
  }, [
    stats.ranked,
    focusedStage,
    selectedRange,
    candidatePipelineStage,
  ]);

  // When no stage filter is active, use ranked candidates by match score
  const displayCandidates = useMemo(() => {
    return focusedStage
      ? filteredCandidates
      : stats.ranked;
  }, [
    focusedStage,
    filteredCandidates,
    stats.ranked,
  ]);

  // Reset to page 0 when filters change
  useEffect(() => {
    setCandidatePage(0);
  }, [focusedStage]);

  // Pagination for candidates - show top 3 matches per page
  const totalCandidatePages = Math.ceil(
    displayCandidates.length /
    CANDIDATE_PAGE_SIZE
  );

  const paginatedCandidates = useMemo(() => {
    const start =
      candidatePage * CANDIDATE_PAGE_SIZE;

    const end =
      start + CANDIDATE_PAGE_SIZE;

    return displayCandidates.slice(
      start,
      end
    );
  }, [
    displayCandidates,
    candidatePage,
  ]);

  /* -------------------------------------------------------
     Handlers
  ------------------------------------------------------- */

  function handleStageClick(key) {
    const next =
      focusedStage === key ? null : key;

    setFocusedStage(next);

    onStageClick?.(next);
  }

  function handleSelectJob(id) {
    setSelectedJobId((current) =>
      current === id ? null : id
    );

    onSelectJob?.(id);
  }

  function handleRangeClick(key) {
    // Disabled - match distribution is no longer clickable
    return;
  }

  function clearFilters() {
    setFocusedStage(null);
    setSelectedRange(null);

    onStageClick?.(null);
  }

  const hasFilters =
    focusedStage || selectedRange;

  /* -------------------------------------------------------
     Render
  ------------------------------------------------------- */

  return (
    <div className="db3-root">
      <style>{`
        @keyframes db3Fade {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes db3Line {
          from {
            transform: scaleX(0);
          }
          to {
            transform: scaleX(1);
          }
        }

        .db3-root {
          --ink: #12151B;
          --muted: #777A82;
          --soft: #9B9DA2;
          --border: #E4E1D9;
          --paper: #FBFAF7;
          --surface: #FFFFFF;
          --cyan: #0BA5C9;
          --cyan-dark: #087D98;
          --cyan-soft: #EAF8FB;

          min-height: 100%;
          box-sizing: border-box;

          background: var(--paper);
          color: var(--ink);

          padding: 30px;
          max-width: 1240px;
          margin: 0 auto;

          font-family:
            'Inter',
            system-ui,
            sans-serif;
        }

        .db3-root *,
        .db3-root *::before,
        .db3-root *::after {
          box-sizing: border-box;
        }

        .db3-main {
          display: flex;
          flex-direction: column;
          gap: 22px;
        }

        /* -----------------------------------------------
           HEADER
        ----------------------------------------------- */

        .db3-page-head {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 24px;
          padding: 2px 2px 4px;
        }

        .db3-eyebrow {
          font-family:
            'JetBrains Mono',
            monospace;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: .12em;
          color: var(--cyan-dark);
          margin-bottom: 7px;
        }

        .db3-title {
          margin: 0;
          font-family:
            'Space Grotesk',
            sans-serif;
          font-size: 25px;
          line-height: 1.05;
          letter-spacing: -.03em;
          font-weight: 700;
        }

        .db3-page-note {
          font-size: 11px;
          color: var(--soft);
          margin-top: 7px;
        }

        .db3-head-status {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 10px;
          color: var(--muted);
          white-space: nowrap;
        }

        .db3-live-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--cyan);
          box-shadow: 0 0 0 4px var(--cyan-soft);
        }

        /* -----------------------------------------------
           HERO
        ----------------------------------------------- */

        .db3-hero {
          position: relative;
          overflow: hidden;

          background: var(--ink);
          color: white;

          border-radius: 20px;
          padding: 25px 27px;

          display: grid;
          grid-template-columns:
            minmax(260px, 1.2fr)
            minmax(390px, 1fr);
          gap: 28px;

          min-height: 188px;

          animation:
            db3Fade .45s ease both;
        }

        .db3-hero::after {
          content: '';
          position: absolute;
          right: -80px;
          bottom: -110px;

          width: 300px;
          height: 300px;

          border: 1px solid rgba(11,165,201,.15);
          border-radius: 50%;

          pointer-events: none;
        }

        .db3-hero-left {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          z-index: 1;
        }

        .db3-hero-welcome {
          font-family:
            'Space Grotesk',
            sans-serif;
          font-size: 17px;
          font-weight: 700;
          letter-spacing: -.015em;
        }

        .db3-role {
          display: inline-flex;
          align-items: center;

          margin-left: 8px;
          padding: 3px 7px;

          border:
            1px solid
            rgba(11,165,201,.35);

          border-radius: 999px;

          color: #8FDCEE;

          font-family:
            'JetBrains Mono',
            monospace;

          font-size: 8px;
          font-weight: 600;
          letter-spacing: .04em;
        }

        .db3-hero-description {
          max-width: 400px;

          font-size: 11px;
          line-height: 1.65;

          color: rgba(255,255,255,.48);

          margin-top: 13px;
        }

        .db3-hero-mini {
          display: flex;
          gap: 22px;
          margin-top: 20px;
        }

        .db3-mini {
          display: flex;
          align-items: center;
          gap: 7px;

          font-size: 9.5px;
          color: rgba(255,255,255,.48);
        }

        .db3-mini strong {
          font-family:
            'JetBrains Mono',
            monospace;

          color: rgba(255,255,255,.86);
          font-size: 10px;
        }

        .db3-hero-right {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 30px;

          position: relative;
          z-index: 1;
        }

        .db3-match {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .db3-match-copy {
          min-width: 105px;
        }

        .db3-match-label {
          font-size: 10px;
          color: rgba(255,255,255,.46);
          margin-bottom: 5px;
        }

        .db3-match-title {
          font-family:
            'Space Grotesk',
            sans-serif;

          font-size: 16px;
          font-weight: 700;
        }

        .db3-match-sub {
          font-size: 9px;
          color: rgba(255,255,255,.38);
          line-height: 1.5;
          margin-top: 4px;
        }

        .db3-stat-stack {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(80px, 1fr));
          min-width: 300px;
        }

        .db3-stat {
          padding-left: 18px;
          border-left:
            1px solid
            rgba(255,255,255,.10);
        }

        .db3-stat-icon {
          width: 23px;
          height: 23px;
          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 7px;
          background: rgba(255,255,255,.07);

          color: rgba(255,255,255,.65);

          margin-bottom: 9px;
        }

        .db3-stat-value {
          font-family:
            'Space Grotesk',
            sans-serif;

          font-size: 22px;
          line-height: 1;
          font-weight: 700;
        }

        .db3-stat-label {
          font-size: 9px;
          color: rgba(255,255,255,.42);
          margin-top: 5px;
        }

        /* -----------------------------------------------
           WORKSPACE FILTER BAR
        ----------------------------------------------- */

        .db3-context-bar {
          min-height: 48px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 14px;

          padding:
            8px
            10px
            8px
            14px;

          background: white;
          border: 1px solid var(--border);
          border-radius: 12px;

          animation:
            db3Fade .45s .05s ease both;
        }

        .db3-context-left {
          display: flex;
          align-items: center;
          gap: 9px;
          min-width: 0;
        }

        .db3-context-icon {
          width: 25px;
          height: 25px;

          border-radius: 7px;

          display: flex;
          align-items: center;
          justify-content: center;

          background: var(--cyan-soft);
          color: var(--cyan-dark);

          flex-shrink: 0;
        }

        .db3-context-text {
          font-size: 10.5px;
          color: var(--muted);

          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .db3-filter-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;

          border: 1px solid var(--border);
          background: var(--paper);

          border-radius: 999px;

          padding: 5px 9px;

          font-size: 9px;
          font-weight: 600;

          color: var(--ink);
        }

        .db3-filter-pill button {
          border: 0;
          padding: 0;
          margin: 0;

          background: none;
          color: var(--soft);

          cursor: pointer;

          display: flex;
        }

        .db3-clear {
          border: 0;
          background: none;

          color: var(--cyan-dark);

          font-size: 9.5px;
          font-weight: 600;

          cursor: pointer;

          padding: 5px 7px;
        }

        /* -----------------------------------------------
           PIPELINE
        ----------------------------------------------- */

        .db3-section {
          animation:
            db3Fade .45s .1s ease both;
        }

        .db3-section-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;

          margin-bottom: 11px;
        }

        .db3-section-title {
          display: flex;
          align-items: center;
          gap: 7px;

          font-family:
            'Space Grotesk',
            sans-serif;

          font-size: 13px;
          font-weight: 700;
        }

        .db3-section-title svg {
          color: var(--cyan-dark);
        }

        .db3-section-note {
          font-size: 9px;
          color: var(--soft);
        }

        .db3-pipeline {
          display: grid;
          grid-template-columns:
            repeat(5, minmax(0, 1fr));

          border-top:
            1px solid var(--border);

          border-bottom:
            1px solid var(--border);

          background: white;
        }

        .db3-stage {
          position: relative;

          min-height: 91px;

          padding:
            15px
            18px;

          border-right:
            1px solid var(--border);

          background: white;

          cursor: pointer;

          transition:
            background .18s ease,
            padding .18s ease;
        }

        .db3-stage:last-child {
          border-right: 0;
        }

        .db3-stage:hover {
          background: var(--paper);
          padding-top: 13px;
        }

        .db3-stage.active {
          background: var(--cyan-soft);
        }

        .db3-stage.dimmed {
          opacity: .38;
        }

        .db3-stage-line {
          position: absolute;
          left: 18px;
          right: 18px;
          bottom: 0;

          height: 2px;

          background: var(--cyan);

          transform-origin: left;
          transform: scaleX(0);

          transition: transform .25s ease;
        }

        .db3-stage.active .db3-stage-line {
          transform: scaleX(1);
        }

        .db3-stage-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .db3-stage-index {
          font-family:
            'JetBrains Mono',
            monospace;

          font-size: 8px;
          color: var(--soft);
        }

        .db3-stage-arrow {
          color: var(--soft);
          opacity: 0;
          transform: translateX(-3px);

          transition:
            opacity .18s ease,
            transform .18s ease;
        }

        .db3-stage:hover .db3-stage-arrow,
        .db3-stage.active .db3-stage-arrow {
          opacity: 1;
          transform: translateX(0);
        }

        .db3-stage-number {
          font-family:
            'Space Grotesk',
            sans-serif;

          font-size: 24px;
          line-height: 1;

          font-weight: 700;

          margin-top: 12px;
        }

        .db3-stage-label {
          font-size: 9.5px;
          color: var(--muted);
          margin-top: 5px;
        }

        /* -----------------------------------------------
           MAIN GRID
           NOTE: align-items changed from "start" to "stretch"
           so the two panels below share the same row height.
        ----------------------------------------------- */

        .db3-content-grid {
          display: grid;

          grid-template-columns:
            minmax(0, 1.55fr)
            minmax(290px, .75fr);

          gap: 22px;

          align-items: stretch;
        }

        /* -----------------------------------------------
           CANDIDATES
        ----------------------------------------------- */

        .db3-panel {
          background: white;
          border: 1px solid var(--border);

          border-radius: 14px;

          overflow: hidden;

          /* Panels stretch to fill their grid row and lay out
             their content top-to-bottom so an empty state can
             grow to fill remaining space. */
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .db3-panel-head {
          display: flex;
          align-items: center;
          justify-content: space-between;

          padding:
            15px
            17px
            12px;

          border-bottom:
            1px solid var(--border);

          flex-shrink: 0;
        }

        .db3-panel-head-left {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .db3-panel-icon {
          width: 25px;
          height: 25px;

          border-radius: 7px;

          display: flex;
          align-items: center;
          justify-content: center;

          background: var(--cyan-soft);
          color: var(--cyan-dark);
        }

        .db3-panel-title {
          font-family:
            'Space Grotesk',
            sans-serif;

          font-size: 12px;
          font-weight: 700;
        }

        .db3-panel-subtitle {
          font-size: 9px;
          color: var(--muted);
          margin-top: 2px;
        }

        .db3-panel-count {
          font-family:
            'JetBrains Mono',
            monospace;

          font-size: 8px;
          color: var(--soft);

          margin-top: 2px;
        }

        .db3-view-all {
          border: 0;
          background: none;

          color: var(--cyan-dark);

          font-size: 9px;
          font-weight: 600;

          cursor: pointer;

          display: flex;
          align-items: center;
          gap: 3px;
        }

        .db3-candidate-list {
          display: flex;
          flex-direction: column;

          /* Grow to fill the panel so the empty state can center
             itself across the full remaining height. */
          flex: 1;
          min-height: 0;
        }

        .db3-candidate {
          display: grid;

          grid-template-columns:
            25px
            38px
            minmax(120px, 1.2fr)
            minmax(85px, .75fr)
            auto;

          align-items: center;

          gap: 12px;

          padding:
            12px
            17px;

          border-bottom:
            1px solid #EEECE7;

          cursor: pointer;

          transition:
            background .15s ease,
            padding .15s ease;
        }

        .db3-candidate:last-child {
          border-bottom: 0;
        }

        .db3-candidate:hover {
          background: var(--paper);
          padding-left: 20px;
        }

        .db3-rank {
          font-family:
            'JetBrains Mono',
            monospace;

          font-size: 8.5px;
          color: var(--soft);
        }

        .db3-avatar {
          width: 34px;
          height: 34px;

          border-radius: 50%;

          display: block;
        }

        .db3-candidate-main {
          min-width: 0;
        }

        .db3-candidate-name {
          font-size: 10.5px;
          font-weight: 700;

          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .db3-candidate-headline {
          font-size: 9px;
          color: var(--soft);

          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;

          margin-top: 2px;
        }

        .db3-candidate-role {
          font-size: 9px;
          color: var(--muted);

          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .db3-candidate-score {
          min-width: 42px;

          display: inline-flex;
          justify-content: center;

          padding: 4px 7px;

          border-radius: 999px;

          background: var(--cyan-soft);
          color: var(--cyan-dark);

          font-family:
            'JetBrains Mono',
            monospace;

          font-size: 8.5px;
          font-weight: 600;
        }

        .db3-candidate-arrow {
          color: #C2C2C0;

          transition:
            color .15s ease,
            transform .15s ease;
        }

        .db3-candidate:hover .db3-candidate-arrow {
          color: var(--cyan-dark);
          transform: translateX(2px);
        }

        /* -----------------------------------------------
           EMPTY STATE
           NOTE: now flexes to fill the remaining panel
           height and centers its content, instead of a
           fixed small padding box, so it matches the
           height of the score-distribution panel next to it.
        ----------------------------------------------- */

        .db3-empty {
          flex: 1;

          display: flex;
          align-items: center;
          justify-content: center;

          padding: 35px 20px;

          text-align: center;

          color: var(--soft);

          font-size: 10.5px;
        }

        /* -----------------------------------------------
           SCORE DISTRIBUTION
        ----------------------------------------------- */

        .db3-score-panel {
          padding-bottom: 16px;
        }

        .db3-score-body {
          padding: 15px 17px 0;

          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .db3-score-note {
          font-size: 9px;
          color: var(--soft);
          margin-bottom: 13px;
        }

        .db3-score-bars {
          display: flex;
          flex-direction: column;
          gap: 11px;
        }

        .db3-score-row {
          display: grid;
          grid-template-columns: 48px 1fr 28px;
          align-items: center;
          gap: 9px;

          cursor: pointer;
        }

        .db3-score-label {
          font-family:
            'JetBrains Mono',
            monospace;

          font-size: 8px;
          color: var(--muted);
        }

        .db3-score-track {
          height: 7px;

          background: #F0EFEB;

          border-radius: 999px;

          overflow: hidden;
        }

        .db3-score-fill {
          height: 100%;

          background: var(--cyan);

          border-radius: inherit;

          transform-origin: left;

          animation:
            db3Line .7s
            cubic-bezier(.22,1,.36,1)
            both;
        }

        .db3-score-row.dimmed {
          opacity: .3;
        }

        .db3-score-row.active {
          opacity: 1;
        }

        .db3-score-value {
          font-family:
            'JetBrains Mono',
            monospace;

          font-size: 8px;
          color: var(--ink);
          text-align: right;
        }

        /* -----------------------------------------------
           ACTIVITY
        ----------------------------------------------- */

        .db3-activity {
          margin-top: 22px;
        }

        .db3-activity-tabs {
          display: flex;
          align-items: center;

          gap: 3px;

          padding:
            8px
            10px;

          border-bottom:
            1px solid var(--border);
        }

        .db3-tab {
          border: 0;
          background: transparent;

          color: var(--soft);

          font-size: 9.5px;
          font-weight: 600;

          padding: 6px 9px;

          border-radius: 7px;

          cursor: pointer;
        }

        .db3-tab:hover {
          color: var(--ink);
        }

        .db3-tab.active {
          background: var(--paper);
          border: 1px solid var(--border);
          color: var(--ink);
        }

        .db3-role-row {
          display: grid;

          grid-template-columns:
            minmax(0, 1fr)
            auto
            auto
            18px;

          align-items: center;

          gap: 13px;

          padding:
            12px
            17px;

          border-bottom:
            1px solid #EEECE7;

          cursor: pointer;

          transition:
            background .15s ease;
        }

        .db3-role-row:last-child {
          border-bottom: 0;
        }

        .db3-role-row:hover {
          background: var(--paper);
        }

        .db3-role-main {
          min-width: 0;
        }

        .db3-role-title {
          font-size: 10.5px;
          font-weight: 700;

          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .db3-role-meta {
          font-size: 8.5px;
          color: var(--soft);

          margin-top: 3px;

          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .db3-role-count {
          font-family:
            'JetBrains Mono',
            monospace;

          font-size: 8px;
          color: var(--muted);

          white-space: nowrap;
        }

        .db3-status {
          display: inline-flex;
          align-items: center;
          gap: 5px;

          font-size: 8px;
          font-weight: 600;

          color: var(--cyan-dark);

          white-space: nowrap;
        }

        .db3-status-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--cyan);
        }

        .db3-row-arrow {
          color: #C7C6C2;
        }

        .db3-search-row {
          display: grid;

          grid-template-columns:
            25px
            minmax(0, 1fr)
            auto
            25px;

          align-items: center;

          gap: 10px;

          padding:
            11px
            17px;

          border-bottom:
            1px solid #EEECE7;
        }

        .db3-search-row:last-child {
          border-bottom: 0;
        }

        .db3-search-icon {
          width: 25px;
          height: 25px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 7px;

          background: var(--cyan-soft);
          color: var(--cyan-dark);
        }

        .db3-search-query {
          font-size: 9.5px;
          font-weight: 600;

          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .db3-search-meta {
          font-size: 8px;
          color: var(--soft);
          margin-top: 2px;
        }

        .db3-rerun {
          width: 25px;
          height: 25px;

          border: 0;
          background: transparent;

          color: var(--soft);

          border-radius: 7px;

          display: flex;
          align-items: center;
          justify-content: center;

          cursor: pointer;
        }

        .db3-rerun:hover {
          background: var(--paper);
          color: var(--cyan-dark);
        }

        /* -----------------------------------------------
           AI STRIP
        ----------------------------------------------- */

        .db3-ai {
          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 18px;

          padding:
            12px
            15px;

          background: white;

          border:
            1px solid var(--border);

          border-radius: 12px;
        }

        .db3-ai-left {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .db3-ai-icon {
          width: 27px;
          height: 27px;

          border-radius: 8px;

          display: flex;
          align-items: center;
          justify-content: center;

          background: var(--cyan-soft);
          color: var(--cyan-dark);
        }

        .db3-ai-title {
          font-size: 9.5px;
          font-weight: 700;
        }

        .db3-ai-sub {
          font-size: 8px;
          color: var(--soft);
          margin-top: 2px;
        }

        .db3-ai-metrics {
          display: flex;
          align-items: center;

          gap: 22px;
        }

        .db3-ai-metric {
          display: flex;
          align-items: baseline;
          gap: 5px;

          font-size: 8px;
          color: var(--soft);
        }

        .db3-ai-metric strong {
          font-family:
            'JetBrains Mono',
            monospace;

          color: var(--ink);
          font-size: 9px;
        }

        /* -----------------------------------------------
           RESPONSIVE
        ----------------------------------------------- */

        @media (max-width: 1050px) {
          .db3-hero {
            grid-template-columns: 1fr;
          }

          .db3-hero-right {
            justify-content: flex-start;
          }

          .db3-content-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 760px) {
          .db3-root {
            padding: 18px;
          }

          .db3-page-head {
            align-items: flex-start;
            flex-direction: column;
          }

          .db3-head-status {
            display: none;
          }

          .db3-hero-right {
            flex-direction: column;
            align-items: flex-start;
          }

          .db3-stat-stack {
            width: 100%;
            min-width: 0;
          }

          .db3-pipeline {
            grid-template-columns: 1fr;
          }

          .db3-stage {
            border-right: 0;
            border-bottom: 1px solid var(--border);
          }

          .db3-stage:last-child {
            border-bottom: 0;
          }

          .db3-candidate {
            grid-template-columns:
              25px
              34px
              minmax(0, 1fr)
              auto;
          }

          .db3-candidate-role {
            display: none;
          }

          .db3-candidate-arrow {
            display: none;
          }

          .db3-ai {
            align-items: flex-start;
            flex-direction: column;
          }

          .db3-ai-metrics {
            flex-wrap: wrap;
          }
        }
      `}</style>

      <div className="db3-main">

        {/* ================================================
            PAGE HEADER
        ================================================= */}

        <header className="db3-page-head">
          <div>
            <div className="db3-eyebrow">
              {t.eyebrow}
            </div>

            <h1 className="db3-title">
              {t.welcome(
                user?.fullName || 'User'
              )}

              <span className="db3-role">
                {user?.role || 'RECRUITER'}
              </span>
            </h1>

            <div className="db3-page-note">
              {t.workspaceNote}
            </div>
          </div>

          <div className="db3-head-status">
            <span className="db3-live-dot" />
            Workspace active
          </div>
        </header>

        {/* ================================================
            HERO
        ================================================= */}

        <section className="db3-hero">

          <div className="db3-hero-left">

            <div>
              <div className="db3-hero-welcome">
                Hiring at a glance
              </div>

              <div className="db3-hero-description">
                Your sourcing activity, candidate quality,
                and recruitment pipeline in one place.
              </div>
            </div>

            <div className="db3-hero-mini">

              {/* FIXED:
                  Search history metric removed because
                  DashboardView no longer receives searchHistory.
              */}

              {/* <div className="db3-mini">
                <Target size={11} />

                <strong>
                  {stats.totalInPipeline}
                </strong>

                {t.inPipeline}
              </div> */}

            </div>

          </div>

          <div className="db3-hero-right">

            <div className="db3-match">

              <MatchRing
                percentage={stats.avgScore}
              />

              <div className="db3-match-copy">

                <div className="db3-match-label">
                  {t.matchQuality}
                </div>

                <div className="db3-match-title">
                  {stats.avgScore >= 80
                    ? 'Strong pipeline'
                    : stats.avgScore >= 60
                      ? 'Healthy pipeline'
                      : 'Build your pipeline'}
                </div>

                <div className="db3-match-sub">
                  Based on sourced candidate
                  match scores.
                </div>

              </div>

            </div>

            <div className="db3-stat-stack">

              <div className="db3-stat">

                <div className="db3-stat-icon">
                  <FileText size={12} />
                </div>

                <div className="db3-stat-value">
                  {activeJDsCount}
                </div>

                <div className="db3-stat-label">
                  {t.activeJDs}
                </div>

              </div>

              <div className="db3-stat">

                <div className="db3-stat-icon">
                  <Users size={12} />
                </div>

                <div className="db3-stat-value">
                  {sourcedCount}
                </div>

                <div className="db3-stat-label">
                  {t.sourced}
                </div>

              </div>

              <div className="db3-stat">

                <div className="db3-stat-icon">
                  <BookmarkCheck size={12} />
                </div>

                <div className="db3-stat-value">
                  {shortlistedCount}
                </div>

                <div className="db3-stat-label">
                  {t.shortlisted}
                </div>

              </div>

            </div>

          </div>

        </section>

        {/* ================================================
            ACTIVE FILTER CONTEXT
        ================================================= */}

        {hasFilters && (
          <div className="db3-context-bar">

            <div className="db3-context-left">

              <div className="db3-context-icon">
                <SlidersHorizontal size={12} />
              </div>

              <div className="db3-context-text">
                Showing candidates matching your
                current focus
              </div>

              {focusedStage && (
                <span className="db3-filter-pill">

                  {t.stages[focusedStage]}

                  <button
                    onClick={() =>
                      handleStageClick(
                        focusedStage
                      )
                    }
                    aria-label="Remove stage filter"
                  >
                    <X size={10} />
                  </button>

                </span>
              )}

              {selectedRange && (
                <span className="db3-filter-pill">

                  {
                    stats.scoreDist.find(
                      (item) =>
                        item.key === selectedRange
                    )?.label
                  }

                  <button
                    onClick={() =>
                      handleRangeClick(
                        selectedRange
                      )
                    }
                    aria-label="Remove score filter"
                  >
                    <X size={10} />
                  </button>

                </span>
              )}

            </div>

            <button
              className="db3-clear"
              onClick={clearFilters}
            >
              {t.clearFilter}
            </button>

          </div>
        )}

        {/* ================================================
            PIPELINE
        ================================================= */}

        <section className="db3-section">

          <div className="db3-section-head">

            <div className="db3-section-title">
              <TrendingUp size={14} />
              {t.pipeline}
            </div>

            <div className="db3-section-note">
              {hasFilters
                ? `${displayCandidates.length} ${t.candidates}`
                : `${stats.totalInPipeline} ${t.inPipeline} (${candidates.length - stats.totalInPipeline} not in pipeline)`}
            </div>

          </div>

          <div className="db3-pipeline">

            {funnel.map((stage, index) => {

              const isActive =
                focusedStage === stage.key;

              const isDimmed =
                focusedStage &&
                focusedStage !== stage.key;

              return (
                <div
                  key={stage.key}
                  className={[
                    'db3-stage',
                    isActive
                      ? 'active'
                      : '',
                    isDimmed
                      ? 'dimmed'
                      : '',
                  ].join(' ')}
                  onClick={() =>
                    handleStageClick(
                      stage.key
                    )
                  }
                >

                  <div className="db3-stage-top">

                    <span className="db3-stage-index">
                      0{index + 1}
                    </span>

                    <ChevronRight
                      size={12}
                      className="db3-stage-arrow"
                    />

                  </div>

                  <div className="db3-stage-number">
                    {stage.value}
                  </div>

                  <div className="db3-stage-label">
                    {stage.label}
                  </div>

                  <div className="db3-stage-line" />

                </div>
              );
            })}

          </div>

        </section>

        {/* ================================================
            CANDIDATES + SCORE DISTRIBUTION
        ================================================= */}

        <div className="db3-content-grid">

          {/* -----------------------------------------------
              CANDIDATES
          ------------------------------------------------ */}

          <section className="db3-panel">

            <div className="db3-panel-head">

              <div className="db3-panel-head-left">

                <div className="db3-panel-icon">
                  <Sparkles size={12} />
                </div>

                <div>

                  <div className="db3-panel-title">
                    {t.leaderboard}
                  </div>

                  <div className="db3-panel-count">
                    {displayCandidates.length}{' '}
                    {t.candidates}
                  </div>

                </div>

              </div>

            </div>

            <div className="db3-candidate-list">

              {displayCandidates.length === 0 ? (

                <div className="db3-empty">
                  {t.noCandidates}
                </div>

              ) : (

                paginatedCandidates.map(
                  (candidate, index) => {

                    const globalIndex =
                      candidatePage *
                      CANDIDATE_PAGE_SIZE +
                      index;

                    return (
                      <div
                        key={candidate.id}
                        className="db3-candidate"
                        onClick={() =>
                          onSelectCandidate?.(
                            candidate
                          )
                        }
                      >

                        <div className="db3-rank">
                          #{globalIndex + 1}
                        </div>

                        <img
                          className="db3-avatar"
                          src={getAvatarUrl(
                            candidate.fullName
                          )}
                          alt={
                            candidate.fullName
                          }
                        />

                        <div className="db3-candidate-main">

                          <div className="db3-candidate-name">
                            {candidate.fullName}
                          </div>

                          <div className="db3-candidate-headline">
                            {candidate.headline ||
                              'Candidate profile'}
                          </div>

                        </div>

                        <div className="db3-candidate-role">
                          {candidate.currentRole ||
                            candidate.location ||
                            'Profile'}
                        </div>

                        <span className="db3-candidate-score">
                          {candidate.matchScore || 0}%
                        </span>

                        <ChevronRight
                          className="db3-candidate-arrow"
                          size={13}
                        />

                      </div>
                    );
                  }
                )

              )}

            </div>

          </section>

          {/* -----------------------------------------------
              SCORE DISTRIBUTION
          ------------------------------------------------ */}

          <section className="db3-panel db3-score-panel">

            <div className="db3-panel-head">

              <div className="db3-panel-head-left">

                <div className="db3-panel-icon">
                  <Target size={12} />
                </div>

                <div>

                  <div className="db3-panel-title">
                    {t.scoreDist}
                  </div>

                  <div className="db3-panel-subtitle">
                    {stats.totalCandidates} candidates across all roles
                  </div>

                </div>

              </div>

            </div>

            <div className="db3-score-body">

              <div className="db3-score-note">
                {t.scoreHint}
              </div>

              <div className="db3-score-bars">

                {stats.scoreDist.map(
                  (item, index) => {

                    const percentage =
                      stats.totalCandidates > 0
                        ? (item.value /
                          stats.totalCandidates) *
                        100
                        : 0;

                    const active =
                      selectedRange ===
                      item.key;

                    const dimmed =
                      selectedRange &&
                      selectedRange !== item.key;

                    return (
                      <div
                        key={item.key}
                        className={[
                          'db3-score-row',
                          active
                            ? 'active'
                            : '',
                          dimmed
                            ? 'dimmed'
                            : '',
                        ].join(' ')}
                        onClick={() =>
                          handleRangeClick(
                            item.key
                          )
                        }
                      >

                        <span className="db3-score-label">
                          {item.label}
                        </span>

                        <div className="db3-score-track">

                          <div
                            className="db3-score-fill"
                            style={{
                              width: `${percentage}%`,
                              animationDelay:
                                `${index * 70}ms`,
                            }}
                          />

                        </div>

                        <span className="db3-score-value">
                          {item.value}
                        </span>

                      </div>
                    );
                  }
                )}

              </div>

            </div>

          </section>

        </div>

        {/* ================================================
            ACTIVITY
        ================================================= */}

        <section className="db3-panel db3-activity">

          {jobDescriptions.length === 0 ? (

            <div className="db3-empty">
              {t.noJDs}
            </div>

          ) : (

            [...jobDescriptions]
              .sort((a, b) => {
                const tA = Number(String(a.id).replace(/\D/g, '')) || 0;
                const tB = Number(String(b.id).replace(/\D/g, '')) || 0;
                return tB - tA;
              })
              .slice(0, 4)
              .map((job) => {

                const savedCount =
                  (
                    savedRoleCandidates[
                    job.id
                    ] || []
                  ).length;

                const isSelected =
                  selectedJobId === job.id;

                const jobStatus =
                  job.status || 'active';

                const isArchived =
                  jobStatus === 'archived';

                return (
                  <div
                    key={job.id}
                    className="db3-role-row"
                    style={
                      isSelected
                        ? {
                          background:
                            'var(--cyan-soft)',
                        }
                        : undefined
                    }
                    onClick={() =>
                      handleSelectJob(
                        job.id
                      )
                    }
                  >

                    <div className="db3-role-main">

                      <div className="db3-role-title">
                        {job.title}
                      </div>

                      <div className="db3-role-meta">
                        {job.location ||
                          'All locations'}
                      </div>

                    </div>

                    <div className="db3-role-count">
                      {savedCount}{' '}
                      {t.saved}
                    </div>

                    <div className="db3-status">

                      <span
                        className="db3-status-dot"
                        style={{
                          background:
                            isArchived
                              ? '#9B9C9E'
                              : undefined,
                        }}
                      />

                      {isArchived
                        ? 'Archived'
                        : 'Active'}

                    </div>

                    <ChevronRight
                      className="db3-row-arrow"
                      size={12}
                    />

                  </div>
                );
              })

          )}

        </section>

        {/* ================================================
            TEAM ACTIVITY & AUDIT LOG FEED
        ================================================= */}
        <div style={{ gridColumn: '1 / -1', marginTop: 12 }}>
          <ActivityLogPanel activities={activities} />
        </div>

        {/* ================================================
            AI PERFORMANCE
        ================================================= */}

        <div className="db3-ai">

          <div className="db3-ai-left">

            <div className="db3-ai-icon">
              <Sparkles size={13} />
            </div>

            <div>

              <div className="db3-ai-title">
                {t.agent}
              </div>

              <div className="db3-ai-sub">
                Automated sourcing performance
              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
}

export default DashboardView;