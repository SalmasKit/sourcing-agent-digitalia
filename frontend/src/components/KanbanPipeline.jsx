import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { getAvatarUrl } from '../utils/avatar';
import {
  Kanban, Users, Eye, CheckCircle2, ChevronRight,
  UserCheck, Mail, Calendar, Award, XCircle, ArrowRightLeft,
  Filter
} from 'lucide-react';

export const STAGES = [
  { id: 'new', labelFR: 'Nouveau', labelEN: 'New', headerBg: 'bg-sky-50 border-sky-200/80 text-sky-900', badge: 'bg-sky-600 text-white', icon: Users },
  { id: 'contacted', labelFR: 'Contacté', labelEN: 'Contacted', headerBg: 'bg-blue-50 border-blue-200/80 text-blue-900', badge: 'bg-blue-600 text-white', icon: Mail },
  { id: 'interview', labelFR: 'Entretien', labelEN: 'Interview', headerBg: 'bg-purple-50 border-purple-200/80 text-purple-900', badge: 'bg-purple-600 text-white', icon: Calendar },
  { id: 'offer', labelFR: 'Offre Proposée', labelEN: 'Offer Extended', headerBg: 'bg-amber-50 border-amber-200/80 text-amber-900', badge: 'bg-amber-600 text-white', icon: Award },
  { id: 'hired', labelFR: 'Recruté', labelEN: 'Hired', headerBg: 'bg-emerald-50 border-emerald-200/80 text-emerald-900', badge: 'bg-emerald-600 text-white', icon: CheckCircle2 },
  { id: 'rejected', labelFR: 'Refusé / Archivé', labelEN: 'Refused / Archived', headerBg: 'bg-rose-50 border-rose-200/80 text-rose-900', badge: 'bg-rose-600 text-white', icon: XCircle }
];

