import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Check,
  ChevronLeft,
  ChevronRight,
  Edit3,
  GitCompare,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";

import SearchConsole from "./SearchConsole";
import AgentStatusWidget from "./AgentStatusWidget";
import CandidateGridView from "./CandidateGridView";

// Score band drives the accent color used on the shortlist's average
// match badge in the workspace's Shortlisted tab.
const getScoreBand = (score) => {
  if (score >= 80) return "high";
  if (score >= 60) return "mid";
  return "low";
};

const getAvgScore = (list) => {
  if (!list.length) return 0;

  const total = list.reduce(
    (sum, candidate) => sum + (Number(candidate.matchScore) || 0),
    0
  );

  return Math.round(total / list.length);
};

const SourcingHubView = ({
  jobDescriptions = [],
  selectedJobId,
  candidates = [],
  jobResultsCache = {},
  searchKey,
  searchMode = "ai",
  shortlist = [],
  savedRoleCandidates = {},
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

  onSelectJob,
  onEditDescription,
  onNewDescription,
  onDeleteJob,
  onToggleSaveForJob,
  onViewDetails,
  onEdit,
  onDelete,
  onOpenComparator,

  allCandidates = [],
}) => {
  /*
   * The role opened in the sourcing workspace.
   */
  const [workspaceJobId, setWorkspaceJobId] = useState(null);

  /*
   * Search/filter for the role library.
   */
  const [roleSearch, setRoleSearch] = useState("");

  const [libraryPage, setLibraryPage] = useState(0);
  const [workspaceTab, setWorkspaceTab] = useState("sourced");

  // 6 role cards per page.
  const PAGE_SIZE = 6;

  /*
   * Sort most-recent first and filter by the role-library search.
   *
   * Search checks:
   * - title
   * - description
   * - prompt
   * - seniority
   * - location
   * - experience
   * - skills
   * - technologies
   * - tech stack
   */
  const sortedJobs = useMemo(() => {
    const query = roleSearch.trim().toLowerCase();

    const sorted = [...jobDescriptions].sort((a, b) => {
      const tA = Number(String(a.id).replace(/\D/g, "")) || 0;
      const tB = Number(String(b.id).replace(/\D/g, "")) || 0;

      return tB - tA;
    });

    if (!query) {
      return sorted;
    }

    return sorted.filter((job) => {
      const skills =
        job.skills ||
        job.technologies ||
        job.techStack ||
        [];

      const searchableText = [
        job.title,
        job.description,
        job.prompt,
        job.seniority,
        job.location,
        job.experience,
        job.minExperience,
        job.maxExperience,
        job.status,
        ...(Array.isArray(skills) ? skills : []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [jobDescriptions, roleSearch]);

  const totalPages = Math.ceil(
    sortedJobs.length / PAGE_SIZE
  );

  const pagedJobs = sortedJobs.slice(
    libraryPage * PAGE_SIZE,
    libraryPage * PAGE_SIZE + PAGE_SIZE
  );

  /*
   * When the search changes, always return to page 1.
   */
  useEffect(() => {
    setLibraryPage(0);
  }, [roleSearch]);

  const activeJob = useMemo(() => {
    const id = workspaceJobId || selectedJobId;

    return jobDescriptions.find(
      (job) => String(job.id) === String(id)
    );
  }, [
    jobDescriptions,
    workspaceJobId,
    selectedJobId,
  ]);

  const getJobCandidates = (jobId) => {
    if (!jobId) return [];

    const cached = jobResultsCache?.[jobId];

    if (Array.isArray(cached)) {
      return cached;
    }

    if (Array.isArray(cached?.candidates)) {
      return cached.candidates;
    }

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

  /*
   * Build an index across every candidate source available.
   */
  const candidateIndex = useMemo(() => {
    const index = new Map();

    const indexList = (list) => {
      if (!Array.isArray(list)) return;

      list.forEach((candidate) => {
        if (
          candidate &&
          candidate.id != null
        ) {
          index.set(
            String(candidate.id),
            candidate
          );
        }
      });
    };

    indexList(candidates);
    indexList(allCandidates);

    Object.values(jobResultsCache || {}).forEach(
      (cached) => {
        if (Array.isArray(cached)) {
          indexList(cached);
        } else if (
          Array.isArray(cached?.candidates)
        ) {
          indexList(cached.candidates);
        }
      }
    );

    return index;
  }, [
    candidates,
    allCandidates,
    jobResultsCache,
  ]);

  const shortlistedCandidates = useMemo(() => {
    const savedIds = activeJob
      ? savedRoleCandidates?.[activeJob.id] || []
      : [];

    return savedIds
      .map((id) =>
        candidateIndex.get(String(id))
      )
      .filter(Boolean);
  }, [
    activeJob,
    savedRoleCandidates,
    candidateIndex,
  ]);

  const visibleCandidates =
    workspaceTab === "shortlisted"
      ? shortlistedCandidates
      : displayCandidates;

  const avgShortlistScore = useMemo(
    () =>
      getAvgScore(shortlistedCandidates),
    [shortlistedCandidates]
  );

  const openRole = (job) => {
    setWorkspaceJobId(job.id);
    setWorkspaceTab("sourced");

    if (onSelectJob) {
      onSelectJob(job);
    }
  };

  const closeWorkspace = () => {
    setWorkspaceJobId(null);
  };

  /*
   * If the role currently open in the workspace gets deleted,
   * fall back to the library.
   */
  useEffect(() => {
    if (
      workspaceJobId &&
      !jobDescriptions.some(
        (job) =>
          String(job.id) ===
          String(workspaceJobId)
      )
    ) {
      setWorkspaceJobId(null);
    }
  }, [
    jobDescriptions,
    workspaceJobId,
  ]);

  /*
   * Keep pagination valid when roles are deleted or
   * filtered.
   */
  useEffect(() => {
    if (totalPages === 0) {
      setLibraryPage(0);
      return;
    }

    setLibraryPage((page) =>
      Math.min(page, totalPages - 1)
    );
  }, [totalPages]);

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh(activeJob?.id);
      return;
    }

    if (lastSearch && onSearch) {
      onSearch(
        lastSearch.query,
        lastSearch.filters,
        activeJob?.id ||
          lastSearch.jobId
      );

      return;
    }

    if (activeJob && onSearch) {
      onSearch(
        activeJob.description ||
          activeJob.prompt ||
          "",
        {
          maxResults:
            activeJob.maxResults || 10,
        },
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
            <h1>Your hiring roles</h1>

            <p>
              Manage role descriptions and the
              sourcing activity connected to each
              one.
            </p>
          </div>

          <div className="role-library-header-actions">
            <div className="role-search-box">
              <Search size={15} />

              <input
                type="text"
                value={roleSearch}
                onChange={(event) =>
                  setRoleSearch(
                    event.target.value
                  )
                }
                placeholder="Search roles..."
                aria-label="Search job descriptions"
              />

              {roleSearch && (
                <button
                  type="button"
                  className="role-search-clear"
                  onClick={() =>
                    setRoleSearch("")
                  }
                  aria-label="Clear role search"
                >
                  ×
                </button>
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
        </header>

        <LibrarySummary
          jobs={jobDescriptions}
          getJobCandidates={
            getJobCandidates
          }
          selectedJobId={selectedJobId}
          isSearching={isSearching}
        />

        <section className="role-library">
          {sortedJobs.length > 0 ? (
            <>
              <div className="role-card-grid">
                {pagedJobs.map(
                  (job, index) => {
                    const jobCandidates =
                      getJobCandidates(
                        job.id
                      );

                    const isCurrent =
                      String(job.id) ===
                      String(selectedJobId);

                    const jobIsSearching =
                      isCurrent &&
                      isSearching;

                    const isLoneTrailingCard =
                      index ===
                        pagedJobs.length - 1 &&
                      pagedJobs.length % 2 !== 0;

                    return (
                      <RoleCard
                        key={job.id}
                        job={job}
                        candidateCount={
                          jobCandidates.length
                        }
                        isSearching={
                          jobIsSearching
                        }
                        isSelected={
                          isCurrent
                        }
                        isSpanning={
                          isLoneTrailingCard
                        }
                        onOpen={() =>
                          openRole(job)
                        }
                        onEdit={
                          onEditDescription
                            ? () =>
                                onEditDescription(
                                  job
                                )
                            : undefined
                        }
                        onDeleteJob={
                          onDeleteJob
                        }
                      />
                    );
                  }
                )}
              </div>

              {totalPages > 1 && (
                <div className="role-pagination">
                  <button
                    onClick={() =>
                      setLibraryPage(
                        (page) =>
                          Math.max(
                            0,
                            page - 1
                          )
                      )
                    }
                    disabled={
                      libraryPage === 0
                    }
                    className="pagination-button"
                  >
                    <ChevronLeft size={14} />
                    Previous
                  </button>

                  <div className="pagination-pages">
                    {Array.from(
                      {
                        length: totalPages,
                      },
                      (_, index) => (
                        <button
                          key={index}
                          onClick={() =>
                            setLibraryPage(
                              index
                            )
                          }
                          className={`pagination-page ${
                            libraryPage ===
                            index
                              ? "active"
                              : ""
                          }`}
                        >
                          {index + 1}
                        </button>
                      )
                    )}
                  </div>

                  <button
                    onClick={() =>
                      setLibraryPage(
                        (page) =>
                          Math.min(
                            totalPages - 1,
                            page + 1
                          )
                      )
                    }
                    disabled={
                      libraryPage >=
                      totalPages - 1
                    }
                    className="pagination-button"
                  >
                    Next
                    <ChevronRight
                      size={14}
                    />
                  </button>
                </div>
              )}
            </>
          ) : roleSearch ? (
            <div className="role-library-empty">
              <div className="role-library-empty-icon">
                <Search size={22} />
              </div>

              <h3>
                No roles found
              </h3>

              <p>
                No job descriptions match{" "}
                <strong>
                  "{roleSearch}"
                </strong>
                .
              </p>

              <button
                className="sourcing-secondary-button"
                onClick={() =>
                  setRoleSearch("")
                }
              >
                Clear search
              </button>
            </div>
          ) : (
            <div className="role-library-empty">
              <div className="role-library-empty-icon">
                <BriefcaseBusiness
                  size={22}
                />
              </div>

              <h3>
                No role descriptions yet
              </h3>

              <p>
                Create a description first,
                then sourcing activity and
                candidates will appear here.
              </p>

              {onNewDescription && (
                <button
                  className="sourcing-primary-button"
                  onClick={
                    onNewDescription
                  }
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

      <section className="role-workspace-card">
        <div className="role-workspace-icon">
          <BriefcaseBusiness size={18} />
        </div>

        <div className="role-workspace-main">
          <div className="role-title-row">
            <h1>
              {activeJob?.title ||
                "Untitled role"}
            </h1>

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
              onClick={() =>
                onEditDescription(
                  activeJob
                )
              }
            >
              <Edit3 size={15} />
              Edit description
            </button>
          )}

          {onDeleteJob &&
            activeJob && (
              <button
                className="role-card-icon-button role-card-icon-button-danger"
                onClick={(event) =>
                  onDeleteJob(
                    event,
                    activeJob.id
                  )
                }
                title="Delete description"
              >
                <Trash2 size={15} />
              </button>
            )}
        </div>
      </section>

      <SearchConsole
        onSearch={onSearch}
        isSearching={isSearching}
        selectedJob={activeJob}
        searchMode={searchMode}
        onSearchModeChange={
          onSearchModeChange
        }
        sourcedCandidateCount={
          displayCandidates.length
        }
      />

      <section className="candidate-workspace">
        <div className="candidate-workspace-top">
          <div className="candidate-heading">
            <div className="candidate-heading-icon">
              <Users size={16} />
            </div>

            <div>
              <div className="candidate-heading-line">
                <h2>
                  Candidate profiles
                </h2>

                <span className="candidate-count">
                  {
                    visibleCandidates.length
                  }
                </span>

                {workspaceTab ===
                    "shortlisted" &&
                  shortlistedCandidates.length >
                    0 && (
                    <span
                      className={`avg-match-badge avg-match-${getScoreBand(
                        avgShortlistScore
                      )}`}
                    >
                      {avgShortlistScore}%
                      {" "}avg match
                    </span>
                  )}
              </div>

              <p>
                {workspaceTab ===
                "shortlisted"
                  ? "Shortlisted for"
                  : "Sourced for"}{" "}
                <strong>
                  {activeJob?.title ||
                    "this role"}
                </strong>
              </p>
            </div>
          </div>

          <div className="candidate-view-tabs">
            <button
              type="button"
              className={
                workspaceTab === "sourced"
                  ? "candidate-view-tab active"
                  : "candidate-view-tab"
              }
              onClick={() =>
                setWorkspaceTab("sourced")
              }
            >
              Sourced
              <span className="candidate-view-tab-count">
                {displayCandidates.length}
              </span>
            </button>

            <button
              type="button"
              className={
                workspaceTab ===
                "shortlisted"
                  ? "candidate-view-tab active"
                  : "candidate-view-tab"
              }
              onClick={() =>
                setWorkspaceTab(
                  "shortlisted"
                )
              }
            >
              Shortlisted
              <span className="candidate-view-tab-count">
                {
                  shortlistedCandidates.length
                }
              </span>
            </button>
          </div>

          <div className="candidate-actions">
            {visibleCandidates.length >
              1 && (
              <button
                className="workspace-action-button"
                onClick={onCompare}
              >
                <GitCompare size={15} />
                Compare
              </button>
            )}

            {workspaceTab ===
              "sourced" && (
              <button
                className="workspace-action-button workspace-action-primary"
                onClick={handleRefresh}
                disabled={isSearching}
              >
                <RefreshCw
                  size={15}
                  className={
                    isSearching
                      ? "spin"
                      : ""
                  }
                />

                {isSearching
                  ? "Searching"
                  : "Refresh"}
              </button>
            )}
          </div>
        </div>

        {isSearching && (
          <AgentStatusWidget
            currentStep={agentStep}
            totalCandidatesFound={
              displayCandidates.length
            }
          />
        )}

        <div className="candidate-grid-area">
          {visibleCandidates.length >
          0 ? (
            <CandidateGridView
              candidates={
                visibleCandidates
              }
              shortlist={shortlist}
              savedRoleCandidates={
                savedRoleCandidates
              }
              selectedJobId={
                activeJob?.id
              }
              searchKey={searchKey}
              lang={lang}
              t={t}
              onToggleSaveForJob={
                onToggleSaveForJob
              }
              onViewDetails={
                onViewDetails
              }
              onEdit={onEdit}
              onDelete={onDelete}
              onOpenComparator={
                onOpenComparator
              }
              {...candidateGridProps}
            />
          ) : !isSearching ? (
            workspaceTab ===
            "shortlisted" ? (
              <EmptyShortlistState
                activeJob={activeJob}
              />
            ) : (
              <EmptyCandidateState
                activeJob={activeJob}
                onSearch={onSearch}
              />
            )
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
}) => {
  const totalCandidates = jobs.reduce(
    (sum, job) =>
      sum +
      getJobCandidates(job.id).length,
    0
  );

  const sourcedRoles = jobs.filter(
    (job) =>
      getJobCandidates(job.id).length >
      0
  ).length;

  return (
    <div className="library-summary">
      <SummaryItem
        label="Descriptions"
        value={jobs.length}
        icon={
          <BriefcaseBusiness size={14} />
        }
      />

      <SummaryDivider />

      <SummaryItem
        label="Sourced roles"
        value={sourcedRoles}
        icon={<Check size={14} />}
      />

      <SummaryDivider />

      <SummaryItem
        label="Candidates"
        value={totalCandidates}
        icon={<Users size={14} />}
      />

      {isSearching &&
        selectedJobId && (
          <div className="library-live-search">
            <span className="live-dot" />

            <div>
              <strong>
                Search running
              </strong>
              <span>
                Candidate sourcing is
                active
              </span>
            </div>
          </div>
        )}
    </div>
  );
};

const SummaryItem = ({
  label,
  value,
  icon,
}) => (
  <div className="summary-item">
    <span className="summary-icon">
      {icon}
    </span>

    <strong>{value}</strong>

    <span className="summary-label">
      {label}
    </span>
  </div>
);

const SummaryDivider = () => (
  <div className="summary-divider" />
);

const RoleCard = ({
  job,
  candidateCount,
  isSearching,
  isSelected,
  isSpanning,
  onOpen,
  onEdit,
  onDeleteJob,
}) => {
  const meta = getRoleMeta(job);

  return (
    <article
      className={`role-card ${
        isSelected
          ? "role-card-selected"
          : ""
      } ${
        isSpanning
          ? "role-card-span"
          : ""
      }`}
      onClick={onOpen}
    >
      <div className="role-card-top">
        <div className="role-card-title-block">
          <h3>
            {job.title ||
              "Untitled role"}
          </h3>

          {isSelected && (
            <span className="current-role-label">
              Current
            </span>
          )}
        </div>

        <div className="role-card-top-actions">
          {onEdit && (
            <button
              className="role-card-icon-button"
              onClick={(event) => {
                event.stopPropagation();
                onEdit();
              }}
              title="Edit description"
            >
              <Edit3 size={14} />
            </button>
          )}

          {onDeleteJob && (
            <button
              className="role-card-icon-button role-card-icon-button-danger"
              onClick={(event) => {
                event.stopPropagation();
                onDeleteJob(
                  event,
                  job.id
                );
              }}
              title="Delete description"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {meta.length > 0 && (
        <div className="role-card-tags">
          {meta
            .slice(0, 4)
            .map((item, index) => (
              <span
                className="role-tag"
                key={`${item}-${index}`}
              >
                {item}
              </span>
            ))}
        </div>
      )}

      {job.description && (
        <p className="role-card-description">
          {job.description.length >
          140
            ? `${job.description.slice(
                0,
                140
              )}…`
            : job.description}
        </p>
      )}

      <div className="role-card-footer">
        <div className="role-card-stat">
          <strong>
            {candidateCount}
          </strong>

          <span>
            candidates
          </span>
        </div>

        <div className="role-card-status">
          {isSearching ? (
            <>
              <span className="status-orb status-orb-live" />
              <span>
                Searching
              </span>
            </>
          ) : candidateCount > 0 ? (
            <>
              <span className="status-orb" />
              <span>
                Ready
              </span>
            </>
          ) : (
            <>
              <span className="status-orb status-orb-neutral" />
              <span>
                Not sourced
              </span>
            </>
          )}
        </div>

        <button
          className="role-open-button"
          onClick={(event) => {
            event.stopPropagation();
            onOpen();
          }}
        >
          Open
          <ArrowRight size={13} />
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

  if (!meta.length) {
    return null;
  }

  return (
    <div className="workspace-role-meta">
      {meta
        .slice(0, 6)
        .map((item, index) => (
          <span
            className="role-tag"
            key={`${item}-${index}`}
          >
            {item}
          </span>
        ))}
    </div>
  );
};

const getRoleMeta = (job = {}) => {
  const items = [];

  if (job.seniority) {
    items.push(job.seniority);
  }

  if (job.location) {
    items.push(job.location);
  }

  if (
    job.minExperience ||
    job.experience
  ) {
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

const EmptyShortlistState = ({
  activeJob,
}) => (
  <div className="candidate-empty">
    <div className="empty-search-visual">
      <div className="empty-circle empty-circle-one" />
      <div className="empty-circle empty-circle-two" />

      <Users size={22} />
    </div>

    <h3>
      No candidates shortlisted yet
    </h3>

    <p>
      Save candidates from the{" "}
      <strong>Sourced</strong> tab for{" "}
      <strong>
        {activeJob?.title ||
          "this role"}
      </strong>{" "}
      to build a talent pool here.
    </p>
  </div>
);

const EmptyCandidateState = ({
  activeJob,
  onSearch,
}) => (
  <div className="candidate-empty">
    <div className="empty-search-visual">
      <div className="empty-circle empty-circle-one" />
      <div className="empty-circle empty-circle-two" />

      <Search size={22} />
    </div>

    <h3>
      No candidates sourced yet
    </h3>

    <p>
      Run sourcing using the{" "}
      <strong>
        {activeJob?.title ||
          "role"}
      </strong>{" "}
      description, or add a refinement
      first.
    </p>

    <button
      className="sourcing-primary-button"
      onClick={() =>
        onSearch?.(
          activeJob?.description ||
            activeJob?.prompt ||
            "",
          {
            maxResults:
              activeJob?.maxResults ||
              10,
          },
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

/* -------------------------------------------------------------------------- */
/* Page header                                                                */
/* -------------------------------------------------------------------------- */

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

/* Header actions */

.role-library-header-actions {
  display: flex;
  align-items: center;
  gap: 9px;
  flex-shrink: 0;
}

/* Role search */

.role-search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 220px;
  height: 40px;
  padding: 0 11px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  color: #8A8D92;
  transition:
    border-color .16s ease,
    box-shadow .16s ease,
    background .16s ease;
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
  transition:
    background .15s ease,
    color .15s ease;
}

.role-search-clear:hover {
  background: var(--cyan-soft);
  color: var(--cyan-dark);
}

/* Buttons */

.sourcing-primary-button,
.sourcing-secondary-button,
.workspace-action-button,
.role-open-button,
.role-card-icon-button,
.back-to-library {
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

/* -------------------------------------------------------------------------- */
/* Stat rail                                                                  */
/* -------------------------------------------------------------------------- */

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

.library-live-search {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-left: auto;
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--cyan-soft);
}

.library-live-search > div {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}

.library-live-search strong {
  color: var(--cyan-dark);
  font-size: 11px;
}

.library-live-search span {
  color: var(--cyan-dark);
  font-size: 9.5px;
  opacity: .8;
}

.live-dot {
  width: 7px;
  height: 7px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--cyan);
  box-shadow: 0 0 0 4px rgba(11,165,201,.15);
  animation: sourcingPulse 1.7s infinite;
}

/* -------------------------------------------------------------------------- */
/* Role card grid                                                             */
/* -------------------------------------------------------------------------- */

.role-card-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  align-items: stretch;
  gap: 14px;
}

.role-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 18px 18px 16px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface);
  cursor: pointer;
  outline: none;
  transition:
    border-color .16s ease,
    transform .16s ease,
    box-shadow .16s ease;
}

.role-card:focus,
.role-card:focus-visible,
.role-open-button:focus,
.role-card-icon-button:focus {
  outline: none;
}

.role-card:focus-visible {
  border-color: var(--cyan);
  box-shadow: 0 0 0 3px var(--cyan-soft);
}

.role-open-button:focus-visible,
.role-card-icon-button:focus-visible {
  box-shadow: 0 0 0 3px var(--cyan-soft);
}

.role-card-span {
  grid-column: 1 / -1;
}

.role-card-span .role-card-description {
  max-width: 640px;
}

.role-card:hover {
  transform: translateY(-2px);
  border-color: #C9E8EE;
  box-shadow: 0 8px 20px rgba(18,21,27,.05);
}

.role-card-selected {
  border-color: var(--cyan);
  background: #FBFEFE;
}

.role-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.role-card-title-block {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.role-card-title-block h3 {
  overflow: hidden;
  margin: 0;
  font-family: "Space Grotesk", sans-serif;
  font-size: 15px;
  font-weight: 650;
  letter-spacing: -.02em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.current-role-label {
  flex-shrink: 0;
  padding: 2px 7px;
  border-radius: 999px;
  background: var(--cyan-soft);
  color: var(--cyan-dark);
  font-size: 9px;
  font-weight: 700;
}

.role-card-top-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.role-card-icon-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: white;
  color: #696D74;
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

.role-card-tags,
.workspace-role-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.role-card-tags {
  margin-top: 10px;
}

.role-tag {
  padding: 3px 9px;
  border-radius: 999px;
  background: var(--paper);
  color: #575B62;
  font-size: 10px;
  font-weight: 500;
}

.role-card-description {
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  margin: 10px 0 0;
  color: #777A81;
  font-size: 11px;
  line-height: 1.6;
}

.role-card-footer {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: auto;
  padding-top: 14px;
  border-top: 1px solid #ECE9E3;
}

.role-card-stat {
  display: flex;
  align-items: baseline;
  gap: 5px;
}

.role-card-stat strong {
  font-family: "Space Grotesk", sans-serif;
  font-size: 15px;
  letter-spacing: -.02em;
}

.role-card-stat span {
  color: var(--muted);
  font-size: 9.5px;
}

.role-card-status {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--muted);
  font-size: 10.5px;
  font-weight: 600;
}

.status-orb {
  width: 6px;
  height: 6px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--cyan);
}

.status-orb-live {
  box-shadow: 0 0 0 4px rgba(11,165,201,.15);
  animation: sourcingPulse 1.7s infinite;
}

.status-orb-neutral {
  background: #B9B8B4;
}

.role-open-button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-left: auto;
  padding: 6px 11px;
  border: none;
  border-radius: 8px;
  background: var(--cyan-soft);
  color: var(--cyan-dark);
  font-size: 10.5px;
  font-weight: 700;
  transition: background .15s ease;
}

.role-open-button:hover {
  background: #D9F1F6;
}

/* -------------------------------------------------------------------------- */
/* Pagination                                                                 */
/* -------------------------------------------------------------------------- */

.role-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 20px;
  margin-top: 10px;
}

.pagination-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #FFFFFF;
  color: var(--ink);
  font-family: Inter, sans-serif;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background .15s ease,
    border-color .15s ease;
}

.pagination-button:hover:not(:disabled) {
  background: var(--paper);
  border-color: #D8D4CA;
}

.pagination-button:disabled {
  background: var(--paper);
  color: #9B9C9E;
  cursor: not-allowed;
}

.pagination-pages {
  display: flex;
  gap: 6px;
}

.pagination-page {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #FFFFFF;
  color: var(--ink);
  font-family: Inter, sans-serif;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background .15s ease,
    border-color .15s ease,
    color .15s ease;
}

.pagination-page:hover:not(.active) {
  background: var(--paper);
  border-color: #D8D4CA;
}

.pagination-page.active {
  border-color: #0E7C8C;
  background: #0E7C8C;
  color: #FFFFFF;
}

/* -------------------------------------------------------------------------- */
/* Workspace                                                                  */
/* -------------------------------------------------------------------------- */

.back-to-library {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
  margin-bottom: 18px;
  border: 0;
  background: transparent;
  color: #696D74;
  font-size: 11.5px;
  font-weight: 500;
}

.back-to-library:hover {
  color: var(--cyan-dark);
}

.role-workspace-card {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 20px 22px;
  margin-bottom: 18px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface);
}

.role-workspace-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  border-radius: 11px;
  background: var(--cyan-soft);
  color: var(--cyan-dark);
}

.role-workspace-main {
  flex: 1;
  min-width: 0;
}

.role-title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 11px;
}

.role-workspace-main h1 {
  margin: 0;
  font-family: "Space Grotesk", sans-serif;
  font-size: 21px;
  letter-spacing: -.03em;
}

.role-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 9px;
  border-radius: 999px;
  background: var(--paper);
  color: #656970;
  font-size: 9.5px;
  font-weight: 600;
}

.role-status-pill > span {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--cyan);
}

.workspace-role-meta {
  margin-top: 10px;
}

.role-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
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

/* -------------------------------------------------------------------------- */
/* Candidate workspace                                                        */
/* -------------------------------------------------------------------------- */

.candidate-workspace {
  margin-top: 18px;
}

.candidate-workspace-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px 16px;
  padding: 16px 0;
}

.candidate-heading {
  display: flex;
  align-items: center;
  gap: 12px;
}

.candidate-heading-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: 10px;
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
  font-size: 10.5px;
}

.candidate-heading p strong {
  color: #54585F;
  font-weight: 600;
}

.candidate-count {
  min-width: 20px;
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--paper);
  color: #575B62;
  font-size: 10px;
  font-weight: 700;
  text-align: center;
}

.avg-match-badge {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 9.5px;
  font-weight: 700;
}

.avg-match-high {
  background: #E3F5EC;
  color: #278F5E;
}

.avg-match-mid {
  background: #FBF0DC;
  color: #C98A1E;
}

.avg-match-low {
  background: #FBEAE9;
  color: #B3261E;
}

.candidate-view-tabs {
  display: flex;
  gap: 4px;
  padding: 4px;
  border-radius: 11px;
  background: var(--paper);
}

.candidate-view-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #575B62;
  font: inherit;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background .15s ease,
    color .15s ease;
}

.candidate-view-tab:hover {
  color: var(--cyan-dark);
}

.candidate-view-tab.active {
  background: white;
  color: var(--ink);
  box-shadow: 0 1px 2px rgba(18,21,27,.06);
}

.candidate-view-tab-count {
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--border);
  color: #575B62;
  font-size: 9.5px;
  font-weight: 700;
}

.candidate-view-tab.active .candidate-view-tab-count {
  background: var(--cyan-soft);
  color: var(--cyan-dark);
}

.candidate-actions {
  display: flex;
  gap: 4px;
  padding: 4px;
  border-radius: 11px;
  background: var(--paper);
}

.workspace-action-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 11px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #575B62;
  font-size: 11px;
  font-weight: 600;
  transition:
    background .15s ease,
    color .15s ease;
}

.workspace-action-button:hover:not(:disabled) {
  background: white;
  color: var(--cyan-dark);
}

.workspace-action-primary {
  background: white;
  box-shadow: 0 1px 2px rgba(18,21,27,.06);
}

.workspace-action-button:disabled {
  cursor: default;
  opacity: .6;
}

.candidate-grid-area {
  padding-top: 4px;
}

/* -------------------------------------------------------------------------- */
/* Empty states                                                               */
/* -------------------------------------------------------------------------- */

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
  border-radius: 14px;
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
  font-size: 10.5px;
  line-height: 1.6;
}

