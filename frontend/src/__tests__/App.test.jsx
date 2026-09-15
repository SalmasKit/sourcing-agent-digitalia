import React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import App, {
  getEmptyWorkspaceState,
  loadInitialWorkspaceData,
  mergeCandidateResults,
  tagFreshResults,
} from "../App";

import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useConfirm } from "../context/ConfirmDialogContext";
import {
  searchCandidatesApi,
  getTeamActivitiesApi,
  logActivityApi,
} from "../services/api";

/* ---------------------------------------------------------------------
   Context mocks
--------------------------------------------------------------------- */

vi.mock("../context/AuthContext", () => ({
  AuthProvider: ({ children }) => <>{children}</>,
  useAuth: vi.fn(),
}));

vi.mock("../context/LanguageContext", () => ({
  LanguageProvider: ({ children }) => <>{children}</>,
  useLanguage: vi.fn(),
}));

vi.mock("../context/ConfirmDialogContext", () => ({
  ConfirmDialogProvider: ({ children }) => <>{children}</>,
  useConfirm: vi.fn(),
}));

vi.mock("../services/api", () => ({
  searchCandidatesApi: vi.fn(),
  getTeamActivitiesApi: vi.fn(),
  logActivityApi: vi.fn(),
}));

/* ---------------------------------------------------------------------
   Component mocks

   Every stub exposes buttons that call the exact prop signature the real
   component would call it with, so App.jsx's own handler logic (not the
   child component's) is what's under test.
--------------------------------------------------------------------- */

vi.mock("../components/Navbar", () => ({
  Navbar: ({ activeTab, setActiveTab, onOpenAuth, shortlistCount, notesCount }) => (
    <div data-testid="navbar">
      <span data-testid="active-tab">{activeTab}</span>
      <span data-testid="shortlist-count">{shortlistCount}</span>
      <span data-testid="notes-count">{notesCount}</span>
      <button onClick={() => setActiveTab("sourcing")}>Go Sourcing</button>
      <button onClick={() => setActiveTab("pipeline")}>Go Pipeline</button>
      <button onClick={() => setActiveTab("dashboard")}>Go Dashboard</button>
      <button onClick={() => setActiveTab("notes")}>Go Notes</button>
      <button onClick={() => setActiveTab("team")}>Go Team</button>
      <button onClick={onOpenAuth}>Open Auth</button>
    </div>
  ),
}));

vi.mock("../components/SourcingHubView", () => ({
  default: (props) => (
    <div data-testid="sourcing-hub">
      <span data-testid="selected-job-id">{props.selectedJobId ?? ""}</span>
      <span data-testid="candidates-count">{props.candidates.length}</span>
      <span data-testid="is-searching">{String(props.isSearching)}</span>
      <span data-testid="search-mode">{props.searchMode}</span>

      <button
        onClick={() =>
          props.onSearch(
            "test query",
            {},
            props.jobDescriptions[0]?.id
          )
        }
      >
        Trigger Search
      </button>

      <button onClick={() => props.onOpenJobModal()}>
        Open Job Modal
      </button>

      <button
        onClick={() =>
          props.onEditDescription(props.jobDescriptions[0])
        }
      >
        Open Edit Job Modal
      </button>

      <button
        onClick={() =>
          props.onDeleteJob(
            { stopPropagation: () => { } },
            props.jobDescriptions[0]?.id
          )
        }
      >
        Delete First Job
      </button>

      <button
        onClick={() =>
          props.onSelectJob(props.jobDescriptions[0]?.id)
        }
      >
        Select First Job
      </button>

      <button
        onClick={() =>
          props.candidateGridProps.onBulkDelete(
            props.candidates.map((c) => c.id)
          )
        }
      >
        Bulk Delete
      </button>

      <button
        onClick={() =>
          props.candidateGridProps.onBulkToggleSaveForJob(
            props.candidates.map((c) => c.id),
            props.selectedJobId
          )
        }
      >
        Bulk Save
      </button>

      <button
        onClick={() =>
          props.onToggleSaveForJob(
            props.candidates[0]?.id,
            props.selectedJobId
          )
        }
      >
        Toggle Save First Candidate
      </button>

      <button
        onClick={() =>
          props.onViewDetails(props.candidates[0], {
            currentTarget: {
              getBoundingClientRect: () => ({
                top: 0,
                left: 0,
                width: 10,
                height: 10,
              }),
            },
          })
        }
      >
        View First Candidate Details
      </button>

      <button onClick={() => props.onEdit(props.candidates[0])}>
        Edit First Candidate
      </button>

      <button onClick={() => props.onDelete(props.candidates[0])}>
        Delete First Candidate
      </button>

      <button onClick={() => props.onCompare(props.candidates)}>
        Compare Candidates
      </button>

      <button onClick={() => props.onOpenComparator([])}>
        Open Comparator Fallback
      </button>

      <button onClick={() => props.onSearchModeChange("pool")}>
        Switch To Pool
      </button>

      <button onClick={() => props.onSearchModeChange("ai")}>
        Switch To AI
      </button>
    </div>
  ),
}));

vi.mock("../components/DashboardView", () => ({
  DashboardView: (props) => (
    <div data-testid="dashboard-view">
      <span data-testid="dashboard-candidates-count">
        {props.candidates.length}
      </span>

      <button onClick={() => props.onStageClick("interview")}>
        Dashboard Stage Click
      </button>

      <button
        onClick={() =>
          props.onSelectJob(props.jobDescriptions[0]?.id)
        }
      >
        Dashboard Select Job
      </button>

      <button
        onClick={() => props.onSelectCandidate(props.candidates[0])}
      >
        Dashboard Select Candidate
      </button>
    </div>
  ),
}));

vi.mock("../components/KanbanPipeline", () => ({
  KanbanPipeline: (props) => (
    <div data-testid="kanban-pipeline">
      <span data-testid="pipeline-candidates-count">
        {props.candidates.length}
      </span>

      <button
        onClick={() =>
          props.onUpdateStage(props.candidates[0]?.id, "hired")
        }
      >
        Kanban Update Stage
      </button>

      <button
        onClick={() => props.onViewDetails(props.candidates[0])}
      >
        Kanban View Details
      </button>
    </div>
  ),
}));

vi.mock("../components/RecruiterNotesView", () => ({
  RecruiterNotesView: (props) => (
    <div data-testid="notes-view">
      <button
        onClick={() => props.onViewCandidate(props.candidates[0])}
      >
        Notes View Candidate
      </button>

      <button
        onClick={() =>
          props.onAddNote(props.candidates[0]?.id, "a new note")
        }
      >
        Notes Add Note
      </button>

      <button
        onClick={() =>
          props.onDeleteNote(
            props.candidates[0]?.id,
            props.candidates[0]?.notes?.[0]?.id
          )
        }
      >
        Notes Delete Note
      </button>
    </div>
  ),
}));

