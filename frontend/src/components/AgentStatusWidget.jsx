import React, { useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Cpu, CheckCircle2, Loader2, Sparkles, Database, Award } from 'lucide-react';

export function AgentStatusWidget({ currentStep = 2, totalCandidatesFound = 0 }) {
  const { t } = useLanguage();
  const fontsLoaded = useRef(false);

  useEffect(() => {
    if (fontsLoaded.current) return;
    fontsLoaded.current = true;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap';
    document.head.appendChild(link);
  }, []);

  const steps = [
    { id: 1, label: t('step1Label'), desc: t('step1Desc'), icon: Sparkles },
    { id: 2, label: t('step2Label'), desc: t('step2Desc'), icon: Database },
    { id: 3, label: t('step3Label'), desc: t('step3Desc'), icon: Cpu },
    { id: 4, label: t('step4Label'), desc: t('step4Desc'), icon: Award },
  ];

  return (
    <div className="dg-root dgas-root">
      <style>{`
        .dg-root {
          --dg-paper: #F6F7F9; --dg-surface: #FFFFFF; --dg-sunken: #EFF1F4;
          --dg-border: #E3E6EB; --dg-border-strong: #CBD2DC;
          --dg-ink-900: #10151F; --dg-ink-700: #38414F; --dg-ink-500: #6B7280; --dg-ink-400: #96A0AC;
          --dg-teal-700: #0A5C68; --dg-teal-600: #0E7C8C; --dg-teal-100: #E1F2F3;
          --dg-green-700: #1F6E4A; --dg-green-600: #278F5E; --dg-green-100: #E3F5EC;
          --font-display: 'Space Grotesk', 'Inter', sans-serif;
          --font-body: 'Inter', system-ui, sans-serif;
          --font-mono: 'JetBrains Mono', ui-monospace, monospace;
          font-family: var(--font-body); color: var(--dg-ink-900);
        }
        .dg-display { font-family: var(--font-display); letter-spacing: -0.01em; }
        .dg-mono { font-family: var(--font-mono); }

        .dgas-root {
          background: var(--dg-surface); border: 1px solid var(--dg-border); border-radius: 18px;
          padding: 20px; margin-bottom: 24px; display: flex; flex-direction: column; gap: 16px;
        }

        .dgas-top { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
        .dgas-top-left { display: flex; align-items: center; gap: 12px; }
        .dgas-icon {
          width: 38px; height: 38px; border-radius: 11px; background: var(--dg-teal-100); color: var(--dg-teal-700);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .dgas-title { font-size: 15px; font-weight: 700; color: var(--dg-ink-900); display: flex; align-items: center; gap: 8px; }
        .dgas-active-pill {
          font-family: var(--font-mono); font-size: 9.5px; font-weight: 700; color: var(--dg-green-700);
          background: var(--dg-green-100); border: 1px solid rgba(31,110,74,0.25); padding: 2px 7px; border-radius: 6px;
        }
        .dgas-sub { font-size: 11.5px; color: var(--dg-ink-500); margin-top: 2px; }

        .dgas-count-box { text-align: right; }
        .dgas-count-label { font-size: 10px; font-weight: 700; color: var(--dg-ink-400); text-transform: uppercase; letter-spacing: 0.05em; }
        .dgas-count-val { font-size: 16px; font-weight: 700; color: var(--dg-teal-700); }

        .dgas-steps { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
        .dgas-step {
          background: var(--dg-paper); border: 1px solid var(--dg-border); border-radius: 12px;
          padding: 12px; display: flex; flex-direction: column; gap: 6px; transition: border-color .15s ease, background .15s ease;
        }
        .dgas-step-current { background: var(--dg-teal-100); border-color: rgba(14,124,140,0.3); }
        .dgas-step-done { background: var(--dg-surface); border-color: var(--dg-border); }

        .dgas-step-head { display: flex; align-items: center; justify-content: space-between; }
        .dgas-step-num { font-family: var(--font-mono); font-size: 9px; font-weight: 700; color: var(--dg-ink-400); }
        .dgas-step-title { font-size: 12px; font-weight: 700; color: var(--dg-ink-900); }
        .dgas-step-desc { font-size: 10.5px; color: var(--dg-ink-500); line-height: 1.3; }

        @media (max-width: 768px) {
          .dgas-steps { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>

      <div className="dgas-top">
        <div className="dgas-top-left">
          <div className="dgas-icon"><Cpu size={18} /></div>
          <div>
            <div className="dgas-title dg-display">
              <span>{t('pipelineTitle')}</span>
              <span className="dgas-active-pill">{t('activeProcess')}</span>
            </div>
            <div className="dgas-sub">{t('pipelineDesc')}</div>
          </div>
        </div>

        <div className="dgas-count-box">
          <div className="dgas-count-label">{t('totalEvaluated')}</div>
          <div className="dgas-count-val dg-display">{totalCandidatesFound} Candidates</div>
        </div>
      </div>

      <div className="dgas-steps">
        {steps.map((step) => {
          const IconComponent = step.icon;
          const isDone = step.id < currentStep;
          const isCurrent = step.id === currentStep;

          return (
            <div
              key={step.id}
              className={'dgas-step' + (isCurrent ? ' dgas-step-current' : isDone ? ' dgas-step-done' : '')}
            >
              <div className="dgas-step-head">
                <span className="dgas-step-num">STEP 0{step.id}</span>
                {isDone ? (
                  <CheckCircle2 size={14} color="var(--dg-green-600)" />
                ) : isCurrent ? (
                  <Loader2 size={14} color="var(--dg-teal-600)" style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <IconComponent size={14} color="var(--dg-ink-400)" />
                )}
              </div>

              <div className="dgas-step-title dg-display">{step.label}</div>
              <div className="dgas-step-desc">{step.desc}</div>
            </div>
          );
        })}
      </div>

    </div>
  );
}

export default AgentStatusWidget;

