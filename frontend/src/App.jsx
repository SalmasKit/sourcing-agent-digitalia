import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { ConfirmDialogProvider, useConfirm } from './context/ConfirmDialogContext';
import { Navbar } from './components/Navbar';
import SearchConsole from './components/SearchConsole';
import AgentStatusWidget from './components/AgentStatusWidget';
import { CandidateCard } from './components/CandidateCard';
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
import AuthPage from './components/AuthPage';
import { searchCandidatesApi, getInitialCandidates, getTeamActivitiesApi, logActivityApi } from './services/api';
import { getAvatarUrl } from './utils/avatar';
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
    candidates.forEach(c => { if (c?.id) map.set(c.id, c); });
    Object.values(jobResultsCache).flat().forEach(c => { if (c?.id) map.set(c.id, c); });
    shortlist.forEach(c => { if (c?.id) map.set(c.id, c); });
    return Array.from(map.values());
  }, [candidates, jobResultsCache, shortlist]);

  // Extract candidates that are in the pipeline for the Kanban view
  const pipelineCandidates = useMemo(() => {
    const savedIds = new Set(Object.values(savedRoleCandidates).flat().filter(Boolean));
    const list = allKnownCandidates.filter(c => savedIds.has(c.id));
    return list;
  }, [allKnownCandidates, savedRoleCandidates]);

  // Sourcing & Agent state
  const [isSearching, setIsSearching] = useState(false);
  const [agentStep, setAgentStep] = useState(0);
  const [lastSearch, setLastSearch] = useState(null);
  const [candidatesKey, setCandidatesKey] = useState(0);
  const [searchMode, setSearchMode] = useState('live');

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
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const { confirm, showAlert } = useConfirm();

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSearch = async (query, filters = {}) => {
    if (!hasPrivilege('source_candidates')) {
      triggerToast(lang === 'FR' ? 'Privilège requis : Recherche et Sourcing IA.' : 'Action restricted: Requires Sourcing & Search privilege.');
      return;
    }

    setIsSearching(true);
    setAgentStep(1);

    const stepTimer = setInterval(() => {
      setAgentStep(prev => (prev < 4 ? prev + 1 : prev));
    }, 450);

    try {
      const results = await searchCandidatesApi(query, { ...filters, searchMode });
      clearInterval(stepTimer);
      setAgentStep(4);
      setCandidates(results);
      setCandidatesKey(prev => prev + 1);

      // Cache results under selected job if active
      if (selectedJobId) {
        setJobResultsCache(prev => ({
          ...prev,
          [selectedJobId]: results
        }));
      }

      setLastSearch({
        query,
        filters,
        count: results.length,
        timestamp: new Date().toLocaleTimeString(),
      });

      // Record activity
      recordActivity('SOURCE_SEARCH', query || 'Candidate Search', `Sourced ${results.length} candidate profiles.`);
    } catch (err) {
      clearInterval(stepTimer);
      triggerToast(lang === 'FR' ? 'Erreur lors de la recherche.' : 'Search execution failed.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchModeChange = (mode) => {
    setSearchMode(mode);
    const activeJobId = selectedJobId;
    if (activeJobId && mode === 'pool') {
      const cachedPool = jobResultsCache[`${activeJobId}:pool`];
      if (cachedPool && cachedPool.length > 0) {
        setCandidates(cachedPool);
      }
    }
  };

  const handleSelectJob = (jobOrId) => {
    const job = typeof jobOrId === 'object' ? jobOrId : jobDescriptions.find(j => String(j.id) === String(jobOrId));
    if (!job) return;
    setSelectedJobId(job.id);

    const cached = jobResultsCache[job.id];
    if (cached && cached.length > 0) {
      setCandidates(cached);
    } else {
      setCandidates([]);
    }
  };

  const handleCreateJob = (newJob) => {
    if (!hasPrivilege('create_roles')) {
      triggerToast(lang === 'FR' ? 'Privilège requis : Création de postes (HR Admin).' : 'Action restricted: Requires Create & Edit Roles privilege.');
      return;
    }
    setJobDescriptions(prev => [...prev, newJob]);
    handleSelectJob(newJob);
    recordActivity('ROLE_CREATED', newJob.title, `Created job description for ${newJob.department || 'tech team'} (${newJob.location || 'Remote'})`);
    triggerToast(lang === 'FR' ? 'Fiche de poste créée avec succès.' : 'Job description created successfully.');
  };

  const handleEditJob = (updatedJob) => {
    if (!hasPrivilege('create_roles')) {
      triggerToast(lang === 'FR' ? 'Privilège requis : Modification de postes.' : 'Action restricted: Requires Create & Edit Roles privilege.');
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
      confirmText: lang === 'FR' ? 'Supprimer le poste' : 'Delete Job',
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

  const handleToggleSaveForJob = (candidateId, jobId) => {
    if (!hasPrivilege('shortlist_candidates')) {
      triggerToast(lang === 'FR' ? 'Privilège requis : Sélection de candidats.' : 'Action restricted: Requires Shortlist Candidates privilege.');
      return;
    }

    const cand = allKnownCandidates.find(c => c.id === candidateId);
    const job = jobDescriptions.find(j => j.id === jobId);

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

  const toggleShortlist = (candidate) => {
    if (!hasPrivilege('shortlist_candidates')) {
      triggerToast(lang === 'FR' ? 'Privilège requis : Sélection de candidats.' : 'Action restricted: Requires Shortlist Candidates privilege.');
      return;
    }

    const isAlreadyShortlisted = shortlist.some(c => c.id === candidate.id);
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

    if (savedCandidate.shortlisted) {
      setShortlist(prev => {
        const shortExists = prev.some(c => c.id === savedCandidate.id);
        return shortExists ? prev.map(c => c.id === savedCandidate.id ? savedCandidate : c) : [...prev, savedCandidate];
      });
    } else {
      setShortlist(prev => prev.filter(c => c.id !== savedCandidate.id));
    }
  };

  const handleDeleteCandidate = async (target) => {
    const id = typeof target === 'object' && target !== null ? target.id : target;
    const cand = allKnownCandidates.find(c => c.id === id) || (typeof target === 'object' ? target : null);
    const candidateName = cand?.fullName || 'Candidate';

    const confirmed = await confirm({
      title: lang === 'FR' ? 'Supprimer le profil candidat ?' : 'Delete Candidate Profile?',
      message: lang === 'FR'
        ? `Êtes-vous sûr de vouloir supprimer ${candidateName} ? Cette action retirera le profil de la sélection et du pipeline.`
        : `Are you sure you want to delete ${candidateName}? This will remove the profile from your workspace, shortlist, and pipeline.`,
      itemBadge: cand?.currentRole ? `${candidateName} • ${cand.currentRole}` : candidateName,
      confirmText: lang === 'FR' ? 'Supprimer le profil' : 'Delete Profile',
      cancelText: lang === 'FR' ? 'Conserver' : 'Keep',
      type: 'danger',
    });

    if (confirmed) {
      setCandidates(prev => prev.filter(c => c.id !== id));
      setShortlist(prev => prev.filter(c => c.id !== id));
      if (selectedCandidate?.id === id) {
        setSelectedCandidate(null);
      }
      recordActivity('PROFILE_DELETED', candidateName, 'Deleted candidate profile');
      triggerToast(lang === 'FR' ? 'Profil supprimé.' : 'Profile deleted.');
    }
  };

  const handleAddNote = (candidateId, noteText) => {
    if (!hasPrivilege('manage_notes')) {
      triggerToast(lang === 'FR' ? 'Privilège requis : Gestion des notes.' : 'Action restricted: Requires Recruiter Notes privilege.');
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

    setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, notes: [...(c.notes || []), newNote] } : c));
    setSelectedCandidate(prev => prev && prev.id === candidateId ? { ...prev, notes: [...(prev.notes || []), newNote] } : prev);
    setShortlist(prev => prev.map(c => c.id === candidateId ? { ...c, notes: [...(c.notes || []), newNote] } : c));

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
      confirmText: lang === 'FR' ? 'Supprimer la note' : 'Delete Note',
      cancelText: lang === 'FR' ? 'Annuler' : 'Cancel',
      type: 'danger',
    });

    if (confirmed) {
      setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, notes: (c.notes || []).filter(n => n.id !== noteId) } : c));
      setSelectedCandidate(prev => prev && prev.id === candidateId ? { ...prev, notes: (prev.notes || []).filter(n => n.id !== noteId) } : prev);
      setShortlist(prev => prev.map(c => c.id === candidateId ? { ...c, notes: (c.notes || []).filter(n => n.id !== noteId) } : c));

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
            onOpenComparator={() => setIsComparatorOpen(true)}
            onNewDescription={() => setIsJobModalOpen(true)}
            onEditDescription={(job) => { setEditingJob(job); setIsJobModalOpen(true); }}
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
      />

      {/* Candidate Comparator */}
      {isComparatorOpen && (
        <CandidateComparator
          candidates={shortlist}
          onClose={() => setIsComparatorOpen(false)}
          onViewCandidate={setSelectedCandidate}
        />
      )}
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