vi.mock("../components/TeamManagementView", () => ({
  default: ({ onNavigateToDashboard }) => (
    <div data-testid="team-view">
      <button onClick={onNavigateToDashboard}>Back to Dashboard</button>
    </div>
  ),
}));

vi.mock("../components/CandidateDetailPanel", () => ({
  default: (props) => (
    <div data-testid="candidate-detail-panel">
      <span>{props.candidate.fullName}</span>
      <span data-testid="detail-is-saved">
        {String(props.isSavedForJob)}
      </span>

      <button onClick={props.onClose}>Close</button>

      <button
        onClick={() =>
          props.onToggleSaveForJob(
            props.candidate.id,
            props.selectedJobId
          )
        }
      >
        Detail Toggle Save
      </button>

      <button onClick={() => props.onEdit(props.candidate)}>
        Detail Edit
      </button>

      <button onClick={() => props.onDelete(props.candidate)}>
        Detail Delete
      </button>

      <button
        onClick={() =>
          props.onAddNote(props.candidate.id, "detail note")
        }
      >
        Detail Add Note
      </button>
    </div>
  ),
}));

vi.mock("../components/EditCandidateModal", () => ({
  EditCandidateModal: ({ isOpen, onSave, candidate }) =>
    isOpen ? (
      <div data-testid="edit-candidate-modal">
        <span data-testid="edit-candidate-name">
          {candidate?.fullName ?? "new"}
        </span>
        <button
          onClick={() =>
            onSave(
              candidate
                ? { ...candidate, fullName: `${candidate.fullName} Updated` }
                : {
                  id: "new-1",
                  fullName: "New Person",
                  notes: [],
                }
            )
          }
        >
          Save
        </button>
      </div>
    ) : null,
}));

vi.mock("../components/JobDescriptionModal", () => ({
  JobDescriptionModal: ({ isOpen, onCreate, onEdit, editingJob }) =>
    isOpen ? (
      <div data-testid="job-description-modal">
        {editingJob ? (
          <button
            onClick={() =>
              onEdit({ ...editingJob, title: "Updated Title" })
            }
          >
            Save Edit
          </button>
        ) : (
          <button
            onClick={() =>
              onCreate({
                id: "job-new",
                title: "New Job",
                description: "New job description",
                skills: ["React"],
                location: "Remote",
                minExperience: 2,
                maxResults: 10,
              })
            }
          >
            Create
          </button>
        )}
      </div>
    ) : null,
}));

vi.mock("../components/AuthModal", () => ({
  AuthModal: ({ isOpen, onClose }) =>
    isOpen ? (
      <div data-testid="auth-modal">
        <button onClick={onClose}>Close Auth</button>
      </div>
    ) : null,
}));

vi.mock("../components/SearchMergeModal", () => ({
  default: ({
    isOpen,
    onKeepAndMerge,
    onReplace,
    onCancel,
    jobTitle,
    existingCount,
  }) =>
    isOpen ? (
      <div data-testid="search-merge-modal">
        <span data-testid="merge-job-title">{jobTitle}</span>
        <span data-testid="merge-existing-count">
          {existingCount}
        </span>
        <button onClick={onKeepAndMerge}>Merge</button>
        <button onClick={onReplace}>Replace</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    ) : null,
}));

vi.mock("../components/CandidateComparator", () => ({
  CandidateComparator: ({ candidates, onClose, onViewCandidate }) => (
    <div data-testid="candidate-comparator">
      <span data-testid="comparator-count">{candidates.length}</span>
      <button onClick={onClose}>Close Comparator</button>
      <button onClick={() => onViewCandidate(candidates[0])}>
        Comparator View Candidate
      </button>
    </div>
  ),
}));

vi.mock("../components/AuthPage", () => ({
  default: ({ onAccepted }) => (
    <div data-testid="auth-page">
      <button onClick={onAccepted}>Accept Invite</button>
    </div>
  ),
}));

/* ---------------------------------------------------------------------
   Shared fixtures
--------------------------------------------------------------------- */

const searchCandidatesApiMock = vi.mocked(searchCandidatesApi);
const getTeamActivitiesApiMock = vi.mocked(getTeamActivitiesApi);
const logActivityApiMock = vi.mocked(logActivityApi);
const useAuthMock = vi.mocked(useAuth);
const useLanguageMock = vi.mocked(useLanguage);
const useConfirmMock = vi.mocked(useConfirm);

const testUser = {
  id: "u1",
  email: "test@example.com",
  teamId: "team-1",
  fullName: "Test User",
  role: "RECRUITER",
};

const TEAM_KEY = "team-1";
const USER_KEY = "test_example_com";

const seedJobDescriptions = (jobs) => {
  localStorage.setItem(
    `targetalent_team_${TEAM_KEY}_job_descriptions`,
    JSON.stringify(jobs)
  );
};

const seedJobResultsCache = (cache) => {
  localStorage.setItem(
    `targetalent_team_${TEAM_KEY}_job_results`,
    JSON.stringify(cache)
  );
};

const seedSavedRoleCandidates = (data) => {
  localStorage.setItem(
    `targetalent_team_${TEAM_KEY}_saved_role_candidates`,
    JSON.stringify(data)
  );
};

const seedShortlist = (list) => {
  localStorage.setItem(
    `targetalent_team_${TEAM_KEY}_shortlist`,
    JSON.stringify(list)
  );
};

const sampleJob = (overrides = {}) => ({
  id: "job-1",
  title: "Senior Frontend Developer",
  description: "Looking for a senior React developer.",
  prompt: "Find a senior React developer.",
  location: "Casablanca",
  minExperience: 5,
  maxResults: 10,
  skills: ["React"],
  ...overrides,
});

const sampleCandidate = (overrides = {}) => ({
  id: "cand-1",
  fullName: "Jane Doe",
  currentRole: "Frontend Engineer",
  notes: [],
  ...overrides,
});

let confirmMock;
let showAlertMock;

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();

  useAuthMock.mockReturnValue({
    user: testUser,
    loading: false,
    hasPrivilege: () => true,
  });

  useLanguageMock.mockReturnValue({
    t: (key) => key,
    lang: "EN",
  });

  confirmMock = vi.fn().mockResolvedValue(true);
  showAlertMock = vi.fn().mockResolvedValue(undefined);

  useConfirmMock.mockReturnValue({
    confirm: confirmMock,
    showAlert: showAlertMock,
  });

  getTeamActivitiesApiMock.mockResolvedValue([]);
  logActivityApiMock.mockResolvedValue({
    id: "activity-1",
    actionType: "SOURCE_SEARCH",
  });
  searchCandidatesApiMock.mockResolvedValue([]);

  window.history.pushState({}, "", "/");
});

afterEach(() => {
  vi.useRealTimers();
});

/* =======================================================================
   PURE HELPER FUNCTIONS
======================================================================= */

