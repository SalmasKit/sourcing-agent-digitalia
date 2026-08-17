import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { X, FileText, Plus, Sparkles, CheckCircle2, RefreshCw, Wand2, Edit3, ArrowRight } from 'lucide-react';

export const JobDescriptionModal = ({ isOpen, onClose, onCreate, onEdit, editingJob = null }) => {
  const { lang, t } = useLanguage();
  const isFR = lang === 'FR';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('All Locations');
  const [skills, setSkills] = useState('');
  const [seniority, setSeniority] = useState('Senior');
  const [contractType, setContractType] = useState('CDI / Permanent');
  
  // AI Generator state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPromptPreview, setGeneratedPromptPreview] = useState(null);
  const [showPromptConfirm, setShowPromptConfirm] = useState(false);

  useEffect(() => {
    if (editingJob) {
      setTitle(typeof editingJob.title === 'string' ? editingJob.title : String(editingJob.title || ''));
      setDescription(typeof editingJob.description === 'string' ? editingJob.description : String(editingJob.description || ''));
      setLocation(editingJob.location || 'All Locations');
      setSkills(Array.isArray(editingJob.skills) ? editingJob.skills.join(', ') : (typeof editingJob.skills === 'string' ? editingJob.skills : ''));
      setSeniority(editingJob.seniority || 'Senior');
      setContractType(editingJob.contractType || 'CDI / Permanent');
    } else {
      setTitle('');
      setDescription('');
      setLocation('All Locations');
      setSkills('');
      setSeniority('Senior');
      setContractType('CDI / Permanent');
    }
    setGeneratedPromptPreview(null);
    setShowPromptConfirm(false);
  }, [editingJob, isOpen]);

  if (!isOpen) return null;

  // AI Prompt Generation simulation based on user inputs
  const handleGeneratePrompt = () => {
    const safeTitle = String(title || '').trim();
    if (!safeTitle) return;
    setIsGenerating(true);

    setTimeout(() => {
      const safeSkills = String(skills || '').trim();
      const skillsList = safeSkills ? safeSkills : 'Java, Spring Boot, Microservices';
      const locText = (location && location !== 'All Locations') ? location : (isFR ? 'Toutes localisations' : 'All Locations');

      const generated = isFR ? [
        `Recherche un profil ${seniority} ${safeTitle} basé(e) à ${locText} (${contractType}).`,
        `Le candidat idéal possède une expertise approfondie en ${skillsList}.`,
        `Missions principales : conception et architecture d'applications haute performance, livraison CI/CD, et collaboration agile en équipe plurisdisciplinaire.`,
        `Profil recherché : esprit d'initiative, maîtrise des bonnes pratiques de clean code et capacité à mentorat des profils plus juniors.`
      ].join(' ') : [
        `Looking for a ${seniority} ${safeTitle} based in ${locText} (${contractType}).`,
        `The ideal candidate possesses deep expertise in ${skillsList}.`,
        `Key responsibilities: designing high-performance architectures, automated CI/CD deployments, and agile collaboration.`,
        `Expected candidate profile: strong initiative, clean code practices, and ability to mentor junior engineers.`
      ];

      setGeneratedPromptPreview(generated);
      setShowPromptConfirm(true);
      setIsGenerating(false);
    }, 800);
  };

  const handleConfirmPrompt = () => {
    if (generatedPromptPreview) {
      setDescription(String(generatedPromptPreview));
    }
    setShowPromptConfirm(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const safeTitle = String(title || '').trim();
    if (!safeTitle) return;

    let safeDesc = String(description || '').trim();
    if (!safeDesc && generatedPromptPreview) {
      safeDesc = String(generatedPromptPreview).trim();
    }
    if (!safeDesc) {
      const safeSkills = String(skills || '').trim();
      safeDesc = isFR
        ? `Recherche un profil ${seniority} ${safeTitle} à ${location} avec compétences en ${safeSkills || 'technologies clés'}.`
        : `Sourcing for ${seniority} ${safeTitle} in ${location} with expertise in ${safeSkills || 'key technologies'}.`;
    }

    const safeSkillsStr = String(skills || '');
    const jobData = {
      id: editingJob ? editingJob.id : `job-${Date.now()}`,
      title: safeTitle,
      description: safeDesc,
      location: location || 'All Locations',
      skills: safeSkillsStr.split(',').map(s => s.trim()).filter(Boolean),
      seniority,
      contractType,
      status: editingJob ? editingJob.status : 'active'
    };

    if (editingJob && onEdit) {
      onEdit(jobData);
    } else if (onCreate) {
      onCreate(jobData);
    }

    setTitle('');
    setDescription('');
    setLocation('All Locations');
    setSkills('');
    setShowPromptConfirm(false);
    setGeneratedPromptPreview(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden animate-fadeIn">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="font-extrabold text-slate-900 text-sm font-jakarta flex items-center gap-2">
            <FileText className="w-4.5 h-4.5 text-brand-primary" />
            <span>{editingJob ? t('editJobDescTitle') : t('newJobDesc')}</span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-655 p-1 rounded-lg cursor-pointer">
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Title */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              {t('professionTitle')} *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Senior Java & Cloud Architect"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold outline-none focus:border-brand-primary focus:bg-white transition-all"
            />
          </div>

          {/* Seniority & Contract Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                {isFR ? 'Séniorité' : 'Seniority Level'}
              </label>
              <select
                value={seniority}
                onChange={(e) => setSeniority(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-2.5 font-semibold outline-none focus:border-brand-primary"
              >
                <option value="Junior">Junior (0-2 ans)</option>
                <option value="Mid-Level">Mid-Level (2-5 ans)</option>
                <option value="Senior">Senior (5-8 ans)</option>
                <option value="Lead / Architect">Lead / Architect (8+ ans)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                {isFR ? 'Type de Contrat' : 'Contract Type'}
              </label>
              <select
                value={contractType}
                onChange={(e) => setContractType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-2.5 font-semibold outline-none focus:border-brand-primary"
              >
                <option value="CDI / Permanent">CDI / Permanent</option>
                <option value="CDD / Fixed-term">CDD / Fixed-term</option>
                <option value="Freelance / Contract">Freelance / Contract</option>
                <option value="Remote Full-time">Remote Full-time</option>
              </select>
            </div>
          </div>

          {/* Location & Skills */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                {isFR ? 'Localisation Cible' : 'Target Location'}
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Casablanca, Rabat, Paris, France, All Locations..."
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-2.5 font-semibold outline-none focus:border-brand-primary placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                {isFR ? 'Compétences Requises' : 'Required Tech (Comma-Separated)'}
              </label>
              <input
                type="text"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="e.g. Spring Boot, Docker, AWS"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold outline-none focus:border-brand-primary"
              />
            </div>
          </div>

          {/* AI Generator Action Button */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] font-bold text-slate-400">
              {isFR ? 'Besoin d\'aide pour rédiger ?' : 'Need help drafting the prompt?'}
            </span>
            <button
              type="button"
              onClick={handleGeneratePrompt}
              disabled={isGenerating || !title.trim()}
              className="flex items-center space-x-1.5 bg-gradient-to-r from-brand-primary to-brand-deep-blue text-white text-[11px] font-bold px-3.5 py-1.5 rounded-xl shadow-xs hover:opacity-95 transition-all cursor-pointer disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{isFR ? 'Génération IA...' : 'Generating...'}</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-3.5 h-3.5 text-brand-light-blue" />
                  <span>{isFR ? 'Générer le Prompt par IA' : 'Generate Prompt with AI'}</span>
                </>
              )}
            </button>
          </div>

          {/* AI Generated Prompt Confirmation Box */}
          {showPromptConfirm && generatedPromptPreview && (
            <div className="bg-brand-light-blue/30 border border-brand-mid-blue/40 rounded-2xl p-4 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-brand-primary font-bold text-xs">
                  <Sparkles className="w-4 h-4 animate-pulse text-brand-accent" />
                  <span>{isFR ? 'Prompt Généré par l\'Agent IA' : 'AI Agent Generated Prompt'}</span>
                </div>
                <span className="text-[9px] font-black uppercase text-brand-primary bg-white px-2 py-0.5 rounded-md border border-brand-mid-blue/30">
                  {isFR ? 'Vérification requise' : 'Review Required'}
                </span>
              </div>

              {/* Editable generated prompt area */}
              <textarea
                rows="4"
                value={generatedPromptPreview}
                onChange={(e) => setGeneratedPromptPreview(e.target.value)}
                className="w-full bg-white border border-brand-mid-blue/30 rounded-xl p-3 text-xs font-medium text-slate-700 leading-relaxed outline-none focus:ring-2 focus:ring-brand-primary/20"
              />

              <div className="flex items-center justify-end space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowPromptConfirm(false)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-xl cursor-pointer"
                >
                  {isFR ? 'Annuler' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPrompt}
                  className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-1.5 rounded-xl shadow-xs cursor-pointer transition-all"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isFR ? 'Approuver & Appliquer' : 'Approve & Apply Prompt'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Main Description Textarea */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              {t('jobDescriptionText')} / Sourcing Prompt
            </label>
            <textarea
              rows="4"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed responsibilities, expected tech stack, and ideal candidate profile..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold outline-none focus:border-brand-primary focus:bg-white resize-none transition-all"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-brand-primary hover:bg-brand-deep-blue text-white font-bold py-3 rounded-xl text-xs shadow-sm transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{editingJob ? (isFR ? 'Enregistrer les Modifications' : 'Save Changes') : t('createAndSource')}</span>
          </button>

        </form>

      </div>
    </div>
  );
};

