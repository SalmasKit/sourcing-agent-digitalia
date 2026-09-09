import React, { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Edit3,
  GitCompare,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Users,
} from "lucide-react";

import SearchConsole from "./SearchConsole";
import AgentStatusWidget from "./AgentStatusWidget";
import CandidateGridView from "./CandidateGridView";

const SourcingHubView = ({
  jobDescriptions = [],
  selectedJobId,
  candidates = [],
  jobResultsCache = {},
  searchKey,
  searchMode = "ai",
  shortlist = [],
  savedRoleCandidates = [],
  isSearching = false,
  agentStep = 0,
  lastSearch,
  lang,
  t,

  onSearch,
  onSearchModeChange,
  onRefresh,
  onCompare,

  candidateGridProps = {},

  // New optional callbacks.
  // They won't break your existing parent if you don't provide them yet.
  onSelectJob,
  onEditDescription,
  onNewDescription,
  onToggleSaveForJob,
  onViewDetails,
  onEdit,
  onDelete,
  onOpenComparator,
}) => {
  /*
   * The role opened in the sourcing workspace.
   *
   * We deliberately keep this local rather than making the entire view
   * depend on selectedJobId. That lets the recruiter return to the role
   * library without destroying the parent's current selection.
   */
  const [workspaceJobId, setWorkspaceJobId] = useState(null);
  const [libraryPage, setLibraryPage] = useState(0);
  const PAGE_SIZE = 5;

  // Sort most-recent first: job IDs are timestamp-based (job-<timestamp>)
  const sortedJobs = useMemo(() =>
    [...jobDescriptions].sort((a, b) => {
      const tA = Number(String(a.id).replace(/\D/g, '')) || 0;
      const tB = Number(String(b.id).replace(/\D/g, '')) || 0;
      return tB - tA;
    }),
    [jobDescriptions]
  );
  const totalPages = Math.ceil(sortedJobs.length / PAGE_SIZE);
  const pagedJobs = sortedJobs.slice(
    libraryPage * PAGE_SIZE,
    libraryPage * PAGE_SIZE + PAGE_SIZE
  );


  const activeJob = useMemo(() => {
    const id = workspaceJobId || selectedJobId;

    return jobDescriptions.find(
      (job) => String(job.id) === String(id)
    );
  }, [jobDescriptions, workspaceJobId, selectedJobId]);

  const getJobCandidates = (jobId) => {
    if (!jobId) return [];

    const cached = jobResultsCache?.[jobId];

    if (Array.isArray(cached)) return cached;
    if (Array.isArray(cached?.candidates)) return cached.candidates;

    if (
      String(jobId) === String(selectedJobId) &&
      Array.isArray(candidates)
    ) {
      return candidates;
    }

    return [];
  };

  const displayCandidates = activeJob
    ? getJobCandidates(activeJob.id)
    : [];

  const openRole = (job) => {
    setWorkspaceJobId(job.id);

    if (onSelectJob) {
      onSelectJob(job);
    }
  };

  const closeWorkspace = () => {
    setWorkspaceJobId(null);
  };

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh(activeJob?.id);
      return;
    }

    if (lastSearch && onSearch) {
      onSearch(
        lastSearch.query,
        lastSearch.filters,
        activeJob?.id || lastSearch.jobId
      );

      return;
    }

    if (activeJob && onSearch) {
      onSearch(
        activeJob.description || activeJob.prompt || "",
        { maxResults: activeJob.maxResults || 10 },
        activeJob.id
      );
    }
  };

  /*
   * Library mode
   */
  if (!workspaceJobId) {
    return (
      <div className="sourcing-shell">
        <style>{styles}</style>

        <header className="sourcing-page-header">
          <div>
            <div className="sourcing-eyebrow">
              <Sparkles size={13} />
              SOURCING
            </div>

            <h1>Your hiring roles</h1>

            <p>
              Manage role descriptions and the sourcing activity connected
              to each one.
            </p>
          </div>
        </header>

        <LibrarySummary
          jobs={jobDescriptions}
          getJobCandidates={getJobCandidates}
          selectedJobId={selectedJobId}
          isSearching={isSearching}
          onNewDescription={onNewDescription}
        />

        <section className="role-library">
          <div className="role-library-header">
            <div>
              <span>Role</span>
            </div>

            <span>Candidates</span>
            <span>Status</span>
            <span />
          </div>

          {sortedJobs.length > 0 ? (
            <>
              {pagedJobs.map((job) => {
                const jobCandidates = getJobCandidates(job.id);

                const isCurrent =
                  String(job.id) === String(selectedJobId);

                const jobIsSearching =
                  isCurrent && isSearching;

                return (
                  <RoleRow
                    key={job.id}
                    job={job}
                    candidateCount={jobCandidates.length}
                    isSearching={jobIsSearching}
                    isSelected={isCurrent}
                    onOpen={() => openRole(job)}
                    onEdit={
                      onEditDescription
                        ? () => onEditDescription(job)
                        : undefined
                    }
                  />
                );
              })}

              {totalPages > 1 && (
                <div className="role-library-pagination">
                  <span className="pagination-info">
                    Page {libraryPage + 1} of {totalPages}
                  </span>
                  <div className="pagination-controls">
                    <button
                      className="pagination-btn"
                      disabled={libraryPage === 0}
                      onClick={() => setLibraryPage(p => p - 1)}
                    >
                      <ChevronLeft size={15} />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => (
                      <button
                        key={i}
                        className={`pagination-btn pagination-num${libraryPage === i ? ' active' : ''}`}
                        onClick={() => setLibraryPage(i)}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button
                      className="pagination-btn"
                      disabled={libraryPage >= totalPages - 1}
                      onClick={() => setLibraryPage(p => p + 1)}
                    >
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="role-library-empty">
              <div className="role-library-empty-icon">
                <BriefcaseBusiness size={22} />
              </div>

              <h3>No role descriptions yet</h3>

              <p>
                Create a description first, then sourcing activity and
                candidates will appear here.
              </p>

              {onNewDescription && (
                <button
                  className="sourcing-primary-button"
                  onClick={onNewDescription}
                >
                  <Plus size={16} />
                  Create description
                </button>
              )}
            </div>
          )}
        </section>
      </div>
    );
  }

  /*
   * Workspace mode
   */
  return (
    <div className="sourcing-shell">
      <style>{styles}</style>

      <button
        className="back-to-library"
        onClick={closeWorkspace}
      >
        <ArrowLeft size={15} />
        All descriptions
      </button>

      <section className="role-workspace-header">
        <div className="role-workspace-main">
          <div className="sourcing-eyebrow">
            <BriefcaseBusiness size={13} />
            ROLE DESCRIPTION
          </div>

          <div className="role-title-row">
            <h1>{activeJob?.title || "Untitled role"}</h1>

            {activeJob?.status && (
              <span className="role-status-pill">
                <span />
                {activeJob.status}
              </span>
            )}
          </div>

          <RoleMeta job={activeJob} />
        </div>

        <div className="role-header-actions">
          {onEditDescription && (
            <button
              className="sourcing-secondary-button"
              onClick={() => onEditDescription(activeJob)}
            >
              <Edit3 size={15} />
              Edit description
            </button>
          )}
        </div>
      </section>

      <div className="workspace-divider" />

      <SearchConsole
        onSearch={onSearch}
        isSearching={isSearching}
        selectedJob={activeJob}
        searchMode={searchMode}
        onSearchModeChange={onSearchModeChange}
        sourcedCandidateCount={displayCandidates.length}
      />

      <section className="candidate-workspace">
        <div className="candidate-workspace-top">
          <div className="candidate-heading">
            <div className="candidate-heading-icon">
              <Users size={17} />
            </div>

            <div>
              <div className="candidate-heading-line">
                <h2>Candidate Profiles</h2>

                <span className="candidate-count">
                  {displayCandidates.length}
                </span>
              </div>

              <p>
                Profiles sourced for{" "}
                <strong>
                  {activeJob?.title || "this role"}
                </strong>
              </p>
            </div>
          </div>

          <div className="candidate-actions">
            {displayCandidates.length > 1 && (
              <button
                className="workspace-action-button"
                onClick={onCompare}
              >
                <GitCompare size={15} />
                Compare
              </button>
            )}

            <button
              className="workspace-action-button"
              onClick={handleRefresh}
              disabled={isSearching}
            >
              <RefreshCw
                size={15}
                className={isSearching ? "spin" : ""}
              />

              {isSearching ? "Searching" : "Refresh"}
            </button>
          </div>
        </div>

        {isSearching && (
          <AgentStatusWidget
            currentStep={agentStep}
            totalCandidatesFound={displayCandidates.length}
          />
        )}

        <div className="candidate-grid-area">
          {displayCandidates.length > 0 ? (
            <CandidateGridView
              candidates={displayCandidates}
              shortlist={shortlist}
              savedRoleCandidates={savedRoleCandidates}
              selectedJobId={activeJob?.id}
              searchKey={searchKey}
              lang={lang}
              t={t}
              onToggleSaveForJob={onToggleSaveForJob}
              onViewDetails={onViewDetails}
              onEdit={onEdit}
              onDelete={onDelete}
              onOpenComparator={onOpenComparator}
              {...candidateGridProps}
            />
          ) : !isSearching ? (
            <EmptyCandidateState
              activeJob={activeJob}
              onSearch={onSearch}
            />
          ) : null}
        </div>
      </section>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                                   LIBRARY                                  */
/* -------------------------------------------------------------------------- */

const LibrarySummary = ({
  jobs,
  getJobCandidates,
  selectedJobId,
  isSearching,
  onNewDescription,
}) => {
  const totalCandidates = jobs.reduce(
    (sum, job) => sum + getJobCandidates(job.id).length,
    0
  );

  const sourcedRoles = jobs.filter(
    (job) => getJobCandidates(job.id).length > 0
  ).length;

  return (
    <div className="library-summary">
      <div className="library-summary-items">
        <SummaryItem
          label="Descriptions"
          value={jobs.length}
          icon={<BriefcaseBusiness size={15} />}
        />

        <SummaryDivider />

        <SummaryItem
          label="Sourced roles"
          value={sourcedRoles}
          icon={<Check size={15} />}
        />

        <SummaryDivider />

        <SummaryItem
          label="Candidates"
          value={totalCandidates}
          icon={<Users size={15} />}
        />

      {isSearching && selectedJobId && (
        <>
          <SummaryDivider />

          <div className="library-live-search">
            <span className="live-dot" />

            <div>
              <strong>Search running</strong>
              <span>Candidate sourcing is active</span>
            </div>
          </div>
        </>
      )}
      </div>

      {onNewDescription && (
        <button
          className="sourcing-primary-button"
          onClick={onNewDescription}
        >
          <Plus size={16} />
          New description
        </button>
      )}
    </div>
  );
};

const SummaryItem = ({ label, value, icon }) => (
  <div className="summary-item">
    <div className="summary-icon">{icon}</div>

    <div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  </div>
);

const SummaryDivider = () => (
  <div className="summary-divider" />
);

const RoleRow = ({
  job,
  candidateCount,
  isSearching,
  isSelected,
  onOpen,
  onEdit,
}) => {
  const meta = getRoleMeta(job);

  return (
    <article
      className={`role-row ${
        isSelected ? "role-row-selected" : ""
      }`}
      onClick={onOpen}
    >
      <div className="role-row-main">
        <div className="role-row-accent" />

        <div className="role-row-content">
          <div className="role-row-title-line">
            <h3>{job.title || "Untitled role"}</h3>

            {isSelected && (
              <span className="current-role-label">
                Current
              </span>
            )}
          </div>

          {meta.length > 0 && (
            <div className="role-row-meta">
              {meta.slice(0, 4).map((item, index) => (
                <React.Fragment key={`${item}-${index}`}>
                  {index > 0 && <span className="meta-dot">·</span>}
                  <span>{item}</span>
                </React.Fragment>
              ))}
            </div>
          )}

          {job.description && (
            <p>
              {job.description.length > 155
                ? `${job.description.slice(0, 155)}…`
                : job.description}
            </p>
          )}
        </div>
      </div>

      <div className="role-candidate-stat">
        <strong>{candidateCount}</strong>
        <span>candidates</span>
      </div>

      <div className="role-search-status">
        {isSearching ? (
          <>
            <span className="status-orb status-orb-live" />
            <div>
              <strong>Searching</strong>
              <span>Finding profiles</span>
            </div>
          </>
        ) : candidateCount > 0 ? (
          <>
            <span className="status-orb" />
            <div>
              <strong>Search ready</strong>
              <span>Results available</span>
            </div>
          </>
        ) : (
          <>
            <span className="status-orb status-orb-neutral" />
            <div>
              <strong>Not sourced</strong>
              <span>Ready to search</span>
            </div>
          </>
        )}
      </div>

      <div className="role-row-actions">
        {onEdit && (
          <button
            className="role-row-icon-button"
            onClick={(event) => {
              event.stopPropagation();
              onEdit();
            }}
            title="Edit description"
          >
            <Edit3 size={15} />
          </button>
        )}

        <button
          className="role-open-button"
          onClick={(event) => {
            event.stopPropagation();
            onOpen();
          }}
        >
          Open
          <ArrowRight size={14} />
        </button>
      </div>
    </article>
  );
};

/* -------------------------------------------------------------------------- */
/*                                ROLE DETAILS                                */
/* -------------------------------------------------------------------------- */

const RoleMeta = ({ job }) => {
  const meta = getRoleMeta(job);

  if (!meta.length) return null;

  return (
    <div className="workspace-role-meta">
      {meta.slice(0, 6).map((item, index) => (
        <React.Fragment key={`${item}-${index}`}>
          {index > 0 && <span>·</span>}
          <span>{item}</span>
        </React.Fragment>
      ))}
    </div>
  );
};

const getRoleMeta = (job = {}) => {
  const items = [];

  if (job.seniority) items.push(job.seniority);
  if (job.location) items.push(job.location);

  if (job.minExperience || job.experience) {
    items.push(
      job.experience ||
        `${job.minExperience}+ years`
    );
  }

  const skills =
    job.skills ||
    job.technologies ||
    job.techStack ||
    [];

  if (Array.isArray(skills)) {
    items.push(...skills.slice(0, 3));
  }

  return items.filter(Boolean);
};

/* -------------------------------------------------------------------------- */
/*                                EMPTY STATE                                 */
/* -------------------------------------------------------------------------- */

const EmptyCandidateState = ({ activeJob, onSearch }) => (
  <div className="candidate-empty">
    <div className="empty-search-visual">
      <div className="empty-circle empty-circle-one" />
      <div className="empty-circle empty-circle-two" />

      <Search size={23} />
    </div>

    <h3>No candidates sourced yet</h3>

    <p>
      Run sourcing using the{" "}
      <strong>{activeJob?.title || "role"}</strong>{" "}
      description, or add a refinement first.
    </p>

    <button
      className="sourcing-primary-button"
      onClick={() =>
        onSearch?.(
          activeJob?.description ||
            activeJob?.prompt ||
            "",
          { maxResults: activeJob?.maxResults || 10 },
          activeJob?.id
        )
      }
    >
      <Sparkles size={15} />
      Start sourcing
    </button>
  </div>
);

/* -------------------------------------------------------------------------- */
/*                                    CSS                                     */
/* -------------------------------------------------------------------------- */

const styles = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap');

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
  align-items: flex-start;
  gap: 32px;
  margin-bottom: 27px;
}

.sourcing-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 9px;
  color: var(--cyan-dark);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .12em;
}

.sourcing-page-header h1,
.role-workspace-header h1 {
  margin: 0;
  font-family: "Space Grotesk", sans-serif;
  letter-spacing: -.04em;
}

.sourcing-page-header h1 {
  font-size: 31px;
}

.sourcing-page-header > div > p {
  max-width: 620px;
  margin: 7px 0 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.6;
}

.sourcing-primary-button,
.sourcing-secondary-button,
.workspace-action-button,
.role-open-button,
.role-row-icon-button,
.back-to-library {
  font: inherit;
  cursor: pointer;
}

.sourcing-primary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 38px;
  padding: 0 15px;
  border: 1px solid #15191F;
  border-radius: 9px;
  background: #15191F;
  color: white;
  font-size: 12px;
  font-weight: 600;
  transition: .18s ease;
}

.sourcing-primary-button:hover {
  transform: translateY(-1px);
  background: #252A32;
}

.library-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 22px;
  min-height: 70px;
  padding: 0 22px;
  margin-bottom: 14px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #F7F5F1;
}