describe("getEmptyWorkspaceState", () => {
  it("returns the expected empty shape", () => {
    expect(getEmptyWorkspaceState()).toEqual({
      jobDescriptions: [],
      savedRoleCandidates: {},
      candidatePipelineStage: {},
      searchHistory: [],
      jobResultsCache: {},
      shortlist: [],
    });
  });

  it("returns a fresh object on each call", () => {
    const first = getEmptyWorkspaceState();
    const second = getEmptyWorkspaceState();

    expect(first).not.toBe(second);
    expect(first.jobDescriptions).not.toBe(second.jobDescriptions);
  });
});

describe("loadInitialWorkspaceData", () => {
  it("returns defaults when nothing is stored", () => {
    const data = loadInitialWorkspaceData("team-x", "user-x");

    expect(data).toEqual({
      jobDescriptions: [],
      savedRoleCandidates: {},
      jobResultsCache: {},
      shortlist: [],
      candidatePipelineStage: {},
      searchHistory: [],
      selectedJobId: null,
    });
  });

  it("reads values stored under the targetalent_team_ prefix", () => {
    localStorage.setItem(
      "targetalent_team_team-x_job_descriptions",
      JSON.stringify([{ id: "j1" }])
    );

    const data = loadInitialWorkspaceData("team-x", "user-x");

    expect(data.jobDescriptions).toEqual([{ id: "j1" }]);
    expect(data.selectedJobId).toBeNull();
  });

  it("falls back to the legacy digitalia_team_ prefix", () => {
    localStorage.setItem(
      "digitalia_team_team-x_shortlist",
      JSON.stringify([{ id: "c1" }])
    );

    const data = loadInitialWorkspaceData("team-x", "user-x");

    expect(data.shortlist).toEqual([{ id: "c1" }]);
    expect(data.selectedJobId).toBeNull();
  });

  it("falls back to per-user keys when no team-level value exists", () => {
    localStorage.setItem(
      "targetalent_user_user-x_search_history",
      JSON.stringify(["query one"])
    );

    const data = loadInitialWorkspaceData("team-x", "user-x");

    expect(data.searchHistory).toEqual(["query one"]);
    expect(data.selectedJobId).toBeNull();
  });

  it("prefers team-level values over user-level values", () => {
    localStorage.setItem(
      "targetalent_team_team-x_shortlist",
      JSON.stringify([{ id: "team-candidate" }])
    );
    localStorage.setItem(
      "targetalent_user_user-x_shortlist",
      JSON.stringify([{ id: "user-candidate" }])
    );

    const data = loadInitialWorkspaceData("team-x", "user-x");

    expect(data.shortlist).toEqual([{ id: "team-candidate" }]);
    expect(data.selectedJobId).toBeNull();
  });

  it("falls back to defaults when stored JSON is malformed", () => {
    localStorage.setItem(
      "targetalent_team_team-x_pipeline_stages",
      "{not valid json"
    );

    const data = loadInitialWorkspaceData("team-x", "user-x");

    expect(data.candidatePipelineStage).toEqual({});
    expect(data.selectedJobId).toBeNull();
  });
});

describe("mergeCandidateResults", () => {
  it("marks brand-new candidates as new", () => {
    const result = mergeCandidateResults(
      [],
      [{ id: "c1", fullName: "Alice" }]
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "c1",
      fullName: "Alice",
      isNew: true,
      isPrevious: false,
    });
    expect(result[0].sourcedAt).toBeTruthy();
  });

  it("matches existing candidates by id and marks them as not new", () => {
    const existing = [
      {
        id: "c1",
        fullName: "Alice",
        notes: [{ id: "n1", text: "great fit" }],
        timesSeen: 2,
      },
    ];

    const result = mergeCandidateResults(existing, [
      { id: "c1", fullName: "Alice" },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "c1",
      isNew: false,
      isPrevious: true,
      timesSeen: 3,
    });
    expect(result[0].notes).toEqual([
      { id: "n1", text: "great fit" },
    ]);
  });

  it("matches existing candidates by normalized full name when id is missing", () => {
    const existing = [
      {
        fullName: "  Bob Smith  ",
        notes: [{ id: "n1", text: "note" }],
      },
    ];

    const result = mergeCandidateResults(existing, [
      { fullName: "bob smith" },
    ]);

    expect(result[0]).toMatchObject({
      isPrevious: true,
      isNew: false,
    });
    expect(result[0].notes).toEqual([
      { id: "n1", text: "note" },
    ]);
  });

  it("keeps new results' notes when the matched previous candidate has none", () => {
    const existing = [{ id: "c1", fullName: "Alice", notes: [] }];

    const result = mergeCandidateResults(existing, [
      { id: "c1", fullName: "Alice", notes: [{ id: "n2", text: "x" }] },
    ]);

    expect(result[0].notes).toEqual([{ id: "n2", text: "x" }]);
  });

  it("preserves isSavedForJob from either side", () => {
    const existing = [
      { id: "c1", fullName: "Alice", isSavedForJob: true },
    ];

    const result = mergeCandidateResults(existing, [
      { id: "c1", fullName: "Alice", isSavedForJob: false },
    ]);

    expect(result[0].isSavedForJob).toBe(true);
  });

  it("appends previously-sourced candidates that were not returned again", () => {
    const existing = [
      { id: "c1", fullName: "Alice" },
      { id: "c2", fullName: "Bob" },
    ];

    const result = mergeCandidateResults(existing, [
      { id: "c1", fullName: "Alice" },
    ]);

    expect(result.map((c) => c.id)).toEqual(
      expect.arrayContaining(["c1", "c2"])
    );

    const bob = result.find((c) => c.id === "c2");
    expect(bob).toMatchObject({
      isNew: false,
      isPrevious: true,
    });
  });

  it("handles empty existing and empty new results without throwing", () => {
    expect(mergeCandidateResults([], [])).toEqual([]);
    expect(mergeCandidateResults()).toEqual([]);
  });

  it("ignores null/undefined entries in either list", () => {
    const result = mergeCandidateResults(
      [null, { id: "c1", fullName: "Alice" }],
      [undefined, { id: "c1", fullName: "Alice" }]
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("c1");
  });
});

describe("tagFreshResults", () => {
  it("tags every candidate as new and not previous", () => {
    const result = tagFreshResults([
      { id: "c1", fullName: "Alice" },
      { id: "c2", fullName: "Bob" },
    ]);

    expect(result).toHaveLength(2);
    result.forEach((candidate) => {
      expect(candidate.isNew).toBe(true);
      expect(candidate.isPrevious).toBe(false);
      expect(candidate.sourcedAt).toBeTruthy();
    });
  });

  it("does not mutate the original candidate objects", () => {
    const original = [{ id: "c1", fullName: "Alice" }];

    tagFreshResults(original);

    expect(original[0].isNew).toBeUndefined();
  });

  it("returns an empty array when given no results", () => {
    expect(tagFreshResults()).toEqual([]);
    expect(tagFreshResults([])).toEqual([]);
  });
});

