import React from "react";
import {
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import CandidateDetailPanel from "../components/CandidateDetailPanel";
import { useLanguage } from "../context/LanguageContext";

/* ---------------------------------------------------------------------
   Context mocks
--------------------------------------------------------------------- */

vi.mock("../context/LanguageContext", () => ({
    useLanguage: vi.fn(),
}));

const useLanguageMock = vi.mocked(useLanguage);

/* ---------------------------------------------------------------------
   Fixtures
--------------------------------------------------------------------- */

const baseCandidate = (overrides = {}) => ({
    id: "c1",
    fullName: "Jane Doe",
    // draftOutreachApi personalizes messages off candidate.name specifically,
    // while the header uses fullName || name — keep both in sync for
    // deterministic assertions.
    name: "Jane Doe",
    headline: "Senior Frontend Engineer",
    location: "Casablanca, Morocco",
    yearsExperience: 6,
    matchScore: 92,
    email: "jane.doe@gmail.com",
    linkedin: "https://linkedin.com/in/janedoe",
    skills: [
        "React",
        "TypeScript",
        "Node.js",
        "GraphQL",
        "CSS",
        "Testing",
        "CI/CD",
        "Docker",
        "AWS",
    ],
    notes: [],
    ...overrides,
});

beforeEach(() => {
    vi.clearAllMocks();

    useLanguageMock.mockReturnValue({ lang: "EN" });

    vi.spyOn(window, "open").mockImplementation(() => { });

    Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
});

afterEach(() => {
    vi.restoreAllMocks();
});

/* =======================================================================
   RENDERING
======================================================================= */

describe("rendering", () => {
    it("renders nothing when no candidate is provided", () => {
        const { container } = render(<CandidateDetailPanel candidate={null} />);
        expect(container).toBeEmptyDOMElement();
    });

    it("renders the candidate's core profile information", () => {
        render(<CandidateDetailPanel candidate={baseCandidate()} />);

        expect(screen.getByText("Jane Doe")).toBeInTheDocument();
        expect(screen.getByText("Senior Frontend Engineer")).toBeInTheDocument();
        // "Casablanca, Morocco" appears both in the header meta row and in
        // the Overview tab's Location signal card — assert at least one match.
        expect(
            screen.getAllByText("Casablanca, Morocco").length
        ).toBeGreaterThan(0);
        expect(screen.getAllByText("92").length).toBeGreaterThan(0);
    });

    it("falls back to a placeholder name when fullName/name are missing", () => {
        render(
            <CandidateDetailPanel
                candidate={baseCandidate({ fullName: undefined, name: undefined })}
            />
        );

        expect(screen.getByText("Unnamed candidate")).toBeInTheDocument();
    });

    it("shows the verified badge only when candidate.verified is true", () => {
        const { rerender } = render(
            <CandidateDetailPanel candidate={baseCandidate({ verified: true })} />
        );

        expect(screen.getByLabelText("Verified")).toBeInTheDocument();

        rerender(
            <CandidateDetailPanel candidate={baseCandidate({ verified: false })} />
        );

        expect(screen.queryByLabelText("Verified")).not.toBeInTheDocument();
    });

    it("shows the candidate position indicator when index/total are provided", () => {
        render(
            <CandidateDetailPanel
                candidate={baseCandidate()}
                candidateIndex={2}
                candidateTotal={10}
            />
        );

        expect(screen.getByText("Candidate 3 / 10")).toBeInTheDocument();
    });

    it("shows a generic label when index/total are not provided", () => {
        render(<CandidateDetailPanel candidate={baseCandidate()} />);

        expect(screen.getByText("Candidate profile")).toBeInTheDocument();
    });
});

/* =======================================================================
   CLOSING
======================================================================= */

describe("closing the panel", () => {
    it("calls onClose when the close button is clicked", () => {
        const onClose = vi.fn();
        render(<CandidateDetailPanel candidate={baseCandidate()} onClose={onClose} />);

        fireEvent.click(screen.getByLabelText("Close candidate details"));

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when clicking the overlay outside the panel", () => {
        const onClose = vi.fn();
        const { container } = render(
            <CandidateDetailPanel candidate={baseCandidate()} onClose={onClose} />
        );

        fireEvent.mouseDown(container.querySelector(".cdp-overlay"));

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("does not call onClose when clicking inside the panel", () => {
        const onClose = vi.fn();
        render(<CandidateDetailPanel candidate={baseCandidate()} onClose={onClose} />);

        fireEvent.mouseDown(screen.getByRole("dialog"));

        expect(onClose).not.toHaveBeenCalled();
    });

    it("calls onClose when the Escape key is pressed", () => {
        const onClose = vi.fn();
        render(<CandidateDetailPanel candidate={baseCandidate()} onClose={onClose} />);

        fireEvent.keyDown(window, { key: "Escape" });

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("closes the overflow menu on Escape instead of closing the panel, when the menu is open", () => {
        const onClose = vi.fn();
        render(
            <CandidateDetailPanel
                candidate={baseCandidate()}
                onClose={onClose}
                onEdit={vi.fn()}
            />
        );

        fireEvent.click(screen.getByLabelText("More candidate actions"));
        expect(screen.getByText("Edit candidate")).toBeInTheDocument();

        fireEvent.keyDown(window, { key: "Escape" });

        expect(screen.queryByText("Edit candidate")).not.toBeInTheDocument();
        expect(onClose).not.toHaveBeenCalled();
    });
});

/* =======================================================================
   KEYBOARD NAVIGATION
======================================================================= */

describe("keyboard navigation", () => {
    it("calls onPrev on ArrowLeft and onNext on ArrowRight", () => {
        const onPrev = vi.fn();
        const onNext = vi.fn();

        render(
            <CandidateDetailPanel
                candidate={baseCandidate()}
                onPrev={onPrev}
                onNext={onNext}
            />
        );

        fireEvent.keyDown(window, { key: "ArrowLeft" });
        fireEvent.keyDown(window, { key: "ArrowRight" });

        expect(onPrev).toHaveBeenCalledTimes(1);
        expect(onNext).toHaveBeenCalledTimes(1);
    });

    it("renders prev/next buttons only when the corresponding handlers are provided", () => {
        const { rerender } = render(
            <CandidateDetailPanel candidate={baseCandidate()} />
        );

        expect(
            screen.queryByLabelText("Previous candidate")
        ).not.toBeInTheDocument();
        expect(screen.queryByLabelText("Next candidate")).not.toBeInTheDocument();

        rerender(
            <CandidateDetailPanel
                candidate={baseCandidate()}
                onPrev={vi.fn()}
                onNext={vi.fn()}
            />
        );

        expect(screen.getByLabelText("Previous candidate")).toBeInTheDocument();
        expect(screen.getByLabelText("Next candidate")).toBeInTheDocument();
    });
});

/* =======================================================================
   SHORTLIST BUTTON
======================================================================= */

describe("shortlist button", () => {
    it("is disabled when there is no selected job", () => {
        render(
            <CandidateDetailPanel candidate={baseCandidate()} selectedJobId={null} />
        );

        expect(screen.getByText("Shortlist").closest("button")).toBeDisabled();
    });

    it("calls onToggleSaveForJob with the candidate and job ids when clicked", () => {
        const onToggleSaveForJob = vi.fn();

        render(
            <CandidateDetailPanel
                candidate={baseCandidate()}
                selectedJobId="job-1"
                onToggleSaveForJob={onToggleSaveForJob}
            />
        );

        fireEvent.click(screen.getByText("Shortlist"));

        expect(onToggleSaveForJob).toHaveBeenCalledWith("c1", "job-1");
    });

    it("shows the shortlisted state when isSavedForJob is true", () => {
        render(
            <CandidateDetailPanel
                candidate={baseCandidate()}
                selectedJobId="job-1"
                isSavedForJob
                onToggleSaveForJob={vi.fn()}
            />
        );

        expect(screen.getByText("Shortlisted")).toBeInTheDocument();
    });
});

/* =======================================================================
   OVERFLOW MENU
======================================================================= */

describe("overflow menu", () => {
    it("opens the menu and calls onEdit, closing the menu afterward", () => {
        const onEdit = vi.fn();
        const candidate = baseCandidate();

        render(<CandidateDetailPanel candidate={candidate} onEdit={onEdit} />);

        fireEvent.click(screen.getByLabelText("More candidate actions"));
        fireEvent.click(screen.getByText("Edit candidate"));

        expect(onEdit).toHaveBeenCalledWith(candidate);
        expect(screen.queryByText("Edit candidate")).not.toBeInTheDocument();
    });

    it("opens the menu and calls onDelete, closing the menu afterward", () => {
        const onDelete = vi.fn();
        const candidate = baseCandidate();

        render(<CandidateDetailPanel candidate={candidate} onDelete={onDelete} />);

        fireEvent.click(screen.getByLabelText("More candidate actions"));
        fireEvent.click(screen.getByText("Remove candidate"));

        expect(onDelete).toHaveBeenCalledWith(candidate);
        expect(screen.queryByText("Remove candidate")).not.toBeInTheDocument();
    });

    it("does not render Edit/Delete options when the handlers are not provided", () => {
        render(<CandidateDetailPanel candidate={baseCandidate()} />);

        fireEvent.click(screen.getByLabelText("More candidate actions"));

        expect(screen.queryByText("Edit candidate")).not.toBeInTheDocument();
        expect(screen.queryByText("Remove candidate")).not.toBeInTheDocument();
    });

    it("toggles closed when the trigger is clicked again", () => {
        render(
            <CandidateDetailPanel candidate={baseCandidate()} onEdit={vi.fn()} />
        );

        const trigger = screen.getByLabelText("More candidate actions");

        fireEvent.click(trigger);
        expect(screen.getByText("Edit candidate")).toBeInTheDocument();

        fireEvent.click(trigger);
        expect(screen.queryByText("Edit candidate")).not.toBeInTheDocument();
    });
});

/* =======================================================================
   TABS
======================================================================= */

describe("tabs", () => {
    it("defaults to the Overview tab", () => {
        render(<CandidateDetailPanel candidate={baseCandidate()} />);

        expect(screen.getByText("Professional summary")).toBeInTheDocument();
    });

    it("switches to the Experience tab and shows the empty state when no experience is present", () => {
        render(<CandidateDetailPanel candidate={baseCandidate()} />);

        // The Overview tab (shown by default) renders an "Experience" signal
        // card in addition to the "Experience" tab button, so getByText would
        // match two elements. Scope the query to the tab button itself.
        fireEvent.click(screen.getByRole("button", { name: "Experience" }));

        expect(screen.getByText("No experience added")).toBeInTheDocument();
    });

    it("renders an experience timeline entry when experience data is present", () => {
        const candidate = baseCandidate({
            experiences: [
                {
                    id: "exp-1",
                    title: "Frontend Lead",
                    company: "Acme Corp",
                    startDate: "2021",
                    endDate: "2024",
                    description: "Led the web platform team.",
                    skills: ["React", "TypeScript"],
                },
            ],
        });

        render(<CandidateDetailPanel candidate={candidate} />);

        // Same disambiguation as above: target the tab button, not the
        // Overview tab's "Experience" signal card label.
        fireEvent.click(screen.getByRole("button", { name: "Experience" }));

        expect(screen.getByText("Frontend Lead")).toBeInTheDocument();
        expect(screen.getByText("Acme Corp")).toBeInTheDocument();
        expect(screen.getByText("2021 → 2024")).toBeInTheDocument();
        expect(screen.getByText("Led the web platform team.")).toBeInTheDocument();
    });

    it("switches to the Contacts & Notes tab and shows note content", () => {
        const candidate = baseCandidate({
            notes: [
                {
                    id: "n1",
                    text: "Great communicator",
                    createdAt: "2024-01-01T00:00:00.000Z",
                },
            ],
        });

        render(<CandidateDetailPanel candidate={candidate} />);

        fireEvent.click(screen.getByText("Contacts & Notes"));

        expect(screen.getByText("Great communicator")).toBeInTheDocument();
    });
});

/* =======================================================================
   SKILLS SECTION
======================================================================= */

describe("skills section", () => {
    it("shows only the first 8 skills, with a toggle to expand and collapse", () => {
        render(<CandidateDetailPanel candidate={baseCandidate()} />);

        // baseCandidate has 9 skills — the 9th ("AWS") should be hidden initially.
        expect(screen.getByText("Docker")).toBeInTheDocument();
        expect(screen.queryByText("AWS")).not.toBeInTheDocument();

        fireEvent.click(screen.getByText(/Show all 9 skills/i));

        expect(screen.getByText("AWS")).toBeInTheDocument();
        expect(screen.getByText("Show less")).toBeInTheDocument();

        fireEvent.click(screen.getByText("Show less"));

        expect(screen.queryByText("AWS")).not.toBeInTheDocument();
    });

    it("shows an empty state when there are no skills", () => {
        render(<CandidateDetailPanel candidate={baseCandidate({ skills: [] })} />);

        expect(
            screen.getByText("No skills have been added.")
        ).toBeInTheDocument();
    });

    it("does not render an expand toggle when there are 8 or fewer skills", () => {
        render(
            <CandidateDetailPanel
                candidate={baseCandidate({ skills: ["React", "TypeScript"] })}
            />
        );

        expect(screen.queryByText(/Show all/i)).not.toBeInTheDocument();
    });
});

/* =======================================================================
   NOTES
======================================================================= */

describe("notes", () => {
    it("adds a note through the form and calls onAddNote", () => {
        const onAddNote = vi.fn();

        render(
            <CandidateDetailPanel candidate={baseCandidate()} onAddNote={onAddNote} />
        );

        fireEvent.click(screen.getByText("Contacts & Notes"));

        const textarea = screen.getByPlaceholderText(
            "Add a private recruiter note…"
        );
        fireEvent.change(textarea, {
            target: { value: "Strong communicator, worth fast-tracking." },
        });

        fireEvent.click(screen.getByText("Add note"));

        expect(onAddNote).toHaveBeenCalledWith(
            "c1",
            "Strong communicator, worth fast-tracking."
        );
        expect(
            screen.getByText("Strong communicator, worth fast-tracking.")
        ).toBeInTheDocument();
        expect(textarea).toHaveValue("");
    });

    it("disables the add note button while the textarea is empty", () => {
        render(<CandidateDetailPanel candidate={baseCandidate()} />);

        fireEvent.click(screen.getByText("Contacts & Notes"));

        expect(screen.getByText("Add note").closest("button")).toBeDisabled();
    });

    it("keeps the add note button disabled for whitespace-only input", () => {
        const onAddNote = vi.fn();

        render(
            <CandidateDetailPanel candidate={baseCandidate()} onAddNote={onAddNote} />
        );

        fireEvent.click(screen.getByText("Contacts & Notes"));

        const textarea = screen.getByPlaceholderText(
            "Add a private recruiter note…"
        );
        fireEvent.change(textarea, { target: { value: "   " } });

        expect(screen.getByText("Add note").closest("button")).toBeDisabled();
        expect(onAddNote).not.toHaveBeenCalled();
    });

    it("shows the empty state when there are no notes", () => {
        render(<CandidateDetailPanel candidate={baseCandidate()} />);

        fireEvent.click(screen.getByText("Contacts & Notes"));

        expect(screen.getByText("No recruiter notes yet.")).toBeInTheDocument();
    });
});

/* =======================================================================
   CONTACT ROWS
======================================================================= */

describe("contact rows", () => {
    it("shows the candidate's email when it is a real address", () => {
        render(
            <CandidateDetailPanel
                candidate={baseCandidate({ email: "jane@corp.com" })}
            />
        );

        fireEvent.click(screen.getByText("Contacts & Notes"));

        expect(screen.getByText("jane@corp.com")).toBeInTheDocument();
    });

    it("treats placeholder domains as no email available", () => {
        render(
            <CandidateDetailPanel
                candidate={baseCandidate({ email: "jane@talent-candidate.ma" })}
            />
        );

        fireEvent.click(screen.getByText("Contacts & Notes"));

        expect(screen.getByText("No email available")).toBeInTheDocument();
    });

    it("does not show the quick-action email icon for placeholder emails", () => {
        render(
            <CandidateDetailPanel
                candidate={baseCandidate({ email: "jane@example.com" })}
            />
        );

        expect(screen.queryByLabelText("Email candidate")).not.toBeInTheDocument();
    });

    it("opens LinkedIn in a new tab when the Open button is clicked", () => {
        render(
            <CandidateDetailPanel
                candidate={baseCandidate({
                    linkedin: "https://linkedin.com/in/janedoe",
                })}
            />
        );

        fireEvent.click(screen.getByText("Contacts & Notes"));
        fireEvent.click(screen.getByText("Open"));

        expect(window.open).toHaveBeenCalledWith(
            "https://linkedin.com/in/janedoe",
            "_blank",
            "noopener,noreferrer"
        );
    });

    it("does not render a LinkedIn contact row when no linkedin url is present", () => {
        render(
            <CandidateDetailPanel
                candidate={baseCandidate({ linkedin: undefined })}
            />
        );

        fireEvent.click(screen.getByText("Contacts & Notes"));

        expect(screen.queryByText("Open")).not.toBeInTheDocument();
    });
});

/* =======================================================================
   OUTREACH STUDIO
======================================================================= */

describe("outreach studio", () => {
    it("opens the studio, shows a loading state, then a drafted email", async () => {
        render(
            <CandidateDetailPanel
                candidate={baseCandidate({ email: "jane@corp.com" })}
            />
        );

        fireEvent.click(screen.getByText("Draft"));

        expect(screen.getByText(/Building a tailored message/i)).toBeInTheDocument();

        // draftOutreachApi resolves after ~1100ms — the default waitFor
        // timeout (1000ms) is too short, so give it explicit headroom.
        // Note: jest-dom's toHaveValue does an exact-value comparison and
        // doesn't support asymmetric matchers like stringContaining for
        // partial matches, so we check the raw `.value` instead.
        await waitFor(
            () => {
                expect(
                    screen.getByPlaceholderText("Your message…").value
                ).toContain("Hi Jane,");
            },
            { timeout: 2000 }
        );

        expect(
            screen.getByPlaceholderText("Subject").value
        ).toContain("Quick introduction");
    });

    it("copies the draft to the clipboard", async () => {
        render(<CandidateDetailPanel candidate={baseCandidate()} />);

        fireEvent.click(screen.getByText("Draft"));

        await waitFor(
            () => {
                expect(
                    screen.getByPlaceholderText("Your message…")
                ).not.toHaveValue("");
            },
            { timeout: 2000 }
        );

        fireEvent.click(screen.getByText("Copy"));

        await waitFor(() => {
            expect(navigator.clipboard.writeText).toHaveBeenCalled();
        });

        expect(await screen.findByText("Copied")).toBeInTheDocument();
    });

    it("switches to the LinkedIn channel and hides the subject field", async () => {
        render(
            <CandidateDetailPanel
                candidate={baseCandidate({
                    linkedin: "https://linkedin.com/in/janedoe",
                })}
            />
        );

        fireEvent.click(screen.getByText("Draft"));

        await waitFor(
            () => {
                expect(
                    screen.getByPlaceholderText("Your message…")
                ).not.toHaveValue("");
            },
            { timeout: 2000 }
        );

        fireEvent.click(screen.getByText("LinkedIn"));

        await waitFor(
            () => {
                expect(
                    screen.getByPlaceholderText("Your message…")
                ).not.toHaveValue("");
            },
            { timeout: 2000 }
        );

        expect(screen.queryByPlaceholderText("Subject")).not.toBeInTheDocument();
    });

    it("closes the outreach studio", () => {
        render(<CandidateDetailPanel candidate={baseCandidate()} />);

        fireEvent.click(screen.getByText("Draft"));
        expect(
            screen.getByText(/Building a tailored message|Ready to reach out/i)
        ).toBeInTheDocument();

        fireEvent.click(screen.getByLabelText("Close outreach studio"));

        expect(
            screen.queryByPlaceholderText("Your message…")
        ).not.toBeInTheDocument();
    });
});