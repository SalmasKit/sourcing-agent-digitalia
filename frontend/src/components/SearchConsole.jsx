import React, { useEffect, useMemo, useState } from "react";
import {
  Braces,
  Briefcase,
  ChevronDown,
  MapPin,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";

const SearchConsole = ({
  onSearch,
  isSearching = false,
  selectedJob,
  searchMode = "ai",
  onSearchModeChange,
  sourcedCandidateCount = 0,
}) => {
  const getMinExperienceFromSeniority = (seniorityStr) => {
    if (!seniorityStr) return 3;
    if (seniorityStr.includes('Junior')) return 1;
    if (seniorityStr.includes('Mid-level')) return 3;
    if (seniorityStr.includes('Senior')) return 5;
    if (seniorityStr.includes('Lead') || seniorityStr.includes('Manager')) return 8;
    return 3;
  };

  const defaultLocation = selectedJob?.location || "";
  const defaultMinExp =
    Number(selectedJob?.minExperience) || getMinExperienceFromSeniority(selectedJob?.seniority) || 3;

  const defaultMaxResults =
    Number(selectedJob?.maxResults) || 10;

  const defaultSkills = useMemo(() => {
    const values =
      selectedJob?.skills ||
      selectedJob?.technologies ||
      selectedJob?.techStack ||
      [];

    return Array.isArray(values)
      ? values.slice(0, 8)
      : [];
  }, [selectedJob]);

  const [query, setQuery] = useState("");
  const [location, setLocation] =
    useState(defaultLocation);
  const [minExp, setMinExp] =
    useState(defaultMinExp);
  const [maxResults, setMaxResults] =
    useState(defaultMaxResults);
  const [selectedTech, setSelectedTech] =
    useState(defaultSkills);
  const [showFilters, setShowFilters] =
    useState(false);

  useEffect(() => {
    /*
     * Important:
     * We do NOT put the entire JD inside the input anymore.
     * The JD is already the source of truth.
     *
     * This field is only a refinement.
     */
    setQuery("");
    setLocation(selectedJob?.location || "");
    setMinExp(
      Number(selectedJob?.minExperience) || getMinExperienceFromSeniority(selectedJob?.seniority) || 3
    );
    setMaxResults(
      Number(selectedJob?.maxResults) || 10
    );

    const skills =
      selectedJob?.skills ||
      selectedJob?.technologies ||
      selectedJob?.techStack ||
      [];

    setSelectedTech(
      Array.isArray(skills) ? skills.slice(0, 8) : []
    );

    setShowFilters(false);
  }, [selectedJob?.id]);

  const activeFilterCount = useMemo(() => {
    let count = 0;

    if (location !== defaultLocation) count += 1;
    if (minExp !== defaultMinExp) count += 1;

    const current = [...selectedTech].sort().join("|");
    const defaults = [...defaultSkills]
      .sort()
      .join("|");

    if (current !== defaults) count += 1;

    return count;
  }, [
    location,
    minExp,
    selectedTech,
    defaultLocation,
    defaultMinExp,
    defaultSkills,
  ]);

  const submitSearch = (event) => {
    event?.preventDefault();

    const baseDescription =
      selectedJob?.description ||
      selectedJob?.prompt ||
      "";

    /*
     * The backend can still receive the JD when no refinement
     * has been typed.
     */
    const finalQuery =
      query.trim() || baseDescription;

    onSearch?.(
      finalQuery,
      {
        location,
        minExp,
        tech: selectedTech,
        maxResults,
        searchMode,
        refinement: query.trim(),
      },
      selectedJob?.id
    );
  };

  const toggleTechnology = (tech) => {
    setSelectedTech((current) =>
      current.includes(tech)
        ? current.filter((item) => item !== tech)
        : [...current, tech]
    );
  };

  const resetFilters = () => {
    setLocation(defaultLocation);
    setMinExp(defaultMinExp);
    setMaxResults(defaultMaxResults);
    setSelectedTech(defaultSkills);
  };

  return (
    <section className="refine-console">
      <style>{styles}</style>

      <form
        className={`refine-command ${
          showFilters ? "refine-command-open" : ""
        }`}
        onSubmit={submitSearch}
      >
        <div className="refine-input-area">
          <Search size={17} />

          <input
            value={query || (selectedJob?.description || selectedJob?.prompt || "")}
            onChange={(event) =>
              setQuery(event.target.value)
            }
            placeholder="Describe your ideal candidate..."
          />

          {query && (
            <button
              type="button"
              className="clear-query"
              onClick={() => setQuery("")}
            >
              <X size={13} />
            </button>
          )}
        </div>

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

            Filters

            {activeFilterCount > 0 && (
              <span className="filter-count">
                {activeFilterCount}
              </span>
            )}

            <ChevronDown
              size={12}
              className={
                showFilters ? "chevron-open" : ""
              }
            />
          </button>

          <div className="search-mode-control">
            <button
              type="button"
              className={
                searchMode === "ai" ? "active" : ""
              }
              onClick={() =>
                onSearchModeChange?.("ai")
              }
            >
              <Sparkles size={12} />
              AI
            </button>

            <button
              type="button"
              className={
                searchMode === "boolean"
                  ? "active"
                  : ""
              }
              onClick={() =>
                onSearchModeChange?.("boolean")
              }
            >
              <Braces size={12} />
              Boolean
            </button>
          </div>

          <button
            type="submit"
            className="run-search-button"
            disabled={isSearching || !selectedJob}
          >
            {isSearching ? (
              <>
                <span className="mini-loader" />
                Sourcing
              </>
            ) : (
              <>
                <Search size={14} />
                Search
              </>
            )}
          </button>
        </div>
      </form>

      <div className="active-refinements">
        <span className="refinement-label">
          SEARCH CONTEXT
        </span>

        {location && (
          <ContextChip icon={<MapPin size={11} />}>
            {location}
          </ContextChip>
        )}

        <ContextChip icon={<Briefcase size={11} />}>
          {minExp}+ years
        </ContextChip>

        {selectedTech.slice(0, 4).map((skill) => (
          <ContextChip key={skill}>
            {skill}
          </ContextChip>
        ))}

        {selectedTech.length > 4 && (
          <span className="more-context">
            +{selectedTech.length - 4}
          </span>
        )}
      </div>

      {showFilters && (
        <div className="refine-filter-panel">
          <div className="filter-panel-header">
            <div>
              <strong>Search refinements</strong>

              <span>
                Override the role defaults only when needed.
              </span>
            </div>

            <button
              type="button"
              onClick={resetFilters}
            >
              <RotateCcw size={12} />
              Reset
            </button>
          </div>

          <div className="filter-grid">
            <label className="filter-field">
              <span>LOCATION</span>

              <div className="filter-input">
                <MapPin size={14} />

                <input
                  value={location}
                  onChange={(event) =>
                    setLocation(event.target.value)
                  }
                  placeholder="Any location"
                />
              </div>
            </label>

            <label className="filter-field">
              <span>MINIMUM EXPERIENCE</span>

              <div className="filter-number">
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={minExp}
                  onChange={(event) =>
                    setMinExp(
                      Number(event.target.value)
                    )
                  }
                />

                <span>years</span>
              </div>
            </label>

            <label className="filter-field">
              <span>RESULTS</span>

              <div className="filter-number">
                <span>{sourcedCandidateCount}</span>
                <span>profiles sourced</span>
              </div>
            </label>

            <label className="filter-field">
              <span>MAX LIMIT</span>

              <div className="filter-number">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={maxResults}
                  onChange={(event) =>
                    setMaxResults(
                      Number(event.target.value)
                    )
                  }
                />

                <span>max</span>
              </div>
            </label>
          </div>

          {defaultSkills.length > 0 && (
            <div className="technology-filter">
              <div className="technology-heading">
                <span>ROLE SKILLS</span>

                <small>
                  Click to include or exclude
                </small>
              </div>

              <div className="technology-tags">
                {defaultSkills.map((tech) => {
                  const selected =
                    selectedTech.includes(tech);

                  return (
                    <button
                      type="button"
                      key={tech}
                      className={
                        selected ? "selected" : ""
                      }
                      onClick={() =>
                        toggleTechnology(tech)
                      }
                    >
                      <span />
                      {tech}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

const ContextChip = ({ icon, children }) => (
  <span className="context-chip">
    {icon}
    {children}
  </span>
);

const styles = `
.refine-console {
  --cyan: #0BA5C9;
  --cyan-dark: #087F9B;
  --cyan-soft: #EBF9FC;
  --border: #E5E2DB;
  --ink: #15181E;
  --muted: #72767E;

  width: 100%;
  font-family: Inter, sans-serif;
  background: #fff;
  border: 1px solid #E4E1D9;
  border-radius: 16px;
  padding: 16px;
}

.role-preview-section {
  padding-bottom: 12px;
  margin-bottom: 12px;
  border-bottom: 1px solid #EFEDE7;
  display: block;
}

.role-preview-title {
  font-size: 10px;
  font-weight: 700;
  color: #9B9C9E;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 6px;
  display: block;
}

.role-preview-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.role-preview-name {
  font-size: 13px;
  font-weight: 700;
  color: #12151B;
  display: block;
}

.role-preview-desc {
  font-size: 11px;
  color: #3A3D44;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.refine-command {
  display: flex;
  align-items: center;
  min-height: 50px;
  border: 1px solid #E4E1D9;
  border-radius: 11px;
  background: #F6F5F1;
  transition:
    border-color .18s ease,
    box-shadow .18s ease;
  margin-top: 12px;
}

.refine-command:focus-within,
.refine-command-open {
  border-color: #0A7E96;
  box-shadow: 0 0 0 3px rgba(10,126,150,.055);
}

.refine-input-area {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 200px;
  gap: 9px;
  padding: 0 14px;
  color: #A1A4A9;
}

.refine-input-area input {
  width: 100%;
  height: 46px;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--ink);
  font: inherit;
  font-size: 11px;
}

.refine-input-area input::placeholder {
  color: #A5A7AB;
}

.clear-query {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 23px;
  height: 23px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #96999E;
  cursor: pointer;
}

.clear-query:hover {
  background: #F4F3F0;
}

.refine-command-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-right: 6px;
}

.refine-control {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 9px;
  border: 1px solid transparent;
  border-radius: 7px;
  background: transparent;
  color: #676B72;
  font: inherit;
  font-size: 9px;
  font-weight: 600;
  cursor: pointer;
}

.refine-control:hover,
.refine-control.active {
  background: #F6F5F2;
  color: #363A40;
}

.filter-count {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 17px;
  height: 17px;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--cyan-soft);
  color: var(--cyan-dark);
  font-size: 8px;
}

.refine-control svg:last-child {
  transition: transform .18s ease;
}

.chevron-open {
  transform: rotate(180deg);
}

.search-mode-control {
  display: flex;
  padding: 2px;
  border: 1px solid #ECEAE5;
  border-radius: 8px;
  background: #F8F7F4;
}

.search-mode-control button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 7px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #85888E;
  font: inherit;
  font-size: 8px;
  font-weight: 650;
  cursor: pointer;
}

.search-mode-control button.active {
  background: white;
  color: var(--cyan-dark);
  box-shadow: 0 1px 3px rgba(20,30,35,.06);
}

.run-search-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 34px;
  padding: 0 12px;
  border: 1px solid #15191F;
  border-radius: 8px;
  background: #15191F;
  color: white;
  font: inherit;
  font-size: 9px;
  font-weight: 650;
  cursor: pointer;
}

.run-search-button:hover:not(:disabled) {
  background: #252A32;
}

.run-search-button:disabled {
  cursor: default;
  opacity: .55;
}

.mini-loader {
  width: 10px;
  height: 10px;
  border: 1.5px solid rgba(255,255,255,.35);
  border-top-color: white;
  border-radius: 50%;
  animation: refineSpin .7s linear infinite;
}

.active-refinements {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
  min-height: 35px;
  padding: 6px 2px 0;
}

.refinement-label {
  margin-right: 3px;
  color: #9A9C9F;
  font-size: 7.5px;
  font-weight: 700;
  letter-spacing: .08em;
}

.context-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 7px;
  border: 1px solid #E7E4DE;
  border-radius: 999px;
  background: #FAF9F7;
  color: #656970;
  font-size: 8px;
  white-space: nowrap;
}

.context-chip svg {
  color: #999C9F;
}

.more-context {
  color: var(--cyan-dark);
  font-size: 8px;
  font-weight: 600;
}

.refine-filter-panel {
  margin-top: 6px;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #FAF9F7;
  animation: filterReveal .17s ease;
}

.filter-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 15px;
}

.filter-panel-header > div {
  display: flex;
  flex-direction: column;
}

.filter-panel-header strong {
  font-size: 10px;
}

.filter-panel-header span {
  margin-top: 3px;
  color: var(--muted);
  font-size: 8px;
}

.filter-panel-header button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 0;
  background: transparent;
  color: #73767C;
  font: inherit;
  font-size: 8px;
  cursor: pointer;
}

.filter-grid {
  display: grid;
  grid-template-columns: 1.4fr .8fr .8fr;
  gap: 11px;
}

.filter-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filter-field > span,
.technology-heading > span {
  color: #888B90;
  font-size: 7px;
  font-weight: 700;
  letter-spacing: .08em;
}

.filter-input,
.filter-number {
  display: flex;
  align-items: center;
  min-height: 35px;
  border: 1px solid #E2DFD9;
  border-radius: 8px;
  background: white;
}

.filter-input {
  gap: 7px;
  padding: 0 10px;
  color: #9B9EA3;
}

.filter-input input,
.filter-number input {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: #3C4046;
  font: inherit;
  font-size: 9px;
}

.filter-number input {
  padding-left: 10px;
}

.filter-number > span {
  padding-right: 10px;
  color: #9A9DA1;
  font-size: 8px;
}

.technology-filter {
  margin-top: 15px;
  padding-top: 13px;
  border-top: 1px solid #E5E2DC;
}

.technology-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.technology-heading small {
  color: #9A9DA1;
  font-size: 7px;
}

.technology-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.technology-tags button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 26px;
  padding: 0 8px;
  border: 1px solid #E4E1DB;
  border-radius: 7px;
  background: white;
  color: #74777D;
  font: inherit;
  font-size: 8px;
  cursor: pointer;
}

.technology-tags button > span {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #C6C5C1;
}

.technology-tags button.selected {
  border-color: #C8E7ED;
  background: #F1FAFC;
  color: var(--cyan-dark);
}

.technology-tags button.selected > span {
  background: var(--cyan);
}

@keyframes filterReveal {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes refineSpin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 820px) {
  .refine-command {
    align-items: stretch;
    flex-direction: column;
    padding-bottom: 7px;
  }

  .refine-command-actions {
    padding-left: 8px;
  }

  .filter-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 540px) {
  .search-mode-control {
    display: none;
  }

  .refine-command-actions {
    justify-content: space-between;
  }
}
`;

export default SearchConsole;