import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Search, Sparkles, Filter, SlidersHorizontal, MapPin, Briefcase, RotateCcw, FileText, Target } from 'lucide-react';

export const SearchConsole = ({ onSearch, isSearching, selectedJob }) => {
  const { lang, t } = useLanguage();
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('All Locations');
  const [minExp, setMinExp] = useState(3);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTech, setSelectedTech] = useState([]);

  // Sync default location and tech from selectedJob when it changes
  useEffect(() => {
    if (selectedJob) {
      if (selectedJob.location && selectedJob.location !== 'All Locations') {
        setLocation(selectedJob.location);
      }
      if (selectedJob.skills && selectedJob.skills.length > 0) {
        setSelectedTech(selectedJob.skills);
      }
    }
  }, [selectedJob?.id]);

  const QUICK_PROMPTS = lang === 'FR' ? [
    selectedJob ? `Expert ${selectedJob.title} avec 5+ ans d'expérience` : "Ingénieurs Java & Spring Boot Senior à Casablanca",
    selectedJob ? `Candidat disponible immédiatement pour ${selectedJob.title}` : "Développeurs Full-Stack React & TypeScript",
    selectedJob ? `Expertise ${selectedJob.skills?.join(', ') || 'technique'} éprouvée` : "DevOps / SRE avec Docker & Kubernetes"
  ] : [
    selectedJob ? `Senior ${selectedJob.title} with 5+ years experience` : "Senior Java & Spring Boot Engineers in Casablanca",
    selectedJob ? `Immediately available candidate for ${selectedJob.title}` : "Full-Stack React & TypeScript Developers",
    selectedJob ? `Proven ${selectedJob.skills?.join(', ') || 'technical'} expertise` : "DevOps / SRE with Docker & Kubernetes"
  ];

  const TECH_TAGS = ['Java', 'Spring Boot', 'React', 'Docker', 'Python', 'AWS', 'TypeScript', 'PostgreSQL'];

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(query, { location, minExp, tech: selectedTech }, selectedJob?.id);
  };

  const handleQuickPrompt = (promptText) => {
    setQuery(promptText);
    onSearch(promptText, { location, minExp, tech: selectedTech }, selectedJob?.id);
  };

  const toggleTech = (tag) => {
    if (selectedTech.includes(tag)) {
      setSelectedTech(selectedTech.filter(t => t !== tag));
    } else {
      setSelectedTech([...selectedTech, tag]);
    }
  };

  const handleReset = () => {
    setQuery('');
    setLocation(selectedJob?.location || 'All Locations');
    setMinExp(3);
    setSelectedTech(selectedJob?.skills || []);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/70 p-5 mb-6 transition-all shadow-2xs">
      
      {/* Sleek Active Job Context Banner */}
      {selectedJob && (
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2 mb-4 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-brand-primary shrink-0 animate-pulse" />
            <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider shrink-0">
              {lang === 'FR' ? 'Cible :' : 'Target:'}
            </span>
            <span className="font-black text-slate-900 font-jakarta truncate">
              {selectedJob.title}
            </span>
            <span className="text-slate-400 hidden sm:inline">•</span>
            <span className="text-slate-500 font-semibold truncate hidden sm:inline">
              {selectedJob.location || 'All Locations'}
            </span>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                showFilters || selectedTech.length > 0
                  ? 'bg-brand-light-blue/40 text-brand-primary border-brand-mid-blue/30'
                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>{showFilters ? (lang === 'FR' ? 'Filtres' : 'Filters') : (lang === 'FR' ? 'Filtres' : 'Filters')}</span>
              {(selectedTech.length > 0 || location !== 'All Locations') && (
                <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Main Search Bar */}
      <form onSubmit={handleSubmit} className="mb-3">
        <div className="relative flex items-center bg-slate-50/80 border border-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-brand-primary/10 focus-within:border-brand-primary focus-within:bg-white transition-all p-1">
          <div className="pl-3 text-slate-400">
            <Search className="w-4 h-4 text-brand-primary" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={selectedJob ? (lang === 'FR' ? `Rédigez ou ajustez le prompt de sourcing pour "${selectedJob.title}"...` : `Type or adjust sourcing prompt for "${selectedJob.title}"...`) : t('searchPlaceholder')}
            className="w-full bg-transparent border-none text-slate-800 text-xs py-2 px-2.5 focus:outline-none font-semibold placeholder:text-slate-400"
          />
          <div className="flex items-center space-x-2">
            {query && (
              <button
                type="button"
                onClick={handleReset}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 cursor-pointer"
                title="Clear Search"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="submit"
              disabled={isSearching}
              className="flex items-center space-x-1.5 bg-brand-primary hover:bg-brand-deep-blue text-white font-bold text-xs px-4 py-2 rounded-lg transition-all cursor-pointer disabled:opacity-50 shrink-0"
            >
              {isSearching ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{t('sourcingProgress')}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-brand-light-blue" />
                  <span>{t('sourcingBtn')}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Quick Prompts */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold text-slate-400">
          {t('quickPrompts')}
        </span>
        {QUICK_PROMPTS.map((promptText, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleQuickPrompt(promptText)}
            className="text-[11px] hover:text-brand-primary text-slate-500 font-semibold cursor-pointer underline decoration-dotted underline-offset-2 decoration-slate-300 hover:decoration-brand-primary"
          >
            {promptText}
          </button>
        ))}
      </div>

      {/* Expandable Advanced Filters Panel */}
      {showFilters && (
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-5 animate-fadeIn">
          
          {/* Location */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1.5 flex items-center gap-1 uppercase tracking-wider">
              <MapPin className="w-3.5 h-3.5 text-brand-primary/70" />
              {t('targetLocation')}
            </label>
            <div className="relative">
              <input
                type="text"
                list="location-suggestions"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Casablanca, Morocco, France, All Locations..."
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg p-2 font-semibold focus:border-brand-primary outline-none transition-all placeholder:text-slate-400"
              />
              <datalist id="location-suggestions">
                <option value="All Locations" />
                <option value="Casablanca, Morocco" />
                <option value="Rabat, Morocco" />
                <option value="Tangier, Morocco" />
                <option value="Marrakech, Morocco" />
                <option value="Agadir, Morocco" />
                <option value="Fes, Morocco" />
                <option value="Remote" />
              </datalist>
            </div>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {['All Locations', 'Casablanca', 'Rabat', 'Tangier', 'Remote'].map((locChip) => (
                <button
                  key={locChip}
                  type="button"
                  onClick={() => setLocation(locChip === 'All Locations' ? 'All Locations' : locChip === 'Remote' ? 'Remote' : `${locChip}, Morocco`)}
                  className={`text-[9px] px-1.5 py-0.5 rounded font-bold transition-all cursor-pointer ${
                    location.includes(locChip)
                      ? 'bg-brand-primary/15 text-brand-primary border border-brand-primary/30'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {locChip}
                </button>
              ))}
            </div>
          </div>

          {/* Min Experience */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1 uppercase tracking-wider">
                <Briefcase className="w-3.5 h-3.5 text-brand-primary/70" />
                {t('minExperience')}
              </label>
              <span className="text-[10px] font-extrabold text-brand-primary bg-brand-light-blue/40 px-2 py-0.5 rounded border border-brand-mid-blue/10">
                {minExp}+ {t('years')}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="12"
              value={minExp}
              onChange={(e) => setMinExp(Number(e.target.value))}
              className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-primary"
            />
          </div>

          {/* Tech Stack Pills */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1.5 flex items-center gap-1 uppercase tracking-wider">
              <Filter className="w-3.5 h-3.5 text-brand-primary/70" />
              {t('mustHaveSkills')}
            </label>
            <div className="flex flex-wrap gap-1">
              {TECH_TAGS.map((tag) => {
                const isSelected = selectedTech.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTech(tag)}
                    className={`text-[10px] px-2 py-1 rounded-md font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-brand-primary text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
