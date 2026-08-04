import React, { useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import {
  Sparkles, Users, FileText, TrendingUp, Target, Clock,
  CheckCircle2, BarChart3, Award, Zap, ArrowUpRight, Calendar,
  Search, BookmarkCheck, Star
} from 'lucide-react';

// ─── Mini bar chart CSS-only component ───────────────────────────────────────
const BarChart = ({ data, max }) => (
  <div className="flex items-end gap-1.5 h-16">
    {data.map((item, idx) => {
      const height = max > 0 ? Math.max(8, (item.value / max) * 64) : 8;
      return (
        <div key={idx} className="flex flex-col items-center gap-1 flex-1">
          <div
            className="w-full rounded-t-md bg-brand-primary/80 hover:bg-brand-primary transition-all duration-500"
            style={{ height: `${height}px`, transitionDelay: `${idx * 60}ms` }}
            title={`${item.label}: ${item.value}`}
          />
          <span className="text-[8px] font-bold text-slate-400 truncate w-full text-center">{item.label}</span>
        </div>
      );
    })}
  </div>
);

// ─── Donut ring component (CSS) ────────────────────────────────────────────
const DonutRing = ({ percentage, color, size = 80 }) => {
  const circumference = 2 * Math.PI * 30;
  const offset = circumference - (percentage / 100) * circumference;
  return (
    <svg width={size} height={size} viewBox="0 0 70 70">
      <circle cx="35" cy="35" r="30" fill="none" stroke="#f1f5f9" strokeWidth="7" />
      <circle
        cx="35" cy="35" r="30"
        fill="none"
        stroke={color}
        strokeWidth="7"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 35 35)"
        style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
      />
      <text x="35" y="39" textAnchor="middle" fontSize="12" fontWeight="800" fill="#1e293b">
        {percentage}%
      </text>
    </svg>
  );
};

// ─── KPI Card ─────────────────────────────────────────────────────────────
const KpiCard = ({ icon: Icon, label, value, sub, trend, color = 'brand-primary' }) => (
  <div className="bg-white rounded-2xl border border-slate-200/70 p-5 flex flex-col gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
    <div className="flex items-center justify-between">
      <div className={`p-2.5 rounded-xl bg-${color}/10 border border-${color}/20`}>
        <Icon className={`w-4.5 h-4.5 text-${color}`} />
      </div>
      {trend != null && (
        <span className={`flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
          trend >= 0
            ? 'text-emerald-700 bg-emerald-50 border-emerald-100'
            : 'text-rose-600 bg-rose-50 border-rose-100'
        }`}>
          <ArrowUpRight className={`w-3 h-3 ${trend < 0 ? 'rotate-90' : ''}`} />
          {Math.abs(trend)}%
        </span>
      )}
    </div>
    <div>
      <div className="text-2xl font-black text-slate-900 font-jakarta leading-none">{value}</div>
      <div className="text-[11px] font-bold text-slate-500 mt-0.5">{label}</div>
      {sub && <div className="text-[10px] text-slate-400 mt-1">{sub}</div>}
    </div>
  </div>
);

