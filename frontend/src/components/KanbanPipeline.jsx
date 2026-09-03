import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { getAvatarUrl } from '../utils/avatar';
import {
  Kanban, Users, Eye, CheckCircle2, ChevronRight,
  Mail, Calendar, Award, XCircle, Filter, ArrowRight
} from 'lucide-react';

export const STAGES = [
  { id: 'new', labelFR: 'Nouveau', labelEN: 'New', tone: 'neutral', icon: Users },
  { id: 'contacted', labelFR: 'Contacté', labelEN: 'Contacted', tone: 'teal-light', icon: Mail },
  { id: 'interview', labelFR: 'Entretien', labelEN: 'Interview', tone: 'bronze-light', icon: Calendar },
  { id: 'offer', labelFR: 'Offre Proposée', labelEN: 'Offer Extended', tone: 'bronze', icon: Award },
  { id: 'hired', labelFR: 'Recruté', labelEN: 'Hired', tone: 'green', icon: CheckCircle2 },
  { id: 'rejected', labelFR: 'Refusé / Archivé', labelEN: 'Refused / Archived', tone: 'danger', icon: XCircle }
];

const COPY = {
  EN: {
    title: 'Recruitment Kanban Pipeline',
    sub: 'Drag & drop candidates across pipeline stages to track applicant progression',
    allRoles: 'All Job Roles',
    dropHere: 'Drop candidate here',
    viewProfile: 'Profile',
    advanceNext: 'Next',
  },
  FR: {
    title: 'Pipeline Kanban de Recrutement',
    sub: 'Glissez-déposez les candidats entre les étapes pour suivre leur progression',
    allRoles: 'Tous les postes',
    dropHere: 'Déposer le candidat ici',
    viewProfile: 'Profil',
    advanceNext: 'Suivant',
  }
};

