import React, { useEffect, useRef } from 'react';
import { AlertTriangle, Trash2, Info, CheckCircle, X } from 'lucide-react';

export default function ConfirmationModal({
  isOpen,
  title,
  message,
  subtext,
  itemBadge,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger', // 'danger' | 'warning' | 'info' | 'success'
  isAlertOnly = false,
  onConfirm,
  onCancel,
}) {
  const confirmBtnRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      // Focus confirm button when modal opens
      const timer = setTimeout(() => {
        confirmBtnRef.current?.focus();
      }, 50);

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onCancel();
        } else if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          onConfirm();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onConfirm, onCancel]);

  if (!isOpen) return null;

  const typeConfig = {
    danger: {
      icon: Trash2,
      iconBg: 'bg-red-500/10 text-red-600 border border-red-500/20',
      badgeBg: 'bg-red-500/10 text-red-700 border-red-200 dark:border-red-900/30',
      confirmBtn: 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20 active:scale-95',
      glow: 'rgba(239, 68, 68, 0.15)',
    },
    warning: {
      icon: AlertTriangle,
      iconBg: 'bg-amber-500/10 text-amber-600 border border-amber-500/20',
      badgeBg: 'bg-amber-500/10 text-amber-700 border-amber-200 dark:border-amber-900/30',
      confirmBtn: 'bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-600/20 active:scale-95',
      glow: 'rgba(245, 158, 11, 0.15)',
    },
    info: {
      icon: Info,
      iconBg: 'bg-[#0A7E96]/10 text-[#0A7E96] border border-[#0A7E96]/20',
      badgeBg: 'bg-[#0A7E96]/10 text-[#0A7E96] border-[#0A7E96]/20',
      confirmBtn: 'bg-[#0A7E96] hover:bg-[#086a7f] text-white shadow-lg shadow-[#0A7E96]/20 active:scale-95',
      glow: 'rgba(10, 126, 150, 0.15)',
    },
    success: {
      icon: CheckCircle,
      iconBg: 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20',
      badgeBg: 'bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:border-emerald-900/30',
      confirmBtn: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 active:scale-95',
      glow: 'rgba(16, 185, 129, 0.15)',
    },
  };

  const currentType = typeConfig[type] || typeConfig.danger;
  const IconComponent = currentType.icon;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity animate-fadeIn"
        onClick={onCancel}
      />

      {/* Modal Dialog Card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden z-10 transition-all transform animate-scaleUp"
        style={{
          boxShadow: `0 20px 40px -15px ${currentType.glow}, 0 0 0 1px rgba(0,0,0,0.05)`,
        }}
      >
        {/* Top Decorative accent line */}
        <div
          className={`h-1.5 w-full ${
            type === 'danger'
              ? 'bg-gradient-to-r from-red-500 to-rose-600'
              : type === 'warning'
              ? 'bg-gradient-to-r from-amber-500 to-yellow-600'
              : type === 'success'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600'
              : 'bg-gradient-to-r from-[#0A7E96] to-cyan-600'
          }`}
        />

        <div className="p-6">
          {/* Close button */}
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close modal"
            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-start gap-4">
            {/* Icon Avatar */}
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${currentType.iconBg}`}
            >
              <IconComponent className="w-5 h-5" />
            </div>

            {/* Content */}
            <div className="flex-1 pr-2">
              <h3
                id="confirm-dialog-title"
                className="text-base font-bold text-slate-900 dark:text-white font-display leading-tight"
              >
                {title}
              </h3>

              {itemBadge && (
                <div className="mt-2 inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold max-w-full truncate border ${currentType.badgeBg}">
                  <span className="truncate">{itemBadge}</span>
                </div>
              )}

              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {message}
              </p>

              {subtext && (
                <p className="mt-2 text-xs text-slate-400 dark:text-slate-500 italic">
                  {subtext}
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/80">
            {!isAlertOnly && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all border border-slate-200 dark:border-slate-700"
              >
                {cancelText}
              </button>
            )}
            <button
              type="button"
              ref={confirmBtnRef}
              onClick={onConfirm}
              className={`px-5 py-2 text-sm font-semibold rounded-xl transition-all ${currentType.confirmBtn}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
