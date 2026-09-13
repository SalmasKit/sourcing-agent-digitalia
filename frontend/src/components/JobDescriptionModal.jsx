/**
 * JobDescriptionModal — restructured
 *
 * 3-step job description flow with full EN/FR UI localization.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  X, FileText, Plus, Sparkles, CheckCircle2, RefreshCw, Wand2,
  Briefcase, Clock, Laptop, Home, User, Users, Award, Crown, ChevronLeft, ChevronRight, Check,
} from 'lucide-react';
import { searchLocations } from '../utils/geocoding';
import { agentClient } from '../services/api';
import { useConfirm } from '../context/ConfirmDialogContext';
import { useLanguage } from '../context/LanguageContext';

const CONTRACT_ICON_MAP = { Briefcase, Clock, Laptop, Home };
const SENIORITY_ICONS = [User, Users, Award, Crown];

const COPY = {
  EN: {
    stepLabels: ['Role basics', 'Where & what', 'Sourcing brief'],
    editTitle: 'Edit job description',
    newTitle: 'New job description',
    professionTitle: 'Job title',
    titlePh: 'e.g. Digital Marketing Lead, Senior Full-Stack Engineer',
    seniority: 'Seniority level',
    seniorityOpts: ['Junior (0–2 yrs)', 'Mid-level (2–5 yrs)', 'Senior (5–8 yrs)', 'Lead / Manager (8+ yrs)'],
    seniorityShort: ['Junior', 'Mid-level', 'Senior', 'Lead/Manager'],
    contractType: 'Contract type',
    contractOpts: ['Permanent (CDI)', 'Fixed-term (CDD)', 'Freelance / Contract', 'Remote full-time'],
    contractIcons: { 'Permanent (CDI)': 'Briefcase', 'Fixed-term (CDD)': 'Clock', 'Freelance / Contract': 'Laptop', 'Remote full-time': 'Home' },
    location: 'Target location',
    locationPh: 'Search city, region, or country...',
    searching: 'Searching...',
    skills: 'Required skills (must-have)',
    skillsPh: 'Type a skill and press Enter...',
    skillsAdded: 'Press Enter or comma to add',
    niceToHaveSkills: 'Nice-to-have skills (bonus)',
    niceToHaveSkillsPh: 'Optional skills that add value...',
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
    back: 'Back',
    next: 'Next',
    titleRequired: 'Add a job title to continue',
    close: 'Close',
    bonusSkills: 'Bonus skills that add value',
    updateConfirm: 'Update Job Description?',
    createConfirm: 'Create Job Description?',
    updateMessage: 'Are you sure you want to update',
    createMessage: 'Are you sure you want to create',
    update: 'Update',
    create: 'Create',
    allLocations: 'All locations',
    keySkills: 'key skills',
  },
  FR: {
    stepLabels: ['Informations du poste', 'Lieu & compétences', 'Brief de sourcing'],
    editTitle: 'Modifier la fiche de poste',
    newTitle: 'Nouvelle fiche de poste',
    professionTitle: 'Intitulé du poste',
    titlePh: 'ex. Responsable marketing digital, Ingénieur Full-Stack senior',
    seniority: 'Niveau d’expérience',
    seniorityOpts: ['Junior (0–2 ans)', 'Intermédiaire (2–5 ans)', 'Senior (5–8 ans)', 'Lead / Manager (8+ ans)'],
    seniorityShort: ['Junior', 'Intermédiaire', 'Senior', 'Lead/Manager'],
    contractType: 'Type de contrat',
    contractOpts: ['CDI', 'CDD', 'Freelance / Contrat', 'Temps plein à distance'],
    contractIcons: { 'CDI': 'Briefcase', 'CDD': 'Clock', 'Freelance / Contrat': 'Laptop', 'Temps plein à distance': 'Home' },
    location: 'Localisation cible',
    locationPh: 'Rechercher une ville, une région ou un pays...',
    searching: 'Recherche...',
    skills: 'Compétences requises (indispensables)',
    skillsPh: 'Saisissez une compétence puis appuyez sur Entrée...',
    skillsAdded: 'Appuyez sur Entrée ou une virgule pour ajouter',
    niceToHaveSkills: 'Compétences appréciées (bonus)',
    niceToHaveSkillsPh: 'Compétences optionnelles qui apportent une valeur ajoutée...',
    previewLabel: 'Aperçu de la recherche',
    targetProfiles: 'Nombre de candidats à sourcer',
    profilesUnit: 'profils',
    helpDraft: 'Besoin d’aide pour rédiger le brief ?',
    generate: 'Générer le brief avec l’IA',
    generating: 'Génération…',
    reviewTitle: 'Brief généré par l’agent IA',
    reviewTag: 'Vérification requise',
    cancel: 'Annuler',
    approve: 'Approuver et appliquer',
    descLabel: 'Fiche de poste / brief de sourcing',
    descPh: 'Responsabilités détaillées, compétences attendues et profil candidat idéal…',
    saveChanges: 'Enregistrer les modifications',
    createAndSource: 'Créer et lancer le sourcing',
    back: 'Retour',
    next: 'Suivant',
    titleRequired: 'Ajoutez un intitulé de poste pour continuer',
    close: 'Fermer',
    bonusSkills: 'Compétences bonus qui apportent une valeur ajoutée',
    updateConfirm: 'Modifier la fiche de poste ?',
    createConfirm: 'Créer la fiche de poste ?',
    updateMessage: 'Êtes-vous sûr de vouloir modifier la fiche',
    createMessage: 'Êtes-vous sûr de vouloir créer la fiche',
    update: 'Modifier',
    create: 'Créer',
    allLocations: 'Toutes les localisations',
    keySkills: 'compétences clés',
  },
};

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

export function JobDescriptionModal({
  isOpen = true,
  onClose = () => { },
  onCreate = () => { },
  onEdit = () => { },
  editingJob = null,
  lang = 'EN',
}) {
  useFonts();
  const { confirm } = useConfirm();
  const { lang: appLang } = useLanguage();

  const activeLang = appLang === 'FR' || lang === 'FR' ? 'FR' : 'EN';
  const t = COPY[activeLang];
  const isFR = activeLang === 'FR';

  const [step, setStep] = useState(0);
  const [titleErr, setTitleErr] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const locationDebounceRef = useRef(null);

  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [niceToHaveSkills, setNiceToHaveSkills] = useState([]);
  const [niceToHaveSkillInput, setNiceToHaveSkillInput] = useState('');
  const [seniority, setSeniority] = useState(t.seniorityOpts[2]);
  const [contractType, setContractType] = useState(t.contractOpts[0]);
  const [maxResults, setMaxResults] = useState(10);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPromptPreview, setGeneratedPromptPreview] = useState(null);
  const [showPromptConfirm, setShowPromptConfirm] = useState(false);

  useEffect(() => () => {
    if (locationDebounceRef.current) clearTimeout(locationDebounceRef.current);
  }, []);

  useEffect(() => {
    setStep(0);
    setTitleErr(false);

    if (editingJob) {
      setTitle(String(editingJob.title || ''));
      setDescription(String(editingJob.description || ''));
      setLocation(editingJob.location && editingJob.location !== 'All Locations' ? editingJob.location : '');
      setSkills(Array.isArray(editingJob.requiredSkills) ? editingJob.requiredSkills : []);
      setNiceToHaveSkills(Array.isArray(editingJob.niceToHaveSkills) ? editingJob.niceToHaveSkills : []);
      setSeniority(editingJob.seniority || t.seniorityOpts[2]);
      setContractType(editingJob.contractType || t.contractOpts[0]);
      setMaxResults(Number(editingJob.maxResults) || 10);
    } else {
      setTitle('');
      setDescription('');
      setLocation('');
      setSkills([]);
      setSkillInput('');
      setNiceToHaveSkills([]);
      setNiceToHaveSkillInput('');
      setSeniority(t.seniorityOpts[2]);
      setContractType(t.contractOpts[0]);
      setMaxResults(10);
    }

    setLocationSuggestions([]);
    setShowLocationDropdown(false);
    setGeneratedPromptPreview(null);
    setShowPromptConfirm(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingJob, isOpen, activeLang]);

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
      try {
        const results = await searchLocations(value, isFR ? 'fr' : 'en');
        setLocationSuggestions(results);
      } catch (error) {
        console.warn('Location search failed:', error);
        setLocationSuggestions([]);
      } finally {
        setIsLoadingLocations(false);
      }
    }, 400);
  };

  const selectLocation = (s) => {
    setLocation(s.label);
    setShowLocationDropdown(false);
    setLocationSuggestions([]);
  };

  if (!isOpen) return null;

  const addSkill = () => {
    const parts = skillInput.trim().split(',').map(s => s.trim()).filter(Boolean);
    if (!parts.length) return;
    setSkills(prev => [...new Set([...prev, ...parts])]);
    setSkillInput('');
  };

  const removeSkill = (s) => setSkills(prev => prev.filter(x => x !== s));

  const handleSkillKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addSkill();
    } else if (e.key === 'Backspace' && !skillInput && skills.length) {
      setSkills(prev => prev.slice(0, -1));
    }
  };

  const addNiceSkill = () => {
    const parts = niceToHaveSkillInput.trim().split(',').map(s => s.trim()).filter(Boolean);
    if (!parts.length) return;
    setNiceToHaveSkills(prev => [...new Set([...prev, ...parts])]);
    setNiceToHaveSkillInput('');
  };

  const removeNiceSkill = (s) => setNiceToHaveSkills(prev => prev.filter(x => x !== s));

  const handleNiceSkillKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addNiceSkill();
    } else if (e.key === 'Backspace' && !niceToHaveSkillInput && niceToHaveSkills.length) {
      setNiceToHaveSkills(prev => prev.slice(0, -1));
    }
  };

  async function handleGeneratePrompt() {
    const safeTitle = String(title || '').trim();
    if (!safeTitle) return;

    setIsGenerating(true);

    const skillsList = skills.join(', ') || 'React, Node.js, AWS';
    const locText = location && location !== 'All Locations' ? location : t.allLocations;
    const niceSkillsList = niceToHaveSkills.length ? niceToHaveSkills.join(', ') : null;

    try {
      const response = await agentClient.post('/api/generate-job-description', {
        title: safeTitle,
        seniority,
        contractType,
        location: locText,
        requiredSkills: skills,
        niceToHaveSkills,
      });

      const generated = response.data?.description || response.data?.prompt ||
        `Looking for a ${seniority} ${safeTitle} based in ${locText} (${contractType}). The ideal candidate has deep expertise in ${skillsList}. Key responsibilities: executing core duties with excellence, delivering measurable results, and driving business growth. Expected profile: strong initiative, proven track record, and the ability to work effectively in a team environment.`;

      if (niceSkillsList && !generated.toLowerCase().includes(niceSkillsList.toLowerCase())) {
        setGeneratedPromptPreview(generated + ` ${t.bonusSkills}: ${niceSkillsList}.`);
      } else {
        setGeneratedPromptPreview(generated);
      }

      setShowPromptConfirm(true);
    } catch (error) {
      console.warn('AI generation failed, using fallback template:', error.message);

      let generated =
        `Looking for a ${seniority} ${safeTitle} based in ${locText} (${contractType}). The ideal candidate has deep expertise in ${skillsList}. Key responsibilities: executing core duties with excellence, delivering measurable results, and driving business growth. Expected profile: strong initiative, proven track record, and the ability to work effectively in a team environment.`;

      if (niceSkillsList) generated += ` ${t.bonusSkills}: ${niceSkillsList}.`;

      setGeneratedPromptPreview(generated);
      setShowPromptConfirm(true);
    } finally {
      setIsGenerating(false);
    }
  }

  function handleConfirmPrompt() {
    if (generatedPromptPreview) setDescription(String(generatedPromptPreview));
    setShowPromptConfirm(false);
  }

  function goNext() {
    if (step === 0 && !title.trim()) {
      setTitleErr(true);
      return;
    }
    setStep(s => Math.min(s + 1, 2));
  }

  function goToStep(i) {
    if (i > step && step === 0 && !title.trim()) {
      setTitleErr(true);
      return;
    }
    setStep(i);
  }

  const getMinExperienceFromSeniority = (seniorityStr) => {
    if (!seniorityStr) return 3;
    if (seniorityStr.includes('Junior')) return 1;
    if (seniorityStr.includes('Mid-level') || seniorityStr.includes('Intermédiaire')) return 3;
    if (seniorityStr.includes('Senior')) return 5;
    if (seniorityStr.includes('Lead') || seniorityStr.includes('Manager')) return 8;
    return 3;
  };

  async function handleSubmit(e) {
    e.preventDefault();

    const safeTitle = String(title || '').trim();
    if (!safeTitle) {
      setStep(0);
      setTitleErr(true);
      return;
    }

    let safeDesc =
      String(description || '').trim() ||
      generatedPromptPreview?.trim() ||
      '';

    if (!safeDesc) {
      safeDesc =
        `Sourcing for ${seniority} ${safeTitle} in ${location} with expertise in ${skills.join(', ') || t.keySkills}. Key responsibilities: delivering excellent results in core role functions, contributing to team success, and driving business objectives. Expected profile: strong professional initiative, proven track record, and effective collaboration skills.`;
    }

    if (
      niceToHaveSkills.length &&
      !safeDesc.toLowerCase().includes(niceToHaveSkills[0].toLowerCase())
    ) {
      safeDesc += ` ${t.bonusSkills}: ${niceToHaveSkills.join(', ')}.`;
    }

    const jobData = {
      id: editingJob ? editingJob.id : `job-${Date.now()}`,
      title: safeTitle,
      description: safeDesc,
      location: location.trim() || 'All Locations',
      requiredSkills: skills,
      niceToHaveSkills,
      skills,
      seniority,
      contractType,
      maxResults: Number(maxResults) || 10,
      minExperience: getMinExperienceFromSeniority(seniority),
      status: editingJob ? editingJob.status : 'active',
    };

    const confirmed = await confirm({
      title: editingJob ? t.updateConfirm : t.createConfirm,
      message: editingJob
        ? `${t.updateMessage} "${safeTitle}" ?`
        : `${t.createMessage} "${safeTitle}" ?`,
      itemBadge: safeTitle,
      confirmText: editingJob ? t.update : t.create,
      cancelText: t.cancel,
      type: 'info',
    });

    if (confirmed) {
      if (editingJob) onEdit(jobData);
      else onCreate(jobData);
      onClose();
    }
  }

  const previewVisible = title.trim() || skills.length > 0;
  const seniorityYears = (seniority || '').match(/\([^)]+\)/)?.[0]?.replace(/\(|\)/g, '') || '';

  return (
    <div className="jd-overlay">
      <style>{`
        @keyframes jdFadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes jdModalIn { from { opacity:0; transform: scale(0.97) translateY(6px); } to { opacity:1; transform:scale(1) translateY(0); } }
        @keyframes jdStepIn { from { opacity:0; transform: translateX(10px); } to { opacity:1; transform:translateX(0); } }
        @keyframes jdTagIn { from { opacity:0; transform: scale(0.85); } to { opacity:1; transform:scale(1); } }
        @keyframes jdSpin { to { transform: rotate(360deg); } }
        @keyframes jdShimmer { 0% { background-position: -200px 0; } 100% { background-position: 200px 0; } }
        @keyframes jdShake { 10%,90% { transform: translateX(-1px); } 20%,80% { transform: translateX(2px); } 30%,50%,70% { transform: translateX(-4px); } 40%,60% { transform: translateX(4px); } }

        .jd-overlay { position:fixed; inset:0; z-index:50; overflow-y:auto; background:rgba(18,21,27,0.55); backdrop-filter:blur(3px); display:flex; align-items:center; justify-content:center; padding:20px; animation: jdFadeIn .2s ease both; font-family:'Inter', system-ui, sans-serif; }
        .jd-modal { background:#FBFAF7; border:1px solid #E4E1D9; border-radius:20px; max-width:600px; width:100%; max-height:92vh; overflow:hidden; display:flex; flex-direction:column; box-shadow: 0 30px 70px -30px rgba(18,21,27,0.45); animation: jdModalIn .25s cubic-bezier(0.22,1,0.36,1) both; }

        .jd-header { padding:18px 22px; border-bottom:1px solid #E4E1D9; display:flex; align-items:center; justify-content:space-between; background:#fff; flex-shrink:0; }
        .jd-header-title { font-family:'Space Grotesk',sans-serif; font-size:13.5px; font-weight:700; display:flex; align-items:center; gap:9px; color:#12151B; }
        .jd-close { background:none; border:none; color:#9B9C9E; cursor:pointer; padding:6px; border-radius:8px; }
        .jd-close:hover { color:#12151B; background:#F1F1EC; }

        .jd-preview { margin:14px 22px 0; display:flex; align-items:flex-start; gap:7px; padding:9px 12px; background:#F1F1EC; border-radius:9px; font-size:10.5px; font-family:'JetBrains Mono',monospace; color:#63666E; flex-shrink:0; }
        .jd-preview strong { color:#0A7E96; }

        .jd-stepper { display:flex; align-items:center; padding:16px 22px 0; gap:6px; flex-shrink:0; }
        .jd-step { flex:1; display:flex; flex-direction:column; align-items:center; gap:6px; cursor:pointer; }
        .jd-step-dot { width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; font-family:'JetBrains Mono',monospace; border:2px solid #E4E1D9; color:#9B9C9E; background:#fff; transition: all .2s ease; }
        .jd-step.done .jd-step-dot { background:#12151B; border-color:#12151B; color:#fff; }
        .jd-step.active .jd-step-dot { border-color:#0BA5C9; color:#0BA5C9; }
        .jd-step-label { font-size:9.5px; font-weight:600; color:#9B9C9E; }
        .jd-step.active .jd-step-label { color:#12151B; }
        .jd-step-line { flex:1; height:2px; background:#E4E1D9; margin-top:-18px; }
        .jd-step-line.done { background:#12151B; }

        .jd-form { padding:18px 22px 20px; overflow-y:auto; flex:1; display:flex; flex-direction:column; gap:15px; animation: jdStepIn .25s ease both; }

        .jd-label { display:block; font-size:10px; font-weight:700; color:#9B9C9E; text-transform:uppercase; letter-spacing:.04em; margin-bottom:6px; }
        .jd-input, .jd-textarea { width:100%; box-sizing:border-box; background:#fff; border:1px solid #E4E1D9; border-radius:10px; padding:9px 11px; font-size:12px; font-weight:500; color:#12151B; outline:none; font-family:inherit; transition: border-color .15s ease; }
        .jd-input.error { border-color:#E85D3D; background:#FDEEE9; }
        .jd-input:focus, .jd-textarea:focus { border-color:#12151B; }
        .jd-textarea { resize:none; line-height:1.5; }
        .jd-error-text { font-size:10px; color:#E85D3D; margin-top:4px; }

        .jd-pick-grid4 { display:grid; grid-template-columns:repeat(4,1fr); gap:6px; }
        .jd-pick-grid2 { display:grid; grid-template-columns:repeat(2,1fr); gap:8px; }
        .jd-pick { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; padding:10px 6px; border-radius:10px; cursor:pointer; border:1px solid #E4E1D9; background:#fff; color:#9B9C9E; transition: all .15s ease; }
        .jd-pick.active { border-color:#0BA5C9; background:#E9F7FA; color:#0A7E96; }
        .jd-pick-row { display:flex; align-items:center; gap:8px; padding:10px 12px; border-radius:10px; cursor:pointer; border:1px solid #E4E1D9; background:#fff; color:#3A3D44; transition: all .15s ease; text-align:left; }
        .jd-pick-row.active { border-color:#0BA5C9; background:#E9F7FA; color:#0A7E96; }

        .jd-tags { display:flex; flex-wrap:wrap; gap:6px; align-items:center; padding:8px 10px; background:#fff; border:1px solid #E4E1D9; border-radius:10px; min-height:42px; }
        .jd-tag { display:inline-flex; align-items:center; gap:4px; font-size:10.5px; font-weight:500; padding:3px 8px; border-radius:6px; background:#F1F1EC; color:#3A3D44; animation: jdTagIn .15s ease; }
        .jd-tag.bonus { background:#FFF6E8; color:#9A5B0A; }
        .jd-tag button { background:none; border:none; cursor:pointer; padding:0; display:flex; color:inherit; }
        .jd-tag-input { border:none; outline:none; background:none; font-size:12px; flex:1; min-width:130px; color:#12151B; font-family:inherit; }

        .jd-location-dropdown { position:absolute; top:100%; left:0; right:0; margin-top:4px; z-index:10; background:#fff; border:1px solid #E4E1D9; border-radius:10px; box-shadow:0 8px 24px -8px rgba(18,21,27,0.18); max-height:200px; overflow-y:auto; }
        .jd-location-opt { display:block; width:100%; text-align:left; padding:9px 12px; border:none; background:none; cursor:pointer; font-size:12px; color:#3A3D44; }
        .jd-location-opt:hover { background:#F1F1EC; }

        .jd-ai-row { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
        .jd-ai-hint { font-size:11px; font-weight:600; color:#9B9C9E; }
        .jd-ai-btn { display:flex; align-items:center; gap:7px; font-size:11.5px; font-weight:700; background:#12151B; color:#fff; border:none; border-radius:10px; padding:8px 14px; cursor:pointer; }
        .jd-ai-btn:hover { background:#2A2E37; }
        .jd-ai-btn:disabled { opacity:0.5; cursor:default; }
        .jd-spin { animation: jdSpin 0.9s linear infinite; }

        .jd-shimmer-line { height:11px; border-radius:5px; margin-bottom:7px; background: linear-gradient(90deg, #F1F1EC 25%, #E4E1D9 37%, #F1F1EC 63%); background-size:400px 100%; animation: jdShimmer 1.3s ease-in-out infinite; }

        .jd-review { background:#E9F7FA; border:1px solid rgba(11,165,201,0.25); border-radius:14px; padding:14px; display:flex; flex-direction:column; gap:10px; }
        .jd-review-head { display:flex; align-items:center; justify-content:space-between; }
        .jd-review-title { display:flex; align-items:center; gap:7px; font-size:12px; font-weight:700; color:#0A7E96; }
        .jd-review-tag { font-size:9px; font-weight:700; letter-spacing:.04em; text-transform:uppercase; color:#0A7E96; background:#fff; border:1px solid rgba(11,165,201,0.3); padding:3px 7px; border-radius:6px; }
        .jd-review-textarea { width:100%; box-sizing:border-box; background:#fff; border:1px solid rgba(11,165,201,0.3); border-radius:10px; padding:11px; font-size:12px; color:#3A3D44; line-height:1.55; outline:none; resize:none; font-family:inherit; }
        .jd-review-actions { display:flex; justify-content:flex-end; gap:8px; }
        .jd-review-cancel { font-size:11px; font-weight:700; color:#63666E; background:#fff; border:1px solid #E4E1D9; border-radius:9px; padding:7px 13px; cursor:pointer; }
        .jd-review-approve { display:flex; align-items:center; gap:6px; font-size:11px; font-weight:700; color:#fff; background:#1F8A5C; border:none; border-radius:9px; padding:7px 14px; cursor:pointer; }

        .jd-footer { padding:14px 22px; border-top:1px solid #E4E1D9; background:#F6F5F1; display:flex; align-items:center; justify-content:space-between; gap:10px; flex-shrink:0; }
        .jd-back-btn { display:flex; align-items:center; gap:5px; font-size:12px; font-weight:600; color:#63666E; background:none; border:none; cursor:pointer; padding:8px 4px; }
        .jd-back-btn:hover { color:#12151B; }
        .jd-next-btn, .jd-submit-btn { display:flex; align-items:center; gap:7px; padding:10px 18px; border:none; border-radius:11px; background:#12151B; color:#fff; font-size:12.5px; font-weight:700; cursor:pointer; margin-left:auto; }
        .jd-next-btn:hover, .jd-submit-btn:hover { background:#2A2E37; }
        .jd-next-btn.shake { animation: jdShake .4s ease; }
      `}</style>

      <div className="jd-modal">
        <div className="jd-header">
          <span className="jd-header-title">
            <FileText size={16} color="#0A7E96" />
            {editingJob ? t.editTitle : t.newTitle}
          </span>
          <button className="jd-close" onClick={onClose} aria-label={t.close}>
            <X size={17} />
          </button>
        </div>

        {previewVisible && (
          <div className="jd-preview">
            <Sparkles size={12} color="#0A7E96" style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              <strong>{t.previewLabel}:</strong> site:linkedin.com/in {(seniority || '').split(' ')[0]} "{title || '...'}"
              {skills.length > 0 && ` (${skills.slice(0, 3).join(' AND ')})`}
              {niceToHaveSkills.length > 0 && ` (${niceToHaveSkills.slice(0, 3).join(' OR ')})`}
              {location ? ` ${location}` : ''}
              <strong> · {maxResults} {t.profilesUnit}</strong>
              {seniorityYears && <span style={{ color: '#9B9C9E' }}> ({seniorityYears})</span>}
            </span>
          </div>
        )}

        <div className="jd-stepper">
          {t.stepLabels.map((label, i) => (
            <React.Fragment key={label}>
              <button
                type="button"
                className={`jd-step${step === i ? ' active' : ''}${step > i ? ' done' : ''}`}
                onClick={() => goToStep(i)}
              >
                <div className="jd-step-dot">
                  {step > i ? <Check size={12} /> : i + 1}
                </div>
                <div className="jd-step-label">{label}</div>
              </button>
              {i < t.stepLabels.length - 1 && (
                <div className={`jd-step-line${step > i ? ' done' : ''}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        <form className="jd-form" key={step} onSubmit={handleSubmit}>
          {step === 0 && (
            <>
              <div>
                <label className="jd-label">{t.professionTitle} *</label>
                <input
                  className={`jd-input${titleErr ? ' error' : ''}`}
                  value={title}
                  onChange={e => {
                    setTitle(e.target.value);
                    setTitleErr(false);
                  }}
                  placeholder={t.titlePh}
                />
                {titleErr && <div className="jd-error-text">{t.titleRequired}</div>}
              </div>

              <div>
                <label className="jd-label">{t.seniority}</label>
                <div className="jd-pick-grid4">
                  {t.seniorityOpts.map((opt, idx) => {
                    const Icon = SENIORITY_ICONS[idx] || User;
                    const parenIndex = opt.indexOf('(');
                    const years = parenIndex !== -1 
                      ? opt.substring(parenIndex + 1, opt.indexOf(')', parenIndex))
                      : '';

                    return (
                      <button
                        type="button"
                        key={opt}
                        className={`jd-pick${seniority === opt ? ' active' : ''}`}
                        onClick={() => setSeniority(opt)}
                        role="button"
                        tabIndex={0}
                      >
                        <Icon size={16} />
                        <span style={{ fontSize: 10, fontWeight: 600 }}>{t.seniorityShort[idx]}</span>
                        {years && <span style={{ fontSize: 9 }}>{years}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="jd-label">{t.contractType}</label>
                <div className="jd-pick-grid2">
                  {t.contractOpts.map(opt => {
                    const Icon = CONTRACT_ICON_MAP[t.contractIcons[opt]] || Briefcase;

                    return (
                      <button
                        type="button"
                        key={opt}
                        className={`jd-pick-row${contractType === opt ? ' active' : ''}`}
                        onClick={() => setContractType(opt)}
                      >
                        <Icon size={16} />
                        <span style={{ fontSize: 11.5, fontWeight: 600 }}>{opt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div>
                <label className="jd-label">{t.location}</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="jd-input"
                    value={location}
                    onChange={e => handleLocationChange(e.target.value)}
                    onFocus={() => location.length >= 2 && setShowLocationDropdown(true)}
                    onBlur={() => setTimeout(() => setShowLocationDropdown(false), 150)}
                    placeholder={t.locationPh}
                    autoComplete="off"
                  />

                  {showLocationDropdown && (isLoadingLocations || locationSuggestions.length > 0) && (
                    <div className="jd-location-dropdown">
                      {isLoadingLocations ? (
                        <div style={{ padding: '9px 12px', fontSize: 11.5, color: '#9B9C9E' }}>
                          {t.searching}
                        </div>
                      ) : (
                        locationSuggestions.map((s, idx) => (
                          <button
                            type="button"
                            key={idx}
                            className="jd-location-opt"
                            onMouseDown={e => e.preventDefault()}
                            onClick={() => selectLocation(s)}
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
                <label className="jd-label">{t.skills}</label>
                <div className="jd-tags">
                  {skills.map(s => (
                    <span className="jd-tag" key={s}>
                      {s}
                      <button type="button" onClick={() => removeSkill(s)} aria-label={`${t.skills} ${s}`}>
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                  <input
                    className="jd-tag-input"
                    value={skillInput}
                    onChange={e => setSkillInput(e.target.value)}
                    onKeyDown={handleSkillKeyDown}
                    onBlur={addSkill}
                    placeholder={skills.length === 0 ? t.skillsPh : t.skillsAdded}
                  />
                </div>
              </div>

              <div>
                <label className="jd-label">{t.niceToHaveSkills}</label>
                <div className="jd-tags">
                  {niceToHaveSkills.map(s => (
                    <span className="jd-tag bonus" key={s}>
                      {s}
                      <button
                        type="button"
                        onClick={() => removeNiceSkill(s)}
                        aria-label={`${t.niceToHaveSkills} ${s}`}
                      >
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                  <input
                    className="jd-tag-input"
                    value={niceToHaveSkillInput}
                    onChange={e => setNiceToHaveSkillInput(e.target.value)}
                    onKeyDown={handleNiceSkillKeyDown}
                    onBlur={addNiceSkill}
                    placeholder={t.niceToHaveSkillsPh}
                  />
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="jd-ai-row">
                <span className="jd-ai-hint">{t.helpDraft}</span>

                <button
                  type="button"
                  className="jd-ai-btn"
                  onClick={handleGeneratePrompt}
                  disabled={isGenerating || !title.trim()}
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw size={13} className="jd-spin" />
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

              {isGenerating && (
                <div>
                  <div className="jd-shimmer-line" style={{ width: '95%' }} />
                  <div className="jd-shimmer-line" style={{ width: '80%' }} />
                  <div className="jd-shimmer-line" style={{ width: '88%' }} />
                </div>
              )}

              {showPromptConfirm && generatedPromptPreview && (
                <div className="jd-review">
                  <div className="jd-review-head">
                    <span className="jd-review-title">
                      <Sparkles size={14} />
                      {t.reviewTitle}
                    </span>
                    <span className="jd-review-tag">{t.reviewTag}</span>
                  </div>

                  <textarea
                    className="jd-review-textarea"
                    rows="4"
                    value={generatedPromptPreview}
                    onChange={e => setGeneratedPromptPreview(e.target.value)}
                  />

                  <div className="jd-review-actions">
                    <button
                      type="button"
                      className="jd-review-cancel"
                      onClick={() => setShowPromptConfirm(false)}
                    >
                      {t.cancel}
                    </button>

                    <button
                      type="button"
                      className="jd-review-approve"
                      onClick={handleConfirmPrompt}
                    >
                      <CheckCircle2 size={13} />
                      <span>{t.approve}</span>
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="jd-label">{t.descLabel}</label>
                <textarea
                  className="jd-textarea"
                  rows="4"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder={t.descPh}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label
                    className="jd-label"
                    style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: 5 }}
                  >
                    <Users size={12} />
                    {t.targetProfiles}
                  </label>

                  <span
                    style={{
                      fontFamily: 'JetBrains Mono,monospace',
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#0A7E96',
                    }}
                  >
                    {maxResults} {t.profilesUnit}
                  </span>
                </div>

                <input
                  type="range"
                  min="1"
                  max="25"
                  value={maxResults}
                  onChange={e => setMaxResults(Number(e.target.value))}
                  style={{
                    width: '100%',
                    accentColor: '#0BA5C9',
                    marginBottom: 8,
                  }}
                />

                <div style={{ display: 'flex', gap: 6 }}>
                  {[3, 5, 10, 15, 20].map(count => (
                    <button
                      type="button"
                      key={count}
                      onClick={() => setMaxResults(count)}
                      style={{
                        flex: 1,
                        textAlign: 'center',
                        padding: '6px 0',
                        fontSize: 11,
                        fontWeight: maxResults === count ? 700 : 500,
                        borderRadius: 8,
                        border: maxResults === count
                          ? '1px solid #0BA5C9'
                          : '1px solid #E4E1D9',
                        background: maxResults === count ? '#E9F7FA' : '#fff',
                        color: maxResults === count ? '#0A7E96' : '#63666E',
                        cursor: 'pointer',
                      }}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </form>

        <div className="jd-footer">
          {step > 0 ? (
            <button
              type="button"
              className="jd-back-btn"
              onClick={() => setStep(s => s - 1)}
            >
              <ChevronLeft size={14} />
              {t.back}
            </button>
          ) : (
            <span />
          )}

          {step < 2 ? (
            <button
              type="button"
              className={`jd-next-btn${titleErr ? ' shake' : ''}`}
              onClick={goNext}
            >
              {t.next}
              <ChevronRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              className="jd-submit-btn"
              onClick={handleSubmit}
            >
              <Plus size={15} />
              <span>{editingJob ? t.saveChanges : t.createAndSource}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default JobDescriptionModal;
