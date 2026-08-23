import React, { useState, useEffect, useRef } from 'react';
import { X, ArrowRightLeft, MapPin, Briefcase, Sparkles, Mail, Globe, ExternalLink } from 'lucide-react';

import { useLanguage } from '../context/LanguageContext';
import { getAvatarUrl as getAvatarUrlUtil } from '../utils/avatar';

function getAvatarUrl(name, avatarUrl) {
  return getAvatarUrlUtil(name, avatarUrl);
}

function scoreTone(score) {
  if (score >= 90) return 'green';
  if (score >= 80) return 'teal';
  return 'bronze';
}

const T = {
  title: 'Side-by-side candidate comparator',
  sub: 'Compare 2 to 3 candidates on skills, experience and AI score',
  selectLabel: 'Select candidates to compare (max 3)',
  match: 'match',
  expLocation: 'Experience & location',
  yearsExp: 'years experience',
  expectations: 'Expectations & availability',
  keySkills: 'Key tech skills',
  aiRationale: 'AI match rationale',
};

export function CandidateComparator({
  isOpen = true,
  onClose = () => { },
  candidates = [],
  initialSelectedIds = [],
}) {
  const [selectedIds, setSelectedIds] = useState(() => {
    if (initialSelectedIds && initialSelectedIds.length > 0) return initialSelectedIds.slice(0, 3);
    return candidates.slice(0, 2).map((c) => c.id);
  });
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

  if (!isOpen) return null;

  const selectedCandidates = candidates.filter((c) => selectedIds.includes(c.id));

  const toggleSelect = (candId) => {
    if (selectedIds.includes(candId)) {
      if (selectedIds.length > 1) setSelectedIds(selectedIds.filter((id) => id !== candId));
    } else if (selectedIds.length < 3) {
      setSelectedIds([...selectedIds, candId]);
    }
  };

  return (
    <div className="dg-root dgcm-overlay">
      <style>{`
        .dg-root {
          --dg-paper: #F6F7F9; --dg-surface: #FFFFFF; --dg-sunken: #EFF1F4;
          --dg-border: #E3E6EB; --dg-border-strong: #CBD2DC;
          --dg-ink-900: #10151F; --dg-ink-700: #38414F; --dg-ink-500: #6B7280; --dg-ink-400: #96A0AC;
          --dg-teal-700: #0A5C68; --dg-teal-600: #0E7C8C; --dg-teal-100: #E1F2F3;
          --dg-bronze-700: #8A4B0C; --dg-bronze-600: #B4650F; --dg-bronze-100: #FBEEDD;
          --dg-green-700: #1F6E4A; --dg-green-600: #278F5E; --dg-green-100: #E3F5EC;
          --font-display: 'Space Grotesk', 'Inter', sans-serif;
          --font-body: 'Inter', system-ui, sans-serif;
          --font-mono: 'JetBrains Mono', ui-monospace, monospace;
          font-family: var(--font-body); color: var(--dg-ink-900);
        }
        .dg-display { font-family: var(--font-display); letter-spacing: -0.01em; }

        .dgcm-overlay {
          position: fixed; inset: 0; z-index: 50; overflow-y: auto;
          background: rgba(16,21,31,0.55); backdrop-filter: blur(3px);
          display: flex; align-items: center; justify-content: center; padding: 16px;
        }
        .dgcm-modal {
          background: var(--dg-surface); border: 1px solid var(--dg-border); border-radius: 20px;
          max-width: 1080px; width: 100%; max-height: 90vh; overflow: hidden;
          display: flex; flex-direction: column;
          box-shadow: 0 30px 70px -30px rgba(16,21,31,0.4);
        }

        .dgcm-header { padding: 20px 22px; border-bottom: 1px solid var(--dg-border); display: flex; align-items: center; justify-content: space-between; background: var(--dg-paper); }
        .dgcm-header-left { display: flex; align-items: center; gap: 12px; }
        .dgcm-header-icon { width: 34px; height: 34px; border-radius: 10px; background: var(--dg-teal-100); color: var(--dg-teal-700); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .dgcm-header-title { font-size: 14px; font-weight: 700; }
        .dgcm-header-sub { font-size: 11px; color: var(--dg-ink-500); margin-top: 2px; }
        .dgcm-close { background: none; border: none; color: var(--dg-ink-400); cursor: pointer; padding: 6px; border-radius: 8px; }
        .dgcm-close:hover { color: var(--dg-ink-700); background: var(--dg-sunken); }

        .dgcm-selector { padding: 14px 22px; background: var(--dg-paper); border-bottom: 1px solid var(--dg-border); display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
        .dgcm-selector-label { font-size: 11.5px; font-weight: 700; color: var(--dg-ink-700); }
        .dgcm-chip-row { display: flex; flex-wrap: wrap; gap: 8px; }
        .dgcm-chip {
          font-size: 12px; font-weight: 600; padding: 7px 13px; border-radius: 10px;
          border: 1px solid var(--dg-border); background: var(--dg-surface); color: var(--dg-ink-700);
          cursor: pointer; transition: background .15s ease, color .15s ease, border-color .15s ease;
        }
        .dgcm-chip:hover { border-color: var(--dg-border-strong); }
        .dgcm-chip-active { background: var(--dg-teal-600); color: #fff; border-color: var(--dg-teal-600); }
        .dgcm-chip-active:hover { border-color: var(--dg-teal-600); }

        .dgcm-body { padding: 22px; overflow-y: auto; flex: 1; }
        .dgcm-grid { display: grid; gap: 18px; }
        .dgcm-grid-2 { grid-template-columns: 1fr 1fr; }
        .dgcm-grid-3 { grid-template-columns: 1fr 1fr 1fr; }

        .dgcm-col { background: var(--dg-paper); border: 1px solid var(--dg-border); border-radius: 16px; padding: 18px; display: flex; flex-direction: column; gap: 16px; }

        .dgcm-col-head { text-align: center; padding-bottom: 14px; border-bottom: 1px solid var(--dg-border); }
        .dgcm-col-avatar { width: 60px; height: 60px; border-radius: 16px; object-fit: cover; border: 1px solid var(--dg-border-strong); margin: 0 auto 10px; display: block; }
        .dgcm-col-name { font-size: 13.5px; font-weight: 700; }
        .dgcm-col-headline { font-size: 11px; color: var(--dg-ink-500); font-weight: 500; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .dgcm-match-pill {
          display: inline-flex; align-items: center; gap: 5px; font-family: var(--font-mono);
          font-size: 11.5px; font-weight: 700; padding: 5px 12px; border-radius: 999px; border: 1px solid; margin-top: 10px;
        }
        .dgcm-match-green { color: var(--dg-green-700); background: var(--dg-green-100); border-color: rgba(31,110,74,0.25); }
        .dgcm-match-teal { color: var(--dg-teal-700); background: var(--dg-teal-100); border-color: rgba(14,124,140,0.25); }
        .dgcm-match-bronze { color: var(--dg-bronze-700); background: var(--dg-bronze-100); border-color: rgba(180,101,15,0.25); }

        .dgcm-block-label { font-size: 10px; font-weight: 700; color: var(--dg-ink-400); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 7px; }
        .dgcm-block-box { background: var(--dg-surface); border: 1px solid var(--dg-border); border-radius: 12px; padding: 11px 12px; font-size: 11.5px; color: var(--dg-ink-700); font-weight: 500; }
        .dgcm-block-row { display: flex; align-items: center; gap: 7px; }
        .dgcm-block-row + .dgcm-block-row { margin-top: 6px; }
        .dgcm-avail { font-size: 10.5px; color: var(--dg-ink-400); margin-top: 3px; }

        .dgcm-skills { display: flex; flex-wrap: wrap; gap: 6px; }
        .dgcm-skill { font-family: var(--font-mono); font-size: 10px; font-weight: 500; background: var(--dg-teal-100); color: var(--dg-teal-700); border: 1px solid rgba(14,124,140,0.18); padding: 3px 8px; border-radius: 7px; }

        .dgcm-reasons { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 7px; }
        .dgcm-reason { display: flex; align-items: flex-start; gap: 8px; font-size: 11px; color: var(--dg-ink-700); line-height: 1.5; }
        .dgcm-reason-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--dg-teal-600); flex-shrink: 0; margin-top: 6px; }

        .dgcm-contacts { display: flex; align-items: center; justify-content: center; gap: 14px; padding-top: 4px; }
        .dgcm-contact-link { color: var(--dg-ink-400); transition: color .15s ease; }
        .dgcm-contact-link:hover { color: var(--dg-teal-700); }
      `}</style>

      <div className="dgcm-modal">
        <div className="dgcm-header">
          <div className="dgcm-header-left">
            <div className="dgcm-header-icon"><ArrowRightLeft size={16} /></div>
            <div>
              <div className="dgcm-header-title dg-display">{T.title}</div>
              <div className="dgcm-header-sub">{T.sub}</div>
            </div>
          </div>
          <button className="dgcm-close" onClick={onClose} aria-label="Close">
            <X size={17} />
          </button>
        </div>

        <div className="dgcm-selector">
          <span className="dgcm-selector-label">{T.selectLabel}:</span>
          <div className="dgcm-chip-row">
            {candidates.map((c) => {
              const isSelected = selectedIds.includes(c.id);
              return (
                <button
                  key={c.id}
                  className={'dgcm-chip' + (isSelected ? ' dgcm-chip-active' : '')}
                  onClick={() => toggleSelect(c.id)}
                >
                  {c.fullName}
                </button>
              );
            })}
          </div>
        </div>

        <div className="dgcm-body">
          <div className={'dgcm-grid ' + (selectedCandidates.length === 3 ? 'dgcm-grid-3' : 'dgcm-grid-2')}>
            {selectedCandidates.map((candidate) => {
              const tone = scoreTone(candidate.matchScore);
              return (
                <div className="dgcm-col" key={candidate.id}>
                  <div className="dgcm-col-head">
                    <img
                      className="dgcm-col-avatar"
                      src={getAvatarUrl(candidate.fullName, candidate.avatarUrl)}
                      alt={candidate.fullName}
                      onError={(e) => { e.target.onerror = null; e.target.src = getAvatarUrl(candidate.fullName, null); }}
                    />
                    <div className="dgcm-col-name dg-display">{candidate.fullName}</div>
                    <div className="dgcm-col-headline">{candidate.headline}</div>
                    <div className={`dgcm-match-pill dgcm-match-${tone}`}>
                      <Sparkles size={12} />
                      {candidate.matchScore}% {T.match}
                    </div>
                  </div>

                  <div>
                    <div className="dgcm-block-label">{T.expLocation}</div>
                    <div className="dgcm-block-box">
                      <div className="dgcm-block-row"><Briefcase size={13} color="var(--dg-teal-600)" />{candidate.experienceYears} {T.yearsExp}</div>
                      <div className="dgcm-block-row"><MapPin size={13} color="var(--dg-teal-600)" />{candidate.location}</div>
                    </div>
                  </div>

                  <div>
                    <div className="dgcm-block-label">{T.expectations}</div>
                    <div className="dgcm-block-box">
                      <div>{candidate.salaryExpectation || 'N/A'}</div>
                      <div className="dgcm-avail">{candidate.availability || 'Immediate'}</div>
                    </div>
                  </div>

                  <div>
                    <div className="dgcm-block-label">{T.keySkills}</div>
                    <div className="dgcm-skills">
                      {candidate.skills.map((skill, idx) => (
                        <span className="dgcm-skill" key={idx}>{skill}</span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="dgcm-block-label">{T.aiRationale}</div>
                    <ul className="dgcm-reasons">
                      {(candidate.verifiedMatchReasons || [candidate.summary]).slice(0, 3).map((r, idx) => (
                        <li className="dgcm-reason" key={idx}>
                          <span className="dgcm-reason-dot" />
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="dgcm-contacts">
                    {candidate.email && (
                      <a className="dgcm-contact-link" href={`mailto:${candidate.email}`} title={candidate.email}>
                        <Mail size={15} />
                      </a>
                    )}
                    {candidate.linkedin && (
                      <a className="dgcm-contact-link" href={`https://${candidate.linkedin}`} target="_blank" rel="noreferrer" title="LinkedIn profile">
                        <Globe size={15} />
                      </a>
                    )}
                    {candidate.github && (
                      <a className="dgcm-contact-link" href={`https://${candidate.github}`} target="_blank" rel="noreferrer" title="GitHub profile">
                        <ExternalLink size={15} />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CandidateComparator;