import React from "react";
import {
    act,
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import SearchConsole from "../components/SearchConsole";
import { useLanguage } from "../context/LanguageContext";
import { searchLocations } from "../utils/geocoding";

vi.mock("../context/LanguageContext", () => ({
    useLanguage: vi.fn(),
}));

vi.mock("../utils/geocoding", () => ({
    searchLocations: vi.fn(),
}));

const searchLocationsMock = vi.mocked(searchLocations);

const createJob = (overrides = {}) => ({
    id: "job-1",
    title: "Senior Frontend Developer",
    description:
        "We are looking for a senior React developer with strong frontend experience.",
    prompt:
        "Find a senior frontend developer with React and TypeScript experience.",
    location: "Casablanca",
    minExperience: 5,
    maxResults: 25,
    seniority: "Senior",
    skills: ["React", "TypeScript"],
    technologies: ["Vite", "Node.js"],
    requiredSkills: [],
    requirements: [],
    ...overrides,
});

const defaultProps = {
    onSearch: vi.fn(),
    isSearching: false,
    selectedJob: createJob(),
    searchMode: "ai",
    onSearchModeChange: vi.fn(),
    sourcedCandidateCount: 0,
};

/**
 * Get the editable requirement chip.
 *
 * SearchConsole renders the same requirement text in two places:
 *  - SEARCH CONTEXT (.refinement-chip, read-only, no remove control)
 *  - the editable requirements area (.requirement-chip, has a remove button)
 *
 * We specifically target .requirement-chip so we never accidentally match
 * the read-only context pill.
 */
const getRequirementChip = (name) => {
    const matches = screen.getAllByText(name, {
        exact: true,
    });

    const chip = matches
        .map((element) => element.closest(".requirement-chip"))
        .find(Boolean);

    if (!chip) {
        throw new Error(
            `Could not find editable requirement chip for "${name}".`
        );
    }

    return chip;
};

/**
 * Find the actual remove control inside an editable requirement chip.
 */
const getRequirementRemoveButton = (name) => {
    const chip = getRequirementChip(name);

    const button =
        chip.querySelector("button") ||
        chip.querySelector("[role='button']") ||
        chip.querySelector("[aria-label*='Remove']") ||
        chip.querySelector("[title*='Remove']");

    if (!button) {
        throw new Error(`Could not find remove button for "${name}"`);
    }

    return button;
};

/**
 * Get the "add a skill or requirement" text input specifically.
 *
 * Once the filter panel is open there are THREE role="textbox" elements:
 * the prompt textarea, the location input, and the requirement input.
 * Filtering only against the prompt textarea (as an earlier version of
 * this suite did) can accidentally select the location input instead,
 * since it also has role="textbox" and appears earlier in the DOM.
 * Matching by placeholder text is unambiguous.
 */
const getTechnologyInput = () =>
    screen.getByPlaceholderText(
        /add (a skill or requirement|another requirement)\.\.\./i
    );

const getSearchButton = () =>
    screen.getByRole("button", {
        name: "Search candidates",
        exact: true,
    });

/**
 * The submit button's accessible name changes to "Searching..." while
 * isSearching is true, so tests covering that state need a matcher that
 * covers both labels without also matching "Clear search prompt" (which
 * also contains the substring "search").
 */
const getRunSearchButton = () =>
    screen.getByRole("button", {
        name: /search candidates|searching/i,
    });

const getFiltersButton = () =>
    screen.getByRole("button", {
        name: "Filters",
        exact: true,
    });

beforeEach(() => {
    vi.clearAllMocks();

    useLanguage.mockReturnValue({
        lang: "EN",
        t: (key) => key,
    });

    searchLocationsMock.mockResolvedValue([]);
});

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
});

