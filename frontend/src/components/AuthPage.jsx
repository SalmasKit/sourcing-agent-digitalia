import React, { useState, useEffect, useRef } from 'react';
import {
  LogIn, UserPlus, Lock, Mail, User, ShieldCheck, Briefcase,
  Eye, EyeOff, ArrowRight, AlertCircle, Sparkles, X, Users,
  Zap, BarChart3, CheckCircle2, Play, ChevronRight, ChevronLeft,
  Search, Layers, Lightbulb, Copy, Check, Globe
} from 'lucide-react';
import targetalentLogo from '../assets/targetalent.svg';
import { useAuth } from '../context/AuthContext';
import { ForgotPasswordModal } from './ForgotPasswordModal';

const TUTO_ICONS = { Search, Zap, BarChart3, Layers, Users };

/* ------------------------------------------------------------------
   Copy — Bilingual (EN / FR)
   ------------------------------------------------------------------ */
const COPY = {
  EN: {
    eyebrow: 'Sourcing agent, live',
    headline1: 'Find the right person',
    headlineAccent: 'for every role',
    headline2: 'you\'re hiring for.',
    sub: 'Targetalent scans, scores, and routes qualified candidates across engineering, product, sales, marketing, operations, and leadership — with permissions built around how recruiting teams actually work.',
    ctaPrimary: 'Get started free',
    ctaSecondary: 'Sign in',
    ctaHeroInvite: 'Accept team invite',
    ctaTour: 'See how it works',
    inviteBannerText: 'You\'ve been invited to join a hiring workspace.',
    inviteBannerAction: 'Complete registration',
    badgeMetric1: '10x faster sourcing',
    badgeMetric2: '94% match precision',
    badgeMetric3: 'Cross-industry coverage',

    tutorialBadge: 'Product tour',
    tutorialTitle: 'From job description to shortlist in minutes',
    tutorialSub: 'The same workflow your team will run every day — walk through it below.',
    tutorialSteps: [
      { id: 'prompt', icon: 'Search', step: '01', title: 'Define the role', shortDesc: 'Input any job description or a plain-language brief.', tip: 'Supports multi-criteria parameters: seniority, location, tools, and domain expertise.' },
      { id: 'sourcing', icon: 'Zap', step: '02', title: 'Autonomous sourcing', shortDesc: 'The agent scans talent databases and scores fit.', tip: 'Profiles are scored with a precision percentage, skill highlights, and a clear rationale.' },
      { id: 'compare', icon: 'BarChart3', step: '03', title: 'Compare candidates', shortDesc: 'A side-by-side comRabaton matrix.', tip: 'Evaluate career trajectory, verified skills, and match strength at a glance.' },
      { id: 'pipeline', icon: 'Layers', step: '04', title: 'Track the pipeline', shortDesc: 'Move candidates through stages and log shared notes.', tip: 'Keep hiring managers aligned with live stage updates and evaluations.' },
      { id: 'team', icon: 'Users', step: '05', title: 'Bring in your team', shortDesc: 'Set granular privileges and send instant invites.', tip: 'Admins can grant custom rights: sourcing, shortlisting, notes, or outreach.' }
    ],

    modalTourTitle: 'Quick start guide',
    modalTourSub: 'Five steps to your first shortlist',
    prevBtn: 'Back',
    nextBtn: 'Next',
    finishTourBtn: 'Start sourcing',

    stagesHeader: 'How sourcing works',
    stagesSub: 'From raw job requirements to a qualified shortlist in minutes.',
    stages: [
      { n: '01', t: 'Multi-source discovery', d: 'Continuously scans professional networks, public portfolios, and candidate databases to find ideal talent across all disciplines.' },
      { n: '02', t: 'Multi-criteria scoring', d: 'Ranks every profile against the exact job description, experience level, skill set, and domain expertise.' },
      { n: '03', t: 'Intelligent routing', d: 'Sends curated shortlists straight into the right recruiter queue and pipeline stage.' },
      { n: '04', t: 'Pipeline sync', d: 'Tracks candidate engagement, evaluation notes, and interview progress across the whole team.' },
    ],
    featuresTitle: 'Built for high-velocity recruiting teams',
    features: [
      { icon: 'Zap', title: 'Instant matching', desc: 'Generate a tailored shortlist in seconds from a job description or a plain-language prompt.' },
      { icon: 'Users', title: 'Team governance', desc: 'Dedicated permissions for recruiters and HR admins to collaborate securely.' },
      { icon: 'BarChart3', title: 'Structured comRabaton', desc: 'Side-by-side candidates with highlighted strengths, fit ratings, and notes.' }
    ],
    cardTitleLogin: 'Sign in to your workspace',
    cardSubLogin: 'Use your work email and password to access Targetalent.',
    cardTitleReg: 'Create your account',
    cardSubReg: 'Choose a role to set up the right permissions.',
    tabLogin: 'Sign in',
    tabReg: 'Create account',
    fullName: 'Full name',
    fullNamePh: 'Jane Doe',
    email: 'Work email',
    emailPh: 'name@company.com',
    password: 'Password',
    roleLabel: 'Account role',
    roleBadge: 'Sets permissions',
    recruiterTitle: 'Recruiter',
    recruiterDesc: 'Sourcing, shortlisting & candidate pipelines',
    hrTitle: 'HR Admin',
    hrDesc: 'Team administration, invites & settings',
    submitLogin: 'Sign in',
    submitReg: 'Create account',
    rememberMe: 'Remember me',
    footerCopy: 'Targetalent — Enterprise sourcing platform © 2026',
    footerLinks: ['Security', 'Status', 'Documentation', 'Support'],
    errLogin: 'We couldn\u2019t sign you in. Check your email and password.',
    errReg: 'We couldn\u2019t create your account. Please try again.',
  },
  FR: {
    eyebrow: 'Agent de sourcing, en direct',
    headline1: 'Trouvez la bonne personne',
    headlineAccent: 'pour chaque poste',
    headline2: 'que vous recrutez.',
    sub: 'Targetalent analyse, évalue et qualifie les candidats pour l\u2019ingénierie, le produit, la vente, le marketing, les opérations et la direction — avec une gouvernance adaptée aux équipes de recrutement.',
    ctaPrimary: 'Démarrer gratuitement',
    ctaSecondary: 'Se connecter',
    ctaHeroInvite: 'Accepter l\u2019invitation',
    ctaTour: 'Voir comment ça marche',
    inviteBannerText: 'Vous avez été invité à rejoindre un espace de recrutement.',
    inviteBannerAction: 'Finaliser l\u2019inscription',
    badgeMetric1: 'Sourcing 10x plus rapide',
    badgeMetric2: '94% de précision',
    badgeMetric3: 'Tous secteurs & métiers',

    tutorialBadge: 'Visite du produit',
    tutorialTitle: 'De la fiche de poste à la shortlist, en quelques minutes',
    tutorialSub: 'Le même parcours que votre équipe suivra chaque jour — découvrez-le ci-dessous.',
    tutorialSteps: [
      { id: 'prompt', icon: 'Search', step: '01', title: 'Définir le poste', shortDesc: 'Saisissez une fiche de poste ou une requête en langage naturel.', tip: 'Supporte des critères fins : séniorité, localisation, compétences et expertise métier.' },
      { id: 'sourcing', icon: 'Zap', step: '02', title: 'Sourcing autonome', shortDesc: 'L\u2019agent explore les viviers de talents et calcule le fit.', tip: 'Les profils sont classés avec un pourcentage de pertinence, des compétences clés et une justification.' },
      { id: 'compare', icon: 'BarChart3', step: '03', title: 'Comparer les profils', shortDesc: 'Une matrice de comparaison côte-à-côte.', tip: 'Évaluez instantanément parcours, compétences validées et points forts.' },
      { id: 'pipeline', icon: 'Layers', step: '04', title: 'Suivre le pipeline', shortDesc: 'Faites avancer les candidats et partagez vos notes.', tip: 'Gardez l\u2019équipe alignée grâce aux étapes et évaluations partagées en direct.' },
      { id: 'team', icon: 'Users', step: '05', title: 'Inviter votre équipe', shortDesc: 'Définissez des privilèges précis et envoyez des invitations.', tip: 'Les admins peuvent attribuer des droits sur-mesure : sourcing, shortlists, notes ou contact.' }
    ],

    modalTourTitle: 'Guide de démarrage',
    modalTourSub: 'Cinq étapes vers votre première shortlist',
    prevBtn: 'Précédent',
    nextBtn: 'Suivant',
    finishTourBtn: 'Démarrer le sourcing',

    stagesHeader: 'Comment fonctionne le sourcing',
    stagesSub: 'De la description de poste à la sélection qualifiée en quelques minutes.',
    stages: [
      { n: '01', t: 'Découverte multi-sources', d: 'Analyse en continu les réseaux professionnels, portfolios et viviers pour détecter les profils idéaux dans tous les domaines.' },
      { n: '02', t: 'Scoring multi-critères', d: 'Classe chaque profil selon les exigences précises du poste, l\u2019expérience, les compétences et le savoir-faire.' },
      { n: '03', t: 'Routage intelligent', d: 'Envoie les shortlists ciblées directement dans la file du recruteur concerné.' },
      { n: '04', t: 'Synchronisation du pipeline', d: 'Suivez l\u2019engagement, les notes d\u2019évaluation et les entretiens avec toute l\u2019équipe.' },
    ],
    featuresTitle: 'Conçu pour les équipes de recrutement modernes',
    features: [
      { icon: 'Zap', title: 'Matching instantané', desc: 'Générez une sélection pertinente en quelques secondes à partir d\u2019une fiche de poste ou d\u2019une requête.' },
      { icon: 'Users', title: 'Gouvernance d\u2019équipe', desc: 'Permissions différenciées pour les recruteurs et les admins RH.' },
      { icon: 'BarChart3', title: 'Comparateur structuré', desc: 'Comparaison côte-à-côte avec points forts, notes et score de pertinence.' }
    ],
    cardTitleLogin: 'Connexion à votre espace',
    cardSubLogin: 'Utilisez votre email professionnel et votre mot de passe.',
    cardTitleReg: 'Créer votre compte',
    cardSubReg: 'Choisissez un rôle pour configurer les bonnes permissions.',
    tabLogin: 'Connexion',
    tabReg: 'Créer un compte',
    fullName: 'Nom complet',
    fullNamePh: 'Alexandre Martin',
    email: 'Email professionnel',
    emailPh: 'nom@entreprise.com',
    password: 'Mot de passe',
    roleLabel: 'Rôle du compte',
    roleBadge: 'Définit les permissions',
    recruiterTitle: 'Recruteur',
    recruiterDesc: 'Sourcing, shortlists et pipelines candidats',
    hrTitle: 'Admin RH',
    hrDesc: 'Gestion d\u2019équipe, invitations et configuration',
    submitLogin: 'Se connecter',
    submitReg: 'Créer le compte',
    rememberMe: 'Se souvenir de moi',
    footerCopy: 'Targetalent — Plateforme de sourcing d\u2019entreprise © 2026',
    footerLinks: ['Sécurité', 'Statut', 'Documentation', 'Support'],
    errLogin: 'Connexion impossible. Vérifiez votre email et mot de passe.',
    errReg: 'Impossible de créer le compte. Veuillez réessayer.',
  },
};

