import React, { useEffect, useRef } from 'react';
import { Sparkles, Layers, RefreshCw, X, ArrowRight, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function SearchMergeModal({
  isOpen,
  jobTitle,
  existingCount = 0,
  mode = 'ai', // 'ai' or 'pool'
  onKeepAndMerge,
  onReplace,
  onCancel,
}) {
  const { t, lang } = useLanguage();
  const keepBtnRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        keepBtnRef.current?.focus();
      }, 60);

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onCancel?.();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const isFR = lang === 'FR';
  const sectionName = mode === 'pool' 
    ? (isFR ? 'Vivier Talent' : 'Talent Pool')
    : (isFR ? 'Sourcés IA' : 'AI Sourced');

  return (
    <div className="smm-overlay">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap');

        @keyframes smmFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes smmScaleUp { from { opacity: 0; transform: scale(0.96) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }

        .smm-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
          background: rgba(18, 21, 27, 0.55);
          backdrop-filter: blur(4px);
          animation: smmFadeIn 0.2s ease both;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
        }

        .smm-modal {
          position: relative;
          width: 100%;
          max-width: 520px;
          background: #FBFAF7;
          border: 1px solid #E4E1D9;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 25px 60px -15px rgba(18, 21, 27, 0.35), 0 0 0 1px rgba(18, 21, 27, 0.05);
          animation: smmScaleUp 0.25s cubic-bezier(0.22, 1, 0.36, 1) both;
          color: #12151B;
        }

        .smm-accent-bar {
          height: 4px;
          width: 100%;
          background: linear-gradient(90deg, #0BA5C9 0%, #10B981 50%, #6366F1 100%);
        }

        .smm-body {
          padding: 24px 26px 20px;
        }

        .smm-close-btn {
          position: absolute;
          top: 16px;
          right: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border: none;
          background: transparent;
          color: #9B9C9E;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease;
        }

        .smm-close-btn:hover {
          background: #EFECE6;
          color: #12151B;
        }

        .smm-header {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          margin-bottom: 20px;
        }

        .smm-header-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: #EAF9FC;
          color: #087F9B;
          border: 1px solid #C4E9F2;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .smm-header-text {
          flex: 1;
          min-width: 0;
          padding-right: 16px;
        }

        .smm-tags-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .smm-section-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          border-radius: 999px;
          background: #EAF9FC;
          color: #087F9B;
          border: 1px solid #C4E9F2;
          font-family: 'JetBrains Mono', monospace;
          font-size: 9.5px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .smm-job-title {
          font-size: 11px;
          font-weight: 600;
          color: #63666E;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 220px;
        }

        .smm-title {
          margin: 6px 0 0;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 18px;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: #12151B;
          line-height: 1.25;
        }

        .smm-desc {
          margin: 6px 0 0;
          font-size: 12px;
          color: #63666E;
          line-height: 1.5;
        }

        .smm-desc strong {
          color: #12151B;
          font-weight: 600;
        }

        .smm-options {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 16px;
        }

        .smm-option-card {
          width: 100%;
          text-align: left;
          padding: 14px 16px;
          border-radius: 14px;
          cursor: pointer;
          display: flex;
          align-items: flex-start;
          gap: 13px;
          transition: all 0.18s ease;
          position: relative;
          background: #FFFFFF;
          border: 1px solid #E4E1D9;
        }

        .smm-option-card.primary {
          border: 1.5px solid #A3E5CB;
          background: #FFFFFF;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.06);
        }

        .smm-option-card.primary:hover,
        .smm-option-card.primary:focus-visible {
          border-color: #10B981;
          background: #F4FBF8;
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(16, 185, 129, 0.12);
        }

        .smm-option-card.secondary:hover,
        .smm-option-card.secondary:focus-visible {
          border-color: #C9C5BA;
          background: #F7F5F0;
          transform: translateY(-1px);
        }

        .smm-option-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 1px;
        }

        .smm-option-icon.primary {
          background: #E8F8F2;
          color: #0B7A54;
          border: 1px solid #A3E5CB;
        }

        .smm-option-icon.secondary {
          background: #F1EFEA;
          color: #63666E;
          border: 1px solid #DDD8CD;
        }

        .smm-option-info {
          flex: 1;
          min-width: 0;
        }

        .smm-option-headline {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .smm-option-title {
          font-size: 13px;
          font-weight: 700;
          color: #12151B;
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .smm-option-badge {
          font-family: 'JetBrains Mono', monospace;
          font-size: 8.5px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          padding: 2px 6px;
          border-radius: 5px;
          background: #E8F8F2;
          color: #0B7A54;
          border: 1px solid #A3E5CB;
        }

        .smm-option-desc {
          margin: 4px 0 0;
          font-size: 11px;
          color: #63666E;
          line-height: 1.45;
        }

        .smm-arrow-icon {
          color: #0B7A54;
          opacity: 0;
          transform: translateX(-4px);
          transition: all 0.15s ease;
        }

        .smm-option-card.primary:hover .smm-arrow-icon {
          opacity: 1;
          transform: translateX(0);
        }

        .smm-footer {
          margin-top: 18px;
          padding-top: 14px;
          border-top: 1px solid #EAE7E0;
          display: flex;
          justify-content: flex-end;
          align-items: center;
        }

        .smm-cancel-btn {
          padding: 7px 14px;
          border: 1px solid #E4E1D9;
          border-radius: 9px;
          background: #FFFFFF;
          color: #63666E;
          font-size: 11.5px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .smm-cancel-btn:hover {
          background: #F1EFEA;
          color: #12151B;
          border-color: #D3CFC3;
        }
      `}</style>

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="merge-dialog-title"
        className="smm-modal"
      >
        <div className="smm-accent-bar" />

        <div className="smm-body">
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="smm-close-btn"
          >
            <X size={15} />
          </button>

          <div className="smm-header">
            <div className="smm-header-icon">
              <Layers size={20} />
            </div>

            <div className="smm-header-text">
              <div className="smm-tags-row">
                <span className="smm-section-pill">
                  <ShieldCheck size={11} />
                  {sectionName}
                </span>
                {jobTitle && (
                  <span className="smm-job-title" title={jobTitle}>
                    {jobTitle}
                  </span>
                )}
              </div>

              <h3 id="merge-dialog-title" className="smm-title">
                {t?.searchConflictTitle || (isFR ? 'Profils Précédents Détectés' : 'Previous Candidates Found')}
              </h3>

              <p className="smm-desc">
                {isFR
                  ? <>Vous avez déjà <strong>{existingCount} profil(s)</strong> dans cette section. Que souhaitez-vous faire des profils précédents ?</>
                  : <>You already have <strong>{existingCount} candidate profile(s)</strong> for this section. How would you like to handle them with the new search?</>}
              </p>
            </div>
          </div>

          <div className="smm-options">
            {/* Option 1: Keep & Merge (Recommended) */}
            <button
              ref={keepBtnRef}
              type="button"
              onClick={onKeepAndMerge}
              className="smm-option-card primary"
            >
              <div className="smm-option-icon primary">
                <Sparkles size={17} />
              </div>

              <div className="smm-option-info">
                <div className="smm-option-headline">
                  <span className="smm-option-title">
                    {t?.keepAndMerge || (isFR ? 'Conserver et Fusionner' : 'Keep & Merge')}
                    <span className="smm-option-badge">
                      {isFR ? 'Recommandé' : 'Recommended'}
                    </span>
                  </span>
                  <ArrowRight size={14} className="smm-arrow-icon" />
                </div>
                <p className="smm-option-desc">
                  {t?.keepAndMergeDesc || (isFR
                    ? 'Garde tous les anciens profils sans perte et ajoute les nouveaux (marqués avec un badge NOUVEAU).'
                    : 'Retains all previous candidates without loss and appends new results (tagged with a NEW badge).')}
                </p>
              </div>
            </button>

            {/* Option 2: Replace */}
            <button
              type="button"
              onClick={onReplace}
              className="smm-option-card secondary"
            >
              <div className="smm-option-icon secondary">
                <RefreshCw size={16} />
              </div>

              <div className="smm-option-info">
                <div className="smm-option-headline">
                  <span className="smm-option-title">
                    {t?.replaceResults || (isFR ? 'Remplacer les Profils' : 'Replace Results')}
                  </span>
                </div>
                <p className="smm-option-desc">
                  {t?.replaceResultsDesc || (isFR
                    ? 'Efface les profils précédents pour ce poste et affiche uniquement les nouveaux résultats.'
                    : 'Clears previous candidates and displays only the fresh search results.')}
                </p>
              </div>
            </button>
          </div>

          <div className="smm-footer">
            <button
              type="button"
              onClick={onCancel}
              className="smm-cancel-btn"
            >
              {isFR ? 'Annuler' : 'Cancel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