.library-summary-items {
  display: flex;
  align-items: center;
  gap: 22px;
}

.summary-item,
.library-live-search {
  display: flex;
  align-items: center;
  gap: 10px;
}

.summary-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 29px;
  height: 29px;
  border: 1px solid #D8EEF3;
  border-radius: 8px;
  background: var(--cyan-soft);
  color: var(--cyan-dark);
}

.summary-item > div:last-child,
.library-live-search > div {
  display: flex;
  flex-direction: column;
}

.summary-item strong {
  font-family: "Space Grotesk", sans-serif;
  font-size: 15px;
}

.summary-item span,
.library-live-search span {
  margin-top: 1px;
  color: var(--muted);
  font-size: 10px;
}

.summary-divider {
  width: 1px;
  height: 30px;
  background: var(--border);
}

.library-live-search {
  margin-left: auto;
}

.library-live-search strong {
  font-size: 11px;
}

.live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--cyan);
  box-shadow: 0 0 0 5px rgba(11,165,201,.10);
  animation: sourcingPulse 1.7s infinite;
}

/* Library */

.role-library {
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 13px;
  background: var(--surface);
}

.role-library-header,
.role-row {
  display: grid;
  grid-template-columns: minmax(330px, 1fr) 105px 145px 130px;
  align-items: center;
}

