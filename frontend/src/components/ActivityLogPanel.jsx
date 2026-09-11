import React, { useState, useEffect } from 'react';
import {
  Clock, FileText, CheckCircle2, BookmarkCheck, NotebookPen,
  UserPlus, ShieldCheck, Sparkles, Filter, RefreshCw, ChevronRight,
  TrendingUp, Users, ArrowUpRight
} from 'lucide-react';
import { getTeamActivitiesApi } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

const ACTION_META = {
  ROLE_CREATED: {
    icon: FileText,
    color: '#0A7E96',
    bg: '#E9F7FA',
    labelEN: 'Created Role Description',
    labelFR: 'A créé une fiche de poste',
  },
  ROLE_UPDATED: {
    icon: FileText,
    color: '#0A7E96',
    bg: '#E9F7FA',
    labelEN: 'Updated Role',
    labelFR: 'A modifié une fiche de poste',
  },
  ROLE_DELETED: {
    icon: FileText,
    color: '#DC2626',
    bg: '#FEF2F2',
    labelEN: 'Deleted Role',
    labelFR: 'A supprimé une fiche de poste',
  },
  CANDIDATE_SHORTLISTED: {
    icon: BookmarkCheck,
    color: '#10B981',
    bg: '#ECFDF5',
    labelEN: 'Shortlisted Candidate',
    labelFR: 'A sélectionné un candidat',
  },
  CANDIDATE_UNSHORTLISTED: {
    icon: BookmarkCheck,
    color: '#6B7280',
    bg: '#F3F4F6',
    labelEN: 'Removed from Shortlist',
    labelFR: 'A retiré de la sélection',
  },
  NOTE_ADDED: {
    icon: NotebookPen,
    color: '#8B5CF6',
    bg: '#F5F3FF',
    labelEN: 'Added Evaluation Note',
    labelFR: 'A ajouté une note d\'évaluation',
  },
  NOTE_DELETED: {
    icon: NotebookPen,
    color: '#DC2626',
    bg: '#FEF2F2',
    labelEN: 'Deleted Note',
    labelFR: 'A supprimé une note',
  },
  STAGE_CHANGED: {
    icon: TrendingUp,
    color: '#F59E0B',
    bg: '#FFFBEB',
    labelEN: 'Moved Pipeline Stage',
    labelFR: 'A changé d\'étape de pipeline',
  },
  RECRUITER_INVITED: {
    icon: UserPlus,
    color: '#0A7E96',
    bg: '#E9F7FA',
    labelEN: 'Invited Team Member',
    labelFR: 'A invité un membre d\'équipe',
  },
  PRIVILEGES_UPDATED: {
    icon: ShieldCheck,
    color: '#9A5B0A',
    bg: '#FFF3E0',
    labelEN: 'Updated Member Privileges',
    labelFR: 'A modifié les privilèges',
  },
  MEMBER_DISABLED: {
    icon: ShieldCheck,
    color: '#DC2626',
    bg: '#FEF2F2',
    labelEN: 'Disabled Team Member',
    labelFR: 'A désactivé un compte',
  },
  MEMBER_ENABLED: {
    icon: ShieldCheck,
    color: '#10B981',
    bg: '#ECFDF5',
    labelEN: 'Enabled Team Member',
    labelFR: 'A activé un compte',
  },
  MEMBER_REMOVED: {
    icon: Users,
    color: '#DC2626',
    bg: '#FEF2F2',
    labelEN: 'Removed Team Member',
    labelFR: 'A retiré un membre',
  },
};

function formatRelativeTime(dateString, isFR) {
  if (!dateString) return '';
  const now = new Date();
  const date = new Date(dateString);
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 60) return isFR ? 'À l\'instant' : 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return isFR ? `Il y a ${diffMin} min` : `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return isFR ? `Il y a ${diffHours} h` : `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return isFR ? `Il y a ${diffDays} j` : `${diffDays}d ago`;

  return date.toLocaleDateString(isFR ? 'fr-FR' : 'en-US', {
    month: 'short', day: 'numeric'
  });
}