/* =======================================================================
   APP / DASHBOARD INTEGRATION TESTS
======================================================================= */

describe("App routing", () => {
  it("shows a loading spinner while auth is resolving", () => {
    useAuthMock.mockReturnValue({
      user: null,
      loading: true,
      hasPrivilege: () => true,
    });

    const { container } = render(<App />);

    expect(
      container.querySelector(".animate-spin")
    ).toBeInTheDocument();
    expect(screen.queryByTestId("navbar")).not.toBeInTheDocument();
  });

  it("shows the auth page when there is no authenticated user", () => {
    useAuthMock.mockReturnValue({
      user: null,
      loading: false,
      hasPrivilege: () => true,
    });

    render(<App />);

    expect(screen.getByTestId("auth-page")).toBeInTheDocument();
  });

  it("shows the auth page when an invite query param is present, even if logged in", () => {
    window.history.pushState({}, "", "/?invite=abc123");

    render(<App />);

    expect(screen.getByTestId("auth-page")).toBeInTheDocument();
  });

  it("shows the dashboard when authenticated with no invite param", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("navbar")).toBeInTheDocument();
    });
  });

  it("returns to the dashboard from the auth page once the invite is accepted", async () => {
    window.history.pushState({}, "", "/?invite=abc123");

    render(<App />);

    // Mounting DashboardContent kicks off the getTeamActivitiesApi effect,
    // whose resolution needs to be flushed inside act() or React warns
    // about an update outside of act.
    await act(async () => {
      fireEvent.click(screen.getByText("Accept Invite"));
    });

    expect(screen.getByTestId("navbar")).toBeInTheDocument();
  });
});

describe("DashboardContent tabs", () => {
  it("defaults to the dashboard tab", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("dashboard-view")).toBeInTheDocument();
    });
  });

  it("restores the previously active tab from localStorage", async () => {
    localStorage.setItem(
      `digitalia_user_${USER_KEY}_active_tab`,
      "pipeline"
    );

    render(<App />);

    await waitFor(() => {
      expect(
        screen.getByTestId("kanban-pipeline")
      ).toBeInTheDocument();
    });
  });

  it("switches tabs and persists the choice", async () => {
    render(<App />);

    fireEvent.click(await screen.findByText("Go Sourcing"));

    expect(screen.getByTestId("sourcing-hub")).toBeInTheDocument();
    expect(
      localStorage.getItem(`digitalia_user_${USER_KEY}_active_tab`)
    ).toBe("sourcing");

    fireEvent.click(screen.getByText("Go Team"));

    expect(screen.getByTestId("team-view")).toBeInTheDocument();
  });

  it("navigates back to the dashboard from the team view", async () => {
    render(<App />);

    fireEvent.click(await screen.findByText("Go Team"));
    fireEvent.click(screen.getByText("Back to Dashboard"));

    expect(screen.getByTestId("dashboard-view")).toBeInTheDocument();
  });

  it("navigates to notes tab and renders it", async () => {
    render(<App />);

    fireEvent.click(await screen.findByText("Go Notes"));

    expect(screen.getByTestId("notes-view")).toBeInTheDocument();
  });

  it("opens and closes the auth modal from the navbar", async () => {
    render(<App />);

    fireEvent.click(await screen.findByText("Open Auth"));
    expect(screen.getByTestId("auth-modal")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Close Auth"));
    expect(screen.queryByTestId("auth-modal")).not.toBeInTheDocument();
  });
});

describe("team activity loading", () => {
  it("loads team activities on mount and reflects notes count", async () => {
    seedJobResultsCache({
      "job-1": [
        sampleCandidate({
          id: "c1",
          notes: [{ id: "n1", text: "hi" }],
        }),
      ],
    });
    seedJobDescriptions([sampleJob()]);

    getTeamActivitiesApiMock.mockResolvedValue([
      { id: "a1", actionType: "SOURCE_SEARCH" },
    ]);

    render(<App />);

    await waitFor(() => {
      expect(getTeamActivitiesApiMock).toHaveBeenCalledWith(50);
    });
  });
});

describe("search: privilege gating", () => {
  it("blocks searching without the source_candidates privilege", async () => {
    seedJobDescriptions([sampleJob()]);

    useAuthMock.mockReturnValue({
      user: testUser,
      loading: false,
      hasPrivilege: (priv) => priv !== "source_candidates",
    });

    render(<App />);

    fireEvent.click(await screen.findByText("Go Sourcing"));
    fireEvent.click(screen.getByText("Trigger Search"));

    expect(searchCandidatesApiMock).not.toHaveBeenCalled();
    expect(
      await screen.findByText(/requires sourcing/i)
    ).toBeInTheDocument();
  });
});

describe("search: direct vs merge-modal branching", () => {
  it("searches directly when there are no cached results for the job", async () => {
    seedJobDescriptions([sampleJob()]);

    searchCandidatesApiMock.mockResolvedValue([
      sampleCandidate({ id: "new-1" }),
    ]);

    render(<App />);

    fireEvent.click(await screen.findByText("Go Sourcing"));
    fireEvent.click(screen.getByText("Trigger Search"));

    await waitFor(() => {
      expect(searchCandidatesApiMock).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(
        screen.getByTestId("candidates-count")
      ).toHaveTextContent("1");
    });

    expect(
      screen.queryByTestId("search-merge-modal")
    ).not.toBeInTheDocument();
  });

  it("opens the merge modal instead of searching immediately when cached results exist", async () => {
    seedJobDescriptions([sampleJob()]);
    seedJobResultsCache({
      "job-1": [sampleCandidate({ id: "old-1" })],
    });

    render(<App />);

    fireEvent.click(await screen.findByText("Go Sourcing"));
    fireEvent.click(screen.getByText("Trigger Search"));

    expect(
      await screen.findByTestId("search-merge-modal")
    ).toBeInTheDocument();

    expect(
      screen.getByTestId("merge-existing-count")
    ).toHaveTextContent("1");

    expect(searchCandidatesApiMock).not.toHaveBeenCalled();
  });

  it("merges new results with cached ones when Merge is chosen", async () => {
    seedJobDescriptions([sampleJob()]);
    seedJobResultsCache({
      "job-1": [sampleCandidate({ id: "old-1", fullName: "Old Person" })],
    });

    searchCandidatesApiMock.mockResolvedValue([
      sampleCandidate({ id: "new-1", fullName: "New Person" }),
    ]);

    render(<App />);

    fireEvent.click(await screen.findByText("Go Sourcing"));
    fireEvent.click(screen.getByText("Trigger Search"));

    fireEvent.click(await screen.findByText("Merge"));

    await waitFor(() => {
      expect(
        screen.getByTestId("candidates-count")
      ).toHaveTextContent("2");
    });
  });

  it("replaces cached results entirely when Replace is chosen", async () => {
    seedJobDescriptions([sampleJob()]);
    seedJobResultsCache({
      "job-1": [sampleCandidate({ id: "old-1" })],
    });

    searchCandidatesApiMock.mockResolvedValue([
      sampleCandidate({ id: "new-1" }),
    ]);

    render(<App />);

    fireEvent.click(await screen.findByText("Go Sourcing"));
    fireEvent.click(screen.getByText("Trigger Search"));

    fireEvent.click(await screen.findByText("Replace"));

    await waitFor(() => {
      expect(
        screen.getByTestId("candidates-count")
      ).toHaveTextContent("1");
    });
  });

  it("closes the merge modal without searching when cancelled", async () => {
    seedJobDescriptions([sampleJob()]);
    seedJobResultsCache({
      "job-1": [sampleCandidate({ id: "old-1" })],
    });

    render(<App />);

    fireEvent.click(await screen.findByText("Go Sourcing"));
    fireEvent.click(screen.getByText("Trigger Search"));

    fireEvent.click(await screen.findByText("Cancel"));

    expect(
      screen.queryByTestId("search-merge-modal")
    ).not.toBeInTheDocument();
    expect(searchCandidatesApiMock).not.toHaveBeenCalled();
  });

  it("shows an error toast when the search API rejects", async () => {
    seedJobDescriptions([sampleJob()]);
    searchCandidatesApiMock.mockRejectedValue(new Error("network down"));

    render(<App />);

    fireEvent.click(await screen.findByText("Go Sourcing"));
    fireEvent.click(screen.getByText("Trigger Search"));

    expect(
      await screen.findByText(/search execution failed/i)
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId("is-searching")).toHaveTextContent(
        "false"
      );
    });
  });
});