const LOG_LINES = {
  EN: [
    '$ agent.scan(scope="cross_functional", roles=["Head of Growth", "Lead Architect", "Product Manager", "Operations Director"])',
    '→ searching multi-channel index: 42,800+ candidate profiles',
    '→ analyzing skill match, domain depth & career trajectory',
    '✓ shortlist generated — 38 high-fit candidates (avg match: 94%)',
    '→ auto-routing to active hiring pipeline & team review queue',
  ],
  FR: [
    '$ agent.scan(périmètre="multi_métiers", postes=["Responsable Marketing", "Architecte Lead", "Chef de Produit", "Directeur Opérations"])',
    '→ analyse du vivier multi-secteurs : 42 800+ profils indexés',
    '→ évaluation des compétences, séniorité et adéquation poste',
    '✓ shortlist générée — 38 profils hautement qualifiés (fit moyen : 94%)',
    '→ transmission automatique vers le pipeline et la file d\u2019évaluation',
  ],
};

/* ------------------------------------------------------------------
   Terminal Component
   ------------------------------------------------------------------ */

function Terminal({ lang }) {
  const lines = LOG_LINES[lang] || LOG_LINES.EN;
  const [visible, setVisible] = useState(1);

  useEffect(() => {
    setVisible(1);
    const id = setInterval(() => {
      setVisible((v) => (v >= lines.length ? 1 : v + 1));
    }, 2200);
    return () => clearInterval(id);
  }, [lang, lines.length]);

  return (
    <div className="dg-terminal">
      <div className="dg-terminal-bar">
        <div className="dg-terminal-dots">
          <span className="dg-terminal-dot dot-red" />
          <span className="dg-terminal-dot dot-yellow" />
          <span className="dg-terminal-dot dot-green" />
        </div>
        <span className="dg-terminal-label">agent_telemetry.log</span>
        <span className="dg-terminal-status">● live</span>
      </div>
      <div className="dg-terminal-body">
        {lines.slice(0, visible).map((line, i) => (
          <div
            key={i}
            className={
              'dg-terminal-line' +
              (line.startsWith('✓') ? ' dg-terminal-line-ok' : (line.startsWith('$') ? ' dg-terminal-line-cmd' : ''))
            }
          >
            {line}
          </div>
        ))}
        <span className="dg-cursor" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   Interactive Walkthrough Component
   ------------------------------------------------------------------ */

function InteractiveAppTutorial({ lang, onOpenAuth }) {
  const t = COPY[lang];
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [interactiveKanbanStage, setInteractiveKanbanStage] = useState('Shortlist');
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedPrivileges, setSelectedPrivileges] = useState({
    sourcing: true,
    shortlist: true,
    notes: true,
    outreach: false,
  });

  const togglePrivilege = (key) => {
    setSelectedPrivileges((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCopyLink = () => {
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const step = t.tutorialSteps[activeStepIndex];

  return (
    <div className="dg-tuto-section">
      <div className="dg-tuto-header">
        <span className="dg-kicker">{t.tutorialBadge}</span>
        <h2 className="dg-tuto-title dg-display">{t.tutorialTitle}</h2>
        <p className="dg-tuto-sub">{t.tutorialSub}</p>
      </div>

      <div className="dg-rail">
        <div className="dg-rail-track">
          <div
            className="dg-rail-fill"
            style={{ width: `${(activeStepIndex / (t.tutorialSteps.length - 1)) * 100}%` }}
          />
        </div>
        <div className="dg-rail-nodes">
          {t.tutorialSteps.map((s, idx) => {
            const RailIcon = TUTO_ICONS[s.icon] || Search;
            const isActive = idx === activeStepIndex;
            const isDone = idx < activeStepIndex;
            return (
              <button
                key={s.id}
                type="button"
                className={`dg-rail-node ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}
                onClick={() => setActiveStepIndex(idx)}
              >
                <span className="dg-rail-node-circle">
                  {isDone ? <Check size={15} /> : <RailIcon size={15} />}
                </span>
                <span className="dg-rail-node-label">{s.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="dg-showcase-box">
        <div className="dg-showcase-left">
          <div className="dg-step-index">
            <span className="dg-step-index-num dg-display">{step.step}</span>
            <span className="dg-step-index-sep">/</span>
            <span className="dg-step-index-total dg-mono">05</span>
          </div>

          <h3 className="dg-showcase-title dg-display">{step.title}</h3>
          <p className="dg-showcase-desc">{step.shortDesc}</p>

          <div className="dg-tip-note">
            <Lightbulb size={14} color="#B4650F" style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{step.tip}</span>
          </div>

          <div className="dg-showcase-actions">
            <button
              type="button"
              className="dg-showcase-nav-btn secondary"
              disabled={activeStepIndex === 0}
              onClick={() => setActiveStepIndex((i) => Math.max(0, i - 1))}
            >
              <ChevronLeft size={15} />
              <span>{t.prevBtn}</span>
            </button>

            {activeStepIndex < 4 ? (
              <button
                type="button"
                className="dg-showcase-nav-btn primary"
                onClick={() => setActiveStepIndex((i) => Math.min(4, i + 1))}
              >
                <span>{t.nextBtn}</span>
                <ChevronRight size={15} />
              </button>
            ) : (
              <button
                type="button"
                className="dg-showcase-nav-btn cta"
                onClick={() => onOpenAuth(false)}
              >
                <Sparkles size={15} />
                <span>{t.finishTourBtn}</span>
              </button>
            )}
          </div>
        </div>

        <div className="dg-showcase-connector" aria-hidden="true">
          <span /><span /><span />
        </div>

        <div className="dg-showcase-right" key={activeStepIndex}>
          <span className="dg-showcase-ghost-num dg-display" aria-hidden="true">{step.step}</span>
          <div className="dg-panel-frame">
            {activeStepIndex === 0 && (
              <div className="dg-mock-card">
                <div className="dg-mock-bar">
                  <Search size={14} color="#0A7E96" />
                  <span className="dg-mono" style={{ fontSize: 11, color: '#6B7280' }}>Sourcing prompt studio</span>
                  <span className="dg-mock-badge dg-mono">Natural language</span>
                </div>
                <div className="dg-mock-input-box">
                  <div className="dg-mock-label">Natural language sourcing prompt</div>
                  <div className="dg-mock-textarea">
                    "Find 5 senior product designers with B2B SaaS experience, design systems mastery, and track record in scaling cross-functional teams."
                  </div>
                  <div className="dg-mock-chips">
                    <span className="dg-chip active">Rabat / Remote</span>
                    <span className="dg-chip active">Figma & Design Systems</span>
                    <span className="dg-chip active">5+ yrs exp</span>
                    <span className="dg-chip">Full-time</span>
                  </div>
                </div>
                <div className="dg-mock-footer">
                  <button type="button" className="dg-mock-btn" onClick={() => setActiveStepIndex(1)}>
                    <Sparkles size={13} />
                    <span>Run autonomous scan</span>
                  </button>
                </div>
              </div>
            )}

            {activeStepIndex === 1 && (
              <div className="dg-mock-card">
                <div className="dg-mock-bar">
                  <Zap size={14} color="#0E7C8C" />
                  <span className="dg-mono" style={{ fontSize: 11, color: '#6B7280' }}>AI fit scoring</span>
                  <span className="dg-mock-badge ok dg-mono">94% top match</span>
                </div>
                <div className="dg-cand-preview">
                  <div className="dg-cand-head">
                    <div className="dg-cand-avatar">SC</div>
                    <div>
                      <div className="dg-cand-name">Sophie Chen</div>
                      <div className="dg-cand-role">Lead Product Designer · Ex-Stripe</div>
                    </div>
                    <div className="dg-cand-score">96%</div>
                  </div>
                  <div className="dg-cand-tags">
                    <span className="dg-tag-ok">7 yrs SaaS experience</span>
                    <span className="dg-tag-ok">Led 8-person team</span>
                    <span className="dg-tag-ok">Enterprise DS expert</span>
                  </div>
                  <div className="dg-cand-rationale">
                    <div style={{ fontWeight: 700, color: '#10151F', marginBottom: 2 }}>Match rationale</div>
                    Exceeds requirements in design systems, architecture, and team mentorship with top-tier SaaS pedigree.
                  </div>
                </div>
                <div className="dg-mock-footer">
                  <button type="button" className="dg-mock-btn" onClick={() => setActiveStepIndex(2)}>
                    <BarChart3 size={13} />
                    <span>Compare in matrix</span>
                  </button>
                </div>
              </div>
            )}

            {activeStepIndex === 2 && (
              <div className="dg-mock-card">
                <div className="dg-mock-bar">
                  <BarChart3 size={14} color="#8A4B0C" />
                  <span className="dg-mono" style={{ fontSize: 11, color: '#6B7280' }}>Candidate comparator</span>
                  <span className="dg-mock-badge dg-mono">Side by side</span>
                </div>
                <div className="dg-matrix-grid">
                  <div className="dg-matrix-col">
                    <div className="dg-matrix-name">Sophie Chen</div>
                    <div className="dg-matrix-score high">96% fit</div>
                    <div className="dg-matrix-stat"><strong>7 yrs</strong> SaaS</div>
                    <div className="dg-matrix-stat"><strong>Lead</strong> role</div>
                    <div className="dg-matrix-badge best">Top pick</div>
                  </div>
                  <div className="dg-matrix-col">
                    <div className="dg-matrix-name">Marc Leroy</div>
                    <div className="dg-matrix-score medium">91% fit</div>
                    <div className="dg-matrix-stat"><strong>6 yrs</strong> Product</div>
                    <div className="dg-matrix-stat"><strong>Senior</strong> role</div>
                    <div className="dg-matrix-badge">Strong match</div>
                  </div>
                </div>
                <div className="dg-mock-footer">
                  <button type="button" className="dg-mock-btn" onClick={() => setActiveStepIndex(3)}>
                    <Layers size={13} />
                    <span>Push to pipeline</span>
                  </button>
                </div>
              </div>
            )}

            {activeStepIndex === 3 && (
              <div className="dg-mock-card">
                <div className="dg-mock-bar">
                  <Layers size={14} color="#0A5C68" />
                  <span className="dg-mono" style={{ fontSize: 11, color: '#6B7280' }}>Pipeline & collaboration</span>
                  <span className="dg-mock-badge ok dg-mono">Active board</span>
                </div>
                <div className="dg-kanban-mini">
                  {['Shortlist', 'Screening', 'Interview', 'Offer'].map((st) => {
                    const isSelected = interactiveKanbanStage === st;
                    return (
                      <div
                        key={st}
                        role="button"
                        tabIndex={0}
                        aria-pressed={isSelected}
                        className={`dg-kanban-col ${isSelected ? 'selected' : ''}`}
                        onClick={() => setInteractiveKanbanStage(st)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setInteractiveKanbanStage(st);
                          }
                        }}
                      >
                        <div className="dg-kanban-col-head">
                          <span>{st}</span>
                          <span className="dg-kanban-count">{isSelected ? '1' : '0'}</span>
                        </div>
                        {isSelected && (
                          <div className="dg-kanban-card-mini">
                            <div style={{ fontWeight: 700, fontSize: 11.5 }}>Sophie Chen</div>
                            <div style={{ fontSize: 10, color: '#0A7E96' }}>Match: 96%</div>
                            <div style={{ fontSize: 9.5, color: '#6B7280', marginTop: 3 }}>Note: scheduled call</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="dg-kanban-interactive-hint">
                  Click a stage column above to move the candidate card.
                </div>
                <div className="dg-mock-footer">
                  <button type="button" className="dg-mock-btn" onClick={() => setActiveStepIndex(4)}>
                    <Users size={13} />
                    <span>Explore team & invites</span>
                  </button>
                </div>
              </div>
            )}

            {activeStepIndex === 4 && (
              <div className="dg-mock-card">
                <div className="dg-mock-bar">
                  <ShieldCheck size={14} color="#0A7E96" />
                  <span className="dg-mono" style={{ fontSize: 11, color: '#6B7280' }}>Team governance</span>
                  <span className="dg-mock-badge ok dg-mono">Admin console</span>
                </div>
                <div className="dg-team-mock-body">
                  <div className="dg-team-mock-field">
                    <span className="dg-team-mock-label">{lang === 'FR' ? 'Inviter un recruteur' : 'Invite a recruiter'}</span>
                    <div className="dg-team-mock-input-row">
                      <Mail size={13} color="#94A3B8" />
                      <span style={{ fontSize: 11.5, color: '#1E293B', fontWeight: 600 }}>alex.recruiter@company.com</span>
                      <span className="dg-team-role-pill dg-mono">Recruiter</span>
                    </div>
                  </div>

                  <div className="dg-team-privileges-box">
                    <span className="dg-team-mock-label" style={{ marginBottom: 6, display: 'block' }}>
                      {lang === 'FR' ? 'Privilèges accordés' : 'Assigned privileges'}
                    </span>
                    <div className="dg-privilege-chips">
                      <button type="button" className={`dg-priv-chip ${selectedPrivileges.sourcing ? 'active' : ''}`} onClick={() => togglePrivilege('sourcing')}>
                        {selectedPrivileges.sourcing ? <Check size={11} /> : null} {lang === 'FR' ? 'Sourcing IA' : 'AI sourcing'}
                      </button>
                      <button type="button" className={`dg-priv-chip ${selectedPrivileges.shortlist ? 'active' : ''}`} onClick={() => togglePrivilege('shortlist')}>
                        {selectedPrivileges.shortlist ? <Check size={11} /> : null} {lang === 'FR' ? 'Shortlist' : 'Shortlisting'}
                      </button>
                      <button type="button" className={`dg-priv-chip ${selectedPrivileges.notes ? 'active' : ''}`} onClick={() => togglePrivilege('notes')}>
                        {selectedPrivileges.notes ? <Check size={11} /> : null} {lang === 'FR' ? 'Notes candidat' : 'Recruiter notes'}
                      </button>
                      <button type="button" className={`dg-priv-chip ${selectedPrivileges.outreach ? 'active' : ''}`} onClick={() => togglePrivilege('outreach')}>
                        {selectedPrivileges.outreach ? <Check size={11} /> : null} {lang === 'FR' ? 'Contact & export' : 'Outreach & export'}
                      </button>
                    </div>
                  </div>

                  <div className="dg-invite-link-preview">
                    <span className="dg-invite-link-text">https://targetalent.io/auth?invite=inv-team-8f92a1</span>
                    <button type="button" className="dg-copy-btn" onClick={handleCopyLink}>
                      {copiedLink ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                      <span>{copiedLink ? (lang === 'FR' ? 'Copié' : 'Copied') : (lang === 'FR' ? 'Copier' : 'Copy link')}</span>
                    </button>
                  </div>
                </div>

                <div className="dg-mock-footer">
                  <button type="button" className="dg-mock-btn" onClick={() => onOpenAuth(false)}>
                    <Sparkles size={13} />
                    <span>{lang === 'FR' ? 'Créer un espace équipe' : 'Create team workspace'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   Guided Interactive Tour Modal
   ------------------------------------------------------------------ */

function GuidedTourModal({ isOpen, onClose, lang, onOpenAuth }) {
  const t = COPY[lang];
  const [slide, setSlide] = useState(0);

  if (!isOpen) return null;

  const currentStep = t.tutorialSteps[slide];

  return (
    <div
      className="dg-modal-overlay"
      role="presentation"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="dg-tour-modal-card" role="dialog" aria-modal="true">
        <button type="button" className="dg-modal-close" onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>

        <div className="dg-tour-header">
          <span className="dg-kicker">{t.modalTourTitle}</span>
          <h3 className="dg-tour-title dg-display" style={{ marginTop: 6 }}>
            {currentStep.step}. {currentStep.title}
          </h3>
          <p className="dg-tour-sub">{currentStep.shortDesc}</p>
        </div>

        <div className="dg-tour-body">
          <div className="dg-tour-tip-box">
            <Lightbulb size={16} color="#B4650F" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <strong>{lang === 'FR' ? 'Astuce' : 'Tip'}:</strong> {currentStep.tip}
            </div>
          </div>

          <div className="dg-tour-stepper">
            {t.tutorialSteps.map((s, idx) => (
              <button
                type="button"
                key={s.id}
                aria-label={`Step ${s.step}: ${s.title}`}
                className={`dg-tour-step-dot ${idx === slide ? 'active' : ''} ${idx < slide ? 'completed' : ''}`}
                onClick={() => setSlide(idx)}
              >
                <span>{s.step}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="dg-tour-footer">
          <button
            type="button"
            className="dg-showcase-nav-btn secondary"
            disabled={slide === 0}
            onClick={() => setSlide((s) => Math.max(0, s - 1))}
          >
            <ChevronLeft size={15} />
            <span>{t.prevBtn}</span>
          </button>

          {slide < 4 ? (
            <button
              type="button"
              className="dg-showcase-nav-btn primary"
              onClick={() => setSlide((s) => Math.min(4, s + 1))}
            >
              <span>{t.nextBtn}</span>
              <ChevronRight size={15} />
            </button>
          ) : (
            <button
              type="button"
              className="dg-showcase-nav-btn cta"
              onClick={() => { onClose(); onOpenAuth(false); }}
            >
              <Sparkles size={15} />
              <span>{t.finishTourBtn}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   Main AuthPage Component
   ------------------------------------------------------------------ */

export default function AuthPage({ onAccepted, onClearInvite }) {
  const [lang, setLang] = useState(() => {
    try {
      const saved =
        localStorage.getItem('targetalent_language') ||
        localStorage.getItem('digitalia_language');
      if (saved && (saved === 'FR' || saved === 'EN')) return saved;
    } catch (e) { }
    return 'EN';
  });

  useEffect(() => {
    try {
      localStorage.setItem('targetalent_language', lang);
    } catch (e) { }
  }, [lang]);

  const [inviteToken, setInviteToken] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('invite') || '';
    }
    return '';
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(() => Boolean(inviteToken));
  const [isTourModalOpen, setIsTourModalOpen] = useState(false);
  const [isLogin, setIsLogin] = useState(!inviteToken);
  const [rememberMe, setRememberMe] = useState(() => {
    try {
      return localStorage.getItem('targetalent_remember_me') === 'true';
    } catch (e) {
      return false;
    }
  });
  const [email, setEmail] = useState(() => {
    try {
      return localStorage.getItem('targetalent_remembered_email') || '';
    } catch (e) {
      return '';
    }
  });
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('RECRUITER');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const fontsLoaded = useRef(false);

  const t = COPY[lang];

  useEffect(() => {
    if (fontsLoaded.current) return;
    fontsLoaded.current = true;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap';
    document.head.appendChild(link);
  }, []);

  const { login, register, acceptInvitation } = useAuth();

  const openAuth = (loginMode = true) => {
    setIsLogin(loginMode);
    setError('');
    setIsAuthModalOpen(true);
  };

  const closeAuth = () => {
    setIsAuthModalOpen(false);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (inviteToken) {
        const success = await acceptInvitation(inviteToken, name || email.split('@')[0], password);
        if (success) {
          if (typeof window !== 'undefined') {
            window.history.replaceState({}, document.title, window.location.pathname);
            // Clear any team-specific tab storage to prevent inheriting admin's tab
            const teamKey = 'targetalent_workspace'; // Will be updated after auth context updates
            localStorage.removeItem(`digitalia_team_${teamKey}_active_tab`);
          }
          if (onAccepted) onAccepted();
          setIsAuthModalOpen(false);
        } else {
          setError(lang === 'FR' ? 'Invitation invalide ou expirée.' : 'Invalid or expired invitation.');
        }
      } else if (isLogin) {
        const success = await login(email, password);
        if (!success) {
          setError(t.errLogin);
        } else {
          try {
            if (rememberMe) {
              localStorage.setItem('targetalent_remember_me', 'true');
              localStorage.setItem('targetalent_remembered_email', email.trim());
            } else {
              localStorage.removeItem('targetalent_remember_me');
              localStorage.removeItem('targetalent_remembered_email');
            }
          } catch (e) { }
          setIsAuthModalOpen(false);
        }
      } else {
        const success = await register(name, email, password, role);
        if (!success) setError(t.errReg);
        else setIsAuthModalOpen(false);
      }
    } catch (err) {
      const fieldErrors = err?.response?.data?.data;
      let errorMsg = '';
      if (fieldErrors && typeof fieldErrors === 'object') {
        errorMsg = Object.values(fieldErrors).filter(Boolean).join('. ');
      }
      if (!errorMsg) {
        errorMsg = err?.response?.data?.message || err.message || (isLogin ? t.errLogin : t.errReg);
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dg-root">
      <style>{`
        .dg-root {
          --dg-paper: #F6F7F9;
          --dg-surface: #FFFFFF;
          --dg-sunken: #EFF1F4;
          --dg-border: #E3E6EB;
          --dg-border-strong: #CBD2DC;
          --dg-ink-900: #10151F;
          --dg-ink-700: #38414F;
          --dg-ink-500: #6B7280;
          --dg-ink-400: #96A0AC;
          --dg-teal-700: #0A5C68;
          --dg-teal-600: #0E7C8C;
          --dg-teal-500: #128FA0;
          --dg-teal-100: #E1F2F3;
          --dg-bronze-700: #8A4B0C;
          --dg-bronze-600: #B4650F;
          --dg-bronze-100: #FBEEDD;
          --dg-danger: #B3261E;
          --dg-danger-bg: #FBEAE9;
          --font-display: 'Space Grotesk', 'Inter', sans-serif;
          --font-body: 'Inter', system-ui, sans-serif;
          --font-mono: 'JetBrains Mono', ui-monospace, monospace;
          --ease: cubic-bezier(0.16, 1, 0.3, 1);

          font-family: var(--font-body);
          background: var(--dg-paper);
          color: var(--dg-ink-900);
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background-image:
            radial-gradient(circle at 8% 0%, rgba(14,124,140,0.07), transparent 42%),
            radial-gradient(circle at 100% 30%, rgba(180,101,15,0.05), transparent 40%);
        }
        .dg-display { font-family: var(--font-display); letter-spacing: -0.015em; }
        .dg-mono { font-family: var(--font-mono); }

        .dg-kicker {
          display: inline-block; font-size: 13px; font-weight: 600;
          color: var(--dg-teal-700); margin-bottom: 6px;
        }

        /* Header */
        .dg-header {
          max-width: 1240px; width: 100%; margin: 0 auto; padding: 16px 24px 0;
          display: flex; align-items: center; justify-content: space-between;
          box-sizing: border-box;
        }
        .dg-brand { display: flex; align-items: center; }
        .dg-brand-logo { height: 92px; width: auto; object-fit: contain; }

        .dg-nav-actions { display: flex; align-items: center; gap: 10px; }

        .dg-lang-btn {
          display: flex; align-items: center; gap: 6px;
          font-family: var(--font-mono); font-size: 11.5px; font-weight: 700;
          color: var(--dg-ink-700); background: var(--dg-surface);
          border: 1.5px solid var(--dg-border); border-radius: 999px;
          padding: 8px 14px; cursor: pointer; transition: all .18s var(--ease);
        }
        .dg-lang-btn:hover { border-color: var(--dg-teal-500); background: var(--dg-teal-100); color: var(--dg-teal-700); }

        .dg-nav-signin-btn {
          font-size: 13px; font-weight: 700; color: #FFFFFF;
          background: var(--dg-ink-900); border: 1.5px solid var(--dg-ink-900);
          border-radius: 999px; padding: 8px 18px; cursor: pointer;
          display: flex; align-items: center; gap: 7px;
          transition: all .18s var(--ease); box-shadow: 0 4px 12px rgba(16,21,31,0.12);
        }
        .dg-nav-signin-btn:hover { background: var(--dg-teal-700); border-color: var(--dg-teal-700); transform: translateY(-1px); }

        /* Invite banner */
        .dg-invite-banner { max-width: 1240px; width: 100%; margin: 20px auto 0; padding: 0 24px; box-sizing: border-box; }
        .dg-invite-banner-inner {
          background: linear-gradient(135deg, #E0F2F5 0%, #F5EBE0 100%);
          border: 1px solid rgba(14,124,140,0.25);
          border-radius: 14px; padding: 12px 20px;
          display: flex; align-items: center; justify-content: space-between;
          gap: 16px; flex-wrap: wrap;
        }
        .dg-invite-banner-left { display: flex; align-items: center; gap: 10px; font-size: 13.5px; font-weight: 600; color: var(--dg-teal-700); }
        .dg-invite-banner-btn {
          font-size: 12.5px; font-weight: 700; color: #FFFFFF; background: var(--dg-teal-700);
          border: none; border-radius: 999px; padding: 7px 16px; cursor: pointer;
          display: flex; align-items: center; gap: 6px; transition: background .15s ease;
        }
        .dg-invite-banner-btn:hover { background: var(--dg-teal-600); }

        /* Main / Hero */
        .dg-main { max-width: 1240px; width: 100%; margin: 0 auto; padding: 52px 24px 60px; box-sizing: border-box; flex: 1; }

        .dg-hero-section {
          max-width: 760px; margin: 0 auto; text-align: center;
          display: flex; flex-direction: column; align-items: center;
        }

        /* Orchestrated hero entrance — one sequence, staggered */
        @keyframes dgRise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .dg-hero-anim { opacity: 0; animation: dgRise .7s var(--ease) forwards; }
        .dg-hero-anim.d1 { animation-delay: .02s; }
        .dg-hero-anim.d2 { animation-delay: .10s; }
        .dg-hero-anim.d3 { animation-delay: .20s; }
        .dg-hero-anim.d4 { animation-delay: .30s; }
        .dg-hero-anim.d5 { animation-delay: .40s; }
        .dg-hero-anim.d6 { animation-delay: .50s; }

        .dg-eyebrow-row { display: flex; align-items: center; gap: 8px; font-size: 13.5px; font-weight: 600; color: var(--dg-ink-500); }
        .dg-eyebrow-dot {
          width: 7px; height: 7px; border-radius: 50%; background: var(--dg-teal-600);
          box-shadow: 0 0 0 3px rgba(14,124,140,0.18);
          animation: dgpulse 2.2s infinite;
        }
        @keyframes dgpulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.25); opacity: 0.65; } }

        .dg-headline { font-size: 52px; line-height: 1.1; font-weight: 600; color: var(--dg-ink-900); margin: 18px 0 18px; }
        .dg-headline-accent-wrap { position: relative; display: inline-block; }
        .dg-headline-accent-wrap svg { position: absolute; left: 0; bottom: -6px; width: 100%; height: 14px; overflow: visible; }
        .dg-underline-path {
          stroke: var(--dg-teal-500); stroke-width: 3; fill: none; stroke-linecap: round;
          stroke-dasharray: 340; stroke-dashoffset: 340;
          animation: dgDraw 0.9s var(--ease) forwards; animation-delay: .55s;
        }
        @keyframes dgDraw { to { stroke-dashoffset: 0; } }

        .dg-sub { font-size: 16.5px; line-height: 1.65; color: var(--dg-ink-500); max-width: 600px; margin: 0 auto 30px; }

        .dg-hero-cta-group { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 30px; flex-wrap: wrap; }
        .dg-hero-btn-primary {
          font-size: 14.5px; font-weight: 700; color: #FFFFFF;
          background: var(--dg-ink-900); border: none; border-radius: 11px;
          padding: 13px 26px; cursor: pointer; display: flex; align-items: center; gap: 8px;
          transition: all .2s var(--ease); box-shadow: 0 8px 22px -6px rgba(16,21,31,0.28);
        }
        .dg-hero-btn-primary:hover { background: var(--dg-teal-700); transform: translateY(-2px); box-shadow: 0 12px 26px -6px rgba(10,92,104,0.35); }
        .dg-hero-btn-primary:active { transform: translateY(0); }

        .dg-hero-btn-secondary {
          font-size: 14.5px; font-weight: 600; color: var(--dg-ink-700);
          background: transparent; border: 1.5px solid var(--dg-border-strong);
          border-radius: 11px; padding: 13px 24px; cursor: pointer;
          display: flex; align-items: center; gap: 8px; transition: all .18s var(--ease);
        }
        .dg-hero-btn-secondary:hover { border-color: var(--dg-ink-700); background: var(--dg-surface); transform: translateY(-2px); }

        .dg-hero-btn-tour {
          font-size: 14.5px; font-weight: 600; color: var(--dg-ink-700);
          background: none; border: none; padding: 13px 6px; cursor: pointer;
          display: flex; align-items: center; gap: 7px; transition: color .15s ease;
        }
        .dg-hero-btn-tour:hover { color: var(--dg-teal-700); }
        .dg-hero-btn-tour .dg-play-dot {
          width: 26px; height: 26px; border-radius: 50%; background: var(--dg-teal-100);
          color: var(--dg-teal-700); display: flex; align-items: center; justify-content: center;
          transition: background .15s ease;
        }
        .dg-hero-btn-tour:hover .dg-play-dot { background: var(--dg-teal-600); color: #fff; }

        .dg-metrics-row { display: flex; align-items: center; justify-content: center; gap: 26px; flex-wrap: wrap; }
        .dg-metric-item { display: flex; align-items: center; gap: 7px; font-size: 12.5px; font-weight: 600; color: var(--dg-ink-500); }
        .dg-metric-icon { color: var(--dg-teal-600); }

        /* Terminal */
        .dg-terminal-wrapper { max-width: 800px; width: 100%; margin: 48px auto 0; }
        .dg-terminal {
          width: 100%; background: #0E131D; border-radius: 16px; overflow: hidden;
          box-shadow: 0 30px 64px -20px rgba(16,21,31,0.45), 0 0 0 1px rgba(255,255,255,0.06);
          text-align: left;
        }
        .dg-terminal-bar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 18px; border-bottom: 1px solid rgba(255,255,255,0.08); background: #141B27;
        }
        .dg-terminal-dots { display: flex; align-items: center; gap: 6px; }
        .dg-terminal-dot { width: 10px; height: 10px; border-radius: 50%; }
        .dot-red { background: #FF5F56; } .dot-yellow { background: #FFBD2E; } .dot-green { background: #27C93F; }
        .dg-terminal-label { font-family: var(--font-mono); font-size: 11.5px; color: rgba(255,255,255,0.6); }
        .dg-terminal-status { font-family: var(--font-mono); font-size: 10px; font-weight: 700; color: #27C93F; }
        .dg-terminal-body { padding: 20px 22px; min-height: 140px; font-family: var(--font-mono); }
        .dg-terminal-line { font-size: 13px; line-height: 1.85; color: #94A3B8; white-space: pre-wrap; animation: dgRise .4s var(--ease); }
        .dg-terminal-line-cmd { color: #38BDF8; font-weight: 600; }
        .dg-terminal-line-ok { color: #34D399; font-weight: 600; }
        .dg-cursor { display: inline-block; width: 7px; height: 14px; margin-top: 3px; background: var(--dg-teal-500); animation: dgblink 1s step-end infinite; }
        @keyframes dgblink { 50% { opacity: 0; } }

        /* Tutorial section */
        .dg-tuto-section { margin-top: 88px; padding: 0; }
        .dg-tuto-header { max-width: 620px; margin: 0 auto 36px; text-align: center; }
        .dg-tuto-title { font-size: 30px; font-weight: 600; color: var(--dg-ink-900); margin: 0 0 10px; }
        .dg-tuto-sub { font-size: 14.5px; color: var(--dg-ink-500); line-height: 1.55; }

        /* Connected rail — replaces the flat tab row */
        .dg-rail { position: relative; margin: 0 auto 48px; max-width: 900px; padding: 0 10px; }
        .dg-rail-track { position: absolute; top: 19px; left: 8%; right: 8%; height: 2px; background: var(--dg-border); border-radius: 2px; }
        .dg-rail-fill { height: 100%; background: linear-gradient(90deg, var(--dg-teal-600), var(--dg-teal-500)); border-radius: 2px; transition: width .55s var(--ease); }
        .dg-rail-nodes { position: relative; display: flex; justify-content: space-between; }
        .dg-rail-node { display: flex; flex-direction: column; align-items: center; gap: 10px; background: none; border: none; cursor: pointer; flex: 1; padding: 0 4px; }
        .dg-rail-node-circle {
          width: 38px; height: 38px; border-radius: 50%; background: var(--dg-surface);
          border: 2px solid var(--dg-border-strong); display: flex; align-items: center; justify-content: center;
          color: var(--dg-ink-400); transition: all .25s var(--ease);
        }
        .dg-rail-node:hover .dg-rail-node-circle { border-color: var(--dg-teal-500); color: var(--dg-teal-600); }
        .dg-rail-node.done .dg-rail-node-circle { background: var(--dg-teal-600); border-color: var(--dg-teal-600); color: #fff; }
        .dg-rail-node.active .dg-rail-node-circle {
          background: var(--dg-teal-700); border-color: var(--dg-teal-700); color: #fff;
          transform: scale(1.18); box-shadow: 0 0 0 6px var(--dg-teal-100);
        }
        .dg-rail-node-label { font-size: 11.5px; font-weight: 600; color: var(--dg-ink-400); text-align: center; max-width: 110px; line-height: 1.3; transition: color .2s ease; }
        .dg-rail-node.active .dg-rail-node-label { color: var(--dg-ink-900); font-weight: 700; }
        .dg-rail-node.done .dg-rail-node-label { color: var(--dg-ink-700); }

        .dg-showcase-box {
          position: relative; display: grid; grid-template-columns: 1fr 34px 1.1fr; gap: 24px; align-items: center;
          background-color: var(--dg-surface);
          background-image: radial-gradient(var(--dg-border) 1px, transparent 1px);
          background-size: 18px 18px;
          border: 1px solid var(--dg-border);
          border-radius: 22px; padding: 40px;
        }
        .dg-showcase-left { display: flex; flex-direction: column; position: relative; z-index: 1; }
        .dg-step-index { display: flex; align-items: baseline; gap: 5px; margin-bottom: 8px; }
        .dg-step-index-num { font-size: 36px; font-weight: 700; color: var(--dg-teal-700); line-height: 1; }
        .dg-step-index-sep { font-size: 17px; color: var(--dg-border-strong); }
        .dg-step-index-total { font-size: 13px; color: var(--dg-ink-400); font-weight: 700; letter-spacing: 0.02em; }
        .dg-showcase-title { font-size: 24px; font-weight: 600; color: var(--dg-ink-900); margin-bottom: 8px; }
        .dg-showcase-desc { font-size: 14.5px; color: var(--dg-ink-500); line-height: 1.6; margin-bottom: 18px; }

        .dg-tip-note {
          display: inline-flex; align-items: flex-start; gap: 8px; max-width: 380px;
          background: var(--dg-bronze-100); border: 1px solid rgba(180,101,15,0.22);
          border-radius: 4px 14px 14px 14px; padding: 11px 14px; margin-bottom: 26px;
          font-size: 12.5px; color: var(--dg-bronze-700); line-height: 1.5;
          box-shadow: 3px 4px 0 rgba(138,75,12,0.08);
          transform: rotate(-1.2deg); transition: transform .2s var(--ease);
        }
        .dg-tip-note:hover { transform: rotate(0deg) translateY(-1px); }

        .dg-showcase-connector { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; z-index: 1; }
        .dg-showcase-connector span { width: 5px; height: 5px; border-radius: 50%; background: var(--dg-teal-500); animation: dgConnectorPulse 1.4s ease-in-out infinite; }
        .dg-showcase-connector span:nth-child(2) { animation-delay: .2s; }
        .dg-showcase-connector span:nth-child(3) { animation-delay: .4s; }
        @keyframes dgConnectorPulse { 0%, 100% { opacity: .25; transform: scale(.8); } 50% { opacity: 1; transform: scale(1.2); } }

        .dg-showcase-ghost-num {
          position: absolute; top: -18px; right: -6px; font-size: 150px; font-weight: 700;
          color: var(--dg-teal-100); line-height: 1; z-index: 0; user-select: none; pointer-events: none;
        }
        .dg-panel-frame {
          position: relative; z-index: 1; padding: 2px; border-radius: 17px;
          background: linear-gradient(135deg, var(--dg-teal-500), var(--dg-bronze-600));
          box-shadow: 0 16px 34px -14px rgba(16,21,31,0.22);
        }
        .dg-panel-frame .dg-mock-card { border: none; box-shadow: none; }

        .dg-showcase-actions { display: flex; align-items: center; gap: 10px; }
        .dg-showcase-nav-btn {
          font-size: 13px; font-weight: 700; border-radius: 10px; padding: 10px 18px;
          cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: all .18s var(--ease);
        }
        .dg-showcase-nav-btn.secondary { background: #FFFFFF; border: 1px solid var(--dg-border); color: var(--dg-ink-700); }
        .dg-showcase-nav-btn.secondary:disabled { opacity: 0.4; cursor: default; }
        .dg-showcase-nav-btn.primary { background: var(--dg-ink-900); border: 1px solid var(--dg-ink-900); color: #fff; }
        .dg-showcase-nav-btn.cta { background: var(--dg-teal-700); border: 1px solid var(--dg-teal-700); color: #fff; }
        .dg-showcase-nav-btn:hover:not(:disabled) { transform: translateY(-1px); }

        /* Showcase panel cross-fade on step change */
        @keyframes dgStepFade { from { opacity: 0; transform: translateY(6px) scale(.99); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .dg-showcase-right { animation: dgStepFade .4s var(--ease); }

        .dg-mock-card { background: #FFFFFF; border: 1px solid var(--dg-border); border-radius: 14px; overflow: hidden; box-shadow: 0 12px 28px -12px rgba(16,21,31,0.1); }
        .dg-mock-bar { background: #F8FAFC; border-bottom: 1px solid var(--dg-border); padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .dg-mock-badge { font-size: 10px; font-weight: 700; background: #EEF2F6; color: #475569; padding: 2px 7px; border-radius: 6px; }
        .dg-mock-badge.ok { background: #ECFDF5; color: #059669; }

        .dg-mock-input-box { padding: 16px; }
        .dg-mock-label { font-size: 11px; font-weight: 700; color: #64748B; margin-bottom: 6px; }
        .dg-mock-textarea { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px; font-size: 12.5px; color: #1E293B; line-height: 1.5; font-weight: 500; }
        .dg-mock-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
        .dg-chip { font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 6px; background: #F1F5F9; color: #475569; }
        .dg-chip.active { background: #E0F2FE; color: #0369A1; }

        .dg-mock-footer { border-top: 1px solid var(--dg-border); padding: 10px 14px; display: flex; justify-content: flex-end; background: #FAFAFA; }
        .dg-mock-btn {
          font-size: 12px; font-weight: 700; background: var(--dg-teal-700); color: #fff;
          border: none; border-radius: 8px; padding: 7px 14px; cursor: pointer;
          display: inline-flex; align-items: center; gap: 6px; transition: all .15s var(--ease);
        }
        .dg-mock-btn:hover { background: var(--dg-teal-600); transform: translateY(-1px); }

        .dg-cand-preview { padding: 16px; }
        .dg-cand-head { display: flex; align-items: center; gap: 10px; }
        .dg-cand-avatar { width: 38px; height: 38px; border-radius: 10px; background: #0A7E96; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; }
        .dg-cand-name { font-size: 13.5px; font-weight: 700; color: #0F172A; }
        .dg-cand-role { font-size: 11.5px; color: #64748B; }
        .dg-cand-score { margin-left: auto; font-family: var(--font-mono); font-size: 14px; font-weight: 800; color: #059669; background: #ECFDF5; padding: 4px 10px; border-radius: 999px; }
        .dg-cand-tags { display: flex; flex-wrap: wrap; gap: 6px; margin: 12px 0 10px; }
        .dg-tag-ok { font-size: 11px; font-weight: 600; background: #F0FDF4; color: #166534; padding: 2px 7px; border-radius: 6px; }
        .dg-cand-rationale { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 9px; padding: 10px; font-size: 11.5px; color: #334155; line-height: 1.45; }

        .dg-matrix-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 14px; }
        .dg-matrix-col { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px; display: flex; flex-direction: column; gap: 6px; }
        .dg-matrix-name { font-size: 13px; font-weight: 700; color: #0F172A; }
        .dg-matrix-score { font-family: var(--font-mono); font-size: 13px; font-weight: 700; }
        .dg-matrix-score.high { color: #059669; } .dg-matrix-score.medium { color: #0284C7; }
        .dg-matrix-stat { font-size: 11.5px; color: #475569; }
        .dg-matrix-badge { font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: #E2E8F0; color: #334155; width: fit-content; margin-top: 4px; }
        .dg-matrix-badge.best { background: #FEF3C7; color: #92400E; }

        .dg-kanban-mini { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; padding: 12px; }
        .dg-kanban-col { background: #F8FAFC; border: 1.5px dashed #CBD5E1; border-radius: 8px; padding: 8px 6px; min-height: 95px; cursor: pointer; transition: all .18s var(--ease); }
        .dg-kanban-col:hover { border-color: #0A7E96; background: #F0F9FF; }
        .dg-kanban-col.selected { border-style: solid; border-color: #0A7E96; background: #F0F9FF; }
        .dg-kanban-col-head { display: flex; align-items: center; justify-content: space-between; font-size: 10.5px; font-weight: 700; color: #475569; margin-bottom: 6px; }
        .dg-kanban-count { background: #E2E8F0; border-radius: 999px; padding: 1px 5px; font-size: 9px; }
        .dg-kanban-card-mini { background: #fff; border: 1px solid #CBD5E1; border-radius: 6px; padding: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.04); animation: dgStepFade .25s var(--ease); }
        .dg-kanban-interactive-hint { font-size: 11px; text-align: center; color: #64748B; padding: 0 12px 10px; }

        .dg-team-mock-body { padding: 16px; }
        .dg-team-mock-field { margin-bottom: 12px; }
        .dg-team-mock-label { font-size: 11.5px; font-weight: 700; color: #475569; margin-bottom: 5px; }
        .dg-team-mock-input-row { display: flex; align-items: center; gap: 8px; background: #F8FAFC; border: 1.5px solid #E2E8F0; border-radius: 9px; padding: 8px 12px; margin-top: 4px; }
        .dg-team-role-pill { margin-left: auto; font-size: 9.5px; font-weight: 700; background: #E0F2F5; color: #0A7E96; padding: 2px 7px; border-radius: 5px; }
        .dg-team-privileges-box { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 10px; margin-bottom: 12px; }
        .dg-privilege-chips { display: flex; flex-wrap: wrap; gap: 6px; }
        .dg-priv-chip { font-size: 11px; font-weight: 600; padding: 4px 9px; border-radius: 7px; border: 1px solid #CBD5E1; background: #FFFFFF; color: #475569; cursor: pointer; transition: all .15s var(--ease); display: inline-flex; align-items: center; gap: 4px; }
        .dg-priv-chip.active { background: #E6FFFA; border-color: #0D9488; color: #0F766E; font-weight: 700; }
        .dg-invite-link-preview { display: flex; align-items: center; justify-content: space-between; gap: 8px; background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 8px; padding: 8px 10px; }
        .dg-invite-link-text { font-family: var(--font-mono); font-size: 10.5px; color: #1E40AF; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .dg-copy-btn { font-size: 11px; font-weight: 700; background: #FFFFFF; border: 1px solid #93C5FD; color: #1E40AF; border-radius: 6px; padding: 4px 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0; }
        .dg-copy-btn:hover { background: #DBEAFE; }

        /* Guided tour modal */
        .dg-tour-modal-card { width: 100%; max-width: 500px; background: #FFFFFF; border: 1px solid var(--dg-border); border-radius: 20px; padding: 32px; box-shadow: 0 24px 60px -12px rgba(16,21,31,0.35); position: relative; box-sizing: border-box; animation: dgpop .3s var(--ease); }
        .dg-tour-header { text-align: left; }
        .dg-tour-title { font-size: 21px; font-weight: 600; color: var(--dg-ink-900); }
        .dg-tour-sub { font-size: 13.5px; color: var(--dg-ink-500); margin-top: 4px; line-height: 1.5; }
        .dg-tour-body { margin: 22px 0 26px; }
        .dg-tour-tip-box { background: var(--dg-bronze-100); border: 1px solid rgba(180,101,15,0.2); border-radius: 12px; padding: 12px 16px; font-size: 13px; color: var(--dg-bronze-700); display: flex; align-items: flex-start; gap: 10px; line-height: 1.5; }
        .dg-tour-stepper { display: flex; justify-content: center; gap: 10px; margin-top: 22px; }
        .dg-tour-step-dot { width: 30px; height: 30px; border-radius: 50%; background: var(--dg-sunken); border: 1.5px solid var(--dg-border); display: flex; align-items: center; justify-content: center; font-family: var(--font-mono); font-size: 11px; font-weight: 700; color: var(--dg-ink-500); cursor: pointer; transition: all .18s var(--ease); }
        .dg-tour-step-dot.active { background: var(--dg-teal-600); border-color: var(--dg-teal-600); color: #fff; transform: scale(1.08); }
        .dg-tour-step-dot.completed { background: var(--dg-teal-100); border-color: var(--dg-teal-600); color: var(--dg-teal-700); }
        .dg-tour-footer { display: flex; align-items: center; justify-content: space-between; }

        /* Stages */
        .dg-stages-section { margin-top: 88px; border-top: 1px solid var(--dg-border); padding-top: 56px; }
        .dg-section-header { max-width: 560px; margin: 0 auto 36px; text-align: center; }
        .dg-section-title { font-size: 26px; font-weight: 600; color: var(--dg-ink-900); }
        .dg-section-sub { font-size: 14px; color: var(--dg-ink-500); margin-top: 8px; }

        .dg-stages-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: var(--dg-border); border: 1px solid var(--dg-border); border-radius: 16px; overflow: hidden; }
        .dg-stage-card { background: var(--dg-surface); padding: 26px 22px; transition: background .2s ease; }
        .dg-stage-card:hover { background: var(--dg-teal-100); }
        .dg-stage-num { font-family: var(--font-mono); font-size: 11.5px; font-weight: 700; color: var(--dg-teal-600); display: block; margin-bottom: 14px; }
        .dg-stage-title { font-size: 15px; font-weight: 700; color: var(--dg-ink-900); }
        .dg-stage-desc { font-size: 12.5px; color: var(--dg-ink-500); margin-top: 8px; line-height: 1.55; }

        /* Features */
        .dg-features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 28px; }
        .dg-feature-item { background: var(--dg-surface); border: 1px solid var(--dg-border); border-radius: 16px; padding: 26px; transition: border-color .2s ease, transform .2s var(--ease); }
        .dg-feature-item:hover { border-color: var(--dg-teal-500); transform: translateY(-3px); }
        .dg-feature-icon-wrap { width: 38px; height: 38px; border-radius: 10px; background: var(--dg-teal-100); color: var(--dg-teal-700); display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
        .dg-feature-title { font-size: 15px; font-weight: 700; color: var(--dg-ink-900); }
        .dg-feature-desc { font-size: 13px; color: var(--dg-ink-500); margin-top: 6px; line-height: 1.5; }

        /* Modal Backdrop & Dialog */
        .dg-modal-overlay { position: fixed; inset: 0; background: rgba(14,19,29,0.72); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; animation: dgfade .2s ease; }
        @keyframes dgfade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes dgpop { from { opacity: 0; transform: scale(0.96) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }

        .dg-modal-card { width: 100%; max-width: 440px; background: var(--dg-surface); border: 1px solid var(--dg-border); border-radius: 22px; padding: 32px; box-shadow: 0 24px 60px -12px rgba(16,21,31,0.35); position: relative; animation: dgpop .3s var(--ease); box-sizing: border-box; max-height: 90vh; overflow-y: auto; }
        .dg-modal-close { position: absolute; right: 20px; top: 20px; background: var(--dg-sunken); border: none; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; color: var(--dg-ink-500); cursor: pointer; transition: all .15s ease; }
        .dg-modal-close:hover { background: var(--dg-border); color: var(--dg-ink-900); }

        .dg-card-title { font-size: 21px; font-weight: 600; color: var(--dg-ink-900); }
        .dg-card-sub { font-size: 13px; color: var(--dg-ink-500); margin-top: 5px; line-height: 1.5; }

        .dg-tabs { display: flex; background: var(--dg-sunken); border: 1px solid var(--dg-border); border-radius: 12px; padding: 4px; margin-top: 20px; }
        .dg-tab { flex: 1; padding: 9px 0; font-size: 12.5px; font-weight: 600; border-radius: 9px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; background: transparent; color: var(--dg-ink-500); transition: background .15s ease, color .15s ease; }
        .dg-tab-active { background: var(--dg-surface); color: var(--dg-ink-900); box-shadow: 0 1px 3px rgba(16,21,31,0.08); }

        .dg-error { margin-top: 16px; display: flex; align-items: flex-start; gap: 9px; background: var(--dg-danger-bg); border: 1px solid rgba(179,38,30,0.25); color: var(--dg-danger); border-radius: 12px; padding: 11px 13px; font-size: 12.5px; animation: dgRise .25s var(--ease); }

        .dg-field { margin-top: 15px; }
        .dg-field-label { font-size: 12px; font-weight: 600; color: var(--dg-ink-700); display: block; margin-bottom: 6px; }
        .dg-input-wrap { position: relative; }
        .dg-input-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--dg-ink-400); }
        .dg-input { width: 100%; box-sizing: border-box; font-size: 13.5px; color: var(--dg-ink-900); background: var(--dg-paper); border: 1.5px solid var(--dg-border); border-radius: 11px; padding: 11px 12px 11px 38px; outline: none; transition: border-color .15s ease, background .15s ease, box-shadow .15s ease; }
        .dg-input:focus { border-color: var(--dg-teal-500); background: var(--dg-surface); box-shadow: 0 0 0 3px rgba(18,143,160,0.14); }
        .dg-input::placeholder { color: var(--dg-ink-400); }
        .dg-eye-btn { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; color: var(--dg-ink-400); cursor: pointer; padding: 4px; }
        .dg-eye-btn:hover { color: var(--dg-ink-700); }

        .dg-role-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
        .dg-role-badge { font-family: var(--font-mono); font-size: 10px; color: var(--dg-teal-700); background: var(--dg-teal-100); border: 1px solid rgba(14,124,140,0.2); border-radius: 999px; padding: 2px 8px; }
        .dg-role-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .dg-role-card { text-align: left; border-radius: 13px; padding: 12px; cursor: pointer; background: var(--dg-paper); border: 1.5px solid var(--dg-border); transition: border-color .15s ease, background .15s ease; }
        .dg-role-card-active-teal { border-color: var(--dg-teal-600); background: var(--dg-teal-100); }
        .dg-role-card-active-bronze { border-color: var(--dg-bronze-600); background: var(--dg-bronze-100); }
        .dg-role-title { display: flex; align-items: center; gap: 7px; font-size: 12.5px; font-weight: 700; color: var(--dg-ink-900); }
        .dg-role-desc { font-size: 10.5px; color: var(--dg-ink-500); margin-top: 4px; line-height: 1.4; }

        .dg-remember-row { display: flex; align-items: center; justify-content: space-between; margin-top: 14px; }
        .dg-checkbox-label { display: inline-flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 500; color: var(--dg-ink-700); cursor: pointer; user-select: none; }
        .dg-checkbox { width: 16px; height: 16px; accent-color: var(--dg-teal-600); border-radius: 4px; cursor: pointer; margin: 0; }

        .dg-submit { width: 100%; margin-top: 22px; padding: 13px 0; border: none; border-radius: 12px; background: var(--dg-ink-900); color: #fff; font-size: 13.5px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: background .18s var(--ease), transform .1s ease; }
        .dg-submit:hover { background: var(--dg-teal-700); }
        .dg-submit:active { transform: scale(0.99); }
        .dg-submit:disabled { opacity: 0.6; cursor: default; }
        .dg-spinner { width: 15px; height: 15px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; animation: dgspin .7s linear infinite; }
        @keyframes dgspin { to { transform: rotate(360deg); } }

        /* Footer */
        .dg-footer { max-width: 1240px; width: 100%; margin: 0 auto; padding: 24px 24px 32px; display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--dg-border); font-size: 12px; color: var(--dg-ink-500); box-sizing: border-box; flex-wrap: wrap; gap: 14px; }
        .dg-footer-links { display: flex; gap: 18px; flex-wrap: wrap; }
        .dg-footer-links span { cursor: pointer; transition: color .15s ease; }
        .dg-footer-links span:hover { color: var(--dg-teal-700); }

        @media (prefers-reduced-motion: reduce) {
          .dg-hero-anim, .dg-underline-path, .dg-eyebrow-dot, .dg-showcase-right, .dg-terminal-line, .dg-error, .dg-kanban-card-mini { animation: none !important; opacity: 1 !important; transform: none !important; }
        }

        @media (max-width: 980px) {
          .dg-showcase-box { grid-template-columns: 1fr; }
          .dg-showcase-connector { display: none; }
          .dg-showcase-ghost-num { font-size: 110px; top: -10px; }
          .dg-rail-node-label { display: none; }
          .dg-stages-grid { grid-template-columns: 1fr 1fr; }
          .dg-features-grid { grid-template-columns: 1fr; }
          .dg-headline { font-size: 38px; }
        }
        @media (max-width: 640px) {
          .dg-stages-grid { grid-template-columns: 1fr; }
          .dg-brand-logo { height: 68px; }
          .dg-nav-actions { gap: 6px; }
          .dg-lang-btn { padding: 6px 10px; font-size: 11px; }
          .dg-nav-signin-btn { padding: 6px 12px; font-size: 12px; }
          .dg-headline { font-size: 30px; }
          .dg-footer { flex-direction: column; text-align: center; }
        }
      `}</style>

      {/* Header */}
      <header className="dg-header">
        <div className="dg-brand">
          <img src={targetalentLogo} alt="Targetalent" className="dg-brand-logo" />
        </div>

        <div className="dg-nav-actions">
          <button
            type="button"
            className="dg-lang-btn"
            onClick={() => setLang(lang === 'EN' ? 'FR' : 'EN')}
            title={lang === 'EN' ? 'Passer en Français' : 'Switch to English'}
          >
            <Globe size={13} color="var(--dg-teal-600)" />
            <span>{lang === 'EN' ? 'FR' : 'EN'}</span>
          </button>

          <button type="button" className="dg-nav-signin-btn" onClick={() => openAuth(true)} title={t.tabLogin}>
            <LogIn size={15} />
            <span>{t.tabLogin}</span>
          </button>
        </div>
      </header>

      {/* Invite Banner */}
      {inviteToken && (
        <div className="dg-invite-banner">
          <div className="dg-invite-banner-inner">
            <div className="dg-invite-banner-left">
              <Sparkles size={18} />
              <span>{t.inviteBannerText}</span>
            </div>
            <button type="button" className="dg-invite-banner-btn" onClick={() => openAuth(false)}>
              <span>{t.inviteBannerAction}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      <main className="dg-main">
        {/* Hero */}
        <div className="dg-hero-section" key={lang}>
          <span className="dg-eyebrow-row dg-hero-anim d1">
            <span className="dg-eyebrow-dot" />
            {t.eyebrow}
          </span>

          <h1 className="dg-headline dg-display dg-hero-anim d2">
            {t.headline1}{' '}
            <span className="dg-headline-accent-wrap">
              {t.headlineAccent}
              <svg viewBox="0 0 320 14" preserveAspectRatio="none" aria-hidden="true">
                <path className="dg-underline-path" d="M2,9 C60,2 140,2 200,7 C240,10 280,5 318,8" />
              </svg>
            </span>{' '}
            {t.headline2}
          </h1>

          <p className="dg-sub dg-hero-anim d3">{t.sub}</p>

          <div className="dg-hero-cta-group dg-hero-anim d4">
            <button type="button" className="dg-hero-btn-primary" onClick={() => openAuth(inviteToken ? false : true)}>
              {inviteToken ? <Sparkles size={16} /> : <LogIn size={16} />}
              <span>{inviteToken ? t.ctaHeroInvite : t.submitLogin}</span>
              <ArrowRight size={15} />
            </button>
            <button type="button" className="dg-hero-btn-secondary" onClick={() => openAuth(false)}>
              <UserPlus size={16} />
              <span>{t.ctaPrimary}</span>
            </button>
            <button type="button" className="dg-hero-btn-tour" onClick={() => setIsTourModalOpen(true)}>
              <span className="dg-play-dot"><Play size={11} fill="currentColor" /></span>
              <span>{t.ctaTour}</span>
            </button>
          </div>

          <div className="dg-metrics-row dg-hero-anim d5">
            <div className="dg-metric-item"><CheckCircle2 size={15} className="dg-metric-icon" /><span>{t.badgeMetric1}</span></div>
            <div className="dg-metric-item"><CheckCircle2 size={15} className="dg-metric-icon" /><span>{t.badgeMetric2}</span></div>
            <div className="dg-metric-item"><CheckCircle2 size={15} className="dg-metric-icon" /><span>{t.badgeMetric3}</span></div>
          </div>
        </div>

        <div className="dg-terminal-wrapper dg-hero-anim d6">
          <Terminal lang={lang} />
        </div>

        <InteractiveAppTutorial lang={lang} onOpenAuth={openAuth} />

        {/* Stages */}
        <div className="dg-stages-section">
          <div className="dg-section-header">
            <h2 className="dg-section-title dg-display">{t.stagesHeader}</h2>
            <p className="dg-section-sub">{t.stagesSub}</p>
          </div>

          <div className="dg-stages-grid">
            {t.stages.map((s) => (
              <div className="dg-stage-card" key={s.n}>
                <span className="dg-stage-num dg-mono">{s.n}</span>
                <div className="dg-stage-title">{s.t}</div>
                <div className="dg-stage-desc">{s.d}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <div style={{ marginTop: 60 }}>
          <div className="dg-section-header">
            <h2 className="dg-section-title dg-display">{t.featuresTitle}</h2>
          </div>

          <div className="dg-features-grid">
            {t.features.map((f, idx) => (
              <div className="dg-feature-item" key={idx}>
                <div className="dg-feature-icon-wrap">
                  {f.icon === 'Zap' && <Zap size={19} />}
                  {f.icon === 'Users' && <Users size={19} />}
                  {f.icon === 'BarChart3' && <BarChart3 size={19} />}
                </div>
                <div className="dg-feature-title">{f.title}</div>
                <div className="dg-feature-desc">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Auth Modal */}
      {isAuthModalOpen && (
        <div
          className="dg-modal-overlay"
          role="presentation"
          onClick={(e) => { if (e.target === e.currentTarget) closeAuth(); }}
        >
          <div className="dg-modal-card" role="dialog" aria-modal="true">
            <button type="button" className="dg-modal-close" onClick={closeAuth} aria-label="Close">
              <X size={16} />
            </button>

            {inviteToken ? (
              <div style={{ marginBottom: 18 }}>
                <span className="dg-kicker">{lang === 'FR' ? 'Invitation d\u2019équipe' : 'Team invitation'}</span>
                <div className="dg-card-title dg-display">
                  {lang === 'FR' ? 'Rejoindre l\u2019espace recrutement' : 'Join the recruiting workspace'}
                </div>
                <div className="dg-card-sub">
                  {lang === 'FR'
                    ? 'Vous avez été invité par un administrateur RH. Définissez votre nom et mot de passe pour accéder au tableau de bord partagé.'
                    : 'You\u2019ve been invited by an HR admin. Set your full name and password to access the shared hiring dashboard.'}
                </div>
              </div>
            ) : (
              <>
                <div className="dg-card-title dg-display">{isLogin ? t.cardTitleLogin : t.cardTitleReg}</div>
                <div className="dg-card-sub">{isLogin ? t.cardSubLogin : t.cardSubReg}</div>

                <div className="dg-tabs">
                  <button type="button" className={'dg-tab' + (isLogin ? ' dg-tab-active' : '')} onClick={() => { setIsLogin(true); setError(''); }}>
                    <LogIn size={13} />{t.tabLogin}
                  </button>
                  <button type="button" className={'dg-tab' + (!isLogin ? ' dg-tab-active' : '')} onClick={() => { setIsLogin(false); setError(''); }}>
                    <UserPlus size={13} />{t.tabReg}
                  </button>
                </div>
              </>
            )}

            {error && (
              <div className="dg-error">
                <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {(!isLogin || inviteToken) && (
                <div className="dg-field">
                  <label className="dg-field-label">{t.fullName}</label>
                  <div className="dg-input-wrap">
                    <User size={15} className="dg-input-icon" />
                    <input className="dg-input" type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder={t.fullNamePh} />
                  </div>
                </div>
              )}

              {!inviteToken && (
                <div className="dg-field">
                  <label className="dg-field-label">{t.email}</label>
                  <div className="dg-input-wrap">
                    <Mail size={15} className="dg-input-icon" />
                    <input className="dg-input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.emailPh} />
                  </div>
                </div>
              )}

              <div className="dg-field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="dg-field-label">{t.password}</label>
                  {isLogin && !inviteToken && (
                    <button type="button" onClick={() => setIsForgotOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--dg-teal-600)', fontSize: '11.5px', fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: 5 }}>
                      {lang === 'FR' ? 'Mot de passe oublié ?' : 'Forgot password?'}
                    </button>
                  )}
                </div>
                <div className="dg-input-wrap">
                  <Lock size={15} className="dg-input-icon" />
                  <input className="dg-input" type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" style={{ paddingRight: 38 }} />
                  <button type="button" className="dg-eye-btn" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {isLogin && !inviteToken && (
                <div className="dg-remember-row">
                  <label className="dg-checkbox-label">
                    <input
                      type="checkbox"
                      className="dg-checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span>{t.rememberMe}</span>
                  </label>
                </div>
              )}

              {!isLogin && !inviteToken && (
                <div className="dg-field">
                  <div className="dg-role-row">
                    <span className="dg-field-label" style={{ margin: 0 }}>{t.roleLabel}</span>
                    <span className="dg-role-badge dg-mono">{t.roleBadge}</span>
                  </div>
                  <div className="dg-role-grid">
                    <button type="button" className={'dg-role-card' + (role === 'RECRUITER' ? ' dg-role-card-active-teal' : '')} onClick={() => setRole('RECRUITER')}>
                      <div className="dg-role-title">
                        <Briefcase size={14} color={role === 'RECRUITER' ? 'var(--dg-teal-700)' : 'var(--dg-ink-500)'} />
                        {t.recruiterTitle}
                      </div>
                      <div className="dg-role-desc">{t.recruiterDesc}</div>
                    </button>
                    <button type="button" className={'dg-role-card' + (role === 'HR_ADMIN' ? ' dg-role-card-active-bronze' : '')} onClick={() => setRole('HR_ADMIN')}>
                      <div className="dg-role-title">
                        <ShieldCheck size={14} color={role === 'HR_ADMIN' ? 'var(--dg-bronze-700)' : 'var(--dg-ink-500)'} />
                        {t.hrTitle}
                      </div>
                      <div className="dg-role-desc">{t.hrDesc}</div>
                    </button>
                  </div>
                </div>
              )}

              <button type="submit" className="dg-submit" disabled={loading}>
                {loading ? (
                  <span className="dg-spinner" />
                ) : (
                  <>
                    {inviteToken ? <Sparkles size={15} /> : (isLogin ? <LogIn size={15} /> : <UserPlus size={15} />)}
                    {inviteToken ? (lang === 'FR' ? 'Accepter & rejoindre' : 'Accept & join workspace') : (isLogin ? t.submitLogin : t.submitReg)}
                  </>
                )}
              </button>

              {inviteToken && (
                <div style={{ marginTop: 14, textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setInviteToken('');
                      if (typeof window !== 'undefined') {
                        window.history.replaceState({}, document.title, window.location.pathname);
                      }
                      if (onClearInvite) onClearInvite();
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--dg-teal-600)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    {lang === 'FR' ? 'Vous avez déjà un compte ? Se connecter' : 'Already have an account? Sign in'}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      <GuidedTourModal isOpen={isTourModalOpen} onClose={() => setIsTourModalOpen(false)} lang={lang} onOpenAuth={openAuth} />

      <ForgotPasswordModal
        isOpen={isForgotOpen}
        onClose={() => setIsForgotOpen(false)}
        lang={lang}
        onResetSuccess={(em, pwd) => {
          setEmail(em);
          setPassword(pwd);
          setIsLogin(true);
        }}
      />

      <footer className="dg-footer">
        <div>{t.footerCopy}</div>
        <div className="dg-footer-links">
          {t.footerLinks.map((l) => <span key={l}>{l}</span>)}
        </div>
      </footer>
    </div>
  );
}