/**
 * CandidateDetailPanel
 *
 * Candidate profile command center.
 *
 * Improvements:
 * - Automatically chooses left/right panel position from anchorRect
 * - Cleaner action hierarchy
 * - Compact contact action rail
 * - Edit/Delete moved into overflow menu
 * - Dedicated outreach studio
 * - Better information grouping
 * - Keyboard navigation
 * - More scalable layout for large candidate lists
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Check,
  Bookmark,
  BookmarkCheck,
  Mail,
  Pencil,
  Trash2,
  MoreHorizontal,
  ExternalLink,
  Copy,
  Send,
  Sparkles,
  MapPin,
  BriefcaseBusiness,
  Clock3,
  WalletCards,
  CheckCircle2,
  AlertCircle,
  Plus,
} from "lucide-react";

/* =========================================================
   HELPERS
========================================================= */

function useLanguage() {
  return { lang: "EN" };
}

function getAvatarUrl(name = "", avatar = "") {
  // Use actual avatar URL if available, otherwise generate initials-based avatar
  if (avatar) {
    return avatar;
  }
  return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(
    name
  )}&backgroundColor=12151b&fontFamily=Arial`;
}

function formatNoteTimestamp(note) {
  if (!note) return "";

  if (note.createdAt) {
    try {
      return new Date(note.createdAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "";
    }
  }

  return note.timestamp || "";
}

function formatExperiencePeriod(start, end) {
  if (!start && !end) return "";

  const startText = start || "—";
  const endText = end || "Present";

  return `${startText} → ${endText}`;
}

function scoreTier(score = 0) {
  if (score >= 90) {
    return {
      label: "Hot lead",
      color: "#E85D3D",
      soft: "rgba(232,93,61,.12)",
    };
  }

  if (score >= 80) {
    return {
      label: "Good match",
      color: "#0BA5C9",
      soft: "rgba(11,165,201,.12)",
    };
  }

  return {
    label: "Possible fit",
    color: "#8A8F98",
    soft: "rgba(138,143,152,.12)",
  };
}

/* =========================================================
   MOCK OUTREACH API
========================================================= */

async function draftOutreachApi(candidate, job, channel) {
  await new Promise((resolve) => setTimeout(resolve, 1100));

  const name = candidate?.name || "there";
  const role =
    job?.title ||
    candidate?.targetRole ||
    candidate?.headline ||
    "this opportunity";

  if (channel === "email") {
    return {
      subject: `Quick introduction — ${role}`,
      body: `Hi ${name.split(" ")[0]},

I came across your background and thought your experience could be a strong fit for ${role}.

I'd love to share a little more about the opportunity and hear what you're currently looking for.

Would you be open to a quick conversation?

