import React, { useState, useEffect, useRef } from 'react';
import {
  LogIn, UserPlus, Lock, Mail, User, ShieldCheck, Briefcase,
  Eye, EyeOff, ArrowRight, AlertCircle, Radar, KeyRound, CheckCircle2, Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ForgotPasswordModal } from './ForgotPasswordModal';

/* ------------------------------------------------------------------
   Copy — kept bilingual (EN/FR) like the source component.
   ------------------------------------------------------------------ */
const COPY = {
  EN: {
    brandTag: 'v2.5 Enterprise',
    tagline: 'Autonomous talent sourcing',
    eyebrow: 'AUTONOMOUS SOURCING AGENT',
    headline1: 'Source and match',
    headlineAccent: 'top engineers',
    headline2: 'faster.',
    sub: 'An enterprise sourcing platform that scans, scores, and routes candidates automatically — with permissions built around how recruiting teams actually work.',
    consoleLabel: 'Live agent activity',
    stages: [
      { n: '01', t: 'Source', d: 'Scan LinkedIn, GitHub and referrals for matching engineers.' },
      { n: '02', t: 'Score', d: "Rank each profile against the role’s real requirements." },
      { n: '03', t: 'Route', d: 'Send shortlists straight to the right recruiter queue.' },
      { n: '04', t: 'Track', d: 'Watch every candidate move through the pipeline, live.' },
    ],
    cardTitleLogin: 'Sign in to your workspace',
    cardSubLogin: 'Use your corporate email and password.',
    cardTitleReg: 'Create your account',
    cardSubReg: 'Choose your role to set up the right permissions.',
    tabLogin: 'Sign in',
    tabReg: 'Create account',
    fullName: 'Full name',
    fullNamePh: 'Enter you name',
    email: 'Work email',
    emailPh: 'name@example.com',
    password: 'Password',
    roleLabel: 'Account role',
    roleBadge: 'Sets permissions',
    recruiterTitle: 'Recruiter',
    recruiterDesc: 'Sourcing and candidate pipelines',
    hrTitle: 'HR admin',
    hrDesc: 'Team management and configuration',
    submitLogin: 'Sign in',
    submitReg: 'Create account',
    footerCopy: 'Targetalent — Enterprise sourcing platform © 2026',
    footerLinks: ['Security', 'Status', 'Support'],
    errLogin: 'We couldn’t sign you in. Check your email and password.',
    errReg: 'We couldn’t create your account. Please try again.',
    langToggle: 'Français',
  },
  FR: {
    brandTag: 'v2.5 Entreprise',
    tagline: 'Sourcing de talents autonome',
    eyebrow: 'AGENT DE SOURCING AUTONOME',
    headline1: 'Trouvez et',
    headlineAccent: 'qualifiez les talents',
    headline2: 'plus vite.',
    sub: 'Une plateforme de sourcing d’entreprise qui analyse, classe et oriente les candidats automatiquement — avec des permissions pensées pour le travail réel des recruteurs.',
    consoleLabel: 'Activité de l’agent en direct',
    stages: [
      { n: '01', t: 'Sourcing', d: 'Analyse LinkedIn, GitHub et cooptations pour trouver les bons profils.' },
      { n: '02', t: 'Scoring', d: 'Classe chaque profil selon les exigences réelles du poste.' },
      { n: '03', t: 'Routage', d: 'Envoie les shortlists directement dans la bonne file recruteur.' },
      { n: '04', t: 'Suivi', d: 'Suivez chaque candidat dans le pipeline, en direct.' },
    ],
    cardTitleLogin: 'Connexion à votre espace',
    cardSubLogin: 'Utilisez votre email et mot de passe professionnels.',
    cardTitleReg: 'Créer votre compte',
    cardSubReg: 'Choisissez votre rôle pour configurer les bonnes permissions.',
    tabLogin: 'Connexion',
    tabReg: 'Créer un compte',
    fullName: 'Nom complet',
    fullNamePh: 'Entrez votre nom',
    email: 'Email professionnel',
    emailPh: 'nom@example.com',
    password: 'Mot de passe',
    roleLabel: 'Rôle du compte',
    roleBadge: 'Définit les permissions',
    recruiterTitle: 'Recruteur',
    recruiterDesc: 'Sourcing et pipelines de candidats',
    hrTitle: 'Admin RH',
    hrDesc: 'Gestion d’équipe et configuration',
    submitLogin: 'Se connecter',
    submitReg: 'Créer le compte',
    footerCopy: 'Targetalent — Plateforme de sourcing d’entreprise © 2026',
    footerLinks: ['Sécurité', 'Statut', 'Support'],
    errLogin: 'Connexion impossible. Vérifiez votre email et mot de passe.',
    errReg: 'Impossible de créer le compte. Veuillez réessayer.',
    langToggle: 'English',
  },
};