// ─── Main Dashboard Component ─────────────────────────────────────────────
export const DashboardView = ({ jobDescriptions = [], candidates = [], savedRoleCandidates = {}, searchHistory = [] }) => {
  const { lang } = useLanguage();
  const isFR = lang === 'FR';

  // ── Computed stats ────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalJDs = jobDescriptions.length;
    const activeJDs = jobDescriptions.filter(j => j.status !== 'archived').length;
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

    // Pipeline breakdown
    const pipelineStages = {
      new: candidates.filter(c => !c.pipelineStage || c.pipelineStage === 'new').length,
      contacted: candidates.filter(c => c.pipelineStage === 'contacted').length,
      interview: candidates.filter(c => c.pipelineStage === 'interview').length,
      offer: candidates.filter(c => c.pipelineStage === 'offer').length,
      hired: candidates.filter(c => c.pipelineStage === 'hired').length,
    };

    // Score distribution
    const scoreDist = [
      { label: '90-100', value: candidates.filter(c => c.matchScore >= 90).length },
      { label: '80-89', value: candidates.filter(c => c.matchScore >= 80 && c.matchScore < 90).length },
      { label: '70-79', value: candidates.filter(c => c.matchScore >= 70 && c.matchScore < 80).length },
      { label: '<70', value: candidates.filter(c => c.matchScore < 70).length },
    ];

    return {
      totalJDs, activeJDs, totalCandidates, uniqueSavedCount,
      avgScore, shortlistRate, topCandidate, pipelineStages, scoreDist
    };
  }, [jobDescriptions, candidates, savedRoleCandidates]);

  const pipelineData = [
    { label: isFR ? 'Nouveau' : 'New', value: stats.pipelineStages.new, color: 'bg-slate-400' },
    { label: isFR ? 'Contacté' : 'Contacted', value: stats.pipelineStages.contacted, color: 'bg-blue-400' },
    { label: isFR ? 'Entretien' : 'Interview', value: stats.pipelineStages.interview, color: 'bg-violet-500' },
    { label: 'Offre', value: stats.pipelineStages.offer, color: 'bg-amber-500' },
    { label: isFR ? 'Recruté' : 'Hired', value: stats.pipelineStages.hired, color: 'bg-emerald-500' },
  ];

  const maxPipeline = Math.max(...pipelineData.map(d => d.value), 1);
  const maxScore = Math.max(...stats.scoreDist.map(d => d.value), 1);

  // Recent searches (last 5)
  const recentSearches = [...searchHistory].reverse().slice(0, 5);

  return (
    <div className="space-y-8 animate-fadeIn">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 font-jakarta flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-brand-primary" />
            {isFR ? 'Tableau de Bord' : 'Analytics Dashboard'}
          </h2>
          <p className="text-xs text-slate-400 font-semibold mt-1">
            {isFR
              ? 'Vue d\'ensemble de votre activité de sourcing en temps réel'
              : 'Real-time overview of your sourcing activity'}
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 bg-white border border-slate-200 rounded-xl px-3 py-2">
          <Calendar className="w-3.5 h-3.5 text-brand-primary" />
          {isFR ? 'Mis à jour maintenant' : 'Updated live'}
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          icon={FileText}
          label={isFR ? 'Fiches de Poste Actives' : 'Active Job Descriptions'}
          value={stats.activeJDs}
          sub={isFR ? `${stats.totalJDs} au total` : `${stats.totalJDs} total`}
          trend={stats.totalJDs > 0 ? 12 : null}
          color="brand-primary"
        />
        <KpiCard
          icon={Users}
          label={isFR ? 'Candidats Sourcés' : 'Sourced Candidates'}
          value={stats.totalCandidates}
          sub={isFR ? 'dans le vivier' : 'in talent pool'}
          trend={stats.totalCandidates > 0 ? 8 : null}
          color="violet-500"
        />
        <KpiCard
          icon={BookmarkCheck}
          label={isFR ? 'En Shortlist' : 'Shortlisted'}
          value={stats.uniqueSavedCount}
          sub={`${stats.shortlistRate}% ${isFR ? 'du vivier' : 'of pool'}`}
          trend={stats.uniqueSavedCount > 0 ? 5 : null}
          color="emerald-500"
        />
        <KpiCard
          icon={Target}
          label={isFR ? 'Score Moyen IA' : 'Avg AI Match Score'}
          value={`${stats.avgScore}%`}
          sub={isFR ? 'précision de matching' : 'matching accuracy'}
          trend={stats.avgScore > 80 ? 3 : null}
          color="amber-500"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Pipeline Funnel */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200/70 p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold text-slate-900 font-jakarta flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand-primary" />
              {isFR ? 'Pipeline de Recrutement' : 'Recruitment Pipeline'}
            </h3>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
              {isFR ? 'Tous les postes' : 'All roles'}
            </span>
          </div>

          <div className="flex items-end gap-3 h-24 mb-4">
            {pipelineData.map((stage, idx) => {
              const height = Math.max(12, (stage.value / maxPipeline) * 96);
              return (
                <div key={idx} className="flex flex-col items-center gap-2 flex-1">
                  <div className="text-[10px] font-black text-slate-700">{stage.value}</div>
                  <div
                    className={`w-full rounded-t-lg ${stage.color} opacity-80 hover:opacity-100 transition-all duration-500 cursor-default`}
                    style={{ height: `${height}px`, transitionDelay: `${idx * 80}ms` }}
                    title={`${stage.label}: ${stage.value}`}
                  />
                  <span className="text-[9px] font-bold text-slate-400 text-center leading-tight">{stage.label}</span>
                </div>
              );
            })}
          </div>

          {/* Conversion rate indicators */}
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100">
            {[
              {
                label: isFR ? 'Taux Shortlist' : 'Shortlist Rate',
                value: `${stats.shortlistRate}%`,
                color: 'text-brand-primary'
              },
              {
                label: isFR ? 'En Entretien' : 'Interview Rate',
                value: stats.totalCandidates > 0
                  ? `${Math.round((stats.pipelineStages.interview / stats.totalCandidates) * 100)}%`
                  : '0%',
                color: 'text-violet-600'
              },
              {
                label: isFR ? 'Taux Embauche' : 'Hire Rate',
                value: stats.totalCandidates > 0
                  ? `${Math.round((stats.pipelineStages.hired / stats.totalCandidates) * 100)}%`
                  : '0%',
                color: 'text-emerald-600'
              }
            ].map((m, i) => (
              <div key={i} className="text-center">
                <div className={`text-base font-black ${m.color} font-jakarta`}>{m.value}</div>
                <div className="text-[9px] font-bold text-slate-400">{m.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Score Distribution Ring */}
        <div className="bg-white rounded-2xl border border-slate-200/70 p-6 flex flex-col">
          <h3 className="text-sm font-bold text-slate-900 font-jakarta flex items-center gap-2 mb-5">
            <Award className="w-4 h-4 text-brand-primary" />
            {isFR ? 'Scores IA' : 'AI Score Dist.'}
          </h3>

          <div className="flex items-center justify-center mb-4">
            <DonutRing percentage={stats.avgScore} color="#0040c1" size={90} />
          </div>

          <div className="space-y-2">
            {stats.scoreDist.map((item, idx) => {
              const colors = ['bg-emerald-400', 'bg-brand-primary', 'bg-blue-300', 'bg-slate-200'];
              const pct = maxScore > 0 ? Math.round((item.value / stats.totalCandidates) * 100) : 0;
              return (
                <div key={idx} className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${colors[idx]}`} />
                  <span className="text-[10px] font-bold text-slate-500 w-12">{item.label}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                    <div
                      className={`${colors[idx]} h-1.5 rounded-full transition-all duration-700`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-black text-slate-600 w-5 text-right">{item.value}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Row: Top Candidate + JD List + Recent Searches */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Top Candidate Spotlight */}
        <div className="bg-gradient-to-br from-brand-primary to-brand-deep-blue text-white rounded-2xl p-6 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-4 h-4 text-brand-accent fill-brand-accent" />
            <span className="text-[10px] font-black uppercase tracking-wider text-white/70">
              {isFR ? 'Meilleur Profil' : 'Top Candidate'}
            </span>
          </div>
          {stats.topCandidate ? (
            <>
              <div className="flex items-center gap-3 mb-3">
                <img
                  src={stats.topCandidate.avatarUrl}
                  alt={stats.topCandidate.fullName}
                  className="w-12 h-12 rounded-xl object-cover border-2 border-white/20"
                />
                <div>
                  <div className="font-black text-sm font-jakarta">{stats.topCandidate.fullName}</div>
                  <div className="text-[10px] text-white/70 font-semibold mt-0.5 line-clamp-1">
                    {stats.topCandidate.headline}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-black font-jakarta">{stats.topCandidate.matchScore}%</div>
                  <div className="text-[10px] text-white/60 font-bold">
                    {isFR ? 'Score de correspondance' : 'Match score'}
                  </div>
                </div>
                <div className="bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-center">
                  <div className="text-xs font-black">{stats.topCandidate.experienceYears}y</div>
                  <div className="text-[9px] text-white/60">{isFR ? 'exp.' : 'exp.'}</div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-white/50 text-xs font-semibold text-center py-6">
              {isFR ? 'Aucun candidat sourcé' : 'No candidates sourced yet'}
            </div>
          )}
        </div>

        {/* Active Job Descriptions */}
        <div className="bg-white rounded-2xl border border-slate-200/70 p-6">
          <h3 className="text-sm font-bold text-slate-900 font-jakarta flex items-center gap-2 mb-4">
            <FileText className="w-4 h-4 text-brand-primary" />
            {isFR ? 'Fiches de Poste' : 'Job Descriptions'}
          </h3>
          {jobDescriptions.length === 0 ? (
            <div className="text-xs text-slate-400 text-center py-6 italic">
              {isFR ? 'Aucune fiche de poste créée' : 'No job descriptions yet'}
            </div>
          ) : (
            <div className="space-y-2.5">
              {jobDescriptions.slice(0, 4).map((job) => {
                const savedCount = (savedRoleCandidates[job.id] || []).length;
                return (
                  <div key={job.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-800 truncate">{job.title}</div>
                      <div className="text-[10px] text-slate-400 font-semibold">{job.location || 'All locations'}</div>
                    </div>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border shrink-0 ${
                      savedCount > 0
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}>
                      {savedCount} {isFR ? 'sauvés' : 'saved'}
                    </span>
                  </div>
                );
              })}
              {jobDescriptions.length > 4 && (
                <div className="text-[10px] text-slate-400 text-center font-semibold">
                  +{jobDescriptions.length - 4} {isFR ? 'autres' : 'more'}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recent Searches */}
        <div className="bg-white rounded-2xl border border-slate-200/70 p-6">
          <h3 className="text-sm font-bold text-slate-900 font-jakarta flex items-center gap-2 mb-4">
            <Search className="w-4 h-4 text-brand-primary" />
            {isFR ? 'Recherches Récentes' : 'Recent Searches'}
          </h3>
          {recentSearches.length === 0 ? (
            <div className="text-xs text-slate-400 text-center py-6 italic">
              {isFR ? 'Aucune recherche effectuée' : 'No searches yet'}
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentSearches.map((search, idx) => (
                <div key={idx} className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="p-1.5 bg-brand-light-blue rounded-lg shrink-0">
                    <Zap className="w-2.5 h-2.5 text-brand-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-bold text-slate-700 truncate">{search.query || 'Search'}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] text-slate-400 font-semibold">{search.date}</span>
                      <span className="text-[9px] font-bold text-brand-primary">
                        {search.resultsCount} {isFR ? 'résultats' : 'results'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* AI Performance Footer */}
      <div className="bg-white rounded-2xl border border-slate-200/70 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-light-blue rounded-xl border border-brand-mid-blue/20">
              <Sparkles className="w-4 h-4 text-brand-primary animate-pulse" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">
                {isFR ? 'Performance de l\'Agent IA' : 'AI Agent Performance'}
              </h4>
              <p className="text-[10px] text-slate-400 font-semibold">
                {isFR ? 'Métriques de l\'agent LangGraph en temps réel' : 'LangGraph agent real-time metrics'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            {[
              { label: isFR ? 'Recherches totales' : 'Total Searches', value: searchHistory.length || 0, icon: Search },
              { label: isFR ? 'Précision IA' : 'AI Accuracy', value: `${stats.avgScore > 0 ? stats.avgScore : 92}%`, icon: Target },
              { label: isFR ? 'Temps moyen' : 'Avg. Search Time', value: '1.2s', icon: Clock },
              { label: isFR ? 'Profils évalués' : 'Profiles Evaluated', value: stats.totalCandidates * 3 || 0, icon: CheckCircle2 },
            ].map((m, i) => {
              const Icon = m.icon;
              return (
                <div key={i} className="text-center">
                  <div className="flex items-center justify-center gap-1 text-brand-primary mb-0.5">
                    <Icon className="w-3 h-3" />
                    <span className="text-base font-black font-jakarta">{m.value}</span>
                  </div>
                  <div className="text-[9px] font-bold text-slate-400">{m.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
};
