/**
 * CandidateCard
 *
 * Same visual language:
 *   ink       #12151B
 *   paper     #F7F5F1
 *   coral     #E85D3D
 *   cyan      #0BA5C9
 *   slate     #8A8F98
 *
 * Design:
 *   - Candidate identity + score become one visual composition
 *   - Score becomes an interactive "match signal"
 *   - Hover creates a compact command layer
 *   - Match explanation expands inline instead of flipping the card
 *   - Skills behave like a signal cluster
 *   - Designed to remain compact when rendering thousands of candidates
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';

import {
  MapPin,
  Briefcase,
  BookmarkCheck,
  ChevronRight,
  ChevronDown,
  Edit2,
  Trash2,
  Bookmark,
  ExternalLink,
  Sparkles,
  Check,
  ArrowUpRight,
  Zap,
} from 'lucide-react';


/* ──────────────────────────────────────────────────────────
   Fonts
────────────────────────────────────────────────────────── */

function useFonts() {
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;

    loaded.current = true;

    const link = document.createElement('link');

    link.rel = 'stylesheet';

    link.href =
      'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap';

    document.head.appendChild(link);
  }, []);
}


/* ──────────────────────────────────────────────────────────
   Score
────────────────────────────────────────────────────────── */

function scoreTier(score) {
  if (score >= 90) {
    return {
      color: '#084C57',
      soft: '#E1F2F3',
      label: 'hot lead',
      shortLabel: 'HOT',
    };
  }

  if (score >= 80) {
    return {
      color: '#0E7C8C',
      soft: '#E1F2F3',
      label: 'good match',
      shortLabel: 'GOOD',
    };
  }

  return {
    color: '#0A5C68',
    soft: '#E1F2F3',
    label: 'possible fit',
    shortLabel: 'FIT',
  };
}


/* ──────────────────────────────────────────────────────────
   Avatar
────────────────────────────────────────────────────────── */

