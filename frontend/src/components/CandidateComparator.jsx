/**
 * CandidateComparator — redesigned
 *
 * Design intent: a comparator's whole job is to make differences visible:
 *  - Shared skills are pulled out and marked distinctly from each candidate's
 *    unique skills, so overlap is legible at a glance.
 *  - Whichever candidate wins a row (more experience, higher score) gets a
 *    quiet highlight on that row only.
 *  - Selecting candidate chips lets recruiters freely toggle and swap candidates.
 *  - Individual column close buttons let recruiters dismiss a candidate directly.
 *
 * Same token system as CandidateCard: ink #12151B, paper #F7F5F1,
 * tier colors for score (coral / cyan / slate).
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  ArrowRightLeft,
  MapPin,
  Briefcase,
  Mail,
  Globe,
  ExternalLink,
  Crown,
  Check,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

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

/**
 * Score labels
 */
function scoreTier(score, isFrench = false) {
  const val = Number(score) || 0;

  if (val >= 90) {
    return {
      color: '#E85D3D',
      soft: '#FDEEE9',
      label: isFrench ? 'profil prioritaire' : 'hot lead',
    };
  }

  if (val >= 80) {
    return {
      color: '#0BA5C9',
      soft: '#E9F7FA',
      label: isFrench ? 'forte correspondance' : 'good match',
    };
  }

  return {
    color: '#8A8F98',
    soft: '#F1F1F2',
    label: isFrench ? 'profil potentiel' : 'possible fit',
  };
}