export function KanbanPipeline({
  candidates = [],
  jobDescriptions = [],
  savedRoleCandidates = {},
  candidatePipelineStage = {},
  onUpdateStage = () => {},
  onViewDetails = () => {}
}) {
  const { lang } = useLanguage();
  const isFR = lang === 'FR';
  const t = COPY[lang] || COPY.EN;

  const [selectedJobFilter, setSelectedJobFilter] = useState('all');
  const [draggedCandidateId, setDraggedCandidateId] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);
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
    <div className="dg-root dgkp-root">
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
        .dg-mono { font-family: var(--font-mono); }
        .dgkp-root { max-width: 1200px; margin: 0 auto; padding: 24px; display: flex; flex-direction: column; gap: 20px; }

        .dgkp-header {
          background: var(--dg-surface); border: 1px solid var(--dg-border); border-radius: 18px;
          padding: 20px 24px; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;
        }
        .dgkp-header-left { display: flex; align-items: center; gap: 12px; }
        .dgkp-header-icon { width: 38px; height: 38px; border-radius: 11px; background: var(--dg-teal-100); color: var(--dg-teal-700); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .dgkp-header-title { font-size: 16px; font-weight: 700; margin: 0; }
        .dgkp-header-sub { font-size: 11.5px; color: var(--dg-ink-500); margin-top: 2px; }

        .dgkp-filter-select {
          font-family: var(--font-body); font-size: 12px; font-weight: 600; color: var(--dg-ink-700);
          background: var(--dg-paper); border: 1px solid var(--dg-border); border-radius: 11px;
          padding: 8px 14px; outline: none; cursor: pointer; transition: border-color .15s ease;
        }
        .dgkp-filter-select:focus { border-color: var(--dg-teal-600); }

        .dgkp-summary-bar { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; }
        .dgkp-summary-item {
          background: var(--dg-surface); border: 1px solid var(--dg-border); border-radius: 13px;
          padding: 11px 13px; display: flex; align-items: center; justify-content: space-between; gap: 8px;
        }
        .dgkp-summary-item-left { display: flex; align-items: center; gap: 8px; min-width: 0; }
        .dgkp-summary-label { font-size: 11.5px; font-weight: 700; color: var(--dg-ink-900); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .dgkp-summary-badge {
          font-family: var(--font-mono); font-size: 10.5px; font-weight: 700; padding: 2px 7px;
          border-radius: 999px; flex-shrink: 0;
        }
        .dgkp-badge-neutral { background: var(--dg-sunken); color: var(--dg-ink-700); }
        .dgkp-badge-teal-light { background: var(--dg-teal-100); color: var(--dg-teal-700); }
        .dgkp-badge-bronze-light { background: var(--dg-bronze-100); color: var(--dg-bronze-700); }
        .dgkp-badge-bronze { background: var(--dg-bronze-100); color: var(--dg-bronze-700); border: 1px solid rgba(180,101,15,0.3); }
        .dgkp-badge-green { background: var(--dg-green-100); color: var(--dg-green-700); }
        .dgkp-badge-danger { background: var(--dg-danger-bg); color: var(--dg-danger); }

        .dgkp-board {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          overflow-x: auto;
          padding-bottom: 14px;
          min-height: 520px;
          scrollbar-width: thin;
          scrollbar-color: var(--dg-border-strong) transparent;
        }
        .dgkp-board::-webkit-scrollbar { height: 6px; }
        .dgkp-board::-webkit-scrollbar-track { background: transparent; }
        .dgkp-board::-webkit-scrollbar-thumb { background: var(--dg-border-strong); border-radius: 999px; }
        .dgkp-board::-webkit-scrollbar-thumb:hover { background: var(--dg-ink-400); }

        .dgkp-col {
          background: var(--dg-sunken); border: 1.5px dashed var(--dg-border); border-radius: 14px;
          padding: 10px; min-height: 480px; width: 225px; min-width: 215px; max-width: 235px;
          flex: 0 0 225px; display: flex; flex-direction: column; gap: 8px; box-sizing: border-box;
          transition: background .15s ease, border-color .15s ease, transform .15s ease;
        }
        .dgkp-col-over {
          background: var(--dg-teal-100); border-color: var(--dg-teal-600); border-style: solid;
          transform: translateY(-2px);
        }
        .dgkp-col-head {
          display: flex; align-items: center; justify-content: space-between; padding-bottom: 8px;
          border-bottom: 1px solid var(--dg-border); margin-bottom: 2px;
        }
        .dgkp-col-title { font-size: 11.5px; font-weight: 700; color: var(--dg-ink-900); display: flex; align-items: center; gap: 6px; }

        .dgkp-card {
          background: var(--dg-surface); border: 1px solid var(--dg-border); border-radius: 10px;
          padding: 9px 10px; display: flex; flex-direction: column; gap: 6px; cursor: grab;
          width: 100%; box-sizing: border-box;
          box-shadow: 0 1px 3px rgba(16,21,31,0.04);
          transition: border-color .15s ease, box-shadow .15s ease, transform .15s ease;
        }
        .dgkp-card:hover { border-color: var(--dg-border-strong); box-shadow: 0 4px 12px -4px rgba(16,21,31,0.12); transform: translateY(-1px); }
        .dgkp-card:active { cursor: grabbing; opacity: 0.85; }

        .dgkp-card-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 6px; }
        .dgkp-person { display: flex; align-items: center; gap: 7px; min-width: 0; }
        .dgkp-avatar { width: 28px; height: 28px; border-radius: 7px; object-fit: cover; border: 1px solid var(--dg-border); flex-shrink: 0; }
        .dgkp-name { font-size: 11.5px; font-weight: 700; color: var(--dg-ink-900); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .dgkp-headline { font-size: 9.5px; color: var(--dg-ink-500); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        .dgkp-score-pill {
          font-family: var(--font-mono); font-size: 9px; font-weight: 700; color: var(--dg-green-700);
          background: var(--dg-green-100); border: 1px solid rgba(31,110,74,0.2);
          padding: 1.5px 4.5px; border-radius: 5px; flex-shrink: 0;
        }

        .dgkp-skills { display: flex; flex-wrap: wrap; gap: 3.5px; }
        .dgkp-skill {
          font-family: var(--font-mono); font-size: 8.5px; font-weight: 500;
          background: var(--dg-sunken); color: var(--dg-ink-700);
          border: 1px solid var(--dg-border); padding: 1px 4.5px; border-radius: 4px;
        }

        .dgkp-card-foot {
          display: flex; align-items: center; justify-content: space-between; pt: 5px;
          border-top: 1px solid var(--dg-border); margin-top: 1px;
        }
        .dgkp-action-btn {
          display: flex; align-items: center; gap: 3px; font-size: 10px; font-weight: 700;
          background: none; border: none; cursor: pointer; color: var(--dg-teal-700);
          transition: color .15s ease;
        }
        .dgkp-action-btn:hover { color: var(--dg-teal-700); text-decoration: underline; }

        .dgkp-empty-drop {
          font-size: 10px; font-weight: 500; color: var(--dg-ink-400); text-align: center;
          padding: 24px 6px; border: 1px dashed var(--dg-border-strong); border-radius: 8px;
          background: rgba(255,255,255,0.4);
        }

        @media (max-width: 1080px) {
          .dgkp-summary-bar { grid-template-columns: repeat(3, 1fr); }
        }
        @media (max-width: 640px) {
          .dgkp-summary-bar { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>

      {/* Header Banner */}
      <div className="dgkp-header">
        <div className="dgkp-header-left">
          <div className="dgkp-header-icon"><Kanban size={18} /></div>
          <div>
            <h2 className="dgkp-header-title dg-display">{t.title}</h2>
            <div className="dgkp-header-sub">{t.sub}</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Filter size={14} color="var(--dg-ink-400)" />
          <select
            value={selectedJobFilter}
            onChange={(e) => setSelectedJobFilter(e.target.value)}
            className="dgkp-filter-select"
          >
            <option value="all">{t.allRoles}</option>
            {jobDescriptions.map(j => (
              <option key={j.id} value={j.id}>{j.title}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stage Summary Bar */}
      <div className="dgkp-summary-bar">
        {STAGES.map((stage) => {
          const count = filteredCandidates.filter(c => getCandidateStage(c.id) === stage.id).length;
          const Icon = stage.icon;
          return (
            <div key={stage.id} className="dgkp-summary-item">
              <div className="dgkp-summary-item-left">
                <Icon size={14} color="var(--dg-ink-500)" />
                <span className="dgkp-summary-label dg-display">{isFR ? stage.labelFR : stage.labelEN}</span>
              </div>
              <span className={`dgkp-summary-badge dgkp-badge-${stage.tone}`}>
                {count}
              </span>
            </div>
          );
        })}
      </div>

      {/* Kanban Columns */}
      <div className="dgkp-board">
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
              className={`dgkp-col ${isOver ? 'dgkp-col-over' : ''}`}
            >
              <div className="dgkp-col-head">
                <span className="dgkp-col-title dg-display">
                  <Icon size={13} color="var(--dg-ink-500)" />
                  {isFR ? stage.labelFR : stage.labelEN}
                </span>
                <span className={`dgkp-summary-badge dgkp-badge-${stage.tone}`}>
                  {stageCandidates.length}
                </span>
              </div>

              {stageCandidates.length === 0 ? (
                <div className="dgkp-empty-drop">
                  {t.dropHere}
                </div>
              ) : (
                stageCandidates.map((candidate) => {
                  const candidateSkills = Array.isArray(candidate.skills)
                    ? candidate.skills
                    : (typeof candidate.skills === 'string'
                      ? candidate.skills.split(',').map(s => s.trim()).filter(Boolean)
                      : []);

                  return (
                    <div
                      key={candidate.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, candidate.id)}
                      className="dgkp-card"
                    >
                      <div
                        className="dgkp-card-top"
                        style={{ cursor: 'pointer' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewDetails(candidate);
                        }}
                      >
                        <div className="dgkp-person">
                          <img
                            src={getAvatarUrl(candidate.fullName, candidate.avatarUrl)}
                            alt={candidate.fullName}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = getAvatarUrl(candidate.fullName, null);
                            }}
                            className="dgkp-avatar"
                          />
                          <div style={{ minWidth: 0 }}>
                            <div className="dgkp-name dg-display" title={candidate.fullName}>{candidate.fullName}</div>
                            <div className="dgkp-headline" title={candidate.headline}>{candidate.headline}</div>
                          </div>
                        </div>
                        <span className="dgkp-score-pill">
                          {candidate.matchScore}%
                        </span>
                      </div>

                      {candidateSkills.length > 0 && (
                        <div className="dgkp-skills">
                          {candidateSkills.slice(0, 2).map((skill, idx) => (
                            <span key={idx} className="dgkp-skill">{skill}</span>
                          ))}
                          {candidateSkills.length > 2 && (
                            <span className="dgkp-skill">+{candidateSkills.length - 2}</span>
                          )}
                        </div>
                      )}

                      <div className="dgkp-card-foot">
                        <button
                          type="button"
                          draggable={false}
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewDetails(candidate);
                          }}
                          className="dgkp-action-btn"
                        >
                          <Eye size={11} />
                          <span>{t.viewProfile}</span>
                        </button>

                        {stage.id !== 'hired' && stage.id !== 'rejected' && (
                          <button
                            type="button"
                            draggable={false}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              const stageOrder = ['new', 'contacted', 'interview', 'offer', 'hired'];
                              const currIdx = stageOrder.indexOf(stage.id);
                              if (currIdx !== -1 && currIdx < stageOrder.length - 1) {
                                onUpdateStage(candidate.id, stageOrder[currIdx + 1]);
                              }
                            }}
                            className="dgkp-action-btn"
                            title="Advance to next stage"
                          >
                            <span>{t.advanceNext}</span>
                            <ChevronRight size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}

export default KanbanPipeline;

