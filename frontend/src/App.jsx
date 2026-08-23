import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { Navbar } from './components/Navbar';
import { SearchConsole } from './components/SearchConsole';
import { AgentStatusWidget } from './components/AgentStatusWidget';
import { CandidateCard } from './components/CandidateCard';
import { CandidateDetailModal } from './components/CandidateDetailModal';
import { EditCandidateModal } from './components/EditCandidateModal';
import { JobDescriptionModal } from './components/JobDescriptionModal';
import { ShortlistPanel } from './components/ShortlistPanel';
import { KanbanPipeline } from './components/KanbanPipeline';
import { DashboardView } from './components/DashboardView';
import { CandidateComparator } from './components/CandidateComparator';
import { AuthModal } from './components/AuthModal';
import AuthPage from './components/AuthPage';
import { searchCandidatesApi, getInitialCandidates } from './services/api';
import { getAvatarUrl } from './utils/avatar';
import { Sparkles, Users, Filter, RefreshCw, LayoutGrid, Sliders, ChevronLeft, ChevronRight, BookmarkCheck, MapPin, Briefcase, Plus, Edit, Trash2, FileText, X, ArrowRightLeft } from 'lucide-react';

// Synchronously clear old localStorage mock keys before any state initialization
if (typeof window !== 'undefined' && !localStorage.getItem('digitalia_tables_cleared_v4')) {
  localStorage.removeItem('digitalia_job_descriptions');
  localStorage.removeItem('digitalia_saved_role_candidates');
  localStorage.removeItem('digitalia_job_results');
  localStorage.removeItem('digitalia_shortlist');
  localStorage.removeItem('digitalia_pipeline_stages');
  localStorage.removeItem('digitalia_search_history');
  localStorage.setItem('digitalia_tables_cleared_v4', 'true');
}

