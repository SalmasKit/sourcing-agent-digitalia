import React, { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Sparkles, Users, BookmarkCheck, LayoutDashboard, Kanban, LogOut, Globe, NotebookPen } from 'lucide-react';

export function Navbar({ activeTab = 'dashboard', setActiveTab = () => {}, onOpenAuth = () => {}, shortlistCount = 0, notesCount = 0 }) {
  const { user, logout } = useAuth();
  const { lang, toggleLanguage, t } = useLanguage();
  const isFR = lang === 'FR';
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

  return (
    <header className="dg-root dgnv-wrapper">
      <style>{`
        .dg-root {
          --dg-paper: #F6F7F9; --dg-surface: #FFFFFF; --dg-sunken: #EFF1F4;
          --dg-border: #E3E6EB; --dg-border-strong: #CBD2DC;
          --dg-ink-900: #10151F; --dg-ink-700: #38414F; --dg-ink-500: #6B7280; --dg-ink-400: #96A0AC;
          --dg-teal-700: #0A5C68; --dg-teal-600: #0E7C8C; --dg-teal-300: #8CCDD3; --dg-teal-100: #E1F2F3;
          --dg-bronze-700: #8A4B0C; --dg-bronze-600: #B4650F; --dg-bronze-100: #FBEEDD;
          --dg-green-700: #1F6E4A; --dg-green-600: #278F5E; --dg-green-100: #E3F5EC;
          --dg-danger: #B3261E; --dg-danger-bg: #FBEAE9;
          --font-display: 'Space Grotesk', 'Inter', sans-serif;
          --font-body: 'Inter', system-ui, sans-serif;
          --font-mono: 'JetBrains Mono', ui-monospace, monospace;
          font-family: var(--font-body); color: var(--dg-ink-900);
        }
        .dg-display { font-family: var(--font-display); letter-spacing: -0.01em; }
        .dg-mono { font-family: var(--font-mono); }

        .dgnv-wrapper {
          position: sticky; top: 0; z-index: 50; padding: 12px 0;
          background: rgba(246, 247, 249, 0.85); backdrop-filter: blur(12px);
        }
        .dgnv-container {
          max-width: 1200px; margin: 0 auto; padding: 0 24px;
        }
        .dgnv-bar {
          background: var(--dg-surface); border: 1px solid var(--dg-border); border-radius: 18px;
          padding: 8px 16px; display: flex; align-items: center; justify-content: space-between; gap: 16px;
          box-shadow: 0 2px 10px -4px rgba(16,21,31,0.06);
        }

        .dgnv-brand { display: flex; align-items: center; gap: 10px; text-decoration: none; cursor: pointer; }
        .dgnv-logo-icon {
          width: 34px; height: 34px; border-radius: 10px; background: var(--dg-ink-900); color: #fff;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .dgnv-brand-name { font-size: 16px; font-weight: 800; color: var(--dg-ink-900); letter-spacing: -0.02em; }

        .dgnv-nav {
          display: flex; align-items: center; gap: 4px; background: var(--dg-paper); border: 1px solid var(--dg-border);
          border-radius: 13px; padding: 4px;
        }
        .dgnv-nav-item {
          display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700;
          padding: 7px 14px; border-radius: 9px; border: none; background: none; color: var(--dg-ink-500);
          cursor: pointer; transition: color .15s ease, background .15s ease;
        }
        .dgnv-nav-item:hover { color: var(--dg-ink-900); }
        .dgnv-nav-item-active {
          background: var(--dg-surface); color: var(--dg-teal-700); box-shadow: 0 1px 3px rgba(16,21,31,0.06);
        }

        .dgnv-count-badge {
          font-family: var(--font-mono); font-size: 9.5px; font-weight: 700;
          background: var(--dg-teal-700); color: #fff; padding: 1px 6px; border-radius: 999px; margin-left: 2px;
        }

        .dgnv-right { display: flex; align-items: center; gap: 12px; }

        .dgnv-lang-btn {
          display: flex; align-items: center; gap: 4px; font-family: var(--font-mono); font-size: 11px; font-weight: 700;
          background: var(--dg-paper); border: 1px solid var(--dg-border); border-radius: 999px; padding: 5px 12px;
          color: var(--dg-ink-700); cursor: pointer; transition: background .15s ease, border-color .15s ease;
        }
        .dgnv-lang-btn:hover { background: var(--dg-sunken); border-color: var(--dg-border-strong); }

        .dgnv-user-box { display: flex; align-items: center; gap: 10px; padding-left: 12px; border-left: 1px solid var(--dg-border); }
        .dgnv-avatar {
          width: 32px; height: 32px; border-radius: 9px; background: var(--dg-teal-700); color: #fff;
          display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; flex-shrink: 0;
        }
        .dgnv-user-info { display: flex; flex-direction: column; }
        .dgnv-user-name { font-size: 12px; font-weight: 700; color: var(--dg-ink-900); line-height: 1.2; }
        .dgnv-role-badge {
          font-family: var(--font-mono); font-size: 8.5px; font-weight: 700; text-transform: uppercase;
          padding: 1px 5px; border-radius: 4px; margin-top: 2px; display: inline-block;
        }
        .dgnv-role-admin { background: var(--dg-bronze-100); color: var(--dg-bronze-700); border: 1px solid rgba(180,101,15,0.25); }
        .dgnv-role-recruiter { background: var(--dg-teal-100); color: var(--dg-teal-700); border: 1px solid rgba(14,124,140,0.25); }

        .dgnv-logout-btn {
          width: 30px; height: 30px; border-radius: 8px; border: 1px solid var(--dg-border); background: var(--dg-paper);
          color: var(--dg-ink-500); display: flex; align-items: center; justify-content: center; cursor: pointer;
          transition: color .15s ease, background .15s ease, border-color .15s ease;
        }
        .dgnv-logout-btn:hover { color: var(--dg-danger); background: var(--dg-danger-bg); border-color: rgba(179,38,30,0.25); }

        .dgnv-signin-btn {
          font-size: 12px; font-weight: 700; background: var(--dg-ink-900); color: #fff; border: none;
          border-radius: 10px; padding: 8px 16px; cursor: pointer; transition: background .15s ease;
        }
        .dgnv-signin-btn:hover { background: #232C3A; }

        @media (max-width: 768px) {
          .dgnv-nav-text { display: none; }
          .dgnv-user-info { display: none; }
        }
      `}</style>

      <div className="dgnv-container">
        <div className="dgnv-bar">

          {/* Brand Logo */}
          <div className="dgnv-brand" onClick={() => setActiveTab('dashboard')}>
            <div className="dgnv-logo-icon">
              <Sparkles size={16} color="var(--dg-teal-300)" />
            </div>
            <span className="dgnv-brand-name dg-display">DIGITALIA</span>
          </div>

          {/* Nav Tabs */}
          <nav className="dgnv-nav">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={'dgnv-nav-item' + (activeTab === 'dashboard' ? ' dgnv-nav-item-active' : '')}
            >
              <LayoutDashboard size={14} />
              <span className="dgnv-nav-text dg-display">{t('dashboard') || 'Dashboard'}</span>
            </button>

            <button
              onClick={() => setActiveTab('sourcing')}
              className={'dgnv-nav-item' + (activeTab === 'sourcing' ? ' dgnv-nav-item-active' : '')}
            >
              <Users size={14} />
              <span className="dgnv-nav-text dg-display">{t('sourcingHub')}</span>
            </button>

            <button
              onClick={() => setActiveTab('shortlist')}
              className={'dgnv-nav-item' + (activeTab === 'shortlist' ? ' dgnv-nav-item-active' : '')}
            >
              <BookmarkCheck size={14} />
              <span className="dgnv-nav-text dg-display">{t('shortlists')}</span>
              {shortlistCount > 0 && (
                <span className="dgnv-count-badge">{shortlistCount}</span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('pipeline')}
              className={'dgnv-nav-item' + (activeTab === 'pipeline' ? ' dgnv-nav-item-active' : '')}
            >
              <Kanban size={14} />
              <span className="dgnv-nav-text dg-display">{isFR ? 'Pipeline' : 'Pipeline'}</span>
            </button>

            <button
              onClick={() => setActiveTab('notes')}
              className={'dgnv-nav-item' + (activeTab === 'notes' ? ' dgnv-nav-item-active' : '')}
            >
              <NotebookPen size={14} />
              <span className="dgnv-nav-text dg-display">{isFR ? 'Notes' : 'Notes'}</span>
              {notesCount > 0 && (
                <span className="dgnv-count-badge">{notesCount}</span>
              )}
            </button>
          </nav>

          {/* Right Actions */}
          <div className="dgnv-right">
            <button
              onClick={toggleLanguage}
              className="dgnv-lang-btn"
              title="Switch Language / Changer de langue"
            >
              <Globe size={12} color="var(--dg-ink-500)" />
              <span>{lang === 'EN' ? 'EN' : 'FR'}</span>
            </button>

            {user ? (
              <div className="dgnv-user-box">
                <div
                  className="dgnv-avatar dg-display"
                  title={`${user.fullName || user.name} (${user.role})`}
                >
                  {(user.fullName || user.name || 'U').charAt(0).toUpperCase()}
                </div>

                <div className="dgnv-user-info">
                  <span className="dgnv-user-name dg-display">{user.fullName || user.name}</span>
                  <div>
                    {user.role === 'HR_ADMIN' || user.role === 'SUPER_ADMIN' ? (
                      <span className="dgnv-role-badge dgnv-role-admin">
                        {user.role === 'HR_ADMIN' ? 'HR Admin' : 'Super Admin'}
                      </span>
                    ) : (
                      <span className="dgnv-role-badge dgnv-role-recruiter">
                        Recruiter
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={logout}
                  title={isFR ? 'Déconnexion' : 'Sign Out'}
                  className="dgnv-logout-btn"
                >
                  <LogOut size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="dgnv-signin-btn dg-display"
              >
                <span>{t('signIn')}</span>
              </button>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}

export default Navbar;

