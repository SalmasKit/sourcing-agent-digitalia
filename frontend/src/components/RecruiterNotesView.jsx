import React, { useEffect, useRef, useState } from 'react';
import { NotebookPen, Trash2, Clock, ChevronRight, Search, X, Briefcase, FileText, Filter, RotateCcw } from 'lucide-react';
import { getAvatarUrl as getAvatarUrlUtil } from '../utils/avatar';
import { useLanguage } from '../context/LanguageContext';

function getAvatarUrl(name, avatarUrl) {
  return getAvatarUrlUtil(name, avatarUrl);
}

export function formatNoteTimestamp(n, isFR = false) {
  if (!n) return '';
  const dateObj = n.createdAt
    ? new Date(n.createdAt)
    : typeof n.id === 'number' && n.id > 1600000000000
    ? new Date(n.id)
    : null;

  if (dateObj && !isNaN(dateObj.getTime())) {
    const day = dateObj.toLocaleDateString(isFR ? 'fr-FR' : 'en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const time = dateObj.toLocaleTimeString(isFR ? 'fr-FR' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return isFR ? `${day} à ${time}` : `${day} at ${time}`;
  }

  return n.time || '';
}

export function RecruiterNotesView({
  candidates = [],
  jobDescriptions = [],
  savedRoleCandidates = {},
  jobResultsCache = {},
  onViewCandidate = () => {},
  onDeleteNote = () => {},
}) {
  const { lang } = useLanguage();
  const [selectedJobId, setSelectedJobId] = useState('all');
  const [filterText, setFilterText] = useState('');
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

  const isFR = lang === 'FR';
  const cleanFilter = filterText.trim().toLowerCase();
  const candidatesWithNotes = candidates.filter(c => c.notes && c.notes.length > 0);
  const totalNotes = candidatesWithNotes.reduce((sum, c) => sum + c.notes.length, 0);

  const isCandidateInJob = (candidate, jobId) => {
    if (jobId === 'all') return true;

    // 1. Saved candidate in specific job role
    const savedIds = savedRoleCandidates[jobId] || [];
    if (savedIds.includes(candidate.id)) return true;

    // 2. Candidate returned in search cache for this job
    const cachedList = jobResultsCache[jobId] || [];
    if (cachedList.some(c => c.id === candidate.id)) return true;

    // 3. Direct candidate jobId association
    if (candidate.jobId === jobId || candidate.savedJobId === jobId) return true;

    // 4. Smart match by job description title or keywords
    const job = jobDescriptions.find(j => j.id === jobId);
    if (job && job.title) {
      const titleLower = job.title.toLowerCase();
      const candHeadline = (candidate.headline || '').toLowerCase();
      const candRole = (candidate.current_role || candidate.currentRole || '').toLowerCase();
      if (candHeadline.includes(titleLower) || candRole.includes(titleLower)) return true;

      const tokens = titleLower.split(/[\s,/-]+/).filter(t => t.length > 3);
      if (tokens.length > 0 && tokens.some(t => candHeadline.includes(t) || candRole.includes(t))) {
        return true;
      }
    }

    return false;
  };

  const candidatesMatchingJob = candidatesWithNotes.filter(c => isCandidateInJob(c, selectedJobId));

  const filteredCandidates = candidatesMatchingJob.map(c => {
    const matchingNotes = cleanFilter
      ? c.notes.filter(n => (n.text && n.text.toLowerCase().includes(cleanFilter)))
      : c.notes;
    return {
      ...c,
      displayNotes: matchingNotes,
    };
  }).filter(c => c.displayNotes.length > 0);

  const totalFilteredNotes = filteredCandidates.reduce((sum, c) => sum + c.displayNotes.length, 0);

  return (
    <div className="dg-root dgnotes-root">
      <style>{`
        .dg-root {
          --dg-paper: #F6F7F9; --dg-surface: #FFFFFF; --dg-sunken: #EFF1F4;
          --dg-border: #E3E6EB; --dg-border-strong: #CBD2DC;
          --dg-ink-900: #10151F; --dg-ink-700: #38414F; --dg-ink-500: #6B7280; --dg-ink-400: #96A0AC;
          --dg-teal-700: #0A5C68; --dg-teal-600: #0E7C8C; --dg-teal-300: #8CCDD3; --dg-teal-100: #E1F2F3;
          --dg-bronze-700: #8A4B0C; --dg-bronze-100: #FBEEDD;
          --dg-green-700: #1F6E4A; --dg-green-100: #E3F5EC;
          --dg-danger: #B3261E; --dg-danger-bg: #FBEAE9;
          --font-display: 'Space Grotesk', 'Inter', sans-serif;
          --font-body: 'Inter', system-ui, sans-serif;
          --font-mono: 'JetBrains Mono', ui-monospace, monospace;
          font-family: var(--font-body); color: var(--dg-ink-900);
        }
        .dg-display { font-family: var(--font-display); letter-spacing: -0.01em; }
        .dg-mono { font-family: var(--font-mono); }

        .dgnotes-root { display: flex; flex-direction: column; gap: 20px; }

        .dgnotes-header {
          background: var(--dg-surface); border: 1px solid var(--dg-border); border-radius: 18px;
          padding: 20px 24px; display: flex; align-items: center; justify-content: space-between; gap: 16px;
          box-shadow: 0 1px 4px rgba(16,21,31,0.04);
        }
        .dgnotes-header-left { display: flex; align-items: center; gap: 14px; }
        .dgnotes-icon {
          width: 42px; height: 42px; border-radius: 13px; background: var(--dg-teal-100);
          border: 1px solid rgba(14,124,140,0.2); display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .dgnotes-title { font-size: 16px; font-weight: 800; color: var(--dg-ink-900); }
        .dgnotes-subtitle { font-size: 12px; color: var(--dg-ink-500); margin-top: 2px; }
        .dgnotes-badge {
          font-family: var(--font-mono); font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 999px;
          background: var(--dg-teal-100); color: var(--dg-teal-700); border: 1px solid rgba(14,124,140,0.2);
        }

        .dgnotes-empty {
          background: var(--dg-surface); border: 1px solid var(--dg-border); border-radius: 18px;
          padding: 64px 24px; text-align: center; box-shadow: 0 1px 4px rgba(16,21,31,0.04);
        }
        .dgnotes-empty-icon {
          width: 56px; height: 56px; border-radius: 16px; background: var(--dg-sunken); border: 1px solid var(--dg-border);
          display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;
        }
        .dgnotes-empty-title { font-size: 15px; font-weight: 700; color: var(--dg-ink-700); margin-bottom: 6px; }
        .dgnotes-empty-desc { font-size: 13px; color: var(--dg-ink-500); line-height: 1.55; max-width: 340px; margin: 0 auto; }

        .dgnotes-candidate {
          background: var(--dg-surface); border: 1px solid var(--dg-border); border-radius: 18px; overflow: hidden;
          box-shadow: 0 1px 4px rgba(16,21,31,0.04);
        }
        .dgnotes-cand-header {
          display: flex; align-items: center; justify-content: space-between; gap: 16px;
          padding: 16px 22px; border-bottom: 1px solid var(--dg-border); background: var(--dg-paper);
        }
        .dgnotes-cand-info { display: flex; align-items: center; gap: 14px; min-width: 0; }
        .dgnotes-avatar { width: 44px; height: 44px; border-radius: 12px; object-fit: cover; border: 1px solid var(--dg-border); flex-shrink: 0; }
        .dgnotes-avatar-fallback {
          width: 44px; height: 44px; border-radius: 12px; background: var(--dg-teal-700); color: #fff;
          display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 800; flex-shrink: 0;
        }
        .dgnotes-cand-name { font-size: 14px; font-weight: 700; color: var(--dg-ink-900); }
        .dgnotes-cand-role { font-size: 11.5px; color: var(--dg-ink-500); font-weight: 500; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 280px; }
        .dgnotes-cand-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
        .dgnotes-count-badge {
          font-family: var(--font-mono); font-size: 10px; font-weight: 700;
          background: var(--dg-sunken); color: var(--dg-ink-500); border: 1px solid var(--dg-border);
          padding: 2px 8px; border-radius: 999px;
        }
        .dgnotes-view-btn {
          display: flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 700;
          background: none; border: 1px solid var(--dg-border); border-radius: 9px; padding: 6px 12px;
          color: var(--dg-teal-700); cursor: pointer; transition: background .15s ease, border-color .15s ease;
        }
        .dgnotes-view-btn:hover { background: var(--dg-teal-100); border-color: rgba(14,124,140,0.3); }

        .dgnotes-notes-list { padding: 16px 22px; display: flex; flex-direction: column; gap: 10px; }
        .dgnotes-note {
          display: flex; align-items: flex-start; justify-content: space-between; gap: 14px;
          background: var(--dg-paper); border: 1px solid var(--dg-border); border-radius: 12px;
          padding: 12px 14px;
        }
        .dgnotes-note-left { flex: 1; min-width: 0; }
        .dgnotes-note-text { font-size: 13px; color: var(--dg-ink-700); line-height: 1.55; word-break: break-word; }
        .dgnotes-note-time {
          display: flex; align-items: center; gap: 5px; font-family: var(--font-mono); font-size: 10.5px;
          color: var(--dg-ink-400); margin-top: 6px;
        }
        .dgnotes-delete-btn {
          width: 28px; height: 28px; border-radius: 8px; border: 1px solid var(--dg-border);
          background: var(--dg-surface); color: var(--dg-ink-400);
          display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0;
          transition: color .15s ease, background .15s ease, border-color .15s ease;
        }
        .dgnotes-delete-btn:hover { color: var(--dg-danger); background: var(--dg-danger-bg); border-color: rgba(179,38,30,0.25); }
        .dgnotes-filter-panel {
          display: flex; flex-direction: column; gap: 10px;
        }
        .dgnotes-filter-row {
          display: flex; gap: 10px; align-items: center; flex-wrap: wrap;
        }
        .dgnotes-job-select-wrapper {
          background: var(--dg-surface); border: 1px solid var(--dg-border); border-radius: 14px;
          padding: 10px 14px; display: flex; align-items: center; gap: 10px;
          box-shadow: 0 1px 3px rgba(16,21,31,0.03); min-width: 250px; flex: 1;
          transition: border-color .15s ease, box-shadow .15s ease;
        }
        .dgnotes-job-select-wrapper:focus-within {
          border-color: var(--dg-teal-600); box-shadow: 0 0 0 3px rgba(14,124,140,0.12);
        }
        .dgnotes-job-select {
          border: none; outline: none; background: transparent; font-family: var(--font-body);
          font-size: 13.5px; font-weight: 600; color: var(--dg-ink-900); width: 100%; cursor: pointer;
        }
        .dgnotes-search-box {
          background: var(--dg-surface); border: 1px solid var(--dg-border); border-radius: 14px;
          padding: 10px 14px; display: flex; align-items: center; gap: 10px;
          box-shadow: 0 1px 3px rgba(16,21,31,0.03); flex: 1.5; min-width: 250px;
          transition: border-color .15s ease, box-shadow .15s ease;
        }
        .dgnotes-search-box:focus-within {
          border-color: var(--dg-teal-600); box-shadow: 0 0 0 3px rgba(14,124,140,0.12);
        }
        .dgnotes-search-input {
          flex: 1; border: none; outline: none; background: transparent; font-family: var(--font-body);
          font-size: 13.5px; color: var(--dg-ink-900);
        }
        .dgnotes-search-input::placeholder { color: var(--dg-ink-400); }
        .dgnotes-search-clear {
          background: none; border: none; cursor: pointer; color: var(--dg-ink-400); padding: 4px;
          display: flex; align-items: center; justify-content: center; border-radius: 6px;
        }
        .dgnotes-search-clear:hover { color: var(--dg-ink-900); background: var(--dg-sunken); }
        .dgnotes-job-chips {
          display: flex; gap: 8px; overflow-x: auto; padding-bottom: 2px; scrollbar-width: none;
        }
        .dgnotes-chip {
          display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px;
          border-radius: 999px; border: 1px solid var(--dg-border); background: var(--dg-surface);
          font-size: 12px; font-weight: 600; color: var(--dg-ink-700); cursor: pointer;
          transition: all .15s ease; white-space: nowrap; flex-shrink: 0;
        }
        .dgnotes-chip:hover {
          border-color: var(--dg-teal-300); background: var(--dg-paper); color: var(--dg-teal-700);
        }
        .dgnotes-chip-active {
          background: var(--dg-teal-100); border-color: rgba(14,124,140,0.35); color: var(--dg-teal-700);
          box-shadow: 0 1px 4px rgba(14,124,140,0.12);
        }
        .dgnotes-chip-badge {
          font-family: var(--font-mono); font-size: 10px; font-weight: 700;
          background: rgba(16,21,31,0.06); padding: 1px 6px; border-radius: 999px;
        }
        .dgnotes-chip-active .dgnotes-chip-badge {
          background: rgba(14,124,140,0.18); color: var(--dg-teal-700);
        }
        .dgnotes-filter-status {
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
          padding: 8px 14px; border-radius: 10px; background: var(--dg-paper);
          border: 1px dashed var(--dg-border-strong);
        }
        .dgnotes-reset-btn {
          display: inline-flex; align-items: center; gap: 4px; font-size: 11.5px; font-weight: 700;
          color: var(--dg-teal-700); background: none; border: none; cursor: pointer;
        }
        .dgnotes-reset-btn:hover { text-decoration: underline; }
      `}</style>

      {/* Header */}
      <div className="dgnotes-header">
        <div className="dgnotes-header-left">
          <div className="dgnotes-icon">
            <NotebookPen size={18} color="var(--dg-teal-700)" />
          </div>
          <div>
            <div className="dgnotes-title dg-display">
              {isFR ? 'Notes Recruteur' : 'Recruiter Notes'}
            </div>
            <div className="dgnotes-subtitle">
              {isFR
                ? 'Notes internes regroupées par profil candidat et filtrées par fiche de poste'
                : 'Internal notes grouped by candidate profile and filtered by job description'}
            </div>
          </div>
        </div>
        <div className="dgnotes-badge">
          {totalNotes} {isFR ? 'note' : 'note'}{totalNotes !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Search & Job Description Filter Panel */}
      {candidatesWithNotes.length > 0 && (
        <div className="dgnotes-filter-panel">
          <div className="dgnotes-filter-row">
            {/* Job Description Dropdown Filter */}
            {jobDescriptions && jobDescriptions.length > 0 && (
              <div className="dgnotes-job-select-wrapper">
                <Briefcase size={15} color="var(--dg-teal-700)" />
                <select
                  className="dgnotes-job-select"
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  title={isFR ? 'Filtrer par fiche de poste' : 'Filter by job description'}
                >
                  <option value="all">
                    {isFR ? 'Toutes les fiches de poste' : 'All Job Descriptions'} ({candidatesWithNotes.length} {isFR ? 'candidats' : 'candidates'})
                  </option>
                  {jobDescriptions.map((j) => {
                    const cCount = candidatesWithNotes.filter(c => isCandidateInJob(c, j.id)).length;
                    return (
                      <option key={j.id} value={j.id}>
                        {j.title} {cCount > 0 ? `(${cCount})` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Keyword / Description Search Input */}
            <div className="dgnotes-search-box">
              <Search size={15} color="var(--dg-ink-400)" />
              <input
                type="text"
                className="dgnotes-search-input"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder={
                  isFR
                    ? 'Filtrer par description ou mot-clé...'
                    : 'Filter by description or keyword...'
                }
              />
              {filterText && (
                <button
                  type="button"
                  className="dgnotes-search-clear"
                  onClick={() => setFilterText('')}
                  title={isFR ? 'Effacer la recherche' : 'Clear search'}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Quick Filter Chips for Job Descriptions */}
          {jobDescriptions && jobDescriptions.length > 0 && (
            <div className="dgnotes-job-chips">
              <button
                type="button"
                className={`dgnotes-chip ${selectedJobId === 'all' ? 'dgnotes-chip-active' : ''}`}
                onClick={() => setSelectedJobId('all')}
              >
                <span>{isFR ? 'Toutes les fiches' : 'All Jobs'}</span>
                <span className="dgnotes-chip-badge">{totalNotes}</span>
              </button>
              {jobDescriptions.map((j) => {
                const jNotesCount = candidatesWithNotes
                  .filter(c => isCandidateInJob(c, j.id))
                  .reduce((sum, c) => sum + c.notes.length, 0);
                const isActive = selectedJobId === j.id;
                return (
                  <button
                    key={j.id}
                    type="button"
                    className={`dgnotes-chip ${isActive ? 'dgnotes-chip-active' : ''}`}
                    onClick={() => setSelectedJobId(j.id)}
                    title={j.title}
                  >
                    <FileText size={11} />
                    <span>{j.title}</span>
                    {jNotesCount > 0 && (
                      <span className="dgnotes-chip-badge">{jNotesCount}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Filter Status Bar */}
          {(selectedJobId !== 'all' || filterText) && (
            <div className="dgnotes-filter-status">
              <span style={{ fontSize: 12, color: 'var(--dg-ink-700)' }}>
                {isFR ? 'Filtre actif :' : 'Active filter:'}{' '}
                {selectedJobId !== 'all' && (
                  <strong>{jobDescriptions.find(j => j.id === selectedJobId)?.title || selectedJobId} </strong>
                )}
                {filterText && (
                  <span>« {filterText} » </span>
                )}
                • <strong>{totalFilteredNotes}</strong> {isFR ? 'note(s) affichée(s)' : 'note(s) shown'}
              </span>
              <button
                type="button"
                className="dgnotes-reset-btn"
                onClick={() => {
                  setSelectedJobId('all');
                  setFilterText('');
                }}
              >
                <RotateCcw size={12} />
                <span>{isFR ? 'Réinitialiser' : 'Reset filters'}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Empty state: No notes at all */}
      {candidatesWithNotes.length === 0 && (
        <div className="dgnotes-empty">
          <div className="dgnotes-empty-icon">
            <NotebookPen size={22} color="var(--dg-ink-400)" />
          </div>
          <div className="dgnotes-empty-title dg-display">
            {isFR ? 'Aucune note enregistrée' : 'No notes yet'}
          </div>
          <div className="dgnotes-empty-desc">
            {isFR
              ? "Ouvrez un profil candidat et ajoutez des notes internes. Elles apparaîtront ici, regroupées par candidat."
              : "Open a candidate profile and add internal notes. They will appear here, grouped by candidate."}
          </div>
        </div>
      )}

      {/* Empty state: Filter active but no matches */}
      {candidatesWithNotes.length > 0 && filteredCandidates.length === 0 && (
        <div className="dgnotes-empty">
          <div className="dgnotes-empty-icon">
            <Filter size={22} color="var(--dg-ink-400)" />
          </div>
          <div className="dgnotes-empty-title dg-display">
            {isFR ? 'Aucune note ne correspond à ces critères' : 'No notes match this filter'}
          </div>
          <div className="dgnotes-empty-desc">
            {isFR
              ? 'Aucune note trouvée pour ce poste ou cette description. Essayez un autre filtre ou réinitialisez.'
              : 'No notes found for this job description or keyword. Try another filter or reset.'}
          </div>
          <button
            type="button"
            className="dgnotes-view-btn"
            style={{ margin: '14px auto 0' }}
            onClick={() => {
              setSelectedJobId('all');
              setFilterText('');
            }}
          >
            <RotateCcw size={13} />
            <span>{isFR ? 'Réinitialiser les filtres' : 'Reset filters'}</span>
          </button>
        </div>
      )}

      {/* Candidate blocks */}
      {filteredCandidates.map((candidate) => {
        const initials = (candidate.fullName || '?')
          .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

        const isPartiallyFiltered = cleanFilter && candidate.displayNotes.length < candidate.notes.length;

        return (
          <div key={candidate.id} className="dgnotes-candidate">
            <div className="dgnotes-cand-header">
              <div className="dgnotes-cand-info">
                <img
                  className="dgnotes-avatar"
                  src={getAvatarUrl(candidate.fullName, candidate.avatarUrl)}
                  alt={candidate.fullName}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling && (e.target.nextSibling.style.display = 'flex');
                  }}
                />
                <div className="dgnotes-avatar-fallback" style={{ display: 'none' }}>{initials}</div>
                <div style={{ minWidth: 0 }}>
                  <div className="dgnotes-cand-name dg-display">{candidate.fullName}</div>
                  <div className="dgnotes-cand-role">{candidate.headline}</div>
                </div>
              </div>
              <div className="dgnotes-cand-right">
                <span className="dgnotes-count-badge dg-mono">
                  {isPartiallyFiltered
                    ? `${candidate.displayNotes.length}/${candidate.notes.length} notes`
                    : `${candidate.displayNotes.length} note${candidate.displayNotes.length !== 1 ? 's' : ''}`}
                </span>
                <button className="dgnotes-view-btn" onClick={() => onViewCandidate(candidate)}>
                  <span>{isFR ? 'Voir profil' : 'View profile'}</span>
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>

            <div className="dgnotes-notes-list">
              {candidate.displayNotes.map((n) => (
                <div key={n.id} className="dgnotes-note">
                  <div className="dgnotes-note-left">
                    <div className="dgnotes-note-text">{n.text}</div>
                    <div className="dgnotes-note-time">
                      <Clock size={11} />
                      <span>{formatNoteTimestamp(n, isFR)}</span>
                    </div>
                  </div>
                  <button
                    className="dgnotes-delete-btn"
                    onClick={() => onDeleteNote(candidate.id, n.id)}
                    title={isFR ? 'Supprimer la note' : 'Delete note'}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default RecruiterNotesView;
