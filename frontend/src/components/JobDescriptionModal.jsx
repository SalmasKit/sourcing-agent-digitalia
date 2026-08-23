import React, { useState, useEffect, useRef } from 'react';
import { X, FileText, Plus, Sparkles, CheckCircle2, RefreshCw, Wand2 } from 'lucide-react';

const COPY = {
  EN: {
    editTitle: 'Edit job description',
    newTitle: 'New job description',
    professionTitle: 'Job title',
    titlePh: 'e.g. Senior Backend Engineer',
    seniority: 'Seniority level',
    seniorityOpts: ['Junior (0\u20132 yrs)', 'Mid-level (2\u20135 yrs)', 'Senior (5\u20138 yrs)', 'Lead / Architect (8+ yrs)'],
    contractType: 'Contract type',
    contractOpts: ['Permanent (CDI)', 'Fixed-term (CDD)', 'Freelance / Contract', 'Remote full-time'],
    location: 'Target location',
    locationPh: 'e.g. Casablanca, Rabat, remote, all locations',
    skills: 'Required tech (comma-separated)',
    skillsPh: 'e.g. React, Node.js, AWS',
    helpDraft: 'Need help drafting the prompt?',
    generate: 'Generate prompt with AI',
    generating: 'Generating\u2026',
    reviewTitle: 'AI agent generated prompt',
    reviewTag: 'Review required',
    cancel: 'Cancel',
    approve: 'Approve and apply',
    descLabel: 'Job description / sourcing prompt',
    descPh: 'Detailed responsibilities, expected tech stack, and ideal candidate profile\u2026',
    saveChanges: 'Save changes',
    createAndSource: 'Create and start sourcing',
  },
  FR: {
    editTitle: 'Modifier la fiche de poste',
    newTitle: 'Nouvelle fiche de poste',
    professionTitle: 'Intitul\u00e9 du poste',
    titlePh: 'ex. Ing\u00e9nieur Backend Senior',
    seniority: 'Niveau de s\u00e9niorit\u00e9',
    seniorityOpts: ['Junior (0\u20132 ans)', 'Interm\u00e9diaire (2\u20135 ans)', 'Senior (5\u20138 ans)', 'Lead / Architecte (8+ ans)'],
    contractType: 'Type de contrat',
    contractOpts: ['CDI', 'CDD', 'Freelance / Prestation', 'T\u00e9l\u00e9travail temps plein'],
    location: 'Localisation cible',
    locationPh: 'ex. Casablanca, Rabat, t\u00e9l\u00e9travail, toutes localisations',
    skills: 'Comp\u00e9tences requises (s\u00e9par\u00e9es par virgules)',
    skillsPh: 'ex. React, Node.js, AWS',
    helpDraft: 'Besoin d\u2019aide pour r\u00e9diger ?',
    generate: 'G\u00e9n\u00e9rer le prompt par IA',
    generating: 'G\u00e9n\u00e9ration\u2026',
    reviewTitle: 'Prompt g\u00e9n\u00e9r\u00e9 par l\u2019agent IA',
    reviewTag: 'V\u00e9rification requise',
    cancel: 'Annuler',
    approve: 'Approuver et appliquer',
    descLabel: 'Description du poste / prompt de sourcing',
    descPh: 'D\u00e9tail des responsabilit\u00e9s, stack technique attendue, profil id\u00e9al\u2026',
    saveChanges: 'Enregistrer les modifications',
    createAndSource: 'Cr\u00e9er et lancer le sourcing',
  },
};