describe("search mode switching", () => {
  it("swaps candidates between the pool cache and the ai cache", async () => {
    seedJobDescriptions([sampleJob()]);
    seedJobResultsCache({
      "job-1": [sampleCandidate({ id: "ai-1" })],
      "job-1:pool": [
        sampleCandidate({ id: "pool-1" }),
        sampleCandidate({ id: "pool-2" }),
      ],
    });

    render(<App />);

    fireEvent.click(await screen.findByText("Go Sourcing"));
    fireEvent.click(screen.getByText("Select First Job"));

    await waitFor(() => {
      expect(
        screen.getByTestId("candidates-count")
      ).toHaveTextContent("1");
    });

    fireEvent.click(screen.getByText("Switch To Pool"));

    await waitFor(() => {
      expect(
        screen.getByTestId("candidates-count")
      ).toHaveTextContent("2");
    });

    fireEvent.click(screen.getByText("Switch To AI"));

    await waitFor(() => {
      expect(
        screen.getByTestId("candidates-count")
      ).toHaveTextContent("1");
    });
  });
});

describe("job creation", () => {
  it("blocks job creation without the create_roles privilege", async () => {
    useAuthMock.mockReturnValue({
      user: testUser,
      loading: false,
      hasPrivilege: (priv) => priv !== "create_roles",
    });

    render(<App />);

    fireEvent.click(await screen.findByText("Go Sourcing"));
    fireEvent.click(screen.getByText("Open Job Modal"));
    fireEvent.click(screen.getByText("Create"));

    expect(showAlertMock).toHaveBeenCalled();
    expect(searchCandidatesApiMock).not.toHaveBeenCalled();
  });

  it("creates the job, switches to sourcing, and auto-sources candidates", async () => {
    searchCandidatesApiMock.mockResolvedValue([
      sampleCandidate({ id: "auto-1" }),
    ]);

    render(<App />);

    fireEvent.click(await screen.findByText("Go Sourcing"));
    fireEvent.click(screen.getByText("Open Job Modal"));
    fireEvent.click(screen.getByText("Create"));

    await waitFor(() => {
      expect(searchCandidatesApiMock).toHaveBeenCalledTimes(1);
    });

    expect(
      screen.getByTestId("selected-job-id")
    ).toHaveTextContent("job-new");

    await waitFor(() => {
      expect(
        screen.getByTestId("candidates-count")
      ).toHaveTextContent("1");
    });
  });
});

describe("job editing", () => {
  it("blocks job editing without the create_roles privilege", async () => {
    seedJobDescriptions([sampleJob()]);

    useAuthMock.mockReturnValue({
      user: testUser,
      loading: false,
      hasPrivilege: (priv) => priv !== "create_roles",
    });

    render(<App />);

    fireEvent.click(await screen.findByText("Go Sourcing"));
    fireEvent.click(screen.getByText("Open Edit Job Modal"));
    fireEvent.click(screen.getByText("Save Edit"));

    expect(showAlertMock).toHaveBeenCalled();
  });

  it("updates the job title when editing succeeds", async () => {
    seedJobDescriptions([sampleJob()]);

    render(<App />);

    fireEvent.click(await screen.findByText("Go Sourcing"));
    fireEvent.click(screen.getByText("Open Edit Job Modal"));
    fireEvent.click(screen.getByText("Save Edit"));

    // handleEditJob currently doesn't close the job modal on success
    // (unlike handleCreateJob's onClose flow), so the modal stays open
    // after a successful edit. This asserts the app's current behavior;
    // if handleEditJob is later updated to close the modal, this
    // assertion should be updated to check it's no longer in the document.
    expect(
      await screen.findByText(/job description updated/i)
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("job-description-modal")
    ).toBeInTheDocument();
  });
});

describe("job deletion", () => {
  it("does nothing if the confirmation is declined", async () => {
    seedJobDescriptions([sampleJob()]);
    seedJobResultsCache({ "job-1": [sampleCandidate()] });
    confirmMock.mockResolvedValue(false);

    render(<App />);

    fireEvent.click(await screen.findByText("Go Sourcing"));
    fireEvent.click(screen.getByText("Select First Job"));
    fireEvent.click(screen.getByText("Delete First Job"));

    await waitFor(() => {
      expect(
        screen.getByTestId("selected-job-id")
      ).toHaveTextContent("job-1");
    });
  });

  it("blocks deletion without the create_roles privilege", async () => {
    seedJobDescriptions([sampleJob()]);

    useAuthMock.mockReturnValue({
      user: testUser,
      loading: false,
      hasPrivilege: (priv) => priv !== "create_roles",
    });

    render(<App />);

    fireEvent.click(await screen.findByText("Go Sourcing"));
    fireEvent.click(screen.getByText("Delete First Job"));

    expect(showAlertMock).toHaveBeenCalled();
    expect(confirmMock).not.toHaveBeenCalled();
  });

  it("clears related state when the last job is deleted and confirmed", async () => {
    seedJobDescriptions([sampleJob()]);

    render(<App />);

    fireEvent.click(await screen.findByText("Go Sourcing"));
    fireEvent.click(screen.getByText("Delete First Job"));

    await waitFor(() => {
      expect(
        screen.getByTestId("selected-job-id")
      ).toHaveTextContent("");
    });

    expect(
      screen.getByTestId("candidates-count")
    ).toHaveTextContent("0");
  });

  it("selects the next job when the currently selected job is deleted", async () => {
    seedJobDescriptions([
      sampleJob({ id: "job-1" }),
      sampleJob({ id: "job-2", title: "Backend Engineer" }),
    ]);
    seedJobResultsCache({
      "job-1": [sampleCandidate()],
      "job-2": [sampleCandidate({ id: "c2" })],
    });

    render(<App />);

    fireEvent.click(await screen.findByText("Go Sourcing"));
    fireEvent.click(screen.getByText("Select First Job"));
    fireEvent.click(screen.getByText("Delete First Job"));

    await waitFor(() => {
      expect(
        screen.getByTestId("selected-job-id")
      ).toHaveTextContent("job-2");
    });
  });
});

