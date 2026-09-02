import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Search, Sparkles, Filter, SlidersHorizontal, MapPin, Briefcase, RotateCcw, Users } from 'lucide-react';

export function SearchConsole({ onSearch = () => {}, isSearching = false, selectedJob = null }) {
  const { lang, t } = useLanguage();
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('All Locations');
  const [minExp, setMinExp] = useState(3);
  const [maxResults, setMaxResults] = useState(10);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTech, setSelectedTech] = useState([]);
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

  // Sync default location, tech, and prompt from selectedJob when it changes
  useEffect(() => {
    if (selectedJob) {
      if (selectedJob.location && selectedJob.location !== 'All Locations') {
        setLocation(selectedJob.location);
      }
      if (selectedJob.skills && selectedJob.skills.length > 0) {
        setSelectedTech(selectedJob.skills);
      }
      // Pre-fill the search query with the job's sourcing prompt/description
      const jobPrompt = selectedJob.description || selectedJob.prompt || '';
      if (jobPrompt.trim()) {
        setQuery(jobPrompt.trim());
      }
    } else {
      setQuery('');
    }
  }, [selectedJob?.id]);

  const QUICK_PROMPTS = lang === 'FR' ? [
    selectedJob ? `Expert ${selectedJob.title} avec 5+ ans d'expérience` : "Chef de Projet Marketing Digital & Strategy",
    selectedJob ? `Candidat disponible immédiatement pour ${selectedJob.title}` : "Ingénieur Full-Stack React & Spring Boot",
    selectedJob ? `Expertise ${selectedJob.skills?.join(', ') || 'professionnelle'} éprouvée` : "Responsable RH & Talent Acquisition Specialist"
  ] : [
    selectedJob ? `Senior ${selectedJob.title} with 5+ years experience` : "Senior Digital Marketing & Strategy Lead",
    selectedJob ? `Immediately available candidate for ${selectedJob.title}` : "Full-Stack Engineer (React & Spring Boot)",
    selectedJob ? `Proven ${selectedJob.skills?.join(', ') || 'professional'} expertise` : "HR Manager & Talent Acquisition Lead"
  ];

  const TECH_TAGS = ['Java & Spring', 'React', 'Digital Marketing', 'Financial Analysis', 'HR & Recruiting', 'Sales & BD', 'Python', 'Project Management'];

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(query, { location, minExp, tech: selectedTech, maxResults }, selectedJob?.id);
  };

  const handleQuickPrompt = (promptText) => {
    setQuery(promptText);
    onSearch(promptText, { location, minExp, tech: selectedTech, maxResults }, selectedJob?.id);
  };

  const toggleTech = (tag) => {
    if (selectedTech.includes(tag)) {
      setSelectedTech(selectedTech.filter(t => t !== tag));
    } else {
      setSelectedTech([...selectedTech, tag]);
    }
  };

  const handleReset = () => {
    const jobPrompt = selectedJob?.description || selectedJob?.prompt || '';
    setQuery(jobPrompt.trim());
    setLocation(selectedJob?.location || 'All Locations');
    setMinExp(3);
    setMaxResults(10);
    setSelectedTech(selectedJob?.skills || []);
  };

  return (
    <div className="dg-root dgsc-root">
      <style>{`
        .dg-root {
          --dg-paper: #F6F7F9; --dg-surface: #FFFFFF; --dg-sunken: #EFF1F4;
          --dg-border: #E3E6EB; --dg-border-strong: #CBD2DC;
          --dg-ink-900: #10151F; --dg-ink-700: #38414F; --dg-ink-500: #6B7280; --dg-ink-400: #96A0AC;
          --dg-teal-700: #0A5C68; --dg-teal-600: #0E7C8C; --dg-teal-100: #E1F2F3;
          --dg-green-700: #1F6E4A; --dg-green-600: #278F5E; --dg-green-100: #E3F5EC;
          --font-display: 'Space Grotesk', 'Inter', sans-serif;
          --font-body: 'Inter', system-ui, sans-serif;
          --font-mono: 'JetBrains Mono', ui-monospace, monospace;
          font-family: var(--font-body); color: var(--dg-ink-900);
        }
        .dg-display { font-family: var(--font-display); letter-spacing: -0.01em; }
        .dgsc-root {
          background: var(--dg-surface); border: 1px solid var(--dg-border); border-radius: 18px;
          padding: 20px; margin-bottom: 20px; display: flex; flex-direction: column; gap: 14px;
        }

        .dgsc-job-banner {
          background: var(--dg-paper); border: 1px solid var(--dg-border); border-radius: 12px;
          padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 12px;
        }
        .dgsc-job-info { display: flex; align-items: center; gap: 8px; min-width: 0; }
        .dgsc-job-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--dg-teal-600); flex-shrink: 0; }
        .dgsc-job-title { font-weight: 700; color: var(--dg-ink-900); }

        .dgsc-filter-toggle {
          display: flex; align-items: center; gap: 5px; font-size: 11.5px; font-weight: 600;
          background: var(--dg-surface); border: 1px solid var(--dg-border); border-radius: 9px;
          padding: 5px 11px; color: var(--dg-ink-700); cursor: pointer; transition: background .15s ease;
        }
        .dgsc-filter-toggle:hover { background: var(--dg-sunken); }
        .dgsc-filter-toggle-active { background: var(--dg-teal-100); color: var(--dg-teal-700); border-color: rgba(14,124,140,0.3); }

        .dgsc-bar {
          display: flex; align-items: center; background: var(--dg-paper); border: 1px solid var(--dg-border);
          border-radius: 13px; padding: 4px 6px 4px 14px; gap: 10px; transition: border-color .15s ease, background .15s ease;
        }
        .dgsc-bar:focus-within { border-color: var(--dg-teal-600); background: var(--dg-surface); }
        .dgsc-input {
          flex: 1; background: none; border: none; font-size: 12.5px; font-weight: 500; color: var(--dg-ink-900);
          outline: none; font-family: var(--font-body);
        }
        .dgsc-input::placeholder { color: var(--dg-ink-400); }

        .dgsc-submit-btn {
          display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700;
          background: var(--dg-ink-900); color: #fff; border: none; border-radius: 10px;
          padding: 9px 18px; cursor: pointer; transition: background .15s ease; flex-shrink: 0;
        }
        .dgsc-submit-btn:hover { background: #232C3A; }
        .dgsc-submit-btn:disabled { opacity: 0.6; cursor: default; }

        .dgsc-quick-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: 11px; }
        .dgsc-quick-label { color: var(--dg-ink-400); font-weight: 600; }
        .dgsc-quick-btn {
          color: var(--dg-ink-700); font-weight: 500; background: var(--dg-paper); border: 1px solid var(--dg-border);
          border-radius: 8px; padding: 3px 9px; cursor: pointer; transition: color .15s ease, border-color .15s ease;
        }
        .dgsc-quick-btn:hover { color: var(--dg-teal-700); border-color: var(--dg-teal-600); }

        .dgsc-filters-panel {
          padding-top: 14px; border-top: 1px solid var(--dg-border); display: grid;
          grid-template-columns: repeat(4, 1fr); gap: 16px;
        }
        .dgsc-field-label { display: flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 700; color: var(--dg-ink-500); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
        .dgsc-field-input {
          width: 100%; box-sizing: border-box; background: var(--dg-paper); border: 1px solid var(--dg-border);
          border-radius: 9px; padding: 8px 11px; font-size: 12px; color: var(--dg-ink-900); outline: none;
        }
        .dgsc-tech-tags { display: flex; flex-wrap: wrap; gap: 5px; }
        .dgsc-tech-chip {
          font-family: var(--font-mono); font-size: 10px; font-weight: 500; padding: 3px 8px; border-radius: 6px;
          border: 1px solid var(--dg-border); background: var(--dg-paper); color: var(--dg-ink-700); cursor: pointer;
        }
        .dgsc-tech-chip-active { background: var(--dg-teal-100); color: var(--dg-teal-700); border-color: rgba(14,124,140,0.3); }

        @media (max-width: 1024px) {
          .dgsc-filters-panel { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 640px) {
          .dgsc-filters-panel { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* Active Job Context Banner */}
      {selectedJob && (
        <div className="dgsc-job-banner">
          <div className="dgsc-job-info">
            <span className="dgsc-job-dot" />
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--dg-ink-400)' }}>
              {lang === 'FR' ? 'Cible :' : 'Target:'}
            </span>
            <span className="dgsc-job-title dg-display">{selectedJob.title}</span>
            <span style={{ color: 'var(--dg-ink-400)' }}>•</span>
            <span style={{ color: 'var(--dg-ink-500)' }}>{selectedJob.location || 'All Locations'}</span>
          </div>

          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={'dgsc-filter-toggle' + (showFilters || selectedTech.length > 0 ? ' dgsc-filter-toggle-active' : '')}
          >
            <SlidersHorizontal size={12} />
            <span>{lang === 'FR' ? 'Filtres' : 'Filters'}</span>
            {(selectedTech.length > 0 || location !== 'All Locations') && (
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--dg-teal-600)' }} />
            )}
          </button>
        </div>
      )}

      {/* Main Search Bar */}
      <form onSubmit={handleSubmit}>
        <div className="dgsc-bar">
          <Search size={15} color="var(--dg-teal-600)" style={{ flexShrink: 0 }} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={selectedJob ? (lang === 'FR' ? `Rédigez ou ajustez le prompt pour "${selectedJob.title}"...` : `Type or adjust sourcing prompt for "${selectedJob.title}"...`) : t('searchPlaceholder')}
            className="dgsc-input"
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {!selectedJob && (
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={'dgsc-filter-toggle' + (showFilters || selectedTech.length > 0 || location !== 'All Locations' || maxResults !== 10 ? ' dgsc-filter-toggle-active' : '')}
                style={{ padding: '6px 10px' }}
              >
                <SlidersHorizontal size={12} />
                <span>{lang === 'FR' ? 'Filtres' : 'Filters'}</span>
              </button>
            )}
            {query && (
              <button
                type="button"
                onClick={handleReset}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dg-ink-400)', padding: 4 }}
                title="Clear Search"
              >
                <RotateCcw size={13} />
              </button>
            )}
            <button
              type="submit"
              disabled={isSearching}
              className="dgsc-submit-btn"
            >
              {isSearching ? (
                <>
                  <div style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  <span>{t('sourcingProgress')}</span>
                </>
              ) : (
                <>
                  <Sparkles size={13} />
                  <span>{t('sourcingBtn')}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Quick Prompts */}
      <div className="dgsc-quick-row">
        <span className="dgsc-quick-label">{t('quickPrompts')}</span>
        {QUICK_PROMPTS.map((promptText, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleQuickPrompt(promptText)}
            className="dgsc-quick-btn"
          >
            {promptText}
          </button>
        ))}
      </div>

      {/* Expandable Advanced Filters Panel */}
      {showFilters && (
        <div className="dgsc-filters-panel">
          <div>
            <label className="dgsc-field-label"><MapPin size={12} />{t('targetLocation')}</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Casablanca, Rabat, Paris, Remote..."
              className="dgsc-field-input"
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyBetween: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label className="dgsc-field-label" style={{ marginBottom: 0 }}><Briefcase size={12} />{t('minExperience')}</label>
              <span className="dg-mono" style={{ fontSize: 10, fontWeight: 700, color: 'var(--dg-teal-700)' }}>
                {minExp}+ {t('years')}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="12"
              value={minExp}
              onChange={(e) => setMinExp(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--dg-teal-600)', cursor: 'pointer' }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label className="dgsc-field-label" style={{ marginBottom: 0 }}>
                <Users size={12} />
                {lang === 'FR' ? 'Candidats ciblés' : 'Target Results'}
              </label>
              <span className="dg-mono" style={{ fontSize: 10, fontWeight: 700, color: 'var(--dg-teal-700)' }}>
                {maxResults} {lang === 'FR' ? 'profils' : 'profiles'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 5, marginTop: 4 }}>
              {[5, 10, 15, 20].map((count) => {
                const isSelected = maxResults === count;
                return (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setMaxResults(count)}
                    className={'dgsc-tech-chip' + (isSelected ? ' dgsc-tech-chip-active' : '')}
                    style={{ flex: 1, textAlign: 'center', padding: '6px 0', fontSize: 11, fontWeight: isSelected ? 700 : 500 }}
                  >
                    {count}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="dgsc-field-label"><Filter size={12} />{t('mustHaveSkills')}</label>
            <div className="dgsc-tech-tags">
              {TECH_TAGS.map((tag) => {
                const isSelected = selectedTech.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTech(tag)}
                    className={'dgsc-tech-chip' + (isSelected ? ' dgsc-tech-chip-active' : '')}
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
}

export default SearchConsole;