.role-library-header {
  min-height: 38px;
  padding: 0 17px;
  border-bottom: 1px solid var(--border);
  background: #F7F5F1;
  color: #8A8D93;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .09em;
  text-transform: uppercase;
}

.role-row {
  position: relative;
  min-height: 108px;
  padding: 0 17px;
  border-bottom: 1px solid #ECE9E3;
  cursor: pointer;
  transition:
    background .18s ease,
    transform .18s ease;
}

.role-row:last-child {
  border-bottom: 0;
}

.role-row:hover {
  z-index: 2;
  background: #FBFDFC;
}

.role-row:hover .role-row-accent {
  transform: scaleY(1);
}

.role-row-selected {
  background: #FBFDFD;
}

.role-row-main {
  display: flex;
  align-items: stretch;
  min-width: 0;
  height: 100%;
}

.role-row-accent {
  width: 3px;
  margin: 22px 13px 22px -17px;
  border-radius: 99px;
  background: var(--cyan);
  transform: scaleY(.18);
  transform-origin: center;
  transition: transform .2s ease;
}

.role-row-selected .role-row-accent {
  transform: scaleY(.7);
}

.role-row-content {
  align-self: center;
  min-width: 0;
  padding: 14px 0;
}

.role-row-title-line {
  display: flex;
  align-items: center;
  gap: 8px;
}