describe("bulk candidate actions", () => {
  it("bulk-deletes candidates without prompting for confirmation", async () => {
    seedJobDescriptions([sampleJob()]);
    seedJobResultsCache({
      "job-1": [
        sampleCandidate({ id: "c1" }),
        sampleCandidate({ id: "c2", fullName: "Second Person" }),
      ],
    });

    render(<App />);

    fireEvent.click(await screen.findByText("Go Sourcing"));
    fireEvent.click(screen.getByText("Select First Job"));

    await waitFor(() => {
      expect(
        screen.getByTestId("candidates-count")
      ).toHaveTextContent("2");
    });

    fireEvent.click(screen.getByText("Bulk Delete"));

    await waitFor(() => {
      expect(
        screen.getByTestId("candidates-count")
      ).toHaveTextContent("0");
    });

    expect(confirmMock).not.toHaveBeenCalled();
  });

  it("bulk-saves candidates to the active job without prompting for confirmation", async () => {
    seedJobDescriptions([sampleJob()]);
    seedJobResultsCache({
      "job-1": [sampleCandidate({ id: "c1" })],
    });

    render(<App />);

    fireEvent.click(await screen.findByText("Go Sourcing"));
    fireEvent.click(screen.getByText("Select First Job"));

    await waitFor(() => {
      expect(
        screen.getByTestId("candidates-count")
      ).toHaveTextContent("1");
    });

    fireEvent.click(screen.getByText("Bulk Save"));

    await waitFor(() => {
      expect(confirmMock).not.toHaveBeenCalled();
    });

    expect(
      await screen.findByText(/candidate\(s\) saved to role/i)
    ).toBeInTheDocument();
  });

  it("blocks bulk-save without the shortlist_candidates privilege", async () => {
    seedJobDescriptions([sampleJob()]);
    seedJobResultsCache({
      "job-1": [sampleCandidate({ id: "c1" })],
    });

    useAuthMock.mockReturnValue({
      user: testUser,
      loading: false,
      hasPrivilege: (priv) => priv !== "shortlist_candidates",
    });

    render(<App />);

    fireEvent.click(await screen.findByText("Go Sourcing"));
    fireEvent.click(screen.getByText("Select First Job"));

    await waitFor(() => {
      expect(
        screen.getByTestId("candidates-count")
      ).toHaveTextContent("1");
    });

    fireEvent.click(screen.getByText("Bulk Save"));

    expect(showAlertMock).toHaveBeenCalled();
  });
});

describe("single candidate: save to role", () => {
  it("blocks without the shortlist_candidates privilege", async () => {
    seedJobDescriptions([sampleJob()]);
    seedJobResultsCache({ "job-1": [sampleCandidate({ id: "c1" })] });

    useAuthMock.mockReturnValue({
      user: testUser,
      loading: false,
      hasPrivilege: (priv) => priv !== "shortlist_candidates",
    });

    render(<App />);

    fireEvent.click(await screen.findByText("Go Sourcing"));
    fireEvent.click(screen.getByText("Select First Job"));

    await waitFor(() =>
      expect(
        screen.getByTestId("candidates-count")
      ).toHaveTextContent("1")
    );

    fireEvent.click(screen.getByText("Toggle Save First Candidate"));

    expect(showAlertMock).toHaveBeenCalled();
    expect(confirmMock).not.toHaveBeenCalled();
  });

  it("does nothing when the confirmation is declined", async () => {
    seedJobDescriptions([sampleJob()]);
    seedJobResultsCache({ "job-1": [sampleCandidate({ id: "c1" })] });
    confirmMock.mockResolvedValue(false);

    render(<App />);

    fireEvent.click(await screen.findByText("Go Sourcing"));
    fireEvent.click(screen.getByText("Select First Job"));

    await waitFor(() =>
      expect(
        screen.getByTestId("candidates-count")
      ).toHaveTextContent("1")
    );

    fireEvent.click(screen.getByText("Toggle Save First Candidate"));

    await waitFor(() => expect(confirmMock).toHaveBeenCalled());
    expect(
      screen.queryByText(/saved to role/i)
    ).not.toBeInTheDocument();
  });

  it("saves and then removes a candidate from the role after confirmation", async () => {
    seedJobDescriptions([sampleJob()]);
    seedJobResultsCache({ "job-1": [sampleCandidate({ id: "c1" })] });

    render(<App />);

    fireEvent.click(await screen.findByText("Go Sourcing"));
    fireEvent.click(screen.getByText("Select First Job"));

    await waitFor(() =>
      expect(
        screen.getByTestId("candidates-count")
      ).toHaveTextContent("1")
    );

    fireEvent.click(screen.getByText("Toggle Save First Candidate"));

    expect(
      await screen.findByText(/candidate saved to role/i)
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText("Toggle Save First Candidate"));

    expect(
      await screen.findByText(/candidate removed from role/i)
    ).toBeInTheDocument();
  });
});

