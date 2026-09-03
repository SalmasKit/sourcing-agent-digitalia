import React, { useEffect, useRef } from 'react';
import { MapPin, Briefcase, BookmarkCheck, ChevronRight, Edit2, Trash2, Bookmark, ExternalLink } from 'lucide-react';

import { useLanguage } from '../context/LanguageContext';
import { getAvatarUrl as getAvatarUrlUtil } from '../utils/avatar';

function getAvatarUrl(name, avatarUrl) {
  return getAvatarUrlUtil(name, avatarUrl);
}

const T = {
  editCandidate: 'Edit candidate',
  deleteCandidate: 'Remove candidate',
  yearsExp: 'yrs exp.',
  shortlisted: 'Shortlisted',
  shortlist: 'Shortlist',
  viewProfile: 'View profile',
  selectRole: 'Select a role to save',
  openLinkedin: 'Open LinkedIn profile',
};

function scoreTone(score) {
  if (score >= 90) return 'green';
  if (score >= 80) return 'teal';
  return 'bronze';
}

export function CandidateCard({
  candidate = null,
  onViewDetails = () => { },
  onToggleShortlist = () => { },
  isShortlisted = false,
  onEdit = () => { },
  onDelete = () => { },
  selectedJobId = null,
  isSavedForJob = false,
  onSaveForJob = () => { },
}) {
  const { lang } = useLanguage();
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

  if (!candidate) return null;

  const tone = scoreTone(candidate.matchScore || 0);

  return (
    <div className="dg-root dgc-root">
      <style>{`
        .dg-root {
          --dg-paper: #F6F7F9; --dg-surface: #FFFFFF; --dg-sunken: #EFF1F4;
          --dg-border: #E3E6EB; --dg-border-strong: #CBD2DC;
          --dg-ink-900: #10151F; --dg-ink-700: #38414F; --dg-ink-500: #6B7280; --dg-ink-400: #96A0AC;
          --dg-teal-700: #0A5C68; --dg-teal-600: #0E7C8C; --dg-teal-100: #E1F2F3;
          --dg-bronze-700: #8A4B0C; --dg-bronze-600: #B4650F; --dg-bronze-100: #FBEEDD;
          --dg-green-700: #1F6E4A; --dg-green-600: #278F5E; --dg-green-100: #E3F5EC;
          --dg-danger: #B3261E; --dg-danger-bg: #FBEAE9;
          --font-display: 'Space Grotesk', 'Inter', sans-serif;
          --font-body: 'Inter', system-ui, sans-serif;
          --font-mono: 'JetBrains Mono', ui-monospace, monospace;
          font-family: var(--font-body); color: var(--dg-ink-900);
        }
        .dg-display { font-family: var(--font-display); letter-spacing: -0.01em; }
        .dgc-root { width: 100%; box-sizing: border-box; height: 100%; display: flex; flex-direction: column; }

        .dgc-card {
          background: var(--dg-surface); border: 1px solid var(--dg-border); border-radius: 18px;
          padding: 22px 24px; position: relative; display: flex; flex-direction: column; justify-content: space-between;
          flex: 1; box-shadow: 0 1px 3px rgba(16,21,31,0.04);
          transition: border-color .15s ease, box-shadow .15s ease, transform .15s ease;
        }
        .dgc-card:hover { border-color: var(--dg-border-strong); box-shadow: 0 12px 28px -18px rgba(16,21,31,0.16); transform: translateY(-2px); }

        .dgc-hover-actions {
          position: absolute; right: 16px; top: 16px; display: flex; gap: 6px;
          opacity: 0; transition: opacity .15s ease; z-index: 1;
        }
        .dgc-card:hover .dgc-hover-actions { opacity: 1; }
        .dgc-icon-btn {
          width: 30px; height: 30px; border-radius: 8px; background: var(--dg-surface);
          border: 1px solid var(--dg-border); color: var(--dg-ink-500);
          display: flex; align-items: center; justify-content: center; cursor: pointer; text-decoration: none;
          transition: background .15s ease, color .15s ease, border-color .15s ease;
        }
        .dgc-icon-btn:hover { background: var(--dg-sunken); color: var(--dg-teal-700); border-color: var(--dg-border-strong); }
        .dgc-icon-btn-danger:hover { color: var(--dg-danger); background: var(--dg-danger-bg); border-color: rgba(179,38,30,0.25); }

        .dgc-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; margin-bottom: 14px; }
        .dgc-person { display: flex; align-items: center; gap: 14px; min-width: 0; }
        .dgc-avatar { width: 50px; height: 50px; border-radius: 13px; object-fit: cover; border: 1px solid var(--dg-border); flex-shrink: 0; }
        .dgc-name { font-size: 15px; font-weight: 700; color: var(--dg-ink-900); line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .dgc-headline { font-size: 12px; color: var(--dg-ink-500); font-weight: 500; margin-top: 3px; line-height: 1.45; word-break: break-word; }

        .dgc-score { font-family: var(--font-mono); font-size: 12px; font-weight: 700; padding: 5px 10px; border-radius: 9px; border: 1px solid; flex-shrink: 0; }
        .dgc-score-green { color: var(--dg-green-700); background: var(--dg-green-100); border-color: rgba(31,110,74,0.25); }
        .dgc-score-teal { color: var(--dg-teal-700); background: var(--dg-teal-100); border-color: rgba(14,124,140,0.25); }
        .dgc-score-bronze { color: var(--dg-bronze-700); background: var(--dg-bronze-100); border-color: rgba(180,101,15,0.25); }

        .dgc-meta { display: flex; align-items: center; gap: 12px; font-size: 12px; color: var(--dg-ink-500); font-weight: 500; margin-bottom: 14px; }
        .dgc-meta-item { display: flex; align-items: center; gap: 5px; }
        .dgc-meta-dot { color: var(--dg-border-strong); }

        .dgc-summary { font-size: 12.5px; color: var(--dg-ink-700); line-height: 1.6; margin-bottom: 16px;
          display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }

        .dgc-skills { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 18px; }
        .dgc-skill {
          font-family: var(--font-mono); font-size: 10.5px; font-weight: 500;
          background: var(--dg-sunken); color: var(--dg-ink-700);
          border: 1px solid var(--dg-border); padding: 3px 9px; border-radius: 7px;
        }
        .dgc-skill-more { background: var(--dg-sunken); color: var(--dg-ink-500); border-color: var(--dg-border); }

        .dgc-footer { display: flex; align-items: center; justify-content: space-between; padding-top: 14px; border-top: 1px solid var(--dg-border); }
        .dgc-save-btn {
          display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700;
          background: none; border: none; cursor: pointer; color: var(--dg-ink-400);
          transition: color .15s ease;
        }
        .dgc-save-btn:hover { color: var(--dg-teal-700); }
        .dgc-save-btn-active { color: var(--dg-green-700); }
        .dgc-no-role { font-size: 11px; color: var(--dg-ink-400); font-weight: 500; font-style: italic; }

        .dgc-view-btn {
          display: flex; align-items: center; gap: 3px; font-size: 12px; font-weight: 700;
          background: none; border: none; cursor: pointer; color: var(--dg-teal-700);
          transition: color .15s ease;
        }
        .dgc-view-btn:hover { color: var(--dg-teal-700); text-decoration: underline; }
      `}</style>

      <div className="dgc-card">
        <div className="dgc-hover-actions">
          {candidate.linkedin && (
            <a
              className="dgc-icon-btn"
              href={candidate.linkedin.startsWith('http') ? candidate.linkedin : `https://${candidate.linkedin}`}
              target="_blank"
              rel="noopener noreferrer"
              title={T.openLinkedin}
              aria-label={T.openLinkedin}
            >
              <ExternalLink size={13} />
            </a>
          )}
          <button className="dgc-icon-btn" onClick={() => onEdit(candidate)} title={T.editCandidate} aria-label={T.editCandidate}>
            <Edit2 size={13} />
          </button>
          <button className="dgc-icon-btn dgc-icon-btn-danger" onClick={() => onDelete(candidate.id)} title={T.deleteCandidate} aria-label={T.deleteCandidate}>
            <Trash2 size={13} />
          </button>
        </div>

        <div>
          <div className="dgc-head">
            <div className="dgc-person">
              <img
                className="dgc-avatar"
                src={getAvatarUrl(candidate.fullName, candidate.avatarUrl)}
                alt={candidate.fullName}
                onError={(e) => { e.target.onerror = null; e.target.src = getAvatarUrl(candidate.fullName, null); }}
              />
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span className="dgc-name dg-display">{candidate.fullName}</span>
                  {candidate.source === 'talent_pool' && (
                    <span
                      style={{
                        fontSize: '9.5px',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 600,
                        padding: '2px 7px',
                        borderRadius: '6px',
                        background: 'var(--dg-teal-100)',
                        color: 'var(--dg-teal-700)',
                        border: '1px solid rgba(14,124,140,0.25)',
                        whiteSpace: 'nowrap',
                      }}
                      title={lang === 'FR' ? 'Issu de votre vivier de talents' : 'From your talent pool'}
                    >
                      {lang === 'FR' ? 'Du vivier' : 'From your talent pool'}
                    </span>
                  )}
                  {candidate.isDuplicate && (
                    <span
                      style={{
                        fontSize: '9.5px',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 600,
                        padding: '2px 7px',
                        borderRadius: '6px',
                        background: 'var(--dg-bronze-100)',
                        color: 'var(--dg-bronze-700)',
                        border: '1px solid rgba(180,101,15,0.25)',
                        whiteSpace: 'nowrap',
                      }}
                      title={`Seen ${Math.max(2, Number(candidate.timesSeen) || 2)} times across sourcing sessions`}
                    >
                      Previously sourced — seen {Math.max(2, Number(candidate.timesSeen) || 2)}x
                    </span>
                  )}
                </div>
                <div className="dgc-headline">{candidate.headline}</div>
              </div>
            </div>
            <div className={`dgc-score dgc-score-${tone}`}>{candidate.matchScore}%</div>
          </div>

          <div className="dgc-meta">
            <span className="dgc-meta-item"><MapPin size={12} color="var(--dg-teal-600)" />{candidate.location}</span>
            <span className="dgc-meta-dot">&bull;</span>
            <span className="dgc-meta-item"><Briefcase size={12} color="var(--dg-teal-600)" />{candidate.experienceYears} {T.yearsExp}</span>
          </div>

          <p className="dgc-summary">{candidate.summary}</p>

          <div className="dgc-skills">
            {candidate.skills.slice(0, 6).map((skill, idx) => (
              <span className="dgc-skill" key={idx}>{skill}</span>
            ))}
            {candidate.skills.length > 6 && (
              <span className="dgc-skill dgc-skill-more">+{candidate.skills.length - 6} more</span>
            )}
          </div>
        </div>

        <div className="dgc-footer">
          {selectedJobId ? (
            <button
              className={'dgc-save-btn' + (isSavedForJob ? ' dgc-save-btn-active' : '')}
              onClick={() => onSaveForJob(candidate.id)}
            >
              {isSavedForJob ? (
                <>
                  <BookmarkCheck size={13} />
                  <span>{T.shortlisted}</span>
                </>
              ) : (
                <>
                  <Bookmark size={13} />
                  <span>{T.shortlist}</span>
                </>
              )}
            </button>
          ) : (
            <span className="dgc-no-role">{T.selectRole}</span>
          )}

          <button className="dgc-view-btn" onClick={() => onViewDetails(candidate)}>
            <span>{T.viewProfile}</span>
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default CandidateCard;