function DashboardContent() {
  const { t, lang } = useLanguage();
  const [activeTab, setActiveTab] = useState(() => {
    const saved = localStorage.getItem('digitalia_active_tab');
    return saved || 'sourcing';
  });

  useEffect(() => {
    localStorage.setItem('digitalia_active_tab', activeTab);
  }, [activeTab]);
  // Per-job result cache: { [jobId]: [candidate, ...] }
  const [jobResultsCache, setJobResultsCache] = useState(() => {
    const saved = localStorage.getItem('digitalia_job_results');
    if (saved) { try { return JSON.parse(saved); } catch(e) {} }
    return {};
  });

  const [candidates, setCandidates] = useState(() => {
    const cache = (() => {
      const saved = localStorage.getItem('digitalia_job_results');
      if (saved) { try { return JSON.parse(saved); } catch(e) {} }
      return {};
    })();
    return cache['job-1'] || [];
  });
  const [isSearching, setIsSearching] = useState(false);
  const [agentStep, setAgentStep] = useState(1);
  const [shortlist, setShortlist] = useState(() => {
    const saved = localStorage.getItem('digitalia_shortlist');
    if (saved) { try { return JSON.parse(saved); } catch(e) {} }
    return [];
  });

  // Pipeline Kanban stage per candidate: { [candId]: 'new' | 'contacted' | 'interview' | 'offer' | 'hired' | 'rejected' }
  const [candidatePipelineStage, setCandidatePipelineStage] = useState(() => {
    const saved = localStorage.getItem('digitalia_pipeline_stages');
    if (saved) { try { return JSON.parse(saved); } catch(e) {} }
    return {};
  });

  useEffect(() => {
    localStorage.setItem('digitalia_pipeline_stages', JSON.stringify(candidatePipelineStage));
  }, [candidatePipelineStage]);

  const handleUpdateCandidateStage = (candidateId, newStage) => {
    setCandidatePipelineStage(prev => ({
      ...prev,
      [candidateId]: newStage
    }));
    const stageNames = {
      new: lang === 'FR' ? 'Nouveau' : 'New',
      contacted: lang === 'FR' ? 'Contacté' : 'Contacted',
      interview: lang === 'FR' ? 'Entretien' : 'Interview',
      offer: lang === 'FR' ? 'Offre Proposée' : 'Offer Extended',
      hired: lang === 'FR' ? 'Recruté' : 'Hired',
      rejected: lang === 'FR' ? 'Refusé' : 'Rejected'
    };
    triggerToast(lang === 'FR' 
      ? `Candidat déplacé vers "${stageNames[newStage]}"` 
      : `Candidate moved to "${stageNames[newStage]}"`
    );
  };

  // Comparator state
  const [isComparatorOpen, setIsComparatorOpen] = useState(false);

  // Search History tracking
  const [searchHistory, setSearchHistory] = useState(() => {
    const saved = localStorage.getItem('digitalia_search_history');
    if (saved) { try { return JSON.parse(saved); } catch(e) {} }
    return [];
  });

  // Track last search so the refresh button can re-run it
  const [lastSearch, setLastSearch] = useState(null);

  useEffect(() => {
    localStorage.setItem('digitalia_search_history', JSON.stringify(searchHistory));
  }, [searchHistory]);

  // Persist per-job cache to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('digitalia_job_results', JSON.stringify(jobResultsCache));
  }, [jobResultsCache]);
  // savedRoleCandidates: { [jobId]: [candidateId, ...] }
  const [savedRoleCandidates, setSavedRoleCandidates] = useState(() => {
    const saved = localStorage.getItem('digitalia_saved_role_candidates');
    if (saved) { try { return JSON.parse(saved); } catch(e) {} }
    return {};
  });
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [isBackendOnline, setIsBackendOnline] = useState(true);

  // View state: 'grid' vs 'carousel'
  const [viewMode, setViewMode] = useState('carousel');
  const [carouselIndex, setCarouselIndex] = useState(0);

  // HR Edit/Add states
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState(null);

  // Job Descriptions / Profession profiles
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [jobDescriptions, setJobDescriptions] = useState(() => {
    const saved = localStorage.getItem('digitalia_job_descriptions');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved jobs:', e);
      }
    }
    return [];
  });

  // Ensure legacy mock data in localStorage is cleared once
  useEffect(() => {
    if (!localStorage.getItem('digitalia_mock_cleared_v2')) {
      localStorage.removeItem('digitalia_job_descriptions');
      localStorage.removeItem('digitalia_saved_role_candidates');
      localStorage.removeItem('digitalia_job_results');
      localStorage.removeItem('digitalia_shortlist');
      localStorage.removeItem('digitalia_pipeline_stages');
      localStorage.removeItem('digitalia_search_history');
      localStorage.setItem('digitalia_mock_cleared_v2', 'true');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('digitalia_job_descriptions', JSON.stringify(jobDescriptions));
  }, [jobDescriptions]);

  useEffect(() => {
    localStorage.setItem('digitalia_saved_role_candidates', JSON.stringify(savedRoleCandidates));
  }, [savedRoleCandidates]);

  // Gather ALL known candidate objects across current search state, shortlist, and per-job caches
  const allKnownCandidates = useMemo(() => {
    const map = new Map();
    candidates.forEach(c => map.set(c.id, c));
    shortlist.forEach(c => map.set(c.id, c));
    Object.values(jobResultsCache).forEach(list => {
      if (Array.isArray(list)) list.forEach(c => map.set(c.id, c));
    });
    return Array.from(map.values());
  }, [candidates, shortlist, jobResultsCache]);

  // Compute ONLY saved/shortlisted candidates for the Kanban pipeline
  const pipelineCandidates = useMemo(() => {
    if (!jobDescriptions || jobDescriptions.length === 0) {
      return [];
    }

    const activeJobIds = new Set(jobDescriptions.map(j => j.id));

    // Get candidate IDs saved under existing active jobs
    const activeSavedIds = new Set();
    Object.entries(savedRoleCandidates).forEach(([jId, candIds]) => {
      if (activeJobIds.has(jId) && Array.isArray(candIds)) {
        candIds.forEach(id => activeSavedIds.add(id));
      }
    });

    shortlist.forEach(c => activeSavedIds.add(c.id));

    return allKnownCandidates.filter(c => activeSavedIds.has(c.id));
  }, [allKnownCandidates, shortlist, savedRoleCandidates, jobDescriptions]);

  // References and intervals for auto-scrolling
  const thumbnailScrollRef = useRef(null);
  const [autoCycleInterval, setAutoCycleInterval] = useState(null);
  const [thumbnailScrollInterval, setThumbnailScrollInterval] = useState(null);

  // Auto-search on first load only if the default job has no cached results yet
  useEffect(() => {
    if (jobDescriptions && jobDescriptions.length > 0) {
      const defaultJob = jobDescriptions[0];
      const hasCache = (jobResultsCache[defaultJob.id] || []).length > 0;
      if (!hasCache) {
        const queryStr = defaultJob.description || `${defaultJob.title} ${(defaultJob.skills || []).join(' ')} ${defaultJob.location || ''}`.trim();
        handleSearch(queryStr, { location: defaultJob.location, tech: defaultJob.skills }, defaultJob.id);
      }
    }
  }, []);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSearch = async (query, filters, targetJobId) => {
    setIsSearching(true);
    // Save last search so the refresh button can re-run it
    setLastSearch({ query, filters, targetJobId });
    const activeJobId = targetJobId || selectedJobId || (jobDescriptions[0] ? jobDescriptions[0].id : 'general-search');
    if (activeJobId && activeJobId !== selectedJobId) {
      setSelectedJobId(activeJobId);
    }
    setAgentStep(1);

    // Simulate real-time agent pipeline progression
    const t1 = setTimeout(() => setAgentStep(2), 300);
    const t2 = setTimeout(() => setAgentStep(3), 600);
    const t3 = setTimeout(() => setAgentStep(4), 900);

    try {
      const results = await searchCandidatesApi(query, filters);
      setCandidates(results);
      setCarouselIndex(0);

      // Save results under this job's cache entry
      if (activeJobId) {
        setJobResultsCache(prev => ({ ...prev, [activeJobId]: results }));
      }

      const activeJob = jobDescriptions.find(j => j.id === activeJobId);
      const jobLabel = activeJob ? activeJob.title : (query || 'General Search');

      // Record to search history
      const now = new Date();
      const timeStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      setSearchHistory(prev => [
        ...prev,
        { query: query ? `[${jobLabel}] ${query}` : `Sourcing for ${jobLabel}`, date: timeStr, resultsCount: results.length }
      ]);

      const successMsg = lang === 'FR'
        ? `L'agent IA a sourcé ${results.length} candidats pour "${jobLabel}".`
        : `AI Agent sourced ${results.length} candidate profiles for "${jobLabel}".`;
      triggerToast(successMsg);
    } catch (err) {
      triggerToast(lang === 'FR' ? 'Recherche terminée.' : 'Search complete.');
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      setIsSearching(false);
    }
  };

  const handleSelectJob = (job) => {
    if (!job) return;
    setSelectedJobId(job.id);
    setCarouselIndex(0);

    const cached = jobResultsCache[job.id];
    if (cached && cached.length > 0) {
      // Restore cached results instantly — no API call
      setCandidates(cached);
    } else {
      // First time sourcing this job — call the API
      const queryStr = job.description || `${job.title} ${(job.skills || []).join(' ')} ${job.location || ''}`.trim();
      handleSearch(queryStr, { location: job.location, tech: job.skills }, job.id);
    }
  };

  const handleCreateJob = (newJob) => {
    setJobDescriptions(prev => [...prev, newJob]);
    handleSelectJob(newJob);
  };

  const handleEditJob = (updatedJob) => {
    setJobDescriptions(prev => prev.map(j => j.id === updatedJob.id ? updatedJob : j));
    triggerToast(lang === 'FR' ? 'Fiche de poste mise à jour.' : 'Job description updated.');
  };

  const handleDeleteJob = (e, jobId) => {
    e.stopPropagation();
    if (confirm(lang === 'FR' ? 'Voulez-vous supprimer cette fiche de poste ?' : 'Are you sure you want to delete this job description?')) {
      const updated = jobDescriptions.filter(j => j.id !== jobId);
      setJobDescriptions(updated);

      // Clean up saved candidates & cache for this deleted job
      setSavedRoleCandidates(prev => {
        const next = { ...prev };
        delete next[jobId];
        return next;
      });

      setJobResultsCache(prev => {
        const next = { ...prev };
        delete next[jobId];
        return next;
      });

      if (updated.length === 0) {
        setShortlist([]);
        setCandidates([]);
        setSelectedJobId(null);
      } else if (selectedJobId === jobId) {
        handleSelectJob(updated[0]);
      }

      triggerToast(lang === 'FR' ? 'Fiche de poste supprimée.' : 'Job description deleted.');
    }
  };

  const handleToggleSaveForJob = (candidateId, jobId) => {
    setSavedRoleCandidates(prev => {
      const current = prev[jobId] || [];
      const isAlreadySaved = current.includes(candidateId);
      const updated = isAlreadySaved
        ? current.filter(id => id !== candidateId)
        : [...current, candidateId];
      
      triggerToast(isAlreadySaved
        ? (lang === 'FR' ? 'Candidat retiré du poste.' : 'Candidate removed from role.')
        : (lang === 'FR' ? 'Candidat enregistré au poste.' : 'Candidate saved to role.')
      );

      return { ...prev, [jobId]: updated };
    });
  };

  const toggleShortlist = (candidate) => {
    const isAlreadyShortlisted = shortlist.some(c => c.id === candidate.id);
    let updated;
    if (isAlreadyShortlisted) {
      updated = shortlist.filter(c => c.id !== candidate.id);
      const removeMsg = lang === 'FR'
        ? `${candidate.fullName} retiré de la sélection.`
        : `Removed ${candidate.fullName} from shortlist.`;
      triggerToast(removeMsg);
    } else {
      updated = [...shortlist, candidate];
      const addMsg = lang === 'FR'
        ? `${candidate.fullName} ajouté à la sélection.`
        : `Added ${candidate.fullName} to shortlist.`;
      triggerToast(addMsg);
    }
    setShortlist(updated);
  };

  // HR Profile Control Actions
  const handleOpenAddCandidate = () => {
    setEditingCandidate(null);
    setIsEditOpen(true);
  };

  const handleOpenEditCandidate = (candidate) => {
    setEditingCandidate(candidate);
    setIsEditOpen(true);
  };

  const handleSaveCandidate = (savedCandidate) => {
    const exists = candidates.some(c => c.id === savedCandidate.id);
    let updatedList;
    if (exists) {
      updatedList = candidates.map(c => c.id === savedCandidate.id ? savedCandidate : c);
      triggerToast(lang === 'FR' ? 'Profil candidat mis à jour.' : 'Candidate profile updated.');
    } else {
      updatedList = [savedCandidate, ...candidates];
      triggerToast(lang === 'FR' ? 'Nouveau candidat inséré avec succès.' : 'New candidate profile inserted.');
    }
    setCandidates(updatedList);

    // Sync shortlist state
    if (savedCandidate.shortlisted) {
      setShortlist(prev => {
        const shortExists = prev.some(c => c.id === savedCandidate.id);
        if (shortExists) {
          return prev.map(c => c.id === savedCandidate.id ? savedCandidate : c);
        } else {
          return [...prev, savedCandidate];
        }
      });
    } else {
      setShortlist(prev => prev.filter(c => c.id !== savedCandidate.id));
    }
  };

  const handleDeleteCandidate = (id) => {
    if (confirm(lang === 'FR' ? 'Voulez-vous supprimer ce profil ?' : 'Are you sure you want to delete this profile?')) {
      setCandidates(prev => prev.filter(c => c.id !== id));
      setShortlist(prev => prev.filter(c => c.id !== id));
      triggerToast(lang === 'FR' ? 'Profil supprimé.' : 'Profile deleted.');
      if (carouselIndex >= candidates.length - 1 && carouselIndex > 0) {
        setCarouselIndex(prev => prev - 1);
      }
    }
  };

  const handleAddNote = (candidateId, noteText) => {
    const timestamp = new Date().toLocaleTimeString(lang === 'FR' ? 'fr-FR' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
    const newNote = {
      id: Date.now(),
      text: noteText,
      time: timestamp
    };
    
    setCandidates(prev => prev.map(c => {
      if (c.id === candidateId) {
        return {
          ...c,
          notes: [...(c.notes || []), newNote]
        };
      }
      return c;
    }));

    setSelectedCandidate(prev => {
      if (prev && prev.id === candidateId) {
        return {
          ...prev,
          notes: [...(prev.notes || []), newNote]
        };
      }
      return prev;
    });

    setShortlist(prev => prev.map(c => {
      if (c.id === candidateId) {
        return {
          ...c,
          notes: [...(c.notes || []), newNote]
        };
      }
      return c;
    }));

    triggerToast(lang === 'FR' ? 'Note enregistrée.' : 'Note saved.');
  };

  const nextCarousel = () => {
    if (candidates.length === 0) return;
    setCarouselIndex((prev) => (prev + 1) % candidates.length);
  };

  const prevCarousel = () => {
    if (candidates.length === 0) return;
    setCarouselIndex((prev) => (prev - 1 + candidates.length) % candidates.length);
  };

  // Hover auto-cycle logic for next/prev arrows
  const startAutoCycle = (direction) => {
    if (autoCycleInterval) clearInterval(autoCycleInterval);
    
    // Perform initial shift
    if (direction === 'next') nextCarousel();
    else prevCarousel();

    const interval = setInterval(() => {
      if (direction === 'next') {
        setCarouselIndex((prev) => (candidates.length ? (prev + 1) % candidates.length : 0));
      } else {
        setCarouselIndex((prev) => (candidates.length ? (prev - 1 + candidates.length) % candidates.length : 0));
      }
    }, 900);

    setAutoCycleInterval(interval);
  };

  const stopAutoCycle = () => {
    if (autoCycleInterval) {
      clearInterval(autoCycleInterval);
      setAutoCycleInterval(null);
    }
  };

  // Hover auto-scroll logic for thumbnail strip
  const startThumbnailScroll = (direction) => {
    if (thumbnailScrollInterval) clearInterval(thumbnailScrollInterval);

    const interval = setInterval(() => {
      if (thumbnailScrollRef.current) {
        thumbnailScrollRef.current.scrollLeft += direction === 'right' ? 8 : -8;
      }
    }, 16);

    setThumbnailScrollInterval(interval);
  };

  const stopThumbnailScroll = () => {
    if (thumbnailScrollInterval) {
      clearInterval(thumbnailScrollInterval);
      setThumbnailScrollInterval(null);
    }
  };

  const currentCandidate = candidates[carouselIndex];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans relative">
      
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAuth={() => setIsAuthOpen(true)}
        shortlistCount={shortlist.length}
        isBackendOnline={isBackendOnline}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        
        {/* Toast Alert Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-3.5 rounded-xl shadow-2xl flex items-center space-x-2.5 border border-slate-700 animate-bounce">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Tab 1: Sourcing Hub View */}
        {activeTab === 'sourcing' && (
          <>
            {/* 1. Job Description Selection Header */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 mb-6 shadow-xs">
              <div className="flex items-center justify-between gap-4 mb-3.5">
                <div>
                  <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
                    <FileText className="w-3.5 h-3.5 text-brand-primary" />
                    {t('jobDescriptions')}
                  </span>
                  <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                    {lang === 'FR' 
                      ? 'Sélectionnez la fiche de poste à sourcer pour personnaliser la recherche'
                      : 'Select a job description to anchor and customize candidate sourcing'}
                  </p>
                </div>

                <button
                  onClick={() => setIsJobModalOpen(true)}
                  className="flex items-center space-x-1.5 bg-brand-light-blue text-brand-primary hover:bg-brand-primary hover:text-white text-[10px] font-bold px-3 py-2 rounded-xl border border-brand-mid-blue/20 transition-all cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t('newJobDesc')}</span>
                </button>
              </div>

              {/* Horizontal Strip of Job Descriptions */}
              <div className="flex flex-wrap gap-2">
                {jobDescriptions.map((job) => {
                  const isSelected = job.id === selectedJobId;
                  return (
                    <div
                      key={job.id}
                      onClick={() => handleSelectJob(job)}
                      className={`flex items-center space-x-2 text-xs font-bold px-3.5 py-2.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-brand-primary text-white border-brand-primary shadow-xs ring-2 ring-brand-primary/20'
                          : 'bg-slate-50 text-slate-600 border-slate-200/80 hover:bg-slate-100'
                      }`}
                    >
                      <span>{job.title}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingJob(job); setIsJobModalOpen(true); }}
                        className={`p-0.5 rounded-md hover:bg-black/10 transition-colors ${
                          isSelected ? 'text-white/80 hover:text-white' : 'text-slate-400 hover:text-brand-primary'
                        }`}
                        title="Edit Job Description"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteJob(e, job.id)}
                        className={`p-0.5 rounded-md hover:bg-black/10 transition-colors ${
                          isSelected ? 'text-white/80 hover:text-white' : 'text-slate-400 hover:text-rose-600'
                        }`}
                        title="Delete Job Description"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Job-Scoped Search Console */}
            <SearchConsole 
              onSearch={handleSearch} 
              isSearching={isSearching} 
              selectedJob={jobDescriptions.find(j => j.id === selectedJobId) || jobDescriptions[0]}
            />

            {/* AI Agent Execution Pipeline Status Widget */}
            {isSearching && (
              <AgentStatusWidget currentStep={agentStep} totalCandidatesFound={candidates.length} />
            )}

            {/* Candidate Directory Section Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-jakarta flex items-center gap-2">
                  <Users className="w-4 h-4 text-brand-primary" />
                  {t('talentProfiles')}
                </h3>
                <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                  {t('showingProfiles', { count: candidates.length })}
                </p>
              </div>

              {/* View Switches & Comparator */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsComparatorOpen(true)}
                  className="flex items-center space-x-1.5 bg-sky-50 text-sky-700 hover:bg-sky-600 hover:text-white border border-sky-200 text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-2xs"
                  title="Compare candidates side by side"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>{lang === 'FR' ? 'Comparer' : 'Compare'}</span>
                </button>

                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60">
                  <button
                    onClick={() => setViewMode('carousel')}
                    className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      viewMode === 'carousel'
                        ? 'bg-white text-sky-600 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Interactive Slider Mode"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Slider</span>
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      viewMode === 'grid'
                        ? 'bg-white text-sky-600 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Grid Mode"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Grid</span>
                  </button>
                </div>

                <button
                  onClick={() => {
                    if (lastSearch) {
                      handleSearch(lastSearch.query, lastSearch.filters, lastSearch.targetJobId);
                    } else {
                      const activeJob = jobDescriptions.find(j => j.id === selectedJobId) || jobDescriptions[0];
                      const fallbackQuery = activeJob ? activeJob.title : '';
                      const fallbackFilters = {
                        location: activeJob?.location || 'All Locations',
                        minExp: activeJob?.experienceMin || 0,
                        tech: activeJob?.skills || []
                      };
                      handleSearch(fallbackQuery, fallbackFilters, activeJob?.id);
                    }
                  }}
                  title={lang === 'FR' ? 'Relancer la dernière recherche' : 'Re-run last search'}
                  className="flex items-center space-x-1 text-xs text-slate-500 hover:text-brand-primary font-bold px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer animate-none transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSearching ? 'animate-spin text-brand-primary' : ''}`} />
                </button>
              </div>
            </div>

            {/* Candidate Rendering Section */}
            {candidates.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
                <Filter className="w-10 h-10 text-slate-355 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-700 font-jakarta">{t('noCandidatesMatched')}</h4>
                <p className="text-xs text-slate-455 mt-1">{t('noCandidatesDesc')}</p>
              </div>
            ) : viewMode === 'grid' ? (
              /* GRID MODE */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {candidates.map((candidate) => (
                  <CandidateCard
                    key={candidate.id}
                    candidate={candidate}
                    onViewDetails={setSelectedCandidate}
                    onToggleShortlist={toggleShortlist}
                    isShortlisted={shortlist.some(c => c.id === candidate.id)}
                    onEdit={handleOpenEditCandidate}
                    onDelete={handleDeleteCandidate}
                    selectedJobId={selectedJobId}
                    isSavedForJob={selectedJobId ? (savedRoleCandidates[selectedJobId] || []).includes(candidate.id) : false}
                    onSaveForJob={(id) => handleToggleSaveForJob(id, selectedJobId)}
                  />
                ))}
              </div>
            ) : (
              /* INTERACTIVE CAROUSEL / SLIDER VIEW MODE WITH HOVER CYCLING */
              <div className="space-y-6">
                
                {/* Main Featured Candidate Panel */}
                <div className="bg-white rounded-3xl border border-slate-200/85 p-8 shadow-[0_12px_40px_-20px_rgba(0,64,193,0.05)] relative overflow-hidden flex flex-col md:flex-row gap-8 items-stretch">
                  
                  {/* Slider Control Arrows */}
                  <button 
                    onClick={prevCarousel}
                    onMouseEnter={() => startAutoCycle('prev')}
                    onMouseLeave={stopAutoCycle}
                    className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/95 hover:bg-slate-50 hover:scale-105 border border-slate-200 p-2.5 rounded-full shadow-md text-slate-655 hover:text-brand-primary transition-all z-10 cursor-pointer hidden md:flex items-center justify-center"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={nextCarousel}
                    onMouseEnter={() => startAutoCycle('next')}
                    onMouseLeave={stopAutoCycle}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/95 hover:bg-slate-50 hover:scale-105 border border-slate-200 p-2.5 rounded-full shadow-md text-slate-655 hover:text-brand-primary transition-all z-10 cursor-pointer hidden md:flex items-center justify-center"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>

                  {/* Left Column: Profile Details */}
                  <div className="flex-1 flex flex-col justify-between">
                    {currentCandidate ? (
                      <div>
                        <div className="flex items-center justify-between mb-5">
                          <div className="flex items-center space-x-4">
                            <img 
                              src={getAvatarUrl(currentCandidate.fullName, currentCandidate.avatarUrl)} 
                              alt={currentCandidate.fullName} 
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = getAvatarUrl(currentCandidate.fullName, null);
                              }}
                              className="w-16 h-16 rounded-2xl object-cover border border-slate-100 shadow-sm"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-lg font-black text-slate-900 font-jakarta">{currentCandidate.fullName}</h4>
                                <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded-md border border-emerald-200">
                                  {currentCandidate.matchScore}% Match
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 font-bold mt-1">{currentCandidate.headline}</p>
                            </div>
                          </div>

                          {/* HR Controls */}
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleOpenEditCandidate(currentCandidate)}
                              className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-brand-primary cursor-pointer border border-slate-200"
                              title={t('editCandidate')}
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteCandidate(currentCandidate.id)}
                              className="p-2 bg-slate-50 hover:bg-rose-50 rounded-xl text-slate-500 hover:text-rose-600 cursor-pointer border border-slate-200"
                              title={t('deleteCandidate')}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-4 text-xs font-bold text-slate-550 mb-5">
                          <span className="flex items-center gap-1 bg-slate-50 border border-slate-200/50 px-3 py-1.5 rounded-xl">
                            <MapPin className="w-4 h-4 text-brand-primary" />
                            {currentCandidate.location}
                          </span>
                          <span className="flex items-center gap-1 bg-slate-50 border border-slate-200/50 px-3 py-1.5 rounded-xl">
                            <Briefcase className="w-4 h-4 text-brand-primary" />
                            {currentCandidate.experienceYears} {t('yearsExp')}
                          </span>
                        </div>

                        <p className="text-xs text-slate-605 leading-relaxed mb-6">
                          {currentCandidate.summary}
                        </p>

                        <div className="flex flex-wrap gap-1.5">
                          {currentCandidate.skills.map((skill, idx) => (
                            <span 
                              key={idx} 
                              className="text-[10px] font-bold bg-indigo-50/60 text-brand-primary px-3 py-1.5 rounded-lg border border-brand-light-blue/50"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-slate-400 font-bold text-xs">{t('selectJobDescToSource')}</div>
                    )}

                    {currentCandidate && (
                      <div className="flex items-center gap-4 mt-8 pt-4 border-t border-slate-100">
                        {selectedJobId ? (
                          <button
                            onClick={() => handleToggleSaveForJob(currentCandidate.id, selectedJobId)}
                            className={`flex items-center space-x-2 text-xs font-bold px-5 py-2.5 rounded-xl border transition-all cursor-pointer ${
                              (savedRoleCandidates[selectedJobId] || []).includes(currentCandidate.id)
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-white text-slate-605 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {(savedRoleCandidates[selectedJobId] || []).includes(currentCandidate.id) ? (
                              <>
                                <BookmarkCheck className="w-4 h-4 text-emerald-600" />
                                <span>{t('shortlisted')}</span>
                              </>
                            ) : (
                              <>
                                <BookmarkCheck className="w-4 h-4 text-slate-400" />
                                <span>{t('shortlist')}</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-300 italic font-semibold">Select a role to save</span>
                        )}

                        <button
                          onClick={() => setSelectedCandidate(currentCandidate)}
                          className="bg-brand-primary hover:bg-brand-deep-blue text-white font-bold text-xs px-6 py-2.5 rounded-xl transition-all cursor-pointer"
                        >
                          {t('viewProfile')}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Right Column: AI Insights */}
                  {currentCandidate && (
                    <div className="w-full md:w-80 bg-slate-50 border border-slate-200/50 rounded-2xl p-5 flex flex-col justify-between">
                      <div>
                        <h5 className="text-[10px] font-black text-brand-primary uppercase tracking-wider mb-3 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-brand-accent animate-pulse" />
                          AI Suite Suitability Report
                        </h5>
                        <ul className="space-y-3">
                          {currentCandidate.verifiedMatchReasons?.slice(0, 3).map((reason, idx) => (
                            <li key={idx} className="text-[11px] text-slate-600 leading-normal flex items-start gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-brand-primary shrink-0 mt-1.5" />
                              <span>{reason}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="bg-brand-light-blue/20 rounded-xl p-3 border border-brand-mid-blue/10 text-[10px] text-brand-deep-blue font-bold mt-4">
                        Candidate ranks in top {100 - currentCandidate.matchScore}% of target search category.
                      </div>
                    </div>
                  )}

                </div>

                {/* Horizontal Navigation Strip */}
                <div className="relative">
                  
                  {/* Left Hover Scroll Trigger */}
                  <div 
                    onMouseEnter={() => startThumbnailScroll('left')}
                    onMouseLeave={stopThumbnailScroll}
                    className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-slate-50 to-transparent flex items-center justify-start pl-1 text-slate-455 hover:text-brand-primary z-20 cursor-w-resize"
                  >
                    <ChevronLeft className="w-5 h-5 opacity-60" />
                  </div>

                  <div 
                    ref={thumbnailScrollRef}
                    className="flex items-center space-x-3 overflow-x-auto py-2.5 px-10 scrollbar-none scroll-smooth"
                  >
                    {candidates.map((candidate, idx) => {
                      const isSelected = idx === carouselIndex;
                      return (
                        <button
                          key={candidate.id}
                          onClick={() => setCarouselIndex(idx)}
                          className={`flex items-center space-x-3 bg-white p-3 rounded-xl border transition-all duration-200 text-left min-w-[200px] cursor-pointer shrink-0 ${
                            isSelected
                              ? 'ring-2 ring-brand-primary border-brand-primary shadow-xs'
                              : 'border-slate-200/80 hover:border-slate-350'
                          }`}
                        >
                          <img 
                            src={getAvatarUrl(candidate.fullName, candidate.avatarUrl)} 
                            alt={candidate.fullName} 
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = getAvatarUrl(candidate.fullName, null);
                            }}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-slate-900 truncate leading-tight">
                              {candidate.fullName}
                            </div>
                            <div className="text-[10px] text-slate-455 font-bold mt-0.5 truncate">
                              {candidate.matchScore}% • {candidate.experienceYears} Years
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Right Hover Scroll Trigger */}
                  <div 
                    onMouseEnter={() => startThumbnailScroll('right')}
                    onMouseLeave={stopThumbnailScroll}
                    className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-slate-50 to-transparent flex items-center justify-end pr-1 text-slate-455 hover:text-brand-primary z-20 cursor-e-resize"
                  >
                    <ChevronRight className="w-5 h-5 opacity-60" />
                  </div>

                </div>

              </div>
            )}
          </>
        )}

        {/* Tab 2: Kanban Pipeline View */}
        {activeTab === 'pipeline' && (
          <KanbanPipeline
            candidates={pipelineCandidates}
            jobDescriptions={jobDescriptions}
            savedRoleCandidates={savedRoleCandidates}
            candidatePipelineStage={candidatePipelineStage}
            onUpdateStage={handleUpdateCandidateStage}
            onViewDetails={setSelectedCandidate}
          />
        )}

        {/* Tab 3: Job Projects & Saved Talent Pools View */}
        {activeTab === 'shortlist' && (
          <ShortlistPanel
            jobDescriptions={jobDescriptions}
            candidates={allKnownCandidates}
            savedRoleCandidates={savedRoleCandidates}
            onViewDetails={setSelectedCandidate}
            onToggleSaveCandidateForJob={handleToggleSaveForJob}
            onDeleteJob={handleDeleteJob}
            onOpenJobModal={() => setIsJobModalOpen(true)}
          />
        )}

        {/* Tab 4: Dashboard Analytics View */}
        {activeTab === 'dashboard' && (
          <DashboardView
            jobDescriptions={jobDescriptions}
            candidates={allKnownCandidates}
            savedRoleCandidates={savedRoleCandidates}
            candidatePipelineStage={candidatePipelineStage}
            searchHistory={searchHistory}
          />
        )}

      </main>

      {/* Candidate Detail Modal */}
      {selectedCandidate && (
        <CandidateDetailModal
          candidate={selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
          onToggleShortlist={toggleShortlist}
          isShortlisted={shortlist.some(c => c.id === selectedCandidate.id)}
          onEdit={handleOpenEditCandidate}
          onDelete={handleDeleteCandidate}
          onAddNote={handleAddNote}
        />
      )}

      {/* HR Edit/Add Candidate Modal */}
      <EditCandidateModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSave={handleSaveCandidate}
        candidate={editingCandidate}
      />

      {/* HR Job Description Modal */}
      <JobDescriptionModal
        isOpen={isJobModalOpen}
        onClose={() => { setIsJobModalOpen(false); setEditingJob(null); }}
        onCreate={handleCreateJob}
        onEdit={handleEditJob}
        editingJob={editingJob}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={() => triggerToast(lang === 'FR' ? 'Connexion réussie !' : 'Successfully logged in!')}
      />

      {/* Candidate Side-by-Side Comparator Modal */}
      <CandidateComparator
        isOpen={isComparatorOpen}
        onClose={() => setIsComparatorOpen(false)}
        candidates={candidates}
      />



    </div>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4 text-white">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-bold tracking-wide text-slate-400">Loading Digitalia Platform...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return <DashboardContent />;
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </LanguageProvider>
  );
}