export function JobDescriptionModal({
  isOpen = true,
  onClose = () => { },
  onCreate = () => { },
  onEdit = () => { },
  editingJob = null,
  lang = 'EN',
}) {
  const t = COPY[lang];
  const isFR = lang === 'FR';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('All Locations');
  const [skills, setSkills] = useState('');
  const [seniority, setSeniority] = useState('Senior');
  const [contractType, setContractType] = useState('Permanent (CDI)');

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPromptPreview, setGeneratedPromptPreview] = useState(null);
  const [showPromptConfirm, setShowPromptConfirm] = useState(false);
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
    if (editingJob) {
      setTitle(String(editingJob.title || ''));
      setDescription(String(editingJob.description || ''));
      setLocation(editingJob.location || 'All Locations');
      setSkills(Array.isArray(editingJob.skills) ? editingJob.skills.join(', ') : (editingJob.skills || ''));
      setSeniority(editingJob.seniority || 'Senior');
      setContractType(editingJob.contractType || 'Permanent (CDI)');
    } else {
      setTitle('');
      setDescription('');
      setLocation('All Locations');
      setSkills('');
      setSeniority('Senior');
      setContractType('Permanent (CDI)');
    }
    setGeneratedPromptPreview(null);
    setShowPromptConfirm(false);
  }, [editingJob, isOpen]);

  if (!isOpen) return null;

  const handleGeneratePrompt = () => {
    const safeTitle = String(title || '').trim();
    if (!safeTitle) return;
    setIsGenerating(true);

    window.setTimeout(() => {
      const safeSkills = String(skills || '').trim();
      const skillsList = safeSkills || (isFR ? 'React, Node.js, AWS' : 'React, Node.js, AWS');
      const locText = location && location !== 'All Locations' ? location : (isFR ? 'Toutes localisations' : 'All locations');

      const generated = isFR
        ? `Recherche un profil ${seniority} ${safeTitle} bas\u00e9(e) \u00e0 ${locText} (${contractType}). Le candidat id\u00e9al poss\u00e8de une expertise approfondie en ${skillsList}. Missions principales\u00a0: conception et architecture d'applications haute performance, livraison CI/CD, et collaboration agile en \u00e9quipe pluridisciplinaire. Profil recherch\u00e9\u00a0: esprit d'initiative, ma\u00eetrise des bonnes pratiques de clean code et capacit\u00e9 \u00e0 encadrer des profils plus juniors.`
        : `Looking for a ${seniority} ${safeTitle} based in ${locText} (${contractType}). The ideal candidate has deep expertise in ${skillsList}. Key responsibilities: designing high-performance architectures, automated CI/CD deployments, and agile collaboration. Expected profile: strong initiative, clean code practices, and the ability to mentor junior engineers.`;

      setGeneratedPromptPreview(generated);
      setShowPromptConfirm(true);
      setIsGenerating(false);
    }, 800);
  };

  const handleConfirmPrompt = () => {
    if (generatedPromptPreview) setDescription(String(generatedPromptPreview));
    setShowPromptConfirm(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const safeTitle = String(title || '').trim();
    if (!safeTitle) return;

    let safeDesc = String(description || '').trim();
    if (!safeDesc && generatedPromptPreview) safeDesc = String(generatedPromptPreview).trim();
    if (!safeDesc) {
      const safeSkills = String(skills || '').trim();
      safeDesc = isFR
        ? `Recherche un profil ${seniority} ${safeTitle} \u00e0 ${location} avec comp\u00e9tences en ${safeSkills || 'technologies cl\u00e9s'}.`
        : `Sourcing for ${seniority} ${safeTitle} in ${location} with expertise in ${safeSkills || 'key technologies'}.`;
    }

    const jobData = {
      id: editingJob ? editingJob.id : `job-${Date.now()}`,
      title: safeTitle,
      description: safeDesc,
      location: location || 'All Locations',
      skills: String(skills || '').split(',').map((s) => s.trim()).filter(Boolean),
      seniority,
      contractType,
      status: editingJob ? editingJob.status : 'active',
    };

    if (editingJob) onEdit(jobData);
    else onCreate(jobData);

    setTitle('');
    setDescription('');
    setLocation('All Locations');
    setSkills('');
    setShowPromptConfirm(false);
    setGeneratedPromptPreview(null);
    onClose();
  };

  return (
    <div className="dg-root dgj-overlay">
      <style>{`
        .dg-root {
          --dg-paper: #F6F7F9; --dg-surface: #FFFFFF; --dg-sunken: #EFF1F4;
          --dg-border: #E3E6EB; --dg-border-strong: #CBD2DC;
          --dg-ink-900: #10151F; --dg-ink-700: #38414F; --dg-ink-500: #6B7280; --dg-ink-400: #96A0AC;
          --dg-teal-700: #0A5C68; --dg-teal-600: #0E7C8C; --dg-teal-500: #128FA0; --dg-teal-100: #E1F2F3;
          --dg-green-700: #1F6E4A; --dg-green-600: #278F5E; --dg-green-100: #E3F5EC;
          --font-display: 'Space Grotesk', 'Inter', sans-serif;
          --font-body: 'Inter', system-ui, sans-serif;
          --font-mono: 'JetBrains Mono', ui-monospace, monospace;
          font-family: var(--font-body); color: var(--dg-ink-900);
        }
        .dg-display { font-family: var(--font-display); letter-spacing: -0.01em; }

        .dgj-overlay {
          position: fixed; inset: 0; z-index: 50; overflow-y: auto;
          background: rgba(16,21,31,0.55); backdrop-filter: blur(3px);
          display: flex; align-items: center; justify-content: center; padding: 20px;
        }
        .dgj-modal {
          background: var(--dg-surface); border: 1px solid var(--dg-border); border-radius: 20px;
          max-width: 580px; width: 100%; overflow: hidden;
          box-shadow: 0 30px 70px -30px rgba(16,21,31,0.4);
        }

        .dgj-header { padding: 18px 22px; border-bottom: 1px solid var(--dg-border); display: flex; align-items: center; justify-content: space-between; background: var(--dg-paper); }
        .dgj-header-title { font-size: 13.5px; font-weight: 700; display: flex; align-items: center; gap: 9px; }
        .dgj-close { background: none; border: none; color: var(--dg-ink-400); cursor: pointer; padding: 6px; border-radius: 8px; }
        .dgj-close:hover { color: var(--dg-ink-700); background: var(--dg-sunken); }

        .dgj-form { padding: 22px; max-height: 78vh; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }
        .dgj-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

        .dgj-label { display: block; font-size: 10px; font-weight: 700; color: var(--dg-ink-500); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
        .dgj-input, .dgj-select, .dgj-textarea {
          width: 100%; box-sizing: border-box; background: var(--dg-paper); border: 1px solid var(--dg-border);
          border-radius: 10px; padding: 10px 12px; font-size: 12.5px; font-weight: 500; color: var(--dg-ink-900);
          outline: none; font-family: var(--font-body); transition: border-color .15s ease, background .15s ease;
        }
        .dgj-input:focus, .dgj-select:focus, .dgj-textarea:focus { border-color: var(--dg-teal-500); background: var(--dg-surface); }
        .dgj-textarea { resize: none; line-height: 1.5; }
        .dgj-select { cursor: pointer; }

        .dgj-ai-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
        .dgj-ai-hint { font-size: 11px; font-weight: 600; color: var(--dg-ink-400); }
        .dgj-ai-btn {
          display: flex; align-items: center; gap: 7px; font-size: 11.5px; font-weight: 700;
          background: var(--dg-ink-900); color: #fff; border: none; border-radius: 10px;
          padding: 8px 14px; cursor: pointer; transition: background .15s ease;
        }
        .dgj-ai-btn:hover { background: #232C3A; }
        .dgj-ai-btn:disabled { opacity: 0.5; cursor: default; }
        .dgj-spin { animation: dgjspin 0.9s linear infinite; }
        @keyframes dgjspin { to { transform: rotate(360deg); } }

        .dgj-review { background: var(--dg-teal-100); border: 1px solid rgba(14,124,140,0.22); border-radius: 16px; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
        .dgj-review-head { display: flex; align-items: center; justify-content: space-between; }
        .dgj-review-title { display: flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 700; color: var(--dg-teal-700); }
        .dgj-review-tag { font-family: var(--font-mono); font-size: 9.5px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: var(--dg-teal-700); background: var(--dg-surface); border: 1px solid rgba(14,124,140,0.25); padding: 3px 8px; border-radius: 7px; }
        .dgj-review-textarea {
          width: 100%; box-sizing: border-box; background: var(--dg-surface); border: 1px solid rgba(14,124,140,0.25);
          border-radius: 12px; padding: 12px; font-size: 12px; color: var(--dg-ink-700); line-height: 1.6;
          outline: none; resize: none; font-family: var(--font-body);
        }
        .dgj-review-actions { display: flex; align-items: center; justify-content: flex-end; gap: 8px; }
        .dgj-review-cancel {
          font-size: 11.5px; font-weight: 700; color: var(--dg-ink-500); background: var(--dg-surface);
          border: 1px solid var(--dg-border); border-radius: 10px; padding: 7px 14px; cursor: pointer;
        }
        .dgj-review-cancel:hover { background: var(--dg-sunken); }
        .dgj-review-approve {
          display: flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 700; color: #fff;
          background: var(--dg-green-600); border: none; border-radius: 10px; padding: 7px 15px; cursor: pointer;
        }
        .dgj-review-approve:hover { background: var(--dg-green-700); }

        .dgj-submit {
          width: 100%; padding: 13px 0; border: none; border-radius: 12px;
          background: var(--dg-ink-900); color: #fff; font-size: 13px; font-weight: 700;
          display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer;
          transition: background .15s ease;
        }
        .dgj-submit:hover { background: #232C3A; }

        @media (max-width: 520px) {
          .dgj-row2 { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="dgj-modal">
        <div className="dgj-header">
          <span className="dgj-header-title dg-display">
            <FileText size={16} color="var(--dg-teal-600)" />
            {editingJob ? t.editTitle : t.newTitle}
          </span>
          <button className="dgj-close" onClick={onClose} aria-label="Close">
            <X size={17} />
          </button>
        </div>

        <form className="dgj-form" onSubmit={handleSubmit}>
          <div>
            <label className="dgj-label">{t.professionTitle} *</label>
            <input className="dgj-input" type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t.titlePh} />
          </div>

          <div className="dgj-row2">
            <div>
              <label className="dgj-label">{t.seniority}</label>
              <select className="dgj-select" value={seniority} onChange={(e) => setSeniority(e.target.value)}>
                {t.seniorityOpts.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div>
              <label className="dgj-label">{t.contractType}</label>
              <select className="dgj-select" value={contractType} onChange={(e) => setContractType(e.target.value)}>
                {t.contractOpts.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
          </div>

          <div className="dgj-row2">
            <div>
              <label className="dgj-label">{t.location}</label>
              <input className="dgj-input" type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t.locationPh} />
            </div>
            <div>
              <label className="dgj-label">{t.skills}</label>
              <input className="dgj-input" type="text" value={skills} onChange={(e) => setSkills(e.target.value)} placeholder={t.skillsPh} />
            </div>
          </div>

          <div className="dgj-ai-row">
            <span className="dgj-ai-hint">{t.helpDraft}</span>
            <button type="button" className="dgj-ai-btn" onClick={handleGeneratePrompt} disabled={isGenerating || !title.trim()}>
              {isGenerating ? (
                <><RefreshCw size={13} className="dgj-spin" /><span>{t.generating}</span></>
              ) : (
                <><Wand2 size={13} /><span>{t.generate}</span></>
              )}
            </button>
          </div>

          {showPromptConfirm && generatedPromptPreview && (
            <div className="dgj-review">
              <div className="dgj-review-head">
                <span className="dgj-review-title"><Sparkles size={14} />{t.reviewTitle}</span>
                <span className="dgj-review-tag">{t.reviewTag}</span>
              </div>
              <textarea
                className="dgj-review-textarea"
                rows="4"
                value={generatedPromptPreview}
                onChange={(e) => setGeneratedPromptPreview(e.target.value)}
              />
              <div className="dgj-review-actions">
                <button type="button" className="dgj-review-cancel" onClick={() => setShowPromptConfirm(false)}>{t.cancel}</button>
                <button type="button" className="dgj-review-approve" onClick={handleConfirmPrompt}>
                  <CheckCircle2 size={13} /><span>{t.approve}</span>
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="dgj-label">{t.descLabel}</label>
            <textarea
              className="dgj-textarea"
              rows="4"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.descPh}
            />
          </div>

          <button type="submit" className="dgj-submit">
            <Plus size={15} />
            <span>{editingJob ? t.saveChanges : t.createAndSource}</span>
          </button>
        </form>
      </div>
    </div>
  );
}

export default JobDescriptionModal;