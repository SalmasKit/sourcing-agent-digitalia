import React, { useEffect, useMemo, useState } from "react";
import {
  Check,
  Circle,
  Search,
  Sparkles,
  UserSearch,
} from "lucide-react";

const STEPS = [
  {
    id: 0,
    title: "Understanding role",
    description: "Reading requirements and priorities",
    icon: Sparkles,
  },
  {
    id: 1,
    title: "Finding candidates",
    description: "Searching relevant professional profiles",
    icon: Search,
  },
  {
    id: 2,
    title: "Enriching profiles",
    description: "Reviewing skills and experience signals",
    icon: UserSearch,
  },
  {
    id: 3,
    title: "Ranking matches",
    description: "Ordering candidates by role relevance",
    icon: Sparkles,
  },
];

const AgentStatusWidget = ({
  currentStep = 0,
  totalCandidatesFound = 0,
}) => {
  /*
   * Smoothly animate the visual progress rather than showing
   * raw fake command logs.
   */
  const safeStep = Math.min(
    Math.max(Number(currentStep) || 0, 0),
    STEPS.length - 1
  );

  const [visualStep, setVisualStep] =
    useState(safeStep);

  useEffect(() => {
    setVisualStep(safeStep);
  }, [safeStep]);

  const progress = useMemo(() => {
    return ((visualStep + 1) / STEPS.length) * 100;
  }, [visualStep]);

  const current = STEPS[visualStep];
  const CurrentIcon = current.icon;

  return (
    <div className="agent-progress">
      <style>{styles}</style>

      <div className="agent-progress-top">
        <div className="agent-current">
          <div className="agent-current-icon">
            <CurrentIcon size={15} />
          </div>

          <div>
            <div className="agent-current-title">
              <span className="agent-live-dot" />

              <strong>{current.title}</strong>

              <span className="agent-step-number">
                Step {visualStep + 1} of{" "}
                {STEPS.length}
              </span>
            </div>

            <p>{current.description}</p>
          </div>
        </div>

        {totalCandidatesFound > 0 && (
          <div className="agent-found">
            <strong>{totalCandidatesFound}</strong>

            <span>
              candidate
              {totalCandidatesFound === 1
                ? ""
                : "s"}{" "}
              found
            </span>
          </div>
        )}
      </div>

      <div className="agent-track">
        <div
          className="agent-track-progress"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="agent-steps">
        {STEPS.map((step, index) => {
          const completed = index < visualStep;
          const active = index === visualStep;
          const StepIcon = step.icon;

          return (
            <div
              key={step.id}
              className={[
                "agent-step",
                completed
                  ? "agent-step-complete"
                  : "",
                active ? "agent-step-active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className="agent-step-marker">
                {completed ? (
                  <Check size={10} />
                ) : active ? (
                  <StepIcon size={10} />
                ) : (
                  <Circle size={7} />
                )}
              </div>

              <span>{step.title}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const styles = `
.agent-progress {
  --cyan: #0BA5C9;
  --cyan-dark: #087F9B;
  --cyan-soft: #EBF9FC;
  --border: #E5E2DB;
  --ink: #171A20;
  --muted: #757980;

  padding: 13px 15px 11px;
  margin-bottom: 13px;
  border: 1px solid #DCE8E9;
  border-radius: 10px;
  background:
    linear-gradient(
      90deg,
      rgba(11,165,201,.035),
      rgba(255,255,255,0) 45%
    ),
    #FCFCFA;
  font-family: Inter, sans-serif;
}

.agent-progress-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.agent-current {
  display: flex;
  align-items: center;
  gap: 10px;
}

.agent-current-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 31px;
  height: 31px;
  flex: 0 0 auto;
  border: 1px solid #D1EAF0;
  border-radius: 8px;
  background: var(--cyan-soft);
  color: var(--cyan-dark);
}

.agent-current-title {
  display: flex;
  align-items: center;
  gap: 6px;
}

.agent-current-title strong {
  color: var(--ink);
  font-size: 10px;
  font-weight: 650;
}

.agent-step-number {
  color: #909398;
  font-size: 8px;
}

.agent-current p {
  margin: 3px 0 0 13px;
  color: var(--muted);
  font-size: 8px;
}

.agent-live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--cyan);
  box-shadow: 0 0 0 4px rgba(11,165,201,.10);
  animation: agentPulse 1.4s ease-in-out infinite;
}

.agent-found {
  display: flex;
  align-items: baseline;
  gap: 4px;
  white-space: nowrap;
}

.agent-found strong {
  color: var(--cyan-dark);
  font-family: "Space Grotesk", Inter, sans-serif;
  font-size: 14px;
}

.agent-found span {
  color: #86898E;
  font-size: 8px;
}

.agent-track {
  overflow: hidden;
  height: 3px;
  margin-top: 11px;
  border-radius: 999px;
  background: #EDECE8;
}

.agent-track-progress {
  height: 100%;
  border-radius: inherit;
  background: var(--cyan);
  transition:
    width .45s cubic-bezier(.4,0,.2,1);
}

.agent-steps {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-top: 9px;
}

.agent-step {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  color: #A0A2A6;
}

.agent-step-marker {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  flex: 0 0 auto;
  border: 1px solid #DDDBD6;
  border-radius: 50%;
  background: white;
  color: #ACADB0;
}

.agent-step span {
  overflow: hidden;
  font-size: 7.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-step-active {
  color: var(--cyan-dark);
}

.agent-step-active .agent-step-marker {
  border-color: #BDE2E9;
  background: var(--cyan-soft);
  color: var(--cyan-dark);
}

.agent-step-complete {
  color: #62666C;
}

.agent-step-complete .agent-step-marker {
  border-color: var(--cyan);
  background: var(--cyan);
  color: white;
}

@keyframes agentPulse {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: .38;
  }
}

@media (max-width: 700px) {
  .agent-steps {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 500px) {
  .agent-found {
    display: none;
  }
}
`;

export default AgentStatusWidget;