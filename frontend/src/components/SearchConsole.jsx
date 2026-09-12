/**
 * SearchConsole
 *
 * Refinement console for candidate sourcing.
 *
 * Design goals:
 *  - The selected job prompt is real editable text, not a placeholder.
 *  - The prompt textarea automatically grows to fit its content.
 *  - Location uses the same autocomplete behavior as JobDescriptionModal.
 *  - All sourcing requirements can be edited directly here.
 *  - Requirements are derived from the selected job instead of hard-coded
 *    examples, so this works across all job types.
 *  - Large datasets remain manageable because the UI does not render
 *    unnecessary candidate/note data here.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Braces,
  Briefcase,
  Check,
  ChevronDown,
  MapPin,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Users,
  X,
} from "lucide-react";

import { searchLocations } from "../utils/geocoding";

const getMinExperienceFromSeniority = (seniorityStr) => {
  if (!seniorityStr) return 3;

  if (seniorityStr.includes("Junior")) return 1;
  if (seniorityStr.includes("Mid-level")) return 3;
  if (seniorityStr.includes("Senior")) return 5;
  if (
    seniorityStr.includes("Lead") ||
    seniorityStr.includes("Manager")
  ) {
    return 8;
  }

  return 3;
};

/* -------------------------------------------------------
   Requirement normalization
------------------------------------------------------- */

