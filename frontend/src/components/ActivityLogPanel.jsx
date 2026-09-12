import React, { useEffect, useState } from 'react';
import {
  Clock,
  FileText,
  BookmarkCheck,
  NotebookPen,
  UserPlus,
  ShieldCheck,
  TrendingUp,
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
    labelFR: "A ajouté une note d'évaluation",
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
    labelFR: "A changé d'étape de pipeline",
  },

  RECRUITER_INVITED: {
    icon: UserPlus,
    color: '#0A7E96',
    bg: '#E9F7FA',
    labelEN: 'Invited Team Member',
    labelFR: "A invité un membre d'équipe",
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
    icon: ShieldCheck,
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

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 60) {
    return isFR ? "À l'instant" : 'Just now';
  }

  const diffMin = Math.floor(diffSec / 60);

  if (diffMin < 60) {
    return isFR
      ? `Il y a ${diffMin} min`
      : `${diffMin}m ago`;
  }

  const diffHours = Math.floor(diffMin / 60);

  if (diffHours < 24) {
    return isFR
      ? `Il y a ${diffHours} h`
      : `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);

  if (diffDays < 7) {
    return isFR
      ? `Il y a ${diffDays} j`
      : `${diffDays}d ago`;
  }

  return date.toLocaleDateString(
    isFR ? 'fr-FR' : 'en-US',
    {
      month: 'short',
      day: 'numeric',
    }
  );
}

export function ActivityLogPanel({
  activities: propActivities,
  maxItems = 50,
  title,
  showFilter = true,
  filterType: externalFilterType = null,
}) {
  const { lang } = useLanguage();

  const isFR = lang === 'FR';

  const [activities, setActivities] = useState(
    propActivities || []
  );

  const [internalFilterType, setInternalFilterType] =
    useState('ALL');

  const [loading, setLoading] = useState(
    !propActivities
  );

  const activeFilter =
    externalFilterType || internalFilterType;

  useEffect(() => {
    if (propActivities) {
      setActivities(propActivities);
      setLoading(false);
    } else {
      fetchActivities();
    }
  }, [propActivities]);

  const fetchActivities = async () => {
    try {
      setLoading(true);

      const data = await getTeamActivitiesApi(50);

      setActivities(
        Array.isArray(data) ? data : []
      );
    } catch (err) {
      console.warn(
        'Could not load activity logs:',
        err
      );

      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filter) => {
    setInternalFilterType(filter);
  };

  const filtered = activities
    .filter((activity) => {
      const actionType =
        activity?.actionType || '';

      if (activeFilter === 'ALL') {
        return true;
      }

      if (activeFilter === 'ROLES') {
        return actionType.startsWith('ROLE_');
      }

      if (activeFilter === 'SHORTLIST') {
        return actionType.includes('SHORTLIST');
      }

      if (activeFilter === 'NOTES') {
        return actionType.includes('NOTE');
      }

      if (activeFilter === 'TEAM') {
        return (
          actionType.includes('MEMBER') ||
          actionType.includes('INVITED') ||
          actionType.includes('PRIVILEGES')
        );
      }

      return true;
    })
    .slice(0, maxItems);

  return (
    <div className="alp-card">
      <style>{`
        .alp-card {
          width: 100%;
          background: #FFFFFF;
          border: 0;
          border-radius: 0;
          overflow: hidden;
          box-shadow: none;
          font-family: 'Inter', system-ui, sans-serif;
        }

        /*
         * HEADER
         * Title + filters are on the same top row.
         * The activity list below is the only scrollable/content area.
         */
        .alp-head {
          width: 100%;
          min-height: 62px;

          padding: 12px 17px;

          background: #FBFAF7;
          border-bottom: 1px solid #E4E1D9;

          display: flex;
          align-items: center;
          justify-content: flex-start;

          gap: 18px;

          flex-wrap: nowrap;
        }

        .alp-title-box {
          display: flex;
          align-items: center;

          gap: 10px;

          flex: 0 0 auto;
          min-width: 0;
        }

        .alp-icon-badge {
          width: 30px;
          height: 30px;

          border-radius: 8px;

          background: #E9F7FA;
          color: #0A7E96;

          display: flex;
          align-items: center;
          justify-content: center;

          flex-shrink: 0;
        }

        .alp-title-content {
          min-width: 0;
        }

        .alp-title {
          font-family: 'Space Grotesk',
            system-ui,
            sans-serif;

          font-size: 15px;
          font-weight: 700;

          color: #12151B;

          line-height: 1.2;

          white-space: nowrap;
        }

        .alp-sub {
          margin-top: 3px;

          font-size: 11px;
          font-weight: 400;

          color: #717680;

          line-height: 1.25;

          white-space: nowrap;
        }

        /*
         * FILTERS
         * Immediately next to the title.
         */
        .alp-filters {
          display: flex;
          align-items: center;

          gap: 3px;

          padding: 3px;

          background: #F0EFEA;

          border-radius: 9px;

          flex: 0 0 auto;
        }

        .alp-filter-btn {
          border: none;
          outline: none;

          background: transparent;

          padding: 6px 10px;

          border-radius: 7px;

          font-family: 'Inter',
            system-ui,
            sans-serif;

          font-size: 11px;
          font-weight: 600;

          line-height: 1;

          color: #717680;

          cursor: pointer;

          white-space: nowrap;

          transition:
            background 0.15s ease,
            color 0.15s ease,
            box-shadow 0.15s ease,
            transform 0.15s ease;
        }

        .alp-filter-btn:hover {
          background: rgba(
            255,
            255,
            255,
            0.7
          );

          color: #12151B;
        }

        .alp-filter-btn:active {
          transform: translateY(1px);
        }

        .alp-filter-btn.active {
          background: #FFFFFF;

          color: #12151B;

          font-weight: 700;

          box-shadow:
            0 1px 3px
              rgba(0, 0, 0, 0.07);
        }

        /*
         * ACTIVITY LIST
         */
        .alp-list {
          padding: 8px 12px;
        }

        .alp-item {
          display: flex;
          align-items: flex-start;

          gap: 12px;

          padding: 12px 10px;

          border-bottom: 1px solid #F6F5F1;

          border-radius: 12px;

          transition:
            background 0.15s ease;
        }

        .alp-item:last-child {
          border-bottom: none;
        }

        .alp-item:hover {
          background: #FAFAF7;
        }

        .alp-actor-avatar {
          width: 32px;
          height: 32px;

          border-radius: 9px;

          background: #12151B;
          color: #FFFFFF;

          display: flex;
          align-items: center;
          justify-content: center;

          flex-shrink: 0;

          margin-top: 2px;

          font-size: 12px;
          font-weight: 800;
        }

        .alp-actor-avatar.admin {
          background: #0A7E96;
        }

        .alp-item-content {
          flex: 1;
          min-width: 0;
        }

        .alp-actor-line {
          display: flex;
          align-items: center;

          gap: 6px;

          flex-wrap: wrap;

          margin-bottom: 3px;
        }

        .alp-actor-name {
          font-size: 12.5px;
          font-weight: 700;

          color: #12151B;
        }

        .alp-role-tag {
          font-family:
            'JetBrains Mono',
            monospace;

          font-size: 9px;
          font-weight: 700;

          padding: 1px 5px;

          border-radius: 4px;

          text-transform: uppercase;
        }

        .alp-role-tag.admin {
          background: #FFF3E0;
          color: #9A5B0A;
        }

        .alp-role-tag.recruiter {
          background: #E9F7FA;
          color: #0A7E96;
        }

        .alp-action-text {
          font-size: 12px;

          color: #3A3D44;

          line-height: 1.4;
        }

        .alp-target-title {
          font-weight: 600;

          color: #12151B;
        }

        .alp-details {
          display: inline-block;

          max-width: 100%;

          margin-top: 3px;

          padding: 4px 8px;

          background: #F8F8F6;

          border-radius: 6px;

          font-size: 11px;

          color: #717680;

          word-break: break-word;
        }

        .alp-time {
          flex-shrink: 0;

          margin-top: 2px;

          font-family:
            'JetBrains Mono',
            monospace;

          font-size: 10px;

          color: #9B9C9E;

          white-space: nowrap;
        }

        .alp-empty {
          padding: 32px 20px;

          text-align: center;

          color: #717680;

          font-size: 12.5px;
        }

        /*
         * TABLET / SMALL SCREEN
         */
        @media (max-width: 900px) {
          .alp-head {
            gap: 12px;
          }

          .alp-filter-btn {
            padding-left: 8px;
            padding-right: 8px;
          }
        }

        /*
         * MOBILE
         */
        @media (max-width: 760px) {
          .alp-head {
            align-items: flex-start;

            flex-direction: column;

            gap: 10px;

            padding: 12px;
          }

          .alp-title-box {
            width: 100%;
          }

          .alp-filters {
            width: 100%;

            overflow-x: auto;

            justify-content: flex-start;
          }

          .alp-filter-btn {
            flex-shrink: 0;
          }

          .alp-sub {
            white-space: normal;
          }
        }

        @media (max-width: 480px) {
          .alp-list {
            padding: 6px 8px;
          }

          .alp-item {
            gap: 9px;

            padding: 10px 7px;
          }

          .alp-title {
            font-size: 14px;
          }

          .alp-sub {
            font-size: 10.5px;
          }

          .alp-time {
            font-size: 9px;
          }
        }
      `}</style>

      {showFilter && (
        <div className="alp-head">

          {/* SINGLE TITLE */}
          <div className="alp-title-box">

            <div className="alp-icon-badge">
              <Clock size={16} />
            </div>

            <div className="alp-title-content">

              <div className="alp-title">
                {title ||
                  (isFR
                    ? "Journal d'activité de l'équipe"
                    : 'Team Activity & Audit Feed')}
              </div>

              <div className="alp-sub">
                {isFR
                  ? "Historique des actions et de l'activité de votre équipe"
                  : 'History of actions and activity across your team'}
              </div>

            </div>
          </div>

          {/* FILTERS NEXT TO TITLE */}
          <div className="alp-filters">

            <button
              type="button"
              className={`alp-filter-btn ${activeFilter === 'ALL'
                  ? 'active'
                  : ''
                }`}
              onClick={() =>
                handleFilterChange('ALL')
              }
            >
              {isFR ? 'Tout' : 'All'}
            </button>

            <button
              type="button"
              className={`alp-filter-btn ${activeFilter === 'ROLES'
                  ? 'active'
                  : ''
                }`}
              onClick={() =>
                handleFilterChange('ROLES')
              }
            >
              {isFR ? 'Postes' : 'Roles'}
            </button>

            <button
              type="button"
              className={`alp-filter-btn ${activeFilter === 'SHORTLIST'
                  ? 'active'
                  : ''
                }`}
              onClick={() =>
                handleFilterChange('SHORTLIST')
              }
            >
              {isFR
                ? 'Sélection'
                : 'Shortlists'}
            </button>

            <button
              type="button"
              className={`alp-filter-btn ${activeFilter === 'NOTES'
                  ? 'active'
                  : ''
                }`}
              onClick={() =>
                handleFilterChange('NOTES')
              }
            >
              {isFR ? 'Notes' : 'Notes'}
            </button>

            <button
              type="button"
              className={`alp-filter-btn ${activeFilter === 'TEAM'
                  ? 'active'
                  : ''
                }`}
              onClick={() =>
                handleFilterChange('TEAM')
              }
            >
              {isFR ? 'Équipe' : 'Team'}
            </button>

          </div>
        </div>
      )}

      {/* ACTIVITY CONTENT */}
      <div className="alp-list">

        {loading ? (
          <div className="alp-empty">
            {isFR
              ? 'Chargement…'
              : 'Loading…'}
          </div>
        ) : filtered.length === 0 ? (
          <div className="alp-empty">
            {isFR
              ? 'Aucune activité enregistrée pour le moment.'
              : 'No team activity recorded yet.'}
          </div>
        ) : (
          filtered.map((act) => {
            const meta =
              ACTION_META[
              act.actionType
              ] || {
                icon: Clock,
                color: '#0A7E96',
                bg: '#E9F7FA',
                labelEN:
                  act.actionType ||
                  'Activity',
                labelFR:
                  act.actionType ||
                  'Activité',
              };

            const Icon = meta.icon;

            const isAdmin =
              act.actorRole ===
              'HR_ADMIN' ||
              act.actorRole ===
              'SUPER_ADMIN';

            const actorName =
              act.actorName || 'User';

            return (
              <div
                key={
                  act.id ||
                  `${act.actionType}-${act.createdAt}-${actorName}`
                }
                className="alp-item"
              >

                <div
                  className={`alp-actor-avatar ${isAdmin
                      ? 'admin'
                      : ''
                    }`}
                >
                  {actorName
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div className="alp-item-content">

                  <div className="alp-actor-line">

                    <span className="alp-actor-name">
                      {actorName}
                    </span>

                    <span
                      className={`alp-role-tag ${isAdmin
                          ? 'admin'
                          : 'recruiter'
                        }`}
                    >
                      {isAdmin
                        ? 'Admin'
                        : 'Recruiter'}
                    </span>

                    <span
                      style={{
                        fontSize: '11px',
                        color: '#9B9C9E',
                      }}
                    >
                      •
                    </span>

                    <span
                      style={{
                        display:
                          'inline-flex',
                        alignItems:
                          'center',
                        gap: '4px',
                        fontSize:
                          '11px',
                        fontWeight:
                          600,
                        color:
                          meta.color,
                      }}
                    >
                      <Icon size={12} />

                      {isFR
                        ? meta.labelFR
                        : meta.labelEN}
                    </span>

                  </div>

                  {act.targetTitle && (
                    <div className="alp-action-text">
                      <span className="alp-target-title">
                        {act.targetTitle}
                      </span>
                    </div>
                  )}

                  {act.details && (
                    <div className="alp-details">
                      {act.details}
                    </div>
                  )}

                </div>

                <div className="alp-time">
                  {formatRelativeTime(
                    act.createdAt,
                    isFR
                  )}
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