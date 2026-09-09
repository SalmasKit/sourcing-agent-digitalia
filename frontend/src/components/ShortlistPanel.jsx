/**
 * ShortlistPanel — recruiter workspace redesign
 *
 * Design direction:
 *  - Job descriptions are treated as "role dossiers"
 *  - Description gets its own dedicated reading area
 *  - Metadata + skills are separated from the description
 *  - Candidates become a compact talent-pool list
 *  - Cyan/teal is the primary accent to match CandidateCard
 *  - Designed to stay readable as the number of saved candidates grows
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Download,
  Trash2,
  Eye,
  MapPin,
  Plus,
  BookmarkX,
  Users,
  ChevronLeft,
  ChevronRight,
  BriefcaseBusiness,
  Sparkles
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { getAvatarUrl } from '../utils/avatar';

const COPY = {
  EN: {
    title: 'Shortlists & Talent Pools',
    sub: 'Organize candidates around each role and keep every hiring brief in one place.',
    newJob: 'New job description',

    noJobsTitle: 'No job descriptions created yet',
    noJobsSub:
      'Create your first job description to save and organize candidates per role.',

    saved: 'saved',
    candidates: 'Candidates',
    candidate: 'Candidate',
    talentPool: 'Talent pool',
    roleBrief: 'Role brief',
    roleSignals: 'Role signals',
    location: 'Location',
    skills: 'Key skills',
    allLocations: 'All locations',

    noDescription: 'No description added for this role.',
    noCandidates:
      'No candidates saved for this role yet. Browse profiles in Sourcing and click "Save to Role".',

    match: 'Match',
    viewProfile: 'View profile',
    unsave: 'Remove from role',
    export: 'Export',
    delete: 'Delete',

    candidateCount: 'candidate',
    candidateCountPlural: 'candidates'
  },

  FR: {
    title: 'Shortlists & Viviers',
    sub:
      'Organisez vos candidats par poste et gardez chaque fiche de recrutement au même endroit.',
    newJob: 'Nouvelle fiche de poste',

    noJobsTitle: 'Aucune fiche de poste créée',
    noJobsSub:
      'Créez une première fiche de poste pour enregistrer et organiser des candidats par métier.',

    saved: 'enregistrés',
    candidates: 'Candidats',
    candidate: 'Candidat',
    talentPool: 'Viviers',
    roleBrief: 'Description du poste',
    roleSignals: 'Informations clés',
    location: 'Localisation',
    skills: 'Compétences clés',
    allLocations: 'Toutes localisations',

    noDescription: 'Aucune description ajoutée pour ce poste.',
    noCandidates:
      'Aucun candidat enregistré pour ce poste. Naviguez dans l’Espace Sourcing et cliquez sur "Enregistrer au poste".',

    match: 'Match',
    viewProfile: 'Voir le profil',
    unsave: 'Retirer du poste',
    export: 'Exporter',
    delete: 'Supprimer',

    candidateCount: 'candidat',
    candidateCountPlural: 'candidats'
  }
};

export function ShortlistPanel({
  jobDescriptions = [],
  candidates = [],
  savedRoleCandidates = {},
  onViewDetails = () => {},
  onToggleSaveCandidateForJob = () => {},
  onDeleteJob = () => {},
  onOpenJobModal = () => {}
}) {
  const { lang } = useLanguage();
  const t = COPY[lang] || COPY.EN;
  const fontsLoaded = useRef(false);

  const [page, setPage] = useState(0);
  const PAGE_SIZE = 4;
  const [expandedDescs, setExpandedDescs] = useState({});
  const DESC_LIMIT = 260;

  const toggleDesc = (id) =>
    setExpandedDescs(prev => ({ ...prev, [id]: !prev[id] }));

  // Sort most-recent first (IDs are timestamp-based: job-<timestamp>)
  const sortedJobs = useMemo(() =>
    [...jobDescriptions].sort((a, b) => {
      const tA = Number(String(a.id).replace(/\D/g, '')) || 0;
      const tB = Number(String(b.id).replace(/\D/g, '')) || 0;
      return tB - tA;
    }),
    [jobDescriptions]
  );
  const totalPages = Math.ceil(sortedJobs.length / PAGE_SIZE);
  const pagedJobs = sortedJobs.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  useEffect(() => {
    if (fontsLoaded.current) return;

    fontsLoaded.current = true;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap';

    document.head.appendChild(link);
  }, []);

  const handleExportRoleCSV = (job, roleSavedCandidates) => {
    if (roleSavedCandidates.length === 0) return;

    const headers = [
      'Full Name',
      'Headline',
      'Match Score',
      'Location',
      'Experience',
      'Email',
      'Skills'
    ];

    const rows = roleSavedCandidates.map((c) => [
      `"${c.fullName}"`,
      `"${c.headline}"`,
      `${c.matchScore}%`,
      `"${c.location}"`,
      `"${c.experienceYears} Years"`,
      `"${c.email || ''}"`,
      `"${(c.skills || []).join(', ')}"`
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');

    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `${job.title
        .toLowerCase()
        .replace(/\s+/g, '_')}_saved_candidates_${Date.now()}.csv`
    );

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="sp-root">
      <style>{`
        /* ============================================================
           DESIGN TOKENS
        ============================================================ */

        .sp-root {
          --sp-paper: #F6F7F9;
          --sp-surface: #FFFFFF;
          --sp-sunken: #EFF1F4;

          --sp-border: #E2E6EB;
          --sp-border-strong: #CBD2DC;

          --sp-ink-900: #10151F;
          --sp-ink-800: #1C2430;
          --sp-ink-700: #38414F;
          --sp-ink-500: #6B7280;
          --sp-ink-400: #96A0AC;

          --sp-cyan-900: #084C57;
          --sp-cyan-700: #0A5C68;
          --sp-cyan-600: #0E7C8C;
          --sp-cyan-500: #1595A5;
          --sp-cyan-300: #8CCDD3;
          --sp-cyan-100: #E1F2F3;

          --sp-green-700: #1F6E4A;
          --sp-green-100: #E3F5EC;

          --sp-danger: #B3261E;
          --sp-danger-bg: #FBEAE9;

          --font-display: 'Space Grotesk', 'Inter', sans-serif;
          --font-body: 'Inter', system-ui, sans-serif;
          --font-mono: 'JetBrains Mono', ui-monospace, monospace;

          font-family: var(--font-body);
          color: var(--sp-ink-900);
          background: var(--sp-paper);

          min-height: 100%;
        }

        .sp-root *,
        .sp-root *::before,
        .sp-root *::after {
          box-sizing: border-box;
        }

        .sp-display {
          font-family: var(--font-display);
          letter-spacing: -0.015em;
        }

        .sp-mono {
          font-family: var(--font-mono);
        }

        /* ============================================================
           PAGE
        ============================================================ */

        .sp-page {
          max-width: 1240px;
          margin: 0 auto;
          padding: 26px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        /* ============================================================
           TOP HEADER
        ============================================================ */

        .sp-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;

          padding: 20px 22px;

          background: var(--sp-surface);
          border: 1px solid var(--sp-border);
          border-radius: 18px;
        }

        .sp-topbar-left {
          display: flex;
          align-items: center;
          gap: 13px;
          min-width: 0;
        }

        .sp-topbar-icon {
          width: 40px;
          height: 40px;
          flex-shrink: 0;

          display: flex;
          align-items: center;
          justify-content: center;

          color: var(--sp-cyan-700);
          background: var(--sp-cyan-100);
          border: 1px solid rgba(14, 124, 140, 0.14);
          border-radius: 11px;
        }

        .sp-topbar-title {
          margin: 0;
          font-size: 17px;
          line-height: 1.2;
          font-weight: 700;
        }

        .sp-topbar-sub {
          margin-top: 3px;
          color: var(--sp-ink-500);
          font-size: 11.5px;
          line-height: 1.45;
        }

        .sp-new-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;

          border: 0;
          border-radius: 10px;
          padding: 9px 15px;

          background: var(--sp-ink-900);
          color: #fff;

          font-family: var(--font-body);
          font-size: 11.5px;
          font-weight: 700;

          cursor: pointer;
          transition:
            transform .15s ease,
            background .15s ease;
        }

        .sp-new-btn:hover {
          background: var(--sp-ink-800);
          transform: translateY(-1px);
        }

        /* ============================================================
           EMPTY
        ============================================================ */

        .sp-empty {
          background: var(--sp-surface);
          border: 1px dashed var(--sp-border-strong);
          border-radius: 18px;
          padding: 62px 30px;

          text-align: center;
        }

        .sp-empty-icon {
          width: 52px;
          height: 52px;
          margin: 0 auto 14px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 14px;
          background: var(--sp-sunken);
          color: var(--sp-ink-400);
        }

        .sp-empty-title {
          color: var(--sp-ink-700);
          font-size: 14px;
          font-weight: 700;
        }

        .sp-empty-sub {
          max-width: 440px;
          margin: 6px auto 0;
          color: var(--sp-ink-400);
          font-size: 11.5px;
          line-height: 1.6;
        }

        /* ============================================================
           ROLE DOSSIER
        ============================================================ */

        .sp-role {
          position: relative;

          background: var(--sp-surface);
          border: 1px solid var(--sp-border);
          border-radius: 18px;

          overflow: hidden;

          transition:
            border-color .18s ease,
            box-shadow .18s ease;
        }

        .sp-role:hover {
          border-color: var(--sp-border-strong);
          box-shadow: 0 10px 30px -22px rgba(16, 21, 31, 0.24);
        }

        /* Cyan rail */

        .sp-role-rail {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 3px;

          background: var(--sp-cyan-600);
          opacity: .9;
        }

        /* ============================================================
           ROLE HEADER
        ============================================================ */

        .sp-role-header {
          padding: 20px 22px 18px 24px;

          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;

          border-bottom: 1px solid var(--sp-border);
        }

        .sp-role-main {
          min-width: 0;
        }

        .sp-role-kicker {
          display: flex;
          align-items: center;
          gap: 7px;

          margin-bottom: 6px;

          color: var(--sp-cyan-700);
          font-family: var(--font-mono);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .sp-role-title-row {
          display: flex;
          align-items: center;
          gap: 9px;
          flex-wrap: wrap;
        }

        .sp-role-title {
          margin: 0;

          color: var(--sp-ink-900);
          font-size: 16px;
          line-height: 1.25;
          font-weight: 700;
        }

        .sp-saved-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;

          padding: 4px 8px;

          border-radius: 999px;
          border: 1px solid rgba(14, 124, 140, .18);

          background: var(--sp-cyan-100);
          color: var(--sp-cyan-700);

          font-family: var(--font-mono);
          font-size: 9px;
          font-weight: 700;
        }

        .sp-role-actions {
          display: flex;
          align-items: center;
          gap: 7px;
          flex-shrink: 0;
        }

        .sp-action {
          height: 31px;

          display: inline-flex;
          align-items: center;
          gap: 5px;

          padding: 0 10px;

          border: 1px solid var(--sp-border);
          border-radius: 8px;

          background: var(--sp-paper);
          color: var(--sp-ink-700);

          font-family: var(--font-body);
          font-size: 10.5px;
          font-weight: 600;

          cursor: pointer;

          transition:
            background .15s ease,
            border-color .15s ease,
            color .15s ease;
        }

        .sp-action:hover {
          background: var(--sp-sunken);
          border-color: var(--sp-border-strong);
        }

        .sp-action:disabled {
          opacity: .45;
          cursor: default;
        }

        .sp-action-delete:hover {
          color: var(--sp-danger);
          background: var(--sp-danger-bg);
          border-color: rgba(179, 38, 30, .2);
        }

        /* ============================================================
           ROLE CONTENT
        ============================================================ */

        .sp-role-content {
          display: grid;
          grid-template-columns: minmax(0, 1.5fr) minmax(260px, .75fr);
          gap: 0;
        }

        /* ============================================================
           ROLE BRIEF
        ============================================================ */

        .sp-brief {
          padding: 21px 24px 22px;

          border-right: 1px solid var(--sp-border);
        }

        .sp-section-label {
          display: flex;
          align-items: center;
          gap: 7px;

          margin-bottom: 11px;

          color: var(--sp-ink-400);

          font-family: var(--font-mono);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .sp-section-label svg {
          color: var(--sp-cyan-600);
        }

        .sp-description {
          margin: 0;

          color: var(--sp-ink-700);
          font-size: 12px;
          line-height: 1.7;

          max-width: 760px;

          white-space: pre-line;
        }

        .sp-description-empty {
          color: var(--sp-ink-400);
          font-style: italic;
        }

        /* ============================================================
           SIGNALS
        ============================================================ */

        .sp-signals {
          padding: 21px 22px;
          background: var(--sp-paper);
        }

        .sp-signal {
          padding: 10px 0;
          border-bottom: 1px solid var(--sp-border);
        }

        .sp-signal:first-of-type {
          padding-top: 0;
        }

        .sp-signal:last-child {
          border-bottom: 0;
          padding-bottom: 0;
        }

        .sp-signal-label {
          margin-bottom: 5px;

          color: var(--sp-ink-400);

          font-family: var(--font-mono);
          font-size: 8.5px;
          font-weight: 700;
          letter-spacing: .07em;
          text-transform: uppercase;
        }

        .sp-location {
          display: flex;
          align-items: center;
          gap: 6px;

          color: var(--sp-ink-700);
          font-size: 11px;
          font-weight: 600;
        }

        .sp-location svg {
          color: var(--sp-cyan-600);
          flex-shrink: 0;
        }

        .sp-skills {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
        }

        .sp-skill {
          padding: 4px 7px;

          border-radius: 5px;
          border: 1px solid var(--sp-border);

          background: var(--sp-surface);
          color: var(--sp-ink-700);

          font-family: var(--font-mono);
          font-size: 8.5px;
          font-weight: 500;
        }

        /* ============================================================
           TALENT POOL HEADER
        ============================================================ */

        .sp-pool {
          border-top: 1px solid var(--sp-border);
        }

        .sp-pool-header {
          min-height: 54px;

          padding: 13px 20px 13px 24px;

          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;

          background: var(--sp-surface);
          border-bottom: 1px solid var(--sp-border);
        }

        .sp-pool-title {
          display: flex;
          align-items: center;
          gap: 8px;

          color: var(--sp-ink-800);

          font-family: var(--font-display);
          font-size: 12px;
          font-weight: 700;
        }

        .sp-pool-title-icon {
          width: 25px;
          height: 25px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 7px;
          background: var(--sp-cyan-100);
          color: var(--sp-cyan-700);
        }

        .sp-pool-count {
          color: var(--sp-ink-400);

          font-family: var(--font-mono);
          font-size: 9px;
          font-weight: 600;
        }

        /* ============================================================
           CANDIDATE ROW
        ============================================================ */

        .sp-candidates {
          display: flex;
          flex-direction: column;
        }

        .sp-candidate {
          min-height: 66px;

          padding: 10px 20px 10px 24px;

          display: grid;
          grid-template-columns: minmax(220px, 1.35fr) minmax(130px, .65fr) auto;
          align-items: center;
          gap: 18px;

          background: var(--sp-surface);

          border-bottom: 1px solid var(--sp-border);

          transition: background .14s ease;
        }

        .sp-candidate:last-child {
          border-bottom: 0;
        }

        .sp-candidate:hover {
          background: #FBFCFD;
        }

        .sp-candidate-person {
          min-width: 0;

          display: flex;
          align-items: center;
          gap: 10px;
        }

        .sp-avatar {
          width: 37px;
          height: 37px;

          flex-shrink: 0;

          object-fit: cover;

          border-radius: 10px;
          border: 1px solid var(--sp-border);
          background: var(--sp-sunken);
        }

        .sp-person-info {
          min-width: 0;
        }

        .sp-person-name {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;

          color: var(--sp-ink-900);

          font-family: var(--font-display);
          font-size: 11.5px;
          font-weight: 700;
        }

        .sp-person-headline {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;

          margin-top: 2px;

          color: var(--sp-ink-500);
          font-size: 9.5px;
        }

        .sp-match {
          display: flex;
          flex-direction: column;
          gap: 4px;

          min-width: 110px;
        }

        .sp-match-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .sp-match-label {
          color: var(--sp-ink-400);

          font-family: var(--font-mono);
          font-size: 8px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .sp-match-value {
          color: var(--sp-cyan-700);

          font-family: var(--font-mono);
          font-size: 9px;
          font-weight: 700;
        }

        .sp-match-track {
          height: 4px;

          overflow: hidden;

          border-radius: 999px;
          background: var(--sp-sunken);
        }

        .sp-match-fill {
          height: 100%;
          border-radius: inherit;
          background: var(--sp-cyan-600);
        }

        .sp-candidate-actions {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .sp-icon-btn {
          width: 29px;
          height: 29px;

          display: flex;
          align-items: center;
          justify-content: center;

          border: 1px solid var(--sp-border);
          border-radius: 8px;

          background: var(--sp-paper);
          color: var(--sp-ink-500);

          cursor: pointer;

          transition:
            background .14s ease,
            color .14s ease,
            border-color .14s ease;
        }

        .sp-icon-btn:hover {
          background: var(--sp-cyan-100);
          border-color: rgba(14, 124, 140, .2);
          color: var(--sp-cyan-700);
        }

        .sp-icon-btn-danger:hover {
          background: var(--sp-danger-bg);
          border-color: rgba(179, 38, 30, .2);
          color: var(--sp-danger);
        }

        /* ============================================================
           EMPTY POOL
        ============================================================ */

        .sp-pool-empty {
          padding: 26px 24px;

          display: flex;
          align-items: center;
          gap: 12px;

          background: var(--sp-paper);
        }

        .sp-pool-empty-icon {
          width: 32px;
          height: 32px;

          flex-shrink: 0;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 8px;
          background: var(--sp-sunken);
          color: var(--sp-ink-400);
        }

        .sp-pool-empty-text {
          color: var(--sp-ink-400);
          font-size: 10.5px;
          line-height: 1.55;
        }

        /* ============================================================
           RESPONSIVE
        ============================================================ */

        @media (max-width: 900px) {
          .sp-role-content {
            grid-template-columns: 1fr;
          }

          .sp-brief {
            border-right: 0;
            border-bottom: 1px solid var(--sp-border);
          }

          .sp-candidate {
            grid-template-columns: minmax(180px, 1fr) minmax(110px, .55fr) auto;
            gap: 12px;
          }
        }

        @media (max-width: 700px) {
          .sp-page {
            padding: 14px;
          }

          .sp-topbar {
            align-items: flex-start;
          }

          .sp-topbar-sub {
            max-width: 420px;
          }

          .sp-role-header {
            flex-direction: column;
          }

          .sp-role-actions {
            width: 100%;
          }

          .sp-action {
            flex: 1;
            justify-content: center;
          }

          .sp-candidate {
            grid-template-columns: 1fr auto;
          }

          .sp-match {
            display: none;
          }
        }

        @media (max-width: 480px) {
          .sp-page {
            padding: 10px;
          }

          .sp-topbar {
            padding: 16px;
          }

          .sp-new-btn span {
            display: none;
          }

          .sp-new-btn {
            width: 34px;
            height: 34px;
            padding: 0;
            justify-content: center;
          }

          .sp-role-header {
            padding: 17px;
          }

          .sp-brief {
            padding: 18px;
          }

          .sp-signals {
            padding: 18px;
          }

          .sp-pool-header {
            padding-left: 17px;
            padding-right: 17px;
          }

          .sp-candidate {
            padding-left: 17px;
            padding-right: 17px;
          }
        }
      `}</style>

      <div className="sp-page">

        {/* ============================================================
            PAGE HEADER
        ============================================================ */}

        <header className="sp-topbar">
          <div className="sp-topbar-left">
            <div className="sp-topbar-icon">
              <FileText size={18} />
            </div>

            <div>
              <h2 className="sp-topbar-title sp-display">
                {t.title}
              </h2>

              <div className="sp-topbar-sub">
                {t.sub}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenJobModal}
            className="sp-new-btn"
          >
            <Plus size={14} />
            <span>{t.newJob}</span>
          </button>
        </header>

        {/* ============================================================
            EMPTY STATE
        ============================================================ */}

        {jobDescriptions.length === 0 ? (
          <div className="sp-empty">
            <div className="sp-empty-icon">
              <FileText size={23} />
            </div>

            <div className="sp-empty-title sp-display">
              {t.noJobsTitle}
            </div>

            <div className="sp-empty-sub">
              {t.noJobsSub}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {pagedJobs.map((job, index) => {
              const savedIds = savedRoleCandidates[job.id] || [];
              const globalIndex = page * PAGE_SIZE + index;

              const roleSavedCandidates = candidates.filter((candidate) =>
                savedIds.includes(candidate.id)
              );

              const desc = job.description || '';
              const isLong = desc.length > DESC_LIMIT;
              const isExpanded = expandedDescs[job.id];
              const displayedDesc = isLong && !isExpanded
                ? desc.slice(0, DESC_LIMIT) + '…'
                : desc;

              return (
                <section
                  key={job.id}
                  className="sp-role"
                >
                  <div className="sp-role-rail" />

                  {/* ROLE HEADER */}
                  <div className="sp-role-header">
                    <div className="sp-role-main">
                      <div className="sp-role-kicker">
                        <BriefcaseBusiness size={10} />
                        <span>{String(globalIndex + 1).padStart(2, '0')} · ROLE</span>
                      </div>

                      <div className="sp-role-title-row">
                        <h3 className="sp-role-title sp-display">
                          {job.title}
                        </h3>

                        <span className="sp-saved-pill">
                          <Users size={10} />
                          {roleSavedCandidates.length} {t.saved}
                        </span>
                      </div>
                    </div>

                    <div className="sp-role-actions">

                      <button
                        type="button"
                        onClick={() =>
                          handleExportRoleCSV(job, roleSavedCandidates)
                        }
                        disabled={roleSavedCandidates.length === 0}
                        className="sp-action"
                        title={t.export}
                      >
                        <Download size={12} />
                        {t.export}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => onDeleteJob(e, job.id)}
                        className="sp-action sp-action-delete"
                        title={t.delete}
                      >
                        <Trash2 size={12} />
                      </button>

                    </div>
                  </div>

                  {/* ==================================================
                      DESCRIPTION + SIGNALS
                  ================================================== */}

                  <div className="sp-role-content">

                    {/* ROLE BRIEF */}
                    <div className="sp-brief">
                      <div className="sp-section-label">
                        <FileText size={11} />
                        {t.roleBrief}
                      </div>

                      {desc ? (
                        <>
                          <p className="sp-description">{displayedDesc}</p>
                          {isLong && (
                            <button
                              type="button"
                              className="sp-desc-toggle"
                              onClick={() => toggleDesc(job.id)}
                            >
                              {isExpanded
                                ? <><ChevronUp size={11} /> Show less</>
                                : <><ChevronDown size={11} /> Read more</>}
                            </button>
                          )}
                        </>
                      ) : (
                        <p className="sp-description sp-description-empty">
                          {t.noDescription}
                        </p>
                      )}
                    </div>

                    {/* ROLE SIGNALS */}

                    <aside className="sp-signals">

                      <div className="sp-section-label">
                        <Sparkles size={11} />
                        {t.roleSignals}
                      </div>

                      {/* LOCATION */}

                      <div className="sp-signal">
                        <div className="sp-signal-label">
                          {t.location}
                        </div>

                        <div className="sp-location">
                          <MapPin size={12} />
                          <span>
                            {job.location || t.allLocations}
                          </span>
                        </div>
                      </div>

                      {/* SKILLS */}

                      <div className="sp-signal">
                        <div className="sp-signal-label">
                          {t.skills}
                        </div>

                        {job.skills && job.skills.length > 0 ? (
                          <div className="sp-skills">
                            {job.skills.map((skill, skillIndex) => (
                              <span
                                key={`${job.id}-skill-${skillIndex}`}
                                className="sp-skill"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span
                            style={{
                              color: 'var(--sp-ink-400)',
                              fontSize: 10
                            }}
                          >
                            —
                          </span>
                        )}
                      </div>

                    </aside>
                  </div>

                  {/* ==================================================
                      TALENT POOL
                  ================================================== */}

                  <div className="sp-pool">

                    <div className="sp-pool-header">

                      <div className="sp-pool-title">
                        <div className="sp-pool-title-icon">
                          <Users size={13} />
                        </div>

                        <span>{t.talentPool}</span>
                      </div>

                      <span className="sp-pool-count sp-mono">
                        {roleSavedCandidates.length}{' '}
                        {roleSavedCandidates.length === 1
                          ? t.candidateCount
                          : t.candidateCountPlural}
                      </span>

                    </div>

                    {roleSavedCandidates.length === 0 ? (
                      <div className="sp-pool-empty">

                        <div className="sp-pool-empty-icon">
                          <Users size={15} />
                        </div>

                        <div className="sp-pool-empty-text">
                          {t.noCandidates}
                        </div>

                      </div>
                    ) : (
                      <div className="sp-candidates">

                        {roleSavedCandidates.map((candidate) => {

                          const score = Math.max(
                            0,
                            Math.min(100, Number(candidate.matchScore) || 0)
                          );

                          return (
                            <div
                              key={candidate.id}
                              className="sp-candidate"
                            >

                              {/* PERSON */}

                              <div className="sp-candidate-person">

                                <img
                                  src={getAvatarUrl(
                                    candidate.fullName,
                                    candidate.avatarUrl
                                  )}
                                  alt={candidate.fullName}
                                  className="sp-avatar"
                                  onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = getAvatarUrl(
                                      candidate.fullName,
                                      null
                                    );
                                  }}
                                />

                                <div className="sp-person-info">
                                  <div className="sp-person-name">
                                    {candidate.fullName}
                                  </div>

                                  <div className="sp-person-headline">
                                    {candidate.headline}
                                  </div>
                                </div>

                              </div>

                              {/* MATCH */}

                              <div className="sp-match">

                                <div className="sp-match-top">
                                  <span className="sp-match-label">
                                    {t.match}
                                  </span>

                                  <span className="sp-match-value">
                                    {score}%
                                  </span>
                                </div>

                                <div className="sp-match-track">
                                  <div
                                    className="sp-match-fill"
                                    style={{
                                      width: `${score}%`
                                    }}
                                  />
                                </div>

                              </div>

                              {/* ACTIONS */}

                              <div className="sp-candidate-actions">

                                <button
                                  type="button"
                                  onClick={() =>
                                    onViewDetails(candidate)
                                  }
                                  className="sp-icon-btn"
                                  title={t.viewProfile}
                                >
                                  <Eye size={13} />
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    onToggleSaveCandidateForJob(
                                      candidate.id,
                                      job.id
                                    )
                                  }
                                  className="sp-icon-btn sp-icon-btn-danger"
                                  title={t.unsave}
                                >
                                  <BookmarkX size={13} />
                                </button>

                              </div>

                            </div>
                          );
                        })}

                      </div>
                    )}

                  </div>

                </section>
              );
            })}

            {/* PAGINATION */}
            {totalPages > 1 && (
              <div className="sp-pagination">
                <span className="sp-pagination-info">
                  Page {page + 1} of {totalPages}
                </span>
                <div className="sp-pagination-controls">
                  <button
                    className="sp-page-btn"
                    disabled={page === 0}
                    onClick={() => setPage(p => p - 1)}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i}
                      className={`sp-page-btn sp-page-num${page === i ? ' active' : ''}`}
                      onClick={() => setPage(i)}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    className="sp-page-btn"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage(p => p + 1)}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}

export default ShortlistPanel;