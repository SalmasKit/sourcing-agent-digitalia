/**
 * CandidateComparator — redesigned
 *
 * Design intent: a comparator's whole job is to make differences visible,
 * so the redesign leans entirely into that instead of three identical columns:
 *  - Shared skills are pulled out and marked distinctly from each candidate's
 *    unique skills, so overlap is legible at a glance.
 *  - Whichever candidate wins a row (more experience, higher score) gets a
 *    quiet highlight on that row only — not a decorated whole column.
 *  - Selecting a candidate chip animates the columns to their new width
 *    instead of hard-cutting between 2 and 3 columns.
 *
 * Same token system as the redesigned CandidateCard: ink #12151B,
 * paper #F7F5F1, tier colors for score (coral / cyan / slate).
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, ArrowRightLeft, MapPin, Briefcase, Sparkles, Mail, Globe, ExternalLink, Crown, Check } from 'lucide-react';

function useFonts() {
  const loaded = useRef(false);
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap';
    document.head.appendChild(link);
  }, []);
}

function scoreTier(score) {
  if (score >= 90) return { color: '#E85D3D', soft: '#FDEEE9', label: 'hot lead' };
  if (score >= 80) return { color: '#0BA5C9', soft: '#E9F7FA', label: 'good match' };
  return { color: '#8A8F98', soft: '#F1F1F2', label: 'possible fit' };
}

function avatarUrl(name) {
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=12151B&textColor=ffffff&fontWeight=600&fontSize=38`;
}

function MiniRing({ score, color, size = 44 }) {
  const [drawn, setDrawn] = useState(0);
  const r = (size - 5) / 2;
  const c = 2 * Math.PI * r;
  useEffect(() => { const t = setTimeout(() => setDrawn(score), 100); return () => clearTimeout(t); }, [score]);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EAE7E0" strokeWidth="3" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c - (drawn / 100) * c}
        style={{ transition: 'stroke-dashoffset .9s cubic-bezier(0.22,1,0.36,1)' }} />
    </svg>
  );
}

export function CandidateComparator({ isOpen = true, onClose = () => { }, candidates = [], initialSelectedIds = [] }) {
  useFonts();
  const [selectedIds, setSelectedIds] = useState(() => {
    if (initialSelectedIds?.length) return initialSelectedIds.slice(0, 3);
    return candidates.slice(0, 2).map(c => c.id);
  });

  // Derive selected list BEFORE hooks so useMemo deps are stable
  const selected = candidates.filter(c => selectedIds.includes(c.id));
  const count = selected.length;

  // ── ALL hooks must be called unconditionally before any early return ──
  const sharedSkills = useMemo(() => {
    if (selected.length < 2) return new Set();
    const [first, ...rest] = selected.map(c => new Set(c.skills));
    return new Set([...first].filter(skill => rest.every(set => set.has(skill))));
  }, [selected]);

  const maxExp   = useMemo(() => Math.max(...selected.map(c => c.experienceYears), 0), [selected]);
  const maxScore = useMemo(() => Math.max(...selected.map(c => c.matchScore),       0), [selected]);

  const expTied   = selected.filter(c => c.experienceYears === maxExp).length  === selected.length;
  const scoreTied = selected.filter(c => c.matchScore      === maxScore).length === selected.length;

  function toggleSelect(id) {
    if (selectedIds.includes(id)) {
      if (selectedIds.length > 1) setSelectedIds(selectedIds.filter(x => x !== id));
    } else if (selectedIds.length < 3) {
      setSelectedIds([...selectedIds, id]);
    }
  }

  // Guard after all hooks
  if (!isOpen) return null;

  return (
    <div className="cp-overlay">
      <style>{`
        @keyframes cpFadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes cpModalIn { from { opacity:0; transform: scale(0.97) translateY(6px); } to { opacity:1; transform:scale(1) translateY(0); } }
        @keyframes cpColIn { from { opacity:0; transform: translateY(6px); } to { opacity:1; transform:translateY(0); } }

        .cp-overlay {
          position: fixed; inset: 0; z-index: 50; overflow-y: auto;
          background: rgba(18,21,27,0.55); backdrop-filter: blur(3px);
          display:flex; align-items:center; justify-content:center; padding:16px;
          animation: cpFadeIn .2s ease both;
          font-family: 'Inter', system-ui, sans-serif;
        }
        .cp-modal {
          background:#FBFAF7; border:1px solid #E4E1D9; border-radius:20px;
          max-width: 1080px; width:100%; max-height:90vh; overflow:hidden;
          display:flex; flex-direction:column; box-shadow: 0 30px 70px -30px rgba(18,21,27,0.45);
          animation: cpModalIn .25s cubic-bezier(0.22,1,0.36,1) both;
        }
        .cp-header { padding:18px 22px; border-bottom:1px solid #E4E1D9; display:flex; align-items:center; justify-content:space-between; }
        .cp-header-left { display:flex; align-items:center; gap:12px; }
        .cp-header-icon { width:32px; height:32px; border-radius:9px; background:#F1F1EC; color:#12151B; display:flex; align-items:center; justify-content:center; }
        .cp-title { font-family:'Space Grotesk',sans-serif; font-size:14px; font-weight:700; color:#12151B; }
        .cp-sub { font-size:11.5px; color:#63666E; margin-top:2px; }
        .cp-close { background:none; border:none; color:#9B9C9E; cursor:pointer; padding:6px; border-radius:8px; }
        .cp-close:hover { color:#12151B; background:#F1F1EC; }

        .cp-selector { padding:12px 22px; border-bottom:1px solid #E4E1D9; display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
        .cp-selector-label { font-size:11px; font-weight:600; color:#63666E; }
        .cp-chip-row { display:flex; flex-wrap:wrap; gap:8px; }
        .cp-chip {
          display:flex; align-items:center; gap:7px; font-size:12px; font-weight:600;
          padding:5px 12px 5px 5px; border-radius:20px; border:1px solid #E4E1D9; background:#fff; color:#3A3D44;
          cursor:pointer; transition: background .15s ease, color .15s ease, border-color .15s ease;
        }
        .cp-chip img { width:20px; height:20px; border-radius:50%; }
        .cp-chip:hover { border-color:#C9C5BA; }
        .cp-chip.active { background:#12151B; color:#fff; border-color:#12151B; }
        .cp-chip-score { font-family:'JetBrains Mono',monospace; font-size:10px; opacity:0.7; }

        .cp-body { padding:20px 22px 24px; overflow-y:auto; flex:1; }
        .cp-grid { display:flex; gap:16px; align-items:stretch; }
        .cp-col {
          background:#fff; border:1px solid #E4E1D9; border-radius:16px; padding:16px;
          display:flex; flex-direction:column; gap:14px;
          flex: 1 1 0; min-width:0;
          transition: flex-basis .3s cubic-bezier(0.22,1,0.36,1);
          animation: cpColIn .35s cubic-bezier(0.22,1,0.36,1) both;
        }

        .cp-col-head { text-align:center; padding-bottom:12px; border-bottom:1px solid #EFEDE7; position:relative; }
        .cp-crown { position:absolute; top:-6px; left:50%; transform:translateX(-50%); color:#E8B23D; }
        .cp-ring-wrap { position:relative; width:44px; height:44px; margin:0 auto 8px; }
        .cp-col-avatar { position:absolute; top:4px; left:4px; width:36px; height:36px; border-radius:50%; object-fit:cover; }
        .cp-col-name { font-family:'Space Grotesk',sans-serif; font-size:13px; font-weight:700; color:#12151B; }
        .cp-col-headline { font-size:11px; color:#63666E; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .cp-tier-pill { display:inline-block; font-size:10.5px; font-weight:700; padding:3px 10px; border-radius:20px; margin-top:8px; }

        .cp-block-label { font-size:10px; font-weight:700; color:#9B9C9E; letter-spacing:.03em; margin-bottom:6px; }
        .cp-block-box { background:#FBFAF7; border:1px solid #EFEDE7; border-radius:10px; padding:9px 10px; font-size:11.5px; color:#3A3D44; font-weight:500; transition: background .2s ease, border-color .2s ease; }
        .cp-block-box.winner { background:#FDEEE9; border-color:rgba(232,93,61,0.3); }
        .cp-block-row { display:flex; align-items:center; gap:7px; }
        .cp-block-row + .cp-block-row { margin-top:5px; }
        .cp-winner-tag { margin-left:auto; display:flex; align-items:center; gap:3px; font-size:9.5px; font-weight:700; color:#E85D3D; }
        .cp-avail { font-size:10px; color:#9B9C9E; margin-top:3px; }

        .cp-skills-count { font-size:10.5px; color:#63666E; margin-bottom:7px; }
        .cp-skills { display:flex; flex-wrap:wrap; gap:5px; }
        .cp-skill { font-size:10.5px; font-weight:500; padding:3px 9px; border-radius:20px; border:1px solid transparent; }
        .cp-skill.shared { background:#12151B; color:#fff; }
        .cp-skill.unique { background:#F1F1EC; color:#63666E; }

        .cp-reasons { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:6px; }
        .cp-reason { display:flex; align-items:flex-start; gap:7px; font-size:11px; color:#3A3D44; line-height:1.5; }
        .cp-reason-dot { width:4px; height:4px; border-radius:50%; background:#0BA5C9; flex-shrink:0; margin-top:6px; }

        .cp-contacts { display:flex; align-items:center; justify-content:center; gap:14px; padding-top:2px; margin-top:auto; }
        .cp-contact-link { color:#9B9C9E; transition:color .15s ease; }
        .cp-contact-link:hover { color:#12151B; }
      `}</style>

      <div className="cp-modal">
        <div className="cp-header">
          <div className="cp-header-left">
            <div className="cp-header-icon"><ArrowRightLeft size={15} /></div>
            <div>
              <div className="cp-title">Compare candidates</div>
              <div className="cp-sub">Shared skills and the stronger value in each row are highlighted automatically</div>
            </div>
          </div>
          <button className="cp-close" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>

        <div className="cp-selector">
          <span className="cp-selector-label">Comparing (max 3):</span>
          <div className="cp-chip-row">
            {candidates.map(c => {
              const isSel = selectedIds.includes(c.id);
              return (
                <button key={c.id} className={`cp-chip${isSel ? ' active' : ''}`} onClick={() => toggleSelect(c.id)}>
                  <img src={avatarUrl(c.fullName)} alt="" />
                  {c.fullName}
                  <span className="cp-chip-score">{c.matchScore}%</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="cp-body">
          <div className="cp-grid">
            {selected.map((candidate, i) => {
              const tier = scoreTier(candidate.matchScore);
              const isTopScore = candidate.matchScore === maxScore && !scoreTied && count > 1;
              const isTopExp = candidate.experienceYears === maxExp && !expTied && count > 1;
              const unique = candidate.skills.filter(s => !sharedSkills.has(s));
              const shared = candidate.skills.filter(s => sharedSkills.has(s));

              return (
                <div className="cp-col" key={candidate.id} style={{ animationDelay: `${i * 40}ms` }}>
                  <div className="cp-col-head">
                    {isTopScore && <Crown size={16} className="cp-crown" fill="#E8B23D" />}
                    <div className="cp-ring-wrap">
                      <MiniRing score={candidate.matchScore} color={tier.color} />
                      <img className="cp-col-avatar" src={avatarUrl(candidate.fullName)} alt={candidate.fullName} />
                    </div>
                    <div className="cp-col-name">{candidate.fullName}</div>
                    <div className="cp-col-headline">{candidate.headline}</div>
                    <div className="cp-tier-pill" style={{ color: tier.color, background: tier.soft }}>{candidate.matchScore}% · {tier.label}</div>
                  </div>

                  <div>
                    <div className="cp-block-label">Experience &amp; location</div>
                    <div className={`cp-block-box${isTopExp ? ' winner' : ''}`}>
                      <div className="cp-block-row">
                        <Briefcase size={12} color={isTopExp ? '#E85D3D' : '#63666E'} />
                        {candidate.experienceYears} years experience
                        {isTopExp && <span className="cp-winner-tag"><Crown size={10} /> most</span>}
                      </div>
                      <div className="cp-block-row"><MapPin size={12} color="#63666E" />{candidate.location}</div>
                    </div>
                  </div>

                  <div>
                    <div className="cp-block-label">Expectations &amp; availability</div>
                    <div className="cp-block-box">
                      <div>{candidate.salaryExpectation || 'Not specified'}</div>
                      <div className="cp-avail">{candidate.availability || 'Immediate'}</div>
                    </div>
                  </div>

                  <div>
                    <div className="cp-block-label">Tech skills</div>
                    {sharedSkills.size > 0 && (
                      <div className="cp-skills-count">{shared.length} shared across everyone compared</div>
                    )}
                    <div className="cp-skills">
                      {shared.map(s => <span className="cp-skill shared" key={s}><Check size={9} style={{ marginRight: 3, verticalAlign: -1 }} />{s}</span>)}
                      {unique.map(s => <span className="cp-skill unique" key={s}>{s}</span>)}
                    </div>
                  </div>

                  <div>
                    <div className="cp-block-label">AI match rationale</div>
                    <ul className="cp-reasons">
                      {(candidate.verifiedMatchReasons || [candidate.summary]).slice(0, 3).map((r, idx) => (
                        <li className="cp-reason" key={idx}><span className="cp-reason-dot" /><span>{r}</span></li>
                      ))}
                    </ul>
                  </div>

                  <div className="cp-contacts">
                    {candidate.email && <a className="cp-contact-link" href={`mailto:${candidate.email}`} title={candidate.email}><Mail size={14} /></a>}
                    {candidate.linkedin && <a className="cp-contact-link" href={candidate.linkedin} target="_blank" rel="noreferrer" title="LinkedIn"><Globe size={14} /></a>}
                    {candidate.github && <a className="cp-contact-link" href={candidate.github} target="_blank" rel="noreferrer" title="GitHub"><ExternalLink size={14} /></a>}
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