.role-row-title-line h3 {
  overflow: hidden;
  margin: 0;
  font-family: "Space Grotesk", sans-serif;
  font-size: 14px;
  font-weight: 650;
  letter-spacing: -.02em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.current-role-label {
  padding: 2px 6px;
  border: 1px solid #CDEAF0;
  border-radius: 999px;
  color: var(--cyan-dark);
  font-size: 8px;
  font-weight: 700;
  text-transform: uppercase;
}

.role-row-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 5px;
  color: #71757D;
  font-size: 10px;
}

.meta-dot {
  color: #C2BEB7;
}

.role-row-content p {
  overflow: hidden;
  max-width: 670px;
  margin: 8px 20px 0 0;
  color: #777A81;
  font-size: 10px;
  line-height: 1.55;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.role-candidate-stat {
  display: flex;
  flex-direction: column;
}

.role-candidate-stat strong {
  font-family: "Space Grotesk", sans-serif;
  font-size: 17px;
  letter-spacing: -.03em;
}

.role-candidate-stat span {
  margin-top: 2px;
  color: var(--muted);
  font-size: 9px;
}

.role-search-status {
  display: flex;
  align-items: center;
  gap: 9px;
}

.role-search-status div {
  display: flex;
  flex-direction: column;
}

.role-search-status strong {
  font-size: 10px;
}

.role-search-status div span {
  margin-top: 3px;
  color: var(--muted);
  font-size: 9px;
}

.status-orb {
  width: 7px;
  height: 7px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: var(--cyan);
}

.status-orb-live {
  box-shadow: 0 0 0 5px rgba(11,165,201,.10);
  animation: sourcingPulse 1.7s infinite;
}

.status-orb-neutral {
  background: #B9B8B4;
}

.role-row-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
}