export const KanbanPipeline = ({
  candidates = [],
  jobDescriptions = [],
  savedRoleCandidates = {},
  candidatePipelineStage = {},
  onUpdateStage,
  onViewDetails
}) => {
  const { t, lang } = useLanguage();
  const isFR = lang === 'FR';

  const [selectedJobFilter, setSelectedJobFilter] = useState('all');
  const [draggedCandidateId, setDraggedCandidateId] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);

  // Filter candidates by selected job description role
  const filteredCandidates = candidates.filter(c => {
    if (selectedJobFilter === 'all') return true;
    const savedIdsForJob = savedRoleCandidates[selectedJobFilter] || [];
    return savedIdsForJob.includes(c.id) || c.jobId === selectedJobFilter;
  });

  const getCandidateStage = (candId) => {
    return candidatePipelineStage[candId] || 'new';
  };

  // Drag & Drop Handlers
  const handleDragStart = (e, candId) => {
    e.dataTransfer.setData('text/plain', candId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedCandidateId(candId);
  };

  const handleDragOver = (e, stageId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverStage !== stageId) {
      setDragOverStage(stageId);
    }
  };

  const handleDragLeave = (e, stageId) => {
    if (dragOverStage === stageId) {
      setDragOverStage(null);
    }
  };

  const handleDrop = (e, targetStageId) => {
    e.preventDefault();
    const candId = e.dataTransfer.getData('text/plain') || draggedCandidateId;
    if (candId) {
      onUpdateStage(candId, targetStageId);
    }
    setDraggedCandidateId(null);
    setDragOverStage(null);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 font-jakarta flex items-center gap-2">
            <Kanban className="w-5 h-5 text-brand-primary" />
            <span>{t('kanbanTitle')}</span>
          </h2>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">
            {t('kanbanDesc')}
          </p>
        </div>

        {/* Job Filter Dropdown */}
        <div className="flex items-center space-x-2 shrink-0">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedJobFilter}
            onChange={(e) => setSelectedJobFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl p-2 font-bold outline-none focus:border-brand-primary cursor-pointer"
          >
            <option value="all">{isFR ? 'Tous les postes' : 'All Roles'}</option>
            {jobDescriptions.map(j => (
              <option key={j.id} value={j.id}>{j.title}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Colored Summary Stage Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {STAGES.map((stage) => {
          const count = filteredCandidates.filter(c => getCandidateStage(c.id) === stage.id).length;
          const Icon = stage.icon;
          return (
            <div key={stage.id} className={`rounded-xl border p-3 flex items-center justify-between shadow-2xs transition-all ${stage.headerBg}`}>
              <div className="flex items-center space-x-2 min-w-0">
                <Icon className="w-4 h-4 shrink-0 opacity-80" />
                <span className="text-[11px] font-extrabold font-jakarta truncate">
                  {isFR ? stage.labelFR : stage.labelEN}
                </span>
              </div>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shadow-3xs shrink-0 ${stage.badge}`}>
                {count}
              </span>
            </div>
          );
        })}
      </div>

      {/* Kanban Columns Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-start overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const stageCandidates = filteredCandidates.filter(c => getCandidateStage(c.id) === stage.id);
          const isOver = dragOverStage === stage.id;
          const Icon = stage.icon;

          return (
            <div
              key={stage.id}
              onDragOver={(e) => handleDragOver(e, stage.id)}
              onDragLeave={(e) => handleDragLeave(e, stage.id)}
              onDrop={(e) => handleDrop(e, stage.id)}
              className={`rounded-2xl border transition-all duration-200 min-h-[480px] p-3 flex flex-col justify-between ${
                isOver
                  ? 'bg-brand-light-blue/40 border-brand-primary ring-2 ring-brand-primary/20 shadow-md scale-[1.01]'
                  : 'bg-slate-100/60 border-slate-200/80'
              }`}
            >
              {/* Candidate Cards List */}
              <div className="space-y-3">
                  {stageCandidates.length === 0 ? (
                    <div className="text-[11px] text-slate-400 italic text-center py-10 border border-dashed border-slate-200/80 rounded-xl bg-white/40">
                      {isFR ? 'Déposer ici' : 'Drop candidate here'}
                    </div>
                  ) : (
                    stageCandidates.map((candidate) => (
                      <div
                        key={candidate.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, candidate.id)}
                        className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-2xs hover:shadow-md hover:border-brand-primary/40 transition-all cursor-grab active:cursor-grabbing group space-y-2.5"
                      >
                        {/* Header: Avatar + Name + Score */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <img
                              src={getAvatarUrl(candidate.fullName, candidate.avatarUrl)}
                              alt={candidate.fullName}
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = getAvatarUrl(candidate.fullName, null);
                              }}
                              className="w-8 h-8 rounded-lg object-cover border border-slate-100 shrink-0"
                            />
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-slate-900 truncate leading-tight">
                                {candidate.fullName}
                              </h4>
                              <p className="text-[10px] text-slate-400 font-semibold truncate mt-0.5">
                                {candidate.headline}
                              </p>
                            </div>
                          </div>
                          <span className="text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded shrink-0">
                            {candidate.matchScore}%
                          </span>
                        </div>

                        {/* Top skills badges */}
                        <div className="flex flex-wrap gap-1">
                          {candidate.skills.slice(0, 2).map((skill, idx) => (
                            <span key={idx} className="text-[9px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                              {skill}
                            </span>
                          ))}
                          {candidate.skills.length > 2 && (
                            <span className="text-[9px] text-slate-400 font-bold px-1">
                              +{candidate.skills.length - 2}
                            </span>
                          )}
                        </div>

                        {/* Actions Footer */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px]">
                          <button
                            onClick={() => onViewDetails(candidate)}
                            className="flex items-center space-x-1 text-brand-primary hover:text-brand-deep-blue font-bold cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>{isFR ? 'Profil' : 'View'}</span>
                          </button>

                          {/* Move to next stage button */}
                          {stage.id !== 'hired' && stage.id !== 'rejected' && (
                            <button
                              onClick={() => {
                                const stageOrder = ['new', 'contacted', 'interview', 'offer', 'hired'];
                                const currIdx = stageOrder.indexOf(stage.id);
                                if (currIdx !== -1 && currIdx < stageOrder.length - 1) {
                                  onUpdateStage(candidate.id, stageOrder[currIdx + 1]);
                                }
                              }}
                              className="flex items-center space-x-0.5 text-slate-400 hover:text-brand-primary font-bold cursor-pointer"
                              title="Advance to next stage"
                            >
                              <span>{isFR ? 'Suivant' : 'Next'}</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