const normalizeRequirementValues = (value) => {
  if (!value) return [];

  if (typeof value === "string") {
    return value
      .split(/\n|•|;/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (Array.isArray(value)) {
    return value
      .flatMap((item) => {
        if (typeof item === "string") return [item];

        if (item && typeof item === "object") {
          return [
            item.name ||
              item.label ||
              item.title ||
              item.value ||
              item.skill ||
              item.requirement ||
              "",
          ];
        }

        return [];
      })
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  if (typeof value === "object") {
    return [
      value.name ||
        value.label ||
        value.title ||
        value.value ||
        value.skill ||
        value.requirement ||
        "",
    ]
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  return [];
};

/* -------------------------------------------------------
   Extract useful requirement lines from description
------------------------------------------------------- */

const extractDescriptionRequirements = (description = "") => {
  if (!description) return [];

  return description
    .split("\n")
    .map((line) =>
      line
        .replace(/^[\s•*\-–—▪◦]+/, "")
        .replace(/^\d+[\.)]\s*/, "")
        .trim()
    )
    .filter((line) => {
      if (!line) return false;
      if (line.length < 2 || line.length > 100) return false;

      /*
       * Only use list-like lines here.
       * This prevents the entire job description from becoming
       * a requirement chip.
       */
      return (
        /^[•*\-–—▪◦]/.test(line) ||
        /^\d+[\.)]/.test(line)
      );
    });
};

/* -------------------------------------------------------
   Get requirements from any job shape
------------------------------------------------------- */

const getJobRequirements = (job) => {
  if (!job) return [];

  const fields = [
    job.skills,
    job.technologies,
    job.techStack,
    job.requiredSkills,
    job.requirements,
    job.qualifications,
    job.skillsAndRequirements,
    job.requiredQualifications,
    job.preferredSkills,
    job.preferredQualifications,
  ];

  const values = fields.flatMap(normalizeRequirementValues);

  const descriptionRequirements = extractDescriptionRequirements(
    job.description || job.prompt || ""
  );

  const combined = [...values, ...descriptionRequirements];

  const seen = new Set();

  return combined
    .map((item) => item.trim())
    .filter((item) => {
      const key = item.toLowerCase();

      if (!key || seen.has(key)) return false;

      seen.add(key);
      return true;
    })
    .slice(0, 30);
};

/* -------------------------------------------------------
   Context chip
------------------------------------------------------- */

const ContextChip = ({ icon, children }) => (
  <span className="refinement-chip">
    {icon}
    <span>{children}</span>
  </span>
);

/* -------------------------------------------------------
   Component
------------------------------------------------------- */

const SearchConsole = ({
  onSearch,
  isSearching = false,
  selectedJob,
  searchMode = "ai",
  onSearchModeChange,
  sourcedCandidateCount = 0,
}) => {
  const defaultLocation = selectedJob?.location || "";

  const defaultMinExp =
    Number(selectedJob?.minExperience) ||
    getMinExperienceFromSeniority(selectedJob?.seniority) ||
    3;

  const defaultMaxResults =
    Number(selectedJob?.maxResults) || 10;

  const defaultSkills = useMemo(
    () => getJobRequirements(selectedJob).slice(0, 8),
    [selectedJob]
  );

  const [query, setQuery] = useState(
    selectedJob?.description || selectedJob?.prompt || ""
  );

  const [location, setLocation] = useState(defaultLocation);
  const [minExp, setMinExp] = useState(defaultMinExp);
  const [maxResults, setMaxResults] = useState(defaultMaxResults);
  const [selectedTech, setSelectedTech] = useState(defaultSkills);

  const [techInput, setTechInput] = useState("");
  const [showTechSuggestions, setShowTechSuggestions] =
    useState(false);

  const [showFilters, setShowFilters] = useState(false);

  const [locationSuggestions, setLocationSuggestions] =
    useState([]);

  const [showLocationDropdown, setShowLocationDropdown] =
    useState(false);

  const [isLoadingLocations, setIsLoadingLocations] =
    useState(false);

  const locationDebounceRef = useRef(null);
  const locationRequestRef = useRef(0);

  /*
   * This ref controls the prompt height.
   *
   * The textarea is allowed to grow with its content so the complete
   * selected job prompt remains visible instead of being clipped.
   */
  const promptRef = useRef(null);

  /* -------------------------------------------------------
     Prompt auto-sizing
  ------------------------------------------------------- */

  const resizePrompt = () => {
    const textarea = promptRef.current;

    if (!textarea) return;

    /*
     * Reset first so shrinking also works when text is deleted.
     */
    textarea.style.height = "auto";

    /*
     * Grow exactly enough to contain the content.
     *
     * The max-height prevents an extremely large description from
     * taking over the entire screen. Once that practical limit is
     * reached, the textarea itself becomes scrollable.
     */
    const nextHeight = Math.min(
      Math.max(textarea.scrollHeight, 76),
      340
    );

    textarea.style.height = `${nextHeight}px`;
  };

  useEffect(() => {
    resizePrompt();
  }, [query, selectedJob?.id]);

  /* -------------------------------------------------------
     Reset when changing job
  ------------------------------------------------------- */

  useEffect(() => {
    const description =
      selectedJob?.description ||
      selectedJob?.prompt ||
      "";

    setQuery(description);

    setLocation(selectedJob?.location || "");

    setMinExp(
      Number(selectedJob?.minExperience) ||
        getMinExperienceFromSeniority(
          selectedJob?.seniority
        ) ||
        3
    );

    setMaxResults(
      Number(selectedJob?.maxResults) || 10
    );

    setSelectedTech(
      getJobRequirements(selectedJob).slice(0, 8)
    );

    setTechInput("");
    setShowTechSuggestions(false);
    setShowFilters(false);

    setLocationSuggestions([]);
    setShowLocationDropdown(false);
  }, [selectedJob?.id]);

  /* -------------------------------------------------------
     Requirements from current job
  ------------------------------------------------------- */

  const jobRequirementSuggestions = useMemo(
    () => getJobRequirements(selectedJob),
    [selectedJob]
  );

  const availableTechSuggestions = useMemo(() => {
    const input = techInput.trim().toLowerCase();

    return jobRequirementSuggestions
      .filter(
        (requirement) =>
          !selectedTech.some(
            (selected) =>
              selected.toLowerCase() ===
              requirement.toLowerCase()
          )
      )
      .filter((requirement) =>
        input
          ? requirement.toLowerCase().includes(input)
          : true
      )
      .slice(0, 8);
  }, [
    jobRequirementSuggestions,
    selectedTech,
    techInput,
  ]);

  /* -------------------------------------------------------
     Active filter count
  ------------------------------------------------------- */

  const activeFilterCount = useMemo(() => {
    let count = 0;

    if (location !== defaultLocation) {
      count += 1;
    }

    if (minExp !== defaultMinExp) {
      count += 1;
    }

    const current = [...selectedTech]
      .sort()
      .join("|");

    const defaults = [...defaultSkills]
      .sort()
      .join("|");

    if (current !== defaults) {
      count += 1;
    }

    if (maxResults !== defaultMaxResults) {
      count += 1;
    }

    return count;
  }, [
    location,
    minExp,
    selectedTech,
    maxResults,
    defaultLocation,
    defaultMinExp,
    defaultSkills,
    defaultMaxResults,
  ]);

  /* -------------------------------------------------------
     Location autocomplete
  ------------------------------------------------------- */

  const handleLocationChange = (value) => {
    setLocation(value);
    setShowLocationDropdown(true);

    if (locationDebounceRef.current) {
      clearTimeout(locationDebounceRef.current);
    }

    if (!value || value.trim().length < 2) {
      setLocationSuggestions([]);
      setIsLoadingLocations(false);
      return;
    }

    const requestId =
      ++locationRequestRef.current;

    locationDebounceRef.current = setTimeout(
      async () => {
        try {
          setIsLoadingLocations(true);

          const results = await searchLocations(
            value,
            "en"
          );

          /*
           * Ignore stale responses.
           */
          if (
            requestId !== locationRequestRef.current
          ) {
            return;
          }

          setLocationSuggestions(
            Array.isArray(results) ? results : []
          );
        } catch (error) {
          if (
            requestId === locationRequestRef.current
          ) {
            setLocationSuggestions([]);
          }
        } finally {
          if (
            requestId === locationRequestRef.current
          ) {
            setIsLoadingLocations(false);
          }
        }
      },
      400
    );
  };

  const selectLocation = (suggestion) => {
    setLocation(suggestion.label);
    setShowLocationDropdown(false);
    setLocationSuggestions([]);
  };

  /* -------------------------------------------------------
     Requirement editing
  ------------------------------------------------------- */

  const addTechnology = (value) => {
    const cleaned = String(value || "").trim();

    if (!cleaned) return;

    const alreadyExists = selectedTech.some(
      (item) =>
        item.toLowerCase() === cleaned.toLowerCase()
    );

    if (alreadyExists) {
      setTechInput("");
      return;
    }

    setSelectedTech((current) => [
      ...current,
      cleaned,
    ]);

    setTechInput("");
  };

  const removeTechnology = (technology) => {
    setSelectedTech((current) =>
      current.filter(
        (item) => item !== technology
      )
    );
  };

  const handleTechInputKeyDown = (event) => {
    if (
      event.key === "Enter" ||
      event.key === ","
    ) {
      event.preventDefault();

      if (techInput.trim()) {
        addTechnology(techInput);
      }

      return;
    }

    if (
      event.key === "Backspace" &&
      !techInput &&
      selectedTech.length
    ) {
      setSelectedTech((current) =>
        current.slice(0, -1)
      );
    }
  };

  /* -------------------------------------------------------
     Reset
  ------------------------------------------------------- */

  const resetFilters = () => {
    setLocation(defaultLocation);
    setMinExp(defaultMinExp);
    setMaxResults(defaultMaxResults);
    setSelectedTech(defaultSkills);
    setTechInput("");
  };

  /* -------------------------------------------------------
     Search
  ------------------------------------------------------- */

  const submitSearch = (event) => {
    event?.preventDefault();

    const baseDescription =
      selectedJob?.description ||
      selectedJob?.prompt ||
      selectedJob?.title ||
      "Technical Sourcing";

    const finalQuery =
      query.trim() || baseDescription;

    /*
     * If the recruiter typed a requirement but didn't press
     * Enter/comma, include it automatically.
     */
    let finalTech = [...selectedTech];

    if (techInput.trim()) {
      const cleaned = techInput.trim();

      const exists = finalTech.some(
        (item) =>
          item.toLowerCase() ===
          cleaned.toLowerCase()
      );

      if (!exists) {
        finalTech.push(cleaned);
      }
    }

    onSearch?.(
      finalQuery,
      {
        location,
        minExp,
        tech: finalTech,
        maxResults,
        searchMode,
        refinement: query.trim(),
      },
      selectedJob?.id
    );
  };

  /* -------------------------------------------------------
     Cleanup
  ------------------------------------------------------- */

  useEffect(() => {
    return () => {
      if (locationDebounceRef.current) {
        clearTimeout(locationDebounceRef.current);
      }
    };
  }, []);

  /* -------------------------------------------------------
     Render
  ------------------------------------------------------- */

  return (
    <section className="refine-console">
      <style>{styles}</style>

      <form
        className={`refine-command ${
          showFilters
            ? "refine-command-open"
            : ""
        }`}
        onSubmit={submitSearch}
      >
        {/* -------------------------------------------------
            PROMPT
        -------------------------------------------------- */}

        <div className="refine-prompt-shell">
          <div className="refine-prompt-icon">
            <Sparkles size={17} />
          </div>

          <textarea
            ref={promptRef}
            className="refine-prompt"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              requestAnimationFrame(
                resizePrompt
              );
            }}
            onInput={resizePrompt}
            placeholder={
              selectedJob
                ? "Describe your ideal candidate..."
                : "Select a job to start sourcing..."
            }
            disabled={!selectedJob}
            rows={3}
            spellCheck
          />

          {query && (
            <button
              type="button"
              className="clear-query"
              onClick={() => {
                setQuery("");

                requestAnimationFrame(
                  resizePrompt
                );
              }}
              aria-label="Clear search prompt"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* -------------------------------------------------
            COMMAND ACTIONS
        -------------------------------------------------- */}

        <div className="refine-command-actions">
          <button
            type="button"
            className={`refine-control ${
              showFilters ? "active" : ""
            }`}
            onClick={() =>
              setShowFilters((value) => !value)
            }
          >
            <SlidersHorizontal size={14} />

            <span>Filters</span>

            {activeFilterCount > 0 && (
              <span className="filter-count">
                {activeFilterCount}
              </span>
            )}

            <ChevronDown
              size={12}
              className={
                showFilters
                  ? "chevron-open"
                  : ""
              }
            />
          </button>

          {/* Search mode */}
          <div className="search-mode-control">
            <button
              type="button"
              className={
                searchMode === "ai"
                  ? "mode-button active"
                  : "mode-button"
              }
              onClick={() =>
                onSearchModeChange?.("ai")
              }
              title="Autonomous live AI web candidate sourcing"
            >
              <Sparkles size={12} />
              AI Sourcing
            </button>

            <button
              type="button"
              className={
                searchMode === "pool"
                  ? "mode-button active"
                  : "mode-button"
              }
              onClick={() =>
                onSearchModeChange?.(
                  "pool"
                )
              }
              title="Search within internal verified talent pool"
            >
              <Users size={12} />
              Talent Pool
            </button>
          </div>

          <button
            type="submit"
            className="run-search-button"
            disabled={
              isSearching || !selectedJob
            }
          >
            {isSearching ? (
              <>
                <span className="search-spinner" />
                Searching...
              </>
            ) : (
              <>
                <Search size={14} />
                Search candidates
              </>
            )}
          </button>
        </div>
      </form>

      {/* ---------------------------------------------------
          SEARCH CONTEXT
      ---------------------------------------------------- */}

      <div className="active-refinements">
        <span className="refinement-label">
          SEARCH CONTEXT
        </span>

        {location && (
          <ContextChip
            icon={<MapPin size={11} />}
          >
            {location}
          </ContextChip>
        )}

        <ContextChip
          icon={<Briefcase size={11} />}
        >
          {minExp}+ years
        </ContextChip>

        {selectedTech
          .slice(0, 4)
          .map((technology) => (
            <ContextChip
              key={technology}
              icon={<Check size={10} />}
            >
              {technology}
            </ContextChip>
          ))}

        {selectedTech.length > 4 && (
          <span className="more-context">
            +{selectedTech.length - 4} more
          </span>
        )}

        {sourcedCandidateCount > 0 && (
          <span className="sourced-context">
            {sourcedCandidateCount.toLocaleString()}{" "}
            sourced
          </span>
        )}
      </div>

      {/* ---------------------------------------------------
          FILTER PANEL
      ---------------------------------------------------- */}

      {showFilters && (
        <div className="refine-filter-panel">
          <div className="filter-panel-header">
            <div>
              <span className="filter-eyebrow">
                SOURCING REFINEMENT
              </span>

              <h3>
                Edit the search requirements
              </h3>

              <p>
                Everything here is editable without
                reopening the job description.
              </p>
            </div>

            <button
              type="button"
              className="reset-filters"
              onClick={resetFilters}
            >
              <RotateCcw size={12} />
              Reset
            </button>
          </div>

          {/* -----------------------------------------------
              MAIN FILTER GRID
          ------------------------------------------------ */}

          <div className="filter-grid">
            {/* Location */}
            <div className="filter-field location-field">
              <label>LOCATION</label>

              <div className="location-input-wrap">
                <MapPin size={14} />

                <input
                  value={location}
                  onChange={(event) =>
                    handleLocationChange(
                      event.target.value
                    )
                  }
                  onFocus={() =>
                    location.length >= 2 &&
                    setShowLocationDropdown(true)
                  }
                  onBlur={() =>
                    setTimeout(
                      () =>
                        setShowLocationDropdown(
                          false
                        ),
                      150
                    )
                  }
                  placeholder="Any location"
                  autoComplete="off"
                />

                {location && (
                  <button
                    type="button"
                    className="field-clear"
                    onMouseDown={(event) =>
                      event.preventDefault()
                    }
                    onClick={() => {
                      setLocation("");
                      setLocationSuggestions(
                        []
                      );
                    }}
                  >
                    <X size={12} />
                  </button>
                )}

                {showLocationDropdown &&
                  (isLoadingLocations ||
                    locationSuggestions.length >
                      0) && (
                    <div className="location-dropdown">
                      {isLoadingLocations ? (
                        <div className="location-loading">
                          <span className="mini-spinner" />
                          Searching locations...
                        </div>
                      ) : (
                        locationSuggestions.map(
                          (
                            suggestion,
                            index
                          ) => (
                            <button
                              type="button"
                              key={`${suggestion.label}-${index}`}
                              className="location-option"
                              onMouseDown={(event) =>
                                event.preventDefault()
                              }
                              onClick={() =>
                                selectLocation(
                                  suggestion
                                )
                              }
                            >
                              <MapPin
                                size={12}
                              />

                              <span>
                                {
                                  suggestion.label
                                }
                              </span>
                            </button>
                          )
                        )
                      )}
                    </div>
                  )}
              </div>
            </div>

            {/* Experience */}
            <div className="filter-field">
              <label>
                MINIMUM EXPERIENCE
              </label>

              <div className="number-input-wrap">
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={minExp}
                  onChange={(event) =>
                    setMinExp(
                      Math.max(
                        0,
                        Number(
                          event.target.value
                        ) || 0
                      )
                    )
                  }
                />

                <span>years</span>
              </div>
            </div>

            {/* Sourced */}
            <div className="filter-field">
              <label>SOURCED</label>

              <div className="sourced-field">
                <span className="sourced-number">
                  {sourcedCandidateCount.toLocaleString()}
                </span>

                <span className="sourced-label">
                  candidates
                </span>
              </div>
            </div>

            {/* Result limit */}
            <div className="filter-field">
              <label>RESULT LIMIT</label>

              <div className="number-input-wrap">
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={maxResults}
                  onChange={(event) =>
                    setMaxResults(
                      Math.min(
                        500,
                        Math.max(
                          1,
                          Number(
                            event.target.value
                          ) || 1
                        )
                      )
                    )
                  }
                />

                <span>results</span>
              </div>
            </div>
          </div>

          {/* -----------------------------------------------
              REQUIREMENTS
          ------------------------------------------------ */}

          <div className="requirements-section">
            <div className="requirements-heading">
              <div>
                <span className="filter-eyebrow">
                  REQUIREMENTS
                </span>

                <h4>
                  Skills &amp; requirements
                </h4>
              </div>

              <span className="requirement-count">
                {selectedTech.length} selected
              </span>
            </div>

            {/* Selected chips */}
            <div className="requirements-editor">
              {selectedTech.map(
                (technology) => (
                  <span
                    className="requirement-chip"
                    key={technology}
                  >
                    <span>
                      {technology}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        removeTechnology(
                          technology
                        )
                      }
                      aria-label={`Remove ${technology}`}
                    >
                      <X size={11} />
                    </button>
                  </span>
                )
              )}

              <div className="requirement-input-wrap">
                <input
                  value={techInput}
                  onChange={(event) => {
                    setTechInput(
                      event.target.value
                    );
                    setShowTechSuggestions(
                      true
                    );
                  }}
                  onFocus={() =>
                    setShowTechSuggestions(
                      true
                    )
                  }
                  onBlur={() =>
                    setTimeout(
                      () =>
                        setShowTechSuggestions(
                          false
                        ),
                      150
                    )
                  }
                  onKeyDown={
                    handleTechInputKeyDown
                  }
                  placeholder={
                    selectedTech.length
                      ? "Add another requirement..."
                      : "Add a skill or requirement..."
                  }
                />

                {showTechSuggestions &&
                  availableTechSuggestions.length >
                    0 && (
                    <div className="requirements-suggestions">
                      <div className="suggestions-label">
                        FROM THIS JOB
                      </div>

                      {availableTechSuggestions.map(
                        (requirement) => (
                          <button
                            type="button"
                            key={requirement}
                            onMouseDown={(event) =>
                              event.preventDefault()
                            }
                            onClick={() => {
                              addTechnology(
                                requirement
                              );
                              setShowTechSuggestions(
                                false
                              );
                            }}
                          >
                            <span>
                              {requirement}
                            </span>

                            <Check size={12} />
                          </button>
                        )
                      )}
                    </div>
                  )}
              </div>
            </div>

            <div className="requirements-helper">
              <span>
                Type your own requirement and press
                Enter, or choose requirements extracted
                from this job.
              </span>

              <span className="requirement-shortcut">
                ENTER to add
              </span>
            </div>
          </div>

          {/* -----------------------------------------------
              PANEL FOOTER
          ------------------------------------------------ */}

          <div className="filter-panel-footer">
            <span>
              Changes apply to the next candidate
              search.
            </span>

            <button
              type="button"
              className="done-filter-button"
              onClick={() =>
                setShowFilters(false)
              }
            >
              <Check size={13} />
              Done
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

/* =========================================================
   STYLES
========================================================= */

const styles = `
  .refine-console {
    width: 100%;
    color: #12151B;
  }

  /* -------------------------------------------------------
     MAIN COMMAND
  ------------------------------------------------------- */

  .refine-command {
    width: 100%;
    background: #FFFFFF;
    border: 1px solid #E4E1D9;
    border-radius: 16px;
    overflow: visible;
    box-shadow:
      0 8px 30px -18px rgba(18, 21, 27, 0.22);
    transition:
      border-color 0.2s ease,
      box-shadow 0.2s ease;
  }

  .refine-command:focus-within {
    border-color: rgba(8, 175, 203, 0.42);
    box-shadow:
      0 12px 34px -20px rgba(8, 175, 203, 0.28);
  }

  .refine-command-open {
    border-color: rgba(8, 175, 203, 0.32);
  }

  /* -------------------------------------------------------
     PROMPT

     This is intentionally a textarea instead of a fixed
     input. Its height is controlled by resizePrompt().
  ------------------------------------------------------- */

  .refine-prompt-shell {
    position: relative;
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 17px 18px 14px;
    background:
      linear-gradient(
        180deg,
        #FFFFFF 0%,
        #FCFCFA 100%
      );
    border-radius: 16px 16px 0 0;
  }

  .refine-prompt-icon {
    width: 30px;
    height: 30px;
    flex: 0 0 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 3px;
    color: #08AFCB;
    background: #EAF8FB;
    border: 1px solid #D3F0F5;
    border-radius: 9px;
  }

  .refine-prompt {
    flex: 1;
    width: 100%;
    min-height: 76px;
    max-height: 340px;
    resize: none;
    overflow-y: auto;
    border: none;
    outline: none;
    background: transparent;
    padding: 3px 30px 3px 0;
    margin: 0;
    color: #12151B;
    font-family: inherit;
    font-size: 13px;
    line-height: 1.65;
    font-weight: 500;
    letter-spacing: -0.01em;
  }

  .refine-prompt::placeholder {
    color: #A5A7AA;
    font-weight: 400;
  }

  .refine-prompt:disabled {
    cursor: not-allowed;
    opacity: 0.65;
  }

  /*
   * Subtle scrollbar for very large job descriptions.
   * Normal prompts never need to scroll because the textarea
   * expands automatically.
   */
  .refine-prompt::-webkit-scrollbar {
    width: 5px;
  }

  .refine-prompt::-webkit-scrollbar-track {
    background: transparent;
  }

  .refine-prompt::-webkit-scrollbar-thumb {
    background: #D5D5D0;
    border-radius: 20px;
  }

  .clear-query {
    position: absolute;
    top: 17px;
    right: 17px;
    width: 25px;
    height: 25px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #E4E1D9;
    border-radius: 7px;
    background: #FFFFFF;
    color: #8A8F98;
    cursor: pointer;
    transition:
      color 0.15s ease,
      border-color 0.15s ease,
      background 0.15s ease;
  }

  .clear-query:hover {
    color: #12151B;
    border-color: #CFCBC2;
    background: #F7F5F1;
  }

  /* -------------------------------------------------------
     ACTION BAR
  ------------------------------------------------------- */

  .refine-command-actions {
    min-height: 54px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 9px 12px;
    border-top: 1px solid #EEECE6;
    background: #FAFAF7;
    border-radius: 0 0 16px 16px;
  }

  .refine-control {
    height: 35px;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 0 11px;
    border: 1px solid #E2DFD7;
    border-radius: 8px;
    background: #FFFFFF;
    color: #454950;
    font-family: inherit;
    font-size: 11.5px;
    font-weight: 650;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .refine-control:hover,
  .refine-control.active {
    border-color: #A9DCE5;
    color: #078DA5;
    background: #F2FBFC;
  }

  .filter-count {
    min-width: 17px;
    height: 17px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
    border-radius: 999px;
    background: #08AFCB;
    color: #FFFFFF;
    font-size: 9px;
    font-weight: 750;
  }

  .chevron-open {
    transform: rotate(180deg);
  }

  .search-mode-control {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 3px;
    border: 1px solid #E2DFD7;
    border-radius: 9px;
    background: #FFFFFF;
  }

  .mode-button {
    height: 27px;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 0 9px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: #8A8F98;
    font-family: inherit;
    font-size: 10.5px;
    font-weight: 650;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .mode-button.active {
    background: #12151B;
    color: #FFFFFF;
  }

  .mode-button:not(.active):hover {
    color: #12151B;
    background: #F5F4EF;
  }

  .run-search-button {
    height: 35px;
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    padding: 0 15px;
    border: none;
    border-radius: 8px;
    background: #12151B;
    color: #FFFFFF;
    font-family: inherit;
    font-size: 11.5px;
    font-weight: 700;
    cursor: pointer;
    transition:
      transform 0.15s ease,
      background 0.15s ease,
      opacity 0.15s ease;
  }

  .run-search-button:hover:not(:disabled) {
    background: #08AFCB;
    transform: translateY(-1px);
  }

  .run-search-button:disabled {
    opacity: 0.48;
    cursor: not-allowed;
  }

  .search-spinner,
  .mini-spinner {
    display: inline-block;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: currentColor;
    border-radius: 50%;
    animation: refine-spin 0.7s linear infinite;
  }

  .search-spinner {
    width: 12px;
    height: 12px;
  }

  .mini-spinner {
    width: 11px;
    height: 11px;
    color: #08AFCB;
    border-color: #CDEEF3;
    border-top-color: #08AFCB;
  }

  @keyframes refine-spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* -------------------------------------------------------
     ACTIVE CONTEXT
  ------------------------------------------------------- */

  .active-refinements {
    min-height: 34px;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    padding: 8px 2px 2px;
  }

  .refinement-label {
    margin-right: 3px;
    color: #9B9C9E;
    font-size: 8.5px;
    font-weight: 750;
    letter-spacing: 0.12em;
  }

  .refinement-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    max-width: 260px;
    padding: 4px 8px;
    border: 1px solid #E4E1D9;
    border-radius: 999px;
    background: #FFFFFF;
    color: #555960;
    font-size: 9.5px;
    font-weight: 600;
  }

  .refinement-chip svg {
    flex: 0 0 auto;
    color: #08AFCB;
  }

  .refinement-chip span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .more-context {
    color: #8A8F98;
    font-size: 9.5px;
    font-weight: 650;
  }

  .sourced-context {
    margin-left: auto;
    color: #74787F;
    font-size: 9.5px;
    font-weight: 600;
  }

  /* -------------------------------------------------------
     FILTER PANEL
  ------------------------------------------------------- */

  .refine-filter-panel {
    margin-top: 8px;
    padding: 18px;
    border: 1px solid #E4E1D9;
    border-radius: 14px;
    background: #FFFFFF;
    box-shadow:
      0 10px 30px -20px rgba(18, 21, 27, 0.18);
    animation: filter-panel-in 0.18s ease-out;
  }

  @keyframes filter-panel-in {
    from {
      opacity: 0;
      transform: translateY(-5px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .filter-panel-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid #EEECE6;
  }

  .filter-eyebrow {
    display: block;
    margin-bottom: 5px;
    color: #08AFCB;
    font-size: 8px;
    font-weight: 800;
    letter-spacing: 0.14em;
  }

  .filter-panel-header h3 {
    margin: 0;
    font-size: 14px;
    line-height: 1.25;
    letter-spacing: -0.02em;
  }

  .filter-panel-header p {
    margin: 5px 0 0;
    color: #8A8F98;
    font-size: 10.5px;
    line-height: 1.45;
  }

  .reset-filters {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 6px 9px;
    border: 1px solid #E4E1D9;
    border-radius: 7px;
    background: #FFFFFF;
    color: #74787F;
    font-family: inherit;
    font-size: 9.5px;
    font-weight: 650;
    cursor: pointer;
  }

  .reset-filters:hover {
    color: #12151B;
    background: #F7F5F1;
  }

  /* -------------------------------------------------------
     FILTER GRID
  ------------------------------------------------------- */

  .filter-grid {
    display: grid;
    grid-template-columns:
      minmax(230px, 1.45fr)
      minmax(150px, 0.8fr)
      minmax(150px, 0.8fr)
      minmax(150px, 0.8fr);
    gap: 12px;
    padding: 16px 0;
  }

  .filter-field {
    min-width: 0;
  }

  .filter-field > label {
    display: block;
    margin-bottom: 7px;
    color: #8A8F98;
    font-size: 8.5px;
    font-weight: 800;
    letter-spacing: 0.09em;
  }

  .location-input-wrap,
  .number-input-wrap,
  .sourced-field {
    height: 38px;
    display: flex;
    align-items: center;
    border: 1px solid #E4E1D9;
    border-radius: 8px;
    background: #FCFCFA;
  }

  .location-input-wrap {
    position: relative;
    padding: 0 10px;
    gap: 7px;
  }

  .location-input-wrap > svg {
    flex: 0 0 auto;
    color: #08AFCB;
  }

  .location-input-wrap input {
    min-width: 0;
    flex: 1;
    height: 100%;
    border: none;
    outline: none;
    background: transparent;
    color: #34373D;
    font-family: inherit;
    font-size: 11px;
  }

  .location-input-wrap input::placeholder {
    color: #A6A8AB;
  }

  .field-clear {
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: none;
    background: transparent;
    color: #9B9C9E;
    cursor: pointer;
  }

  .field-clear:hover {
    color: #12151B;
  }

  .number-input-wrap {
    padding-left: 10px;
    overflow: hidden;
  }

  .number-input-wrap input {
    width: 60px;
    height: 100%;
    border: none;
    outline: none;
    background: transparent;
    color: #34373D;
    font-family: inherit;
    font-size: 11px;
    font-weight: 650;
  }

  .number-input-wrap input::-webkit-inner-spin-button,
  .number-input-wrap input::-webkit-outer-spin-button {
    opacity: 0.55;
  }

  .number-input-wrap span {
    margin-left: auto;
    padding-right: 10px;
    color: #9B9C9E;
    font-size: 9.5px;
  }

  .sourced-field {
    padding: 0 11px;
    gap: 5px;
  }

  .sourced-number {
    color: #12151B;
    font-size: 12px;
    font-weight: 750;
  }

  .sourced-label {
    color: #9B9C9E;
    font-size: 9.5px;
  }

  /* -------------------------------------------------------
     LOCATION DROPDOWN
  ------------------------------------------------------- */

  .location-dropdown {
    position: absolute;
    top: calc(100% + 5px);
    left: 0;
    right: 0;
    z-index: 30;
    overflow: hidden;
    border: 1px solid #E4E1D9;
    border-radius: 10px;
    background: #FFFFFF;
    box-shadow:
      0 12px 30px -10px rgba(18, 21, 27, 0.22);
  }

  .location-loading {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 10px 12px;
    color: #9B9C9E;
    font-size: 10px;
  }

  .location-option {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 9px 11px;
    border: none;
    border-bottom: 1px solid #F0EEE9;
    background: transparent;
    color: #3A3D44;
    text-align: left;
    font-family: inherit;
    font-size: 10.5px;
    cursor: pointer;
  }

  .location-option:last-child {
    border-bottom: none;
  }

  .location-option svg {
    flex: 0 0 auto;
    color: #08AFCB;
  }

  .location-option:hover {
    background: #F1F1EC;
  }

  /* -------------------------------------------------------
     REQUIREMENTS
  ------------------------------------------------------- */

  .requirements-section {
    padding-top: 15px;
    border-top: 1px solid #EEECE6;
  }

  .requirements-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 9px;
  }

  .requirements-heading h4 {
    margin: 0;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: -0.01em;
  }

  .requirement-count {
    color: #8A8F98;
    font-size: 9px;
    font-weight: 650;
  }

  .requirements-editor {
    min-height: 44px;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    padding: 7px 8px;
    border: 1px solid #E4E1D9;
    border-radius: 9px;
    background: #FCFCFA;
  }

  .requirements-editor:focus-within {
    border-color: #A9DCE5;
    box-shadow:
      0 0 0 3px rgba(8, 175, 203, 0.06);
  }

  .requirement-chip {
    max-width: 280px;
    min-height: 27px;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 0 5px 0 9px;
    border: 1px solid #DDECEF;
    border-radius: 6px;
    background: #F1FAFC;
    color: #3A626A;
    font-size: 9.5px;
    font-weight: 650;
  }

  .requirement-chip span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .requirement-chip button {
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    padding: 0;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: #7CA6AE;
    cursor: pointer;
  }

  .requirement-chip button:hover {
    background: #DFF3F7;
    color: #D65A43;
  }

  .requirement-input-wrap {
    position: relative;
    flex: 1;
    min-width: 180px;
  }

  .requirement-input-wrap input {
    width: 100%;
    height: 28px;
    border: none;
    outline: none;
    background: transparent;
    color: #34373D;
    font-family: inherit;
    font-size: 10.5px;
  }

  .requirement-input-wrap input::placeholder {
    color: #A5A7AA;
  }

  .requirements-suggestions {
    position: absolute;
    left: -8px;
    right: -8px;
    top: calc(100% + 7px);
    z-index: 25;
    overflow: hidden;
    border: 1px solid #E4E1D9;
    border-radius: 10px;
    background: #FFFFFF;
    box-shadow:
      0 12px 30px -10px rgba(18, 21, 27, 0.2);
  }

  .suggestions-label {
    padding: 9px 11px 6px;
    color: #08AFCB;
    font-size: 7.5px;
    font-weight: 800;
    letter-spacing: 0.12em;
  }

  .requirements-suggestions button {
    width: 100%;
    min-height: 32px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 6px 11px;
    border: none;
    border-top: 1px solid #F1EFEA;
    background: transparent;
    color: #454950;
    text-align: left;
    font-family: inherit;
    font-size: 10px;
    cursor: pointer;
  }

  .requirements-suggestions button:hover {
    background: #F4FAFB;
    color: #078DA5;
  }

  .requirements-suggestions button svg {
    color: #08AFCB;
    flex: 0 0 auto;
  }

  .requirements-helper {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 7px;
    color: #9B9C9E;
    font-size: 9px;
    line-height: 1.4;
  }

  .requirement-shortcut {
    flex: 0 0 auto;
    color: #A5A7AA;
    font-size: 7.5px;
    font-weight: 750;
    letter-spacing: 0.08em;
  }

  /* -------------------------------------------------------
     PANEL FOOTER
  ------------------------------------------------------- */

  .filter-panel-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 15px;
    padding-top: 13px;
    border-top: 1px solid #EEECE6;
    color: #9B9C9E;
    font-size: 9px;
  }

  .done-filter-button {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    height: 30px;
    padding: 0 10px;
    border: 1px solid #D7EDEF;
    border-radius: 7px;
    background: #F2FAFB;
    color: #078DA5;
    font-family: inherit;
    font-size: 9.5px;
    font-weight: 700;
    cursor: pointer;
  }

  .done-filter-button:hover {
    background: #E5F7FA;
  }

  /* -------------------------------------------------------
     RESPONSIVE
  ------------------------------------------------------- */

  @media (max-width: 1000px) {
    .filter-grid {
      grid-template-columns:
        minmax(220px, 1.4fr)
        minmax(140px, 1fr);
    }
  }

  @media (max-width: 720px) {
    .refine-command-actions {
      flex-wrap: wrap;
    }

    .run-search-button {
      margin-left: 0;
      width: 100%;
    }

    .search-mode-control {
      margin-left: auto;
    }

    .filter-grid {
      grid-template-columns: 1fr;
    }

    .sourced-context {
      margin-left: 0;
    }

    .filter-panel-header {
      flex-direction: column;
    }
  }

  @media (max-width: 520px) {
    .refine-prompt-shell {
      padding: 13px;
      gap: 9px;
    }

    .refine-prompt-icon {
      width: 26px;
      height: 26px;
      flex-basis: 26px;
    }

    .refine-prompt {
      font-size: 12px;
    }

    .refine-command-actions {
      padding: 8px;
    }

    .refine-control {
      flex: 1;
      justify-content: center;
    }

    .search-mode-control {
      flex: 1;
    }

    .mode-button {
      flex: 1;
      justify-content: center;
    }

    .active-refinements {
      padding-left: 0;
      padding-right: 0;
    }

    .refinement-label {
      width: 100%;
    }

    .refine-filter-panel {
      padding: 13px;
    }

    .requirements-helper {
      align-items: flex-start;
      flex-direction: column;
    }
  }
`;

export default SearchConsole;