.role-row-icon-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: white;
  color: #696D74;
}

.role-open-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 32px;
  padding: 0 10px;
  border: 1px solid #D2EEF4;
  border-radius: 8px;
  background: var(--cyan-soft);
  color: var(--cyan-dark);
  font-size: 10px;
  font-weight: 700;
}

.role-row-icon-button:hover,
.role-open-button:hover {
  transform: translateY(-1px);
}

/* Pagination */

.role-library-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 11px 17px;
  border-top: 1px solid var(--border);
  background: #F7F5F1;
}

.pagination-info {
  font-size: 10px;
  font-weight: 600;
  color: var(--muted);
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}

.pagination-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 29px;
  height: 29px;
  padding: 0 6px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: white;
  color: var(--ink);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: .15s ease;
}

.pagination-btn:disabled {
  opacity: 0.35;
  cursor: default;
}

.pagination-btn:not(:disabled):hover {
  border-color: var(--cyan-dark);
  color: var(--cyan-dark);
}

.pagination-btn.pagination-num.active {
  background: var(--ink);
  border-color: var(--ink);
  color: white;
}

/* Workspace */

.back-to-library {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
  margin-bottom: 19px;
  border: 0;
  background: transparent;
  color: #696D74;
  font-size: 11px;
}

.back-to-library:hover {
  color: var(--cyan-dark);
}

