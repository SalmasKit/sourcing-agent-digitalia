import React, { useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { getAvatarUrl } from '../utils/avatar';
import { FileText, Download, Trash2, Eye, MapPin, Plus, BookmarkX } from 'lucide-react';

const COPY = {
  EN: {
    title: 'Saved Job Shortlists & Talent Pools',
    sub: 'Review your job descriptions and candidates saved for each specific role',
    newJob: 'New job description',
    noJobsTitle: 'No job descriptions created yet',
    noJobsSub: 'Create your first job description to save and organize candidates per role.',
    saved: 'Saved',
    noCandidatesFR: 'No candidates saved for this role yet. Browse profiles in Sourcing and click "Save to Role".',
    unsave: 'Remove from role',
    viewProfile: 'View profile',
  },
  FR: {
    title: 'Shortlists & Viviers par Poste',
    sub: 'Consultez vos fiches de poste et les candidats spécifiques que vous y avez enregistrés.',
    newJob: 'Nouvelle fiche de poste',
    noJobsTitle: 'Aucune fiche de poste créée',
    noJobsSub: 'Créez une première fiche de poste pour enregistrer et organiser des candidats par métier.',
    saved: 'Enregistrés',
    noCandidatesFR: 'Aucun candidat enregistré pour ce poste. Naviguez dans l\'Espace Sourcing et cliquez sur "Enregistrer au poste".',
    unsave: 'Retirer de la fiche',
    viewProfile: 'Voir le profil',
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
  const isFR = lang === 'FR';
  const t = COPY[lang] || COPY.EN;
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

  const handleExportRoleCSV = (job, roleSavedCandidates) => {
    if (roleSavedCandidates.length === 0) return;

    const headers = ['Full Name', 'Headline', 'Match Score', 'Location', 'Experience', 'Email', 'Skills'];
    const rows = roleSavedCandidates.map(c => [
      `"${c.fullName}"`,
      `"${c.headline}"`,
      `${c.matchScore}%`,
      `"${c.location}"`,
      `"${c.experienceYears} Years"`,
      `"${c.email || ''}"`,
      `"${(c.skills || []).join(', ')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${job.title.toLowerCase().replace(/\s+/g, '_')}_saved_candidates_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="dg-root dgsl-root">
      <style>{`
        .dg-root {
          --dg-paper: #F6F7F9; --dg-surface: #FFFFFF; --dg-sunken: #EFF1F4;
          --dg-border: #E3E6EB; --dg-border-strong: #CBD2DC;
          --dg-ink-900: #10151F; --dg-ink-700: #38414F; --dg-ink-500: #6B7280; --dg-ink-400: #96A0AC;
          --dg-teal-700: #0A5C68; --dg-teal-600: #0E7C8C; --dg-teal-300: #8CCDD3; --dg-teal-100: #E1F2F3;
          --dg-green-700: #1F6E4A; --dg-green-600: #278F5E; --dg-green-100: #E3F5EC;
          --dg-danger: #B3261E; --dg-danger-bg: #FBEAE9;
          --font-display: 'Space Grotesk', 'Inter', sans-serif;
          --font-body: 'Inter', system-ui, sans-serif;
          --font-mono: 'JetBrains Mono', ui-monospace, monospace;
          font-family: var(--font-body); color: var(--dg-ink-900); background: var(--dg-paper);
        }
        .dg-display { font-family: var(--font-display); letter-spacing: -0.01em; }
        .dgsl-root { max-width: 1200px; margin: 0 auto; padding: 24px; display: flex; flex-direction: column; gap: 20px; }

        .dgsl-header {
          background: var(--dg-surface); border: 1px solid var(--dg-border); border-radius: 18px;
          padding: 20px 24px; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;
        }
        .dgsl-header-left { display: flex; align-items: center; gap: 12px; }
        .dgsl-header-icon { width: 38px; height: 38px; border-radius: 11px; background: var(--dg-teal-100); color: var(--dg-teal-700); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .dgsl-header-title { font-size: 16px; font-weight: 700; margin: 0; }
        .dgsl-header-sub { font-size: 11.5px; color: var(--dg-ink-500); margin-top: 2px; }

        .dgsl-add-btn {
          display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700;
          background: var(--dg-ink-900); color: #fff; border: none; border-radius: 11px;
          padding: 9px 16px; cursor: pointer; transition: background .15s ease;
        }
        .dgsl-add-btn:hover { background: #232C3A; }

        .dgsl-card {
          background: var(--dg-surface); border: 1px solid var(--dg-border); border-radius: 18px;
          padding: 22px; display: flex; flex-direction: column; gap: 16px;
        }
        .dgsl-card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; pb: 14px; border-bottom: 1px solid var(--dg-border); }
        .dgsl-card-title-row { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
        .dgsl-card-title { font-size: 15px; font-weight: 700; color: var(--dg-ink-900); }
        .dgsl-badge {
          font-family: var(--font-mono); font-size: 10px; font-weight: 700; padding: 3px 9px;
          border-radius: 999px; border: 1px solid;
        }
        .dgsl-badge-on { color: var(--dg-green-700); background: var(--dg-green-100); border-color: rgba(31,110,74,0.25); }
        .dgsl-badge-off { color: var(--dg-ink-500); background: var(--dg-sunken); border-color: var(--dg-border); }
        .dgsl-card-desc { font-size: 12px; color: var(--dg-ink-500); margin-top: 4px; line-height: 1.5; max-width: 680px; }
        .dgsl-card-meta { display: flex; align-items: center; gap: 12px; font-size: 11px; color: var(--dg-ink-400); margin-top: 8px; flex-wrap: wrap; }

        .dgsl-actions { display: flex; align-items: center; gap: 8px; }
        .dgsl-btn {
          display: flex; align-items: center; gap: 5px; font-size: 11.5px; font-weight: 600;
          background: var(--dg-paper); border: 1px solid var(--dg-border); border-radius: 9px;
          padding: 6px 12px; color: var(--dg-ink-700); cursor: pointer;
          transition: background .15s ease, border-color .15s ease;
        }
        .dgsl-btn:hover { background: var(--dg-sunken); border-color: var(--dg-border-strong); }
        .dgsl-btn-danger:hover { color: var(--dg-danger); background: var(--dg-danger-bg); border-color: rgba(179,38,30,0.25); }

        .dgsl-cand-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .dgsl-cand-item {
          background: var(--dg-paper); border: 1px solid var(--dg-border); border-radius: 13px;
          padding: 12px; display: flex; align-items: center; justify-content: space-between; gap: 10px;
          transition: border-color .15s ease, box-shadow .15s ease;
        }
        .dgsl-cand-item:hover { border-color: var(--dg-border-strong); box-shadow: 0 4px 12px -6px rgba(16,21,31,0.08); }
        .dgsl-cand-person { display: flex; align-items: center; gap: 10px; min-width: 0; }
        .dgsl-cand-avatar { width: 36px; height: 36px; border-radius: 9px; object-fit: cover; border: 1px solid var(--dg-border); flex-shrink: 0; }
        .dgsl-cand-name { font-size: 12px; font-weight: 700; color: var(--dg-ink-900); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .dgsl-cand-headline { font-size: 10.5px; color: var(--dg-ink-500); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .dgsl-cand-score { font-family: var(--font-mono); font-size: 10px; font-weight: 700; color: var(--dg-green-700); margin-top: 2px; }

        .dgsl-icon-btn {
          width: 28px; height: 28px; border-radius: 7px; background: var(--dg-surface);
          border: 1px solid var(--dg-border); color: var(--dg-ink-500); display: flex; align-items: center;
          justify-content: center; cursor: pointer; transition: background .15s ease, color .15s ease;
        }
        .dgsl-icon-btn:hover { background: var(--dg-sunken); color: var(--dg-teal-700); }
        .dgsl-icon-btn-danger:hover { color: var(--dg-danger); background: var(--dg-danger-bg); }

        .dgsl-empty-box {
          font-size: 11.5px; color: var(--dg-ink-400); text-align: center; padding: 24px;
          border: 1px dashed var(--dg-border-strong); border-radius: 12px; background: var(--dg-paper);
        }

        @media (max-width: 900px) {
          .dgsl-cand-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 600px) {
          .dgsl-cand-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* Header Banner */}
      <div className="dgsl-header">
        <div className="dgsl-header-left">
          <div className="dgsl-header-icon"><FileText size={18} /></div>
          <div>
            <h2 className="dgsl-header-title dg-display">{t.title}</h2>
            <div className="dgsl-header-sub">{t.sub}</div>
          </div>
        </div>

        <button onClick={onOpenJobModal} className="dgsl-add-btn">
          <Plus size={15} />
          <span>{t.newJob}</span>
        </button>
      </div>

      {/* Job Descriptions List */}
      {jobDescriptions.length === 0 ? (
        <div className="dgsl-empty-box" style={{ padding: 48 }}>
          <FileText size={36} color="var(--dg-border-strong)" style={{ margin: '0 auto 12px' }} />
          <div className="dg-display" style={{ fontSize: 14, fontWeight: 700, color: 'var(--dg-ink-700)' }}>{t.noJobsTitle}</div>
          <div style={{ fontSize: 11.5, marginTop: 4 }}>{t.noJobsSub}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {jobDescriptions.map((job) => {
            const savedIds = savedRoleCandidates[job.id] || [];
            const roleSavedCandidates = candidates.filter(c => savedIds.includes(c.id));

            return (
              <div key={job.id} className="dgsl-card">
                <div className="dgsl-card-head">
                  <div>
                    <div className="dgsl-card-title-row">
                      <h3 className="dgsl-card-title dg-display">{job.title}</h3>
                      <span className={`dgsl-badge ${roleSavedCandidates.length > 0 ? 'dgsl-badge-on' : 'dgsl-badge-off'}`}>
                        {roleSavedCandidates.length} {t.saved}
                      </span>
                    </div>
                    {job.description && (
                      <p className="dgsl-card-desc">{job.description}</p>
                    )}
                    <div className="dgsl-card-meta">
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <MapPin size={12} color="var(--dg-teal-600)" />
                        {job.location || 'All Locations'}
                      </span>
                      {job.skills && job.skills.length > 0 && (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {job.skills.map((s, idx) => (
                            <span key={idx} className="dg-mono" style={{ fontSize: 9.5, background: 'var(--dg-sunken)', padding: '2px 6px', borderRadius: 4, color: 'var(--dg-ink-700)' }}>
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="dgsl-actions">
                    <button
                      onClick={() => handleExportRoleCSV(job, roleSavedCandidates)}
                      disabled={roleSavedCandidates.length === 0}
                      className="dgsl-btn"
                      title="Export Saved Role CSV"
                    >
                      <Download size={13} />
                      <span>CSV</span>
                    </button>
                    <button
                      onClick={(e) => onDeleteJob(e, job.id)}
                      className="dgsl-btn dgsl-btn-danger"
                      title="Delete Job Description"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div>
                  {roleSavedCandidates.length === 0 ? (
                    <div className="dgsl-empty-box">
                      {t.noCandidatesFR}
                    </div>
                  ) : (
                    <div className="dgsl-cand-grid">
                      {roleSavedCandidates.map((candidate) => (
                        <div key={candidate.id} className="dgsl-cand-item">
                          <div className="dgsl-cand-person">
                            <img
                              src={getAvatarUrl(candidate.fullName, candidate.avatarUrl)}
                              alt={candidate.fullName}
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = getAvatarUrl(candidate.fullName, null);
                              }}
                              className="dgsl-cand-avatar"
                            />
                            <div style={{ minWidth: 0 }}>
                              <div className="dgsl-cand-name dg-display">{candidate.fullName}</div>
                              <div className="dgsl-cand-headline">{candidate.headline}</div>
                              <div className="dgsl-cand-score">{candidate.matchScore}% Match</div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                            <button
                              onClick={() => onViewDetails(candidate)}
                              className="dgsl-icon-btn"
                              title={t.viewProfile}
                            >
                              <Eye size={13} />
                            </button>
                            <button
                              onClick={() => onToggleSaveCandidateForJob(candidate.id, job.id)}
                              className="dgsl-icon-btn dgsl-icon-btn-danger"
                              title={t.unsave}
                            >
                              <BookmarkX size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}

export default ShortlistPanel;
