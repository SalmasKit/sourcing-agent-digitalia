import React, { useMemo, useEffect, useRef } from 'react';
import {
  Users, FileText, TrendingUp, Target, CheckCircle2, BarChart3,
  Award, ArrowUpRight, Search, BookmarkCheck, Star, Sparkles
} from 'lucide-react';

import { useLanguage } from '../context/LanguageContext';
import { getAvatarUrl as getAvatarUrlUtil } from '../utils/avatar';

function getAvatarUrl(name, avatarUrl) {
  return getAvatarUrlUtil(name, avatarUrl);
}

/* ------------------------------------------------------------------
   Copy
   ------------------------------------------------------------------ */
const COPY = {
  EN: {
    welcome: (n) => `Welcome back, ${n}`,
    workspaceNote: 'Metrics scoped to your workspace',
    dashboardTag: 'Dedicated analytics',
    dashboardSub: 'Isolated to your account',
    activeJDs: 'Active job descriptions', totalOf: (n) => `${n} total`,
    sourced: 'Sourced candidates', inPool: 'in talent pool',
    shortlisted: 'Shortlisted', ofPool: 'of pool',
    avgScore: 'Avg AI match score', matchAccuracy: 'matching accuracy',
    pipeline: 'Recruitment pipeline', allRoles: 'All roles',
    shortlistRate: 'Shortlist rate', interviewRate: 'Interview rate', hireRate: 'Hire rate',
    scoreDist: 'AI score distribution',
    topCandidate: 'Top candidate', matchScoreLbl: 'Match score', exp: 'yrs exp.',
    noCandidates: 'No candidates sourced yet',
    jdTitle: 'Job descriptions', noJDs: 'No job descriptions yet', saved: 'saved', more: 'more',
    recentSearches: 'Recent searches', noSearches: 'No searches yet', results: 'results',
    agentPerf: 'AI agent performance', agentSub: 'Real-time sourcing agent metrics',
    totalSearches: 'Total searches', avgMatch: 'Avg match score', inPipeline: 'In pipeline', profilesSourced: 'Profiles sourced',
    stages: { new: 'New', contacted: 'Contacted', interview: 'Interview', offer: 'Offer', hired: 'Hired' },
  },
  FR: {
    welcome: (n) => `Bienvenue, ${n}`,
    workspaceNote: 'Statistiques propres à votre espace',
    dashboardTag: 'Tableau de bord dédié',
    dashboardSub: 'Isolé à votre compte',
    activeJDs: 'Fiches de poste actives', totalOf: (n) => `${n} au total`,
    sourced: 'Candidats sourcés', inPool: 'dans le vivier',
    shortlisted: 'En shortlist', ofPool: 'du vivier',
    avgScore: 'Score moyen IA', matchAccuracy: 'précision de matching',
    pipeline: 'Pipeline de recrutement', allRoles: 'Tous les postes',
    shortlistRate: 'Taux shortlist', interviewRate: 'En entretien', hireRate: "Taux d'embauche",
    scoreDist: 'Distribution des scores',
    topCandidate: 'Meilleur profil', matchScoreLbl: 'Score de correspondance', exp: 'ans exp.',
    noCandidates: 'Aucun candidat sourcé',
    jdTitle: 'Fiches de poste', noJDs: 'Aucune fiche de poste créée', saved: 'sauvés', more: 'autres',
    recentSearches: 'Recherches récentes', noSearches: 'Aucune recherche effectuée', results: 'résultats',
    agentPerf: "Performance de l'agent IA", agentSub: "Métriques de l'agent en temps réel",
    totalSearches: 'Recherches totales', avgMatch: 'Score moyen', inPipeline: 'Dans le pipeline', profilesSourced: 'Profils sourcés',
    stages: { new: 'Nouveau', contacted: 'Contacté', interview: 'Entretien', offer: 'Offre', hired: 'Recruté' },
  },
};

/* ------------------------------------------------------------------
   Small chart primitives
   ------------------------------------------------------------------ */