.role-workspace-header {
  display: flex;
  justify-content: space-between;
  gap: 35px;
  padding-bottom: 22px;
}

.role-workspace-main {
  max-width: 850px;
}

.role-title-row {
  display: flex;
  align-items: center;
  gap: 11px;
}

.role-workspace-header h1 {
  font-size: 28px;
}

.role-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: 999px;
  color: #656970;
  font-size: 9px;
  font-weight: 600;
}

.role-status-pill > span {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--cyan);
}

.workspace-role-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px;
  margin-top: 8px;
  color: #656970;
  font-size: 10px;
}

.workspace-role-meta > span:nth-child(even) {
  color: #BDB9B2;
}

.role-description-preview {
  display: -webkit-box;
  overflow: hidden;
  max-width: 770px;
  margin: 12px 0 0;
  color: #70747B;
  font-size: 11px;
  line-height: 1.65;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.role-header-actions {
  flex-shrink: 0;
}

.sourcing-secondary-button {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 35px;
  padding: 0 11px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: white;
  color: #4C5057;
  font-size: 10px;
  font-weight: 600;
}

.sourcing-secondary-button:hover {
  border-color: #C9DDE1;
  color: var(--cyan-dark);
}

.workspace-divider {
  height: 1px;
  margin-bottom: 14px;
  background: var(--border);
}

/* Candidate workspace */

.candidate-workspace {
  margin-top: 16px;
  border-top: 1px solid var(--border);
}

.candidate-workspace-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 72px;
}

