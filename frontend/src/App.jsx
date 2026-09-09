import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { Navbar } from './components/Navbar';
import SearchConsole from './components/SearchConsole';
import AgentStatusWidget from './components/AgentStatusWidget';
import { CandidateCard } from './components/CandidateCard';
import CandidateDetailPanel from './components/CandidateDetailPanel';
import { EditCandidateModal } from './components/EditCandidateModal';
import { JobDescriptionModal } from './components/JobDescriptionModal';
import { ShortlistPanel } from './components/ShortlistPanel';
import { KanbanPipeline } from './components/KanbanPipeline';
import { DashboardView } from './components/DashboardView';
import { RecruiterNotesView } from './components/RecruiterNotesView';
import { CandidateComparator } from './components/CandidateComparator';
import SourcingHubView from './components/SourcingHubView';
import { AuthModal } from './components/AuthModal';
import AuthPage from './components/AuthPage';
import { searchCandidatesApi, getInitialCandidates } from './services/api';
import { getAvatarUrl } from './utils/avatar';
import { Sparkles } from 'lucide-react';

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

function getEmptyUserState() {
  return {
    jobDescriptions: [],
    savedRoleCandidates: {},
    candidatePipelineStage: {},
    searchHistory: [],
    jobResultsCache: {}
  };
}