.empty-search-visual {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  border: 1px solid #D7EDF2;
  border-radius: 16px;
  background: var(--cyan-soft);
  color: var(--cyan-dark);
}

.empty-circle {
  position: absolute;
  border: 1px solid rgba(11,165,201,.13);
  border-radius: 50%;
}

.empty-circle-one {
  width: 80px;
  height: 80px;
}

.empty-circle-two {
  width: 100px;
  height: 100px;
}

.role-library-empty {
  min-height: 320px;
  border: 1px dashed #DCD9D2;
  border-radius: 16px;
  background: #FBFAF8;
}

.role-library-empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  border-radius: 14px;
  background: var(--cyan-soft);
  color: var(--cyan-dark);
}

/* -------------------------------------------------------------------------- */
/* Animation                                                                  */
/* -------------------------------------------------------------------------- */

@keyframes sourcingPulse {
  0%, 100% {
    opacity: 1;
  }

  50% {
    opacity: .42;
  }
}

@keyframes sourcingSpin {
  to {
    transform: rotate(360deg);
  }
}

.spin {
  animation: sourcingSpin 1s linear infinite;
}

/* -------------------------------------------------------------------------- */
/* Responsive                                                                 */
/* -------------------------------------------------------------------------- */

@media (max-width: 900px) {
  .role-card-grid {
    grid-template-columns: 1fr;
  }

  .library-summary {
    overflow-x: auto;
  }
}

@media (max-width: 650px) {
  .sourcing-page-header,
  .role-workspace-card,
  .candidate-workspace-top {
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

  .role-library-header-actions
  .sourcing-primary-button {
    flex-shrink: 0;
  }

  .candidate-workspace-top {
    gap: 12px;
    padding: 16px 0;
  }

  .candidate-actions {
    align-self: flex-start;
  }

  .candidate-view-tabs {
    width: 100%;
    order: 3;
  }

  .candidate-view-tab {
    flex: 1;
    justify-content: center;
  }

  .role-card-footer {
    flex-wrap: wrap;
  }

  .role-pagination {
    gap: 8px;
    padding-left: 8px;
    padding-right: 8px;
  }

  .pagination-button {
    padding: 0 9px;
  }
}
`;

export default SourcingHubView;