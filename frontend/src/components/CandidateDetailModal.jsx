import React, { useState, useEffect, useRef } from 'react';
import {
  X, MapPin, Briefcase, Mail, Globe, ExternalLink,
  CheckCircle2, Bookmark, BookmarkCheck, Sparkles, Send, DollarSign, Calendar, Edit, Trash2,
  AlertCircle
} from 'lucide-react';


import { useLanguage } from '../context/LanguageContext';
import { draftOutreachApi } from '../services/api';
import { getAvatarUrl as getAvatarUrlUtil } from '../utils/avatar';
import { formatNoteTimestamp } from './RecruiterNotesView';

function getAvatarUrl(name, avatarUrl) {
  return getAvatarUrlUtil(name, avatarUrl);
}

function scoreTone(score) {
  if (score >= 90) return 'green';
  if (score >= 80) return 'teal';
  return 'bronze';
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatExperiencePeriod(expItem) {
  if (!expItem) return 'Present';

  let period = expItem.period || expItem.duration || '';

  // Clean python dict artifact if any e.g. "{'year': 2021..."
  if (typeof period === 'string' && period.includes("{'year'")) {
    const years = period.match(/\b(19\d\d|20\d\d)\b/g);
    if (years && years.length >= 2) return `${years[0]} - ${years[1]}`;
    if (years && years.length === 1) return `${years[0]} - Present`;
  }

  // Format ISO range e.g. "2021-03 - 2023-08" -> "Mar 2021 - Aug 2023"
  if (typeof period === 'string' && period.trim()) {
    let p = period.trim();
    p = p.replace(/^(\d{4})-(\d{1,2})\s*[-–—]\s*(\d{4})-(\d{1,2})$/, (_, y1, m1, y2, m2) => {
      const sm = MONTH_NAMES[parseInt(m1, 10) - 1] || m1;
      const em = MONTH_NAMES[parseInt(m2, 10) - 1] || m2;
      return `${sm} ${y1} - ${em} ${y2}`;
    });
    p = p.replace(/^(\d{4})-(\d{1,2})\s*[-–—]\s*(Present|Current|Actuel|Aujourd'hui)$/i, (_, y1, m1) => {
      const sm = MONTH_NAMES[parseInt(m1, 10) - 1] || m1;
      return `${sm} ${y1} - Present`;
    });
    if (!p.toLowerCase().includes('null') && !p.toLowerCase().includes('none')) {
      return p;
    }
  }

  const formatSingleDate = (raw) => {
    if (!raw) return '';
    if (typeof raw === 'object') {
      const y = raw.year || raw.start_year || raw.end_year;
      const m = raw.month || raw.start_month || raw.end_month;
      if (y && m) {
        const mIdx = typeof m === 'number' ? m - 1 : parseInt(m, 10) - 1;
        return `${MONTH_NAMES[mIdx] || m} ${y}`;
      }
      return y ? String(y) : '';
    }
    const s = String(raw).trim();
    const isoMatch = s.match(/^(\d{4})-(\d{1,2})/);
    if (isoMatch) {
      const mIdx = parseInt(isoMatch[2], 10) - 1;
      return `${MONTH_NAMES[mIdx] || isoMatch[2]} ${isoMatch[1]}`;
    }
    return s.length >= 4 ? s : '';
  };

  const startStr = formatSingleDate(expItem.start || expItem.startDate || expItem.starts_at || expItem.start_date);
  const endStr = formatSingleDate(expItem.end || expItem.endDate || expItem.ends_at || expItem.end_date);

  if (startStr && endStr) return `${startStr} - ${endStr}`;
  if (startStr) return `${startStr} - Present`;
  if (endStr) return `Until ${endStr}`;

  return period || 'Present';
}



const T = {
  matchScore: 'match',
  yearsExp: 'yrs exp.',
  expectation: 'Expectation:',
  availability: 'Availability:',
  editCandidate: 'Edit',
  deleteCandidate: 'Remove',
  inShortlist: 'Shortlisted',
  addToShortlist: 'Add to shortlist',
  professionalOverview: 'Professional overview',
  aiEvaluation: 'AI match evaluation',
  verifiedSkills: 'Verified skills',
  contacts: 'Contacts',
  recruiterNotes: 'Recruiter notes',
  addNotePlaceholder: 'Add a note about this candidate',
  saveNote: 'Save',
  closeProfile: 'Close',
};

export function CandidateDetailModal({
  candidate = null,
  onClose = () => { },
  onToggleShortlist = () => { },
  isShortlisted = false,
  onEdit = () => { },
  onDelete = () => { },
  onAddNote = () => { },
}) {
  const { lang } = useLanguage();
  const isFR = lang === 'FR';
  const labels = isFR ? {
    matchScore: 'correspondance',
    yearsExp: "ans d'exp.",
    expectation: 'Prétention :',
    availability: 'Disponibilité :',
    editCandidate: 'Modifier',
    deleteCandidate: 'Supprimer',
    inShortlist: 'Présélectionné',
    addToShortlist: 'Ajouter à la présélection',
    professionalOverview: 'Profil professionnel',
    aiEvaluation: 'Évaluation IA de correspondance',
    verifiedSkills: 'Compétences vérifiées',
    contacts: 'Coordonnées',
    recruiterNotes: 'Notes du recruteur',
    addNotePlaceholder: 'Ajouter une note sur ce candidat...',
    saveNote: 'Enregistrer',
    closeProfile: 'Fermer',
  } : T;

  const [note, setNote] = useState('');
  const [outreachOpen, setOutreachOpen] = useState(false);
  const [outreachChannel, setOutreachChannel] = useState('linkedin');
  const [outreachDraft, setOutreachDraft] = useState('');
  const [outreachSubject, setOutreachSubject] = useState('');
  const [isDrafting, setIsDrafting] = useState(false);
  const [copied, setCopied] = useState(false);
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

  const hasEmail = Boolean(candidate.email && candidate.email.trim() && !candidate.email.toLowerCase().endsWith('@talent-candidate.ma'));
  const isEmailVerified = Boolean(candidate.email_is_verified || (hasEmail && !candidate.email.toLowerCase().endsWith('@talent-candidate.ma')));

  const handleDraftOutreach = async (channel) => {
    setOutreachChannel(channel);
    setIsDrafting(true);
    setOutreachOpen(true);
    setCopied(false);
    try {
      const result = await draftOutreachApi(candidate, { job_title: candidate.headline }, channel);
      setOutreachDraft(result.draft || '');
      setOutreachSubject(result.subject || '');
    } catch (err) {
      setOutreachDraft('Could not generate a draft right now. Please try again.');
    } finally {
      setIsDrafting(false);
    }
  };

  const handleAddNote = (e) => {
    e.preventDefault();
    if (!note.trim()) return;
    onAddNote(candidate.id, note);
    setNote('');
  };

  const handleEditClick = () => { onEdit(candidate); onClose(); };
  const handleDeleteClick = () => { onDelete(candidate.id); onClose(); };

  const tone = scoreTone(candidate.matchScore);

  return (
    <div className="dg-root dgm-overlay">
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

        .dgm-overlay {
          position: fixed; inset: 0; z-index: 1000; overflow-y: auto;
          background: rgba(16,21,31,0.55); backdrop-filter: blur(3px);
          display: flex; align-items: center; justify-content: center; padding: 20px;
        }
        .dgm-modal {
          background: var(--dg-surface); border: 1px solid var(--dg-border); border-radius: 20px;
          max-width: 720px; width: 100%; max-height: 90vh; overflow: hidden;
          display: flex; flex-direction: column;
          box-shadow: 0 30px 70px -30px rgba(16,21,31,0.4);
        }

        .dgm-header { background: var(--dg-ink-900); color: #fff; padding: 24px; position: relative; display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
        .dgm-header-person { display: flex; align-items: center; gap: 16px; min-width: 0; }
        .dgm-avatar { width: 62px; height: 62px; border-radius: 14px; object-fit: cover; border: 1px solid rgba(255,255,255,0.18); flex-shrink: 0; }
        .dgm-name-row { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
        .dgm-name { font-size: 18px; font-weight: 700; margin: 0; }
        .dgm-match-pill {
          font-family: var(--font-mono); font-size: 11px; font-weight: 700; padding: 3px 10px;
          border-radius: 999px; border: 1px solid;
        }
        .dgm-match-green { color: #B7EBD0; background: rgba(39,143,94,0.25); border-color: rgba(39,143,94,0.5); }
        .dgm-match-teal { color: #9FE0E8; background: rgba(14,124,140,0.28); border-color: rgba(14,124,140,0.5); }
        .dgm-match-bronze { color: #F0C88A; background: rgba(180,101,15,0.25); border-color: rgba(180,101,15,0.5); }
        .dgm-headline { font-size: 12.5px; color: rgba(255,255,255,0.75); font-weight: 500; margin-top: 4px; line-height: 1.45; word-break: break-word; }
        .dgm-meta { display: flex; align-items: center; gap: 14px; font-size: 11.5px; color: rgba(255,255,255,0.55); margin-top: 8px; }
        .dgm-meta-item { display: flex; align-items: center; gap: 5px; }
        .dgm-close { background: none; border: none; color: rgba(255,255,255,0.55); cursor: pointer; padding: 6px; border-radius: 8px; flex-shrink: 0; }
        .dgm-close:hover { color: #fff; background: rgba(255,255,255,0.1); }

        .dgm-body { padding: 22px 24px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 20px; }

        .dgm-toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 16px; background: var(--dg-paper); border: 1px solid var(--dg-border); border-radius: 14px; }
        .dgm-toolbar-facts { display: flex; align-items: center; gap: 18px; font-size: 11.5px; color: var(--dg-ink-700); font-weight: 500; flex-wrap: wrap; }
        .dgm-toolbar-fact { display: flex; align-items: center; gap: 6px; }
        .dgm-toolbar-fact strong { font-weight: 700; color: var(--dg-ink-900); }
        .dgm-toolbar-actions { display: flex; align-items: center; gap: 8px; }

        .dgm-btn {
          display: flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 600;
          padding: 8px 12px; border-radius: 10px; border: 1px solid var(--dg-border);
          background: var(--dg-surface); color: var(--dg-ink-700); cursor: pointer;
          transition: background .15s ease, border-color .15s ease, color .15s ease;
        }
        .dgm-btn:hover { background: var(--dg-sunken); border-color: var(--dg-border-strong); }
        .dgm-btn-danger:hover { color: var(--dg-danger); background: var(--dg-danger-bg); border-color: rgba(179,38,30,0.25); }
        .dgm-btn-shortlist { background: var(--dg-ink-900); color: #fff; border-color: var(--dg-ink-900); }
        .dgm-btn-shortlist:hover { background: #232C3A; border-color: #232C3A; }
        .dgm-btn-shortlisted { background: var(--dg-green-100); color: var(--dg-green-700); border-color: rgba(31,110,74,0.25); }
        .dgm-btn-shortlisted:hover { background: var(--dg-green-100); border-color: rgba(31,110,74,0.25); }

        .dgm-section-label { font-size: 10.5px; font-weight: 700; color: var(--dg-ink-400); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 8px; }
        .dgm-box { background: var(--dg-surface); border: 1px solid var(--dg-border); border-radius: 14px; padding: 14px 16px; font-size: 12.5px; color: var(--dg-ink-700); line-height: 1.6; }

        .dgm-ai-box { background: var(--dg-teal-100); border: 1px solid rgba(14,124,140,0.2); border-radius: 14px; padding: 16px; }
        .dgm-ai-title { font-size: 13px; font-weight: 700; color: var(--dg-teal-700); display: flex; align-items: center; gap: 7px; margin-bottom: 10px; }
        .dgm-ai-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
        .dgm-ai-item { display: flex; align-items: flex-start; gap: 8px; font-size: 12px; color: var(--dg-ink-900); line-height: 1.55; }

        .dgm-skills { display: flex; flex-wrap: wrap; gap: 7px; }
        .dgm-skill { font-family: var(--font-mono); font-size: 11px; font-weight: 500; background: var(--dg-sunken); color: var(--dg-ink-700); border: 1px solid var(--dg-border); padding: 5px 10px; border-radius: 9px; }

        .dgm-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .dgm-info-card { background: var(--dg-paper); border: 1px solid var(--dg-border); border-radius: 14px; padding: 14px 16px; }
        .dgm-info-label { font-size: 10.5px; font-weight: 700; color: var(--dg-ink-400); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
        .dgm-info-value { font-size: 12.5px; font-weight: 600; color: var(--dg-ink-900); }
        .dgm-contact-row { display: flex; align-items: center; gap: 7px; font-size: 11.5px; font-weight: 500; color: var(--dg-ink-700); }
        .dgm-contact-row + .dgm-contact-row { margin-top: 6px; }
        .dgm-contact-link { color: var(--dg-teal-700); text-decoration: none; }
        .dgm-contact-link:hover { text-decoration: underline; }

        .dgm-notes-title { font-size: 13px; font-weight: 700; margin-bottom: 10px; }
        .dgm-note { background: var(--dg-bronze-100); border: 1px solid rgba(180,101,15,0.2); border-radius: 10px; padding: 10px 12px; font-size: 11.5px; color: var(--dg-ink-900); margin-bottom: 8px; }
        .dgm-note-time { font-size: 10px; color: var(--dg-ink-400); margin-top: 4px; }
        .dgm-note-form { display: flex; gap: 8px; }
        .dgm-note-input {
          flex: 1; background: var(--dg-paper); border: 1px solid var(--dg-border); border-radius: 10px;
          font-size: 12px; padding: 10px 12px; color: var(--dg-ink-900); outline: none;
          transition: border-color .15s ease, background .15s ease;
        }
        .dgm-note-input:focus { border-color: var(--dg-teal-500, var(--dg-teal-600)); background: var(--dg-surface); }
        .dgm-note-submit {
          display: flex; align-items: center; gap: 6px; background: var(--dg-ink-900); color: #fff;
          border: none; border-radius: 10px; padding: 0 16px; font-size: 12px; font-weight: 600; cursor: pointer;
        }
        .dgm-note-submit:hover { background: #232C3A; }

        .dgm-footer { padding: 14px 24px; border-top: 1px solid var(--dg-border); background: var(--dg-paper); display: flex; justify-content: flex-end; }
        .dgm-footer-btn { padding: 9px 18px; border-radius: 12px; border: 1px solid var(--dg-border-strong); background: var(--dg-surface); color: var(--dg-ink-700); font-size: 12.5px; font-weight: 600; cursor: pointer; }
        .dgm-footer-btn:hover { background: var(--dg-sunken); }

        @media (max-width: 640px) {
          .dgm-grid2 { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="dgm-modal">
        <div className="dgm-header">
          <div className="dgm-header-person">
            <img
              className="dgm-avatar"
              src={getAvatarUrl(candidate.fullName, candidate.avatarUrl)}
              alt={candidate.fullName}
              onError={(e) => { e.target.onerror = null; e.target.src = getAvatarUrl(candidate.fullName, null); }}
            />
            <div style={{ minWidth: 0 }}>
              <div className="dgm-name-row">
                <h2 className="dgm-name dg-display">{candidate.fullName}</h2>
                <span className={`dgm-match-pill dgm-match-${tone}`}>{candidate.matchScore}% {labels.matchScore}</span>
              </div>
              <div className="dgm-headline">{candidate.headline}</div>
              <div className="dgm-meta">
                <span className="dgm-meta-item"><MapPin size={13} />{candidate.location}</span>
                <span className="dgm-meta-item"><Briefcase size={13} />{candidate.experienceYears} {labels.yearsExp}</span>
              </div>
            </div>
          </div>
          <button className="dgm-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="dgm-body">
          <div className="dgm-toolbar">
            <div className="dgm-toolbar-facts">
              <span className="dgm-toolbar-fact"><DollarSign size={14} color="var(--dg-green-600)" /><strong>{labels.expectation}</strong> {candidate.salaryExpectation || (isFR ? 'Négociable' : 'Negotiable')}</span>
              <span className="dgm-toolbar-fact"><Calendar size={14} color="var(--dg-teal-600)" /><strong>{labels.availability}</strong> {candidate.availability || (isFR ? 'Immédiate' : 'Immediate')}</span>
            </div>
            <div className="dgm-toolbar-actions">
              {candidate.linkedin && (
                <a
                  className="dgm-btn dgm-btn-linkedin"
                  href={candidate.linkedin.startsWith('http') ? candidate.linkedin : `https://${candidate.linkedin}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: 'none' }}
                >
                  <ExternalLink size={13} color="var(--dg-teal-700)" />
                  <span style={{ color: 'var(--dg-teal-700)', fontWeight: 700 }}>LinkedIn</span>
                </a>
              )}
              <button
                type="button"
                className="dgm-btn"
                onClick={() => handleDraftOutreach('linkedin')}
                title="Draft LinkedIn message"
              >
                <Send size={13} color="var(--dg-teal-600)" />
                <span>Draft LinkedIn</span>
              </button>
              <button
                type="button"
                className="dgm-btn"
                onClick={() => handleDraftOutreach('email')}
                title="Draft email"
              >
                <Mail size={13} color="var(--dg-teal-600)" />
                <span>Draft Email</span>
              </button>
              <button className="dgm-btn" onClick={handleEditClick} title={labels.editCandidate}>
                <Edit size={13} color="var(--dg-teal-600)" /><span>{labels.editCandidate}</span>
              </button>
              <button className="dgm-btn dgm-btn-danger" onClick={handleDeleteClick} title={labels.deleteCandidate}>
                <Trash2 size={13} /><span>{labels.deleteCandidate}</span>
              </button>
              <button
                className={'dgm-btn ' + (isShortlisted ? 'dgm-btn-shortlisted' : 'dgm-btn-shortlist')}
                onClick={() => onToggleShortlist(candidate)}
              >
                {isShortlisted ? (<><BookmarkCheck size={14} /><span>{labels.inShortlist}</span></>) : (<><Bookmark size={14} /><span>{labels.addToShortlist}</span></>)}
              </button>
            </div>
          </div>

          {/* Outreach Message Drafting Panel */}
          {outreachOpen && (
            <div style={{ background: 'var(--dg-paper)', border: '1px solid var(--dg-border)', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="dgm-section-label" style={{ margin: 0 }}>
                  {outreachChannel === 'email' ? 'Email draft' : 'LinkedIn message draft'}
                </div>
                <button
                  type="button"
                  onClick={() => setOutreachOpen(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dg-ink-400)', padding: 2 }}
                >
                  <X size={14} />
                </button>
              </div>

              {isDrafting ? (
                <div className="dgm-box" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--dg-ink-500)', fontSize: 12.5 }}>
                  <div style={{ width: 14, height: 14, border: '2px solid var(--dg-teal-600)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  <span>Drafting candidate outreach message with Groq AI...</span>
                </div>
              ) : (
                <>
                  {outreachChannel === 'email' && !hasEmail && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#b91c1c', fontSize: '12px' }}>
                      <AlertCircle size={14} style={{ flexShrink: 0 }} />
                      <span>No email address on file for this candidate. You can copy the generated draft or reach out on LinkedIn.</span>
                    </div>
                  )}
                  {outreachChannel === 'email' && hasEmail && !isEmailVerified && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', color: '#b45309', fontSize: '12px' }}>
                      <AlertCircle size={14} style={{ flexShrink: 0 }} />
                      <span>
                        <strong>Notice:</strong> <code>{candidate.email}</code> is an unverified placeholder email. Please confirm their direct address before sending.
                      </span>
                    </div>
                  )}
                  {outreachChannel === 'email' && (
                    <input
                      className="dgm-note-input"
                      style={{ width: '100%', boxSizing: 'border-box', marginBottom: 2, fontWeight: 600 }}
                      value={outreachSubject}
                      onChange={(e) => setOutreachSubject(e.target.value)}
                      placeholder="Subject"
                    />
                  )}
                  <textarea
                    className="dgm-note-input"
                    style={{ width: '100%', boxSizing: 'border-box', minHeight: 120, resize: 'vertical', fontFamily: 'inherit' }}
                    value={outreachDraft}
                    onChange={(e) => setOutreachDraft(e.target.value)}
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="dgm-btn"
                      onClick={() => {
                        navigator.clipboard.writeText(outreachDraft);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                    >
                      <CheckCircle2 size={13} color="var(--dg-teal-600)" />
                      <span>{copied ? 'Copied!' : 'Copy to clipboard'}</span>
                    </button>
                    {outreachChannel === 'email' && (
                      hasEmail ? (
                        <a
                          className="dgm-btn"
                          href={`mailto:${candidate.email}?subject=${encodeURIComponent(outreachSubject)}&body=${encodeURIComponent(outreachDraft)}`}
                          style={{ textDecoration: 'none' }}
                          title={isEmailVerified ? 'Open default email client' : 'Open email client (Warning: recipient address is an unverified placeholder)'}
                        >
                          <Mail size={13} color="var(--dg-teal-600)" />
                          <span>Open in email client</span>
                          {!isEmailVerified && (
                            <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.15)', color: '#b45309', marginLeft: 4, fontWeight: 500 }}>
                              Placeholder
                            </span>
                          )}
                        </a>
                      ) : (
                        <button
                          type="button"
                          className="dgm-btn"
                          disabled
                          style={{ opacity: 0.55, cursor: 'not-allowed' }}
                          title="No recipient email address available"
                        >
                          <Mail size={13} color="var(--dg-ink-400)" />
                          <span>No email client target</span>
                        </button>
                      )
                    )}
                    {outreachChannel === 'linkedin' && candidate.linkedin && (
                      <a
                        className="dgm-btn"
                        href={candidate.linkedin.startsWith('http') ? candidate.linkedin : `https://${candidate.linkedin}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ textDecoration: 'none' }}
                      >
                        <ExternalLink size={13} color="var(--dg-teal-600)" />
                        <span>Open LinkedIn profile to send</span>
                      </a>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          <div>
            <div className="dgm-section-label">{labels.professionalOverview}</div>
            <div className="dgm-box">{candidate.summary}</div>
          </div>

          <div className="dgm-ai-box">
            <div className="dgm-ai-title"><Sparkles size={15} />{labels.aiEvaluation}</div>
            <ul className="dgm-ai-list">
              {candidate.verifiedMatchReasons?.map((reason, idx) => (
                <li className="dgm-ai-item" key={idx}>
                  <CheckCircle2 size={15} color="var(--dg-teal-600)" style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="dgm-section-label">{labels.verifiedSkills}</div>
            <div className="dgm-skills">
              {(Array.isArray(candidate.skills) ? candidate.skills : (typeof candidate.skills === 'string' ? candidate.skills.split(',').map(s => s.trim()).filter(Boolean) : [])).map((skill, idx) => (
                <span className="dgm-skill" key={idx}>{skill}</span>
              ))}
            </div>
          </div>

          {/* Professional Experience List */}
          <div>
            <div className="dgm-section-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Briefcase size={13} color="var(--dg-teal-600)" />
              <span>Professional Experience {candidate.experiences?.length ? `(${candidate.experiences.length})` : ''}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {candidate.experiences && candidate.experiences.length > 0 ? (
                candidate.experiences.map((expItem, idx) => {
                  const roleName = expItem.role || expItem.title || expItem.position || 'Professional';
                  const companyName = expItem.company || expItem.company_name || expItem.organization || 'Organization';
                  const periodText = formatExperiencePeriod(expItem);
                  const descText = expItem.description || expItem.summary || '';
                  return (
                    <div className="dgm-info-card" key={idx}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--dg-ink-900)' }}>{roleName}</div>
                          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--dg-teal-700)' }}>{companyName}</div>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--dg-ink-600)', background: 'var(--dg-sunken)', padding: '3px 8px', borderRadius: 6 }}>
                          {periodText}
                        </span>
                      </div>
                      {descText && (
                        <div style={{ fontSize: 11.5, color: 'var(--dg-ink-700)', lineHeight: 1.55 }}>{descText}</div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="dgm-box" style={{ color: 'var(--dg-ink-400)', fontStyle: 'italic', fontSize: 12 }}>
                  Experience details available on LinkedIn profile.
                  {candidate.linkedin && (
                    <a
                      href={candidate.linkedin.startsWith('http') ? candidate.linkedin : `https://${candidate.linkedin}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{ color: 'var(--dg-teal-700)', marginLeft: 6, textDecoration: 'underline' }}
                    >View Profile</a>
                  )}
                </div>
              )}
            </div>
          </div>



          <div className="dgm-info-card">
            <div className="dgm-info-label">{labels.contacts}</div>
            <div className="dgm-contact-row">
              <Mail size={13} color="var(--dg-teal-600)" />
              {hasEmail ? (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <a className="dgm-contact-link" href={`mailto:${candidate.email}`}>{candidate.email}</a>
                  {isEmailVerified ? (
                    <span style={{ fontSize: '10.5px', padding: '1px 6px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.1)', color: '#059669', fontWeight: 500 }}>
                      Verified
                    </span>
                  ) : (
                    <span style={{ fontSize: '10.5px', padding: '1px 6px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.12)', color: '#b45309', fontWeight: 500 }} title="Synthetic placeholder email generated from candidate name">
                      Placeholder
                    </span>
                  )}
                </div>
              ) : (
                <span style={{ color: 'var(--dg-ink-400)', fontSize: 12.5, fontStyle: 'italic' }}>
                  No email available
                </span>
              )}
            </div>
            {candidate.linkedin && (
              <div className="dgm-contact-row">
                <Globe size={13} color="var(--dg-teal-600)" />
                <a
                  className="dgm-contact-link"
                  href={candidate.linkedin.startsWith('http') ? candidate.linkedin : `https://${candidate.linkedin}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {candidate.linkedin}
                </a>
              </div>
            )}
            {candidate.github && (
              <div className="dgm-contact-row">
                <ExternalLink size={13} color="var(--dg-ink-500)" />
                <a
                  className="dgm-contact-link"
                  href={candidate.github.startsWith('http') ? candidate.github : `https://${candidate.github}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {candidate.github}
                </a>
              </div>
            )}
          </div>

          <div>
            <div className="dgm-notes-title dg-display">{labels.recruiterNotes}</div>
            {candidate.notes && candidate.notes.length > 0 && (
              <div>
                {candidate.notes.map((n) => (
                  <div className="dgm-note" key={n.id}>
                    <div>{n.text}</div>
                    <div className="dgm-note-time">{formatNoteTimestamp(n, isFR)}</div>
                  </div>
                ))}
              </div>
            )}
            <form className="dgm-note-form" onSubmit={handleAddNote}>
              <input
                className="dgm-note-input"
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={labels.addNotePlaceholder}
              />
              <button className="dgm-note-submit" type="submit">
                <Send size={13} /><span>{labels.saveNote}</span>
              </button>
            </form>
          </div>
        </div>

        <div className="dgm-footer">
          <button className="dgm-footer-btn" onClick={onClose}>{labels.closeProfile}</button>
        </div>
      </div>
    </div>
  );
}

export default CandidateDetailModal;