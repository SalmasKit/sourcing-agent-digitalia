/**
 * Navbar — enterprise multi-role navigation
 */

import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import {
  Sparkles, Users, BookmarkCheck, LayoutDashboard, Kanban, LogOut,
  Globe, NotebookPen, ChevronDown, Menu, X, Settings, ShieldCheck, KeyRound
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { ChangePasswordModal } from './ChangePasswordModal';
import targetalentLogo from '../assets/targetalent.svg';

function useFonts() {
  const loaded = useRef(false);
  useEffect(() => {
    if (loaded.current) return; loaded.current = true;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap';
    document.head.appendChild(link);
  }, []);
}

function usePulseOnIncrease(value) {
  const [pulse, setPulse] = useState(false);
  const prev = useRef(value);
  useEffect(() => {
    if (value > prev.current) { setPulse(true); const t = setTimeout(() => setPulse(false), 500); prev.current = value; return () => clearTimeout(t); }
    prev.current = value;
  }, [value]);
  return pulse;
}

export function Navbar({ activeTab = 'dashboard', setActiveTab = () => { }, onOpenAuth = () => { }, shortlistCount = 0, notesCount = 0, onToast = () => { } }) {
  useFonts();
  const { user, logout } = useAuth();
  const { lang, toggleLanguage, t } = useLanguage();
  const isFR = lang === 'FR';

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isPasswordModalOpen, setPasswordModal] = useState(false);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const navRef = useRef(null);
  const btnRefs = useRef({});
  const userMenuRef = useRef(null);

  const shortlistPulse = usePulseOnIncrease(shortlistCount);
  const notesPulse = usePulseOnIncrease(notesCount);

  const isAdmin = user?.role === 'HR_ADMIN' || user?.role === 'SUPER_ADMIN';

  const TABS = [
    { id: 'dashboard', icon: LayoutDashboard, label: t('dashboard') || 'Dashboard' },
    { id: 'sourcing', icon: Users, label: t('sourcingHub') || 'Sourcing' },
    { id: 'pipeline', icon: Kanban, label: 'Pipeline' },
    { id: 'notes', icon: NotebookPen, label: 'Notes', badge: notesCount, pulse: notesPulse },
  ];

  if (isAdmin) {
    TABS.push({ id: 'team', icon: ShieldCheck, label: isFR ? 'Équipe & Droits' : 'Team & Privileges' });
  }

  useLayoutEffect(() => {
    const el = btnRefs.current[activeTab];
    const container = navRef.current;
    if (el && container) {
      const elRect = el.getBoundingClientRect(), containerRect = container.getBoundingClientRect();
      setIndicator({ left: elRect.left - containerRect.left, width: elRect.width });
    }
  }, [activeTab, shortlistCount, notesCount, isAdmin]);

  useEffect(() => {
    function handleClick(e) { if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false); }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function selectTab(id) { setActiveTab(id); setMobileOpen(false); }

  return (
    <header className="nb-wrapper">
      <style>{`
        @keyframes nbBadgePulse { 0% { transform:scale(1); } 40% { transform:scale(1.35); } 100% { transform:scale(1); } }
        @keyframes nbMenuIn { from { opacity:0; transform: translateY(-6px); } to { opacity:1; transform:translateY(0); } }
        @keyframes nbMobileIn { from { opacity:0; max-height:0; } to { opacity:1; max-height:360px; } }

        .nb-wrapper { position:sticky; top:0; z-index:50; padding:12px 0; background:rgba(251,250,247,0.88); backdrop-filter:blur(12px); font-family:'Inter', system-ui, sans-serif; }
        .nb-container { max-width:1200px; margin:0 auto; padding:0 24px; }
        .nb-bar { background:#fff; border:1px solid #E4E1D9; border-radius:18px; padding:8px 16px; display:flex; align-items:center; justify-content:space-between; gap:16px; box-shadow:0 2px 10px -4px rgba(18,21,27,0.06); }

        .nb-brand { display:flex; align-items:center; cursor:pointer; transition: transform .15s ease; }
        .nb-brand:hover { transform: scale(1.02); }
        .nb-logo-icon { height:70px; width:auto; object-fit:contain; flex-shrink:0; }

        .nb-nav { position:relative; display:flex; align-items:center; gap:2px; background:#F6F5F1; border:1px solid #E4E1D9; border-radius:13px; padding:4px; }
        .nb-nav-indicator { position:absolute; top:4px; bottom:4px; background:#fff; border-radius:9px; box-shadow:0 1px 3px rgba(18,21,27,0.08); transition: left .25s cubic-bezier(0.22,1,0.36,1), width .25s cubic-bezier(0.22,1,0.36,1); z-index:0; }
        .nb-nav-item { position:relative; z-index:1; display:flex; align-items:center; gap:6px; font-size:12px; font-weight:700; padding:7px 14px; border-radius:9px; border:none; background:none; color:#9B9C9E; cursor:pointer; transition: color .15s ease; }
        .nb-nav-item:hover { color:#12151B; }
        .nb-nav-item.active { color:#0A7E96; }

        .nb-count-badge { font-family:'JetBrains Mono',monospace; font-size:9.5px; font-weight:700; background:#0A7E96; color:#fff; padding:1px 6px; border-radius:999px; margin-left:2px; display:inline-block; }
        .nb-count-badge.pulse { animation: nbBadgePulse .5s ease; }

        .nb-right { display:flex; align-items:center; gap:12px; }
        .nb-lang-btn { display:flex; align-items:center; gap:4px; font-family:'JetBrains Mono',monospace; font-size:11px; font-weight:700; background:#F6F5F1; border:1px solid #E4E1D9; border-radius:999px; padding:5px 12px; color:#3A3D44; cursor:pointer; transition: background .15s ease; }
        .nb-lang-btn:hover { background:#F1F1EC; }

        .nb-user-wrap { position:relative; padding-left:12px; border-left:1px solid #E4E1D9; }
        .nb-user-box { display:flex; align-items:center; gap:8px; cursor:pointer; background:none; border:none; padding:2px; border-radius:10px; }
        .nb-user-box:hover { background:#F6F5F1; }
        .nb-avatar { width:32px; height:32px; border-radius:9px; background:#0A7E96; color:#fff; display:flex; align-items:center; justify-content:center; font-family:'Space Grotesk',sans-serif; font-size:12px; font-weight:800; flex-shrink:0; }
        .nb-user-info { display:flex; flex-direction:column; align-items:flex-start; }
        .nb-user-name { font-size:12px; font-weight:700; color:#12151B; line-height:1.2; }
        .nb-role-badge { font-family:'JetBrains Mono',monospace; font-size:8.5px; font-weight:700; text-transform:uppercase; padding:1px 5px; border-radius:4px; margin-top:2px; display:inline-block; }
        .nb-role-admin { background:#FFF3E0; color:#9A5B0A; }
        .nb-role-recruiter { background:#E9F7FA; color:#0A7E96; }

        .nb-dropdown { position:absolute; top:calc(100% + 8px); right:0; width:220px; background:#fff; border:1px solid #E4E1D9; border-radius:13px; box-shadow:0 16px 32px -12px rgba(18,21,27,0.2); padding:8px; animation: nbMenuIn .15s ease both; z-index:60; }
        .nb-dropdown-head { padding:8px 10px 10px; border-bottom:1px solid #EFEDE7; margin-bottom:6px; }
        .nb-dropdown-name { font-size:12.5px; font-weight:700; color:#12151B; }
        .nb-dropdown-email { font-size:10.5px; color:#9B9C9E; margin-top:1px; }
        .nb-dropdown-item { display:flex; align-items:center; gap:8px; width:100%; text-align:left; font-size:12px; font-weight:600; color:#3A3D44; background:none; border:none; padding:8px 10px; border-radius:8px; cursor:pointer; transition: background .15s; }
        .nb-dropdown-item:hover { background:#F1F1EC; }
        .nb-dropdown-item.danger:hover { background:#FDEEE9; color:#B3261E; }

        .nb-signin-btn { font-size:12px; font-weight:700; background:#12151B; color:#fff; border:none; border-radius:10px; padding:8px 16px; cursor:pointer; }
        .nb-signin-btn:hover { background:#2A2E37; }

        .nb-hamburger { display:none; background:none; border:none; color:#3A3D44; cursor:pointer; padding:6px; }
        .nb-mobile-menu { display:none; }

        @media (max-width: 860px) {
          .nb-nav { display:none; }
          .nb-hamburger { display:flex; }
          .nb-user-info { display:none; }
          .nb-mobile-menu.open { display:flex; flex-direction:column; gap:2px; margin-top:8px; background:#fff; border:1px solid #E4E1D9; border-radius:14px; padding:6px; animation: nbMobileIn .25s ease both; overflow:hidden; }
          .nb-mobile-item { display:flex; align-items:center; gap:8px; font-size:13px; font-weight:600; padding:10px 12px; border-radius:9px; border:none; background:none; color:#3A3D44; cursor:pointer; text-align:left; }
          .nb-mobile-item.active { background:#E9F7FA; color:#0A7E96; }
        }
      `}</style>

      <div className="nb-container">
        <div className="nb-bar">
          <div className="nb-brand" onClick={() => selectTab('dashboard')}>
            <img src={targetalentLogo} alt="Targetalent" className="nb-logo-icon" />
          </div>

          <nav className="nb-nav" ref={navRef}>
            <div className="nb-nav-indicator" style={{ left: indicator.left, width: indicator.width }} />
            {TABS.map(tab => (
              <button key={tab.id} ref={el => btnRefs.current[tab.id] = el} onClick={() => selectTab(tab.id)}
                className={`nb-nav-item${activeTab === tab.id ? ' active' : ''}`}>
                <tab.icon size={14} /><span>{tab.label}</span>
                {tab.badge > 0 && <span className={`nb-count-badge${tab.pulse ? ' pulse' : ''}`}>{tab.badge}</span>}
              </button>
            ))}
          </nav>

          <div className="nb-right">
            <button className="nb-hamburger" onClick={() => setMobileOpen(o => !o)}>{mobileOpen ? <X size={18} /> : <Menu size={18} />}</button>
            <button onClick={toggleLanguage} className="nb-lang-btn" title="Switch language"><Globe size={12} color="#9B9C9E" /><span>{lang}</span></button>

            {user ? (
              <div className="nb-user-wrap" ref={userMenuRef}>
                <button className="nb-user-box" onClick={() => setUserMenuOpen(o => !o)}>
                  <div className="nb-avatar">{(user.fullName || 'U').charAt(0).toUpperCase()}</div>
                  <div className="nb-user-info">
                    <span className="nb-user-name">{user.fullName || user.name}</span>
                    <span className={`nb-role-badge ${user.role === 'HR_ADMIN' ? 'nb-role-admin' : 'nb-role-recruiter'}`}>{user.role === 'HR_ADMIN' ? 'HR Admin' : 'Recruiter'}</span>
                  </div>
                  <ChevronDown size={13} color="#9B9C9E" />
                </button>
                {userMenuOpen && (
                  <div className="nb-dropdown">
                    <div className="nb-dropdown-head">
                      <div className="nb-dropdown-name">{user.fullName || user.name}</div>
                      <div className="nb-dropdown-email">{user.email}</div>
                    </div>
                    {isAdmin && (
                      <button className="nb-dropdown-item" onClick={() => { selectTab('team'); setUserMenuOpen(false); }}>
                        <ShieldCheck size={14} color="#0A7E96" />
                        <span>{isFR ? 'Gestion d\'équipe' : 'Team & Privileges'}</span>
                      </button>
                    )}
                    <button className="nb-dropdown-item" onClick={() => { setPasswordModal(true); setUserMenuOpen(false); }}>
                      <KeyRound size={14} />
                      <span>{isFR ? 'Changer mot de passe' : 'Change password'}</span>
                    </button>
                    <button className="nb-dropdown-item danger" onClick={() => { logout(); setUserMenuOpen(false); }}>
                      <LogOut size={14} />
                      <span>{isFR ? 'Déconnexion' : 'Sign out'}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={onOpenAuth} className="nb-signin-btn">{t('signIn')}</button>
            )}
          </div>
        </div>

        <div className={`nb-mobile-menu${mobileOpen ? ' open' : ''}`}>
          {TABS.map(tab => (
            <button key={tab.id} className={`nb-mobile-item${activeTab === tab.id ? ' active' : ''}`} onClick={() => selectTab(tab.id)}>
              <tab.icon size={15} /><span>{tab.label}</span>{tab.badge > 0 && <span className="nb-count-badge">{tab.badge}</span>}
            </button>
          ))}
        </div>
      </div>

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setPasswordModal(false)}
        onSuccess={(msg) => onToast(msg)}
      />
    </header>
  );
}

export default Navbar;