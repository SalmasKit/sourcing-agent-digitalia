import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import {
  Kanban, Users, Eye, CheckCircle2, ChevronRight,
  UserCheck, Mail, Calendar, Award, XCircle, ArrowRightLeft,
  Filter
} from 'lucide-react';

export const STAGES = [
  { id: 'new', labelFR: 'Nouveau', labelEN: 'New', color: 'border-slate-300 bg-slate-50/60 text-slate-700', badge: 'bg-slate-200 text-slate-700', icon: Users },
  { id: 'contacted', labelFR: 'Contacté', labelEN: 'Contacted', color: 'border-blue-300 bg-blue-50/40 text-blue-800', badge: 'bg-blue-100 text-blue-700', icon: Mail },
  { id: 'interview', labelFR: 'Entretien', labelEN: 'Interview', color: 'border-violet-300 bg-violet-50/40 text-violet-800', badge: 'bg-violet-100 text-violet-700', icon: Calendar },
  { id: 'offer', labelFR: 'Offre Proposée', labelEN: 'Offer Extended', color: 'border-amber-300 bg-amber-50/40 text-amber-800', badge: 'bg-amber-100 text-amber-800', icon: Award },
  { id: 'hired', labelFR: 'Recruté', labelEN: 'Hired', color: 'border-emerald-300 bg-emerald-50/40 text-emerald-800', badge: 'bg-emerald-100 text-emerald-800', icon: CheckCircle2 },
  { id: 'rejected', labelFR: 'Refusé / Archivé', labelEN: 'Refused / Archived', color: 'border-rose-200 bg-rose-50/30 text-rose-700', badge: 'bg-rose-100 text-rose-700', icon: XCircle }
];

export const KanbanPipeline = ({
  candidates = [],
  jobDescriptions = [],
  candidatePipelineStage = {},
  onUpdateStage,
  onViewDetails
}) => {
  const { lang } = useLanguage();
  const isFR = lang === 'FR';

  const [selectedJobFilter, setSelectedJobFilter] = useState('all');
  const [draggedCandidateId, setDraggedCandidateId] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);

  // Filter candidates if job filter selected
  const filteredCandidates = candidates.filter(c => {
    if (selectedJobFilter === 'all') return true;
    return true; // candidates dataset
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
            <span>{isFR ? 'Pipeline de Recrutement Kanban' : 'Kanban Recruitment Pipeline'}</span>
          </h2>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">
            {isFR
              ? 'Glissez-déposez les candidats entre les différentes étapes du processus de recrutement'
              : 'Drag & drop candidates across recruitment pipeline stages'}
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

      {/* Summary Pill Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {STAGES.map((stage) => {
          const count = filteredCandidates.filter(c => getCandidateStage(c.id) === stage.id).length;
          const Icon = stage.icon;
          return (
            <div key={stage.id} className="bg-white rounded-xl border border-slate-200/70 p-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Icon className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[11px] font-bold text-slate-600 truncate">
                  {isFR ? stage.labelFR : stage.labelEN}
                </span>
              </div>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${stage.badge}`}>
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
              {/* Column Header */}
              <div>
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/60">
                  <div className="flex items-center space-x-1.5 min-w-0">
                    <Icon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <h3 className="text-xs font-extrabold text-slate-800 truncate font-jakarta">
                      {isFR ? stage.labelFR : stage.labelEN}
                    </h3>
                  </div>
                  <span className="text-[10px] font-black bg-white text-slate-700 px-2 py-0.5 rounded-full border border-slate-200 shadow-3xs shrink-0">
                    {stageCandidates.length}
                  </span>
                </div>

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
                              src={candidate.avatarUrl}
                              alt={candidate.fullName}
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

              {/* Column Footer */}
              <div className="mt-4 pt-2 border-t border-slate-200/40 text-[9px] text-slate-400 font-bold text-center">
                {stageCandidates.length} {isFR ? 'candidat(s)' : 'candidate(s)'}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