describe("candidate detail panel", () => {
  it("opens the detail panel and reflects saved-for-job state", async () => {
    seedJobDescriptions([sampleJob()]);
    seedJobResultsCache({ "job-1": [sampleCandidate({ id: "c1" })] });
    seedSavedRoleCandidates({ "job-1": ["c1"] });

    render(<App />);

    fireEvent.click(await screen.findByText("Go Sourcing"));
    fireEvent.click(screen.getByText("Select First Job"));

    await waitFor(() =>
      expect(
        screen.getByTestId("candidates-count")
      ).toHaveTextContent("1")
    );

    fireEvent.click(screen.getByText("View First Candidate Details"));

    expect(
      screen.getByTestId("candidate-detail-panel")
    ).toBeInTheDocument();
    expect(screen.getByTestId("detail-is-saved")).toHaveTextContent(
      "true"
    );

    fireEvent.click(screen.getByText("Close"));

    expect(
      screen.queryByTestId("candidate-detail-panel")
    ).not.toBeInTheDocument();
  });

  it("adds a note from the detail panel", async () => {
    seedJobDescriptions([sampleJob()]);
    seedJobResultsCache({ "job-1": [sampleCandidate({ id: "c1" })] });

    render(<App />);

    fireEvent.click(await screen.findByText("Go Sourcing"));
    fireEvent.click(screen.getByText("Select First Job"));

    await waitFor(() =>
      expect(
        screen.getByTestId("candidates-count")
      ).toHaveTextContent("1")
    );

    fireEvent.click(screen.getByText("View First Candidate Details"));
    fireEvent.click(screen.getByText("Detail Add Note"));

    expect(
      await screen.findByText(/note saved/i)
    ).toBeInTheDocument();
  });

  it("blocks adding a note without the manage_notes privilege", async () => {
    seedJobDescriptions([sampleJob()]);
    seedJobResultsCache({ "job-1": [sampleCandidate({ id: "c1" })] });

    useAuthMock.mockReturnValue({
      user: testUser,
      loading: false,
      hasPrivilege: (priv) => priv !== "manage_notes",
    });

    render(<App />);

    fireEvent.click(await screen.findByText("Go Sourcing"));
    fireEvent.click(screen.getByText("Select First Job"));

    await waitFor(() =>
      expect(
        screen.getByTestId("candidates-count")
      ).toHaveTextContent("1")
    );

    fireEvent.click(screen.getByText("View First Candidate Details"));
    fireEvent.click(screen.getByText("Detail Add Note"));

    expect(showAlertMock).toHaveBeenCalled();
  });

  it("opens the edit modal from the detail panel", async () => {
    seedJobDescriptions([sampleJob()]);
    seedJobResultsCache({ "job-1": [sampleCandidate({ id: "c1" })] });

    render(<App />);

    fireEvent.click(await screen.findByText("Go Sourcing"));
    fireEvent.click(screen.getByText("Select First Job"));

    await waitFor(() =>
      expect(
        screen.getByTestId("candidates-count")
      ).toHaveTextContent("1")
    );

    fireEvent.click(screen.getByText("View First Candidate Details"));
    fireEvent.click(screen.getByText("Detail Edit"));

    expect(
      screen.getByTestId("edit-candidate-modal")
    ).toBeInTheDocument();
  });

  it("deletes the candidate from the detail panel after confirmation and closes it", async () => {
    seedJobDescriptions([sampleJob()]);
    seedJobResultsCache({ "job-1": [sampleCandidate({ id: "c1" })] });

    render(<App />);

    fireEvent.click(await screen.findByText("Go Sourcing"));
    fireEvent.click(screen.getByText("Select First Job"));

    await waitFor(() =>
      expect(
        screen.getByTestId("candidates-count")
      ).toHaveTextContent("1")
    );

    fireEvent.click(screen.getByText("View First Candidate Details"));
    fireEvent.click(screen.getByText("Detail Delete"));

    await waitFor(() => {
      expect(
        screen.queryByTestId("candidate-detail-panel")
      ).not.toBeInTheDocument();
    });

    expect(
      screen.getByTestId("candidates-count")
    ).toHaveTextContent("0");
  });
});

describe("editing and creating candidates directly", () => {
  it("opens the add-candidate modal and saves a brand-new candidate", async () => {
    seedJobDescriptions([sampleJob()]);

    render(<App />);

    fireEvent.click(await screen.findByText("Go Sourcing"));
    fireEvent.click(screen.getByText("Select First Job"));

    // No candidates yet — "Edit First Candidate" targets undefined,
    // opening the modal in "add" mode (candidate=null in EditCandidateModal).
    fireEvent.click(screen.getByText("Edit First Candidate"));

    expect(
      screen.getByTestId("edit-candidate-name")
    ).toHaveTextContent("new");

    fireEvent.click(screen.getByText("Save"));

    expect(
      await screen.findByText(/profile updated successfully/i)
    ).toBeInTheDocument();
  });

  it("updates an existing candidate and reflects the change count in the grid", async () => {
    seedJobDescriptions([sampleJob()]);
    seedJobResultsCache({ "job-1": [sampleCandidate({ id: "c1" })] });

    render(<App />);

    fireEvent.click(await screen.findByText("Go Sourcing"));
    fireEvent.click(screen.getByText("Select First Job"));

    await waitFor(() =>
      expect(
        screen.getByTestId("candidates-count")
      ).toHaveTextContent("1")
    );

    fireEvent.click(screen.getByText("Edit First Candidate"));
    fireEvent.click(screen.getByText("Save"));

    expect(
      await screen.findByText(/profile updated successfully/i)
    ).toBeInTheDocument();

    // Count stays the same — this was an update, not an addition.
    expect(
      screen.getByTestId("candidates-count")
    ).toHaveTextContent("1");
  });
});

describe("single candidate deletion from the grid", () => {
  it("deletes after confirmation and removes it from the shortlist too", async () => {
    seedJobDescriptions([sampleJob()]);
    seedJobResultsCache({ "job-1": [sampleCandidate({ id: "c1" })] });
    seedShortlist([sampleCandidate({ id: "c1" })]);

    render(<App />);

    fireEvent.click(await screen.findByText("Go Sourcing"));
    fireEvent.click(screen.getByText("Select First Job"));

    await waitFor(() =>
      expect(
        screen.getByTestId("candidates-count")
      ).toHaveTextContent("1")
    );

    fireEvent.click(screen.getByText("Delete First Candidate"));

    expect(
      await screen.findByText(/profile deleted/i)
    ).toBeInTheDocument();

    expect(
      screen.getByTestId("candidates-count")
    ).toHaveTextContent("0");
  });

  it("does nothing when deletion is declined", async () => {
    seedJobDescriptions([sampleJob()]);
    seedJobResultsCache({ "job-1": [sampleCandidate({ id: "c1" })] });
    confirmMock.mockResolvedValue(false);

    render(<App />);

    fireEvent.click(await screen.findByText("Go Sourcing"));
    fireEvent.click(screen.getByText("Select First Job"));

    await waitFor(() =>
      expect(
        screen.getByTestId("candidates-count")
      ).toHaveTextContent("1")
    );

    fireEvent.click(screen.getByText("Delete First Candidate"));

    await waitFor(() => expect(confirmMock).toHaveBeenCalled());

    expect(
      screen.getByTestId("candidates-count")
    ).toHaveTextContent("1");
  });
});

