import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Cpu, CheckCircle2, Loader2, Sparkles, Database, Award } from 'lucide-react';

export const AgentStatusWidget = ({ currentStep = 2, totalCandidatesFound = 4 }) => {
  const { t } = useLanguage();

  const steps = [
    { id: 1, label: t('step1Label'), desc: t('step1Desc'), icon: Sparkles },
    { id: 2, label: t('step2Label'), desc: t('step2Desc'), icon: Database },
    { id: 3, label: t('step3Label'), desc: t('step3Desc'), icon: Cpu },
    { id: 4, label: t('step4Label'), desc: t('step4Desc'), icon: Award },
  ];

  return (
    <div className="bg-white text-slate-800 rounded-2xl p-6 shadow-sm mb-8 border border-slate-200/80">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center space-x-3">
          <div className="bg-brand-light-blue/60 text-brand-primary p-2.5 rounded-xl border border-brand-mid-blue/30 flex items-center justify-center">
            <Cpu className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm font-jakarta flex items-center gap-2">
              {t('pipelineTitle')}
              <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded-md border border-emerald-200">
                {t('activeProcess')}
              </span>
            </h3>
            <p className="text-xs text-slate-400 font-semibold">{t('pipelineDesc')}</p>
          </div>
        </div>

        <div className="text-left sm:text-right">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('totalEvaluated')}</div>
          <div className="text-base font-black text-brand-primary font-jakarta">{totalCandidatesFound} Candidates</div>
        </div>
      </div>

      {/* Step Stepper */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {steps.map((step) => {
          const IconComponent = step.icon;
          const isDone = step.id < currentStep;
          const isCurrent = step.id === currentStep;

          return (
            <div
              key={step.id}
              className={`p-3.5 rounded-xl border transition-all ${
                isDone
                  ? 'bg-slate-50/50 border-emerald-100 text-slate-600'
                  : isCurrent
                  ? 'bg-brand-light-blue/40 border-brand-primary text-brand-primary shadow-xs ring-1 ring-brand-primary/20'
                  : 'bg-slate-50/30 border-slate-200/60 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-black tracking-wider uppercase text-slate-400">
                  STEP 0{step.id}
                </span>
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-50" />
                ) : isCurrent ? (
                  <Loader2 className="w-4 h-4 text-brand-primary animate-spin" />
                ) : (
                  <IconComponent className="w-4 h-4 text-slate-350" />
                )}
              </div>

              <div className="font-bold text-xs mb-1 text-slate-800">{step.label}</div>
              <div className="text-[10px] text-slate-450 font-medium leading-snug">{step.desc}</div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