function avatarUrl(name) {
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
    name || 'Candidate'
  )}&backgroundColor=12151B&textColor=ffffff&fontWeight=600&fontSize=38`;
}

function MiniRing({ score, color, size = 44 }) {
  const [drawn, setDrawn] = useState(0);

  const r = (size - 5) / 2;
  const c = 2 * Math.PI * r;

  useEffect(() => {
    const t = setTimeout(() => setDrawn(score), 100);

    return () => clearTimeout(t);
  }, [score]);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ transform: 'rotate(-90deg)' }}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#EAE7E0"
        strokeWidth="3"
      />

      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c - (drawn / 100) * c}
        style={{
          transition:
            'stroke-dashoffset .9s cubic-bezier(0.22,1,0.36,1)',
        }}
      />
    </svg>
  );
}

export function CandidateComparator({
  isOpen = true,
  onClose = () => { },
  candidates = [],
  initialSelectedIds = null,
  onViewCandidate,
}) {
  useFonts();

  const { lang } = useLanguage();

  const isFrench =
    typeof lang === 'string' &&
    lang.toUpperCase().startsWith('FR');

  /*
   * All translations used by this component.
   * No other file needs to be changed.
   */
  const text = {
    compareCandidates: isFrench
      ? 'Comparer les candidats'
      : 'Compare Candidates',

    subtitle: isFrench
      ? 'Les compétences partagées et les points forts de chaque candidat sont mis en évidence automatiquement'
      : 'Shared skills and the stronger value in each row are highlighted automatically',

    close: isFrench ? 'Fermer' : 'Close',

    selected: isFrench ? 'Sélectionnés' : 'Comparing',

    clickToRemove: isFrench
      ? 'Cliquer pour retirer'
      : 'Click to remove',

    clickToCompare: isFrench
      ? 'Cliquer pour comparer'
      : 'Click to compare',

    removeFromComparison: isFrench
      ? 'Retirer de la comparaison'
      : 'Remove from comparison',

    experienceLocation: isFrench
      ? 'Expérience & localisation'
      : 'Experience & location',

    yearsExperience: isFrench
      ? 'ans d’expérience'
      : 'years experience',

    highest: isFrench ? 'plus élevé' : 'most',

    expectationsAvailability: isFrench
      ? 'Prétentions & disponibilité'
      : 'Expectations & availability',

    notSpecified: isFrench
      ? 'Non spécifié'
      : 'Not specified',

    immediate: isFrench
      ? 'Immédiate'
      : 'Immediate',

    techSkills: isFrench
      ? 'Compétences techniques'
      : 'Tech skills',

    sharedSkills: isFrench
      ? 'compétences partagées'
      : 'shared across everyone compared',

    aiRationale: isFrench
      ? 'Justification de correspondance IA'
      : 'AI match rationale',
  };

  const [selectedIds, setSelectedIds] = useState(() => {
    if (
      Array.isArray(initialSelectedIds) &&
      initialSelectedIds.length > 0
    ) {
      const valid = initialSelectedIds.filter((id) =>
        candidates.some((c) => c.id === id)
      );

      if (valid.length > 0) {
        return valid.slice(0, 3);
      }
    }

    return candidates
      .slice(0, Math.min(candidates.length, 3))
      .map((c) => c.id);
  });

  /*
   * Track changes to candidates/initialSelectedIds by composite identity
   * to avoid resetting on simple re-renders.
   */
  const candidateIdsKey = useMemo(
    () => candidates.map((c) => c.id).join(','),
    [candidates]
  );

  const initialIdsKey = useMemo(
    () =>
      Array.isArray(initialSelectedIds)
        ? initialSelectedIds.join(',')
        : '',
    [initialSelectedIds]
  );

  const lastKeyRef = useRef(
    `${candidateIdsKey}::${initialIdsKey}`
  );

  useEffect(() => {
    const currentKey = `${candidateIdsKey}::${initialIdsKey}`;

    if (lastKeyRef.current !== currentKey) {
      lastKeyRef.current = currentKey;

      if (
        Array.isArray(initialSelectedIds) &&
        initialSelectedIds.length > 0
      ) {
        const valid = initialSelectedIds.filter((id) =>
          candidates.some((c) => c.id === id)
        );

        if (valid.length > 0) {
          setSelectedIds(valid.slice(0, 3));
          return;
        }
      }

      setSelectedIds(
        candidates
          .slice(0, Math.min(candidates.length, 3))
          .map((c) => c.id)
      );
    }
  }, [
    candidateIdsKey,
    initialIdsKey,
    initialSelectedIds,
    candidates,
  ]);

  /*
   * Derive selected list BEFORE hooks so useMemo deps are stable.
   */
  const selected = useMemo(() => {
    const matched = candidates.filter((c) =>
      selectedIds.includes(c.id)
    );

    if (matched.length > 0) {
      return matched;
    }

    return candidates.slice(
      0,
      Math.min(candidates.length, 3)
    );
  }, [candidates, selectedIds]);

  const count = selected.length;

  /*
   * ALL hooks must be called unconditionally before any early return.
   */
  const sharedSkills = useMemo(() => {
    if (selected.length < 2) {
      return new Set();
    }

    const [first, ...rest] = selected.map(
      (c) => new Set(c.skills || [])
    );

    return new Set(
      [...first].filter((skill) =>
        rest.every((set) => set.has(skill))
      )
    );
  }, [selected]);

  const maxExp = useMemo(
    () =>
      selected.length
        ? Math.max(
          ...selected.map(
            (c) => Number(c.experienceYears) || 0
          )
        )
        : 0,
    [selected]
  );

  const maxScore = useMemo(
    () =>
      selected.length
        ? Math.max(
          ...selected.map(
            (c) => Number(c.matchScore) || 0
          )
        )
        : 0,
    [selected]
  );

  const expTied =
    selected.filter(
      (c) =>
        (Number(c.experienceYears) || 0) === maxExp
    ).length === selected.length;

  const scoreTied =
    selected.filter(
      (c) => (Number(c.matchScore) || 0) === maxScore
    ).length === selected.length;

  function toggleSelect(id) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        if (prev.length > 1) {
          return prev.filter((x) => x !== id);
        }

        return prev;
      }

      if (prev.length < 3) {
        return [...prev, id];
      }

      /*
       * If 3 are already selected, swap the first
       * candidate out and add the new one.
       */
      return [...prev.slice(1), id];
    });
  }

  function removeCandidate(id) {
    setSelectedIds((prev) => {
      if (prev.length > 1) {
        return prev.filter((x) => x !== id);
      }

      return prev;
    });
  }

  /*
   * Guard after all hooks.
   */
  if (!isOpen) {
    return null;
  }

  return (
    <div className="cp-overlay">
      <style>{`
        @keyframes cpFadeIn {
          from {
            opacity: 0;
          }

          to {
            opacity: 1;
          }
        }

        @keyframes cpModalIn {
          from {
            opacity: 0;
            transform: scale(0.97) translateY(6px);
          }

          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes cpColIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .cp-overlay {
          position: fixed;
          inset: 0;
          z-index: 2000;
          overflow-y: auto;
          background: rgba(18,21,27,0.55);
          backdrop-filter: blur(3px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          animation: cpFadeIn .2s ease both;
          font-family: 'Inter', system-ui, sans-serif;
        }

        .cp-modal {
          background: #FBFAF7;
          border: 1px solid #E4E1D9;
          border-radius: 20px;
          max-width: 1200px;
          width: 100%;
          max-height: 90vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow:
            0 30px 70px -30px rgba(18,21,27,0.45);
          animation:
            cpModalIn .25s cubic-bezier(0.22,1,0.36,1) both;
        }

        .cp-header {
          padding: 18px 22px;
          border-bottom: 1px solid #E4E1D9;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .cp-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .cp-header-icon {
          width: 32px;
          height: 32px;
          border-radius: 9px;
          background: #F1F1EC;
          color: #12151B;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .cp-title {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 15px;
          font-weight: 700;
          color: #12151B;
        }

        .cp-sub {
          font-size: 12px;
          color: #63666E;
          margin-top: 2px;
        }

        .cp-close {
          background: none;
          border: none;
          color: #9B9C9E;
          cursor: pointer;
          padding: 6px;
          border-radius: 8px;
          transition: all .15s ease;
        }

        .cp-close:hover {
          color: #12151B;
          background: #F1F1EC;
        }

        .cp-selector {
          padding: 12px 22px;
          border-bottom: 1px solid #E4E1D9;
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          background: #FFFFFF;
        }

        .cp-selector-label {
          font-size: 11px;
          font-weight: 700;
          color: #63666E;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .cp-chip-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }

        .cp-chip {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 12px;
          font-weight: 600;
          padding: 5px 12px 5px 6px;
          border-radius: 20px;
          border: 1px solid #E4E1D9;
          background: #FBFAF7;
          color: #3A3D44;
          cursor: pointer;
          transition: all .15s ease;
          user-select: none;
        }

        .cp-chip img {
          width: 22px;
          height: 22px;
          border-radius: 50%;
        }

        .cp-chip:hover {
          border-color: #08AFCB;
          background: #F2FBFC;
          color: #078DA5;
        }

        .cp-chip.active {
          background: #12151B;
          color: #FFFFFF;
          border-color: #12151B;
        }

        .cp-chip-score {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10.5px;
          opacity: 0.75;
          font-weight: 700;
        }

        .cp-body {
          padding: 20px 22px 24px;
          overflow-y: auto;
          flex: 1;
        }

        .cp-grid {
          display: flex;
          gap: 16px;
          align-items: stretch;
          justify-content: center;
        }

        .cp-col {
          background: #FFFFFF;
          border: 1px solid #E4E1D9;
          border-radius: 16px;
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          flex: 1 1 0;
          min-width: 250px;
          max-width: 400px;
          transition:
            flex-basis .3s cubic-bezier(0.22,1,0.36,1);
          animation:
            cpColIn .35s cubic-bezier(0.22,1,0.36,1) both;
          position: relative;
        }

        .cp-col-head {
          text-align: center;
          padding-bottom: 12px;
          border-bottom: 1px solid #EFEDE7;
          position: relative;
        }

        .cp-crown {
          position: absolute;
          top: -6px;
          left: 50%;
          transform: translateX(-50%);
          color: #E8B23D;
        }

        .cp-col-remove {
          position: absolute;
          top: -6px;
          right: -6px;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          border: 1px solid #E4E1D9;
          background: #FFFFFF;
          color: #9B9C9E;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all .15s ease;
        }

        .cp-col-remove:hover {
          color: #E85D3D;
          border-color: #F8D5CE;
          background: #FDF4F2;
        }

        .cp-ring-wrap {
          position: relative;
          width: 44px;
          height: 44px;
          margin: 0 auto 8px;
        }

        .cp-col-avatar {
          position: absolute;
          top: 4px;
          left: 4px;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          object-fit: cover;
        }

        .cp-col-name {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 14px;
          font-weight: 700;
          color: #12151B;
        }

        .cp-col-headline {
          font-size: 11px;
          color: #63666E;
          margin-top: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .cp-tier-pill {
          display: inline-block;
          font-size: 10.5px;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 20px;
          margin-top: 8px;
        }

        .cp-block-label {
          font-size: 10px;
          font-weight: 700;
          color: #9B9C9E;
          letter-spacing: .03em;
          margin-bottom: 6px;
          text-transform: uppercase;
        }

        .cp-block-box {
          background: #FBFAF7;
          border: 1px solid #EFEDE7;
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 11.5px;
          color: #3A3D44;
          font-weight: 500;
          transition: all .2s ease;
        }

        .cp-block-box.winner {
          background: #FDEEE9;
          border-color: rgba(232,93,61,0.3);
        }

        .cp-block-row {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .cp-block-row + .cp-block-row {
          margin-top: 5px;
        }

        .cp-winner-tag {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 3px;
          font-size: 9.5px;
          font-weight: 700;
          color: #E85D3D;
        }

        .cp-avail {
          font-size: 10px;
          color: #9B9C9E;
          margin-top: 3px;
        }

        .cp-skills-count {
          font-size: 10.5px;
          color: #63666E;
          margin-bottom: 7px;
        }

        .cp-skills {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
        }

        .cp-skill {
          font-size: 10.5px;
          font-weight: 500;
          padding: 3px 9px;
          border-radius: 20px;
          border: 1px solid transparent;
        }

        .cp-skill.shared {
          background: #12151B;
          color: #FFFFFF;
          font-weight: 600;
        }

        .cp-skill.unique {
          background: #F1F1EC;
          color: #63666E;
        }

        .cp-reasons {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .cp-reason {
          display: flex;
          align-items: flex-start;
          gap: 7px;
          font-size: 11px;
          color: #3A3D44;
          line-height: 1.5;
        }

        .cp-reason-dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #08AFCB;
          flex-shrink: 0;
          margin-top: 6px;
        }

        .cp-contacts {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
          padding-top: 8px;
          margin-top: auto;
          border-top: 1px solid #F1EFEA;
        }

        .cp-contact-link {
          color: #9B9C9E;
          transition: color .15s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .cp-contact-link:hover {
          color: #12151B;
        }

        @media (max-width: 800px) {
          .cp-grid {
            flex-direction: column;
          }

          .cp-col {
            max-width: 100%;
          }
        }
      `}</style>

      <div className="cp-modal">

        {/* HEADER */}
        <div className="cp-header">
          <div className="cp-header-left">

            <div className="cp-header-icon">
              <ArrowRightLeft size={15} />
            </div>

            <div>
              <div className="cp-title">
                {text.compareCandidates}
              </div>

              <div className="cp-sub">
                {text.subtitle}
              </div>
            </div>

          </div>

          <button
            className="cp-close"
            onClick={onClose}
            aria-label={text.close}
            title={text.close}
          >
            <X size={16} />
          </button>
        </div>

        {/* CANDIDATE SELECTOR */}
        <div className="cp-selector">

          <span className="cp-selector-label">
            {text.selected} ({count}/3):
          </span>

          <div className="cp-chip-row">

            {candidates.map((c) => {
              const isSel = selectedIds.includes(c.id);

              return (
                <button
                  key={c.id}
                  className={`cp-chip${isSel ? ' active' : ''}`}
                  onClick={() => toggleSelect(c.id)}
                  title={
                    isSel
                      ? text.clickToRemove
                      : text.clickToCompare
                  }
                >
                  <img
                    src={avatarUrl(c.fullName)}
                    alt=""
                  />

                  {c.fullName}

                  <span className="cp-chip-score">
                    {c.matchScore}%
                  </span>
                </button>
              );
            })}

          </div>
        </div>

        {/* COMPARISON BODY */}
        <div className="cp-body">

          <div className="cp-grid">

            {selected.map((candidate, i) => {
              const tier = scoreTier(
                candidate.matchScore,
                isFrench
              );

              const isTopScore =
                (Number(candidate.matchScore) || 0) ===
                maxScore &&
                !scoreTied &&
                count > 1;

              const isTopExp =
                (Number(candidate.experienceYears) || 0) ===
                maxExp &&
                !expTied &&
                count > 1;

              const candSkills = Array.isArray(
                candidate.skills
              )
                ? candidate.skills
                : [];

              const unique = candSkills.filter(
                (s) => !sharedSkills.has(s)
              );

              const shared = candSkills.filter((s) =>
                sharedSkills.has(s)
              );

              return (
                <div
                  className="cp-col"
                  key={candidate.id}
                  style={{
                    animationDelay: `${i * 40}ms`,
                  }}
                >

                  {/* CANDIDATE HEADER */}
                  <div className="cp-col-head">

                    {count > 1 && (
                      <button
                        type="button"
                        className="cp-col-remove"
                        onClick={() =>
                          removeCandidate(candidate.id)
                        }
                        title={text.removeFromComparison}
                        aria-label={text.removeFromComparison}
                      >
                        <X size={12} />
                      </button>
                    )}

                    {isTopScore && (
                      <Crown
                        size={16}
                        className="cp-crown"
                        fill="#E8B23D"
                      />
                    )}

                    <div className="cp-ring-wrap">
                      <MiniRing
                        score={
                          Number(candidate.matchScore) || 0
                        }
                        color={tier.color}
                      />

                      <img
                        className="cp-col-avatar"
                        src={avatarUrl(candidate.fullName)}
                        alt={candidate.fullName}
                      />
                    </div>

                    <div className="cp-col-name">
                      {candidate.fullName}
                    </div>

                    <div className="cp-col-headline">
                      {candidate.headline}
                    </div>

                    <div
                      className="cp-tier-pill"
                      style={{
                        color: tier.color,
                        background: tier.soft,
                      }}
                    >
                      {candidate.matchScore}% · {tier.label}
                    </div>

                  </div>

                  {/* EXPERIENCE + LOCATION */}
                  <div>
                    <div className="cp-block-label">
                      {text.experienceLocation}
                    </div>

                    <div
                      className={`cp-block-box${isTopExp ? ' winner' : ''
                        }`}
                    >
                      <div className="cp-block-row">

                        <Briefcase
                          size={12}
                          color={
                            isTopExp
                              ? '#E85D3D'
                              : '#63666E'
                          }
                        />

                        {candidate.experienceYears}{' '}
                        {text.yearsExperience}

                        {isTopExp && (
                          <span className="cp-winner-tag">
                            <Crown size={10} />
                            {text.highest}
                          </span>
                        )}

                      </div>

                      <div className="cp-block-row">

                        <MapPin
                          size={12}
                          color="#63666E"
                        />

                        {candidate.location}

                      </div>
                    </div>
                  </div>

                  {/* EXPECTATIONS + AVAILABILITY */}
                  <div>
                    <div className="cp-block-label">
                      {text.expectationsAvailability}
                    </div>

                    <div className="cp-block-box">

                      <div>
                        {candidate.salaryExpectation ||
                          text.notSpecified}
                      </div>

                      <div className="cp-avail">
                        {candidate.availability ||
                          text.immediate}
                      </div>

                    </div>
                  </div>

                  {/* TECH SKILLS */}
                  <div>
                    <div className="cp-block-label">
                      {text.techSkills}
                    </div>

                    {sharedSkills.size > 0 && (
                      <div className="cp-skills-count">
                        {`${shared.length} ${text.sharedSkills}`}
                      </div>
                    )}

                    <div className="cp-skills">

                      {shared.map((s) => (
                        <span
                          className="cp-skill shared"
                          key={s}
                        >
                          <Check
                            size={9}
                            style={{
                              marginRight: 3,
                              verticalAlign: -1,
                            }}
                          />

                          {s}
                        </span>
                      ))}

                      {unique.map((s) => (
                        <span
                          className="cp-skill unique"
                          key={s}
                        >
                          {s}
                        </span>
                      ))}

                    </div>
                  </div>

                  {/* AI MATCH RATIONALE */}
                  <div>
                    <div className="cp-block-label">
                      {text.aiRationale}
                    </div>

                    <ul className="cp-reasons">

                      {(
                        candidate.verifiedMatchReasons ||
                        [candidate.summary || '']
                      )
                        .slice(0, 3)
                        .map((r, idx) => (
                          <li
                            className="cp-reason"
                            key={idx}
                          >
                            <span className="cp-reason-dot" />

                            <span>{r}</span>
                          </li>
                        ))}

                    </ul>
                  </div>

                  {/* CONTACTS */}
                  <div className="cp-contacts">

                    {candidate.email && (
                      <a
                        className="cp-contact-link"
                        href={`mailto:${candidate.email}`}
                        title={candidate.email}
                        aria-label={candidate.email}
                      >
                        <Mail size={14} />
                      </a>
                    )}

                    {candidate.linkedin && (
                      <a
                        className="cp-contact-link"
                        href={candidate.linkedin}
                        target="_blank"
                        rel="noreferrer"
                        title="LinkedIn"
                        aria-label="LinkedIn"
                      >
                        <Globe size={14} />
                      </a>
                    )}

                    {candidate.github && (
                      <a
                        className="cp-contact-link"
                        href={candidate.github}
                        target="_blank"
                        rel="noreferrer"
                        title="GitHub"
                        aria-label="GitHub"
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}

                  </div>

                </div>
              );
            })}

          </div>
        </div>

      </div>
    </div>
  );
}

export default CandidateComparator;