.candidate-heading {
  display: flex;
  align-items: center;
  gap: 11px;
}

.candidate-heading-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 1px solid #D6EDF2;
  border-radius: 9px;
  background: var(--cyan-soft);
  color: var(--cyan-dark);
}

.candidate-heading-line {
  display: flex;
  align-items: center;
  gap: 8px;
}

.candidate-heading h2 {
  margin: 0;
  font-family: "Space Grotesk", sans-serif;
  font-size: 15px;
  letter-spacing: -.02em;
}

.candidate-heading p {
  margin: 3px 0 0;
  color: var(--muted);
  font-size: 9px;
}

.candidate-heading p strong {
  color: #54585F;
  font-weight: 600;
}

.candidate-count {
  min-width: 23px;
  padding: 2px 7px;
  border-radius: 999px;
  background: #F0F1EF;
  color: #575B62;
  font-size: 9px;
  font-weight: 700;
  text-align: center;
}

.candidate-actions {
  display: flex;
  gap: 6px;
}

.workspace-action-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: white;
  color: #575B62;
  font-size: 10px;
  font-weight: 600;
}

.workspace-action-button:hover:not(:disabled) {
  border-color: #CBE5EB;
  color: var(--cyan-dark);
}

.workspace-action-button:disabled {
  cursor: default;
  opacity: .65;
}

.candidate-grid-area {
  padding-top: 3px;
}

/* Empty */

.candidate-empty,
.role-library-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.candidate-empty {
  min-height: 300px;
  border: 1px dashed #DCD9D2;
  border-radius: 12px;
  background: #FBFAF8;
}

.candidate-empty h3,
.role-library-empty h3 {
  margin: 14px 0 0;
  font-family: "Space Grotesk", sans-serif;
  font-size: 14px;
}

.candidate-empty p,
.role-library-empty p {
  max-width: 410px;
  margin: 7px 0 15px;
  color: var(--muted);
  font-size: 10px;
  line-height: 1.6;
}

.empty-search-visual {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 61px;
  height: 61px;
  border: 1px solid #D7EDF2;
  border-radius: 18px;
  background: var(--cyan-soft);
  color: var(--cyan-dark);
}

.empty-circle {
  position: absolute;
  border: 1px solid rgba(11,165,201,.13);
  border-radius: 50%;
}

.empty-circle-one {
  width: 82px;
  height: 82px;
}

.empty-circle-two {
  width: 104px;
  height: 104px;
}

.role-library-empty {
  min-height: 320px;
}

.role-library-empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 47px;
  height: 47px;
  border: 1px solid #D7EDF2;
  border-radius: 13px;
  background: var(--cyan-soft);
  color: var(--cyan-dark);
}

/* animation */

@keyframes sourcingPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: .42; }
}

@keyframes sourcingSpin {
  to { transform: rotate(360deg); }
}

.spin {
  animation: sourcingSpin 1s linear infinite;
}

/* Responsive */

@media (max-width: 900px) {
  .role-library-header {
    display: none;
  }

  .role-row {
    grid-template-columns: 1fr auto;
    gap: 14px;
    padding: 18px;
  }

  .role-row-main {
    grid-column: 1 / -1;
  }

  .role-candidate-stat,
  .role-search-status {
    padding-left: 0;
  }

  .role-row-actions {
    grid-column: 2;
    grid-row: 2;
  }

  .library-summary {
    overflow-x: auto;
  }
}

@media (max-width: 650px) {
  .sourcing-page-header,
  .role-workspace-header,
  .candidate-workspace-top {
    align-items: stretch;
    flex-direction: column;
  }

  .candidate-workspace-top {
    gap: 12px;
    padding: 16px 0;
  }

  .candidate-actions {
    align-self: flex-start;
  }

  .role-row {
    grid-template-columns: 1fr;
  }

  .role-row-actions {
    grid-column: 1;
    grid-row: auto;
    justify-content: flex-start;
  }

  .role-search-status {
    display: none;
  }
}
`;

export default SourcingHubView;