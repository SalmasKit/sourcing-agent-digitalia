import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { MapPin, Briefcase, BookmarkCheck, ChevronRight, Edit2, Trash2, Bookmark } from 'lucide-react';

export const CandidateCard = ({
  candidate,
  onViewDetails,
  onToggleShortlist,
  isShortlisted,
  onEdit,
  onDelete,
  selectedJobId,
  isSavedForJob,
  onSaveForJob
}) => {
  const { t } = useLanguage();

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (score >= 80) return 'text-sky-700 bg-sky-50 border-sky-200';
    return 'text-amber-700 bg-amber-50 border-amber-200';
  };

  return (
    <div className="glass-card rounded-2xl p-5 flex flex-col justify-between relative group transition-all duration-300">
      
      {/* HR inline controls — appear on hover */}
      <div className="absolute right-4 top-4 flex items-center space-x-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
        <button
          onClick={() => onEdit(candidate)}
          className="p-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-sky-600 cursor-pointer"
          title={t('editCandidate')}
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDelete(candidate.id)}
          className="p-1.5 bg-slate-50 border border-slate-200 hover:bg-rose-50 rounded-lg text-slate-500 hover:text-rose-600 cursor-pointer"
          title={t('deleteCandidate')}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div>
        {/* Profile Info Header */}
        <div className="flex items-start justify-between gap-4 mb-3.5">
          <div className="flex items-center space-x-3.5 min-w-0">
            <img
              src={candidate.avatarUrl}
              alt={candidate.fullName}
              className="w-12 h-12 rounded-xl object-cover border border-slate-100 shadow-xs shrink-0"
            />
            <div className="min-w-0">
              <h3 className="font-extrabold text-slate-900 text-sm font-jakarta leading-snug truncate">
                {candidate.fullName}
              </h3>
              <p className="text-xs text-slate-500 font-semibold mt-0.5 truncate">{candidate.headline}</p>
            </div>
          </div>

          {/* AI Score Badge */}
          <div className={`px-2.5 py-1 rounded-lg border text-xs font-black shrink-0 ${getScoreColor(candidate.matchScore)}`}>
            {candidate.matchScore}%
          </div>
        </div>

        {/* Location & Experience Meta */}
        <div className="flex items-center space-x-3 text-xs text-slate-400 mb-3 font-semibold">
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-sky-500" />
            {candidate.location}
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Briefcase className="w-3.5 h-3.5 text-sky-500" />
            {candidate.experienceYears} {t('yearsExp')}
          </span>
        </div>

        {/* Short Summary */}
        <p className="text-xs text-slate-600 leading-relaxed mb-4 line-clamp-2">
          {candidate.summary}
        </p>

        {/* Skills Tags */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {candidate.skills.slice(0, 4).map((skill, idx) => (
            <span
              key={idx}
              className="text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-100 px-2 py-0.5 rounded-md"
            >
              {skill}
            </span>
          ))}
          {candidate.skills.length > 4 && (
            <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">
              +{candidate.skills.length - 4}
            </span>
          )}
        </div>
      </div>

      {/* Card Actions Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        {selectedJobId ? (
          <button
            onClick={() => onSaveForJob(candidate.id)}
            className={`flex items-center space-x-1.5 text-xs font-bold transition-all cursor-pointer ${
              isSavedForJob
                ? 'text-emerald-600 font-extrabold'
                : 'text-slate-400 hover:text-sky-600'
            }`}
          >
            {isSavedForJob ? (
              <>
                <BookmarkCheck className="w-3.5 h-3.5 text-emerald-500 fill-emerald-50" />
                <span>{t('shortlisted')}</span>
              </>
            ) : (
              <>
                <Bookmark className="w-3.5 h-3.5" />
                <span>{t('shortlist')}</span>
              </>
            )}
          </button>
        ) : (
          <span className="text-[10px] text-slate-400 font-semibold italic">
            Select a role to save
          </span>
        )}

        <button
          onClick={() => onViewDetails(candidate)}
          className="flex items-center space-x-0.5 text-xs font-bold text-sky-600 hover:text-sky-800 cursor-pointer transition-colors"
        >
          <span>{t('viewProfile')}</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

    </div>
  );
};
