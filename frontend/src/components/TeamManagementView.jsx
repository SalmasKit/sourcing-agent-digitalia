import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Check,
  X,
  Mail,
  Trash2,
  Copy,
  CheckCircle2,
  Search,
  UserCheck,
  Clock,
  ArrowRight,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import {
  getTeamMembersApi,
  getPendingInvitationsApi,
  inviteRecruiterApi,
  updateMemberPrivilegesApi,
  toggleMemberStatusApi,
  removeTeamMemberApi,
  logActivityApi,
  cancelInvitationApi,
} from '../services/api';

import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useConfirm } from '../context/ConfirmDialogContext';

/* ---------------------------------------------------------------------- */
/* PRIVILEGES                                                             */
/* ---------------------------------------------------------------------- */

const PRIVILEGE_DEFINITIONS = [
  {
    id: 'create_roles',
    labelEN: 'Create & Edit Roles',
    labelFR: 'Créer et modifier les postes',
    descEN: 'Can add, modify, and delete technical role descriptions.',
    descFR: 'Peut ajouter, modifier et supprimer des fiches de poste.',
    icon: Sparkles,
  },
  {
    id: 'shortlist_candidates',
    labelEN: 'Shortlist Candidates',
    labelFR: 'Sélectionner des candidats',
    descEN: 'Can add/remove profiles to the team shortlist and pipeline.',
    descFR: 'Peut ajouter ou retirer des profils de la sélection et du pipeline.',
    icon: CheckCircle2,
  },
  {
    id: 'manage_notes',
    labelEN: 'Recruiter Notes',
    labelFR: 'Notes de recrutement',
    descEN: 'Can write, edit, and delete candidate screening evaluations.',
    descFR: 'Peut rédiger, modifier et supprimer des notes d’évaluation.',
    icon: Clock,
  },
  {
    id: 'source_candidates',
    labelEN: 'AI Sourcing & Search',
    labelFR: 'Sourcing IA & Recherche',
    descEN: 'Can run autonomous agent web scans and talent pool queries.',
    descFR: 'Peut lancer des recherches web IA et explorer le vivier de talents.',
    icon: Search,
  },
  {
    id: 'export_data',
    labelEN: 'Outreach & Export',
    labelFR: 'Contact & Exportation',
    descEN: 'Can generate AI outreach sequences and export talent dossiers.',
    descFR: 'Peut générer des messages d’approche et exporter les dossiers.',
    icon: ExternalLink,
  },
];

/* ---------------------------------------------------------------------- */
/* STEPS                                                                  */
/* ---------------------------------------------------------------------- */

const STEP_LABELS_EN = ['Role & Details', 'Privileges'];
const STEP_LABELS_FR = ['Rôle & détails', 'Privilèges'];

/* ---------------------------------------------------------------------- */
/* COMPONENT                                                              */
/* ---------------------------------------------------------------------- */

