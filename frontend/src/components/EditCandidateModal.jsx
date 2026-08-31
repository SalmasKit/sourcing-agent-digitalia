import React, { useState, useEffect, useRef } from 'react';
import { X, Save, PlusCircle } from 'lucide-react';

const T = {
  editCandidate: 'Edit candidate',
  createProfile: 'Create candidate profile',
  fullName: 'Full name',
  email: 'Email',
  jobHeadline: 'Job headline',
  jobHeadlinePh: 'e.g. Senior software architect',
  location: 'Location',
  expYears: 'Exp. years',
  matchScorePct: 'Match score %',
  salaryExpectation: 'Salary expectation',
  salaryPh: 'e.g. 28,000 MAD/month',
  availability: 'Availability',
  availabilityPh: 'e.g. Immediate / 1 month',
  skills: 'Technical skills (comma-separated)',
  skillsPh: 'React, TypeScript, Docker, AWS',
  summary: 'Professional summary',
  aiJustifications: 'AI match justifications (one per line)',
  saveCandidate: 'Save candidate',
};

export function EditCandidateModal({
  isOpen = true,
  onClose = () => { },
  onSave = () => { },
  candidate = null,
}) {
  const [fullName, setFullName] = useState('');
  const [headline, setHeadline] = useState('');
  const [location, setLocation] = useState('');
  const [experienceYears, setExperienceYears] = useState(0);
  const [matchScore, setMatchScore] = useState(80);
  const [summary, setSummary] = useState('');
  const [skills, setSkills] = useState('');
  const [salaryExpectation, setSalaryExpectation] = useState('');
  const [availability, setAvailability] = useState('');
  const [verifiedMatchReasons, setVerifiedMatchReasons] = useState('');
  const [email, setEmail] = useState('');
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

  useEffect(() => {
    if (candidate) {
      setFullName(candidate.fullName || '');
      setHeadline(candidate.headline || '');
      setLocation(candidate.location || '');
      setExperienceYears(candidate.experienceYears || 0);
      setMatchScore(candidate.matchScore || 80);
      setSummary(candidate.summary || '');
      setSkills(candidate.skills ? candidate.skills.join(', ') : '');
      setSalaryExpectation(candidate.salaryExpectation || '');
      setAvailability(candidate.availability || '');
      setVerifiedMatchReasons(candidate.verifiedMatchReasons ? candidate.verifiedMatchReasons.join('\n') : '');
      setEmail(candidate.email || '');
    } else {
      setFullName('');
      setHeadline('');
      setLocation('');
      setExperienceYears(0);
      setMatchScore(80);
      setSummary('');
      setSkills('');
      setSalaryExpectation('');
      setAvailability('');
      setVerifiedMatchReasons('');
      setEmail('');
    }
  }, [candidate, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const updatedCandidate = {
      id: candidate ? candidate.id : `cand-${Date.now()}`,
      fullName,
      headline,
      location,
      experienceYears: Number(experienceYears),
      matchScore: Number(matchScore),
      summary,
      skills: skills.split(',').map((s) => s.trim()).filter(Boolean),
      salaryExpectation,
      availability,
      verifiedMatchReasons: verifiedMatchReasons.split('\n').map((r) => r.trim()).filter(Boolean),
      email,
      avatarUrl: candidate?.avatarUrl || null,
      shortlisted: candidate?.shortlisted || false,
    };
    onSave(updatedCandidate);
    onClose();
  };

  return (
    <div className="dg-root dge-overlay">
      <style>{`
        .dg-root {
          --dg-paper: #F6F7F9; --dg-surface: #FFFFFF; --dg-sunken: #EFF1F4;
          --dg-border: #E3E6EB; --dg-border-strong: #CBD2DC;
          --dg-ink-900: #10151F; --dg-ink-700: #38414F; --dg-ink-500: #6B7280; --dg-ink-400: #96A0AC;
          --dg-teal-700: #0A5C68; --dg-teal-600: #0E7C8C; --dg-teal-500: #128FA0;
          --font-display: 'Space Grotesk', 'Inter', sans-serif;
          --font-body: 'Inter', system-ui, sans-serif;
          --font-mono: 'JetBrains Mono', ui-monospace, monospace;
          font-family: var(--font-body); color: var(--dg-ink-900);
        }
        .dg-display { font-family: var(--font-display); letter-spacing: -0.01em; }

        .dge-overlay {
          position: fixed; inset: 0; z-index: 50; overflow-y: auto;
          background: rgba(16,21,31,0.55); backdrop-filter: blur(3px);
          display: flex; align-items: center; justify-content: center; padding: 20px;
        }
        .dge-modal {
          background: var(--dg-surface); border: 1px solid var(--dg-border); border-radius: 20px;
          max-width: 560px; width: 100%; overflow: hidden;
          box-shadow: 0 30px 70px -30px rgba(16,21,31,0.4);
        }

        .dge-header { padding: 18px 22px; border-bottom: 1px solid var(--dg-border); display: flex; align-items: center; justify-content: space-between; }
        .dge-header-title { font-size: 13.5px; font-weight: 700; display: flex; align-items: center; gap: 9px; }
        .dge-close { background: none; border: none; color: var(--dg-ink-400); cursor: pointer; padding: 6px; border-radius: 8px; }
        .dge-close:hover { color: var(--dg-ink-700); background: var(--dg-sunken); }

        .dge-form { padding: 22px; max-height: 75vh; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }
        .dge-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .dge-row3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }

        .dge-label { display: block; font-size: 10px; font-weight: 700; color: var(--dg-ink-500); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
        .dge-input, .dge-textarea {
          width: 100%; box-sizing: border-box; background: var(--dg-paper); border: 1px solid var(--dg-border);
          border-radius: 10px; padding: 10px 12px; font-size: 12.5px; font-weight: 500; color: var(--dg-ink-900);
          outline: none; font-family: var(--font-body); transition: border-color .15s ease, background .15s ease;
        }
        .dge-input:focus, .dge-textarea:focus { border-color: var(--dg-teal-500); background: var(--dg-surface); }
        .dge-textarea { resize: none; line-height: 1.5; }

        .dge-submit {
          width: 100%; margin-top: 4px; padding: 13px 0; border: none; border-radius: 12px;
          background: var(--dg-ink-900); color: #fff; font-size: 13px; font-weight: 700;
          display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer;
          transition: background .15s ease;
        }
        .dge-submit:hover { background: #232C3A; }

        @media (max-width: 520px) {
          .dge-row2, .dge-row3 { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="dge-modal">
        <div className="dge-header">
          <span className="dge-header-title dg-display">
            <PlusCircle size={16} color="var(--dg-teal-600)" />
            {candidate ? T.editCandidate : T.createProfile}
          </span>
          <button className="dge-close" onClick={onClose} aria-label="Close">
            <X size={17} />
          </button>
        </div>

        <form className="dge-form" onSubmit={handleSubmit}>
          <div className="dge-row2">
            <div>
              <label className="dge-label">{T.fullName}</label>
              <input className="dge-input" type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div>
              <label className="dge-label">{T.email}</label>
              <input className="dge-input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="dge-label">{T.jobHeadline}</label>
            <input className="dge-input" type="text" required value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder={T.jobHeadlinePh} />
          </div>

          <div>
            <label className="dge-label">{T.location}</label>
            <input className="dge-input" type="text" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>

          <div className="dge-row3">
            <div>
              <label className="dge-label">{T.expYears}</label>
              <input className="dge-input" type="number" value={experienceYears} onChange={(e) => setExperienceYears(e.target.value)} />
            </div>
            <div>
              <label className="dge-label">{T.matchScorePct}</label>
              <input className="dge-input" type="number" min="0" max="100" value={matchScore} onChange={(e) => setMatchScore(e.target.value)} />
            </div>
            <div>
              <label className="dge-label">{T.salaryExpectation}</label>
              <input className="dge-input" type="text" value={salaryExpectation} onChange={(e) => setSalaryExpectation(e.target.value)} placeholder={T.salaryPh} />
            </div>
          </div>

          <div>
            <label className="dge-label">{T.availability}</label>
            <input className="dge-input" type="text" value={availability} onChange={(e) => setAvailability(e.target.value)} placeholder={T.availabilityPh} />
          </div>

          <div>
            <label className="dge-label">{T.skills}</label>
            <input className="dge-input" type="text" required value={skills} onChange={(e) => setSkills(e.target.value)} placeholder={T.skillsPh} />
          </div>

          <div>
            <label className="dge-label">{T.summary}</label>
            <textarea className="dge-textarea" rows="3" value={summary} onChange={(e) => setSummary(e.target.value)} />
          </div>

          <div>
            <label className="dge-label">{T.aiJustifications}</label>
            <textarea className="dge-textarea" rows="3" value={verifiedMatchReasons} onChange={(e) => setVerifiedMatchReasons(e.target.value)} />
          </div>

          <button type="submit" className="dge-submit">
            <Save size={15} />
            <span>{T.saveCandidate}</span>
          </button>
        </form>
      </div>
    </div>
  );
}

export default EditCandidateModal;