function avatarUrl(name, avatar) {
  // Use actual avatar URL if available, otherwise generate initials-based avatar
  if (avatar) {
    return avatar;
  }
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
    name
  )}&backgroundColor=12151B&textColor=ffffff&fontWeight=600&fontSize=38`;
}


/* ──────────────────────────────────────────────────────────
   Reasoning
────────────────────────────────────────────────────────── */

function buildReasoning(candidate) {
  const matchedSkills = candidate.matched_skills || [];
  const missingSkills = candidate.missing_skills || [];
  
  const skillMatchCount = matchedSkills.length;
  const totalRequired = matchedSkills.length + missingSkills.length;
  
  const expYears = candidate.experience_years || 0;
  const minExp = candidate.min_experience_years || 0;
  const expFits = expYears >= minExp;
  
  const locationScore = candidate.location_score || 0;
  const locationFits = locationScore >= 80;
  
  return [
    {
      label: 'Skills',
      value: `${skillMatchCount}/${totalRequired}`,
      detail: matchedSkills.length > 0 ? matchedSkills.slice(0, 4).join(' · ') : 'No matched skills',
      weight: Math.min(100, 70 + skillMatchCount * 6),
    },
    {
      label: 'Experience',
      value: `${expYears} yrs`,
      detail: expFits ? `Fits ${minExp}+ yr requirement` : `Below ${minExp} yr requirement`,
      weight: expFits ? 100 : 50,
    },
    {
      label: 'Location',
      value: locationFits ? 'Match' : 'Partial',
      detail: candidate.location || 'Location not specified',
      weight: locationScore,
    },
  ];
}


/* ──────────────────────────────────────────────────────────
   Score Signal
────────────────────────────────────────────────────────── */

function MatchSignal({
  score,
  color,
  expanded,
  onClick,
}) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => setProgress(score), 120);

    return () => clearTimeout(timeout);
  }, [score]);

  return (
    <button
      className={`cc-signal ${expanded ? 'is-expanded' : ''}`}
      onClick={onClick}
      aria-expanded={expanded}
      style={{
        '--signal-color': color,
        '--signal-width': `${progress}%`,
      }}
    >
      <div className="cc-signal-top">
        <span className="cc-signal-label">
          <Sparkles size={11} />
          MATCH SIGNAL
        </span>

        <span className="cc-signal-score">
          {score}
        </span>
      </div>

      <div className="cc-signal-track">
        <span className="cc-signal-fill" />
      </div>

      <div className="cc-signal-bottom">
        <span>
          {expanded ? 'Hide reasoning' : 'Why this match'}
        </span>

        <ChevronDown
          size={12}
          className={`cc-signal-chevron ${
            expanded ? 'rotate' : ''
          }`}
        />
      </div>
    </button>
  );
}


/* ──────────────────────────────────────────────────────────
   Main Component
────────────────────────────────────────────────────────── */

export function CandidateCard({
  candidate,
  index = 0,

  selected = false,
  onToggleSelect = () => {},

  onViewDetails = () => {},
  onEdit = () => {},
  onDelete = () => {},

  isSavedForJob = false,
  onSaveForJob = () => {},

  selectedJobId = null,
}) {
  useFonts();

  const [reasoningOpen, setReasoningOpen] = useState(false);
  const [skillsExpanded, setSkillsExpanded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const tier = scoreTier(candidate.matchScore);

  const reasoning = useMemo(
    () => buildReasoning(candidate),
    [candidate]
  );

  const skills = candidate.skills || [];

  const visibleSkills = skillsExpanded
    ? skills
    : skills.slice(0, 5);

  const hiddenSkills = Math.max(
    0,
    skills.length - visibleSkills.length
  );

  const cardNumber = String(index + 1).padStart(2, '0');


  function handleSave() {
    onSaveForJob(candidate.id);

    if (!isSavedForJob) {
      setJustSaved(true);

      setTimeout(() => {
        setJustSaved(false);
      }, 900);
    }
  }


  return (
    <div
      className={`cc-root ${
        selected ? 'is-selected' : ''
      } ${reasoningOpen ? 'is-reasoning' : ''}`}
      style={{
        '--tier-color': tier.color,
        '--tier-soft': tier.soft,
        '--entry-delay': `${Math.min(index, 20) * 35}ms`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >

      <style>{`

        /* ─────────────────────────────────────────────
           Animations
        ───────────────────────────────────────────── */

        @keyframes ccEnter {
          from {
            opacity: 0;
            transform: translateY(12px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes ccSignal {
          from {
            width: 0;
          }

          to {
            width: var(--signal-width);
          }
        }

        @keyframes ccSkill {
          from {
            opacity: 0;
            transform: translateY(3px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes ccPop {
          0% {
            transform: scale(.6);
            opacity: 0;
          }

          60% {
            transform: scale(1.15);
          }

          100% {
            transform: scale(1);
            opacity: 1;
          }
        }


        /* ─────────────────────────────────────────────
           Root
        ───────────────────────────────────────────── */

        .cc-root {
          position: relative;
          min-width: 0;
          height: 100%;

          font-family:
            'Inter',
            system-ui,
            sans-serif;

          animation:
            ccEnter
            .45s
            cubic-bezier(.22,1,.36,1)
            var(--entry-delay)
            both;
        }


        /* ─────────────────────────────────────────────
           Card
        ───────────────────────────────────────────── */

        .cc-card {
          position: relative;

          min-height: 390px;
          height: 100%;

          overflow: hidden;

          display: flex;
          flex-direction: column;

          background: #FFFFFF;

          border:
            1px solid
            #E4E1D9;

          border-radius: 18px;

          transition:
            transform .22s ease,
            border-color .22s ease,
            box-shadow .22s ease;
        }

        .cc-root:hover .cc-card {
          transform: translateY(-3px);

          border-color: #D8D4CA;

          box-shadow:
            0 18px 38px -20px
            rgba(18,21,27,.22);
        }

        .cc-root.is-selected .cc-card {
          border-color: #12151B;

          box-shadow:
            0 0 0 1px #12151B,
            0 16px 34px -22px
            rgba(18,21,27,.25);
        }


        /* ─────────────────────────────────────────────
           Ambient signal
        ───────────────────────────────────────────── */

        .cc-ambient {
          position: absolute;

          width: 180px;
          height: 180px;

          right: -95px;
          top: -100px;

          border-radius: 50%;

          background:
            var(--tier-soft);

          opacity: .75;

          transition:
            transform .4s ease,
            opacity .3s ease;
        }

        .cc-root:hover .cc-ambient {
          transform: scale(1.25);
          opacity: 1;
        }


        /* ─────────────────────────────────────────────
           Header
        ───────────────────────────────────────────── */

        .cc-header {
          position: relative;
          z-index: 2;

          display: flex;
          align-items: center;
          justify-content: space-between;

          padding:
            13px
            14px
            0;
        }


        .cc-index {
          display: flex;
          align-items: center;
          gap: 8px;

          font-family:
            'JetBrains Mono',
            monospace;

          font-size: 10px;
          font-weight: 700;

          color: #9B9C9E;
        }

        .cc-index-line {
          width: 18px;
          height: 1px;

          background: #DAD7D0;

          transition:
            width .25s ease,
            background .25s ease;
        }

        .cc-root:hover .cc-index-line {
          width: 28px;
          background: var(--tier-color);
        }


        /* ─────────────────────────────────────────────
           Header actions
        ───────────────────────────────────────────── */

        .cc-actions {
          display: flex;
          align-items: center;
          gap: 4px;

          opacity: 0;

          transform: translateX(4px);

          transition:
            opacity .18s ease,
            transform .18s ease;
        }

        .cc-root:hover .cc-actions {
          opacity: 1;
          transform: translateX(0);
        }

        .cc-action {
          width: 27px;
          height: 27px;

          display: flex;
          align-items: center;
          justify-content: center;

          border:
            1px solid
            #E4E1D9;

          border-radius: 8px;

          background: #FFFFFF;

          color: #63666E;

          cursor: pointer;

          transition:
            background .15s ease,
            color .15s ease,
            border-color .15s ease;
        }

        .cc-action:hover {
          background: #12151B;
          border-color: #12151B;
          color: #FFFFFF;
        }

        .cc-action.danger:hover {
          background: #C1361F;
          border-color: #C1361F;
        }


        /* ─────────────────────────────────────────────
           Identity
        ───────────────────────────────────────────── */

        .cc-identity {
          position: relative;
          z-index: 2;

          display: flex;
          align-items: center;

          gap: 13px;

          padding:
            18px
            16px
            14px;
        }


        .cc-avatar-wrap {
          position: relative;

          width: 62px;
          height: 62px;

          flex-shrink: 0;
        }

        .cc-avatar-ring {
          position: absolute;
          inset: -4px;

          border-radius: 50%;

          border:
            1px solid
            var(--tier-color);

          opacity: .28;

          transition:
            transform .3s ease,
            opacity .3s ease;
        }

        .cc-root:hover .cc-avatar-ring {
          transform: scale(1.08);
          opacity: .55;
        }

        .cc-avatar {
          width: 62px;
          height: 62px;

          display: block;

          border-radius: 50%;

          object-fit: cover;

          background: #F1F1EC;

          position: relative;
          z-index: 2;
        }


        /* score badge */

        .cc-score-badge {
          position: absolute;

          z-index: 4;

          right: -9px;
          bottom: -3px;

          min-width: 32px;
          height: 21px;

          padding: 0 6px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 7px;

          background: #12151B;
          color: #FFFFFF;

          font-family:
            'JetBrains Mono',
            monospace;

          font-size: 9px;
          font-weight: 700;

          box-shadow:
            0 3px 8px
            rgba(18,21,27,.18);

          transition:
            transform .2s ease;
        }

        .cc-root:hover .cc-score-badge {
          transform: translateY(-2px);
        }


        .cc-name {
          font-family:
            'Space Grotesk',
            sans-serif;

          font-size: 16px;
          font-weight: 700;

          color: #12151B;

          line-height: 1.2;

          letter-spacing: -.01em;
        }

        .cc-headline {
          margin-top: 4px;

          font-size: 12px;

          line-height: 1.4;

          color: #63666E;

          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;

          overflow: hidden;
        }

        .cc-tier {
          display: inline-flex;
          align-items: center;

          gap: 5px;

          margin-top: 6px;

          font-family:
            'JetBrains Mono',
            monospace;

          font-size: 9px;
          font-weight: 700;

          color: var(--tier-color);

          text-transform: uppercase;
          letter-spacing: .04em;
        }

        .cc-tier-dot {
          width: 5px;
          height: 5px;

          border-radius: 50%;

          background: var(--tier-color);
        }


        /* ─────────────────────────────────────────────
           Meta
        ───────────────────────────────────────────── */

        .cc-meta {
          display: grid;
          grid-template-columns: 1fr 1fr;

          margin:
            0
            16px;

          border-top:
            1px solid
            #EFEDE7;

          border-bottom:
            1px solid
            #EFEDE7;
        }

        .cc-meta-item {
          min-width: 0;

          padding: 10px 0;

          display: flex;
          align-items: center;

          gap: 6px;

          color: #63666E;

          font-size: 11px;
        }

        .cc-meta-item + .cc-meta-item {
          padding-left: 12px;

          border-left:
            1px solid
            #EFEDE7;
        }

        .cc-meta-item span {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }


        /* ─────────────────────────────────────────────
           Summary
        ───────────────────────────────────────────── */

        .cc-summary {
          padding:
            12px
            16px
            4px;

          font-size: 12px;
          line-height: 1.55;

          color: #3A3D44;

          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;

          overflow: hidden;
        }


        /* ─────────────────────────────────────────────
           Match signal
        ───────────────────────────────────────────── */

        .cc-signal {
          width: calc(100% - 32px);

          margin:
            10px
            16px
            12px;

          padding: 10px 11px;

          border:
            1px solid
            #E4E1D9;

          border-radius: 11px;

          background: #F7F5F1;

          text-align: left;

          cursor: pointer;

          transition:
            background .18s ease,
            border-color .18s ease,
            transform .18s ease;
        }

        .cc-signal:hover {
          background: #F1F1EC;

          border-color:
            var(--tier-color);

          transform: translateY(-1px);
        }

        .cc-signal.is-expanded {
          background: var(--tier-soft);

          border-color:
            var(--tier-color);
        }


        .cc-signal-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .cc-signal-label {
          display: flex;
          align-items: center;

          gap: 5px;

          font-family:
            'JetBrains Mono',
            monospace;

          font-size: 8.5px;
          font-weight: 700;

          letter-spacing: .06em;

          color: #63666E;
        }

        .cc-signal-score {
          font-family:
            'JetBrains Mono',
            monospace;

          font-size: 13px;
          font-weight: 700;

          color:
            var(--tier-color);
        }


        .cc-signal-track {
          position: relative;

          height: 4px;

          margin-top: 8px;

          overflow: hidden;

          border-radius: 10px;

          background: #E4E1D9;
        }

        .cc-signal-fill {
          display: block;

          width: var(--signal-width);

          height: 100%;

          border-radius: inherit;

          background:
            var(--tier-color);

          animation:
            ccSignal
            1s
            cubic-bezier(.22,1,.36,1)
            both;
        }


        .cc-signal-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;

          margin-top: 6px;

          font-size: 9.5px;
          font-weight: 600;

          color: #8A8F98;
        }

        .cc-signal-chevron {
          transition:
            transform .2s ease;
        }

        .cc-signal-chevron.rotate {
          transform: rotate(180deg);
        }


        /* ─────────────────────────────────────────────
           Reasoning
        ───────────────────────────────────────────── */

        .cc-reasoning {
          margin:
            0
            16px
            10px;

          padding:
            10px;

          border-radius: 10px;

          background: #F7F5F1;

          animation:
            ccEnter
            .25s
            ease
            both;
        }

        .cc-reason {
          display: grid;

          grid-template-columns:
            70px
            1fr;

          gap: 9px;

          padding: 7px 0;
        }

        .cc-reason + .cc-reason {
          border-top:
            1px solid
            #E4E1D9;
        }

        .cc-reason-label {
          font-family:
            'JetBrains Mono',
            monospace;

          font-size: 8px;
          font-weight: 700;

          color: #8A8F98;

          text-transform: uppercase;
        }

        .cc-reason-main {
          min-width: 0;
        }

        .cc-reason-value {
          font-size: 10.5px;
          font-weight: 700;

          color: #12151B;
        }

        .cc-reason-detail {
          margin-top: 2px;

          font-size: 9.5px;

          color: #63666E;

          line-height: 1.35;

          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }


        /* ─────────────────────────────────────────────
           Skills
        ───────────────────────────────────────────── */

        .cc-skills {
          display: flex;
          flex-wrap: wrap;
          align-items: center;

          gap: 5px;

          padding:
            3px
            16px
            14px;
        }

        .cc-skill {
          display: inline-flex;
          align-items: center;

          padding:
            4px
            8px;

          border-radius: 6px;

          background: #F1F1EC;

          border:
            1px solid
            #E4E1D9;

          color: #3A3D44;

          font-size: 10px;
          font-weight: 500;

          animation:
            ccSkill
            .2s
            ease
            both;
        }

        .cc-skill.primary {
          background: var(--tier-soft);

          border-color:
            color-mix(
              in srgb,
              var(--tier-color) 20%,
              #E4E1D9
            );
        }

        .cc-more {
          border: none;

          background: transparent;

          padding:
            4px
            5px;

          color:
            var(--tier-color);

          font-size: 10px;
          font-weight: 700;

          cursor: pointer;
        }


        /* ─────────────────────────────────────────────
           Spacer
        ───────────────────────────────────────────── */

        .cc-spacer {
          flex: 1;
        }


        /* ─────────────────────────────────────────────
           Footer
        ───────────────────────────────────────────── */

        .cc-footer {
          position: relative;

          display: flex;
          align-items: center;
          justify-content: space-between;

          padding:
            10px
            14px;

          border-top:
            1px solid
            #EFEDE7;

          background:
            rgba(255,255,255,.88);
        }


        .cc-shortlist {
          display: inline-flex;
          align-items: center;

          gap: 5px;

          padding: 5px 0;

          border: none;

          background: transparent;

          color: #63666E;

          font-size: 10.5px;
          font-weight: 600;

          cursor: pointer;

          transition: color .15s ease;
        }

        .cc-shortlist:hover {
          color: #12151B;
        }

        .cc-shortlist.active {
          color: #1F8A5C;
        }

        .cc-shortlist-pop {
          display: inline-flex;

          animation:
            ccPop
            .45s
            ease;
        }


        .cc-view {
          display: inline-flex;
          align-items: center;

          gap: 4px;

          padding:
            7px
            10px;

          border: none;

          border-radius: 8px;

          background: #12151B;

          color: #FFFFFF;

          font-size: 10.5px;
          font-weight: 700;

          cursor: pointer;

          transition:
            background .15s ease,
            transform .15s ease;
        }

        .cc-view:hover {
          background: #2A2E37;

          transform:
            translateX(1px);
        }

        .cc-view svg {
          transition:
            transform .15s ease;
        }

        .cc-view:hover svg {
          transform:
            translateX(2px);
        }


        /* ─────────────────────────────────────────────
           Selection indicator
        ───────────────────────────────────────────── */

        .cc-select {
          position: absolute;

          left: -1px;
          top: 18px;

          width: 3px;
          height: 34px;

          border-radius:
            0
            4px
            4px
            0;

          background: #12151B;

          opacity: 0;

          transform:
            translateX(-4px);

          transition:
            opacity .18s ease,
            transform .18s ease;
        }

        .cc-root:hover .cc-select,
        .cc-root.is-selected .cc-select {
          opacity: 1;

          transform:
            translateX(0);
        }


        /* ─────────────────────────────────────────────
           Checkbox
        ───────────────────────────────────────────── */

        .cc-checkbox {
          position: absolute;

          top: 13px;
          left: 13px;

          width: 19px;
          height: 19px;

          z-index: 10;

          display: flex;
          align-items: center;
          justify-content: center;

          border:
            1.5px solid
            #C9C5BA;

          border-radius: 6px;

          background: #FFFFFF;

          cursor: pointer;

          opacity: 0;

          transition:
            opacity .15s ease,
            background .15s ease,
            border-color .15s ease;
        }

        .cc-root:hover .cc-checkbox,
        .cc-root.is-selected .cc-checkbox {
          opacity: 1;
        }

        .cc-checkbox.checked {
          background: #12151B;

          border-color:
            #12151B;
        }


        /* ─────────────────────────────────────────────
           Small responsive adjustment
        ───────────────────────────────────────────── */

        @media (max-width: 500px) {
          .cc-card {
            min-height: 360px;
          }

          .cc-identity {
            padding-top: 15px;
          }

          .cc-name {
            font-size: 15px;
          }
        }

      `}</style>


      <div className="cc-card">

        {/* ambient color field */}
        <div className="cc-ambient" />

        {/* selected marker */}
        <div className="cc-select" />


        {/* ─────────────────────────────────────────────
            HEADER
        ───────────────────────────────────────────── */}

        <div className="cc-header">

          <div className="cc-index">
            <span>{cardNumber}</span>
            <span className="cc-index-line" />
          </div>


          <div className="cc-actions">

            {candidate.linkedin && (
              <a
                className="cc-action"
                href={candidate.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                title="Open LinkedIn profile"
              >
                <ExternalLink size={12} />
              </a>
            )}

            <button
              className="cc-action"
              onClick={() => onEdit(candidate)}
              title="Edit candidate"
            >
              <Edit2 size={12} />
            </button>

            <button
              className="cc-action danger"
              onClick={() => onDelete(candidate.id)}
              title="Remove candidate"
            >
              <Trash2 size={12} />
            </button>

          </div>

        </div>


        {/* ─────────────────────────────────────────────
            IDENTITY
        ───────────────────────────────────────────── */}

        <div className="cc-identity">

          <div className="cc-avatar-wrap">

            <div className="cc-avatar-ring" />

            <img
              className="cc-avatar"
              src={avatarUrl(candidate.fullName, candidate.avatarUrl)}
              alt={candidate.fullName}
            />

            <div className="cc-score-badge">
              {candidate.matchScore}%
            </div>

          </div>


          <div style={{ minWidth: 0 }}>

            <div className="cc-name">
              {candidate.fullName}
            </div>

            <div className="cc-headline">
              {candidate.headline}
            </div>

            <div
              className="cc-tier"
              style={{
                color: tier.color,
              }}
            >
              <span
                className="cc-tier-dot"
                style={{
                  background: tier.color,
                }}
              />

              {tier.label}
            </div>

          </div>

        </div>


        {/* ─────────────────────────────────────────────
            META
        ───────────────────────────────────────────── */}

        <div className="cc-meta">

          <div className="cc-meta-item">
            <MapPin size={11} />

            <span>
              {candidate.location}
            </span>
          </div>


          <div className="cc-meta-item">
            <Briefcase size={11} />

            <span>
              {candidate.experienceYears} yrs experience
            </span>
          </div>

        </div>


        {/* ─────────────────────────────────────────────
            SUMMARY
        ───────────────────────────────────────────── */}

        <div className="cc-summary">
          {candidate.summary}
        </div>


        {/* ─────────────────────────────────────────────
            MATCH SIGNAL
        ───────────────────────────────────────────── */}

        <MatchSignal
          score={candidate.matchScore}
          color={tier.color}
          expanded={reasoningOpen}
          onClick={() =>
            setReasoningOpen(value => !value)
          }
        />


        {/* ─────────────────────────────────────────────
            REASONING
        ───────────────────────────────────────────── */}

        {reasoningOpen && (
          <div className="cc-reasoning">

            {reasoning.map((reason) => (
              <div
                className="cc-reason"
                key={reason.label}
              >

                <div className="cc-reason-label">
                  {reason.label}
                </div>

                <div className="cc-reason-main">

                  <div className="cc-reason-value">
                    {reason.value}
                  </div>

                  <div className="cc-reason-detail">
                    {reason.detail}
                  </div>

                </div>

              </div>
            ))}

          </div>
        )}


        {/* ─────────────────────────────────────────────
            SKILLS
        ───────────────────────────────────────────── */}

        <div className="cc-skills">

          {visibleSkills.map((skill, i) => (
            <span
              key={skill}
              className={`cc-skill ${
                i === 0 ? 'primary' : ''
              }`}
              style={{
                animationDelay: `${i * 25}ms`,
              }}
            >
              {skill}
            </span>
          ))}


          {hiddenSkills > 0 && (
            <button
              className="cc-more"
              onClick={() => setSkillsExpanded(true)}
            >
              +{hiddenSkills}
            </button>
          )}

        </div>


        <div className="cc-spacer" />


        {/* ─────────────────────────────────────────────
            FOOTER
        ───────────────────────────────────────────── */}

        <div className="cc-footer">

          {selectedJobId ? (

            <button
              className={`cc-shortlist ${
                isSavedForJob ? 'active' : ''
              }`}
              onClick={handleSave}
            >

              <span
                className={
                  justSaved
                    ? 'cc-shortlist-pop'
                    : ''
                }
              >
                {isSavedForJob ? (
                  <BookmarkCheck size={14} />
                ) : (
                  <Bookmark size={14} />
                )}
              </span>

              {isSavedForJob
                ? 'Shortlisted'
                : 'Shortlist'}

            </button>

          ) : (

            <span
              style={{
                fontSize: 10,
                color: '#9B9C9E',
                fontStyle: 'italic',
              }}
            >
              Select a role to save
            </span>

          )}


          <button
            className="cc-view"
            onClick={(event) =>
              onViewDetails(candidate, event)
            }
          >
            Profile

            <ArrowUpRight size={12} />
          </button>

        </div>


        {/* selection checkbox */}

        <button
          className={`cc-checkbox ${
            selected ? 'checked' : ''
          }`}
          onClick={() =>
            onToggleSelect(candidate.id)
          }
          aria-label={
            selected
              ? 'Deselect candidate'
              : 'Select candidate'
          }
        >
          {selected && (
            <Check
              size={11}
              color="#FFFFFF"
              strokeWidth={3}
            />
          )}
        </button>

      </div>

    </div>
  );
}


export default CandidateCard;