Best,
Recruiting Team`,
    };
  }

  return {
    subject: "",
    body: `Hi ${name.split(" ")[0]} — I came across your profile and thought your background could be a strong fit for ${role}. Would love to connect and share a little more about the opportunity.`,
  };
}

/* =========================================================
   FONTS
========================================================= */

function useFonts() {
  useEffect(() => {
    if (document.getElementById("candidate-panel-fonts")) return;

    const link = document.createElement("link");

    link.id = "candidate-panel-fonts";
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&family=Space+Grotesk:wght@500;600;700&display=swap";

    document.head.appendChild(link);
  }, []);
}

/* =========================================================
   SCORE RING
========================================================= */

function ScoreRing({ score = 0, color = "#0BA5C9", size = 74 }) {
  const radius = 29;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(score, 0), 100) / 100;
  const offset = circumference - progress * circumference;

  return (
    <div
      className="cdp-score-ring"
      style={{
        width: size,
        height: size,
        "--score-color": color,
      }}
    >
      <svg width={size} height={size} viewBox="0 0 74 74">
        <circle
          cx="37"
          cy="37"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,.12)"
          strokeWidth="5"
        />

        <circle
          cx="37"
          cy="37"
          r={radius}
          fill="none"
          stroke="var(--score-color)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 37 37)"
          className="cdp-score-progress"
        />
      </svg>

      <div className="cdp-score-value">
        <strong>{score}</strong>
        <span>/100</span>
      </div>
    </div>
  );
}

/* =========================================================
   SMALL UI COMPONENTS
========================================================= */

function SectionTitle({ eyebrow, title, count }) {
  return (
    <div className="cdp-section-heading">
      <div>
        {eyebrow && <div className="cdp-eyebrow">{eyebrow}</div>}
        <h3>{title}</h3>
      </div>

      {typeof count === "number" && (
        <span className="cdp-section-count">{count}</span>
      )}
    </div>
  );
}

function SignalCard({ icon: Icon, label, value, tone = "default" }) {
  return (
    <div className={`cdp-signal cdp-signal-${tone}`}>
      <div className="cdp-signal-icon">
        <Icon size={15} strokeWidth={2} />
      </div>

      <div className="cdp-signal-copy">
        <span>{label}</span>
        <strong>{value || "Not specified"}</strong>
      </div>
    </div>
  );
}

function IconAction({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  danger = false,
}) {
  return (
    <button
      type="button"
      className={`cdp-icon-action ${danger ? "is-danger" : ""}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      data-tooltip={label}
    >
      <Icon size={17} strokeWidth={2} />
    </button>
  );
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function CandidateDetailPanel({
  candidate = null,
  onClose,
  onToggleShortlist,
  isShortlisted = false,

  // Role-based shortlist logic — same as CandidateCard
  onToggleSaveForJob,
  isSavedForJob = false,
  selectedJobId = null,

  onEdit,
  onDelete,
  onAddNote,
  onPrev = null,
  onNext = null,

  /**
   * "left" | "right" | "auto"
   *
   * auto uses anchorRect to determine which side
   * the selected candidate card occupies.
   */
  panelSide = "auto",

  /**
   * Pass the selected card's getBoundingClientRect().
   *
   * Example:
   *
   * const rect = e.currentTarget.getBoundingClientRect();
   * setSelectedRect({
   *   left: rect.left,
   *   width: rect.width,
   * });
   */
  anchorRect = null,

  /**
   * Optional candidate position.
   * Useful when navigating through large candidate sets.
   */
  candidateIndex = null,
  candidateTotal = null,

  /**
   * Optional job object used for outreach drafting.
   */
  job = null,
}) {
  useFonts();

  const { lang } = useLanguage();

  const [tab, setTab] = useState("Overview");

  const [note, setNote] = useState("");
  const [notesList, setNotesList] = useState(
    Array.isArray(candidate?.notes) ? candidate.notes : []
  );

  // Support multiple field names for experience array
  const experienceArray = candidate?.experiences || candidate?.experience || candidate?.workHistory || candidate?.employment || candidate?.jobs || [];

  const [outreachOpen, setOutreachOpen] = useState(false);
  const [outreachChannel, setOutreachChannel] = useState("email");
  const [outreachDraft, setOutreachDraft] = useState("");
  const [outreachSubject, setOutreachSubject] = useState("");
  const [isDrafting, setIsDrafting] = useState(false);
  const [copied, setCopied] = useState(false);

  const [skillsExpanded, setSkillsExpanded] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const [resolvedSide, setResolvedSide] = useState(
    panelSide === "left" ? "left" : "right"
  );

  /* -------------------------------------------------------
     RESET WHEN CANDIDATE CHANGES
  ------------------------------------------------------- */

  useEffect(() => {
    setTab("Overview");
    setNote("");
    setNotesList(Array.isArray(candidate?.notes) ? candidate.notes : []);
    setOutreachOpen(false);
    setOutreachDraft("");
    setOutreachSubject("");
    setCopied(false);
    setSkillsExpanded(false);
    setMoreOpen(false);
    setJustSaved(false);
  }, [candidate?.id]);

  /* -------------------------------------------------------
     PANEL SIDE
  ------------------------------------------------------- */

  useEffect(() => {
    const resolveSide = () => {
      if (panelSide === "left" || panelSide === "right") {
        setResolvedSide(panelSide);
        return;
      }

      if (!anchorRect) {
        setResolvedSide("right");
        return;
      }

      const cardCenter = anchorRect.left + anchorRect.width / 2;
      const viewportCenter = window.innerWidth / 2;

      setResolvedSide(cardCenter < viewportCenter ? "left" : "right");
    };

    resolveSide();

    if (panelSide === "auto") {
      window.addEventListener("resize", resolveSide);

      return () => {
        window.removeEventListener("resize", resolveSide);
      };
    }
  }, [panelSide, anchorRect]);

  /* -------------------------------------------------------
     KEYBOARD NAVIGATION
  ------------------------------------------------------- */

  useEffect(() => {
    if (!candidate) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        if (moreOpen) {
          setMoreOpen(false);
          return;
        }

        onClose?.();
      }

      if (event.key === "ArrowLeft" && onPrev) {
        onPrev();
      }

      if (event.key === "ArrowRight" && onNext) {
        onNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [candidate, moreOpen, onClose, onPrev, onNext]);

  /* -------------------------------------------------------
     DERIVED
  ------------------------------------------------------- */

  const tier = useMemo(
    () => scoreTier(Number(candidate?.matchScore || candidate?.score || 0)),
    [candidate]
  );

  const rawEmail = candidate?.email || "";

  const isPlaceholderEmail =
    rawEmail.includes("@talent-candidate.ma") ||
    rawEmail.includes("@example.com");

  const hasEmail = Boolean(rawEmail && !isPlaceholderEmail);

  const isEmailVerified =
    Boolean(candidate?.emailVerified) ||
    candidate?.emailStatus === "verified";

  const skills = Array.isArray(candidate?.skills) ? candidate.skills : [];

  const visibleSkills = skillsExpanded ? skills : skills.slice(0, 8);

  const score = Number(candidate?.matchScore || candidate?.score || 0);

  const notesCount = notesList.length;

  /* -------------------------------------------------------
     OUTREACH
  ------------------------------------------------------- */

  const handleDraftOutreach = async (channel) => {
    setOutreachChannel(channel);
    setOutreachOpen(true);
    setIsDrafting(true);
    setOutreachDraft("");
    setOutreachSubject("");
    setCopied(false);

    try {
      const result = await draftOutreachApi(candidate, job, channel);

      setOutreachDraft(result.body || "");
      setOutreachSubject(result.subject || "");
    } finally {
      setIsDrafting(false);
    }
  };

  const handleCopyDraft = async () => {
    if (!outreachDraft) return;

    try {
      await navigator.clipboard.writeText(outreachDraft);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch {
      // Clipboard can be unavailable in some browser contexts.
    }
  };

  /* -------------------------------------------------------
     NOTES
  ------------------------------------------------------- */

  const handleAddNote = (event) => {
    event.preventDefault();

    const value = note.trim();

    if (!value) return;

    const newNote = {
      id: `note-${Date.now()}`,
      text: value,
      createdAt: new Date().toISOString(),
    };

    setNotesList((prev) => [newNote, ...prev]);
    setNote("");
    setJustSaved(true);

    setTimeout(() => {
      setJustSaved(false);
    }, 1800);

    onAddNote?.(candidate.id, value);
  };

  /* -------------------------------------------------------
     SHORTLIST
  ------------------------------------------------------- */

  const handleShortlistClick = () => {
    if (!candidate || !selectedJobId || !onToggleSaveForJob) return;

    onToggleSaveForJob(candidate.id, selectedJobId);

    setJustSaved(true);

    setTimeout(() => {
      setJustSaved(false);
    }, 1400);
  };

  if (!candidate) return null;

  const name = candidate.fullName || candidate.name || "Unnamed candidate";

  return (
    <div
      className={`cdp-overlay cdp-overlay-${resolvedSide}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}
    >
      <aside
        className={`cdp-panel cdp-panel-${resolvedSide}`}
        role="dialog"
        aria-modal="true"
        aria-label={`${name} candidate details`}
        style={{
          "--tier-color": tier.color,
          "--tier-soft": tier.soft,
        }}
      >
        {/* =================================================
            TOP EDGE
        ================================================= */}

        <div className="cdp-edge-accent" />

        {/* =================================================
            HEADER
        ================================================= */}

        <header className="cdp-header">
          <div className="cdp-header-top">
            <div className="cdp-candidate-position">
              <span className="cdp-live-dot" />

              {candidateIndex !== null && candidateTotal !== null
                ? `Candidate ${candidateIndex + 1} / ${candidateTotal}`
                : "Candidate profile"}
            </div>

            <div className="cdp-header-nav">
              {onPrev && (
                <button
                  type="button"
                  className="cdp-nav-btn"
                  onClick={onPrev}
                  aria-label="Previous candidate"
                  data-tooltip="Previous candidate"
                >
                  <ChevronLeft size={17} />
                </button>
              )}

              {onNext && (
                <button
                  type="button"
                  className="cdp-nav-btn"
                  onClick={onNext}
                  aria-label="Next candidate"
                  data-tooltip="Next candidate"
                >
                  <ChevronRight size={17} />
                </button>
              )}

              <button
                type="button"
                className="cdp-nav-btn cdp-close"
                onClick={onClose}
                aria-label="Close candidate details"
                data-tooltip="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="cdp-profile">
            <div className="cdp-avatar-wrap">
              <img
                src={getAvatarUrl(name, candidate.avatarUrl)}
                alt=""
                className="cdp-avatar"
              />

              <span
                className="cdp-match-badge"
                style={{ background: tier.color }}
              >
                {score}
              </span>
            </div>

            <div className="cdp-profile-main">
              <div className="cdp-name-row">
                <h2>{name}</h2>

                {candidate.verified && (
                  <CheckCircle2
                    size={18}
                    className="cdp-verified"
                    aria-label="Verified"
                  />
                )}
              </div>

              <p className="cdp-headline">
                {candidate.headline ||
                  candidate.title ||
                  "No headline available"}
              </p>

              <div className="cdp-meta-row">
                {candidate.location && (
                  <span>
                    <MapPin size={13} />
                    {candidate.location}
                  </span>
                )}

                {(candidate.yearsExperience !== undefined || candidate.experienceYears !== undefined) && (
                  <span>
                    <BriefcaseBusiness size={13} />
                    {candidate.yearsExperience ?? candidate.experienceYears} yrs
                  </span>
                )}

                {candidate.organization_seniority && (
                  <span>
                    <BriefcaseBusiness size={13} />
                    {candidate.organization_seniority}
                  </span>
                )}
              </div>

              <div
                className="cdp-tier"
                style={{
                  color: tier.color,
                  background: tier.soft,
                }}
              >
                <span className="cdp-tier-dot" />
                {tier.label}
              </div>
            </div>
          </div>
        </header>

        {/* =================================================
            COMMAND BAR
        ================================================= */}

        <div className="cdp-commandbar">
          <button
            type="button"
            className={`cdp-shortlist-btn ${isSavedForJob ? "is-active" : ""
              }`}
            onClick={handleShortlistClick}
            disabled={!selectedJobId}
          >
            {isSavedForJob ? (
              <BookmarkCheck size={17} />
            ) : (
              <Bookmark size={17} />
            )}

            <span>
              {isSavedForJob ? "Shortlisted" : "Shortlist"}
            </span>

            {justSaved && (
              <Check size={15} className="cdp-action-check" />
            )}
          </button>

          <div className="cdp-command-divider" />

          <div className="cdp-contact-actions">
            {candidate.linkedin && (
              <IconAction
                icon={ExternalLink}
                label="Open LinkedIn"
                onClick={() => {
                  window.open(
                    candidate.linkedin,
                    "_blank",
                    "noopener,noreferrer"
                  );
                }}
              />
            )}

            {candidate.github_url && (
              <IconAction
                icon={ExternalLink}
                label="Open GitHub"
                onClick={() => {
                  window.open(
                    candidate.github_url,
                    "_blank",
                    "noopener,noreferrer"
                  );
                }}
              />
            )}

            {hasEmail && (
              <IconAction
                icon={Mail}
                label="Email candidate"
                onClick={() => handleDraftOutreach("email")}
              />
            )}

            <button
              type="button"
              className={`cdp-draft-btn ${outreachOpen ? "is-open" : ""
                }`}
              onClick={() =>
                handleDraftOutreach(outreachChannel || "email")
              }
            >
              <Sparkles size={16} />
              <span>Draft</span>
            </button>
          </div>

          <div className="cdp-more-wrap">
            <button
              type="button"
              className={`cdp-more-btn ${moreOpen ? "is-open" : ""}`}
              onClick={() => setMoreOpen((value) => !value)}
              aria-label="More candidate actions"
              data-tooltip="More actions"
            >
              <MoreHorizontal size={19} />
            </button>

            {moreOpen && (
              <div className="cdp-more-menu">
                {onEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      setMoreOpen(false);
                      onEdit(candidate);
                    }}
                  >
                    <Pencil size={16} />
                    Edit candidate
                  </button>
                )}

                {onDelete && (
                  <button
                    type="button"
                    className="danger"
                    onClick={() => {
                      setMoreOpen(false);
                      onDelete(candidate);
                    }}
                  >
                    <Trash2 size={16} />
                    Remove candidate
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* =================================================
            OUTREACH STUDIO
        ================================================= */}

        {outreachOpen && (
          <section className="cdp-outreach">
            <div className="cdp-outreach-head">
              <div>
                <div className="cdp-eyebrow">OUTREACH STUDIO</div>
                <h3>
                  {isDrafting
                    ? "Building a tailored message…"
                    : "Ready to reach out"}
                </h3>
              </div>

              <button
                type="button"
                className="cdp-outreach-close"
                onClick={() => setOutreachOpen(false)}
                aria-label="Close outreach studio"
              >
                <X size={15} />
              </button>
            </div>

            <div className="cdp-channel-switcher">
              <button
                type="button"
                className={
                  outreachChannel === "email" ? "is-active" : ""
                }
                onClick={() => handleDraftOutreach("email")}
              >
                <Mail size={14} />
                Email
              </button>

              <button
                type="button"
                className={
                  outreachChannel === "linkedin" ? "is-active" : ""
                }
                onClick={() => handleDraftOutreach("linkedin")}
              >
                <ExternalLink size={14} />
                LinkedIn
              </button>
            </div>

            {isDrafting ? (
              <div className="cdp-draft-loading">
                <div />
                <div />
                <div />
              </div>
            ) : (
              <>
                {outreachChannel === "email" && (
                  <input
                    className="cdp-subject-input"
                    value={outreachSubject}
                    onChange={(event) =>
                      setOutreachSubject(event.target.value)
                    }
                    placeholder="Subject"
                  />
                )}

                <textarea
                  className="cdp-draft-textarea"
                  value={outreachDraft}
                  onChange={(event) =>
                    setOutreachDraft(event.target.value)
                  }
                  placeholder="Your message…"
                  rows={6}
                />

                <div className="cdp-outreach-footer">
                  <span>
                    <Sparkles size={13} />
                    AI-assisted draft
                  </span>

                  <div className="cdp-outreach-actions">
                    <button
                      type="button"
                      className="cdp-small-btn"
                      onClick={handleCopyDraft}
                    >
                      {copied ? (
                        <>
                          <Check size={14} />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          Copy
                        </>
                      )}
                    </button>

                    {outreachChannel === "email" && hasEmail && (
                      <button
                        type="button"
                        className="cdp-send-btn"
                        onClick={() => {
                          window.location.href = `mailto:${rawEmail}?subject=${encodeURIComponent(
                            outreachSubject
                          )}&body=${encodeURIComponent(outreachDraft)}`;
                        }}
                      >
                        <Send size={14} />
                        Open email
                      </button>
                    )}

                    {outreachChannel === "linkedin" &&
                      candidate.linkedin && (
                        <button
                          type="button"
                          className="cdp-send-btn"
                          onClick={() => {
                            window.open(
                              candidate.linkedin,
                              "_blank",
                              "noopener,noreferrer"
                            );
                          }}
                        >
                          <ExternalLink size={14} />
                          Open LinkedIn
                        </button>
                      )}
                  </div>
                </div>
              </>
            )}
          </section>
        )}

        {/* =================================================
            TABS
        ================================================= */}

        <nav className="cdp-tabs" aria-label="Candidate sections">
          {["Overview", "Experience", "Contacts & Notes"].map(
            (item) => (
              <button
                key={item}
                type="button"
                className={tab === item ? "is-active" : ""}
                onClick={() => setTab(item)}
              >
                {item}

                {item === "Contacts & Notes" && notesCount > 0 && (
                  <span>{notesCount}</span>
                )}
              </button>
            )
          )}
        </nav>

        {/* =================================================
            BODY
        ================================================= */}

        <main className="cdp-body">
          {/* =================================================
              OVERVIEW
          ================================================= */}

          {tab === "Overview" && (
            <div className="cdp-content-stack">
              <section className="cdp-section">
                <SectionTitle
                  eyebrow="PROFILE"
                  title="Professional summary"
                />

                <div className="cdp-summary">
                  {candidate.summary ||
                    candidate.about ||
                    "No professional summary has been added for this candidate yet."}
                </div>
              </section>

              <section className="cdp-section">
                <SectionTitle
                  eyebrow="MATCH SIGNALS"
                  title="Candidate snapshot"
                />

                <div className="cdp-signal-grid">
                  <SignalCard
                    icon={WalletCards}
                    label="Salary expectation"
                    value={
                      candidate.salaryExpectation ||
                      candidate.expectedSalary ||
                      "Not specified"
                    }
                    tone="orange"
                  />

                  <SignalCard
                    icon={Clock3}
                    label="Availability"
                    value={
                      candidate.availability ||
                      candidate.noticePeriod ||
                      "Not specified"
                    }
                    tone="cyan"
                  />

                  <SignalCard
                    icon={BriefcaseBusiness}
                    label="Experience"
                    value={
                      candidate.yearsExperience !== undefined || candidate.experienceYears !== undefined
                        ? `${candidate.yearsExperience ?? candidate.experienceYears} years`
                        : "Not specified"
                    }
                  />

                  <SignalCard
                    icon={MapPin}
                    label="Location"
                    value={candidate.location || "Not specified"}
                  />

                  {candidate.organization_name && (
                    <SignalCard
                      icon={BriefcaseBusiness}
                      label="Company"
                      value={candidate.organization_name}
                      tone="purple"
                    />
                  )}

                  {candidate.organization_domain && (
                    <SignalCard
                      icon={BriefcaseBusiness}
                      label="Company Domain"
                      value={candidate.organization_domain}
                      tone="purple"
                    />
                  )}
                </div>
              </section>

              <section className="cdp-section">
                <div className="cdp-ai-card">
                  <div className="cdp-ai-top">
                    <div className="cdp-ai-icon">
                      <Sparkles size={17} />
                    </div>

                    <div>
                      <div className="cdp-eyebrow">
                        AI MATCH EVALUATION
                      </div>
                      <h3>
                        {score >= 90
                          ? "Strong candidate signal"
                          : score >= 80
                            ? "Promising candidate signal"
                            : "Worth reviewing"}
                      </h3>
                    </div>

                    <div
                      className="cdp-ai-score"
                      style={{ color: tier.color }}
                    >
                      {score}
                    </div>
                  </div>

                  {(Array.isArray(candidate.match_rationale) &&
                    candidate.match_rationale.length > 0) ? (
                    <div className="cdp-reasons">
                      {candidate.match_rationale.map((reason, index) => (
                        <div key={index} className="cdp-reason">
                          <CheckCircle2 size={15} />
                          <span>{reason}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="cdp-reasons">
                      {Array.isArray(candidate.matched_skills) && (
                        <div className="cdp-reason">
                          <CheckCircle2 size={15} />
                          <span>Skills: {candidate.matched_skills.length}/{(candidate.matched_skills || []).length + (candidate.missing_skills || []).length} matched</span>
                        </div>
                      )}
                      {candidate.experience_years !== undefined && candidate.min_experience_years !== undefined && (
                        <div className="cdp-reason">
                          <CheckCircle2 size={15} />
                          <span>Experience: {candidate.experience_years} yrs {candidate.experience_years >= candidate.min_experience_years ? '✓' : '✗'}</span>
                        </div>
                      )}
                      {candidate.location_score !== undefined && (
                        <div className="cdp-reason">
                          <CheckCircle2 size={15} />
                          <span>Location: {candidate.location_score >= 80 ? 'Match' : 'Partial'}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </section>

              <section className="cdp-section">
                <div className="cdp-section-heading">
                  <div>
                    <div className="cdp-eyebrow">EXPERTISE</div>
                    <h3>Skills</h3>
                  </div>

                  {skills.length > 0 && (
                    <span className="cdp-section-count">
                      {skills.length}
                    </span>
                  )}
                </div>

                {skills.length > 0 ? (
                  <>
                    <div className="cdp-skills">
                      {visibleSkills.map((skill, index) => (
                        <span key={`${skill}-${index}`}>
                          {skill}
                        </span>
                      ))}
                    </div>

                    {skills.length > 8 && (
                      <button
                        type="button"
                        className="cdp-expand-btn"
                        onClick={() =>
                          setSkillsExpanded((value) => !value)
                        }
                      >
                        {skillsExpanded ? (
                          <>
                            Show less
                            <ChevronUp size={15} />
                          </>
                        ) : (
                          <>
                            Show all {skills.length} skills
                            <ChevronDown size={15} />
                          </>
                        )}
                      </button>
                    )}
                  </>
                ) : (
                  <div className="cdp-empty">
                    No skills have been added.
                  </div>
                )}
              </section>
            </div>
          )}

          {/* =================================================
              EXPERIENCE
          ================================================= */}

          {tab === "Experience" && (
            <div className="cdp-content-stack">
              <section className="cdp-section">
                <SectionTitle
                  eyebrow="CAREER"
                  title="Experience timeline"
                />

                {Array.isArray(experienceArray) &&
                  experienceArray.length > 0 ? (
                  <div className="cdp-timeline">
                    {experienceArray.map((item, index) => (
                      <article
                        className="cdp-timeline-item"
                        key={item.id || index}
                      >
                        <div className="cdp-timeline-marker">
                          <span />
                        </div>

                        <div className="cdp-timeline-content">
                          <div className="cdp-timeline-period">
                            {formatExperiencePeriod(
                              item.startDate || item.start,
                              item.endDate || item.end
                            )}
                          </div>

                          <h4>
                            {item.title ||
                              item.role ||
                              "Position"}
                          </h4>

                          <div className="cdp-company">
                            {item.company || "Company"}
                          </div>

                          {item.location && (
                            <div className="cdp-experience-location">
                              <MapPin size={12} />
                              {item.location}
                            </div>
                          )}

                          {item.description && (
                            <p>{item.description}</p>
                          )}

                          {Array.isArray(item.skills) &&
                            item.skills.length > 0 && (
                              <div className="cdp-mini-tags">
                                {item.skills
                                  .slice(0, 5)
                                  .map((skill) => (
                                    <span key={skill}>
                                      {skill}
                                    </span>
                                  ))}
                              </div>
                            )}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="cdp-empty-large">
                    <BriefcaseBusiness size={24} />
                    <strong>No experience added</strong>
                    <span>
                      This candidate doesn't have a career timeline
                      yet.
                    </span>
                  </div>
                )}
              </section>
            </div>
          )}

          {/* =================================================
              CONTACTS + NOTES
          ================================================= */}

          {tab === "Contacts & Notes" && (
            <div className="cdp-content-stack">
              <section className="cdp-section">
                <SectionTitle
                  eyebrow="CONTACT"
                  title="Reach this candidate"
                />

                <div className="cdp-contact-list">
                  <div className="cdp-contact-row">
                    <div className="cdp-contact-icon">
                      <Mail size={17} />
                    </div>

                    <div className="cdp-contact-copy">
                      <span>Email</span>
                      <strong>
                        {hasEmail ? rawEmail : "No email available"}
                      </strong>
                    </div>

                    {hasEmail && (
                      <button
                        type="button"
                        className="cdp-contact-open"
                        onClick={() =>
                          handleDraftOutreach("email")
                        }
                      >
                        <Mail size={15} />
                        Draft
                      </button>
                    )}

                    {hasEmail && !isEmailVerified && (
                      <span
                        className="cdp-unverified"
                        title="Email has not been verified"
                      >
                        <AlertCircle size={14} />
                      </span>
                    )}
                  </div>

                  {candidate.linkedin && (
                    <div className="cdp-contact-row">
                      <div className="cdp-contact-icon">
                        <ExternalLink size={17} />
                      </div>

                      <div className="cdp-contact-copy">
                        <span>LinkedIn</span>
                        <strong>Professional profile</strong>
                      </div>

                      <button
                        type="button"
                        className="cdp-contact-open"
                        onClick={() =>
                          window.open(
                            candidate.linkedin,
                            "_blank",
                            "noopener,noreferrer"
                          )
                        }
                      >
                        <ExternalLink size={15} />
                        Open
                      </button>
                    </div>
                  )}

                  {candidate.instagram && (
                    <div className="cdp-contact-row">
                      <div className="cdp-contact-icon">
                        <Instagram size={17} />
                      </div>

                      <div className="cdp-contact-copy">
                        <span>Instagram</span>
                        <strong>Social profile</strong>
                      </div>

                      <button
                        type="button"
                        className="cdp-contact-open"
                        onClick={() =>
                          window.open(
                            candidate.instagram,
                            "_blank",
                            "noopener,noreferrer"
                          )
                        }
                      >
                        <ExternalLink size={15} />
                        Open
                      </button>
                    </div>
                  )}

                  {candidate.github && (
                    <div className="cdp-contact-row">
                      <div className="cdp-contact-icon">
                        <Github size={17} />
                      </div>

                      <div className="cdp-contact-copy">
                        <span>GitHub</span>
                        <strong>Code portfolio</strong>
                      </div>

                      <button
                        type="button"
                        className="cdp-contact-open"
                        onClick={() =>
                          window.open(
                            candidate.github,
                            "_blank",
                            "noopener,noreferrer"
                          )
                        }
                      >
                        <ExternalLink size={15} />
                        Open
                      </button>
                    </div>
                  )}
                </div>
              </section>

              <section className="cdp-section">
                <div className="cdp-section-heading">
                  <div>
                    <div className="cdp-eyebrow">RECRUITER MEMORY</div>
                    <h3>Notes</h3>
                  </div>

                  <span className="cdp-section-count">
                    {notesCount}
                  </span>
                </div>

                <form className="cdp-note-form" onSubmit={handleAddNote}>
                  <div className="cdp-note-input-wrap">
                    <Plus size={16} />

                    <textarea
                      value={note}
                      onChange={(event) =>
                        setNote(event.target.value)
                      }
                      placeholder="Add a private recruiter note…"
                      rows={4}
                    />
                  </div>

                  <div className="cdp-note-form-footer">
                    <span>Private to your recruiting team</span>

                    <button type="submit" disabled={!note.trim()}>
                      <Plus size={14} />
                      Add note
                    </button>
                  </div>
                </form>

                {notesList.length > 0 ? (
                  <div className="cdp-notes-list">
                    {notesList.map((item, index) => (
                      <article
                        className="cdp-note"
                        key={item.id || index}
                      >
                        <div className="cdp-note-marker" />

                        <div className="cdp-note-content">
                          <p>{item.text || item.content}</p>

                          <time>
                            {formatNoteTimestamp(item)}
                          </time>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="cdp-empty-notes">
                    <span>No recruiter notes yet.</span>
                    <small>
                      Add context here so the next recruiter knows
                      the story.
                    </small>
                  </div>
                )}
              </section>
            </div>
          )}
        </main>
      </aside>

      {/* =====================================================
          STYLES
      ===================================================== */}

      <style>{`
        * {
          box-sizing: border-box;
        }

        .cdp-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          background: rgba(18, 21, 27, .34);
          backdrop-filter: blur(2px);
          -webkit-backdrop-filter: blur(2px);
          font-family: Inter, system-ui, sans-serif;
        }

        .cdp-panel {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 50vw;
          background: #FBFAF7;
          color: #12151B;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 20px 70px rgba(0, 0, 0, .22);
          isolation: isolate;
        }

        .cdp-panel-right {
          right: 0;
          border-left: 1px solid rgba(18, 21, 27, .1);
          animation: cdpSlideRight .26s cubic-bezier(.22,.8,.22,1);
        }

        .cdp-panel-left {
          left: 0;
          border-right: 1px solid rgba(18, 21, 27, .1);
          animation: cdpSlideLeft .26s cubic-bezier(.22,.8,.22,1);
        }

        @keyframes cdpSlideRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }

        @keyframes cdpSlideLeft {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0);
          }
        }

        .cdp-edge-accent {
          position: absolute;
          z-index: 10;
          top: 0;
          bottom: 0;
          width: 3px;
          background: var(--tier-color);
          opacity: .9;
        }

        .cdp-panel-right .cdp-edge-accent {
          left: 0;
        }

        .cdp-panel-left .cdp-edge-accent {
          right: 0;
        }

        /* HEADER */

        .cdp-header {
          flex-shrink: 0;
          padding: 16px 20px 21px;
          background: #12151B;
          color: #fff;
        }

        .cdp-header-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .cdp-candidate-position {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: "JetBrains Mono", monospace;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: .08em;
          color: rgba(255,255,255,.48);
        }

        .cdp-live-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--tier-color);
          box-shadow: 0 0 0 4px rgba(255,255,255,.05);
        }

        .cdp-header-nav {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .cdp-nav-btn {
          position: relative;
          width: 31px;
          height: 31px;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 9px;
          display: grid;
          place-items: center;
          color: rgba(255,255,255,.68);
          background: rgba(255,255,255,.045);
          cursor: pointer;
          transition: .16s ease;
        }

        .cdp-nav-btn:hover {
          color: #fff;
          background: rgba(255,255,255,.1);
          transform: translateY(-1px);
        }

        .cdp-nav-btn[data-tooltip]::after,
        .cdp-icon-action[data-tooltip]::after,
        .cdp-more-btn[data-tooltip]::after {
          content: attr(data-tooltip);
          position: absolute;
          pointer-events: none;
          white-space: nowrap;
          bottom: calc(100% + 7px);
          right: 0;
          padding: 5px 7px;
          border-radius: 6px;
          background: #12151B;
          color: #fff;
          font: 500 10px Inter, sans-serif;
          opacity: 0;
          transform: translateY(3px);
          transition: .14s ease;
          z-index: 100;
          box-shadow: 0 6px 20px rgba(0,0,0,.2);
        }

        .cdp-nav-btn:hover::after,
        .cdp-icon-action:hover::after,
        .cdp-more-btn:hover::after {
          opacity: 1;
          transform: translateY(0);
        }

        .cdp-close {
          margin-left: 4px;
        }

        .cdp-profile {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .cdp-avatar-wrap {
          position: relative;
          flex: 0 0 auto;
        }

        .cdp-avatar {
          width: 74px;
          height: 74px;
          border-radius: 22px;
          object-fit: cover;
          background: #20252E;
          border: 1px solid rgba(255,255,255,.1);
        }

        .cdp-match-badge {
          position: absolute;
          right: -7px;
          bottom: -6px;
          min-width: 30px;
          height: 30px;
          padding: 0 7px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          color: white;
          font: 700 11px "JetBrains Mono", monospace;
          border: 3px solid #12151B;
        }

        .cdp-profile-main {
          min-width: 0;
          flex: 1;
        }

        .cdp-name-row {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .cdp-name-row h2 {
          margin: 0;
          font: 700 22px "Space Grotesk", sans-serif;
          letter-spacing: -.035em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .cdp-verified {
          flex-shrink: 0;
          color: #0BA5C9;
        }

        .cdp-headline {
          margin: 4px 0 9px;
          color: rgba(255,255,255,.58);
          font-size: 12px;
          line-height: 1.45;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        .cdp-meta-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
          color: rgba(255,255,255,.5);
          font-size: 11px;
        }

        .cdp-meta-row span {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .cdp-tier {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 10px;
          padding: 5px 8px;
          border-radius: 7px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .06em;
        }

        .cdp-tier-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: currentColor;
        }

        /* COMMAND BAR */

        .cdp-commandbar {
          position: relative;
          z-index: 30;
          min-height: 67px;
          padding: 11px 17px;
          display: flex;
          align-items: center;
          gap: 9px;
          background: #fff;
          border-bottom: 1px solid rgba(18,21,27,.08);
          flex-shrink: 0;
        }

        .cdp-shortlist-btn {
          height: 39px;
          padding: 0 13px;
          border: 1px solid rgba(18,21,27,.12);
          border-radius: 10px;
          background: #12151B;
          color: #fff;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font: 600 11px Inter, sans-serif;
          cursor: pointer;
          transition: .16s ease;
          white-space: nowrap;
        }

        .cdp-shortlist-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 5px 16px rgba(18,21,27,.16);
        }

        .cdp-shortlist-btn.is-active {
          background: #0BA5C9;
          border-color: #0BA5C9;
        }

        .cdp-action-check {
          margin-left: 2px;
        }

        .cdp-command-divider {
          width: 1px;
          height: 26px;
          background: rgba(18,21,27,.09);
          margin: 0 2px;
        }

        .cdp-contact-actions {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .cdp-icon-action,
        .cdp-more-btn {
          position: relative;
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(18,21,27,.09);
          border-radius: 9px;
          background: #fff;
          color: #555B65;
          cursor: pointer;
          transition: .16s ease;
        }

        .cdp-icon-action:hover,
        .cdp-more-btn:hover,
        .cdp-more-btn.is-open {
          color: #12151B;
          background: #F4F3EF;
          border-color: rgba(18,21,27,.15);
          transform: translateY(-1px);
        }

        .cdp-icon-action:disabled {
          opacity: .35;
          cursor: not-allowed;
        }

        .cdp-draft-btn {
          height: 36px;
          padding: 0 10px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: 1px solid rgba(11,165,201,.22);
          border-radius: 9px;
          color: #087D98;
          background: rgba(11,165,201,.06);
          font: 600 11px Inter, sans-serif;
          cursor: pointer;
          transition: .16s ease;
        }

        .cdp-draft-btn:hover,
        .cdp-draft-btn.is-open {
          background: rgba(11,165,201,.11);
          transform: translateY(-1px);
        }

        .cdp-more-wrap {
          position: relative;
          margin-left: auto;
        }

        .cdp-more-menu {
          position: absolute;
          right: 0;
          top: calc(100% + 7px);
          width: 190px;
          padding: 5px;
          border: 1px solid rgba(18,21,27,.09);
          border-radius: 11px;
          background: #fff;
          box-shadow: 0 14px 35px rgba(18,21,27,.15);
          animation: cdpMenuIn .14s ease;
        }

        @keyframes cdpMenuIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .cdp-more-menu button {
          width: 100%;
          height: 37px;
          padding: 0 10px;
          display: flex;
          align-items: center;
          gap: 9px;
          border: 0;
          border-radius: 7px;
          background: transparent;
          color: #333841;
          text-align: left;
          font: 500 11px Inter, sans-serif;
          cursor: pointer;
        }

        .cdp-more-menu button:hover {
          background: #F5F4F0;
        }

        .cdp-more-menu button.danger {
          color: #C7432A;
        }

        .cdp-more-menu button.danger:hover {
          background: rgba(199,67,42,.07);
        }

        /* OUTREACH */

        .cdp-outreach {
          margin: 12px 17px 2px;
          padding: 13px;
          border: 1px solid rgba(11,165,201,.17);
          border-radius: 13px;
          background: linear-gradient(
            145deg,
            rgba(11,165,201,.065),
            rgba(255,255,255,.92)
          );
          flex-shrink: 0;
          animation: cdpOutreachIn .18s ease;
        }

        @keyframes cdpOutreachIn {
          from {
            opacity: 0;
            transform: translateY(-5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .cdp-outreach-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 10px;
        }

        .cdp-outreach-head h3 {
          margin: 2px 0 0;
          font: 600 13px "Space Grotesk", sans-serif;
        }

        .cdp-eyebrow {
          font: 600 9px "JetBrains Mono", monospace;
          letter-spacing: .09em;
          color: #8A8F98;
          text-transform: uppercase;
        }

        .cdp-outreach-close {
          width: 25px;
          height: 25px;
          display: grid;
          place-items: center;
          border: 0;
          border-radius: 7px;
          background: rgba(18,21,27,.05);
          color: #6C727C;
          cursor: pointer;
        }

        .cdp-channel-switcher {
          display: flex;
          gap: 5px;
          margin-bottom: 9px;
        }

        .cdp-channel-switcher button {
          height: 28px;
          padding: 0 9px;
          border: 1px solid rgba(18,21,27,.08);
          border-radius: 7px;
          background: #fff;
          color: #70757E;
          display: flex;
          align-items: center;
          gap: 5px;
          font: 600 10px Inter, sans-serif;
          cursor: pointer;
        }

        .cdp-channel-switcher button.is-active {
          color: #087D98;
          border-color: rgba(11,165,201,.24);
          background: rgba(11,165,201,.08);
        }

        .cdp-subject-input,
        .cdp-draft-textarea {
          width: 100%;
          border: 1px solid rgba(18,21,27,.09);
          background: #fff;
          border-radius: 8px;
          outline: none;
          font: 11px/1.55 Inter, sans-serif;
          color: #272C33;
        }

        .cdp-subject-input {
          height: 34px;
          padding: 0 9px;
          margin-bottom: 7px;
        }

        .cdp-draft-textarea {
          min-height: 105px;
          padding: 9px;
          resize: vertical;
        }

        .cdp-subject-input:focus,
        .cdp-draft-textarea:focus {
          border-color: rgba(11,165,201,.4);
          box-shadow: 0 0 0 3px rgba(11,165,201,.07);
        }

        .cdp-draft-loading {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 6px 0 9px;
        }

        .cdp-draft-loading div {
          height: 10px;
          border-radius: 5px;
          background: linear-gradient(
            90deg,
            #EEF0F1 20%,
            #F9FAFA 45%,
            #EEF0F1 70%
          );
          background-size: 300% 100%;
          animation: cdpShimmer 1.1s infinite;
        }

        .cdp-draft-loading div:nth-child(1) {
          width: 90%;
        }

        .cdp-draft-loading div:nth-child(2) {
          width: 100%;
        }

        .cdp-draft-loading div:nth-child(3) {
          width: 70%;
        }

        @keyframes cdpShimmer {
          from {
            background-position: 100% 0;
          }
          to {
            background-position: -100% 0;
          }
        }

        .cdp-outreach-footer {
          margin-top: 8px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .cdp-outreach-footer > span {
          display: flex;
          align-items: center;
          gap: 5px;
          color: #8A8F98;
          font-size: 9px;
        }

        .cdp-outreach-actions {
          display: flex;
          gap: 5px;
        }

        .cdp-small-btn,
        .cdp-send-btn {
          height: 29px;
          padding: 0 9px;
          border-radius: 7px;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font: 600 10px Inter, sans-serif;
          cursor: pointer;
        }

        .cdp-small-btn {
          border: 1px solid rgba(18,21,27,.1);
          background: #fff;
          color: #5C626B;
        }

        .cdp-send-btn {
          border: 0;
          background: #12151B;
          color: #fff;
        }

        /* TABS */

        .cdp-tabs {
          display: flex;
          gap: 2px;
          padding: 10px 17px 0;
          background: #FBFAF7;
          border-bottom: 1px solid rgba(18,21,27,.08);
          flex-shrink: 0;
        }

        .cdp-tabs button {
          position: relative;
          padding: 0 9px 11px;
          border: 0;
          background: transparent;
          color: #8A8F98;
          font: 600 13px Inter, sans-serif;
          cursor: pointer;
          white-space: nowrap;
        }

        .cdp-tabs button::after {
          content: "";
          position: absolute;
          left: 9px;
          right: 9px;
          bottom: -1px;
          height: 2px;
          border-radius: 2px;
          background: transparent;
        }

        .cdp-tabs button.is-active {
          color: #12151B;
        }

        .cdp-tabs button.is-active::after {
          background: var(--tier-color);
        }

        .cdp-tabs button span {
          display: inline-grid;
          place-items: center;
          min-width: 17px;
          height: 17px;
          padding: 0 4px;
          margin-left: 4px;
          border-radius: 999px;
          background: #EEEDE9;
          font: 600 9px "JetBrains Mono", monospace;
        }

        /* BODY */

        .cdp-body {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          scrollbar-width: thin;
          scrollbar-color: rgba(18,21,27,.16) transparent;
        }

        .cdp-body::-webkit-scrollbar {
          width: 6px;
        }

        .cdp-body::-webkit-scrollbar-thumb {
          background: rgba(18,21,27,.14);
          border-radius: 10px;
        }

        .cdp-content-stack {
          padding: 19px 19px 36px;
          display: flex;
          flex-direction: column;
          gap: 25px;
        }

        .cdp-section {
          min-width: 0;
        }

        .cdp-section-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 11px;
        }

        .cdp-section-heading h3 {
          margin: 2px 0 0;
          font: 700 17px "Space Grotesk", sans-serif;
          letter-spacing: -.02em;
        }

        .cdp-section-count {
          min-width: 25px;
          height: 25px;
          padding: 0 7px;
          display: grid;
          place-items: center;
          border-radius: 8px;
          background: #EEEDE9;
          color: #70757E;
          font: 600 10px "JetBrains Mono", monospace;
        }

        .cdp-summary {
          padding: 13px 14px;
          border: 1px solid rgba(18,21,27,.08);
          border-radius: 11px;
          background: #fff;
          color: #555B65;
          font-size: 13px;
          line-height: 1.7;
        }

        /* SIGNALS */

        .cdp-signal-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 7px;
        }

        .cdp-signal {
          min-width: 0;
          min-height: 69px;
          padding: 10px;
          display: flex;
          align-items: center;
          gap: 9px;
          border: 1px solid rgba(18,21,27,.07);
          border-radius: 10px;
          background: #fff;
        }

        .cdp-signal-icon {
          width: 29px;
          height: 29px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          border-radius: 8px;
          background: #F0F0ED;
          color: #737983;
        }

        .cdp-signal-orange .cdp-signal-icon {
          color: #D65A3D;
          background: rgba(232,93,61,.09);
        }

        .cdp-signal-cyan .cdp-signal-icon {
          color: #0785A2;
          background: rgba(11,165,201,.09);
        }

        .cdp-signal-copy {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .cdp-signal-copy span {
          color: #92969D;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: .05em;
        }

        .cdp-signal-copy strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #282D34;
          font: 600 13px "Space Grotesk", sans-serif;
        }

        /* AI */

        .cdp-ai-card {
          position: relative;
          overflow: hidden;
          padding: 14px;
          border: 1px solid rgba(11,165,201,.15);
          border-radius: 12px;
          background: linear-gradient(
            140deg,
            rgba(11,165,201,.055),
            #fff
          );
        }

        .cdp-ai-card::before {
          content: "";
          position: absolute;
          top: -35px;
          right: -35px;
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: var(--tier-soft);
          filter: blur(10px);
        }

        .cdp-ai-top {
          position: relative;
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .cdp-ai-icon {
          width: 31px;
          height: 31px;
          display: grid;
          place-items: center;
          border-radius: 9px;
          color: #0785A2;
          background: rgba(11,165,201,.1);
        }

        .cdp-ai-top h3 {
          margin: 2px 0 0;
          font: 600 12px "Space Grotesk", sans-serif;
        }

        .cdp-ai-score {
          margin-left: auto;
          font: 700 23px "JetBrains Mono", monospace;
        }

        .cdp-reasons {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 7px;
          margin-top: 13px;
          padding-top: 11px;
          border-top: 1px solid rgba(18,21,27,.07);
        }

        .cdp-reason {
          display: flex;
          align-items: flex-start;
          gap: 7px;
          color: #59606A;
          font-size: 12px;
          line-height: 1.45;
        }

        .cdp-reason svg {
          flex-shrink: 0;
          margin-top: 1px;
          color: #0BA5C9;
        }

        .cdp-ai-empty {
          position: relative;
          margin: 12px 0 0;
          color: #858A92;
          font-size: 10px;
        }

        /* SKILLS */

        .cdp-skills {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
        }

        .cdp-skills span,
        .cdp-mini-tags span {
          display: inline-flex;
          align-items: center;
          min-height: 25px;
          padding: 0 8px;
          border: 1px solid rgba(18,21,27,.07);
          border-radius: 7px;
          background: #fff;
          color: #555B65;
          font-size: 12px;
          font-weight: 500;
        }

        .cdp-expand-btn {
          margin-top: 9px;
          padding: 0;
          border: 0;
          background: transparent;
          color: #0785A2;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font: 600 10px Inter, sans-serif;
          cursor: pointer;
        }

        .cdp-empty {
          padding: 13px;
          border-radius: 9px;
          background: #F2F1ED;
          color: #898D94;
          font-size: 10px;
        }

        /* EXPERIENCE */

        .cdp-timeline {
          position: relative;
          margin-top: 3px;
        }

        .cdp-timeline::before {
          content: "";
          position: absolute;
          left: 9px;
          top: 7px;
          bottom: 7px;
          width: 1px;
          background: rgba(18,21,27,.1);
        }

        .cdp-timeline-item {
          position: relative;
          display: flex;
          gap: 15px;
          padding-bottom: 24px;
        }

        .cdp-timeline-item:last-child {
          padding-bottom: 0;
        }

        .cdp-timeline-marker {
          position: relative;
          z-index: 2;
          width: 19px;
          flex-shrink: 0;
          display: flex;
          justify-content: center;
        }

        .cdp-timeline-marker span {
          width: 9px;
          height: 9px;
          margin-top: 6px;
          border-radius: 50%;
          background: #FBFAF7;
          border: 2px solid var(--tier-color);
          box-shadow: 0 0 0 3px var(--tier-soft);
        }

        .cdp-timeline-content {
          min-width: 0;
          flex: 1;
          padding: 11px 12px;
          border: 1px solid rgba(18,21,27,.07);
          border-radius: 10px;
          background: #fff;
        }

        .cdp-timeline-period {
          color: #92969D;
          font: 500 9px "JetBrains Mono", monospace;
        }

        .cdp-timeline-content h4 {
          margin: 5px 0 2px;
          font: 600 15px "Space Grotesk", sans-serif;
        }

        .cdp-company {
          color: #0785A2;
          font-size: 10px;
          font-weight: 600;
        }

        .cdp-experience-location {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 6px;
          color: #92969D;
          font-size: 9px;
        }

        .cdp-timeline-content p {
          margin: 9px 0 0;
          color: #636972;
          font-size: 12px;
          line-height: 1.6;
        }

        .cdp-mini-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-top: 9px;
        }

        .cdp-mini-tags span {
          min-height: 22px;
          font-size: 9px;
          background: #F8F7F4;
        }

        .cdp-empty-large {
          min-height: 180px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 7px;
          border: 1px dashed rgba(18,21,27,.12);
          border-radius: 12px;
          color: #898D94;
        }

        .cdp-empty-large svg {
          color: #A5A9AF;
        }

        .cdp-empty-large strong {
          color: #555B65;
          font: 600 12px "Space Grotesk", sans-serif;
        }

        .cdp-empty-large span {
          font-size: 10px;
        }

        /* CONTACTS */

        .cdp-contact-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .cdp-contact-row {
          min-height: 58px;
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 8px 9px;
          border: 1px solid rgba(18,21,27,.07);
          border-radius: 10px;
          background: #fff;
        }

        .cdp-contact-icon {
          width: 32px;
          height: 32px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          border-radius: 8px;
          background: #F0F0ED;
          color: #636972;
        }

        .cdp-contact-copy {
          min-width: 0;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .cdp-contact-copy span {
          color: #92969D;
          font-size: 11px;
        }

        .cdp-contact-copy strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #363B43;
          font-size: 13px;
          font-weight: 600;
        }

        .cdp-contact-open {
          height: 29px;
          padding: 0 8px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          border: 1px solid rgba(18,21,27,.09);
          border-radius: 7px;
          background: #fff;
          color: #5E646D;
          font: 600 9px Inter, sans-serif;
          cursor: pointer;
        }

        .cdp-contact-open:hover {
          background: #F4F3EF;
          color: #12151B;
        }

        .cdp-unverified {
          color: #D28B28;
        }

        /* NOTES */

        .cdp-note-form {
          padding: 10px;
          border: 1px solid rgba(18,21,27,.08);
          border-radius: 11px;
          background: #fff;
        }

        .cdp-note-input-wrap {
          display: flex;
          align-items: flex-start;
          gap: 7px;
        }

        .cdp-note-input-wrap > svg {
          flex-shrink: 0;
          margin-top: 4px;
          color: #A0A4AA;
        }

        .cdp-note-input-wrap textarea {
          width: 100%;
          border: 0;
          outline: none;
          resize: vertical;
          background: transparent;
          color: #363B43;
          font: 13px/1.6 Inter, sans-serif;
        }

        .cdp-note-input-wrap textarea::placeholder {
          color: #A4A8AE;
          font-size: 13px;
        }

        .cdp-note-form-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 7px;
          padding-top: 7px;
          border-top: 1px solid rgba(18,21,27,.06);
        }

        .cdp-note-form-footer span {
          color: #A0A4AA;
          font-size: 8px;
        }

        .cdp-note-form-footer button {
          height: 28px;
          padding: 0 9px;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          border: 0;
          border-radius: 7px;
          background: #12151B;
          color: #fff;
          font: 600 9px Inter, sans-serif;
          cursor: pointer;
        }

        .cdp-note-form-footer button:disabled {
          opacity: .35;
          cursor: not-allowed;
        }

        .cdp-notes-list {
          display: flex;
          flex-direction: column;
          gap: 7px;
          margin-top: 9px;
        }

        .cdp-note {
          display: flex;
          gap: 9px;
          padding: 11px 12px;
          border: 1px solid rgba(18,21,27,.07);
          border-radius: 10px;
          background: #fff;
        }

        .cdp-note-marker {
          width: 4px;
          flex-shrink: 0;
          border-radius: 5px;
          background: var(--tier-color);
        }

        .cdp-note-content {
          min-width: 0;
        }

        .cdp-note-content p {
          margin: 0;
          color: #555B65;
          font-size: 13px;
          line-height: 1.6;
        }

        .cdp-note-content time {
          display: block;
          margin-top: 7px;
          color: #A0A4AA;
          font: 500 8px "JetBrains Mono", monospace;
        }

        .cdp-empty-notes {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 23px 10px;
          border: 1px dashed rgba(18,21,27,.11);
          border-radius: 10px;
          color: #858A92;
          text-align: center;
        }

        .cdp-empty-notes span {
          font-size: 10px;
          font-weight: 600;
        }

        .cdp-empty-notes small {
          font-size: 9px;
          color: #A0A4AA;
        }

        /* SCORE */

        .cdp-score-ring {
          position: relative;
          flex-shrink: 0;
        }

        .cdp-score-ring svg {
          display: block;
        }

        .cdp-score-progress {
          animation: cdpScoreDraw .8s cubic-bezier(.2,.8,.2,1);
        }

        @keyframes cdpScoreDraw {
          from {
            stroke-dashoffset: 182;
          }
        }

        .cdp-score-value {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .cdp-score-value strong {
          font: 700 16px "JetBrains Mono", monospace;
          color: #fff;
          line-height: 1;
        }

        .cdp-score-value span {
          margin-top: 2px;
          color: rgba(255,255,255,.4);
          font: 500 7px "JetBrains Mono", monospace;
        }

        /* RESPONSIVE */

        @media (max-width: 600px) {
          .cdp-panel {
            width: 100vw;
          }

          .cdp-profile {
            gap: 11px;
          }

          .cdp-avatar {
            width: 62px;
            height: 62px;
            border-radius: 18px;
          }

          .cdp-name-row h2 {
            font-size: 19px;
          }

          .cdp-contact-actions .cdp-draft-btn span {
            display: none;
          }

          .cdp-draft-btn {
            width: 36px;
            padding: 0;
            justify-content: center;
          }

          .cdp-tabs {
            overflow-x: auto;
          }

          .cdp-tabs button {
            flex-shrink: 0;
          }
        }

        @media (max-width: 390px) {
          .cdp-commandbar {
            gap: 5px;
            padding-left: 10px;
            padding-right: 10px;
          }

          .cdp-shortlist-btn span {
            display: none;
          }

          .cdp-shortlist-btn {
            width: 38px;
            padding: 0;
            justify-content: center;
          }

          .cdp-signal-grid {
            grid-template-columns: 1fr;
          }

          .cdp-content-stack {
            padding-left: 13px;
            padding-right: 13px;
          }
        }
      `}</style>
    </div>
  );
}