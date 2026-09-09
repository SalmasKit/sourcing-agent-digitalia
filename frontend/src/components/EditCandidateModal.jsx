/**
 * EditCandidateModal — redesigned
 *
 * The original was a static field dump. Real interactivity for a *form*
 * means the inputs themselves behave better, not just decoration:
 *  - Skills are entered as tags (type + Enter/comma, backspace to remove
 *    the last one) instead of one fragile comma-separated string.
 *  - Match score is a slider tied to a live ring preview, using the same
 *    tier colors as the rest of the app (coral/cyan/slate) — you see the
 *    tier you're assigning as you drag it.
 *  - AI justifications are a real add/remove list instead of "one per
 *    line" in a textarea, which is easy to mis-format.
 *  - A live avatar preview updates from the name as you type.
 *  - Inline validation on required fields, with a quick shake on the
 *    submit button if you try to save while something's missing.
 *
 * Kept as a modal (unlike the detail view) since this is a quick,
 * self-contained create/edit action — a modal is the right call here.
 */

import React, { useState, useEffect, useRef } from 'react';
import { X, Save, PlusCircle, Plus, Trash2 } from 'lucide-react';

function useFonts() {
  const loaded = useRef(false);
  useEffect(() => {
    if (loaded.current) return; loaded.current = true;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap';
    document.head.appendChild(link);
  }, []);
}