export function TeamManagementView({ onNavigateToDashboard = () => { } }) {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const { confirm, showAlert } = useConfirm();

  const isFR = lang === 'FR';
  const STEP_LABELS = isFR ? STEP_LABELS_FR : STEP_LABELS_EN;

  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [noTeamAccess, setNoTeamAccess] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [toast, setToast] = useState(null);

  /* ------------------------------------------------------------------ */
  /* Invite wizard state                                                 */
  /* ------------------------------------------------------------------ */

  const [step, setStep] = useState(0);
  const [emailErr, setEmailErr] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('RECRUITER');

  const [invitePrivileges, setInvitePrivileges] = useState([
    'shortlist_candidates',
    'manage_notes',
    'source_candidates',
  ]);

  const [submittingInvite, setSubmittingInvite] = useState(false);
  const [inviteSuccessData, setInviteSuccessData] = useState(null);
  const [copiedToken, setCopiedToken] = useState(false);

  /* ------------------------------------------------------------------ */
  /* Helpers                                                             */
  /* ------------------------------------------------------------------ */

  const triggerToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const getRoleLabel = (role) => {
    if (role === 'HR_ADMIN') {
      return isFR ? 'Admin RH' : 'HR Admin';
    }

    return isFR ? 'Recruteur' : 'Recruiter';
  };

  const getRoleLabelWithAdmin = (role) => {
    if (role === 'HR_ADMIN') {
      return isFR ? 'Admin RH (Co-Admin)' : 'HR Admin (Co-Admin)';
    }

    return isFR ? 'Recruteur' : 'Recruiter';
  };

  /* ------------------------------------------------------------------ */
  /* Load team data                                                      */
  /* ------------------------------------------------------------------ */

  const loadTeamData = async () => {
    try {
      setLoading(true);

      const [membersData, invitesData] = await Promise.all([
        getTeamMembersApi(),
        getPendingInvitationsApi(),
      ]);

      setMembers(membersData || []);
      setInvitations(invitesData || []);
    } catch (err) {
      console.error('Failed to load team data:', err);

      if (err.response?.status === 403 || err.message?.includes('team')) {
        setNoTeamAccess(true);
      } else {
        triggerToast(
          isFR
            ? 'Impossible de charger les données de l\'équipe'
            : 'Failed to load team data'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeamData();
  }, []);

  /* ------------------------------------------------------------------ */
  /* Invite form                                                         */
  /* ------------------------------------------------------------------ */

  const resetInviteForm = () => {
    setStep(0);
    setEmailErr(false);
    setInviteEmail('');
    setInviteName('');
    setInviteRole('RECRUITER');
    setInvitePrivileges([
      'shortlist_candidates',
      'manage_notes',
      'source_candidates',
    ]);
    setInviteSuccessData(null);
    setCopiedToken(false);
  };

  const openInviteModal = () => {
    resetInviteForm();
    setIsInviteModalOpen(true);
  };

  const closeInviteModal = () => {
    setIsInviteModalOpen(false);
  };

  const handleSelectInviteRole = (role) => {
    setInviteRole(role);

    if (role === 'HR_ADMIN') {
      setInvitePrivileges([
        'create_roles',
        'shortlist_candidates',
        'manage_notes',
        'source_candidates',
        'export_data',
      ]);
    } else {
      setInvitePrivileges([
        'shortlist_candidates',
        'manage_notes',
        'source_candidates',
      ]);
    }
  };

  const handleTogglePrivilegeForInvite = (privId) => {
    setInvitePrivileges((prev) =>
      prev.includes(privId)
        ? prev.filter((p) => p !== privId)
        : [...prev, privId]
    );
  };

  /* ------------------------------------------------------------------ */
  /* Wizard navigation                                                   */
  /* ------------------------------------------------------------------ */

  const goNext = () => {
    if (step === 0 && !inviteEmail.trim()) {
      setEmailErr(true);
      return;
    }

    setStep((s) => Math.min(s + 1, STEP_LABELS.length - 1));
  };

  const goToStep = (i) => {
    if (i > step && step === 0 && !inviteEmail.trim()) {
      setEmailErr(true);
      return;
    }

    setStep(i);
  };

  /* ------------------------------------------------------------------ */
  /* Send invitation                                                     */
  /* ------------------------------------------------------------------ */

  const handleSendInvite = async (e) => {
    if (e?.preventDefault) {
      e.preventDefault();
    }

    if (!inviteEmail.trim()) {
      setStep(0);
      setEmailErr(true);
      return;
    }

    const confirmed = await confirm({
      title: isFR ? "Envoyer l’invitation ?" : 'Send Invitation?',
      message: isFR
        ? `Êtes-vous sûr de vouloir inviter ${inviteName || inviteEmail
        } en tant que ${getRoleLabel(inviteRole)} ?`
        : `Are you sure you want to invite ${inviteName || inviteEmail
        } as ${getRoleLabel(inviteRole)}?`,
      itemBadge: inviteEmail,
      confirmText: isFR ? 'Envoyer' : 'Send',
      cancelText: isFR ? 'Annuler' : 'Cancel',
      type: 'info',
    });

    if (!confirmed) return;

    try {
      setSubmittingInvite(true);

      const inv = await inviteRecruiterApi(
        inviteEmail,
        inviteName,
        invitePrivileges,
        inviteRole
      );

      await logActivityApi(
        inviteRole === 'HR_ADMIN'
          ? 'HR_ADMIN_INVITED'
          : 'RECRUITER_INVITED',
        inviteEmail,
        `Invited as ${inviteRole === 'HR_ADMIN' ? 'HR Admin' : 'Recruiter'
        } with ${invitePrivileges.length} privileges`
      );

      setInviteSuccessData(inv);

      await loadTeamData();

      triggerToast(
        isFR
          ? `Invitation envoyée à ${inviteEmail}`
          : `Invitation sent to ${inviteEmail}`
      );
    } catch (err) {
      triggerToast(
        err.message ||
        (isFR
          ? 'Échec de l’envoi de l’invitation'
          : 'Failed to send invitation')
      );
    } finally {
      setSubmittingInvite(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /* Member privilege management                                         */
  /* ------------------------------------------------------------------ */

  const handleToggleMemberPrivilege = async (member, privId) => {
    const currentPrivs = member.privileges || [];

    const isAdding = !currentPrivs.includes(privId);

    const updated = isAdding
      ? [...currentPrivs, privId]
      : currentPrivs.filter((p) => p !== privId);

    const memberName = member.fullName || member.email;

    const privDef = PRIVILEGE_DEFINITIONS.find(
      (p) => p.id === privId
    );

    const privName = privDef
      ? isFR
        ? privDef.labelFR
        : privDef.labelEN
      : privId;

    const confirmed = await confirm({
      title: isFR
        ? 'Modifier les privilèges ?'
        : 'Update Privileges?',
      message: isFR
        ? `Êtes-vous sûr de vouloir ${isAdding ? 'ajouter' : 'retirer'
        } le privilège « ${privName} » pour ${memberName} ?`
        : `Are you sure you want to ${isAdding ? 'add' : 'remove'
        } the "${privName}" privilege for ${memberName}?`,
      itemBadge: memberName,
      confirmText: isFR ? 'Modifier' : 'Update',
      cancelText: isFR ? 'Annuler' : 'Cancel',
      type: 'info',
    });

    if (!confirmed) return;

    try {
      await updateMemberPrivilegesApi(member.id, updated);

      setMembers((prev) =>
        prev.map((m) =>
          m.id === member.id
            ? { ...m, privileges: updated }
            : m
        )
      );

      await logActivityApi(
        'PRIVILEGES_UPDATED',
        member.fullName || member.email,
        `Updated privileges: ${updated.join(', ')}`
      );

      triggerToast(
        isFR
          ? 'Privilèges mis à jour'
          : 'Privileges updated'
      );
    } catch (err) {
      triggerToast(
        isFR
          ? 'Impossible de mettre à jour les privilèges'
          : 'Failed to update privileges'
      );
    }
  };

  /* ------------------------------------------------------------------ */
  /* Member status                                                        */
  /* ------------------------------------------------------------------ */

  const handleToggleStatus = async (member) => {
    const isDisabling = member.enabled;
    const memberName = member.fullName || member.email;

    if (isDisabling) {
      const confirmed = await confirm({
        title: isFR
          ? 'Désactiver le compte ?'
          : 'Disable User Account?',
        message: isFR
          ? `Voulez-vous suspendre l’accès de ${memberName} ? Ce membre ne pourra plus se connecter jusqu’à sa réactivation.`
          : `Are you sure you want to suspend access for ${memberName}? They will not be able to log in until re-enabled.`,
        itemBadge: `${memberName} (${getRoleLabel(member.role)})`,
        confirmText: isFR
          ? 'Suspendre l’accès'
          : 'Disable Account',
        cancelText: isFR ? 'Annuler' : 'Cancel',
        type: 'warning',
      });

      if (!confirmed) return;
    }

    try {
      await toggleMemberStatusApi(member.id);

      setMembers((prev) =>
        prev.map((m) =>
          m.id === member.id
            ? { ...m, enabled: !m.enabled }
            : m
        )
      );

      await logActivityApi(
        member.enabled
          ? 'MEMBER_DISABLED'
          : 'MEMBER_ENABLED',
        member.fullName || member.email,
        'Toggled account access status'
      );

      triggerToast(
        isFR
          ? 'Statut du compte modifié'
          : 'Account status updated'
      );
    } catch (err) {
      triggerToast(
        isFR
          ? 'Impossible de modifier le statut du compte'
          : 'Failed to update account status'
      );
    }
  };

  /* ------------------------------------------------------------------ */
  /* Remove member                                                        */
  /* ------------------------------------------------------------------ */

  const handleRemoveMember = async (member) => {
    const memberName = member.fullName || member.email;

    const confirmed = await confirm({
      title: isFR
        ? 'Retirer de l’équipe ?'
        : 'Remove Team Member?',
      message: isFR
        ? `Êtes-vous sûr de vouloir retirer ${memberName} de l’équipe ? Ce compte sera définitivement révoqué de votre espace.`
        : `Are you sure you want to remove ${memberName} from the team? Their account will be revoked from this workspace.`,
      itemBadge: `${memberName} • ${getRoleLabel(member.role)}`,
      confirmText: isFR
        ? 'Retirer le membre'
        : 'Remove Member',
      cancelText: isFR ? 'Annuler' : 'Cancel',
      type: 'danger',
    });

    if (!confirmed) return;

    try {
      await removeTeamMemberApi(member.id);

      setMembers((prev) =>
        prev.filter((m) => m.id !== member.id)
      );

      await logActivityApi(
        'MEMBER_REMOVED',
        member.fullName || member.email,
        'Removed user from team workspace'
      );

      triggerToast(
        isFR
          ? 'Membre retiré de l’équipe'
          : 'Member removed from team'
      );
    } catch (err) {
      triggerToast(
        isFR
          ? 'Impossible de retirer le membre'
          : 'Failed to remove member'
      );
    }
  };

  /* ------------------------------------------------------------------ */
  /* Copy invitation link                                                 */
  /* ------------------------------------------------------------------ */

  const copyInviteLink = async (token) => {
    const url = `${window.location.origin}/?invite=${token}`;

    try {
      await navigator.clipboard.writeText(url);

      setCopiedToken(true);

      setTimeout(() => {
        setCopiedToken(false);
      }, 2000);

      triggerToast(
        isFR
          ? 'Lien d’invitation copié dans le presse-papier !'
          : 'Invitation link copied to clipboard!'
      );
    } catch (err) {
      triggerToast(
        isFR
          ? 'Impossible de copier le lien'
          : 'Unable to copy invitation link'
      );
    }
  };

  /* ------------------------------------------------------------------ */
  /* Cancel invitation                                                    */
  /* ------------------------------------------------------------------ */

  const handleCancelInvitation = async (inv) => {
    const confirmed = await confirm({
      title: isFR
        ? 'Annuler l’invitation ?'
        : 'Cancel Pending Invitation?',
      message: isFR
        ? `Voulez-vous annuler l’invitation envoyée à ${inv.email} ? Le lien d’invitation sera immédiatement invalidé.`
        : `Are you sure you want to cancel the pending invitation sent to ${inv.email}? The invitation link will be invalidated.`,
      itemBadge: `${inv.email} • ${getRoleLabel(inv.role)}`,
      confirmText: isFR
        ? 'Annuler l’invitation'
        : 'Revoke Invitation',
      cancelText: isFR ? 'Conserver' : 'Keep Invitation',
      type: 'warning',
    });

    if (!confirmed) return;

    try {
      await cancelInvitationApi(inv.id);

      setInvitations((prev) =>
        prev.filter((i) => i.id !== inv.id)
      );

      await logActivityApi(
        'INVITATION_CANCELLED',
        inv.email,
        'Cancelled pending invitation'
      );

      triggerToast(
        isFR
          ? 'Invitation annulée avec succès'
          : 'Invitation cancelled successfully'
      );
    } catch (err) {
      triggerToast(
        err.message ||
        (isFR
          ? 'Échec de l’annulation'
          : 'Failed to cancel invitation')
      );
    }
  };

  /* ------------------------------------------------------------------ */
  /* Search                                                               */
  /* ------------------------------------------------------------------ */

  const filteredMembers = members.filter((m) => {
    const q = searchTerm.toLowerCase().trim();

    if (!q) return true;

    return (
      (m.fullName || '').toLowerCase().includes(q) ||
      (m.email || '').toLowerCase().includes(q)
    );
  });

  /* ------------------------------------------------------------------ */
  /* Render                                                               */
  /* ------------------------------------------------------------------ */

  return (
    <div className="sourcing-shell">
      <style>{styles}</style>

      {toast && <div className="tm-toast">{toast}</div>}

      {/* ---------------------------------------------------------------- */}
      {/* NO TEAM ACCESS MESSAGE                                           */}
      {/* ---------------------------------------------------------------- */}

      {noTeamAccess && (
        <div className="tm-no-team-access">
          <ShieldCheck size={48} />
          <h2>
            {isFR
              ? 'Aucun accès à une équipe'
              : 'No Team Access'}
          </h2>
          <p>
            {isFR
              ? 'Vous devez être invité à rejoindre une équipe pour accéder à cette fonctionnalité. Contactez votre administrateur pour obtenir une invitation.'
              : 'You must be invited to join a team to access this feature. Contact your administrator for an invitation.'}
          </p>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* PAGE HEADER                                                       */}
      {/* ---------------------------------------------------------------- */}

      {!noTeamAccess && (
        <header className="sourcing-page-header">
        <div>
          <h1>
            {isFR
              ? 'Équipe & privilèges'
              : 'Team & Privileges'}
          </h1>

          <p>
            {isFR
              ? 'Invitez des recruteurs, attribuez des permissions granulaires et gérez l’espace collaboratif partagé.'
              : 'Invite recruiters to your hiring workspace, grant granular permissions, and share the live talent pipeline.'}
          </p>
        </div>

        <div className="role-library-header-actions">
          <div className="role-search-box">
            <Search size={15} />

            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                isFR
                  ? 'Rechercher un membre...'
                  : 'Search team members...'
              }
              aria-label={
                isFR
                  ? 'Rechercher un membre'
                  : 'Search team members'
              }
            />

            {searchTerm && (
              <button
                type="button"
                className="role-search-clear"
                onClick={() => setSearchTerm('')}
                aria-label={
                  isFR
                    ? 'Effacer la recherche'
                    : 'Clear search'
                }
              >
                ×
              </button>
            )}
          </div>

          <button
            className="sourcing-primary-button"
            onClick={openInviteModal}
          >
            <UserPlus size={16} />

            {isFR
              ? 'Inviter un recruteur'
              : 'Invite Recruiter'}
          </button>
        </div>
      </header>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* STAT RAIL                                                         */}
      {/* ---------------------------------------------------------------- */}

      {!noTeamAccess && (
        <div className="library-summary">
        <div className="summary-item">
          <span className="summary-icon">
            <Users size={14} />
          </span>

          <strong>
            {members.filter((m) => m.enabled).length}
          </strong>

          <span className="summary-label">
            {isFR ? 'Membres actifs' : 'Active members'}
          </span>
        </div>

        <div className="summary-divider" />

        <div className="summary-item">
          <span className="summary-icon">
            <Mail size={14} />
          </span>

          <strong>{invitations.length}</strong>

          <span className="summary-label">
            {isFR
              ? 'Invitations en attente'
              : 'Pending invites'}
          </span>
        </div>

        <div className="summary-divider" />

        <div className="summary-item">
          <span className="summary-icon">
            <ShieldCheck size={14} />
          </span>

          <strong>5</strong>

          <span className="summary-label">
            {isFR
              ? 'Privilèges configurés'
              : 'Privileges configured'}
          </span>
        </div>
      </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* MEMBERS                                                           */}
      {/* ---------------------------------------------------------------- */}

      {!noTeamAccess && (
        <section className="role-library">
        <div className="tm-table-head">
          <div className="tm-table-title">
            {isFR
              ? 'Membres de l’équipe & permissions'
              : 'Team Members & Permissions'}
          </div>

          <div className="tm-table-hint">
            {isFR
              ? 'Cliquez sur un privilège pour l’activer ou le désactiver'
              : 'Click a privilege to toggle it on/off'}
          </div>
        </div>

        <div className="tm-member-list">
          {loading ? (
            <div className="tm-empty-inline">
              {isFR
                ? 'Chargement de l’équipe...'
                : 'Loading team...'}
            </div>
          ) : (
            filteredMembers.map((member) => {
              const isAdmin =
                member.role === 'HR_ADMIN' ||
                member.role === 'SUPER_ADMIN';

              const memberPrivs = member.privileges || [];

              return (
                <div
                  key={member.id}
                  className={`tm-member-row ${!member.enabled
                    ? 'tm-member-disabled'
                    : ''
                    }`}
                >
                  <div className="tm-member-main">
                    <div
                      className={`tm-avatar ${isAdmin
                        ? 'tm-avatar-admin'
                        : ''
                        }`}
                    >
                      {(member.fullName || member.email)
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div>
                      <div className="tm-name">
                        {member.fullName ||
                          member.email.split('@')[0]}
                      </div>

                      <div className="tm-email">
                        {member.email}
                      </div>

                      <span
                        className={`role-tag tm-role-tag ${isAdmin
                          ? 'tm-role-tag-admin'
                          : ''
                          }`}
                      >
                        {isAdmin
                          ? isFR
                            ? 'Admin RH'
                            : 'HR Admin'
                          : isFR
                            ? 'Recruteur'
                            : 'Recruiter'}
                      </span>
                    </div>
                  </div>

                  <div className="tm-privileges-box">
                    {PRIVILEGE_DEFINITIONS.map((def) => {
                      const hasPriv =
                        isAdmin ||
                        memberPrivs.includes(def.id);

                      const Icon = def.icon;

                      return (
                        <button
                          key={def.id}
                          type="button"
                          disabled={
                            isAdmin || !member.enabled
                          }
                          className={`tm-priv-chip ${hasPriv
                            ? 'tm-priv-chip-active'
                            : ''
                            }`}
                          onClick={() =>
                            !isAdmin &&
                            handleToggleMemberPrivilege(
                              member,
                              def.id
                            )
                          }
                          title={
                            isFR
                              ? def.descFR
                              : def.descEN
                          }
                        >
                          <Icon size={12} />

                          <span>
                            {isFR
                              ? def.labelFR
                              : def.labelEN}
                          </span>

                          {hasPriv && (
                            <Check size={11} />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {!isAdmin && (
                    <div className="tm-actions-box">
                      <button
                        type="button"
                        className="role-card-icon-button"
                        onClick={() =>
                          handleToggleStatus(member)
                        }
                        title={
                          member.enabled
                            ? isFR
                              ? 'Désactiver l’accès'
                              : 'Disable access'
                            : isFR
                              ? 'Activer l’accès'
                              : 'Enable access'
                        }
                        aria-label={
                          member.enabled
                            ? isFR
                              ? 'Désactiver l’accès'
                              : 'Disable access'
                            : isFR
                              ? 'Activer l’accès'
                              : 'Enable access'
                        }
                      >
                        <UserCheck size={14} />
                      </button>

                      <button
                        type="button"
                        className="role-card-icon-button role-card-icon-button-danger"
                        onClick={() =>
                          handleRemoveMember(member)
                        }
                        title={
                          isFR
                            ? 'Retirer de l’équipe'
                            : 'Remove from team'
                        }
                        aria-label={
                          isFR
                            ? 'Retirer de l’équipe'
                            : 'Remove from team'
                        }
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {filteredMembers.length === 0 &&
            !loading && (
              <div className="tm-empty-inline">
                {isFR
                  ? 'Aucun membre trouvé.'
                  : 'No members found.'}
              </div>
            )}
        </div>
      </section>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* PENDING INVITATIONS                                               */}
      {/* ---------------------------------------------------------------- */}

      {!noTeamAccess && invitations.length > 0 && (
        <section
          className="role-library"
          style={{ marginTop: 14 }}
        >
          <div className="tm-table-head">
            <div className="tm-table-title">
              {isFR
                ? 'Invitations par email en attente'
                : 'Pending Email Invitations'}
            </div>

            <span className="tm-invite-count">
              {invitations.length}{' '}
              {isFR ? 'en attente' : 'pending'}
            </span>
          </div>

          <div className="tm-member-list">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="tm-invite-row"
              >
                <div className="tm-member-main">
                  <div
                    className={`tm-avatar ${inv.role === 'HR_ADMIN'
                      ? 'tm-avatar-admin'
                      : 'tm-avatar-muted'
                      }`}
                  >
                    <Mail size={16} />
                  </div>

                  <div>
                    <div className="tm-name">
                      {inv.fullName || inv.email}
                    </div>

                    <div className="tm-email">
                      {inv.email}
                    </div>

                    <div className="tm-email">
                      {isFR
                        ? 'Expire dans 7 jours'
                        : 'Expires in 7 days'}{' '}
                      · {(inv.privileges || []).length}{' '}
                      {isFR
                        ? 'privilèges'
                        : 'privileges'}
                    </div>

                    <span
                      className={`role-tag tm-role-tag ${inv.role === 'HR_ADMIN'
                        ? 'tm-role-tag-admin'
                        : ''
                        }`}
                      style={{ marginTop: 4 }}
                    >
                      {getRoleLabel(inv.role)}
                    </span>
                  </div>
                </div>

                <div className="tm-invite-actions">
                  <button
                    type="button"
                    className="sourcing-secondary-button"
                    onClick={() =>
                      copyInviteLink(inv.token)
                    }
                  >
                    <Copy size={14} />

                    {isFR
                      ? 'Copier le lien'
                      : 'Copy link'}
                  </button>

                  <button
                    type="button"
                    className="sourcing-secondary-button tm-btn-danger"
                    onClick={() =>
                      handleCancelInvitation(inv)
                    }
                    title={
                      isFR
                        ? 'Annuler l’invitation'
                        : 'Cancel invitation'
                    }
                  >
                    <Trash2 size={14} />

                    {isFR
                      ? 'Annuler'
                      : 'Cancel'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* INVITE WIZARD                                                     */}
      {/* ---------------------------------------------------------------- */}

      {isInviteModalOpen && (
        <div
          className="jd-overlay"
          onClick={closeInviteModal}
          role="button"
          tabIndex={0}
          onKeyPress={(e) => {
            // Only close if the overlay itself is targeted, not child elements
            if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) {
              closeInviteModal();
            }
          }}
        >
          <div
            className="jd-modal"
            role="dialog"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <div className="jd-header">
              <span className="jd-header-title">
                <UserPlus
                  size={16}
                  color="#0A7E96"
                />

                {isFR
                  ? 'Inviter un collaborateur'
                  : 'Invite Team Member'}
              </span>

              <button
                className="jd-close"
                onClick={closeInviteModal}
                aria-label={
                  isFR ? 'Fermer' : 'Close'
                }
              >
                <X size={17} />
              </button>
            </div>

            {(inviteEmail.trim() ||
              invitePrivileges.length > 0) &&
              !inviteSuccessData && (
                <div className="jd-preview">
                  <Sparkles
                    size={12}
                    color="#0A7E96"
                    style={{
                      flexShrink: 0,
                      marginTop: 1,
                    }}
                  />

                  <span>
                    <strong>
                      {isFR
                        ? 'Aperçu'
                        : 'Preview'}
                      :
                    </strong>{' '}
                    {inviteEmail || '...'}

                    {inviteName
                      ? ` · ${inviteName}`
                      : ''}

                    <strong
                      style={{
                        color:
                          inviteRole === 'HR_ADMIN'
                            ? '#0A7E96'
                            : 'inherit',
                      }}
                    >
                      {` · ${getRoleLabelWithAdmin(
                        inviteRole
                      )}`}
                    </strong>

                    <strong>
                      {' · '}
                      {invitePrivileges.length}{' '}
                      {isFR
                        ? 'privilèges'
                        : 'privileges'}
                    </strong>
                  </span>
                </div>
              )}

            {!inviteSuccessData && (
              <div className="jd-stepper">
                {STEP_LABELS.map((label, i) => (
                  <React.Fragment key={label}>
                    <div
                      className={`jd-step${step === i ? ' active' : ''
                        }${step > i ? ' done' : ''
                        }`}
                      role="button"
                      tabIndex={0}
                      onClick={() =>
                        goToStep(i)
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          goToStep(i);
                        }
                      }}
                    >
                      <div className="jd-step-dot">
                        {step > i ? (
                          <Check size={12} />
                        ) : (
                          i + 1
                        )}
                      </div>

                      <div className="jd-step-label">
                        {label}
                      </div>
                    </div>

                    {i <
                      STEP_LABELS.length - 1 && (
                        <div
                          className={`jd-step-line${step > i
                            ? ' done'
                            : ''
                            }`}
                        />
                      )}
                  </React.Fragment>
                ))}
              </div>
            )}

            {/* ---------------------------------------------------------- */}
            {/* SUCCESS STATE                                               */}
            {/* ---------------------------------------------------------- */}

            {inviteSuccessData ? (
              <div className="jd-form">
                <div
                  className="jd-review"
                  style={{
                    background: '#ECFDF5',
                    border:
                      '1px solid #6EE7B7',
                    padding: '16px 18px',
                    borderRadius: 12,
                  }}
                >
                  <div
                    className="jd-review-head"
                    style={{ marginBottom: 6 }}
                  >
                    <span
                      className="jd-review-title"
                      style={{
                        color: '#065F46',
                        fontSize: 14,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 7,
                      }}
                    >
                      <CheckCircle2 size={16} />

                      {isFR
                        ? 'Email d’invitation envoyé !'
                        : 'Invitation Email Dispatched!'}
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: 12.5,
                      color: '#047857',
                      lineHeight: '1.5',
                    }}
                  >
                    {isFR
                      ? `Un email d’invitation avec les droits ${inviteSuccessData.role ===
                        'HR_ADMIN'
                        ? 'Admin RH'
                        : 'Recruteur'
                      } a été envoyé avec succès à ${inviteSuccessData.email
                      }. Le destinataire peut cliquer sur le lien dans son email pour définir son mot de passe et rejoindre l’espace.`
                      : `An official invitation email (${inviteSuccessData.role ===
                        'HR_ADMIN'
                        ? 'HR Admin'
                        : 'Recruiter'
                      }) has been sent successfully to ${inviteSuccessData.email
                      }. The recipient can click the link in their email to set up their password and join.`}
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: 10,
                    justifyContent: 'flex-end',
                    marginTop: 14,
                  }}
                >
                  <button
                    type="button"
                    className="sourcing-secondary-button"
                    onClick={() =>
                      copyInviteLink(
                        inviteSuccessData.token
                      )
                    }
                  >
                    <Copy size={14} />

                    {copiedToken
                      ? isFR
                        ? 'Lien copié !'
                        : 'Link copied!'
                      : isFR
                        ? 'Copier le lien'
                        : 'Copy link'}
                  </button>

                  <button
                    type="button"
                    className="sourcing-primary-button"
                    onClick={closeInviteModal}
                  >
                    {isFR ? 'Fermer' : 'Done'}
                  </button>
                </div>
              </div>
            ) : (
              <form
                className="jd-form"
                key={step}
                onSubmit={handleSendInvite}
                onKeyDown={(e) => e.stopPropagation()}
              >
                {/* ------------------------------------------------------ */}
                {/* STEP 1                                                  */}
                {/* ------------------------------------------------------ */}

                {step === 0 && (
                  <>
                    <div>
                      <label className="jd-label">
                        {isFR
                          ? 'Type de rôle & niveau de responsabilité'
                          : 'Role & Responsibility Level'}{' '}
                        *
                      </label>

                      <div className="tm-role-selector">
                        {/* RECRUITER */}
                        <button
                          type="button"
                          className={`tm-role-card ${inviteRole ===
                            'RECRUITER'
                            ? 'tm-role-card-selected'
                            : ''
                            }`}
                          onClick={() =>
                            handleSelectInviteRole(
                              'RECRUITER'
                            )
                          }
                        >
                          <div className="tm-role-card-head">
                            <div className="tm-role-card-title">
                              <UserCheck
                                size={15}
                                color={
                                  inviteRole ===
                                    'RECRUITER'
                                    ? '#0A7E96'
                                    : '#64748B'
                                }
                              />

                              <span>
                                {isFR
                                  ? 'Recruteur'
                                  : 'Recruiter'}
                              </span>

                              <div
                                className={`tm-role-check ${inviteRole ===
                                  'RECRUITER'
                                  ? 'tm-role-check-active'
                                  : ''
                                  }`}
                              >
                                {inviteRole ===
                                  'RECRUITER' && (
                                    <Check size={11} />
                                  )}
                              </div>
                            </div>
                          </div>

                          <div className="tm-role-card-desc">
                            {isFR
                              ? 'Sourcing IA, évaluation des profils, notes et gestion du pipeline de recrutement.'
                              : 'AI sourcing scans, candidate evaluations, notes, and pipeline management.'}
                          </div>
                        </button>

                        {/* HR ADMIN */}
                        <button
                          type="button"
                          className={`tm-role-card ${inviteRole ===
                            'HR_ADMIN'
                            ? 'tm-role-card-selected'
                            : ''
                            }`}
                          onClick={() =>
                            handleSelectInviteRole(
                              'HR_ADMIN'
                            )
                          }
                        >
                          <div className="tm-role-card-head">
                            <div className="tm-role-card-title">
                              <ShieldCheck
                                size={15}
                                color={
                                  inviteRole ===
                                    'HR_ADMIN'
                                    ? '#0A7E96'
                                    : '#64748B'
                                }
                              />

                              <span>
                                {isFR
                                  ? 'Admin RH (Co-Admin)'
                                  : 'HR Admin (Co-Admin)'}
                              </span>

                              <div
                                className={`tm-role-check ${inviteRole ===
                                  'HR_ADMIN'
                                  ? 'tm-role-check-active'
                                  : ''
                                  }`}
                              >
                                {inviteRole ===
                                  'HR_ADMIN' && (
                                    <Check size={11} />
                                  )}
                              </div>
                            </div>
                          </div>

                          <div className="tm-role-card-desc">
                            {isFR
                              ? 'Gestion de l’équipe, invitations, attribution des droits et supervision complète de l’espace.'
                              : 'Team management, co-admin permissions, invites, and full workspace oversight.'}
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* EMAIL */}
                    <div>
                      <label className="jd-label">
                        {isFR
                          ? 'Email professionnel'
                          : 'Work email'}{' '}
                        *
                      </label>

                      <input
                        className={`jd-input${emailErr
                          ? ' error'
                          : ''
                          }`}
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => {
                          setInviteEmail(
                            e.target.value
                          );
                          setEmailErr(false);
                        }}
                        placeholder={
                          isFR
                            ? 'ex. collegue@entreprise.com'
                            : 'e.g. colleague@example.com'
                        }
                      />

                      {emailErr && (
                        <div className="jd-error-text">
                          {isFR
                            ? 'L’email est requis.'
                            : 'Email is required.'}
                        </div>
                      )}
                    </div>

                    {/* FULL NAME */}
                    <div>
                      <label className="jd-label">
                        {isFR
                          ? 'Nom complet (optionnel)'
                          : 'Full name (optional)'}
                      </label>

                      <input
                        className="jd-input"
                        type="text"
                        value={inviteName}
                        onChange={(e) =>
                          setInviteName(
                            e.target.value
                          )
                        }
                        placeholder={
                          isFR
                            ? 'ex. Karim Tazi'
                            : 'e.g. Karim Tazi'
                        }
                      />
                    </div>
                  </>
                )}

                {/* ------------------------------------------------------ */}
                {/* STEP 2                                                  */}
                {/* ------------------------------------------------------ */}

                {step === 1 && (
                  <div>
                    <label className="jd-label">
                      {isFR
                        ? 'Privilèges accordés'
                        : 'Granted privileges'}
                    </label>

                    <div className="tm-priv-selector">
                      {PRIVILEGE_DEFINITIONS.map(
                        (def) => {
                          const isSelected =
                            invitePrivileges.includes(
                              def.id
                            );

                          const Icon = def.icon;

                          return (
                            <button
                              type="button"
                              key={def.id}
                              className={`tm-priv-option ${isSelected
                                ? 'tm-priv-option-selected'
                                : ''
                                }`}
                              onClick={() =>
                                handleTogglePrivilegeForInvite(
                                  def.id
                                )
                              }
                            >
                              <div className="tm-priv-check">
                                {isSelected && (
                                  <Check size={12} />
                                )}
                              </div>

                              <div>
                                <div className="tm-priv-opt-title">
                                  <Icon size={14} />

                                  <span>
                                    {isFR
                                      ? def.labelFR
                                      : def.labelEN}
                                  </span>
                                </div>

                                <div className="tm-priv-opt-desc">
                                  {isFR
                                    ? def.descFR
                                    : def.descEN}
                                </div>
                              </div>
                            </button>
                          );
                        }
                      )}
                    </div>
                  </div>
                )}
              </form>
            )}

            {/* ---------------------------------------------------------- */}
            {/* FOOTER                                                      */}
            {/* ---------------------------------------------------------- */}

            {!inviteSuccessData && (
              <div className="jd-footer">
                {step > 0 ? (
                  <button
                    type="button"
                    className="jd-back-btn"
                    onClick={() =>
                      setStep((s) => s - 1)
                    }
                  >
                    <ChevronLeft size={14} />

                    {isFR ? 'Retour' : 'Back'}
                  </button>
                ) : (
                  <span />
                )}

                {step <
                  STEP_LABELS.length - 1 ? (
                  <button
                    type="button"
                    className={`jd-next-btn${emailErr
                      ? ' shake'
                      : ''
                      }`}
                    onClick={goNext}
                  >
                    {isFR
                      ? 'Suivant'
                      : 'Next'}

                    <ChevronRight size={14} />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="jd-submit-btn"
                    onClick={handleSendInvite}
                    disabled={submittingInvite}
                  >
                    <Mail size={15} />

                    <span>
                      {submittingInvite
                        ? isFR
                          ? 'Envoi...'
                          : 'Sending...'
                        : isFR
                          ? 'Envoyer l’invitation'
                          : 'Send invitation'}
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* CSS                                                                    */
/* ---------------------------------------------------------------------- */

const styles = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

.sourcing-shell {
  --cyan: #0BA5C9;
  --cyan-dark: #087F9B;
  --cyan-soft: #EAF9FC;
  --ink: #12151B;
  --muted: #6C7078;
  --border: #E5E2DB;
  --paper: #F7F5F1;
  --surface: #FFFFFF;

  width: 100%;
  color: var(--ink);
  font-family: Inter, sans-serif;
}

.sourcing-page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 24px;
  padding-bottom: 20px;
  margin-bottom: 22px;
  border-bottom: 1px solid var(--border);
}

.sourcing-page-header h1 {
  margin: 0;
  font-family: "Space Grotesk", sans-serif;
  font-size: 26px;
  letter-spacing: -.03em;
}

.sourcing-page-header p {
  max-width: 520px;
  margin: 6px 0 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.6;
}

.role-library-header-actions {
  display: flex;
  align-items: center;
  gap: 9px;
  flex-shrink: 0;
}

.role-search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 240px;
  height: 40px;
  padding: 0 11px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  color: #8A8D92;
  transition: border-color .16s ease, box-shadow .16s ease, background .16s ease;
}

.role-search-box:hover {
  border-color: #D8D4CA;
}

.role-search-box:focus-within {
  border-color: #B9DDE4;
  background: #FFFFFF;
  box-shadow: 0 0 0 3px var(--cyan-soft);
}

.role-search-box input {
  width: 100%;
  min-width: 0;
  padding: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--ink);
  font-family: Inter, sans-serif;
  font-size: 11.5px;
}

.role-search-box input::placeholder {
  color: #9A9CA1;
}

.role-search-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--paper);
  color: #777A81;
  font-size: 15px;
  line-height: 1;
  cursor: pointer;
  transition: background .15s ease, color .15s ease;
}

.role-search-clear:hover {
  background: var(--cyan-soft);
  color: var(--cyan-dark);
}

.sourcing-primary-button,
.sourcing-secondary-button {
  font: inherit;
  cursor: pointer;
}

.sourcing-primary-button {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 16px;
  border: none;
  border-radius: 10px;
  background: var(--ink);
  color: white;
  font-size: 12.5px;
  font-weight: 600;
  transition: .18s ease;
}

.sourcing-primary-button:hover {
  background: var(--cyan-dark);
}

.sourcing-primary-button:disabled {
  opacity: .6;
  cursor: default;
}

.sourcing-secondary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 36px;
  padding: 0 13px;
  border: 1px solid var(--border);
  border-radius: 9px;
  background: white;
  color: #4C5057;
  font-size: 11px;
  font-weight: 600;
}

.sourcing-secondary-button:hover {
  border-color: #C9DDE1;
  color: var(--cyan-dark);
}

.library-summary {
  display: flex;
  align-items: center;
  gap: 22px;
  margin-bottom: 22px;
}

.summary-item {
  display: flex;
  align-items: baseline;
  gap: 7px;
}

.summary-icon {
  display: inline-flex;
  align-items: center;
  color: var(--cyan-dark);
  transform: translateY(1px);
}

.summary-item strong {
  font-family: "Space Grotesk", sans-serif;
  font-size: 19px;
  letter-spacing: -.02em;
}

.summary-label {
  color: var(--muted);
  font-size: 11.5px;
}

.summary-divider {
  width: 1px;
  height: 18px;
  background: var(--border);
}

.role-library {
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface);
  overflow: hidden;
}

.tm-table-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px 18px;
  background: var(--paper);
  border-bottom: 1px solid var(--border);
}

.tm-table-title {
  font-family: "Space Grotesk", sans-serif;
  font-size: 13px;
  font-weight: 700;
}

.tm-table-hint,
.tm-invite-count {
  font-size: 10.5px;
  color: var(--muted);
}

.tm-invite-count {
  font-family: "JetBrains Mono", monospace;
  font-weight: 700;
  background: #FEF3C7;
  color: #D97706;
  padding: 3px 8px;
  border-radius: 999px;
}

.tm-member-list {
  display: flex;
  flex-direction: column;
}

.tm-member-row,
.tm-invite-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 16px 18px;
  border-bottom: 1px solid #EEECE7;
  transition: background .15s ease;
}

.tm-member-row:last-child,
.tm-invite-row:last-child {
  border-bottom: 0;
}

.tm-member-row:hover,
.tm-invite-row:hover {
  background: var(--paper);
}

.tm-member-disabled {
  opacity: .5;
}

.tm-member-main {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 220px;
}

.tm-avatar {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: var(--ink);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: "Space Grotesk", sans-serif;
  font-size: 14px;
  font-weight: 700;
  flex-shrink: 0;
}

.tm-avatar-admin {
  background: var(--cyan-dark);
}

.tm-avatar-muted {
  background: #E2E8F0;
  color: #475569;
}

.tm-name {
  font-size: 13px;
  font-weight: 700;
}

.tm-email {
  font-size: 11px;
  color: var(--muted);
  margin-top: 1px;
}

.tm-role-tag,
.role-tag {
  font-family: "JetBrains Mono", monospace;
  font-size: 9.5px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  text-transform: uppercase;
  display: inline-block;
  margin-top: 5px;
  background: var(--paper);
  color: #575B62;
}

.tm-role-tag-admin {
  background: var(--cyan-soft);
  color: var(--cyan-dark);
}

.tm-privileges-box {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.tm-priv-chip {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 10.5px;
  font-weight: 600;
  padding: 4px 9px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--paper);
  color: var(--muted);
  cursor: pointer;
  transition: all .15s ease;
}

.tm-priv-chip-active {
  background: #fff;
  border-color: var(--cyan);
  color: var(--cyan-dark);
  box-shadow: 0 1px 3px rgba(11,165,201,.12);
}

.tm-priv-chip:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: var(--cyan);
}

.tm-priv-chip:disabled {
  cursor: default;
}

.tm-actions-box {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.role-card-icon-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: white;
  color: #696D74;
  cursor: pointer;
  font: inherit;
}

.role-card-icon-button:hover {
  border-color: #C9E8EE;
  color: var(--cyan-dark);
}

.role-card-icon-button-danger:hover {
  border-color: #F3C9C4;
  background: #FBEAE9;
  color: #B3261E;
}

.tm-invite-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.tm-btn-danger {
  color: #B3261E !important;
}

.tm-btn-danger:hover {
  border-color: #F3C9C4 !important;
  background: #FBEAE9 !important;
  color: #B3261E !important;
}

.tm-link-box {
  font-family: "JetBrains Mono", monospace;
  font-size: 11.5px;
  color: #0F172A;
  word-break: break-all;
  background: var(--paper);
  padding: 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
}

.tm-role-selector {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 4px;
}

.tm-role-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 11px 12px;
  border: 1.5px solid var(--border);
  border-radius: 12px;
  cursor: pointer;
  background: #fff;
  transition: all .15s ease;
}

.tm-role-card:hover {
  border-color: var(--cyan);
}

.tm-role-card-selected {
  border-color: var(--cyan);
  background: var(--cyan-soft);
  box-shadow: 0 2px 8px rgba(11,165,201,.1);
}

.tm-role-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.tm-role-card-title {
  font-size: 12.5px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 6px;
}

.tm-role-card-desc {
  font-size: 10.5px;
  color: var(--muted);
  line-height: 1.35;
}

.tm-role-check {
  width: 16px;
  height: 16px;
  border-radius: 5px;
  border: 1.5px solid #CBD5E1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  color: #fff;
  flex-shrink: 0;
}

.tm-role-check-active {
  border-color: var(--cyan);
  background: var(--cyan);
}

.tm-priv-selector {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.tm-priv-option {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 11px 13px;
  border: 1px solid var(--border);
  border-radius: 11px;
  cursor: pointer;
  background: #fff;
  transition: all .15s;
}

.tm-priv-option-selected {
  border-color: var(--cyan);
  background: var(--cyan-soft);
}

.tm-priv-check {
  width: 17px;
  height: 17px;
  border-radius: 5px;
  border: 1.5px solid #CBD5E1;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 2px;
  flex-shrink: 0;
  background: #fff;
  color: #fff;
}

.tm-priv-option-selected .tm-priv-check {
  border-color: var(--cyan);
  background: var(--cyan);
}

.tm-priv-opt-title {
  font-size: 12.5px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 6px;
}

.tm-priv-opt-desc {
  font-size: 11px;
  color: var(--muted);
  margin-top: 2px;
}

.tm-empty-inline {
  padding: 30px 20px;
  text-align: center;
  color: var(--muted);
  font-size: 12px;
}

.tm-toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 120;
  background: var(--ink);
  color: #fff;
  padding: 12px 20px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  box-shadow: 0 10px 25px -5px rgba(0,0,0,.3);
}

.tm-no-team-access {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 80px 40px;
  gap: 20px;
  color: var(--muted);
}

.tm-no-team-access svg {
  color: var(--cyan);
  margin-bottom: 12px;
}

.tm-no-team-access h2 {
  margin: 0;
  font-family: "Space Grotesk", sans-serif;
  font-size: 24px;
  color: var(--ink);
}

.tm-no-team-access p {
  max-width: 500px;
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
}

/* ---------------------------------------------------------------------- */
/* JD MODAL                                                              */
/* ---------------------------------------------------------------------- */

.jd-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  overflow-y: auto;
  background: rgba(18,21,27,.55);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  font-family: 'Inter', system-ui, sans-serif;
}

.jd-modal {
  background: #FBFAF7;
  border: 1px solid #E4E1D9;
  border-radius: 20px;
  max-width: 560px;
  width: 100%;
  max-height: 92vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 30px 70px -30px rgba(18,21,27,.45);
}

.jd-header {
  padding: 18px 22px;
  border-bottom: 1px solid #E4E1D9;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  flex-shrink: 0;
}

.jd-header-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 13.5px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 9px;
  color: #12151B;
}

.jd-close {
  background: none;
  border: none;
  color: #9B9C9E;
  cursor: pointer;
  padding: 6px;
  border-radius: 8px;
}

.jd-close:hover {
  color: #12151B;
  background: #F1F1EC;
}

.jd-preview {
  margin: 14px 22px 0;
  display: flex;
  align-items: flex-start;
  gap: 7px;
  padding: 9px 12px;
  background: #F1F1EC;
  border-radius: 9px;
  font-size: 10.5px;
  font-family: 'JetBrains Mono', monospace;
  color: #63666E;
  flex-shrink: 0;
}

.jd-preview strong {
  color: #0A7E96;
}

.jd-stepper {
  display: flex;
  align-items: center;
  padding: 16px 22px 0;
  gap: 6px;
  flex-shrink: 0;
}

.jd-step {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.jd-step-dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  font-family: 'JetBrains Mono', monospace;
  border: 2px solid #E4E1D9;
  color: #9B9C9E;
  background: #fff;
  transition: all .2s ease;
}

.jd-step.done .jd-step-dot {
  background: #12151B;
  border-color: #12151B;
  color: #fff;
}

.jd-step.active .jd-step-dot {
  border-color: #0BA5C9;
  color: #0BA5C9;
}

.jd-step-label {
  font-size: 9.5px;
  font-weight: 600;
  color: #9B9C9E;
}

.jd-step.active .jd-step-label {
  color: #12151B;
}

.jd-step-line {
  flex: 1;
  height: 2px;
  background: #E4E1D9;
  margin-top: -18px;
}

.jd-step-line.done {
  background: #12151B;
}

.jd-form {
  padding: 18px 22px 20px;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.jd-label {
  display: block;
  font-size: 10px;
  font-weight: 700;
  color: #9B9C9E;
  text-transform: uppercase;
  letter-spacing: .04em;
  margin-bottom: 6px;
}

.jd-input {
  width: 100%;
  box-sizing: border-box;
  background: #fff;
  border: 1px solid #E4E1D9;
  border-radius: 10px;
  padding: 9px 11px;
  font-size: 12px;
  font-weight: 500;
  color: #12151B;
  outline: none;
  font-family: inherit;
  transition: border-color .15s ease;
}

.jd-input.error {
  border-color: #E85D3D;
  background: #FDEEE9;
}

.jd-input:focus {
  border-color: #12151B;
}

.jd-error-text {
  font-size: 10px;
  color: #E85D3D;
  margin-top: 4px;
}

.jd-review {
  border-radius: 14px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.jd-review-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.jd-review-title {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  font-weight: 700;
}

.jd-footer {
  padding: 14px 22px;
  border-top: 1px solid #E4E1D9;
  background: #F6F5F1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-shrink: 0;
}

.jd-back-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 600;
  color: #63666E;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px 4px;
}

.jd-back-btn:hover {
  color: #12151B;
}

.jd-next-btn,
.jd-submit-btn {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 10px 18px;
  border: none;
  border-radius: 11px;
  background: #12151B;
  color: #fff;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  margin-left: auto;
}

.jd-next-btn:hover,
.jd-submit-btn:hover {
  background: #2A2E37;
}

.jd-submit-btn:disabled {
  opacity: .6;
  cursor: default;
}

@keyframes jdShake {
  10%,90% {
    transform: translateX(-1px);
  }

  20%,80% {
    transform: translateX(2px);
  }

  30%,50%,70% {
    transform: translateX(-4px);
  }

  40%,60% {
    transform: translateX(4px);
  }
}

.jd-next-btn.shake {
  animation: jdShake .4s ease;
}

@media (max-width: 650px) {
  .sourcing-page-header {
    align-items: stretch;
    flex-direction: column;
  }

  .role-library-header-actions {
    width: 100%;
  }

  .role-search-box {
    flex: 1;
    width: auto;
  }

  .tm-member-row,
  .tm-invite-row {
    flex-wrap: wrap;
  }

  .tm-privileges-box {
    width: 100%;
    flex-basis: 100%;
  }

  .tm-actions-box,
  .tm-invite-actions {
    margin-left: auto;
  }

  .tm-role-selector {
    grid-template-columns: 1fr;
  }

  .library-summary {
    gap: 12px;
    flex-wrap: wrap;
  }
}
`;

export default TeamManagementView;