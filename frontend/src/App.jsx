import React, { useState, useEffect, useMemo } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { ConfirmDialogProvider, useConfirm } from './context/ConfirmDialogContext';
import { Navbar } from './components/Navbar';
import CandidateDetailPanel from './components/CandidateDetailPanel';
import { EditCandidateModal } from './components/EditCandidateModal';
import { JobDescriptionModal } from './components/JobDescriptionModal';
import { KanbanPipeline } from './components/KanbanPipeline';
import { DashboardView } from './components/DashboardView';
import { RecruiterNotesView } from './components/RecruiterNotesView';
import { CandidateComparator } from './components/CandidateComparator';
import SourcingHubView from './components/SourcingHubView';
import TeamManagementView from './components/TeamManagementView';
import { AuthModal } from './components/AuthModal';
import SearchMergeModal from './components/SearchMergeModal';
import AuthPage from './components/AuthPage';
import { searchCandidatesApi, getTeamActivitiesApi, logActivityApi } from './services/api';
import { Sparkles } from 'lucide-react';

function getEmptyWorkspaceState() {
  return {
    jobDescriptions: [],
    savedRoleCandidates: {},
    candidatePipelineStage: {},
    searchHistory: [],
    jobResultsCache: {},
    shortlist: []
  };
}

function loadInitialWorkspaceData(teamKey, userKey) {
  // Try team key first, fallback to user key migration if available
  const getVal = (suffix) => {
    const teamVal = localStorage.getItem(`targetalent_team_${teamKey}_${suffix}`) || localStorage.getItem(`digitalia_team_${teamKey}_${suffix}`);
    if (teamVal) {
      try { return JSON.parse(teamVal); } catch (e) { }
    }
    const userVal = localStorage.getItem(`targetalent_user_${userKey}_${suffix}`) || localStorage.getItem(`digitalia_user_${userKey}_${suffix}`);
    if (userVal) {
      try { return JSON.parse(userVal); } catch (e) { }
    }
    return null;
  };

  return {
    jobDescriptions: getVal('job_descriptions') || [],
    savedRoleCandidates: getVal('saved_role_candidates') || {},
    jobResultsCache: getVal('job_results') || {},
    shortlist: getVal('shortlist') || [],
    candidatePipelineStage: getVal('pipeline_stages') || {},
    searchHistory: getVal('search_history') || [],
  };
}

function mergeCandidateResults(existingList = [], newResults = []) {
  const existingMap = new Map();
  const existingNameMap = new Map();

  existingList.forEach((cand) => {
    if (!cand) return;
    const normalized = {
      ...cand,
      isNew: false,
      isPrevious: true,
    };
    if (cand.id) {
      existingMap.set(String(cand.id), normalized);
    }
    if (cand.fullName) {
      existingNameMap.set(cand.fullName.toLowerCase().trim(), normalized);
    }
  });

  const merged = [];
  const handledKeys = new Set();

  newResults.forEach((cand) => {
    if (!cand) return;
    const candId = cand.id ? String(cand.id) : null;
    const candName = cand.fullName ? cand.fullName.toLowerCase().trim() : null;

    const matchedPrev =
      (candId && existingMap.get(candId)) ||
      (candName && existingNameMap.get(candName));

    if (matchedPrev) {
      const prevKey = matchedPrev.id ? String(matchedPrev.id) : candName;
      handledKeys.add(prevKey);
      merged.push({
        ...cand,
        id: matchedPrev.id || cand.id,
        notes: matchedPrev.notes?.length ? matchedPrev.notes : cand.notes || [],
        isSavedForJob: matchedPrev.isSavedForJob || cand.isSavedForJob,
        isNew: false,
        isPrevious: true,
        timesSeen: (Number(matchedPrev.timesSeen) || 1) + 1,
      });
    } else {
      if (candId) handledKeys.add(candId);
      merged.push({
        ...cand,
        isNew: true,
        isPrevious: false,
        sourcedAt: new Date().toISOString(),
      });
    }
  });

  // Append remaining candidates that were previously sourced but not returned in new search
  existingList.forEach((cand) => {
    if (!cand) return;
    const key = cand.id
      ? String(cand.id)
      : cand.fullName
        ? cand.fullName.toLowerCase().trim()
        : null;
    if (key && !handledKeys.has(key)) {
      merged.push({
        ...cand,
        isNew: false,
        isPrevious: true,
      });
    }
  });

  return merged;
}

function tagFreshResults(results = []) {
  return results.map((c) => ({
    ...c,
    isNew: true,
    isPrevious: false,
    sourcedAt: new Date().toISOString(),
  }));
}

