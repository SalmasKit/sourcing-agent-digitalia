import React, { useEffect, useRef, useState } from 'react';
import { NotebookPen, Trash2, Clock, ChevronRight, Search, X } from 'lucide-react';
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
  onViewCandidate = () => {},
  onDeleteNote = () => {},
}) {
  const { lang } = useLanguage();
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

  const filteredCandidates = candidatesWithNotes.map(c => {
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
        .dgnotes-search-box {
          background: var(--dg-surface); border: 1px solid var(--dg-border); border-radius: 14px;
          padding: 12px 16px; display: flex; align-items: center; gap: 12px;
          box-shadow: 0 1px 3px rgba(16,21,31,0.03); transition: border-color .15s ease, box-shadow .15s ease;
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
        .dgnotes-search-count {
          font-family: var(--font-mono); font-size: 11px; font-weight: 600; color: var(--dg-teal-700);
          background: var(--dg-teal-100); padding: 2px 8px; border-radius: 6px; white-space: nowrap;
        }
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
                ? 'Notes internes regroupées par profil candidat'
                : 'Internal notes grouped by candidate profile'}
            </div>
          </div>
        </div>
        <div className="dgnotes-badge">
          {totalNotes} {isFR ? 'note' : 'note'}{totalNotes !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Search & Description Filter */}
      {candidatesWithNotes.length > 0 && (
        <div className="dgnotes-search-box">
          <Search size={16} color="var(--dg-ink-400)" />
          <input
            type="text"
            className="dgnotes-search-input"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder={
              isFR
                ? 'Filtrer les notes par description, mot-clé ou texte...'
                : 'Filter notes by description, keyword, or text...'
            }
          />
          {filterText && (
            <>
              <span className="dgnotes-search-count">
                {totalFilteredNotes} {isFR ? 'trouvée' : 'found'}{totalFilteredNotes !== 1 ? 's' : ''}
              </span>
              <button
                type="button"
                className="dgnotes-search-clear"
                onClick={() => setFilterText('')}
                title={isFR ? 'Effacer le filtre' : 'Clear filter'}
              >
                <X size={14} />
              </button>
            </>
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
            <Search size={22} color="var(--dg-ink-400)" />
          </div>
          <div className="dgnotes-empty-title dg-display">
            {isFR ? 'Aucune note ne correspond à votre filtre' : 'No notes match your filter'}
          </div>
          <div className="dgnotes-empty-desc">
            {isFR
              ? `Aucune note ne contient "${filterText}". Essayez un autre terme ou réinitialisez le filtre.`
              : `No note contains "${filterText}". Try a different keyword or reset the filter.`}
          </div>
          <button
            type="button"
            className="dgnotes-view-btn"
            style={{ margin: '14px auto 0' }}
            onClick={() => setFilterText('')}
          >
            {isFR ? 'Réinitialiser le filtre' : 'Reset filter'}
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