function avatarUrl(name) {
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || '?')}&backgroundColor=12151B&textColor=ffffff&fontWeight=600&fontSize=38`;
}

function scoreTier(score) {
  if (score >= 90) return { color: '#E85D3D', label: 'hot lead' };
  if (score >= 80) return { color: '#0BA5C9', label: 'good match' };
  return { color: '#8A8F98', label: 'possible fit' };
}

function ScoreRing({ score, color, size = 56 }) {
  const r = (size - 6) / 2, c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EAE7E0" strokeWidth="4" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c - (score / 100) * c}
        style={{ transition: 'stroke-dashoffset .25s ease' }} />
    </svg>
  );
}

const T = {
  editCandidate: 'Edit candidate', createProfile: 'Create candidate profile',
  fullName: 'Full name', email: 'Email', jobHeadline: 'Job headline', jobHeadlinePh: 'e.g. Senior software architect',
  location: 'Location', expYears: 'Exp. years', salaryExpectation: 'Salary expectation', salaryPh: 'e.g. 28,000 MAD/month',
  availability: 'Availability', availabilityPh: 'e.g. Immediate / 1 month',
  skills: 'Technical skills', skillsPh: 'Type a skill and press Enter', matchScore: 'Match score',
  summary: 'Professional summary', aiJustifications: 'AI match justifications', addReason: 'Add justification',
  reasonPh: 'e.g. 8 years of relevant backend experience', saveCandidate: 'Save candidate', required: 'Required',
};

export function EditCandidateModal({ isOpen = true, onClose = () => { }, onSave = () => { }, candidate = null }) {
  useFonts();
  const [fullName, setFullName] = useState('');
  const [headline, setHeadline] = useState('');
  const [location, setLocation] = useState('');
  const [experienceYears, setExperienceYears] = useState(0);
  const [matchScore, setMatchScore] = useState(80);
  const [summary, setSummary] = useState('');
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [salaryExpectation, setSalaryExpectation] = useState('');
  const [availability, setAvailability] = useState('');
  const [reasons, setReasons] = useState(['']);
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (candidate) {
      setFullName(candidate.fullName || ''); setHeadline(candidate.headline || ''); setLocation(candidate.location || '');
      setExperienceYears(candidate.experienceYears || 0); setMatchScore(candidate.matchScore || 80);
      setSummary(candidate.summary || ''); setSkills(candidate.skills || []);
      setSalaryExpectation(candidate.salaryExpectation || ''); setAvailability(candidate.availability || '');
      setReasons(candidate.verifiedMatchReasons?.length ? candidate.verifiedMatchReasons : ['']);
      setEmail(candidate.email || '');
    } else {
      setFullName(''); setHeadline(''); setLocation(''); setExperienceYears(0); setMatchScore(80);
      setSummary(''); setSkills([]); setSalaryExpectation(''); setAvailability(''); setReasons(['']); setEmail('');
    }
    setErrors({});
  }, [candidate, isOpen]);

  if (!isOpen) return null;

  const tier = scoreTier(matchScore);

  function addSkillFromInput() {
    const v = skillInput.trim().replace(/,$/, '');
    if (v && !skills.includes(v)) setSkills(prev => [...prev, v]);
    setSkillInput('');
  }
  function handleSkillKeyDown(e) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addSkillFromInput(); }
    else if (e.key === 'Backspace' && !skillInput && skills.length) setSkills(prev => prev.slice(0, -1));
  }
  function removeSkill(s) { setSkills(prev => prev.filter(x => x !== s)); }

  function updateReason(i, val) { setReasons(prev => prev.map((r, idx) => idx === i ? val : r)); }
  function addReasonRow() { setReasons(prev => [...prev, '']); }
  function removeReasonRow(i) { setReasons(prev => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : ['']); }

  function validate() {
    const errs = {};
    if (!fullName.trim()) errs.fullName = true;
    if (!email.trim()) errs.email = true;
    if (!headline.trim()) errs.headline = true;
    if (skills.length === 0) errs.skills = true;
    return errs;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) { setShake(true); setTimeout(() => setShake(false), 420); return; }
    onSave({
      id: candidate ? candidate.id : `cand-${Date.now()}`,
      fullName, headline, location, experienceYears: Number(experienceYears), matchScore: Number(matchScore),
      summary, skills, salaryExpectation, availability,
      verifiedMatchReasons: reasons.map(r => r.trim()).filter(Boolean),
      email, avatarUrl: candidate?.avatarUrl || null, shortlisted: candidate?.shortlisted || false,
    });
    onClose();
  }

  return (
    <div className="ec-overlay">
      <style>{`
        @keyframes ecFadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes ecModalIn { from { opacity:0; transform: scale(0.97) translateY(6px); } to { opacity:1; transform:scale(1) translateY(0); } }
        @keyframes ecTagIn { from { opacity:0; transform: scale(0.85); } to { opacity:1; transform:scale(1); } }
        @keyframes ecShake { 10%,90% { transform: translateX(-1px); } 20%,80% { transform: translateX(2px); } 30%,50%,70% { transform: translateX(-4px); } 40%,60% { transform: translateX(4px); } }

        .ec-overlay { position:fixed; inset:0; z-index:50; overflow-y:auto; background:rgba(18,21,27,0.55); backdrop-filter:blur(3px); display:flex; align-items:center; justify-content:center; padding:20px; animation: ecFadeIn .2s ease both; font-family:'Inter', system-ui, sans-serif; }
        .ec-modal { background:#FBFAF7; border:1px solid #E4E1D9; border-radius:20px; max-width:580px; width:100%; overflow:hidden; box-shadow: 0 30px 70px -30px rgba(18,21,27,0.45); animation: ecModalIn .25s cubic-bezier(0.22,1,0.36,1) both; }

        .ec-header { padding:18px 22px; border-bottom:1px solid #E4E1D9; display:flex; align-items:center; gap:14px; background:#fff; }
        .ec-header-avatar { width:40px; height:40px; border-radius:50%; flex-shrink:0; }
        .ec-header-title { font-family:'Space Grotesk',sans-serif; font-size:13.5px; font-weight:700; color:#12151B; }
        .ec-header-sub { font-size:11px; color:#9B9C9E; margin-top:1px; }
        .ec-close { background:none; border:none; color:#9B9C9E; cursor:pointer; padding:6px; border-radius:8px; margin-left:auto; flex-shrink:0; }
        .ec-close:hover { color:#12151B; background:#F1F1EC; }

        .ec-form { padding:20px 22px 22px; max-height:75vh; overflow-y:auto; display:flex; flex-direction:column; gap:15px; }
        .ec-row2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        .ec-row3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; }

        .ec-label { display:flex; align-items:center; gap:6px; font-size:10px; font-weight:700; color:#9B9C9E; text-transform:uppercase; letter-spacing:.04em; margin-bottom:6px; }
        .ec-req { color:#E85D3D; font-size:9px; }
        .ec-input, .ec-textarea { width:100%; box-sizing:border-box; background:#fff; border:1px solid #E4E1D9; border-radius:10px; padding:9px 11px; font-size:12px; font-weight:500; color:#12151B; outline:none; font-family:inherit; transition: border-color .15s ease; }
        .ec-input.error, .ec-tags.error { border-color:#E85D3D; background:#FDEEE9; }
        .ec-input:focus, .ec-textarea:focus { border-color:#12151B; }
        .ec-textarea { resize:none; line-height:1.5; }
        .ec-error-text { font-size:10px; color:#E85D3D; margin-top:4px; }

        .ec-tags { display:flex; flex-wrap:wrap; gap:6px; padding:8px; border:1px solid #E4E1D9; border-radius:10px; background:#fff; }
        .ec-tag { display:flex; align-items:center; gap:5px; font-size:11px; font-weight:600; background:#F1F1EC; color:#3A3D44; border-radius:7px; padding:4px 8px; animation: ecTagIn .15s ease; }
        .ec-tag button { background:none; border:none; color:#9B9C9E; cursor:pointer; display:flex; padding:0; }
        .ec-tag button:hover { color:#E85D3D; }
        .ec-tag-input { flex:1; min-width:120px; border:none; outline:none; font-size:12px; font-family:inherit; padding:4px 2px; background:transparent; }

        .ec-score-row { display:flex; align-items:center; gap:16px; background:#fff; border:1px solid #E4E1D9; border-radius:12px; padding:14px 16px; }
        .ec-score-ring-wrap { position:relative; width:56px; height:56px; flex-shrink:0; }
        .ec-score-num { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-family:'JetBrains Mono',monospace; font-weight:700; font-size:13px; }
        .ec-score-slider { flex:1; }
        .ec-score-slider input[type=range] { width:100%; accent-color:#12151B; }
        .ec-score-tier { font-size:10.5px; font-weight:700; margin-top:2px; }

        .ec-reason-row { display:flex; gap:8px; align-items:center; margin-bottom:8px; }
        .ec-reason-row input { flex:1; }
        .ec-reason-remove { background:none; border:none; color:#9B9C9E; cursor:pointer; padding:6px; border-radius:7px; flex-shrink:0; }
        .ec-reason-remove:hover { color:#E85D3D; background:#FDEEE9; }
        .ec-add-reason { display:flex; align-items:center; gap:5px; font-size:11px; font-weight:600; color:#0BA5C9; background:none; border:none; cursor:pointer; padding:4px 0; }

        .ec-charcount { font-size:9.5px; color:#9B9C9E; text-align:right; margin-top:3px; }

        .ec-submit { width:100%; margin-top:2px; padding:12px 0; border:none; border-radius:12px; background:#12151B; color:#fff; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; gap:8px; cursor:pointer; transition: background .15s ease; }
        .ec-submit:hover { background:#2A2E37; }
        .ec-submit.shake { animation: ecShake .4s ease; background:#B3261E; }

        @media (max-width: 520px) { .ec-row2, .ec-row3 { grid-template-columns:1fr; } }
      `}</style>

      <div className="ec-modal">
        <div className="ec-header">
          <img className="ec-header-avatar" src={avatarUrl(fullName)} alt="" />
          <div>
            <div className="ec-header-title">{candidate ? T.editCandidate : T.createProfile}</div>
            <div className="ec-header-sub">{fullName || 'New candidate'}</div>
          </div>
          <button className="ec-close" onClick={onClose} aria-label="Close"><X size={17} /></button>
        </div>

        <form className="ec-form" onSubmit={handleSubmit}>
          <div className="ec-row2">
            <div>
              <label className="ec-label">{T.fullName}<span className="ec-req">{T.required}</span></label>
              <input className={`ec-input${errors.fullName ? ' error' : ''}`} value={fullName} onChange={e => { setFullName(e.target.value); setErrors(er => ({ ...er, fullName: false })); }} />
              {errors.fullName && <div className="ec-error-text">Full name is required.</div>}
            </div>
            <div>
              <label className="ec-label">{T.email}<span className="ec-req">{T.required}</span></label>
              <input className={`ec-input${errors.email ? ' error' : ''}`} type="email" value={email} onChange={e => { setEmail(e.target.value); setErrors(er => ({ ...er, email: false })); }} />
              {errors.email && <div className="ec-error-text">Email is required.</div>}
            </div>
          </div>

          <div>
            <label className="ec-label">{T.jobHeadline}<span className="ec-req">{T.required}</span></label>
            <input className={`ec-input${errors.headline ? ' error' : ''}`} value={headline} onChange={e => { setHeadline(e.target.value); setErrors(er => ({ ...er, headline: false })); }} placeholder={T.jobHeadlinePh} />
            {errors.headline && <div className="ec-error-text">Job headline is required.</div>}
          </div>

          <div className="ec-row3">
            <div><label className="ec-label">{T.location}</label><input className="ec-input" value={location} onChange={e => setLocation(e.target.value)} /></div>
            <div><label className="ec-label">{T.expYears}</label><input className="ec-input" type="number" value={experienceYears} onChange={e => setExperienceYears(e.target.value)} /></div>
            <div><label className="ec-label">{T.availability}</label><input className="ec-input" value={availability} onChange={e => setAvailability(e.target.value)} placeholder={T.availabilityPh} /></div>
          </div>

          <div><label className="ec-label">{T.salaryExpectation}</label><input className="ec-input" value={salaryExpectation} onChange={e => setSalaryExpectation(e.target.value)} placeholder={T.salaryPh} /></div>

          <div>
            <label className="ec-label">{T.matchScore}</label>
            <div className="ec-score-row">
              <div className="ec-score-ring-wrap">
                <ScoreRing score={matchScore} color={tier.color} />
                <span className="ec-score-num">{matchScore}</span>
              </div>
              <div className="ec-score-slider">
                <input type="range" min="0" max="100" value={matchScore} onChange={e => setMatchScore(Number(e.target.value))} />
                <div className="ec-score-tier" style={{ color: tier.color }}>{tier.label}</div>
              </div>
            </div>
          </div>

          <div>
            <label className="ec-label">{T.skills}<span className="ec-req">{T.required}</span></label>
            <div className={`ec-tags${errors.skills ? ' error' : ''}`}>
              {skills.map(s => (
                <span className="ec-tag" key={s}>{s}<button type="button" onClick={() => removeSkill(s)}><X size={11} /></button></span>
              ))}
              <input className="ec-tag-input" value={skillInput} onChange={e => { setSkillInput(e.target.value); setErrors(er => ({ ...er, skills: false })); }} onKeyDown={handleSkillKeyDown} onBlur={addSkillFromInput} placeholder={skills.length ? '' : T.skillsPh} />
            </div>
            {errors.skills && <div className="ec-error-text">Add at least one skill.</div>}
          </div>

          <div>
            <label className="ec-label">{T.summary}</label>
            <textarea className="ec-textarea" rows="3" maxLength={400} value={summary} onChange={e => setSummary(e.target.value)} />
            <div className="ec-charcount">{summary.length}/400</div>
          </div>

          <div>
            <label className="ec-label">{T.aiJustifications}</label>
            {reasons.map((r, i) => (
              <div className="ec-reason-row" key={i}>
                <input className="ec-input" value={r} onChange={e => updateReason(i, e.target.value)} placeholder={T.reasonPh} />
                <button type="button" className="ec-reason-remove" onClick={() => removeReasonRow(i)}><Trash2 size={13} /></button>
              </div>
            ))}
            <button type="button" className="ec-add-reason" onClick={addReasonRow}><Plus size={13} />{T.addReason}</button>
          </div>

          <button type="submit" className={`ec-submit${shake ? ' shake' : ''}`}>
            <Save size={15} /><span>{T.saveCandidate}</span>
          </button>
        </form>
      </div>
    </div>
  );
}

export default EditCandidateModal;