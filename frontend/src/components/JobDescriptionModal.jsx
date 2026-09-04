import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  FileText,
  Plus,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  Wand2,
  Briefcase,
  Clock,
  Laptop,
  Home,
  User,
  Users,
  Award,
  Crown,
} from 'lucide-react';
import { searchLocations } from '../utils/geocoding';

const CONTRACT_ICON_MAP = {
  Briefcase,
  Clock,
  Laptop,
  Home,
};

const SENIORITY_ICONS = [User, Users, Award, Crown];

const COPY = {
  EN: {
    editTitle: 'Edit job description',
    newTitle: 'New job description',
    sectionBasics: 'Role basics',
    sectionWhere: 'Where & what',
    sectionBrief: 'Sourcing brief',
    professionTitle: 'Job title',
    titlePh: 'e.g. Digital Marketing Lead, Senior Full-Stack Engineer, HR Manager',
    seniority: 'Seniority level',
    seniorityOpts: ['Junior (0–2 yrs)', 'Mid-level (2–5 yrs)', 'Senior (5–8 yrs)', 'Lead / Manager (8+ yrs)'],
    seniorityShort: ['Junior', 'Mid-level', 'Senior', 'Lead/Manager'],
    contractType: 'Contract type',
    contractOpts: ['Permanent (CDI)', 'Fixed-term (CDD)', 'Freelance / Contract', 'Remote full-time'],
    contractIcons: {
      'Permanent (CDI)': 'Briefcase',
      'Fixed-term (CDD)': 'Clock',
      'Freelance / Contract': 'Laptop',
      'Remote full-time': 'Home',
    },
    location: 'Target location',
    locationPh: 'Search city, region, or country...',
    skills: 'Required skills',
    skillsPh: 'Type a skill and press Enter...',
    skillsAdded: 'Press Enter or comma to add a skill',
    previewLabel: 'Search preview',
    targetProfiles: 'Target candidates to source',
    profilesUnit: 'profiles',
    helpDraft: 'Need help drafting the prompt?',
    generate: 'Generate prompt with AI',
    generating: 'Generating…',
    reviewTitle: 'AI agent generated prompt',
    reviewTag: 'Review required',
    cancel: 'Cancel',
    approve: 'Approve and apply',
    descLabel: 'Job description / sourcing prompt',
    descPh: 'Detailed responsibilities, expected competencies, and ideal candidate profile…',
    saveChanges: 'Save changes',
    createAndSource: 'Create and start sourcing',
  },
  FR: {
    editTitle: 'Modifier la fiche de poste',
    newTitle: 'Nouvelle fiche de poste',
    sectionBasics: 'Informations du poste',
    sectionWhere: 'Où & quoi',
    sectionBrief: 'Brief de sourcing',
    professionTitle: 'Intitulé du poste',
    titlePh: 'ex. Ingénieur Backend Senior',
    seniority: 'Niveau de séniorité',
    seniorityOpts: ['Junior (0–2 ans)', 'Intermédiaire (2–5 ans)', 'Senior (5–8 ans)', 'Lead / Architecte (8+ ans)'],
    seniorityShort: ['Junior', 'Intermédiaire', 'Senior', 'Lead/Architecte'],
    contractType: 'Type de contrat',
    contractOpts: ['CDI', 'CDD', 'Freelance / Prestation', 'Télétravail temps plein'],
    contractIcons: {
      'CDI': 'Briefcase',
      'CDD': 'Clock',
      'Freelance / Prestation': 'Laptop',
      'Télétravail temps plein': 'Home',
    },
    location: 'Localisation cible',
    locationPh: 'Rechercher une ville, région ou pays...',
    skills: 'Compétences requises',
    skillsPh: 'Tapez une compétence et appuyez sur Entrée...',
    skillsAdded: 'Appuyez sur Entrée ou virgule pour ajouter',
    previewLabel: 'Aperçu de la recherche',
    targetProfiles: 'Nombre de candidats à sourcer',
    profilesUnit: 'profils',
    helpDraft: 'Besoin d’aide pour rédiger ?',
    generate: 'Générer le prompt par IA',
    generating: 'Génération…',
    reviewTitle: 'Prompt généré par l’agent IA',
    reviewTag: 'Vérification requise',
    cancel: 'Annuler',
    approve: 'Approuver et appliquer',
    descLabel: 'Description du poste / prompt de sourcing',
    descPh: 'Détail des responsabilités, stack technique attendue, profil idéal…',
    saveChanges: 'Enregistrer les modifications',
    createAndSource: 'Créer et lancer le sourcing',
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
  const t = COPY[lang] || COPY.EN;
  const isFR = lang === 'FR';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const locationDebounceRef = useRef(null);

  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [seniority, setSeniority] = useState(t.seniorityOpts[2]);
  const [contractType, setContractType] = useState(t.contractOpts[0]);
  const [maxResults, setMaxResults] = useState(10);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPromptPreview, setGeneratedPromptPreview] = useState(null);
  const [showPromptConfirm, setShowPromptConfirm] = useState(false);
  const fontsLoaded = useRef(false);

  useEffect(() => {
    return () => {
      if (locationDebounceRef.current) clearTimeout(locationDebounceRef.current);
    };
  }, []);

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
      setLocation(editingJob.location && editingJob.location !== 'All Locations' ? editingJob.location : '');
      setSkills(
        Array.isArray(editingJob.skills)
          ? editingJob.skills
          : (editingJob.skills || '')
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
      );
      setSeniority(editingJob.seniority || t.seniorityOpts[2]);
      setContractType(editingJob.contractType || t.contractOpts[0]);
      setMaxResults(Number(editingJob.maxResults) || 10);
    } else {
      setTitle('');
      setDescription('');
      setLocation('');
      setSkills([]);
      setSkillInput('');
      setSeniority(t.seniorityOpts[2]);
      setContractType(t.contractOpts[0]);
      setMaxResults(10);
    }
    setLocationSuggestions([]);
    setShowLocationDropdown(false);
    setGeneratedPromptPreview(null);
    setShowPromptConfirm(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingJob, isOpen]);

  const handleLocationChange = (value) => {
    setLocation(value);
    setShowLocationDropdown(true);
    if (locationDebounceRef.current) clearTimeout(locationDebounceRef.current);
    if (!value || value.trim().length < 2) {
      setLocationSuggestions([]);
      return;
    }
    locationDebounceRef.current = setTimeout(async () => {
      setIsLoadingLocations(true);
      const results = await searchLocations(value, isFR ? 'fr' : 'en');
      setLocationSuggestions(results);
      setIsLoadingLocations(false);
    }, 400);
  };

  const selectLocation = (suggestion) => {
    setLocation(suggestion.label);
    setShowLocationDropdown(false);
    setLocationSuggestions([]);
  };

  if (!isOpen) return null;

  const addSkill = () => {
    const val = skillInput.trim();
    if (!val) return;
    const parts = val.split(',').map((s) => s.trim()).filter(Boolean);
    const newSkills = [...skills];
    parts.forEach((p) => {
      if (!newSkills.includes(p)) newSkills.push(p);
    });
    setSkills(newSkills);
    setSkillInput('');
  };

  const removeSkill = (skillToRemove) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const handleSkillKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addSkill();
    } else if (e.key === 'Backspace' && !skillInput && skills.length > 0) {
      setSkills(skills.slice(0, -1));
    }
  };

  const handleGeneratePrompt = () => {
    const safeTitle = String(title || '').trim();
    if (!safeTitle) return;
    setIsGenerating(true);

    window.setTimeout(() => {
      const safeSkills = skills.join(', ');
      const skillsList = safeSkills || 'React, Node.js, AWS';
      const locText = location && location !== 'All Locations' ? location : (isFR ? 'Toutes localisations' : 'All locations');

      const generated = isFR
        ? `Recherche un profil ${seniority} ${safeTitle} basé(e) à ${locText} (${contractType}). Le candidat idéal possède une expertise approfondie en ${skillsList}. Missions principales : conception et architecture d'applications haute performance, livraison CI/CD, et collaboration agile en équipe pluridisciplinaire. Profil recherché : esprit d'initiative, maîtrise des bonnes pratiques de clean code et capacité à encadrer des profils plus juniors.`
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
      const safeSkills = skills.join(', ');
      safeDesc = isFR
        ? `Recherche un profil ${seniority} ${safeTitle} à ${location} avec compétences en ${safeSkills || 'technologies clés'}.`
        : `Sourcing for ${seniority} ${safeTitle} in ${location} with expertise in ${safeSkills || 'key technologies'}.`;
    }

    const jobData = {
      id: editingJob ? editingJob.id : `job-${Date.now()}`,
      title: safeTitle,
      description: safeDesc,
      location: location.trim() || 'All Locations',
      skills: skills,
      seniority,
      contractType,
      maxResults: Number(maxResults) || 10,
      status: editingJob ? editingJob.status : 'active',
    };

    if (editingJob) onEdit(jobData);
    else onCreate(jobData);

    setTitle('');
    setDescription('');
    setLocation('');
    setLocationSuggestions([]);
    setShowLocationDropdown(false);
    setSkills([]);
    setSkillInput('');
    setMaxResults(10);
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

        .dgj-label { display: block; font-size: 10px; font-weight: 700; color: var(--dg-ink-500); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
        .dgj-input, .dgj-select, .dgj-textarea {
          width: 100%; box-sizing: border-box; background: var(--dg-paper); border: 1px solid var(--dg-border);
          border-radius: 10px; padding: 10px 12px; font-size: 12.5px; font-weight: 500; color: var(--dg-ink-900);
          outline: none; font-family: var(--font-body); transition: border-color .15s ease, background .15s ease;
        }
        .dgj-input:focus, .dgj-select:focus, .dgj-textarea:focus { border-color: var(--dg-teal-500); background: var(--dg-surface); }
        .dgj-textarea { resize: none; line-height: 1.5; }
        .dgj-select { cursor: pointer; }

        .dgsc-tech-tags { display: flex; flex-wrap: wrap; gap: 5px; }
        .dgsc-tech-chip {
          font-family: var(--font-mono); font-size: 10.5px; font-weight: 500; padding: 3px 8px; border-radius: 6px;
          border: 1px solid var(--dg-border); background: var(--dg-paper); color: var(--dg-ink-700);
        }
        .dgsc-tech-chip-active { background: var(--dg-teal-100); color: var(--dg-teal-700); border-color: rgba(14,124,140,0.3); }

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
          {/* Section 1: Role basics */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <div style={{ width: 3, height: 14, borderRadius: 2, background: 'var(--dg-teal-600)' }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--dg-teal-700)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {t.sectionBasics}
            </span>
          </div>

          <div>
            <label className="dgj-label">{t.professionTitle} *</label>
            <input
              className="dgj-input"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.titlePh}
            />
          </div>

          <div>
            <label className="dgj-label">{t.seniority}</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {t.seniorityOpts.map((opt, idx) => {
                const isSelected =
                  seniority === opt ||
                  (seniority && (opt.startsWith(seniority) || (t.seniorityShort[idx] && seniority.includes(t.seniorityShort[idx]))));
                const Icon = SENIORITY_ICONS[idx] || User;
                const years = opt.match(/\((.*?)\)/)?.[1] || '';
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setSeniority(opt)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      padding: '10px 6px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      border: isSelected ? '1.5px solid var(--dg-teal-600)' : '1px solid var(--dg-border)',
                      background: isSelected ? 'var(--dg-teal-100)' : 'var(--dg-paper)',
                      color: isSelected ? 'var(--dg-teal-700)' : 'var(--dg-ink-500)',
                      transition: 'all .15s ease',
                    }}
                  >
                    <Icon size={16} style={{ color: isSelected ? 'var(--dg-teal-600)' : 'var(--dg-ink-400)' }} />
                    <span style={{ fontSize: 10, fontWeight: isSelected ? 700 : 600, textAlign: 'center', lineHeight: 1.3 }}>
                      {t.seniorityShort[idx]}
                    </span>
                    {years && (
                      <span style={{ fontSize: 9, color: isSelected ? 'var(--dg-teal-600)' : 'var(--dg-ink-400)', textAlign: 'center', lineHeight: 1 }}>
                        {years}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="dgj-label">{t.contractType}</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {t.contractOpts.map((opt) => {
                const isSelected =
                  contractType === opt ||
                  (contractType && (opt.includes(contractType) || contractType.includes(opt)));
                const iconName = t.contractIcons?.[opt];
                const Icon = CONTRACT_ICON_MAP[iconName] || Briefcase;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setContractType(opt)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 12px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      border: isSelected ? '1.5px solid var(--dg-teal-600)' : '1px solid var(--dg-border)',
                      background: isSelected ? 'var(--dg-teal-100)' : 'var(--dg-paper)',
                      color: isSelected ? 'var(--dg-teal-700)' : 'var(--dg-ink-700)',
                      transition: 'all .15s ease',
                      textAlign: 'left',
                    }}
                  >
                    <Icon size={16} style={{ flexShrink: 0, color: isSelected ? 'var(--dg-teal-600)' : 'var(--dg-ink-400)' }} />
                    <span style={{ fontSize: 11.5, fontWeight: isSelected ? 700 : 500, lineHeight: 1.2 }}>
                      {opt}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Where & what */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <div style={{ width: 3, height: 14, borderRadius: 2, background: 'var(--dg-teal-600)' }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--dg-teal-700)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {t.sectionWhere}
            </span>
          </div>

          <div>
            <label className="dgj-label">{t.location}</label>
            <div style={{ position: 'relative' }}>
              <input
                className="dgj-input"
                type="text"
                value={location}
                onChange={(e) => handleLocationChange(e.target.value)}
                onFocus={() => location.length >= 2 && setShowLocationDropdown(true)}
                onBlur={() => setTimeout(() => setShowLocationDropdown(false), 150)}
                placeholder={t.locationPh}
                autoComplete="off"
              />
              {showLocationDropdown && (isLoadingLocations || locationSuggestions.length > 0) && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: 4,
                    zIndex: 10,
                    background: 'var(--dg-surface)',
                    border: '1px solid var(--dg-border)',
                    borderRadius: '10px',
                    boxShadow: '0 8px 24px -8px rgba(16,21,31,0.18)',
                    maxHeight: '220px',
                    overflowY: 'auto',
                  }}
                >
                  {isLoadingLocations ? (
                    <div style={{ padding: '10px 12px', fontSize: '11.5px', color: 'var(--dg-ink-400)' }}>
                      {isFR ? 'Recherche...' : 'Searching...'}
                    </div>
                  ) : (
                    locationSuggestions.map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => selectLocation(s)}
                        style={{
                          display: 'block',
                          width: '100%',
                          textAlign: 'left',
                          padding: '9px 12px',
                          border: 'none',
                          background: 'none',
                          cursor: 'pointer',
                          fontSize: '12px',
                          color: 'var(--dg-ink-700)',
                          borderBottom: idx < locationSuggestions.length - 1 ? '1px solid var(--dg-border)' : 'none',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--dg-sunken)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'none';
                        }}
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        {s.label}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="dgj-label">{t.skills}</label>
            <div
              className="dgsc-tech-tags"
              style={{
                padding: '8px 10px',
                background: 'var(--dg-paper)',
                border: '1px solid var(--dg-border)',
                borderRadius: '10px',
                minHeight: '42px',
                alignItems: 'center',
                display: 'flex',
                flexWrap: 'wrap',
                gap: 5,
              }}
            >
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="dgsc-tech-chip dgsc-tech-chip-active"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => removeSkill(skill)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      color: 'inherit',
                    }}
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={handleSkillKeyDown}
                onBlur={addSkill}
                placeholder={skills.length === 0 ? t.skillsPh : t.skillsAdded}
                style={{
                  border: 'none',
                  outline: 'none',
                  background: 'none',
                  fontSize: '12px',
                  flex: 1,
                  minWidth: '130px',
                  color: 'var(--dg-ink-900)',
                }}
              />
            </div>
          </div>

          {/* Live Search Preview */}
          {(title.trim() || skills.length > 0) && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 6,
                padding: '8px 10px',
                background: 'var(--dg-sunken)',
                borderRadius: '8px',
                fontSize: '10.5px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--dg-ink-500)',
              }}
            >
              <Sparkles size={12} color="var(--dg-teal-600)" style={{ flexShrink: 0, marginTop: 1 }} />
              <span>
                <strong style={{ color: 'var(--dg-teal-700)' }}>{t.previewLabel}:</strong> site:linkedin.com/in {(seniority || '').split(' ')[0]} "{title || '...'}"
                {skills.length > 0 && ` (${skills.slice(0, 3).join(' OR ')})`}
                {location !== 'All Locations' && location ? ` ${location}` : ''}
                <span style={{ color: 'var(--dg-teal-700)', fontWeight: 600 }}> • {maxResults} {t.profilesUnit}</span>
              </span>
            </div>
          )}

          {/* Section 3: Sourcing brief */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <div style={{ width: 3, height: 14, borderRadius: 2, background: 'var(--dg-teal-600)' }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--dg-teal-700)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {t.sectionBrief}
            </span>
          </div>

          <div className="dgj-ai-row">
            <span className="dgj-ai-hint">{t.helpDraft}</span>
            <button
              type="button"
              className="dgj-ai-btn"
              onClick={handleGeneratePrompt}
              disabled={isGenerating || !title.trim()}
            >
              {isGenerating ? (
                <>
                  <RefreshCw size={13} className="dgj-spin" />
                  <span>{t.generating}</span>
                </>
              ) : (
                <>
                  <Wand2 size={13} />
                  <span>{t.generate}</span>
                </>
              )}
            </button>
          </div>

          {showPromptConfirm && generatedPromptPreview && (
            <div className="dgj-review">
              <div className="dgj-review-head">
                <span className="dgj-review-title">
                  <Sparkles size={14} />
                  {t.reviewTitle}
                </span>
                <span className="dgj-review-tag">{t.reviewTag}</span>
              </div>
              <textarea
                className="dgj-review-textarea"
                rows="4"
                value={generatedPromptPreview}
                onChange={(e) => setGeneratedPromptPreview(e.target.value)}
              />
              <div className="dgj-review-actions">
                <button
                  type="button"
                  className="dgj-review-cancel"
                  onClick={() => setShowPromptConfirm(false)}
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  className="dgj-review-approve"
                  onClick={handleConfirmPrompt}
                >
                  <CheckCircle2 size={13} />
                  <span>{t.approve}</span>
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

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label className="dgj-label" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Users size={12} />
                {t.targetProfiles}
              </label>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--dg-teal-700)' }}>
                {maxResults} {t.profilesUnit}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="25"
              value={maxResults}
              onChange={(e) => setMaxResults(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--dg-teal-600)', cursor: 'pointer', marginBottom: 6 }}
            />
            <div style={{ display: 'flex', gap: 6 }}>
              {[3, 5, 10, 15, 20].map((count) => {
                const isSelected = maxResults === count;
                return (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setMaxResults(count)}
                    className={'dgsc-tech-chip' + (isSelected ? ' dgsc-tech-chip-active' : '')}
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      padding: '6px 0',
                      fontSize: 11,
                      fontWeight: isSelected ? 700 : 500,
                      borderRadius: 8,
                    }}
                  >
                    {count}
                  </button>
                );
              })}
            </div>
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