function DonutRing({ percentage, size = 92 }) {
  const r = 30;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (percentage / 100) * circumference;
  return (
    <svg width={size} height={size} viewBox="0 0 70 70">
      <circle cx="35" cy="35" r={r} fill="none" stroke="var(--dg-sunken)" strokeWidth="7" />
      <circle
        cx="35" cy="35" r={r} fill="none" stroke="var(--dg-teal-600)" strokeWidth="7"
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
        transform="rotate(-90 35 35)" style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
      />
      <text x="35" y="39" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--dg-ink-900)" fontFamily="var(--font-display)">
        {percentage}%
      </text>
    </svg>
  );
}

function KpiCard({ icon: Icon, label, value, sub, trend, tone = 'teal' }) {
  return (
    <div className="dgd-kpi">
      <div className="dgd-kpi-top">
        <div className={`dgd-kpi-icon dgd-tone-${tone}`}><Icon size={16} /></div>
        {trend != null && (
          <span className={'dgd-trend ' + (trend >= 0 ? 'dgd-trend-up' : 'dgd-trend-down')}>
            <ArrowUpRight size={11} style={{ transform: trend < 0 ? 'rotate(90deg)' : 'none' }} />
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="dgd-kpi-value dg-display">{value}</div>
      <div className="dgd-kpi-label">{label}</div>
      {sub && <div className="dgd-kpi-sub">{sub}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------
   Main component
   ------------------------------------------------------------------ */
export function DashboardView({
  user = null,
  jobDescriptions = [],
  candidates = [],
  savedRoleCandidates = {},
  candidatePipelineStage = {},
  searchHistory = [],
  lang: langProp = null,
}) {
  const langContext = useLanguage();
  const currentLang = langProp || langContext?.lang || 'EN';
  const t = COPY[currentLang] || COPY.EN;
  const fontsLoaded = useRef(false);

  useEffect(() => {
    if (fontsLoaded.current) return;
    fontsLoaded.current = true;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap';
    document.head.appendChild(link);
  }, []);

  const stats = useMemo(() => {
    const totalJDs = jobDescriptions.length;
    const activeJDs = jobDescriptions.filter((j) => j.status !== 'archived').length;
    const totalCandidates = candidates.length;

    const allSavedIds = Object.values(savedRoleCandidates).flat();
    const uniqueSavedCount = new Set(allSavedIds).size;

    const avgScore = totalCandidates > 0
      ? Math.round(candidates.reduce((sum, c) => sum + (c.matchScore || 0), 0) / totalCandidates)
      : 0;

    const shortlistRate = totalCandidates > 0
      ? Math.round((uniqueSavedCount / totalCandidates) * 100)
      : 0;

    const topCandidate = [...candidates].sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))[0];

    const pipelineStages = {
      new: candidates.filter((c) => candidatePipelineStage[c.id] === 'new').length,
      contacted: candidates.filter((c) => candidatePipelineStage[c.id] === 'contacted').length,
      interview: candidates.filter((c) => candidatePipelineStage[c.id] === 'interview').length,
      offer: candidates.filter((c) => candidatePipelineStage[c.id] === 'offer').length,
      hired: candidates.filter((c) => candidatePipelineStage[c.id] === 'hired').length,
      rejected: candidates.filter((c) => candidatePipelineStage[c.id] === 'rejected').length,
    };
    const totalInPipeline = Object.values(pipelineStages).reduce((a, b) => a + b, 0);

    const scoreDist = [
      { key: '90-100', label: '90-100', value: candidates.filter((c) => c.matchScore >= 90).length },
      { key: '80-89', label: '80-89', value: candidates.filter((c) => c.matchScore >= 80 && c.matchScore < 90).length },
      { key: '70-79', label: '70-79', value: candidates.filter((c) => c.matchScore >= 70 && c.matchScore < 80).length },
      { key: '<70', label: '<70', value: candidates.filter((c) => c.matchScore < 70).length },
    ];

    return {
      totalJDs, activeJDs, totalCandidates, uniqueSavedCount,
      avgScore, shortlistRate, topCandidate, pipelineStages, totalInPipeline, scoreDist,
    };
  }, [jobDescriptions, candidates, savedRoleCandidates, candidatePipelineStage]);

  const pipelineData = [
    { key: 'new', label: t.stages.new, value: stats.pipelineStages.new, tone: 'neutral' },
    { key: 'contacted', label: t.stages.contacted, value: stats.pipelineStages.contacted, tone: 'teal-light' },
    { key: 'interview', label: t.stages.interview, value: stats.pipelineStages.interview, tone: 'bronze-light' },
    { key: 'offer', label: t.stages.offer, value: stats.pipelineStages.offer, tone: 'bronze' },
    { key: 'hired', label: t.stages.hired, value: stats.pipelineStages.hired, tone: 'green' },
  ];
  const maxPipeline = Math.max(...pipelineData.map((d) => d.value), 1);
  const recentSearches = [...searchHistory].reverse().slice(0, 5);
  const roleIsHR = user?.role === 'HR_ADMIN';

  return (
    <div className="dg-root dgd-root">
      <style>{`
        .dg-root {
          --dg-paper: #F6F7F9; --dg-surface: #FFFFFF; --dg-sunken: #EFF1F4;
          --dg-border: #E3E6EB; --dg-border-strong: #CBD2DC;
          --dg-ink-900: #10151F; --dg-ink-700: #38414F; --dg-ink-500: #6B7280; --dg-ink-400: #96A0AC;
          --dg-teal-700: #0A5C68; --dg-teal-600: #0E7C8C; --dg-teal-300: #8CCDD3; --dg-teal-100: #E1F2F3;
          --dg-bronze-700: #8A4B0C; --dg-bronze-600: #B4650F; --dg-bronze-500: #C97A1A; --dg-bronze-100: #FBEEDD;
          --dg-green-700: #1F6E4A; --dg-green-600: #278F5E; --dg-green-100: #E3F5EC;
          --dg-danger: #B3261E; --dg-danger-bg: #FBEAE9;
          --font-display: 'Space Grotesk', 'Inter', sans-serif;
          --font-body: 'Inter', system-ui, sans-serif;
          --font-mono: 'JetBrains Mono', ui-monospace, monospace;
          font-family: var(--font-body); color: var(--dg-ink-900); background: var(--dg-paper);
        }
        .dg-display { font-family: var(--font-display); letter-spacing: -0.01em; }
        .dgd-root { padding: 28px; max-width: 1200px; margin: 0 auto; }
        .dgd-section { display: flex; flex-direction: column; gap: 28px; }

        .dgd-banner {
          background: var(--dg-ink-900); border-radius: 20px; padding: 26px 28px; color: #fff;
          display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap;
        }
        .dgd-banner-left { display: flex; align-items: center; gap: 16px; }
        .dgd-avatar {
          width: 52px; height: 52px; border-radius: 14px; background: var(--dg-teal-600);
          display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 16px;
          flex-shrink: 0;
        }
        .dgd-avatar-bronze { background: var(--dg-bronze-600); }
        .dgd-welcome { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .dgd-welcome h2 { font-size: 19px; font-weight: 700; margin: 0; }
        .dgd-role-badge {
          font-family: var(--font-mono); font-size: 10px; font-weight: 500; letter-spacing: 0.05em;
          padding: 3px 9px; border-radius: 999px; border: 1px solid;
        }
        .dgd-role-badge-teal { color: #9FE0E8; background: rgba(14,124,140,0.25); border-color: rgba(14,124,140,0.45); }
        .dgd-role-badge-bronze { color: #F0C88A; background: rgba(180,101,15,0.22); border-color: rgba(180,101,15,0.45); }
        .dgd-banner-meta { font-size: 12px; color: rgba(255,255,255,0.6); margin-top: 4px; display: flex; align-items: center; gap: 8px; }
        .dgd-banner-right {
          display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12); border-radius: 14px; padding: 10px 16px;
        }
        .dgd-banner-right-title { font-size: 12.5px; font-weight: 700; }
        .dgd-banner-right-sub { font-size: 10.5px; color: rgba(255,255,255,0.5); }

        .dgd-kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .dgd-kpi {
          background: var(--dg-surface); border: 1px solid var(--dg-border); border-radius: 16px;
          padding: 18px; display: flex; flex-direction: column; gap: 10px;
        }
        .dgd-kpi-top { display: flex; align-items: center; justify-content: space-between; }
        .dgd-kpi-icon { width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
        .dgd-tone-teal { background: var(--dg-teal-100); color: var(--dg-teal-700); }
        .dgd-tone-bronze { background: var(--dg-bronze-100); color: var(--dg-bronze-700); }
        .dgd-tone-green { background: var(--dg-green-100); color: var(--dg-green-700); }
        .dgd-tone-neutral { background: var(--dg-sunken); color: var(--dg-ink-500); }
        .dgd-trend {
          display: flex; align-items: center; gap: 2px; font-size: 10px; font-weight: 700;
          padding: 2px 7px; border-radius: 999px; border: 1px solid;
        }
        .dgd-trend-up { color: var(--dg-green-700); background: var(--dg-green-100); border-color: rgba(31,110,74,0.25); }
        .dgd-trend-down { color: var(--dg-danger); background: var(--dg-danger-bg); border-color: rgba(179,38,30,0.25); }
        .dgd-kpi-value { font-size: 24px; font-weight: 700; line-height: 1; }
        .dgd-kpi-label { font-size: 11.5px; font-weight: 600; color: var(--dg-ink-700); }
        .dgd-kpi-sub { font-size: 10.5px; color: var(--dg-ink-400); }

        .dgd-charts-row { display: grid; grid-template-columns: 2fr 1fr; gap: 18px; }
        .dgd-card { background: var(--dg-surface); border: 1px solid var(--dg-border); border-radius: 16px; padding: 22px; }
        .dgd-card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
        .dgd-card-title { font-size: 13px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
        .dgd-card-tag {
          font-family: var(--font-mono); font-size: 10px; color: var(--dg-ink-500);
          background: var(--dg-sunken); border: 1px solid var(--dg-border); border-radius: 8px; padding: 3px 8px;
        }

        .dgd-bars { display: flex; align-items: flex-end; gap: 14px; height: 100px; }
        .dgd-bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px; }
        .dgd-bar-val { font-family: var(--font-mono); font-size: 11px; font-weight: 500; color: var(--dg-ink-700); }
        .dgd-bar { width: 100%; border-radius: 6px 6px 3px 3px; transition: height .5s ease; }
        .dgd-bar-label { font-size: 10px; font-weight: 600; color: var(--dg-ink-500); text-align: center; }
        .dgd-bar-neutral { background: var(--dg-border-strong); }
        .dgd-bar-teal-light { background: var(--dg-teal-300); }
        .dgd-bar-bronze-light { background: var(--dg-bronze-500); opacity: 0.55; }
        .dgd-bar-bronze { background: var(--dg-bronze-600); }
        .dgd-bar-green { background: var(--dg-green-600); }

        .dgd-conv-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 18px; padding-top: 18px; border-top: 1px solid var(--dg-border); }
        .dgd-conv { text-align: center; }
        .dgd-conv-val { font-size: 17px; font-weight: 700; }
        .dgd-conv-label { font-size: 10px; font-weight: 600; color: var(--dg-ink-500); margin-top: 2px; }

        .dgd-dist-row { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
        .dgd-dist-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .dgd-dist-label { font-size: 10.5px; font-weight: 600; color: var(--dg-ink-500); width: 44px; }
        .dgd-dist-track { flex: 1; background: var(--dg-sunken); border-radius: 999px; height: 6px; overflow: hidden; }
        .dgd-dist-fill { height: 100%; border-radius: 999px; transition: width .6s ease; }
        .dgd-dist-count { font-size: 10.5px; font-weight: 700; width: 18px; text-align: right; color: var(--dg-ink-700); }

        .dgd-bottom-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 18px; }
        .dgd-spotlight { background: var(--dg-ink-900); color: #fff; border-radius: 16px; padding: 22px; display: flex; flex-direction: column; justify-content: space-between; min-height: 190px; }
        .dgd-spotlight-tag { display: flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.05em; color: rgba(255,255,255,0.55); text-transform: uppercase; }
        .dgd-spotlight-person { display: flex; align-items: center; gap: 12px; margin: 14px 0; }
        .dgd-spotlight-img { width: 46px; height: 46px; border-radius: 12px; object-fit: cover; border: 1px solid rgba(255,255,255,0.2); }
        .dgd-spotlight-name { font-size: 14px; font-weight: 700; }
        .dgd-spotlight-headline { font-size: 10.5px; color: rgba(255,255,255,0.55); margin-top: 2px; }
        .dgd-spotlight-foot { display: flex; align-items: center; justify-content: space-between; }
        .dgd-spotlight-score { font-size: 28px; font-weight: 700; }
        .dgd-spotlight-score-label { font-size: 10px; color: rgba(255,255,255,0.5); font-weight: 600; }
        .dgd-spotlight-exp { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); border-radius: 10px; padding: 8px 12px; text-align: center; }
        .dgd-spotlight-empty { color: rgba(255,255,255,0.5); font-size: 12px; text-align: center; padding: 30px 0; }

        .dgd-list-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: var(--dg-paper); border: 1px solid var(--dg-border); border-radius: 12px; margin-bottom: 8px; }
        .dgd-list-title { font-size: 12px; font-weight: 700; color: var(--dg-ink-900); }
        .dgd-list-sub { font-size: 10.5px; color: var(--dg-ink-400); margin-top: 1px; }
        .dgd-list-badge { font-family: var(--font-mono); font-size: 10px; font-weight: 500; padding: 3px 8px; border-radius: 999px; border: 1px solid; flex-shrink: 0; }
        .dgd-list-badge-on { color: var(--dg-green-700); background: var(--dg-green-100); border-color: rgba(31,110,74,0.25); }
        .dgd-list-badge-off { color: var(--dg-ink-500); background: var(--dg-sunken); border-color: var(--dg-border); }
        .dgd-list-more { font-size: 10.5px; color: var(--dg-ink-400); text-align: center; font-weight: 600; }
        .dgd-empty { font-size: 12px; color: var(--dg-ink-400); text-align: center; padding: 26px 0; }

        .dgd-search-row { display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px; background: var(--dg-paper); border: 1px solid var(--dg-border); border-radius: 12px; margin-bottom: 8px; }
        .dgd-search-icon { width: 24px; height: 24px; border-radius: 7px; background: var(--dg-teal-100); color: var(--dg-teal-700); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .dgd-search-query { font-size: 11.5px; font-weight: 600; color: var(--dg-ink-900); }
        .dgd-search-meta { display: flex; align-items: center; gap: 8px; margin-top: 3px; }
        .dgd-search-date { font-size: 10px; color: var(--dg-ink-400); font-weight: 500; }
        .dgd-search-results { font-size: 10px; color: var(--dg-teal-700); font-weight: 700; }

        .dgd-perf { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px; }
        .dgd-perf-left { display: flex; align-items: center; gap: 12px; }
        .dgd-perf-icon { width: 36px; height: 36px; border-radius: 11px; background: var(--dg-teal-100); color: var(--dg-teal-700); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .dgd-perf-title { font-size: 12.5px; font-weight: 700; }
        .dgd-perf-sub { font-size: 10.5px; color: var(--dg-ink-400); }
        .dgd-perf-stats { display: flex; flex-wrap: wrap; gap: 26px; }
        .dgd-perf-stat { text-align: center; }
        .dgd-perf-stat-val { display: flex; align-items: center; justify-content: center; gap: 5px; color: var(--dg-teal-700); font-weight: 700; font-size: 16px; }
        .dgd-perf-stat-label { font-size: 9.5px; font-weight: 600; color: var(--dg-ink-400); margin-top: 2px; }

        @media (max-width: 980px) {
          .dgd-kpi-grid { grid-template-columns: repeat(2, 1fr); }
          .dgd-charts-row { grid-template-columns: 1fr; }
          .dgd-bottom-row { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="dgd-section">

        {/* Welcome banner */}
        <div className="dgd-banner">
          <div className="dgd-banner-left">
            <div className={'dgd-avatar dg-display' + (roleIsHR ? ' dgd-avatar-bronze' : '')}>
              {user?.fullName ? user.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2) : 'U'}
            </div>
            <div>
              <div className="dgd-welcome">
                <h2 className="dg-display">{t.welcome(user?.fullName || 'User')}</h2>
                <span className={'dgd-role-badge ' + (roleIsHR ? 'dgd-role-badge-bronze' : 'dgd-role-badge-teal')}>
                  {user?.role || 'RECRUITER'}
                </span>
              </div>
              <div className="dgd-banner-meta">
                <span>{user?.email || 'user@digitalia.io'}</span>
                <span>&bull;</span>
                <span>{t.workspaceNote}</span>
              </div>
            </div>
          </div>
          <div className="dgd-banner-right">
            <BarChart3 size={16} />
            <div>
              <div className="dgd-banner-right-title dg-display">{t.dashboardTag}</div>
              <div className="dgd-banner-right-sub">{t.dashboardSub}</div>
            </div>
          </div>
        </div>

        {/* KPI grid */}
        <div className="dgd-kpi-grid">
          <KpiCard icon={FileText} tone="teal" label={t.activeJDs} value={stats.activeJDs} sub={t.totalOf(stats.totalJDs)} />
          <KpiCard icon={Users} tone="neutral" label={t.sourced} value={stats.totalCandidates} sub={t.inPool} />
          <KpiCard icon={BookmarkCheck} tone="green" label={t.shortlisted} value={stats.uniqueSavedCount} sub={`${stats.shortlistRate}% ${t.ofPool}`} />
          <KpiCard icon={Target} tone="bronze" label={t.avgScore} value={stats.avgScore > 0 ? `${stats.avgScore}%` : '—'} sub={t.matchAccuracy} />
        </div>

        {/* Charts row */}
        <div className="dgd-charts-row">
          <div className="dgd-card">
            <div className="dgd-card-head">
              <span className="dgd-card-title dg-display"><TrendingUp size={15} color="var(--dg-teal-600)" />{t.pipeline}</span>
              <span className="dgd-card-tag">{t.allRoles}</span>
            </div>

            <div className="dgd-bars">
              {pipelineData.map((stage) => {
                const height = Math.max(14, (stage.value / maxPipeline) * 96);
                return (
                  <div className="dgd-bar-col" key={stage.key}>
                    <span className="dgd-bar-val">{stage.value}</span>
                    <div className={`dgd-bar dgd-bar-${stage.tone}`} style={{ height: `${height}px` }} />
                    <span className="dgd-bar-label">{stage.label}</span>
                  </div>
                );
              })}
            </div>

            <div className="dgd-conv-row">
              <div className="dgd-conv">
                <div className="dgd-conv-val dg-display" style={{ color: 'var(--dg-teal-700)' }}>{stats.shortlistRate}%</div>
                <div className="dgd-conv-label">{t.shortlistRate}</div>
              </div>
              <div className="dgd-conv">
                <div className="dgd-conv-val dg-display" style={{ color: 'var(--dg-bronze-700)' }}>
                  {stats.totalInPipeline > 0 ? Math.round((stats.pipelineStages.interview / stats.totalInPipeline) * 100) : 0}%
                </div>
                <div className="dgd-conv-label">{t.interviewRate}</div>
              </div>
              <div className="dgd-conv">
                <div className="dgd-conv-val dg-display" style={{ color: 'var(--dg-green-700)' }}>
                  {stats.totalInPipeline > 0 ? Math.round((stats.pipelineStages.hired / stats.totalInPipeline) * 100) : 0}%
                </div>
                <div className="dgd-conv-label">{t.hireRate}</div>
              </div>
            </div>
          </div>

          <div className="dgd-card">
            <div className="dgd-card-head" style={{ marginBottom: 14 }}>
              <span className="dgd-card-title dg-display"><Award size={15} color="var(--dg-teal-600)" />{t.scoreDist}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
              <DonutRing percentage={stats.avgScore} />
            </div>
            {stats.scoreDist.map((item, idx) => {
              const dotColor = ['var(--dg-green-600)', 'var(--dg-teal-600)', 'var(--dg-bronze-500)', 'var(--dg-border-strong)'][idx];
              const pct = stats.totalCandidates > 0 ? Math.round((item.value / stats.totalCandidates) * 100) : 0;
              return (
                <div className="dgd-dist-row" key={item.key}>
                  <span className="dgd-dist-dot" style={{ background: dotColor }} />
                  <span className="dgd-dist-label">{item.label}</span>
                  <div className="dgd-dist-track"><div className="dgd-dist-fill" style={{ width: `${pct}%`, background: dotColor }} /></div>
                  <span className="dgd-dist-count">{item.value}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom row */}
        <div className="dgd-bottom-row">
          <div className="dgd-spotlight">
            <span className="dgd-spotlight-tag"><Star size={13} color="var(--dg-bronze-500)" />{t.topCandidate}</span>
            {stats.topCandidate ? (
              <>
                <div className="dgd-spotlight-person">
                  <img
                    className="dgd-spotlight-img"
                    src={getAvatarUrl(stats.topCandidate.fullName, stats.topCandidate.avatarUrl)}
                    alt={stats.topCandidate.fullName}
                    onError={(e) => { e.target.onerror = null; e.target.src = getAvatarUrl(stats.topCandidate.fullName, null); }}
                  />
                  <div>
                    <div className="dgd-spotlight-name dg-display">{stats.topCandidate.fullName}</div>
                    <div className="dgd-spotlight-headline">{stats.topCandidate.headline}</div>
                  </div>
                </div>
                <div className="dgd-spotlight-foot">
                  <div>
                    <div className="dgd-spotlight-score dg-display">{stats.topCandidate.matchScore}%</div>
                    <div className="dgd-spotlight-score-label">{t.matchScoreLbl}</div>
                  </div>
                  <div className="dgd-spotlight-exp">
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{stats.topCandidate.experienceYears}y</div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>{t.exp}</div>
                  </div>
                </div>
              </>
            ) : (
              <div className="dgd-spotlight-empty">{t.noCandidates}</div>
            )}
          </div>

          <div className="dgd-card">
            <div className="dgd-card-title dg-display" style={{ marginBottom: 14 }}><FileText size={15} color="var(--dg-teal-600)" />{t.jdTitle}</div>
            {jobDescriptions.length === 0 ? (
              <div className="dgd-empty">{t.noJDs}</div>
            ) : (
              <>
                {jobDescriptions.slice(0, 4).map((job) => {
                  const savedCount = (savedRoleCandidates[job.id] || []).length;
                  return (
                    <div className="dgd-list-row" key={job.id}>
                      <div style={{ minWidth: 0 }}>
                        <div className="dgd-list-title">{job.title}</div>
                        <div className="dgd-list-sub">{job.location || 'All locations'}</div>
                      </div>
                      <span className={'dgd-list-badge ' + (savedCount > 0 ? 'dgd-list-badge-on' : 'dgd-list-badge-off')}>
                        {savedCount} {t.saved}
                      </span>
                    </div>
                  );
                })}
                {jobDescriptions.length > 4 && (
                  <div className="dgd-list-more">+{jobDescriptions.length - 4} {t.more}</div>
                )}
              </>
            )}
          </div>

          <div className="dgd-card">
            <div className="dgd-card-title dg-display" style={{ marginBottom: 14 }}><Search size={15} color="var(--dg-teal-600)" />{t.recentSearches}</div>
            {recentSearches.length === 0 ? (
              <div className="dgd-empty">{t.noSearches}</div>
            ) : (
              recentSearches.map((search, idx) => (
                <div className="dgd-search-row" key={idx}>
                  <div className="dgd-search-icon"><Search size={11} /></div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="dgd-search-query">{search.query || 'Search'}</div>
                    <div className="dgd-search-meta">
                      <span className="dgd-search-date">{search.date}</span>
                      <span className="dgd-search-results">{search.resultsCount} {t.results}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Agent performance footer */}
        <div className="dgd-card">
          <div className="dgd-perf">
            <div className="dgd-perf-left">
              <div className="dgd-perf-icon"><Sparkles size={16} /></div>
              <div>
                <div className="dgd-perf-title dg-display">{t.agentPerf}</div>
                <div className="dgd-perf-sub">{t.agentSub}</div>
              </div>
            </div>
            <div className="dgd-perf-stats">
              {[
                { label: t.totalSearches, value: searchHistory.length || 0, icon: Search },
                { label: t.avgMatch, value: stats.avgScore > 0 ? `${stats.avgScore}%` : '—', icon: Target },
                { label: t.inPipeline, value: stats.totalInPipeline, icon: CheckCircle2 },
                { label: t.profilesSourced, value: stats.totalCandidates, icon: Users },
              ].map((m, i) => {
                const Icon = m.icon;
                return (
                  <div className="dgd-perf-stat" key={i}>
                    <div className="dgd-perf-stat-val dg-display"><Icon size={13} />{m.value}</div>
                    <div className="dgd-perf-stat-label">{m.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default DashboardView;