function DashboardContent() {
  const { t, lang } = useLanguage();
  const { user, hasPrivilege } = useAuth();
  const teamKey = user?.teamId || 'targetalent_workspace';
  const userKey = user?.email ? user.email.toLowerCase().replace(/[^a-z0-9]/g, '_') : 'guest';

  const [activeTab, setActiveTab] = useState(() => {
    const saved = localStorage.getItem(`digitalia_team_${teamKey}_active_tab`);
    return saved || 'dashboard';
  });

  useEffect(() => {
    localStorage.setItem(`digitalia_team_${teamKey}_active_tab`, activeTab);
  }, [activeTab, teamKey]);

  // Shared Team Workspace Datasets
  const [jobResultsCache, setJobResultsCache] = useState(() => {
    return loadInitialWorkspaceData(teamKey, userKey).jobResultsCache;
  });

  const [jobDescriptions, setJobDescriptions] = useState(() => {
    return loadInitialWorkspaceData(teamKey, userKey).jobDescriptions;
  });

  const [savedRoleCandidates, setSavedRoleCandidates] = useState(() => {
    return loadInitialWorkspaceData(teamKey, userKey).savedRoleCandidates;
  });

  const [shortlist, setShortlist] = useState(() => {
    return loadInitialWorkspaceData(teamKey, userKey).shortlist;
  });

  const [candidatePipelineStage, setCandidatePipelineStage] = useState(() => {
    return loadInitialWorkspaceData(teamKey, userKey).candidatePipelineStage;
  });

  const [searchHistory, setSearchHistory] = useState(() => {
    return loadInitialWorkspaceData(teamKey, userKey).searchHistory;
  });

  const [candidates, setCandidates] = useState(() => {
    const defaultJobId = jobDescriptions[0]?.id;
    return (defaultJobId && jobResultsCache[defaultJobId]) || [];
  });

  const [teamActivities, setTeamActivities] = useState([]);

  // Load team activity logs
  useEffect(() => {
    getTeamActivitiesApi(50).then(data => {
      if (Array.isArray(data)) setTeamActivities(data);
    });
  }, [teamKey]);

  // Synchronize when switching workspace / accounts
  useEffect(() => {
    const data = loadInitialWorkspaceData(teamKey, userKey);
    setJobDescriptions(data.jobDescriptions);
    setSavedRoleCandidates(data.savedRoleCandidates);
    setJobResultsCache(data.jobResultsCache);
    setShortlist(data.shortlist);
    setCandidatePipelineStage(data.candidatePipelineStage);
    setSearchHistory(data.searchHistory);

    const defaultJobId = data.jobDescriptions[0]?.id;
    setCandidates((defaultJobId && data.jobResultsCache[defaultJobId]) || []);
    setSelectedJobId(defaultJobId || null);
  }, [teamKey]);

  // Persist shared team datasets to localStorage on change
  useEffect(() => {
    localStorage.setItem(`targetalent_team_${teamKey}_job_descriptions`, JSON.stringify(jobDescriptions));
  }, [jobDescriptions, teamKey]);

  useEffect(() => {
    localStorage.setItem(`targetalent_team_${teamKey}_saved_role_candidates`, JSON.stringify(savedRoleCandidates));
  }, [savedRoleCandidates, teamKey]);

  useEffect(() => {
    localStorage.setItem(`targetalent_team_${teamKey}_job_results`, JSON.stringify(jobResultsCache));
  }, [jobResultsCache, teamKey]);

  useEffect(() => {
    localStorage.setItem(`targetalent_team_${teamKey}_shortlist`, JSON.stringify(shortlist));
  }, [shortlist, teamKey]);

  useEffect(() => {
    localStorage.setItem(`targetalent_team_${teamKey}_pipeline_stages`, JSON.stringify(candidatePipelineStage));
  }, [candidatePipelineStage, teamKey]);

  useEffect(() => {
    localStorage.setItem(`targetalent_team_${teamKey}_search_history`, JSON.stringify(searchHistory));
  }, [searchHistory, teamKey]);

  // Audit Logging Helper
  const recordActivity = async (actionType, targetTitle, details = '', targetId = '') => {
    try {
      const newEntry = await logActivityApi(actionType, targetTitle, details, targetId);
      if (newEntry) {
        setTeamActivities(prev => [newEntry, ...prev.filter(a => a.id !== newEntry.id)].slice(0, 50));
      }
    } catch (e) {
      console.warn('Could not record activity:', e);
    }
  };

  const [selectedJobId, setSelectedJobId] = useState(() => jobDescriptions[0]?.id || null);

  // Derive all unique known candidates across cache and shortlist
  const allKnownCandidates = useMemo(() => {
    const map = new Map();
    candidates.forEach((c) => {
      if (c?.id) map.set(c.id, c);
    });
    Object.values(jobResultsCache).forEach((entry) => {
      if (Array.isArray(entry)) {
        entry.forEach((c) => {
          if (c?.id) map.set(c.id, c);
        });
      } else if (Array.isArray(entry?.candidates)) {
        entry.candidates.forEach((c) => {
          if (c?.id) map.set(c.id, c);
        });
      } else if (Array.isArray(entry?.sourced)) {
        entry.sourced.forEach((c) => {
          if (c?.id) map.set(c.id, c);
        });
      } else if (Array.isArray(entry?.pool)) {
        entry.pool.forEach((c) => {
          if (c?.id) map.set(c.id, c);
        });
      }
    });
    shortlist.forEach((c) => {
      if (c?.id) map.set(c.id, c);
    });
    return Array.from(map.values());
  }, [candidates, jobResultsCache, shortlist]);

  // Extract candidates that are in the pipeline for the Kanban view
  const pipelineCandidates = useMemo(() => {
    const savedIds = new Set(
      Object.values(savedRoleCandidates).flat().filter(Boolean)
    );
    const list = allKnownCandidates.filter((c) => savedIds.has(c.id));
    return list;
  }, [allKnownCandidates, savedRoleCandidates]);

  // Sourcing & Agent state
  const [isSearching, setIsSearching] = useState(false);
  const [agentStep, setAgentStep] = useState(0);
  const [lastSearch, setLastSearch] = useState(null);
  const [candidatesKey, setCandidatesKey] = useState(0);
  const [searchMode, setSearchMode] = useState('ai');

  // Merge modal state
  const [mergeModalState, setMergeModalState] = useState({
    isOpen: false,
    jobTitle: '',
    existingCount: 0,
    mode: 'ai',
    query: '',
    filters: {},
    targetJobId: null,
  });

  // Candidate inspection & editing state
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [selectedCardRect, setSelectedCardRect] = useState(null);
  const [editingCandidate, setEditingCandidate] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Job Description creation / editing state
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);

  // Comparator & Auth modals
  const [isComparatorOpen, setIsComparatorOpen] = useState(false);
  // Holds whichever candidates the comparator should currently show — either
  // an explicit selection (bulk-select compare, workspace compare button) or,
  // if nothing was passed in, falls back to the team shortlist.
  const [comparatorCandidates, setComparatorCandidates] = useState([]);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const { confirm, showAlert } = useConfirm();

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Single entry point for opening the comparator from anywhere: the
  // workspace-level "Compare" button, or the bulk-select action bar.
  // Both pass the candidates to compare; the full candidate list is passed
  // as the pool so recruiters can toggle additional candidates in the modal.
  const [comparatorInitialIds, setComparatorInitialIds] = useState([]);

  const openComparator = (candidatesToCompare) => {
    const allAvailable =
      candidates.length > 0
        ? candidates
        : Array.isArray(candidatesToCompare) && candidatesToCompare.length > 0
          ? candidatesToCompare
          : shortlist;

    let initialIds = [];
    if (Array.isArray(candidatesToCompare) && candidatesToCompare.length > 0) {
      initialIds = candidatesToCompare.map((c) => c.id);
      // Ensure any candidate in candidatesToCompare is present in the pool
      const poolIds = new Set(allAvailable.map((c) => c.id));
      const missing = candidatesToCompare.filter((c) => !poolIds.has(c.id));
      if (missing.length > 0) {
        allAvailable.push(...missing);
      }
    } else {
      initialIds = allAvailable.slice(0, Math.min(allAvailable.length, 3)).map((c) => c.id);
    }

    setComparatorCandidates([...allAvailable]);
    setComparatorInitialIds(initialIds);
    setIsComparatorOpen(true);
  };

  const executeSearch = async (query, filters = {}, targetJobId = null, action = 'replace') => {
    const activeJobId = targetJobId || selectedJobId;
    const activeJob = jobDescriptions.find((j) => String(j.id) === String(activeJobId));
    const effectiveMode = filters.searchMode || searchMode || 'ai';
    const isPool = effectiveMode === 'pool';
    const cacheKey = isPool ? `${activeJobId}:pool` : activeJobId;

    if (activeJobId && activeJobId !== selectedJobId) {
      setSelectedJobId(activeJobId);
    }

    let effectiveQuery = (query || '').trim();
    if (!effectiveQuery && activeJob) {
      effectiveQuery = activeJob.description || activeJob.prompt || activeJob.title || 'Technical Sourcing';
    }

    let existing = [];
    const cached = jobResultsCache[cacheKey];
    if (Array.isArray(cached)) {
      existing = cached;
    } else if (Array.isArray(cached?.candidates)) {
      existing = cached.candidates;
    }

    const mergedFilters = {
      location: activeJob?.location && activeJob.location !== 'All Locations' ? activeJob.location : '',
      minExp: Number(activeJob?.minExperience) || 0,
      tech: activeJob?.skills || activeJob?.requiredSkills || activeJob?.technologies || [],
      maxResults: Number(activeJob?.maxResults) || 10,
      ...filters,
      offset: action === 'merge' ? existing.length : 0,
      searchMode: effectiveMode,
    };

    setIsSearching(true);
    setAgentStep(1);

    const stepTimer = setInterval(() => {
      setAgentStep((prev) => (prev < 4 ? prev + 1 : prev));
    }, 450);

    try {
      const results = await searchCandidatesApi(effectiveQuery, mergedFilters);
      clearInterval(stepTimer);
      setAgentStep(4);

      let finalList;
      if (action === 'merge' && existing.length > 0) {
        finalList = mergeCandidateResults(existing, results);
        const newlyAdded = finalList.filter(c => c.isNew).length;
        triggerToast(
          lang === 'FR'
            ? `${results.length} profil(s) récupéré(s) (${newlyAdded} nouveaux, ${finalList.length} au total).`
            : `${results.length} profile(s) fetched (${newlyAdded} new, ${finalList.length} total).`
        );
      } else {
        finalList = tagFreshResults(results);
        triggerToast(
          lang === 'FR'
            ? `${finalList.length} nouveaux profils sourcés.`
            : `${finalList.length} fresh candidate profiles sourced.`
        );
      }

      setCandidates(finalList);
      setCandidatesKey((prev) => prev + 1);

      // Cache results under appropriate key
      if (activeJobId) {
        setJobResultsCache((prev) => ({
          ...prev,
          [cacheKey]: finalList,
        }));
      }

      setLastSearch({
        query: effectiveQuery,
        filters: mergedFilters,
        count: finalList.length,
        timestamp: new Date().toLocaleTimeString(),
      });

      // Record activity
      const activityTitle = activeJob?.title || (isPool ? 'Talent Pool' : 'Live Candidate Search');
      recordActivity(
        'SOURCE_SEARCH',
        activityTitle,
        `Sourced ${finalList.length} candidate profile(s) (${isPool ? 'Talent Pool' : 'Live Sourcing'}).`
      );
    } catch (err) {
      clearInterval(stepTimer);
      triggerToast(lang === 'FR' ? 'Erreur lors de la recherche.' : 'Search execution failed.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = async (query, filters = {}, targetJobId = null) => {
    if (!hasPrivilege('source_candidates')) {
      triggerToast(
        lang === 'FR'
          ? 'Privilège requis : Recherche et Sourcing IA.'
          : 'Action restricted: Requires Sourcing & Search privilege.'
      );
      return;
    }

    const activeJobId = targetJobId || selectedJobId;
    const activeJob = jobDescriptions.find((j) => String(j.id) === String(activeJobId));
    const effectiveMode = filters.searchMode || searchMode || 'ai';
    const isPool = effectiveMode === 'pool';
    const cacheKey = isPool ? `${activeJobId}:pool` : activeJobId;

    if (activeJobId && activeJobId !== selectedJobId) {
      setSelectedJobId(activeJobId);
    }

    const cached = jobResultsCache[cacheKey];
    let existing = [];
    if (Array.isArray(cached)) {
      existing = cached;
    } else if (Array.isArray(cached?.candidates)) {
      existing = cached.candidates;
    }

    if (existing.length > 0) {
      setMergeModalState({
        isOpen: true,
        jobTitle: activeJob?.title || '',
        existingCount: existing.length,
        mode: effectiveMode,
        query,
        filters,
        targetJobId: activeJobId,
      });
      return;
    }

    // Direct search if no previous results exist
    executeSearch(query, filters, activeJobId, 'replace');
  };

  const handleSearchModeChange = (mode) => {
    setSearchMode(mode);
    const activeJobId = selectedJobId;
    if (activeJobId) {
      if (mode === 'pool') {
        const cachedPool = jobResultsCache[`${activeJobId}:pool`];
        if (Array.isArray(cachedPool) && cachedPool.length > 0) {
          setCandidates(cachedPool);
        } else {
          setCandidates([]);
        }
      } else {
        const cachedSourced = jobResultsCache[activeJobId];
        if (Array.isArray(cachedSourced) && cachedSourced.length > 0) {
          setCandidates(cachedSourced);
        } else {
          setCandidates([]);
        }
      }
    }
  };

  const handleSelectJob = (jobOrId) => {
    const job = typeof jobOrId === 'object' ? jobOrId : jobDescriptions.find((j) => String(j.id) === String(jobOrId));
    if (!job) return;
    setSelectedJobId(job.id);

    const targetKey = searchMode === 'pool' ? `${job.id}:pool` : job.id;
    const cached = jobResultsCache[targetKey] || jobResultsCache[job.id];
    if (Array.isArray(cached) && cached.length > 0) {
      setCandidates(cached);
    } else {
      setCandidates([]);
    }
  };

  const handleCreateJob = async (newJob, options = { autoSource: true }) => {
    if (!hasPrivilege('create_roles')) {
      await showAlert({
        title: lang === 'FR' ? 'Action restreinte' : 'Action Restricted',
        message: lang === 'FR' ? 'Privilège requis : Création de postes (HR Admin).' : 'Action restricted: Requires Create & Edit Roles privilege.',
        type: 'warning',
      });
      return;
    }

    setJobDescriptions(prev => [...prev, newJob]);
    setSelectedJobId(newJob.id);
    setActiveTab('sourcing');
    recordActivity('ROLE_CREATED', newJob.title, `Created job description for ${newJob.department || 'tech team'} (${newJob.location || 'Remote'})`);
    triggerToast(lang === 'FR' ? 'Fiche de poste créée. Lancement du sourcing IA...' : 'Job description created. Starting AI sourcing...');

    if (options?.autoSource !== false) {
      const queryText = newJob.description || newJob.prompt || newJob.title || 'Technical Sourcing';
      const skillsList = newJob.skills || newJob.requiredSkills || newJob.technologies || [];
      const loc = newJob.location && newJob.location !== 'All Locations' ? newJob.location : '';

      executeSearch(
        queryText,
        {
          location: loc,
          minExp: Number(newJob.minExperience) || 0,
          tech: Array.isArray(skillsList) ? skillsList : [],
          maxResults: Number(newJob.maxResults) || 10,
          searchMode: 'ai',
        },
        newJob.id,
        'replace'
      );
    }
  };

  const handleEditJob = async (updatedJob) => {
    if (!hasPrivilege('create_roles')) {
      await showAlert({
        title: lang === 'FR' ? 'Action restreinte' : 'Action Restricted',
        message: lang === 'FR' ? 'Privilège requis : Modification de postes.' : 'Action restricted: Requires Create & Edit Roles privilege.',
        type: 'warning',
      });
      return;
    }

    setJobDescriptions(prev => prev.map(j => j.id === updatedJob.id ? updatedJob : j));
    recordActivity('ROLE_UPDATED', updatedJob.title, 'Updated job requirements & tech stack');
    triggerToast(lang === 'FR' ? 'Fiche de poste mise à jour.' : 'Job description updated.');
  };

  const handleDeleteJob = async (e, jobId) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!hasPrivilege('create_roles')) {
      await showAlert({
        title: lang === 'FR' ? 'Action restreinte' : 'Action Restricted',
        message: lang === 'FR' ? 'Privilège requis : Suppression de postes.' : 'Action restricted: Requires Create & Edit Roles privilege.',
        type: 'warning',
      });
      return;
    }
    const targetJob = jobDescriptions.find(j => j.id === jobId);
    const confirmed = await confirm({
      title: lang === 'FR' ? 'Supprimer la fiche de poste ?' : 'Delete Job Description?',
      message: lang === 'FR'
        ? `Êtes-vous sûr de vouloir supprimer la fiche "${targetJob?.title || 'sélectionnée'}" ? Cette action effacera également les résultats de sourcing associés.`
        : `Are you sure you want to delete "${targetJob?.title || 'this job'}"? This action will also clear associated sourcing results.`,
      itemBadge: targetJob?.title || 'Job Role',
      confirmText: lang === 'FR' ? 'Supprimer' : 'Delete',
      cancelText: lang === 'FR' ? 'Annuler' : 'Cancel',
      type: 'danger',
    });

    if (confirmed) {
      const updated = jobDescriptions.filter(j => j.id !== jobId);
      setJobDescriptions(updated);

      setSavedRoleCandidates(prev => {
        const next = { ...prev };
        delete next[jobId];
        return next;
      });

      setJobResultsCache(prev => {
        const next = { ...prev };
        delete next[jobId];
        delete next[`${jobId}:pool`];
        return next;
      });

      if (updated.length === 0) {
        setShortlist([]);
        setCandidates([]);
        setSelectedJobId(null);
      } else if (selectedJobId === jobId) {
        handleSelectJob(updated[0]);
      }

      recordActivity('ROLE_DELETED', targetJob?.title || 'Job Description', 'Deleted role description from team workspace');
      triggerToast(lang === 'FR' ? 'Fiche de poste supprimée.' : 'Job description deleted.');
    }
  };

  const handleToggleSaveForJob = async (candidateId, jobId) => {
    if (!hasPrivilege('shortlist_candidates')) {
      await showAlert({
        title: lang === 'FR' ? 'Action restreinte' : 'Action Restricted',
        message: lang === 'FR' ? 'Privilège requis : Sélection de candidats.' : 'Action restricted: Requires Shortlist Candidates privilege.',
        type: 'warning',
      });
      return;
    }

    const cand = allKnownCandidates.find(c => c.id === candidateId);
    const job = jobDescriptions.find(j => j.id === jobId);

    const current = savedRoleCandidates[jobId] || [];
    const isAlreadySaved = current.includes(candidateId);
    let confirmed = true;

    if (isAlreadySaved) {
      confirmed = await confirm({
        title: lang === 'FR' ? 'Retirer du poste ?' : 'Remove from Role?',
        message: lang === 'FR'
          ? `Êtes-vous sûr de vouloir retirer ${cand?.fullName || 'ce candidat'} du poste "${job?.title}" ?`
          : `Are you sure you want to remove ${cand?.fullName || 'this candidate'} from "${job?.title}"?`,
        itemBadge: cand?.fullName || 'Candidate',
        confirmText: lang === 'FR' ? 'Retirer' : 'Remove',
        cancelText: lang === 'FR' ? 'Conserver' : 'Keep',
        type: 'warning',
      });
    } else {
      confirmed = await confirm({
        title: lang === 'FR' ? 'Enregistrer au poste ?' : 'Save to Role?',
        message: lang === 'FR'
          ? `Êtes-vous sûr de vouloir enregistrer ${cand?.fullName || 'ce candidat'} au poste "${job?.title}" ?`
          : `Are you sure you want to save ${cand?.fullName || 'this candidate'} to "${job?.title}"?`,
        itemBadge: cand?.fullName || 'Candidate',
        confirmText: lang === 'FR' ? 'Enregistrer' : 'Save',
        cancelText: lang === 'FR' ? 'Annuler' : 'Cancel',
        type: 'info',
      });
    }

    if (!confirmed) return;

    setSavedRoleCandidates(prev => {
      const current = prev[jobId] || [];
      const isAlreadySaved = current.includes(candidateId);
      const updated = isAlreadySaved
        ? current.filter(id => id !== candidateId)
        : [...current, candidateId];

      if (isAlreadySaved) {
        recordActivity('CANDIDATE_UNSHORTLISTED', cand?.fullName || 'Candidate', `Removed from ${job?.title || 'role'}`);
        triggerToast(lang === 'FR' ? 'Candidat retiré du poste.' : 'Candidate removed from role.');
      } else {
        recordActivity('CANDIDATE_SHORTLISTED', cand?.fullName || 'Candidate', `Saved to role: ${job?.title || 'position'}`);
        triggerToast(lang === 'FR' ? 'Candidat enregistré au poste.' : 'Candidate saved to role.');
      }

      return { ...prev, [jobId]: updated };
    });
  };

  /*
   * Batched shortlist handler for bulk selection.
   *
   * CandidateGridView's bulk-select bar already gathers the full set of
   * candidate ids to shortlist before calling this. Previously, bulk
   * actions looped over `handleToggleSaveForJob` per id — but that handler
   * awaits its own confirm() dialog per call. Since only one confirm
   * dialog can be open/resolved at a time, firing N of them back-to-back
   * meant only the last one in the loop actually got confirmed and
   * applied; the rest silently never resolved. This version does a single
   * state update for the whole batch, with no per-item confirmation.
   */
  const handleBulkToggleSaveForJob = async (candidateIds = [], jobId) => {
    if (!jobId || !candidateIds.length) return;

    if (!hasPrivilege('shortlist_candidates')) {
      await showAlert({
        title: lang === 'FR' ? 'Action restreinte' : 'Action Restricted',
        message: lang === 'FR' ? 'Privilège requis : Sélection de candidats.' : 'Action restricted: Requires Shortlist Candidates privilege.',
        type: 'warning',
      });
      return;
    }

    const job = jobDescriptions.find(j => j.id === jobId);
    let addedCount = 0;

    setSavedRoleCandidates(prev => {
      const current = prev[jobId] || [];
      const currentSet = new Set(current);
      const toAdd = candidateIds.filter(id => !currentSet.has(id));
      addedCount = toAdd.length;

      if (toAdd.length === 0) {
        return prev;
      }

      return { ...prev, [jobId]: [...current, ...toAdd] };
    });

    if (addedCount > 0) {
      recordActivity(
        'CANDIDATE_SHORTLISTED',
        job?.title || 'Role',
        `Saved ${addedCount} candidate(s) to role: ${job?.title || 'position'}`
      );
    }

    triggerToast(
      lang === 'FR'
        ? `${addedCount} candidat(s) enregistré(s) au poste.`
        : `${addedCount} candidate(s) saved to role.`
    );
  };

  const toggleShortlist = async (candidate) => {
    if (!hasPrivilege('shortlist_candidates')) {
      await showAlert({
        title: lang === 'FR' ? 'Action restreinte' : 'Action Restricted',
        message: lang === 'FR' ? 'Privilège requis : Sélection de candidats.' : 'Action restricted: Requires Shortlist Candidates privilege.',
        type: 'warning',
      });
      return;
    }

    const isAlreadyShortlisted = shortlist.some(c => c.id === candidate.id);
    let confirmed = true;

    if (isAlreadyShortlisted) {
      confirmed = await confirm({
        title: lang === 'FR' ? 'Retirer de la sélection ?' : 'Remove from Shortlist?',
        message: lang === 'FR'
          ? `Êtes-vous sûr de vouloir retirer ${candidate.fullName} de la sélection ?`
          : `Are you sure you want to remove ${candidate.fullName} from shortlist?`,
        itemBadge: candidate.fullName,
        confirmText: lang === 'FR' ? 'Retirer' : 'Remove',
        cancelText: lang === 'FR' ? 'Conserver' : 'Keep',
        type: 'warning',
      });
    } else {
      confirmed = await confirm({
        title: lang === 'FR' ? 'Ajouter à la sélection ?' : 'Add to Shortlist?',
        message: lang === 'FR'
          ? `Êtes-vous sûr de vouloir ajouter ${candidate.fullName} à la sélection ?`
          : `Are you sure you want to add ${candidate.fullName} to shortlist?`,
        itemBadge: candidate.fullName,
        confirmText: lang === 'FR' ? 'Ajouter' : 'Add',
        cancelText: lang === 'FR' ? 'Annuler' : 'Cancel',
        type: 'info',
      });
    }

    if (!confirmed) return;

    let updated;
    if (isAlreadyShortlisted) {
      updated = shortlist.filter(c => c.id !== candidate.id);
      recordActivity('CANDIDATE_UNSHORTLISTED', candidate.fullName, 'Removed candidate from team shortlist');
      triggerToast(lang === 'FR' ? `${candidate.fullName} retiré de la sélection.` : `Removed ${candidate.fullName} from shortlist.`);
    } else {
      updated = [...shortlist, candidate];
      recordActivity('CANDIDATE_SHORTLISTED', candidate.fullName, `Shortlisted candidate (${candidate.matchScore || 85}% match)`);
      triggerToast(lang === 'FR' ? `${candidate.fullName} ajouté à la sélection.` : `Added ${candidate.fullName} to shortlist.`);
    }
    setShortlist(updated);
  };

  const handleOpenAddCandidate = () => {
    setEditingCandidate(null);
    setIsEditOpen(true);
  };

  const handleOpenEditCandidate = (candidate) => {
    setEditingCandidate(candidate);
    setIsEditOpen(true);
  };

  const handleSaveCandidate = (savedCandidate) => {
    // 1. Update candidates array
    setCandidates(prev => {
      const exists = prev.some(c => c.id === savedCandidate.id);
      return exists ? prev.map(c => c.id === savedCandidate.id ? savedCandidate : c) : [savedCandidate, ...prev];
    });

    // 2. Update jobResultsCache across ALL roles & pool entries
    setJobResultsCache(prev => {
      const next = {};
      Object.entries(prev).forEach(([key, val]) => {
        if (Array.isArray(val)) {
          const exists = val.some(c => c.id === savedCandidate.id);
          next[key] = exists ? val.map(c => c.id === savedCandidate.id ? savedCandidate : c) : val;
        } else if (val && typeof val === 'object') {
          const nextVal = { ...val };
          if (Array.isArray(val.candidates)) {
            nextVal.candidates = val.candidates.map(c => c.id === savedCandidate.id ? savedCandidate : c);
          }
          if (Array.isArray(val.sourced)) {
            nextVal.sourced = val.sourced.map(c => c.id === savedCandidate.id ? savedCandidate : c);
          }
          if (Array.isArray(val.pool)) {
            nextVal.pool = val.pool.map(c => c.id === savedCandidate.id ? savedCandidate : c);
          }
          next[key] = nextVal;
        } else {
          next[key] = val;
        }
      });

      // If active job cache exists and didn't have the candidate, add it
      if (selectedJobId && Array.isArray(next[selectedJobId]) && !next[selectedJobId].some(c => c.id === savedCandidate.id)) {
        next[selectedJobId] = [savedCandidate, ...next[selectedJobId]];
      }

      return next;
    });

    // 3. Update shortlist if present
    setShortlist(prev => {
      const exists = prev.some(c => c.id === savedCandidate.id);
      return exists ? prev.map(c => c.id === savedCandidate.id ? savedCandidate : c) : prev;
    });

    // 4. Update selectedCandidate if currently open in detail panel
    setSelectedCandidate(prev => (prev && prev.id === savedCandidate.id ? savedCandidate : prev));

    triggerToast(lang === 'FR' ? 'Profil candidat mis à jour avec succès.' : 'Candidate profile updated successfully.');
  };

  const handleDeleteCandidate = async (target) => {
    const id = typeof target === 'object' && target !== null ? target.id : target;
    const cand = allKnownCandidates.find(c => c.id === id) || (typeof target === 'object' ? target : null);
    const candidateName = cand?.fullName || 'Candidate';

    const confirmed = await confirm({
      title: lang === 'FR' ? 'Supprimer le profil candidat ?' : 'Delete Candidate Profile?',
      message: lang === 'FR'
        ? `Êtes-vous sûr de vouloir supprimer ${candidateName} ? Cette action retirera le profil de votre espace de travail.`
        : `Are you sure you want to delete ${candidateName}? This will remove the profile from your workspace, shortlist, and pipeline.`,
      itemBadge: cand?.currentRole ? `${candidateName} • ${cand.currentRole}` : candidateName,
      confirmText: lang === 'FR' ? 'Supprimer' : 'Delete',
      cancelText: lang === 'FR' ? 'Conserver' : 'Keep',
      type: 'danger',
    });

    if (confirmed) {
      setCandidates(prev => prev.filter(c => c.id !== id));
      setShortlist(prev => prev.filter(c => c.id !== id));

      setJobResultsCache(prev => {
        const next = {};
        Object.entries(prev).forEach(([key, val]) => {
          if (Array.isArray(val)) {
            next[key] = val.filter(c => c.id !== id);
          } else if (val && typeof val === 'object') {
            const nextVal = { ...val };
            if (Array.isArray(val.candidates)) nextVal.candidates = val.candidates.filter(c => c.id !== id);
            if (Array.isArray(val.sourced)) nextVal.sourced = val.sourced.filter(c => c.id !== id);
            if (Array.isArray(val.pool)) nextVal.pool = val.pool.filter(c => c.id !== id);
            next[key] = nextVal;
          } else {
            next[key] = val;
          }
        });
        return next;
      });

      setSavedRoleCandidates(prev => {
        const next = {};
        Object.entries(prev).forEach(([jobId, ids]) => {
          next[jobId] = Array.isArray(ids) ? ids.filter(candId => candId !== id) : [];
        });
        return next;
      });

      if (selectedCandidate?.id === id) {
        setSelectedCandidate(null);
      }
      recordActivity('PROFILE_DELETED', candidateName, 'Deleted candidate profile');
      triggerToast(lang === 'FR' ? 'Profil supprimé.' : 'Profile deleted.');
    }
  };

  /*
   * Batched delete handler for bulk selection.
   *
   * CandidateGridView's bulk-select bar already shows a single confirm
   * dialog for the whole batch before calling this — so this function
   * performs the deletion for every id directly, with no additional
   * per-item confirmation. (See handleBulkToggleSaveForJob above for why
   * looping over the single-candidate handler was the bug.)
   */
  const handleBulkDeleteCandidates = async (candidateIds = []) => {
    if (!candidateIds.length) return;

    const idSet = new Set(candidateIds);

    setCandidates(prev => prev.filter(c => !idSet.has(c.id)));
    setShortlist(prev => prev.filter(c => !idSet.has(c.id)));

    setJobResultsCache(prev => {
      const next = {};
      Object.entries(prev).forEach(([key, val]) => {
        if (Array.isArray(val)) {
          next[key] = val.filter(c => !idSet.has(c.id));
        } else if (val && typeof val === 'object') {
          const nextVal = { ...val };
          if (Array.isArray(val.candidates)) nextVal.candidates = val.candidates.filter(c => !idSet.has(c.id));
          if (Array.isArray(val.sourced)) nextVal.sourced = val.sourced.filter(c => !idSet.has(c.id));
          if (Array.isArray(val.pool)) nextVal.pool = val.pool.filter(c => !idSet.has(c.id));
          next[key] = nextVal;
        } else {
          next[key] = val;
        }
      });
      return next;
    });

    setSavedRoleCandidates(prev => {
      const next = {};
      Object.entries(prev).forEach(([jobId, ids]) => {
        next[jobId] = Array.isArray(ids) ? ids.filter(candId => !idSet.has(candId)) : [];
      });
      return next;
    });

    setSelectedCandidate(prev => (prev && idSet.has(prev.id) ? null : prev));

    recordActivity(
      'PROFILE_DELETED',
      candidateIds.length === 1 ? 'Candidate' : `${candidateIds.length} candidates`,
      candidateIds.length === 1
        ? 'Deleted candidate profile'
        : `Bulk deleted ${candidateIds.length} candidate profiles`
    );

    triggerToast(
      lang === 'FR'
        ? `${candidateIds.length} profil(s) supprimé(s).`
        : `${candidateIds.length} profile(s) deleted.`
    );
  };

  const handleAddNote = async (candidateId, noteText) => {
    if (!hasPrivilege('manage_notes')) {
      await showAlert({
        title: lang === 'FR' ? 'Action restreinte' : 'Action Restricted',
        message: lang === 'FR' ? 'Privilège requis : Gestion des notes.' : 'Action restricted: Requires Recruiter Notes privilege.',
        type: 'warning',
      });
      return;
    }

    const cand = allKnownCandidates.find(c => c.id === candidateId);
    const isFR = lang === 'FR';
    const now = new Date();
    const datePart = now.toLocaleDateString(isFR ? 'fr-FR' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric' });
    const timePart = now.toLocaleTimeString(isFR ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' });
    const timestamp = isFR ? `${datePart} à ${timePart}` : `${datePart} at ${timePart}`;

    const newNote = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: noteText,
      time: timestamp,
      authorName: user?.fullName || user?.name || 'Recruiter',
      authorRole: user?.role || 'RECRUITER',
      createdAt: now.toISOString(),
    };

    const updateCandNotes = (c) => (c.id === candidateId ? { ...c, notes: [...(c.notes || []), newNote] } : c);

    setCandidates(prev => prev.map(updateCandNotes));
    setSelectedCandidate(prev => (prev && prev.id === candidateId ? updateCandNotes(prev) : prev));
    setShortlist(prev => prev.map(updateCandNotes));

    setJobResultsCache(prev => {
      const next = {};
      Object.entries(prev).forEach(([key, val]) => {
        if (Array.isArray(val)) {
          next[key] = val.map(updateCandNotes);
        } else if (val && typeof val === 'object') {
          const nextVal = { ...val };
          if (Array.isArray(val.candidates)) nextVal.candidates = val.candidates.map(updateCandNotes);
          if (Array.isArray(val.sourced)) nextVal.sourced = val.sourced.map(updateCandNotes);
          if (Array.isArray(val.pool)) nextVal.pool = val.pool.map(updateCandNotes);
          next[key] = nextVal;
        } else {
          next[key] = val;
        }
      });
      return next;
    });

    recordActivity('NOTE_ADDED', cand?.fullName || 'Candidate', `Added note: "${noteText.substring(0, 50)}${noteText.length > 50 ? '...' : ''}"`);
    triggerToast(lang === 'FR' ? 'Note enregistrée.' : 'Note saved.');
  };

  const handleDeleteNote = async (candidateId, noteId) => {
    if (!hasPrivilege('manage_notes')) {
      await showAlert({
        title: lang === 'FR' ? 'Action restreinte' : 'Action Restricted',
        message: lang === 'FR' ? 'Privilège requis : Gestion des notes.' : 'Action restricted: Requires Recruiter Notes privilege.',
        type: 'warning',
      });
      return;
    }

    const cand = allKnownCandidates.find(c => c.id === candidateId);
    const confirmed = await confirm({
      title: lang === 'FR' ? 'Supprimer la note d\'évaluation ?' : 'Delete Screening Note?',
      message: lang === 'FR'
        ? 'Êtes-vous sûr de vouloir supprimer cette note d\'évaluation ? Cette action est irréversible.'
        : 'Are you sure you want to delete this evaluation note? This action cannot be undone.',
      itemBadge: cand?.fullName ? `Candidate: ${cand.fullName}` : 'Screening Note',
      confirmText: lang === 'FR' ? 'Supprimer' : 'Delete',
      cancelText: lang === 'FR' ? 'Annuler' : 'Cancel',
      type: 'danger',
    });

    if (confirmed) {
      const filterCandNotes = (c) => (c.id === candidateId ? { ...c, notes: (c.notes || []).filter(n => n.id !== noteId) } : c);

      setCandidates(prev => prev.map(filterCandNotes));
      setSelectedCandidate(prev => (prev && prev.id === candidateId ? filterCandNotes(prev) : prev));
      setShortlist(prev => prev.map(filterCandNotes));

      setJobResultsCache(prev => {
        const next = {};
        Object.entries(prev).forEach(([key, val]) => {
          if (Array.isArray(val)) {
            next[key] = val.map(filterCandNotes);
          } else if (val && typeof val === 'object') {
            const nextVal = { ...val };
            if (Array.isArray(val.candidates)) nextVal.candidates = val.candidates.map(filterCandNotes);
            if (Array.isArray(val.sourced)) nextVal.sourced = val.sourced.map(filterCandNotes);
            if (Array.isArray(val.pool)) nextVal.pool = val.pool.map(filterCandNotes);
            next[key] = nextVal;
          } else {
            next[key] = val;
          }
        });
        return next;
      });

      recordActivity('NOTE_DELETED', cand?.fullName || 'Candidate', 'Deleted screening note evaluation');
      triggerToast(lang === 'FR' ? 'Note supprimée.' : 'Note deleted.');
    }
  };

  const handleUpdateCandidateStage = (candidateId, stage) => {
    const cand = allKnownCandidates.find(c => c.id === candidateId);
    setCandidatePipelineStage(prev => ({
      ...prev,
      [candidateId]: stage,
    }));
    recordActivity('STAGE_CHANGED', cand?.fullName || 'Candidate', `Moved to pipeline stage: ${stage.toUpperCase()}`);
  };

  const handleViewDetails = (candidate, e) => {
    if (e && e.currentTarget) {
      setSelectedCardRect(e.currentTarget.getBoundingClientRect());
    }
    setSelectedCandidate(candidate);
  };

  return (
    <div className="min-h-screen bg-[#FBFAF7] text-[#12151B] font-sans antialiased selection:bg-[#E9F7FA] selection:text-[#0A7E96]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#12151B] text-white px-5 py-3 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-[#6FCEE3]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAuth={() => setIsAuthOpen(true)}
        shortlistCount={shortlist.length}
        notesCount={allKnownCandidates.reduce((acc, c) => acc + (c.notes?.length || 0), 0)}
        onToast={triggerToast}
      />

      {/* Main Content Area */}
      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6 pb-20">

        {/* Tab: Sourcing Hub */}
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
            // Workspace-level "Compare" button (shown above the grid).
            onCompare={openComparator}
            // Bulk-select action bar's "Compare" button (shown when 2+ cards
            // are checked). Both routes go through the same openComparator
            // so the modal always receives the candidates actually chosen.
            onOpenComparator={openComparator}
            onNewDescription={() => setIsJobModalOpen(true)}
            onEditDescription={(job) => { setEditingJob(job); setIsJobModalOpen(true); }}
            // Batched handlers for the grid's bulk-select bar — a single
            // confirm + single state update per action, instead of looping
            // the single-candidate handlers (which each await their own
            // confirm dialog and would race/clobber each other).
            candidateGridProps={{
              onBulkDelete: handleBulkDeleteCandidates,
              onBulkToggleSaveForJob: handleBulkToggleSaveForJob,
            }}
          />
        )}

        {/* Tab: Kanban Pipeline View */}
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

        {/* Tab: Dashboard Overview & Team Activity Feed */}
        {activeTab === 'dashboard' && (
          <DashboardView
            user={user}
            jobDescriptions={jobDescriptions}
            candidates={allKnownCandidates}
            savedRoleCandidates={savedRoleCandidates}
            candidatePipelineStage={candidatePipelineStage}
            activities={teamActivities}
            lang={lang}
            onStageClick={(stage) => {
              if (stage) setActiveTab('pipeline');
            }}
            onSelectJob={(jobId) => {
              if (jobId) {
                setActiveTab('sourcing');
                handleSelectJob(jobId);
              }
            }}
            onSelectCandidate={(candidate) => {
              if (candidate) setSelectedCandidate(candidate);
            }}
          />
        )}

        {/* Tab: Recruiter Notes */}
        {activeTab === 'notes' && (
          <RecruiterNotesView
            candidates={allKnownCandidates}
            jobDescriptions={jobDescriptions}
            savedRoleCandidates={savedRoleCandidates}
            jobResultsCache={jobResultsCache}
            onViewCandidate={(candidate) => setSelectedCandidate(candidate)}
            onDeleteNote={handleDeleteNote}
            onAddNote={handleAddNote}
          />
        )}

        {/* Tab: HR Admin Team & Privilege Management */}
        {activeTab === 'team' && (
          <TeamManagementView
            onNavigateToDashboard={() => setActiveTab('dashboard')}
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

          // USE THE SAME SHORTLIST LOGIC AS THE CARD
          onToggleSaveForJob={handleToggleSaveForJob}
          selectedJobId={selectedJobId}
          isSavedForJob={
            selectedJobId
              ? (savedRoleCandidates[selectedJobId] || []).includes(
                selectedCandidate.id
              )
              : false
          }

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
      />

      {/* Candidate Comparator */}
      {isComparatorOpen && (
        <CandidateComparator
          candidates={comparatorCandidates}
          initialSelectedIds={comparatorInitialIds}
          onClose={() => setIsComparatorOpen(false)}
          onViewCandidate={setSelectedCandidate}
        />
      )}

      {/* Search Merge / Retention Modal */}
      <SearchMergeModal
        isOpen={mergeModalState.isOpen}
        jobTitle={mergeModalState.jobTitle}
        existingCount={mergeModalState.existingCount}
        mode={mergeModalState.mode}
        onKeepAndMerge={() => {
          const { query, filters, targetJobId } = mergeModalState;
          setMergeModalState((prev) => ({ ...prev, isOpen: false }));
          executeSearch(query, filters, targetJobId, 'merge');
        }}
        onReplace={() => {
          const { query, filters, targetJobId } = mergeModalState;
          setMergeModalState((prev) => ({ ...prev, isOpen: false }));
          executeSearch(query, filters, targetJobId, 'replace');
        }}
        onCancel={() => {
          setMergeModalState((prev) => ({ ...prev, isOpen: false }));
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <ConfirmDialogProvider>
          <AppContent />
        </ConfirmDialogProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  const [hasInvite, setHasInvite] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return Boolean(params.get('invite'));
    }
    return false;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBFAF7] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-[#0A7E96]/30 border-t-[#0A7E96] rounded-full animate-spin" />
      </div>
    );
  }

  if (hasInvite || !user) {
    return <AuthPage onAccepted={() => setHasInvite(false)} onClearInvite={() => setHasInvite(false)} />;
  }

  return <DashboardContent />;
}