const LOG_LINES = {
  EN: [
    '$ agent.scan(source="linkedin")',
    '\u2192 candidates indexed: 1,842',
    '\u2192 filtering: React \u00b7 TypeScript \u00b7 5+ yrs',
    '\u2713 shortlist ready \u2014 34 matches, avg fit 91%',
    '\u2192 routing to: Senior Frontend Engineer',
  ],
  FR: [
    '$ agent.scan(source="linkedin")',
    '\u2192 candidats index\u00e9s : 1 842',
    '\u2192 filtrage : React \u00b7 TypeScript \u00b7 5+ ans',
    '\u2713 shortlist pr\u00eate \u2014 34 correspondances, fit 91%',
    '\u2192 routage vers : Ingénieur Frontend Senior',
  ],
};

/* ------------------------------------------------------------------
   Small building blocks
   ------------------------------------------------------------------ */

function Logomark({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" stroke="var(--dg-teal-600)" strokeWidth="1.4" />
      <circle cx="12" cy="12" r="5.2" stroke="var(--dg-teal-600)" strokeWidth="1.4" />
      <circle cx="12" cy="12" r="1.4" fill="var(--dg-teal-600)" />
      <path d="M12 1.6V4.4M12 19.6V22.4M1.6 12H4.4M19.6 12H22.4" stroke="var(--dg-teal-600)" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function Terminal({ lang }) {
  const lines = LOG_LINES[lang];
  const [visible, setVisible] = useState(1);

  useEffect(() => {
    setVisible(1);
    const id = setInterval(() => {
      setVisible((v) => (v >= lines.length ? 1 : v + 1));
    }, 1900);
    return () => clearInterval(id);
  }, [lang]);

  return (
    <div className="dg-terminal">
      <div className="dg-terminal-bar">
        <span className="dg-terminal-dot" />
        <span className="dg-terminal-dot" />
        <span className="dg-terminal-dot" />
        <span className="dg-terminal-label">agent.log</span>
      </div>
      <div className="dg-terminal-body">
        {lines.slice(0, visible).map((line, i) => (
          <div
            key={i}
            className={
              'dg-terminal-line' +
              (line.startsWith('\u2713') ? ' dg-terminal-line-ok' : '')
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
   Main component
   ------------------------------------------------------------------ */

export default function AuthPage({ onAccepted, onClearInvite }) {
  const [lang, setLang] = useState(() => {
    try {
      const saved =
        localStorage.getItem('targetalent_language') ||
        localStorage.getItem('digitalia_language');
      if (saved && (saved === 'FR' || saved === 'EN')) return saved;
    } catch (e) {}
    return 'EN';
  });

  useEffect(() => {
    try {
      localStorage.setItem('targetalent_language', lang);
    } catch (e) {}
  }, [lang]);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('RECRUITER');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [inviteToken, setInviteToken] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('invite') || '';
    }
    return '';
  });
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
          }
          if (onAccepted) onAccepted();
        } else {
          setError(lang === 'FR' ? 'Invitation invalide ou expirée.' : 'Invalid or expired invitation.');
        }
      } else if (isLogin) {
        const success = await login(email, password);
        if (!success) setError(t.errLogin);
      } else {
        const success = await register(name, email, password, role);
        if (!success) setError(t.errReg);
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

          font-family: var(--font-body);
          background: var(--dg-paper);
          color: var(--dg-ink-900);
          min-height: 100vh;
          background-image:
            radial-gradient(circle at 8% 8%, rgba(14,124,140,0.05), transparent 40%),
            radial-gradient(circle at 92% 92%, rgba(180,101,15,0.05), transparent 40%);
        }
        .dg-display { font-family: var(--font-display); letter-spacing: -0.01em; }
        .dg-mono { font-family: var(--font-mono); }

        .dg-header {
          max-width: 1200px; margin: 0 auto; padding: 28px 24px 0;
          display: flex; align-items: center; justify-content: space-between;
        }
        .dg-brand { display: flex; align-items: center; gap: 10px; }
        .dg-brand-mark {
          width: 38px; height: 38px; border-radius: 11px;
          background: var(--dg-surface); border: 1px solid var(--dg-border);
          display: flex; align-items: center; justify-content: center;
        }
        .dg-brand-name { font-size: 17px; font-weight: 700; color: var(--dg-ink-900); }
        .dg-brand-badge {
          font-size: 10px; font-weight: 600; letter-spacing: 0.04em;
          color: var(--dg-teal-700); background: var(--dg-teal-100);
          border: 1px solid rgba(14,124,140,0.25); border-radius: 999px;
          padding: 2px 8px; margin-left: 8px;
        }
        .dg-brand-tag { font-size: 11px; color: var(--dg-ink-500); margin-top: 1px; }
        .dg-lang-btn {
          font-size: 12px; font-weight: 600; color: var(--dg-ink-700);
          background: var(--dg-surface); border: 1px solid var(--dg-border);
          border-radius: 999px; padding: 8px 16px; cursor: pointer;
          transition: border-color .15s ease, background .15s ease;
        }
        .dg-lang-btn:hover { border-color: var(--dg-border-strong); background: var(--dg-sunken); }

        .dg-main {
          max-width: 1200px; margin: 0 auto; padding: 56px 24px 64px;
          display: flex; align-items: flex-start; justify-content: space-between; gap: 64px;
        }

        .dg-eyebrow {
          display: inline-flex; align-items: center; gap: 8px;
          font-family: var(--font-mono); font-size: 11px; font-weight: 500;
          letter-spacing: 0.08em; color: var(--dg-teal-700);
          background: var(--dg-teal-100); border: 1px solid rgba(14,124,140,0.2);
          border-radius: 999px; padding: 6px 12px;
        }
        .dg-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--dg-teal-600); }

        .dg-headline {
          font-size: 42px; line-height: 1.14; font-weight: 700; color: var(--dg-ink-900);
          margin: 22px 0 18px;
        }
        .dg-headline-accent { color: var(--dg-teal-600); }
        .dg-sub { font-size: 14.5px; line-height: 1.65; color: var(--dg-ink-500); max-width: 460px; }

        .dg-terminal {
          margin-top: 30px; width: 100%; max-width: 460px;
          background: var(--dg-ink-900); border-radius: 14px; overflow: hidden;
          box-shadow: 0 16px 40px -20px rgba(16,21,31,0.45);
        }
        .dg-terminal-bar {
          display: flex; align-items: center; gap: 6px; padding: 10px 14px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .dg-terminal-dot { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,0.16); }
        .dg-terminal-label {
          margin-left: 8px; font-family: var(--font-mono); font-size: 11px; color: rgba(255,255,255,0.4);
        }
        .dg-terminal-body { padding: 16px; min-height: 128px; }
        .dg-terminal-line {
          font-family: var(--font-mono); font-size: 12.5px; line-height: 1.9;
          color: #9AB4BD; white-space: pre-wrap;
        }
        .dg-terminal-line-ok { color: #E3A648; }
        .dg-cursor {
          display: inline-block; width: 6px; height: 13px; margin-top: 4px;
          background: var(--dg-teal-500); animation: dgblink 1s step-end infinite;
        }
        @keyframes dgblink { 50% { opacity: 0; } }

        .dg-stages { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
        .dg-stage {
          display: flex; gap: 12px; padding: 16px 18px 16px 0;
          border-top: 1px solid var(--dg-border);
        }
        .dg-stage:nth-child(1), .dg-stage:nth-child(2) { border-top: 1px solid var(--dg-border); }
        .dg-stage-num { font-family: var(--font-mono); font-size: 11px; color: var(--dg-ink-400); padding-top: 2px; }
        .dg-stage-title { font-size: 13px; font-weight: 700; color: var(--dg-ink-900); }
        .dg-stage-desc { font-size: 12px; color: var(--dg-ink-500); margin-top: 2px; line-height: 1.5; }

        .dg-card-wrap { width: 420px; flex-shrink: 0; }
        .dg-card {
          background: var(--dg-surface); border: 1px solid var(--dg-border);
          border-radius: 20px; padding: 30px;
          box-shadow: 0 1px 2px rgba(16,21,31,0.03), 0 20px 48px -24px rgba(16,21,31,0.14);
        }
        .dg-card-title { font-size: 20px; font-weight: 700; color: var(--dg-ink-900); }
        .dg-card-sub { font-size: 12.5px; color: var(--dg-ink-500); margin-top: 5px; line-height: 1.5; }

        .dg-tabs {
          display: flex; background: var(--dg-sunken); border: 1px solid var(--dg-border);
          border-radius: 12px; padding: 4px; margin-top: 22px;
        }
        .dg-tab {
          flex: 1; padding: 9px 0; font-size: 12.5px; font-weight: 600;
          border-radius: 9px; border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 6px;
          background: transparent; color: var(--dg-ink-500);
          transition: background .15s ease, color .15s ease;
        }
        .dg-tab-active { background: var(--dg-surface); color: var(--dg-ink-900); box-shadow: 0 1px 2px rgba(16,21,31,0.06); }

        .dg-error {
          margin-top: 18px; display: flex; align-items: flex-start; gap: 9px;
          background: var(--dg-danger-bg); border: 1px solid rgba(179,38,30,0.25);
          color: var(--dg-danger); border-radius: 12px; padding: 11px 13px; font-size: 12.5px;
        }

        .dg-field { margin-top: 16px; }
        .dg-field-label { font-size: 12px; font-weight: 600; color: var(--dg-ink-700); display: block; margin-bottom: 6px; }
        .dg-input-wrap { position: relative; }
        .dg-input-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--dg-ink-400); }
        .dg-input {
          width: 100%; box-sizing: border-box; font-size: 13px; color: var(--dg-ink-900);
          background: var(--dg-paper); border: 1px solid var(--dg-border);
          border-radius: 11px; padding: 11px 12px 11px 38px;
          outline: none; transition: border-color .15s ease, background .15s ease;
        }
        .dg-input:focus { border-color: var(--dg-teal-500); background: var(--dg-surface); }
        .dg-input::placeholder { color: var(--dg-ink-400); }
        .dg-eye-btn {
          position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
          background: none; border: none; color: var(--dg-ink-400); cursor: pointer; padding: 4px;
        }
        .dg-eye-btn:hover { color: var(--dg-ink-700); }

        .dg-role-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
        .dg-role-badge {
          font-family: var(--font-mono); font-size: 10px; color: var(--dg-teal-700);
          background: var(--dg-teal-100); border: 1px solid rgba(14,124,140,0.2);
          border-radius: 999px; padding: 2px 8px;
        }
        .dg-role-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .dg-role-card {
          text-align: left; border-radius: 13px; padding: 12px; cursor: pointer;
          background: var(--dg-paper); border: 1.5px solid var(--dg-border);
          transition: border-color .15s ease, background .15s ease;
        }
        .dg-role-card-active-teal { border-color: var(--dg-teal-600); background: var(--dg-teal-100); }
        .dg-role-card-active-bronze { border-color: var(--dg-bronze-600); background: var(--dg-bronze-100); }
        .dg-role-title { display: flex; align-items: center; gap: 7px; font-size: 12.5px; font-weight: 700; color: var(--dg-ink-900); }
        .dg-role-desc { font-size: 10.5px; color: var(--dg-ink-500); margin-top: 4px; line-height: 1.4; }

        .dg-submit {
          width: 100%; margin-top: 22px; padding: 13px 0; border: none; border-radius: 12px;
          background: var(--dg-ink-900); color: #fff; font-size: 13px; font-weight: 700;
          cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: background .15s ease, transform .1s ease;
        }
        .dg-submit:hover { background: #232C3A; }
        .dg-submit:active { transform: scale(0.99); }
        .dg-submit:disabled { opacity: 0.6; cursor: default; }
        .dg-spinner {
          width: 15px; height: 15px; border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff;
          animation: dgspin .7s linear infinite;
        }
        @keyframes dgspin { to { transform: rotate(360deg); } }

        .dg-footer {
          max-width: 1200px; margin: 0 auto; padding: 22px 24px 30px;
          display: flex; align-items: center; justify-content: space-between;
          border-top: 1px solid var(--dg-border); font-size: 11.5px; color: var(--dg-ink-500);
        }
        .dg-footer-links { display: flex; gap: 18px; }
        .dg-footer-links span { cursor: pointer; }
        .dg-footer-links span:hover { color: var(--dg-ink-700); }

        @media (max-width: 980px) {
          .dg-main { flex-direction: column; align-items: center; }
          .dg-left { display: none; }
          .dg-card-wrap { width: 100%; max-width: 440px; }
        }
      `}</style>

      <header className="dg-header">
        <div className="dg-brand">
          <div className="dg-brand-mark"><Logomark /></div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span className="dg-brand-name dg-display">TARGETALENT</span>
              <span className="dg-brand-badge dg-mono">{t.brandTag}</span>
            </div>
            <div className="dg-brand-tag">{t.tagline}</div>
          </div>
        </div>
        <button className="dg-lang-btn" onClick={() => setLang(lang === 'EN' ? 'FR' : 'EN')}>
          {t.langToggle}
        </button>
      </header>

      <main className="dg-main">
        <div className="dg-left" style={{ flex: 1, maxWidth: 520 }}>
          <span className="dg-eyebrow"><span className="dg-eyebrow-dot" />{t.eyebrow}</span>

          <h1 className="dg-headline dg-display">
            {t.headline1} <span className="dg-headline-accent">{t.headlineAccent}</span> {t.headline2}
          </h1>

          <p className="dg-sub">{t.sub}</p>

          <Terminal lang={lang} />

          <div className="dg-stages">
            {t.stages.map((s) => (
              <div className="dg-stage" key={s.n}>
                <span className="dg-stage-num dg-mono">{s.n}</span>
                <div>
                  <div className="dg-stage-title">{s.t}</div>
                  <div className="dg-stage-desc">{s.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="dg-card-wrap">
          <div className="dg-card">
            {inviteToken ? (
              <div style={{ marginBottom: 18 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#E9F7FA', color: '#0A7E96', padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
                  <Sparkles size={12} /> {lang === 'FR' ? 'INVITATION D\'ÉQUIPE' : 'TEAM INVITATION'}
                </div>
                <div className="dg-card-title dg-display" style={{ marginTop: 8 }}>
                  {lang === 'FR' ? 'Rejoindre l\'espace recrutement' : 'Join Recruiting Workspace'}
                </div>
                <div className="dg-card-sub">
                  {lang === 'FR'
                    ? 'Vous avez été invité par un administrateur RH. Définissez votre nom et mot de passe pour accéder au tableau de bord partagé.'
                    : 'You\'ve been invited by an HR admin. Set your full name and password to access the shared hiring dashboard.'}
                </div>
              </div>
            ) : (
              <>
                <div className="dg-card-title dg-display">{isLogin ? t.cardTitleLogin : t.cardTitleReg}</div>
                <div className="dg-card-sub">{isLogin ? t.cardSubLogin : t.cardSubReg}</div>

                <div className="dg-tabs">
                  <button
                    type="button"
                    className={'dg-tab' + (isLogin ? ' dg-tab-active' : '')}
                    onClick={() => { setIsLogin(true); setError(''); }}
                  >
                    <LogIn size={13} />{t.tabLogin}
                  </button>
                  <button
                    type="button"
                    className={'dg-tab' + (!isLogin ? ' dg-tab-active' : '')}
                    onClick={() => { setIsLogin(false); setError(''); }}
                  >
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
                    <input
                      className="dg-input"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t.fullNamePh}
                    />
                  </div>
                </div>
              )}

              {!inviteToken && (
                <div className="dg-field">
                  <label className="dg-field-label">{t.email}</label>
                  <div className="dg-input-wrap">
                    <Mail size={15} className="dg-input-icon" />
                    <input
                      className="dg-input"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t.emailPh}
                    />
                  </div>
                </div>
              )}

              <div className="dg-field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="dg-field-label">{t.password}</label>
                  {isLogin && !inviteToken && (
                    <button
                      type="button"
                      onClick={() => setIsForgotOpen(true)}
                      style={{ background: 'none', border: 'none', color: 'var(--dg-teal-600)', fontSize: '11.5px', fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: 5 }}
                    >
                      {lang === 'FR' ? 'Mot de passe oublié ?' : 'Forgot password?'}
                    </button>
                  )}
                </div>
                <div className="dg-input-wrap">
                  <Lock size={15} className="dg-input-icon" />
                  <input
                    className="dg-input"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{ paddingRight: 38 }}
                  />
                  <button type="button" className="dg-eye-btn" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {!isLogin && !inviteToken && (
                <div className="dg-field">
                  <div className="dg-role-row">
                    <span className="dg-field-label" style={{ margin: 0 }}>{t.roleLabel}</span>
                    <span className="dg-role-badge dg-mono">{t.roleBadge}</span>
                  </div>
                  <div className="dg-role-grid">
                    <button
                      type="button"
                      className={'dg-role-card' + (role === 'RECRUITER' ? ' dg-role-card-active-teal' : '')}
                      onClick={() => setRole('RECRUITER')}
                    >
                      <div className="dg-role-title">
                        <Briefcase size={14} color={role === 'RECRUITER' ? 'var(--dg-teal-700)' : 'var(--dg-ink-500)'} />
                        {t.recruiterTitle}
                      </div>
                      <div className="dg-role-desc">{t.recruiterDesc}</div>
                    </button>
                    <button
                      type="button"
                      className={'dg-role-card' + (role === 'HR_ADMIN' ? ' dg-role-card-active-bron' : '')}
                      onClick={() => setRole('HR_ADMIN')}
                    >
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
                    {inviteToken ? (lang === 'FR' ? 'Accepter & Rejoindre l\'espace' : 'Accept & Join Workspace') : (isLogin ? t.submitLogin : t.submitReg)}
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
      </main>

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