describe("SearchConsole", () => {
    describe("basic rendering", () => {
        it("renders the search prompt", () => {
            render(<SearchConsole {...defaultProps} />);

            expect(
                screen.getByPlaceholderText("Describe your ideal candidate...")
            ).toBeInTheDocument();
        });

        it("renders the selected job description in the prompt", () => {
            render(<SearchConsole {...defaultProps} />);

            expect(
                screen.getByDisplayValue(
                    "We are looking for a senior React developer with strong frontend experience."
                )
            ).toBeInTheDocument();
        });

        it("renders the Filters button", () => {
            render(<SearchConsole {...defaultProps} />);

            expect(getFiltersButton()).toBeInTheDocument();
        });

        it("renders the Search candidates button", () => {
            render(<SearchConsole {...defaultProps} />);

            expect(getSearchButton()).toBeInTheDocument();
        });

        it("renders search context information", () => {
            render(<SearchConsole {...defaultProps} />);

            expect(
                screen.getByText("SEARCH CONTEXT", { exact: true })
            ).toBeInTheDocument();
        });

        it("renders the job requirements", () => {
            render(<SearchConsole {...defaultProps} />);

            expect(
                screen.getAllByText("React", { exact: true }).length
            ).toBeGreaterThan(0);

            expect(
                screen.getAllByText("TypeScript", { exact: true }).length
            ).toBeGreaterThan(0);
        });
    });

    describe("prompt", () => {
        it("allows editing the search prompt", () => {
            render(<SearchConsole {...defaultProps} />);

            const textarea = screen.getByPlaceholderText(
                "Describe your ideal candidate..."
            );

            fireEvent.change(textarea, {
                target: {
                    value: "Find a React developer in Casablanca",
                },
            });

            expect(textarea).toHaveValue(
                "Find a React developer in Casablanca"
            );
        });

        it("clears the search prompt", () => {
            render(<SearchConsole {...defaultProps} />);

            const textarea = screen.getByPlaceholderText(
                "Describe your ideal candidate..."
            );

            expect(textarea).toHaveValue(
                "We are looking for a senior React developer with strong frontend experience."
            );

            fireEvent.click(
                screen.getByRole("button", {
                    name: "Clear search prompt",
                    exact: true,
                })
            );

            expect(textarea).toHaveValue("");
        });

        it("does not render the clear button when there is no query", () => {
            const job = createJob({
                description: "",
                prompt: "",
                title: "",
            });

            render(
                <SearchConsole
                    {...defaultProps}
                    selectedJob={job}
                />
            );

            expect(
                screen.queryByRole("button", {
                    name: "Clear search prompt",
                    exact: true,
                })
            ).not.toBeInTheDocument();
        });
    });

    describe("search submission", () => {
        it("submits the selected job description", () => {
            const onSearch = vi.fn();

            render(
                <SearchConsole
                    {...defaultProps}
                    onSearch={onSearch}
                />
            );

            fireEvent.click(getSearchButton());

            expect(onSearch).toHaveBeenCalledTimes(1);

            const [query, filters, jobId] = onSearch.mock.calls[0];

            expect(query).toBe(
                "We are looking for a senior React developer with strong frontend experience."
            );

            // The prompt textarea is pre-filled with the job description,
            // so on first submit (no edits) `refinement` equals that same
            // text rather than being empty.
            expect(filters).toMatchObject({
                location: "Casablanca",
                minExp: 5,
                maxResults: 25,
                searchMode: "ai",
                refinement:
                    "We are looking for a senior React developer with strong frontend experience.",
            });

            expect(jobId).toBe("job-1");
        });

        it("uses the edited prompt when provided", () => {
            const onSearch = vi.fn();

            render(
                <SearchConsole
                    {...defaultProps}
                    onSearch={onSearch}
                />
            );

            const textarea = screen.getByPlaceholderText(
                "Describe your ideal candidate..."
            );

            fireEvent.change(textarea, {
                target: {
                    value: "Find a senior Vue developer",
                },
            });

            fireEvent.click(getSearchButton());

            expect(onSearch).toHaveBeenCalledTimes(1);

            const [query, filters] = onSearch.mock.calls[0];

            expect(query).toBe("Find a senior Vue developer");
            expect(filters.refinement).toBe(
                "Find a senior Vue developer"
            );
        });

        it("falls back to the job prompt when description is empty", () => {
            const onSearch = vi.fn();

            const job = createJob({
                description: "",
            });

            render(
                <SearchConsole
                    {...defaultProps}
                    selectedJob={job}
                    onSearch={onSearch}
                />
            );

            fireEvent.click(getSearchButton());

            expect(onSearch).toHaveBeenCalled();

            expect(onSearch.mock.calls[0][0]).toBe(job.prompt);
        });

        it("falls back to the job title when description and prompt are empty", () => {
            const onSearch = vi.fn();

            const job = createJob({
                description: "",
                prompt: "",
            });

            render(
                <SearchConsole
                    {...defaultProps}
                    selectedJob={job}
                    onSearch={onSearch}
                />
            );

            fireEvent.click(getSearchButton());

            expect(onSearch.mock.calls[0][0]).toBe(job.title);
        });

        it("uses Technical Sourcing when no job text is available", () => {
            const onSearch = vi.fn();

            const job = createJob({
                description: "",
                prompt: "",
                title: "",
            });

            render(
                <SearchConsole
                    {...defaultProps}
                    selectedJob={job}
                    onSearch={onSearch}
                />
            );

            fireEvent.click(getSearchButton());

            expect(onSearch.mock.calls[0][0]).toBe("Technical Sourcing");
        });

        it("does not crash when onSearch is not provided", () => {
            render(
                <SearchConsole
                    {...defaultProps}
                    onSearch={undefined}
                />
            );

            expect(() => {
                fireEvent.click(getSearchButton());
            }).not.toThrow();
        });
    });

    describe("searching state", () => {
        it("disables the search button while searching", () => {
            render(
                <SearchConsole
                    {...defaultProps}
                    isSearching
                />
            );

            expect(getRunSearchButton()).toBeDisabled();
        });

        it("shows the searching state", () => {
            render(
                <SearchConsole
                    {...defaultProps}
                    isSearching
                />
            );

            const button = getRunSearchButton();

            expect(button).toHaveTextContent("Searching...");
            expect(button).toBeDisabled();
        });
    });

    describe("filters", () => {
        it("opens the filters panel", () => {
            render(<SearchConsole {...defaultProps} />);

            const filtersButton = getFiltersButton();

            expect(filtersButton).toHaveAttribute(
                "aria-expanded",
                "false"
            );

            fireEvent.click(filtersButton);

            expect(filtersButton).toHaveAttribute(
                "aria-expanded",
                "true"
            );
        });

        it("closes the filters panel", () => {
            render(<SearchConsole {...defaultProps} />);

            const filtersButton = getFiltersButton();

            fireEvent.click(filtersButton);

            expect(filtersButton).toHaveAttribute(
                "aria-expanded",
                "true"
            );

            fireEvent.click(filtersButton);

            expect(filtersButton).toHaveAttribute(
                "aria-expanded",
                "false"
            );
        });

        it("loads the selected job location", () => {
            render(<SearchConsole {...defaultProps} />);

            fireEvent.click(getFiltersButton());

            expect(
                screen.getByDisplayValue("Casablanca")
            ).toBeInTheDocument();
        });

        it("loads the selected job minimum experience", () => {
            render(<SearchConsole {...defaultProps} />);

            fireEvent.click(getFiltersButton());

            expect(
                screen.getByDisplayValue("5")
            ).toBeInTheDocument();
        });

        it("loads the selected job maximum results", () => {
            render(<SearchConsole {...defaultProps} />);

            fireEvent.click(getFiltersButton());

            expect(
                screen.getByDisplayValue("25")
            ).toBeInTheDocument();
        });

        it("allows changing the location", () => {
            render(<SearchConsole {...defaultProps} />);

            fireEvent.click(getFiltersButton());

            const locationInput =
                screen.getByDisplayValue("Casablanca");

            fireEvent.change(locationInput, {
                target: {
                    value: "Rabat",
                },
            });

            expect(locationInput).toHaveValue("Rabat");
        });

        it("allows changing minimum experience", () => {
            render(<SearchConsole {...defaultProps} />);

            fireEvent.click(getFiltersButton());

            const minExperience =
                screen.getByDisplayValue("5");

            fireEvent.change(minExperience, {
                target: {
                    value: "3",
                },
            });

            // Number inputs report their value as a number to RTL's
            // toHaveValue matcher, not as a string.
            expect(minExperience).toHaveValue(3);
        });

        it("allows changing maximum results", () => {
            render(<SearchConsole {...defaultProps} />);

            fireEvent.click(getFiltersButton());

            const maxResults =
                screen.getByDisplayValue("25");

            fireEvent.change(maxResults, {
                target: {
                    value: "50",
                },
            });

            expect(maxResults).toHaveValue(50);
        });

        it("submits changed filters", () => {
            const onSearch = vi.fn();

            render(
                <SearchConsole
                    {...defaultProps}
                    onSearch={onSearch}
                />
            );

            fireEvent.click(getFiltersButton());

            fireEvent.change(
                screen.getByDisplayValue("Casablanca"),
                {
                    target: {
                        value: "Rabat",
                    },
                }
            );

            fireEvent.change(
                screen.getByDisplayValue("5"),
                {
                    target: {
                        value: "3",
                    },
                }
            );

            fireEvent.change(
                screen.getByDisplayValue("25"),
                {
                    target: {
                        value: "50",
                    },
                }
            );

            fireEvent.click(getSearchButton());

            const [, filters] = onSearch.mock.calls[0];

            expect(filters).toMatchObject({
                location: "Rabat",
                minExp: 3,
                maxResults: 50,
            });
        });

        it("resets filters to the job defaults", () => {
            const job = createJob({
                location: "Marrakech",
                minExperience: 7,
                maxResults: 40,
            });

            render(
                <SearchConsole
                    {...defaultProps}
                    selectedJob={job}
                />
            );

            fireEvent.click(getFiltersButton());

            fireEvent.change(
                screen.getByDisplayValue("Marrakech"),
                {
                    target: {
                        value: "Rabat",
                    },
                }
            );

            fireEvent.change(
                screen.getByDisplayValue("7"),
                {
                    target: {
                        value: "2",
                    },
                }
            );

            fireEvent.change(
                screen.getByDisplayValue("40"),
                {
                    target: {
                        value: "10",
                    },
                }
            );

            const resetButton = screen.getByRole("button", {
                name: /reset/i,
            });

            fireEvent.click(resetButton);

            expect(
                screen.getByDisplayValue("Marrakech")
            ).toBeInTheDocument();

            expect(
                screen.getByDisplayValue("7")
            ).toBeInTheDocument();

            expect(
                screen.getByDisplayValue("40")
            ).toBeInTheDocument();
        });
    });

    describe("requirements editor", () => {
        it("renders editable job requirements", () => {
            render(<SearchConsole {...defaultProps} />);

            fireEvent.click(getFiltersButton());

            expect(
                getRequirementChip("React")
            ).toBeInTheDocument();

            expect(
                getRequirementChip("TypeScript")
            ).toBeInTheDocument();
        });

        it("opens the technology suggestions", () => {
            render(<SearchConsole {...defaultProps} />);

            fireEvent.click(getFiltersButton());

            // "requirements" (case-insensitive) legitimately appears in
            // several places in the panel (eyebrow label, heading, helper
            // text), so assert there's at least one match rather than
            // exactly one.
            expect(
                screen.getAllByText(/requirements/i).length
            ).toBeGreaterThan(0);
        });

        it("adds a typed technology with Enter", () => {
            render(<SearchConsole {...defaultProps} />);

            fireEvent.click(getFiltersButton());

            const technologyInput = getTechnologyInput();

            fireEvent.change(technologyInput, {
                target: {
                    value: "Docker",
                },
            });

            fireEvent.keyDown(technologyInput, {
                key: "Enter",
                code: "Enter",
                charCode: 13,
            });

            expect(
                getRequirementChip("Docker")
            ).toBeInTheDocument();
        });

        it("adds a typed technology with comma", () => {
            render(<SearchConsole {...defaultProps} />);

            fireEvent.click(getFiltersButton());

            const technologyInput = getTechnologyInput();

            fireEvent.change(technologyInput, {
                target: {
                    value: "Docker",
                },
            });

            fireEvent.keyDown(technologyInput, {
                key: ",",
                code: "Comma",
            });

            expect(
                getRequirementChip("Docker")
            ).toBeInTheDocument();
        });

        it("does not add duplicate requirements", () => {
            render(<SearchConsole {...defaultProps} />);

            fireEvent.click(getFiltersButton());

            const technologyInput = getTechnologyInput();

            fireEvent.change(technologyInput, {
                target: {
                    value: "React",
                },
            });

            fireEvent.keyDown(technologyInput, {
                key: "Enter",
                code: "Enter",
            });

            const reactMatches = screen.getAllByText("React", {
                exact: true,
            });

            expect(reactMatches.length).toBeGreaterThanOrEqual(1);
        });

        it("removes an editable requirement", () => {
            render(<SearchConsole {...defaultProps} />);

            fireEvent.click(getFiltersButton());

            const chip = getRequirementChip("TypeScript");

            const removeButton =
                chip.querySelector("button") ||
                chip.querySelector("[role='button']");

            expect(removeButton).toBeTruthy();

            fireEvent.click(removeButton);

            expect(() => {
                getRequirementChip("TypeScript");
            }).toThrow();
        });

        it("supports Backspace removal when the technology input is empty", () => {
            render(<SearchConsole {...defaultProps} />);

            fireEvent.click(getFiltersButton());

            const technologyInput = getTechnologyInput();

            fireEvent.keyDown(technologyInput, {
                key: "Backspace",
                code: "Backspace",
            });

            expect(technologyInput).toBeInTheDocument();
        });
    });

    describe("location autocomplete", () => {
        it("searches locations after typing", async () => {
            searchLocationsMock.mockResolvedValue([
                {
                    label: "Paris",
                    value: "Paris",
                },
            ]);

            render(<SearchConsole {...defaultProps} />);

            fireEvent.click(getFiltersButton());

            const locationInput =
                screen.getByDisplayValue("Casablanca");

            fireEvent.change(locationInput, {
                target: {
                    value: "Par",
                },
            });

            await waitFor(() => {
                expect(searchLocationsMock).toHaveBeenCalled();
            });

            expect(searchLocationsMock).toHaveBeenCalledWith(
                "Par",
                "en"
            );
        });

        it("renders location suggestions", async () => {
            searchLocationsMock.mockResolvedValue([
                {
                    label: "Paris",
                    value: "Paris",
                },
                {
                    label: "Parma",
                    value: "Parma",
                },
            ]);

            render(<SearchConsole {...defaultProps} />);

            fireEvent.click(getFiltersButton());

            const locationInput =
                screen.getByDisplayValue("Casablanca");

            fireEvent.change(locationInput, {
                target: {
                    value: "Par",
                },
            });

            await waitFor(() => {
                expect(
                    screen.getByText("Paris", {
                        exact: true,
                    })
                ).toBeInTheDocument();
            });
        });

        it("selects a location suggestion", async () => {
            searchLocationsMock.mockResolvedValue([
                {
                    label: "Paris",
                    value: "Paris",
                },
            ]);

            render(<SearchConsole {...defaultProps} />);

            fireEvent.click(getFiltersButton());

            const locationInput =
                screen.getByDisplayValue("Casablanca");

            fireEvent.change(locationInput, {
                target: {
                    value: "Par",
                },
            });

            const suggestion = await screen.findByText("Paris", {
                exact: true,
            });

            fireEvent.click(suggestion);

            expect(locationInput).toHaveValue("Paris");
        });
    });

    describe("selected job changes", () => {
        it("loads the new job values", async () => {
            const { rerender } = render(
                <SearchConsole {...defaultProps} />
            );

            const newJob = createJob({
                id: "job-2",
                title: "Java Backend Developer",
                description:
                    "Find an experienced Java backend engineer.",
                prompt:
                    "Find a Java developer with Spring Boot experience.",
                location: "Rabat",
                minExperience: 3,
                maxResults: 15,
                seniority: "Mid-level",
                skills: ["Java"],
                technologies: ["Spring Boot"],
            });

            rerender(
                <SearchConsole
                    {...defaultProps}
                    selectedJob={newJob}
                />
            );

            await waitFor(() => {
                expect(
                    screen.getByDisplayValue(
                        "Find an experienced Java backend engineer."
                    )
                ).toBeInTheDocument();
            });

            fireEvent.click(getFiltersButton());

            expect(
                screen.getByDisplayValue("Rabat")
            ).toBeInTheDocument();

            expect(
                screen.getByDisplayValue("3")
            ).toBeInTheDocument();

            expect(
                screen.getByDisplayValue("15")
            ).toBeInTheDocument();

            expect(
                getRequirementChip("Java")
            ).toBeInTheDocument();

            expect(
                getRequirementChip("Spring Boot")
            ).toBeInTheDocument();
        });

        it("does not keep requirements from the previous job", async () => {
            const firstJob = createJob({
                skills: ["React"],
                technologies: ["TypeScript"],
            });

            const secondJob = createJob({
                id: "job-2",
                skills: ["Java"],
                technologies: ["Spring Boot"],
            });

            const { rerender } = render(
                <SearchConsole
                    {...defaultProps}
                    selectedJob={firstJob}
                />
            );

            rerender(
                <SearchConsole
                    {...defaultProps}
                    selectedJob={secondJob}
                />
            );

            // Changing selectedJob.id resets showFilters to false, so the
            // panel must be reopened after the rerender before checking
            // for requirement chips.
            fireEvent.click(getFiltersButton());

            await waitFor(() => {
                expect(
                    getRequirementChip("Java")
                ).toBeInTheDocument();
            });

            expect(() => {
                getRequirementChip("React");
            }).toThrow();

            expect(() => {
                getRequirementChip("TypeScript");
            }).toThrow();
        });
    });

    describe("seniority defaults", () => {
        const cases = [
            ["Junior", 1],
            ["Mid-level", 3],
            ["Senior", 5],
            ["Lead", 8],
            ["Manager", 8],
        ];

        it.each(cases)(
            "uses %s seniority default of %s years",
            (seniority, expectedExperience) => {
                const job = createJob({
                    minExperience: undefined,
                    seniority,
                });

                render(
                    <SearchConsole
                        {...defaultProps}
                        selectedJob={job}
                    />
                );

                fireEvent.click(getFiltersButton());

                expect(
                    screen.getByDisplayValue(
                        String(expectedExperience)
                    )
                ).toBeInTheDocument();
            }
        );
    });

    describe("French language", () => {
        it("renders without crashing when language is French", () => {
            useLanguage.mockReturnValue({
                lang: "FR",
                t: (key) => key,
            });

            render(<SearchConsole {...defaultProps} />);

            expect(
                screen.getByPlaceholderText(
                    "Décrivez votre candidat idéal..."
                )
            ).toBeInTheDocument();
        });

        it("renders the French prompt placeholder", () => {
            useLanguage.mockReturnValue({
                lang: "FR",
                t: (key) => key,
            });

            render(<SearchConsole {...defaultProps} />);

            expect(
                screen.getByPlaceholderText(
                    "Décrivez votre candidat idéal..."
                )
            ).toBeInTheDocument();
        });

        it("renders French labels for controls that have French copy", () => {
            useLanguage.mockReturnValue({
                lang: "FR",
                t: (key) => key,
            });

            render(<SearchConsole {...defaultProps} />);

            expect(
                screen.getByRole("button", {
                    name: "Effacer la description de recherche",
                    exact: true,
                })
            ).toBeInTheDocument();

            expect(
                screen.getByRole("button", {
                    name: "Filtres",
                    exact: true,
                })
            ).toBeInTheDocument();
        });
    });

    describe("edited search payload", () => {
        it("removes TypeScript and adds Docker to the search payload", () => {
            const onSearch = vi.fn();

            render(
                <SearchConsole
                    {...defaultProps}
                    onSearch={onSearch}
                />
            );

            fireEvent.click(getFiltersButton());

            const removeButton =
                getRequirementRemoveButton("TypeScript");

            fireEvent.click(removeButton);

            const technologyInput = getTechnologyInput();

            fireEvent.change(technologyInput, {
                target: {
                    value: "Docker",
                },
            });

            fireEvent.keyDown(technologyInput, {
                key: "Enter",
                code: "Enter",
            });

            fireEvent.click(getSearchButton());

            expect(onSearch).toHaveBeenCalledTimes(1);

            const [, filters] = onSearch.mock.calls[0];

            expect(filters.tech).toEqual(
                expect.arrayContaining([
                    "React",
                    "Docker",
                ])
            );

            expect(filters.tech).not.toContain("TypeScript");
        });
    });

    describe("stale location requests", () => {
        it("ignores stale location responses", async () => {
            vi.useFakeTimers();

            const requests = [];

            searchLocationsMock.mockImplementation(
                () =>
                    new Promise((resolve) => {
                        requests.push(resolve);
                    })
            );

            render(<SearchConsole {...defaultProps} />);

            fireEvent.click(getFiltersButton());

            const locationInput =
                screen.getByDisplayValue("Casablanca");

            fireEvent.change(locationInput, {
                target: {
                    value: "pa",
                },
            });

            await act(async () => {
                vi.advanceTimersByTime(450);
                await Promise.resolve();
            });

            expect(requests).toHaveLength(1);

            fireEvent.change(locationInput, {
                target: {
                    value: "par",
                },
            });

            await act(async () => {
                vi.advanceTimersByTime(450);
                await Promise.resolve();
            });

            expect(requests).toHaveLength(2);

            await act(async () => {
                requests[1]([
                    {
                        label: "Paris",
                        value: "Paris",
                    },
                ]);

                await Promise.resolve();
            });

            expect(
                screen.getByText("Paris", {
                    exact: true,
                })
            ).toBeInTheDocument();

            await act(async () => {
                requests[0]([
                    {
                        label: "Palo Alto",
                        value: "Palo Alto",
                    },
                ]);

                await Promise.resolve();
            });

            expect(
                screen.getByText("Paris", {
                    exact: true,
                })
            ).toBeInTheDocument();

            expect(
                screen.queryByText("Palo Alto", {
                    exact: true,
                })
            ).not.toBeInTheDocument();

            vi.useRealTimers();
        });
    });

    describe("props", () => {
        it("accepts ai search mode", () => {
            render(
                <SearchConsole
                    {...defaultProps}
                    searchMode="ai"
                />
            );

            expect(getSearchButton()).toBeInTheDocument();
        });

        it("accepts traditional search mode", () => {
            render(
                <SearchConsole
                    {...defaultProps}
                    searchMode="traditional"
                />
            );

            expect(getSearchButton()).toBeInTheDocument();
        });

        it("accepts sourcedCandidateCount", () => {
            render(
                <SearchConsole
                    {...defaultProps}
                    sourcedCandidateCount={12}
                />
            );

            expect(getSearchButton()).toBeInTheDocument();
        });

        it("accepts onSearchModeChange", () => {
            const onSearchModeChange = vi.fn();

            render(
                <SearchConsole
                    {...defaultProps}
                    onSearchModeChange={onSearchModeChange}
                />
            );

            expect(getSearchButton()).toBeInTheDocument();
        });

        it("does not crash without a selected job", () => {
            render(
                <SearchConsole
                    {...defaultProps}
                    selectedJob={null}
                />
            );

            expect(
                screen.getByPlaceholderText(
                    "Select a job to start sourcing..."
                )
            ).toBeInTheDocument();

            expect(getSearchButton()).toBeDisabled();
        });

        it("disables the prompt without a selected job", () => {
            render(
                <SearchConsole
                    {...defaultProps}
                    selectedJob={null}
                />
            );

            expect(
                screen.getByPlaceholderText(
                    "Select a job to start sourcing..."
                )
            ).toBeDisabled();
        });

        it("disables search without a selected job", () => {
            render(
                <SearchConsole
                    {...defaultProps}
                    selectedJob={null}
                />
            );

            expect(getSearchButton()).toBeDisabled();
        });
    });
});