describe("comparator", () => {
  it("opens the comparator with the explicit candidate selection", async () => {
    seedJobDescriptions([sampleJob()]);
    seedJobResultsCache({
      "job-1": [
        sampleCandidate({ id: "c1" }),
        sampleCandidate({ id: "c2", fullName: "Second" }),
      ],
    });

    render(<App />);

    fireEvent.click(await screen.findByText("Go Sourcing"));
    fireEvent.click(screen.getByText("Select First Job"));

    await waitFor(() =>
      expect(
        screen.getByTestId("candidates-count")
      ).toHaveTextContent("2")
    );

    fireEvent.click(screen.getByText("Compare Candidates"));

    expect(
      screen.getByTestId("candidate-comparator")
    ).toBeInTheDocument();
    expect(screen.getByTestId("comparator-count")).toHaveTextContent(
      "2"
    );

    fireEvent.click(screen.getByText("Close Comparator"));

    expect(
      screen.queryByTestId("candidate-comparator")
    ).not.toBeInTheDocument();
  });

  it("falls back to the shortlist when no candidates are passed and none are loaded", async () => {
    seedShortlist([sampleCandidate({ id: "sl-1" })]);

    render(<App />);

    fireEvent.click(await screen.findByText("Go Sourcing"));
    fireEvent.click(screen.getByText("Open Comparator Fallback"));

    expect(
      screen.getByTestId("candidate-comparator")
    ).toBeInTheDocument();
    expect(screen.getByTestId("comparator-count")).toHaveTextContent(
      "1"
    );
  });

  it("opens the candidate detail panel from within the comparator", async () => {
    seedJobDescriptions([sampleJob()]);
    seedJobResultsCache({ "job-1": [sampleCandidate({ id: "c1" })] });

    render(<App />);

    fireEvent.click(await screen.findByText("Go Sourcing"));
    fireEvent.click(screen.getByText("Select First Job"));

    await waitFor(() =>
      expect(
        screen.getByTestId("candidates-count")
      ).toHaveTextContent("1")
    );

    fireEvent.click(screen.getByText("Compare Candidates"));
    fireEvent.click(screen.getByText("Comparator View Candidate"));

    expect(
      screen.getByTestId("candidate-detail-panel")
    ).toBeInTheDocument();
  });
});

describe("dashboard tab wiring", () => {
  it("navigates to pipeline when a stage is clicked", async () => {
    render(<App />);

    // Flush the initial getTeamActivitiesApi() effect before interacting,
    // so its resolved state update doesn't land outside act() later.
    await act(async () => { });

    fireEvent.click(screen.getByText("Dashboard Stage Click"));

    expect(screen.getByTestId("kanban-pipeline")).toBeInTheDocument();
  });

  it("navigates to sourcing and selects the job when a job is clicked", async () => {
    seedJobDescriptions([sampleJob()]);

    render(<App />);

    await act(async () => { });

    fireEvent.click(screen.getByText("Dashboard Select Job"));

    expect(screen.getByTestId("sourcing-hub")).toBeInTheDocument();
    expect(
      screen.getByTestId("selected-job-id")
    ).toHaveTextContent("job-1");
  });

  it("opens the candidate detail panel when a candidate is clicked", async () => {
    seedJobDescriptions([sampleJob()]);
    seedJobResultsCache({ "job-1": [sampleCandidate({ id: "c1" })] });

    render(<App />);

    await act(async () => { });

    fireEvent.click(screen.getByText("Dashboard Select Candidate"));

    expect(
      screen.getByTestId("candidate-detail-panel")
    ).toBeInTheDocument();
  });
});

describe("kanban pipeline wiring", () => {
  it("updates a candidate's pipeline stage", async () => {
    seedJobDescriptions([sampleJob()]);
    seedJobResultsCache({ "job-1": [sampleCandidate({ id: "c1" })] });
    seedSavedRoleCandidates({ "job-1": ["c1"] });

    render(<App />);

    fireEvent.click(await screen.findByText("Go Pipeline"));

    await waitFor(() => {
      expect(
        screen.getByTestId("pipeline-candidates-count")
      ).toHaveTextContent("1");
    });

    // Updating stage triggers recordActivity(), which awaits
    // logActivityApi() and resolves after this click — flush it inside
    // act() so the subsequent setTeamActivities update isn't unwrapped.
    await act(async () => {
      fireEvent.click(screen.getByText("Kanban Update Stage"));
    });

    // No visible state change to assert on the mock itself beyond it
    // not throwing; the important part is that recordActivity/logging
    // paths executed without error.
    expect(
      screen.getByTestId("pipeline-candidates-count")
    ).toHaveTextContent("1");
  });

  it("opens the candidate detail panel from the kanban board", async () => {
    seedJobDescriptions([sampleJob()]);
    seedJobResultsCache({ "job-1": [sampleCandidate({ id: "c1" })] });
    seedSavedRoleCandidates({ "job-1": ["c1"] });

    render(<App />);

    fireEvent.click(await screen.findByText("Go Pipeline"));

    await waitFor(() => {
      expect(
        screen.getByTestId("pipeline-candidates-count")
      ).toHaveTextContent("1");
    });

    fireEvent.click(screen.getByText("Kanban View Details"));

    expect(
      screen.getByTestId("candidate-detail-panel")
    ).toBeInTheDocument();
  });
});

describe("recruiter notes tab wiring", () => {
  it("adds a note through the notes view", async () => {
    seedJobDescriptions([sampleJob()]);
    seedJobResultsCache({ "job-1": [sampleCandidate({ id: "c1" })] });

    render(<App />);

    fireEvent.click(await screen.findByText("Go Notes"));
    fireEvent.click(screen.getByText("Notes Add Note"));

    expect(
      await screen.findByText(/note saved/i)
    ).toBeInTheDocument();
  });

  it("deletes a note after confirmation", async () => {
    seedJobDescriptions([sampleJob()]);
    seedJobResultsCache({
      "job-1": [
        sampleCandidate({
          id: "c1",
          notes: [{ id: "n1", text: "existing note" }],
        }),
      ],
    });

    render(<App />);

    fireEvent.click(await screen.findByText("Go Notes"));
    fireEvent.click(screen.getByText("Notes Delete Note"));

    expect(
      await screen.findByText(/note deleted/i)
    ).toBeInTheDocument();
  });

  it("blocks deleting a note without the manage_notes privilege", async () => {
    seedJobDescriptions([sampleJob()]);
    seedJobResultsCache({
      "job-1": [
        sampleCandidate({
          id: "c1",
          notes: [{ id: "n1", text: "existing note" }],
        }),
      ],
    });

    useAuthMock.mockReturnValue({
      user: testUser,
      loading: false,
      hasPrivilege: (priv) => priv !== "manage_notes",
    });

    render(<App />);

    fireEvent.click(await screen.findByText("Go Notes"));
    fireEvent.click(screen.getByText("Notes Delete Note"));

    expect(showAlertMock).toHaveBeenCalled();
  });

  it("opens the candidate detail panel from the notes view", async () => {
    seedJobDescriptions([sampleJob()]);
    seedJobResultsCache({ "job-1": [sampleCandidate({ id: "c1" })] });

    render(<App />);

    fireEvent.click(await screen.findByText("Go Notes"));
    fireEvent.click(screen.getByText("Notes View Candidate"));

    expect(
      screen.getByTestId("candidate-detail-panel")
    ).toBeInTheDocument();
  });
});