function DashboardContent() {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const userKey = user?.email ? user.email.toLowerCase().replace(/[^a-z0-9]/g, '_') : 'guest';

  const [activeTab, setActiveTab] = useState(() => {
    const saved = localStorage.getItem(`digitalia_user_${userKey}_active_tab`);
    return saved || 'dashboard';
  });

  useEffect(() => {
    localStorage.setItem(`digitalia_user_${userKey}_active_tab`, activeTab);
  }, [activeTab, userKey]);

  // Per-user job result cache: { [jobId]: [candidate, ...] }
  const [jobResultsCache, setJobResultsCache] = useState(() => {
    const saved = localStorage.getItem(`digitalia_user_${userKey}_job_results`);
    if (saved) { try { return JSON.parse(saved); } catch (e) { } }
    return getEmptyUserState().jobResultsCache;
  });

  const [jobDescriptions, setJobDescriptions] = useState(() => {
    const saved = localStorage.getItem(`digitalia_user_${userKey}_job_descriptions`);
    if (saved) { try { return JSON.parse(saved); } catch (e) { } }
    return getEmptyUserState().jobDescriptions;
  });

  const [savedRoleCandidates, setSavedRoleCandidates] = useState(() => {
    const saved = localStorage.getItem(`digitalia_user_${userKey}_saved_role_candidates`);
    if (saved) { try { return JSON.parse(saved); } catch (e) { } }
    return getEmptyUserState().savedRoleCandidates;
  });

  const [shortlist, setShortlist] = useState(() => {
    const saved = localStorage.getItem(`digitalia_user_${userKey}_shortlist`);
    if (saved) { try { return JSON.parse(saved); } catch (e) { } }
    return [];
  });

  const [candidatePipelineStage, setCandidatePipelineStage] = useState(() => {
    const saved = localStorage.getItem(`digitalia_user_${userKey}_pipeline_stages`);
    if (saved) { try { return JSON.parse(saved); } catch (e) { } }
    return getEmptyUserState().candidatePipelineStage;
  });

  const [searchHistory, setSearchHistory] = useState(() => {
    const saved = localStorage.getItem(`digitalia_user_${userKey}_search_history`);
    if (saved) { try { return JSON.parse(saved); } catch (e) { } }
    return getEmptyUserState().searchHistory;
  });

  const [candidates, setCandidates] = useState(() => {
    const defaultJobId = jobDescriptions[0]?.id;
    return (defaultJobId && jobResultsCache[defaultJobId]) || [];
  });

  // Re-sync states whenever user switches accounts
  useEffect(() => {
    const seed = getEmptyUserState();

    const savedJds = localStorage.getItem(`digitalia_user_${userKey}_job_descriptions`);
    const jds = savedJds ? JSON.parse(savedJds) : seed.jobDescriptions;
    setJobDescriptions(jds);

    const savedSavedRole = localStorage.getItem(`digitalia_user_${userKey}_saved_role_candidates`);
    setSavedRoleCandidates(savedSavedRole ? JSON.parse(savedSavedRole) : seed.savedRoleCandidates);

    const savedCache = localStorage.getItem(`digitalia_user_${userKey}_job_results`);
    const cache = savedCache ? JSON.parse(savedCache) : seed.jobResultsCache;
    setJobResultsCache(cache);

    const savedStages = localStorage.getItem(`digitalia_user_${userKey}_pipeline_stages`);
    setCandidatePipelineStage(savedStages ? JSON.parse(savedStages) : seed.candidatePipelineStage);

    const savedHistory = localStorage.getItem(`digitalia_user_${userKey}_search_history`);
    setSearchHistory(savedHistory ? JSON.parse(savedHistory) : seed.searchHistory);

    const defaultJobId = jds[0]?.id;
    setCandidates((defaultJobId && cache[defaultJobId]) || []);
    setSelectedJobId(defaultJobId || null);
  }, [userKey]);

  // Persist user-specific datasets to localStorage on change
  useEffect(() => {
    localStorage.setItem(`digitalia_user_${userKey}_job_descriptions`, JSON.stringify(jobDescriptions));
  }, [jobDescriptions, userKey]);

  useEffect(() => {
    localStorage.setItem(`digitalia_user_${userKey}_saved_role_candidates`, JSON.stringify(savedRoleCandidates));
  }, [savedRoleCandidates, userKey]);

  useEffect(() => {
    localStorage.setItem(`digitalia_user_${userKey}_job_results`, JSON.stringify(jobResultsCache));
  }, [jobResultsCache, userKey]);

  useEffect(() => {
    localStorage.setItem(`digitalia_user_${userKey}_pipeline_stages`, JSON.stringify(candidatePipelineStage));
  }, [candidatePipelineStage, userKey]);

  useEffect(() => {
    localStorage.setItem(`digitalia_user_${userKey}_search_history`, JSON.stringify(searchHistory));
  }, [searchHistory, userKey]);

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

  // Track last search so the refresh button can re-run it
  const [lastSearch, setLastSearch] = useState(null);
  const [searchMode, setSearchMode] = useState('source'); // 'source' | 'pool'

  // Incremented on every new result set — forces grid children to remount
  // so cardEntrance animations replay on each search.
  const [candidatesKey, setCandidatesKey] = useState(0);

  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [selectedCardRect, setSelectedCardRect] = useState(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const handleViewDetails = (candidate, event) => {
    setSelectedCandidate(candidate);
    if (event?.currentTarget) {
      const rect = event.currentTarget.getBoundingClientRect();
      setSelectedCardRect({
        left: rect.left,
        width: rect.width,
      });
    } else {
      setSelectedCardRect(null);
    }
  };
  const [toastMessage, setToastMessage] = useState(null);
  const [isBackendOnline, setIsBackendOnline] = useState(true);

  const [isSearching, setIsSearching] = useState(false);
  const [agentStep, setAgentStep] = useState(1);

  // HR Edit/Add states
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState(null);

  // Job Descriptions / Profession profiles
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [selectedJobId, setSelectedJobId] = useState(null);

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



  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSearch = async (query, filters, targetJobId) => {
    setIsSearching(true);
    if (filters?.searchMode) {
      setSearchMode(filters.searchMode);
    }
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
      setCandidatesKey(k => k + 1); // triggers stagger re-animation

      // Save results under this job's cache entry — keep pool results separate from sourced results
      if (activeJobId) {
        if (filters?.searchMode === 'pool') {
          setJobResultsCache(prev => ({ ...prev, [`${activeJobId}:pool`]: results }));
        } else {
          setJobResultsCache(prev => ({ ...prev, [activeJobId]: results }));
        }
      }

      const activeJob = jobDescriptions.find(j => j.id === activeJobId);
      const jobLabel = activeJob ? activeJob.title : (query || 'General Search');

      // Record to search history
      const now = new Date();
      const timeStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const modeLabel = filters?.searchMode === 'pool' ? (lang === 'FR' ? '(vivier)' : '(pool)') : '';
      setSearchHistory(prev => [
        ...prev,
        { query: `${modeLabel} ${query ? `[${jobLabel}] ${query}` : `Sourcing for ${jobLabel}`}`.trim(), date: timeStr, resultsCount: results.length }
      ]);

      const successMsg = filters?.searchMode === 'pool'
        ? (lang === 'FR'
          ? (results.length > 0
            ? `${results.length} profil(s) trouvés dans votre vivier pour "${jobLabel}".`
            : `Aucun candidat trouvé dans votre vivier. Revenez à "Sourcer" pour trouver de nouveaux profils.`)
          : (results.length > 0
            ? `Found ${results.length} profile(s) from your talent pool for "${jobLabel}".`
            : `No candidates found in your talent pool. Switch back to "Source" to find new profiles.`))
        : (lang === 'FR'
          ? `L'agent IA a sourcé ${results.length} candidats pour "${jobLabel}".`
          : `AI Agent sourced ${results.length} candidate profiles for "${jobLabel}".`);
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

  const handleSearchModeChange = (newMode) => {
    setSearchMode(newMode);
    const activeJobId = selectedJobId || (jobDescriptions[0] ? jobDescriptions[0].id : null);
    if (!activeJobId) return;

    if (newMode === 'source') {
      const cachedSource = jobResultsCache[activeJobId];
      if (cachedSource && cachedSource.length > 0) {
        setCandidates(cachedSource);
      }
    } else if (newMode === 'pool') {
      const cachedPool = jobResultsCache[`${activeJobId}:pool`];
      if (cachedPool && cachedPool.length > 0) {
        setCandidates(cachedPool);
      }
    }
  };

  const handleSelectJob = (jobOrId) => {
    // Handle both job object and job ID
    const job = typeof jobOrId === 'object' ? jobOrId : jobDescriptions.find(j => String(j.id) === String(jobOrId));
    
    if (!job) return;
    setSelectedJobId(job.id);

    const cached = jobResultsCache[job.id];
    if (cached && cached.length > 0) {
      // Restore cached results instantly — no API call
      setCandidates(cached);
    } else {
      // Clear candidates when switching to a job with no cached results
      setCandidates([]);
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
    }
  };

  const handleAddNote = (candidateId, noteText) => {
    const isFR = lang === 'FR';
    const now = new Date();
    const datePart = now.toLocaleDateString(isFR ? 'fr-FR' : 'en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const timePart = now.toLocaleTimeString(isFR ? 'fr-FR' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const timestamp = isFR ? `${datePart} à ${timePart}` : `${datePart} at ${timePart}`;
    const newNote = {
      id: Date.now(),
      text: noteText,
      time: timestamp,
      createdAt: now.toISOString(),
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

    // Also update jobResultsCache to ensure notes sync across all sources
    setJobResultsCache(prev => {
      const updated = {};
      Object.entries(prev).forEach(([jobId, list]) => {
        if (Array.isArray(list)) {
          updated[jobId] = list.map(c => {
            if (c.id === candidateId) {
              return {
                ...c,
                notes: [...(c.notes || []), newNote]
              };
            }
            return c;
          });
        } else {
          updated[jobId] = list;
        }
      });
      return updated;
    });

    // Also persist note into the jobResultsCache for the active job
    setJobResultsCache(prev => {
      const next = { ...prev };
      const jobId = selectedJobId;
      if (jobId && Array.isArray(next[jobId])) {
        next[jobId] = next[jobId].map(c => {
          if (c.id === candidateId) {
            return { ...c, notes: [...(c.notes || []), newNote] };
          }
          return c;
        });
      }
      return next;
    });

    triggerToast(lang === 'FR' ? 'Note enregistrée.' : 'Note saved.');
  };

  const handleDeleteNote = (candidateId, noteId) => {
    const removeNote = (c) =>
      c.id === candidateId
        ? { ...c, notes: (c.notes || []).filter(n => n.id !== noteId) }
        : c;

    setCandidates(prev => prev.map(removeNote));
    setShortlist(prev => prev.map(removeNote));
    setJobResultsCache(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(jobId => {
        if (Array.isArray(next[jobId])) {
          next[jobId] = next[jobId].map(removeNote);
        }
      });
      return next;
    });
    setSelectedCandidate(prev =>
      prev && prev.id === candidateId
        ? { ...prev, notes: (prev.notes || []).filter(n => n.id !== noteId) }
        : prev
    );
    triggerToast(lang === 'FR' ? 'Note supprimée.' : 'Note deleted.');
  };


  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans relative">

      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAuth={() => setIsAuthOpen(true)}
        shortlistCount={shortlist.length}
        notesCount={allKnownCandidates.filter(c => c.notes && c.notes.length > 0).reduce((s, c) => s + c.notes.length, 0)}
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

        {/* Tab 1: Sourcing Hub */}
        {activeTab === 'sourcing' && (
          <SourcingHubView
            jobDescriptions={jobDescriptions}
            selectedJobId={selectedJobId}
            candidates={candidates}
            jobResultsCache={jobResultsCache}
            searchKey={candidatesKey}
            searchMode={searchMode}
            shortlist={shortlist}
            savedRoleCandidates={savedRoleCandidates}
            isSearching={isSearching}
            agentStep={agentStep}
            lastSearch={lastSearch}
            lang={lang}
            t={t}
            onSearch={handleSearch}
            onSelectJob={handleSelectJob}
            onDeleteJob={handleDeleteJob}
            onSearchModeChange={handleSearchModeChange}
            onToggleSaveForJob={handleToggleSaveForJob}
            onViewDetails={handleViewDetails}
            onEdit={handleOpenEditCandidate}
            onDelete={handleDeleteCandidate}
            onOpenJobModal={() => setIsJobModalOpen(true)}
            onOpenEditJobModal={(job) => { setEditingJob(job); setIsJobModalOpen(true); }}
            onOpenComparator={() => setIsComparatorOpen(true)}
            onNewDescription={() => setIsJobModalOpen(true)}
            onEditDescription={(job) => { setEditingJob(job); setIsJobModalOpen(true); }}
          />
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
            user={user}
            jobDescriptions={jobDescriptions}
            candidates={
              selectedJobId && jobResultsCache[selectedJobId]
                ? jobResultsCache[selectedJobId]
                : candidates
            }
            savedRoleCandidates={savedRoleCandidates}
            candidatePipelineStage={candidatePipelineStage}
            searchHistory={searchHistory}
          />
        )}

        {/* Tab 5: Recruiter Notes */}
        {activeTab === 'notes' && (
          <RecruiterNotesView
            candidates={allKnownCandidates}
            jobDescriptions={jobDescriptions}
            savedRoleCandidates={savedRoleCandidates}
            jobResultsCache={jobResultsCache}
            onViewCandidate={(candidate) => {
              setSelectedCandidate(candidate);
            }}
            onDeleteNote={handleDeleteNote}
          />
        )}

      </main>

      {/* Candidate Detail Panel */}
      {selectedCandidate && (
        <CandidateDetailPanel
          candidate={selectedCandidate}
          anchorRect={selectedCardRect}
          panelSide="auto"
          onClose={() => {
            setSelectedCandidate(null);
            setSelectedCardRect(null);
          }}
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
