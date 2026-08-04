import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Sparkles, Users, BookmarkCheck, LayoutDashboard, Kanban, LogOut } from 'lucide-react';

export const Navbar = ({ activeTab, setActiveTab, onOpenAuth, shortlistCount = 0 }) => {
  const { user, logout, token } = useAuth();
  const { lang, toggleLanguage, t } = useLanguage();

  return (
    <header className="sticky top-0 z-40 bg-slate-50/80 backdrop-blur-md py-4">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white border border-slate-200/80 shadow-[0_4px_20px_-10px_rgba(0,64,193,0.02)] px-5 py-3 rounded-2xl flex items-center justify-between">
          
          {/* Brand Logo */}
          <div className="flex items-center space-x-2.5">
            <div className="bg-brand-primary text-white p-2 rounded-xl flex items-center justify-center">
              <Sparkles className="w-4.5 h-4.5 text-brand-light-blue" />
            </div>
            <span className="font-black text-lg tracking-tight text-slate-900 font-jakarta">
              DIGITALIA
            </span>
          </div>

          {/* Navigation Controls */}
          <nav className="flex items-center space-x-1 bg-slate-50 p-1 rounded-xl border border-slate-200/50">
            <button
              onClick={() => setActiveTab('sourcing')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'sourcing'
                  ? 'bg-white text-brand-primary shadow-3xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>{t('sourcingHub')}</span>
            </button>

            <button
              onClick={() => setActiveTab('pipeline')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'pipeline'
                  ? 'bg-white text-brand-primary shadow-3xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>{lang === 'FR' ? 'Pipeline' : 'Pipeline'}</span>
            </button>

            <button
              onClick={() => setActiveTab('shortlist')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'shortlist'
                  ? 'bg-white text-brand-primary shadow-3xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <BookmarkCheck className="w-3.5 h-3.5" />
              <span>{t('shortlists')}</span>
              {shortlistCount > 0 && (
                <span className="bg-brand-primary text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                  {shortlistCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-white text-brand-primary shadow-3xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>{t('dashboard') || (lang === 'FR' ? 'Dashboard' : 'Dashboard')}</span>
            </button>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center space-x-4">
            
            {/* Minimal Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="text-xs font-bold text-slate-400 hover:text-brand-primary cursor-pointer transition-colors"
              title="Switch Language / Changer de langue"
            >
              {lang === 'EN' ? 'EN' : 'FR'}
            </button>

            {/* Profile Avatar & Sign Out */}
            {user ? (
              <div className="flex items-center space-x-2.5">
                <div 
                  className="w-8 h-8 rounded-lg bg-brand-light-blue text-brand-primary flex items-center justify-center font-black text-xs"
                  title={`${user.name} - ${user.role}`}
                >
                  {user.name.charAt(0)}
                </div>
                {token ? (
                  <button
                    onClick={logout}
                    title="Sign Out"
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-all cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={onOpenAuth}
                    className="text-xs font-bold text-brand-primary cursor-pointer"
                  >
                    {t('signIn')}
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="bg-brand-primary hover:bg-brand-deep-blue text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <span>{t('signIn')}</span>
              </button>
            )}

          </div>

        </div>
      </div>
    </header>
  );
};