export function ActivityLogPanel({ activities: propActivities, maxItems = 10, title, showFilter = true }) {
  const { lang } = useLanguage();
  const isFR = lang === 'FR';

  const [activities, setActivities] = useState(propActivities || []);
  const [filterType, setFilterType] = useState('ALL');
  const [loading, setLoading]       = useState(!propActivities);

  useEffect(() => {
    if (propActivities) {
      setActivities(propActivities);
    } else {
      fetchActivities();
    }
  }, [propActivities]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const data = await getTeamActivitiesApi(50);
      setActivities(data);
    } catch (err) {
      console.warn('Could not load activity logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = activities.filter(a => {
    if (filterType === 'ALL') return true;
    if (filterType === 'ROLES') return a.actionType.startsWith('ROLE_');
    if (filterType === 'SHORTLIST') return a.actionType.includes('SHORTLIST');
    if (filterType === 'NOTES') return a.actionType.includes('NOTE');
    if (filterType === 'TEAM') return a.actionType.includes('MEMBER') || a.actionType.includes('INVITED') || a.actionType.includes('PRIVILEGES');
    return true;
  }).slice(0, maxItems);

  return (
    <div className="alp-card">
      <style>{`
        .alp-card {
          background: #FFFFFF; border: 1px solid #E4E1D9;
          border-radius: 18px; overflow: hidden;
          box-shadow: 0 4px 16px -4px rgba(18,21,27,0.06);
          font-family: 'Inter', system-ui, sans-serif;
        }
        .alp-head {
          padding: 18px 22px 14px; background: #FBFAF7; border-bottom: 1px solid #E4E1D9;
          display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;
        }
        .alp-title-box { display: flex; align-items: center; gap: 10px; }
        .alp-icon-badge {
          width: 30px; height: 30px; border-radius: 8px;
          background: #E9F7FA; color: #0A7E96; display: flex;
          align-items: center; justify-content: center;
        }
        .alp-title {
          font-family: 'Space Grotesk', sans-serif; font-size: 15px; font-weight: 700; color: #12151B;
        }
        .alp-sub { font-size: 11.5px; color: #717680; }

        .alp-filters {
          display: flex; align-items: center; gap: 4px; background: #F0EFEA;
          padding: 3px; border-radius: 9px;
        }
        .alp-filter-btn {
          border: none; background: none; font-size: 11px; font-weight: 600;
          padding: 4px 9px; border-radius: 7px; color: #717680; cursor: pointer;
          transition: all .15s ease;
        }
        .alp-filter-btn.active {
          background: #fff; color: #12151B; box-shadow: 0 1px 3px rgba(0,0,0,0.06); font-weight: 700;
        }

        .alp-list { padding: 8px 12px; }
        .alp-item {
          display: flex; align-items: flex-start; gap: 12px;
          padding: 12px 10px; border-radius: 12px; transition: background .15s;
          border-bottom: 1px solid #F6F5F1;
        }
        .alp-item:last-child { border-bottom: none; }
        .alp-item:hover { background: #FAFAF7; }

        .alp-actor-avatar {
          width: 32px; height: 32px; border-radius: 9px;
          background: #12151B; color: #fff; display: flex; align-items: center;
          justify-content: center; font-size: 12px; font-weight: 800;
          flex-shrink: 0; margin-top: 2px;
        }
        .alp-actor-avatar.admin { background: #0A7E96; }

        .alp-item-content { flex: 1; min-width: 0; }
        .alp-actor-line {
          display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 3px;
        }
        .alp-actor-name { font-size: 12.5px; font-weight: 700; color: #12151B; }
        .alp-role-tag {
          font-family: 'JetBrains Mono', monospace; font-size: 9px; font-weight: 700;
          padding: 1px 5px; border-radius: 4px; text-transform: uppercase;
        }
        .alp-role-tag.admin { background: #FFF3E0; color: #9A5B0A; }
        .alp-role-tag.recruiter { background: #E9F7FA; color: #0A7E96; }

        .alp-action-text {
          font-size: 12px; color: #3A3D44; line-height: 1.4;
        }
        .alp-target-title { font-weight: 600; color: #12151B; }
        .alp-details {
          font-size: 11px; color: #717680; margin-top: 3px;
          background: #F8F8F6; padding: 4px 8px; border-radius: 6px; display: inline-block;
        }

        .alp-time {
          font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #9B9C9E;
          flex-shrink: 0; margin-top: 2px;
        }
        .alp-empty {
          padding: 32px 20px; text-align: center; color: #717680; font-size: 12.5px;
        }
      `}</style>

      <div className="alp-head">
        <div className="alp-title-box">
          <div className="alp-icon-badge"><Clock size={16} /></div>
          <div>
            <div className="alp-title">{title || (isFR ? 'Journal d\'activité de l\'équipe' : 'Team Activity & Audit Feed')}</div>
            <div className="alp-sub">{isFR ? 'Suivi en temps réel des actions des recruteurs' : 'Live log of who created roles, shortlisted candidates & wrote notes'}</div>
          </div>
        </div>

        {showFilter && (
          <div className="alp-filters">
            <button className={`alp-filter-btn ${filterType === 'ALL' ? 'active' : ''}`} onClick={() => setFilterType('ALL')}>
              {isFR ? 'Tout' : 'All'}
            </button>
            <button className={`alp-filter-btn ${filterType === 'ROLES' ? 'active' : ''}`} onClick={() => setFilterType('ROLES')}>
              {isFR ? 'Postes' : 'Roles'}
            </button>
            <button className={`alp-filter-btn ${filterType === 'SHORTLIST' ? 'active' : ''}`} onClick={() => setFilterType('SHORTLIST')}>
              {isFR ? 'Sélection' : 'Shortlists'}
            </button>
            <button className={`alp-filter-btn ${filterType === 'NOTES' ? 'active' : ''}`} onClick={() => setFilterType('NOTES')}>
              {isFR ? 'Notes' : 'Notes'}
            </button>
            <button className={`alp-filter-btn ${filterType === 'TEAM' ? 'active' : ''}`} onClick={() => setFilterType('TEAM')}>
              {isFR ? 'Équipe' : 'Team'}
            </button>
          </div>
        )}
      </div>

      <div className="alp-list">
        {filtered.length === 0 ? (
          <div className="alp-empty">
            {isFR ? 'Aucune activité enregistrée pour le moment.' : 'No team activity recorded yet.'}
          </div>
        ) : (
          filtered.map(act => {
            const meta = ACTION_META[act.actionType] || {
              icon: Clock, color: '#0A7E96', bg: '#E9F7FA',
              labelEN: act.actionType, labelFR: act.actionType
            };
            const Icon = meta.icon;
            const isAdmin = act.actorRole === 'HR_ADMIN' || act.actorRole === 'SUPER_ADMIN';

            return (
              <div key={act.id} className="alp-item">
                <div className={`alp-actor-avatar ${isAdmin ? 'admin' : ''}`}>
                  {(act.actorName || 'U').charAt(0).toUpperCase()}
                </div>

                <div className="alp-item-content">
                  <div className="alp-actor-line">
                    <span className="alp-actor-name">{act.actorName}</span>
                    <span className={`alp-role-tag ${isAdmin ? 'admin' : 'recruiter'}`}>
                      {isAdmin ? 'Admin' : 'Recruiter'}
                    </span>
                    <span style={{ fontSize: '11px', color: '#9B9C9E' }}>•</span>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: meta.color }}>
                      {isFR ? meta.labelFR : meta.labelEN}
                    </span>
                  </div>

                  <div className="alp-action-text">
                    {act.targetTitle && <span className="alp-target-title">{act.targetTitle} </span>}
                  </div>

                  {act.details && (
                    <div className="alp-details">{act.details}</div>
                  )}
                </div>

                <div className="alp-time">
                  {formatRelativeTime(act.createdAt, isFR)}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default ActivityLogPanel;
