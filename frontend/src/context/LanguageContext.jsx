import React, { createContext, useContext, useState } from 'react';

const LanguageContext = createContext(null);

export const translations = {
  EN: {
    // Navbar
    appTitle: 'DIGITALIA',
    appSubtitle: 'Autonomous Technical Sourcing Platform',
    agentVersion: 'AGENT v1.0',
    sourcingHub: 'Sourcing Hub',
    shortlists: 'My Projects',
    dashboard: 'Dashboard',
    apiConnected: 'API Connected',
    mockModeActive: 'Mock Mode Active',
    signIn: 'Sign In',

    // Search Console
    aiSearchTitle: 'AI Talent Sourcing Console',
    aiSearchDesc: 'Describe your ideal candidate in natural language or specify target skill combinations.',
    advancedFilters: 'Advanced Filters',
    hideFilters: 'Hide Advanced Filters',
    searchPlaceholder: 'e.g., Senior Java developer with 5+ years experience in Spring Boot & Docker in France...',
    sourcingBtn: 'Source Candidates',
    sourcingProgress: 'Sourcing...',
    quickPrompts: 'Quick Prompts:',
    targetLocation: 'Target Location',
    allLocations: 'All Locations',
    minExperience: 'Min. Experience',
    mustHaveSkills: 'Must-Have Tech Skills',
    years: 'Years',

    // Agent Status Widget
    pipelineTitle: 'Autonomous AI Agent Execution Pipeline',
    activeProcess: 'Active Process',
    pipelineDesc: 'Live orchestration of candidate sourcing & scoring microservices',
    totalEvaluated: 'Total Profiles Evaluated',
    step1Label: 'Query Parsing',
    step1Desc: 'Analyzing search intent & required skills',
    step2Label: 'Talent Pool Scan',
    step2Desc: 'Querying database & agent profiles',
    step3Label: 'AI Match Scoring',
    step3Desc: 'Evaluating candidate experience & stack fit',
    step4Label: 'Ranking Profiles',
    step4Desc: 'Shortlisting top verified candidate matches',

    // Candidate Card & Details
    match: 'Match',
    matchScore: 'Match Score',
    yearsExp: 'Years Exp.',
    aiRationale: 'AI Rationale:',
    shortlist: 'Save to Role',
    shortlisted: 'Saved to Role',
    viewProfile: 'View Profile',
    closeProfile: 'Close Profile',
    professionalOverview: 'Professional Overview',
    aiEvaluation: 'AI Agent Suitability Evaluation',
    verifiedSkills: 'Verified Technical Competencies',
    education: 'Education & Qualifications',
    contacts: 'Verified Contact Profiles',
    recruiterNotes: 'Internal Recruiter Notes',
    saveNote: 'Save Note',
    addNotePlaceholder: 'Add screening evaluation note...',
    expectation: 'Expectation:',
    availability: 'Availability:',
    inShortlist: 'Saved to Role',
    addToShortlist: 'Save to Role',

    // Shortlist Panel
    shortlistTitle: 'Bookmarked Shortlists & Talent Pool',
    shortlistDesc: 'Review and export candidates shortlisted by your technical recruitment team.',
    exportCsv: 'Export CSV Report',
    noShortlistedYet: 'No Shortlisted Candidates Yet',
    noShortlistedDesc: 'Click the "Shortlist" button on any candidate card in the Sourcing Hub to bookmark profiles.',
    candidate: 'Candidate',
    locationExp: 'Location & Exp',
    topSkills: 'Top Skills',
    actions: 'Actions',

    // Directory
    talentProfiles: 'Candidate Talent Profiles',
    showingProfiles: 'Showing {count} verified candidate profiles matching your query.',
    resetView: 'Reset View',
    noCandidatesMatched: 'No Candidates Matched Your Criteria',
    noCandidatesDesc: 'Try broadening your search prompt or removing tech stack filters.',

    // Footer
    footerCopyright: '© 2026 Enterprise Automated Candidate Sourcing',
    secured: 'JWT & Rate Limit Secured',
    addCandidate: 'Add Candidate',
    editCandidate: 'Edit Candidate',
    deleteCandidate: 'Delete Profile',
    saveCandidate: 'Save Profile',
    createProfile: 'Create Profile',
    jobDescriptions: 'Job Descriptions',
    newJobDesc: 'New Job Description',
    professionTitle: 'Profession / Title',
    jobDescriptionText: 'Detailed Job Description',
    createAndSource: 'Create & Source Candidates',
    selectJobDescToSource: 'Select a profile to run sourcing'
  },
  FR: {
    // Navbar
    appTitle: 'DIGITALIA',
    appSubtitle: 'Plateforme Autonome de Sourcing Technique',
    agentVersion: 'AGENT v1.0',
    sourcingHub: 'Espace Sourcing',
    shortlists: 'Mes Projets',
    dashboard: 'Tableau de Bord',
    apiConnected: 'API Connectée',
    mockModeActive: 'Mode Démo Actif',
    signIn: 'Se Connecter',

    // Search Console
    aiSearchTitle: 'Console de Sourcing Talent IA',
    aiSearchDesc: 'Décrivez votre candidat idéal en langage naturel ou spécifiez les compétences requises.',
    advancedFilters: 'Filtres Avancés',
    hideFilters: 'Masquer les Filtres',
    searchPlaceholder: 'ex: Développeur Java Senior avec 5+ ans d\'expérience Spring Boot & Docker en France...',
    sourcingBtn: 'Lancer le Sourcing',
    sourcingProgress: 'Recherche en cours...',
    quickPrompts: 'Recherches Rapides :',
    targetLocation: 'Localisation',
    allLocations: 'Toutes les localisations',
    minExperience: 'Expérience Min.',
    mustHaveSkills: 'Compétences Indispensables',
    years: 'Ans',

    // Agent Status Widget
    pipelineTitle: 'Pipeline d\'Exécution de l\'Agent IA Autonome',
    activeProcess: 'Processus Actif',
    pipelineDesc: 'Orchestration en direct du sourcing & du scoring par microservices',
    totalEvaluated: 'Profils Évalués au Total',
    step1Label: 'Analyse de la Requête',
    step1Desc: 'Analyse de l\'intention et des compétences requises',
    step2Label: 'Scan du Vivier Talent',
    step2Desc: 'Interrogation de la base de données et profils agents',
    step3Label: 'Scoring IA de Correspondance',
    step3Desc: 'Évaluation de l\'expérience et de l\'adéquation technique',
    step4Label: 'Classement des Profils',
    step4Desc: 'Sélection des meilleures correspondances vérifiées',

    // Candidate Card & Details
    match: 'Score',
    matchScore: 'Score de Correspondance',
    yearsExp: 'Ans d\'Exp.',
    aiRationale: 'Justification IA :',
    shortlist: 'Enregistrer au poste',
    shortlisted: 'Enregistré au poste',
    viewProfile: 'Voir Profil',
    closeProfile: 'Fermer',
    professionalOverview: 'Aperçu Professionnel',
    aiEvaluation: 'Évaluation d\'Adéquation de l\'Agent IA',
    verifiedSkills: 'Compétences Techniques Vérifiées',
    education: 'Diplômes & Formation',
    contacts: 'Coordonnées & Réseaux',
    recruiterNotes: 'Notes Internes Recruteur',
    saveNote: 'Enregistrer Note',
    addNotePlaceholder: 'Ajouter une note d\'évaluation...',
    expectation: 'Prétentions :',
    availability: 'Disponibilité :',
    inShortlist: 'Enregistré au poste',
    addToShortlist: 'Enregistrer au poste',

    // Shortlist Panel
    shortlistTitle: 'Sélections & Vivier de Talents',
    shortlistDesc: 'Consultez et exportez les candidats sélectionnés par votre équipe de recrutement.',
    exportCsv: 'Exporter Rapport CSV',
    noShortlistedYet: 'Aucun Candidat Sélectionné',
    noShortlistedDesc: 'Cliquez sur "Sélectionner" sur n\'importe quel profil pour l\'ajouter au vivier.',
    candidate: 'Candidat',
    locationExp: 'Lieu & Exp.',
    topSkills: 'Compétences Clés',
    actions: 'Actions',

    // Directory
    talentProfiles: 'Profils de Talents Candidats',
    showingProfiles: 'Affichage de {count} profils candidats correspondant à votre recherche.',
    resetView: 'Réinitialiser',
    noCandidatesMatched: 'Aucun Candidat Ne Correspond à Vos Critères',
    noCandidatesDesc: 'Essayez d\'élargir votre recherche ou de retirer certains filtres techniques.',

    // Footer
    footerCopyright: '© 2026 Sourcing de Candidats Automatisé d\'Entreprise',
    secured: 'Sécurisé par JWT & Limiteur de Débit',
    addCandidate: 'Ajouter Candidat',
    editCandidate: 'Modifier Profil',
    deleteCandidate: 'Supprimer Profil',
    saveCandidate: 'Enregistrer Profil',
    createProfile: 'Créer Profil',
    jobDescriptions: 'Fiches de Poste',
    newJobDesc: 'Nouvelle Fiche de Poste',
    professionTitle: 'Métier / Titre',
    jobDescriptionText: 'Description du Poste',
    createAndSource: 'Créer & Lancer le Sourcing',
    selectJobDescToSource: 'Sélectionnez une fiche de poste pour lancer le sourcing'
  }
};

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState('EN');

  const toggleLanguage = () => {
    setLang(prev => (prev === 'EN' ? 'FR' : 'EN'));
  };

  const t = (key, params = {}) => {
    let str = translations[lang]?.[key] || translations['EN']?.[key] || key;
    Object.keys(params).forEach(param => {
      str = str.replace(`{${param}}`, params[param]);
    });
    return str;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
