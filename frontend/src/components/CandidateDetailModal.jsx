import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { getAvatarUrl } from '../utils/avatar';
import { X, MapPin, Briefcase, Mail, Globe, ExternalLink, GraduationCap, CheckCircle2, Bookmark, BookmarkCheck, Sparkles, Send, DollarSign, Calendar, Edit, Trash2 } from 'lucide-react';

export const CandidateDetailModal = ({ candidate, onClose, onToggleShortlist, isShortlisted, onEdit, onDelete, onAddNote }) => {
  const { t } = useLanguage();
  const [notes, setNotes] = useState('');

  if (!candidate) return null;

  const handleAddNote = (e) => {
    e.preventDefault();
    if (!notes.trim()) return;
    onAddNote(candidate.id, notes);
    setNotes('');
  };

  const handleEditClick = () => {
    onEdit(candidate);
    onClose();
  };

  const handleDeleteClick = () => {
    onDelete(candidate.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-6 bg-slate-900 text-white flex items-start justify-between relative">
          <div className="flex items-center space-x-4">
            <img
              src={getAvatarUrl(candidate.fullName, candidate.avatarUrl)}
              alt={candidate.fullName}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = getAvatarUrl(candidate.fullName, null);
              }}
              className="w-16 h-16 rounded-xl object-cover border-2 border-slate-700 shadow-md"
            />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-extrabold text-white font-jakarta">{candidate.fullName}</h2>
                <span className="bg-brand-primary text-white text-xs font-extrabold px-2.5 py-0.5 rounded-full">
                  {candidate.matchScore}% {t('matchScore')}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium">{candidate.headline}</p>
              <div className="flex items-center space-x-4 text-xs text-slate-400 mt-2">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-brand-soft-blue" />
                  {candidate.location}
                </span>
                <span className="flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5 text-brand-soft-blue" />
                  {candidate.experienceYears} {t('yearsExp')}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Scrollable Area */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-800">
          
          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200/80">
            <div className="flex items-center space-x-4 text-xs text-slate-600 font-medium">
              <span className="flex items-center gap-1">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <strong>{t('expectation')}</strong> {candidate.salaryExpectation || 'Negotiable'}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4 text-brand-primary" />
                <strong>{t('availability')}</strong> {candidate.availability || 'Immediate'}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              {/* HR Edit Button */}
              <button
                onClick={handleEditClick}
                className="flex items-center space-x-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-250 bg-white hover:bg-slate-100 text-slate-700 cursor-pointer"
                title={t('editCandidate')}
              >
                <Edit className="w-4 h-4 text-brand-primary" />
                <span className="hidden sm:inline">{t('editCandidate')}</span>
              </button>

              {/* HR Delete Button */}
              <button
                onClick={handleDeleteClick}
                className="flex items-center space-x-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-250 bg-white hover:bg-rose-50 text-rose-600 cursor-pointer"
                title={t('deleteCandidate')}
              >
                <Trash2 className="w-4 h-4 text-rose-500" />
                <span className="hidden sm:inline">{t('deleteCandidate')}</span>
              </button>

              {/* Shortlist Toggle */}
              <button
                onClick={() => onToggleShortlist(candidate)}
                className={`flex items-center space-x-1.5 text-xs font-semibold px-4 py-2 rounded-lg border transition-all cursor-pointer ${
                  isShortlisted
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-brand-primary text-white hover:bg-brand-deep-blue border-transparent shadow-xs'
                }`}
              >
                {isShortlisted ? (
                  <>
                    <BookmarkCheck className="w-4 h-4 text-emerald-600" />
                    <span>{t('inShortlist')}</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="w-4 h-4" />
                    <span>{t('addToShortlist')}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Candidate Summary */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-2 font-jakarta uppercase tracking-wider text-[11px] text-slate-500">
              {t('professionalOverview')}
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed bg-white p-4 rounded-xl border border-slate-200">
              {candidate.summary}
            </p>
          </div>

          {/* AI Match Rationale Report */}
          <div className="bg-brand-light-blue/20 p-4 rounded-xl border border-brand-mid-blue/10">
            <h3 className="text-sm font-bold text-slate-950 mb-3 font-jakarta flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-primary" />
              {t('aiEvaluation')}
            </h3>
            <ul className="space-y-2">
              {candidate.verifiedMatchReasons?.map((reason, idx) => (
                <li key={idx} className="flex items-start space-x-2 text-xs text-slate-900">
                  <CheckCircle2 className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Technical Skills Breakdown */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-3 font-jakarta uppercase tracking-wider text-[11px] text-slate-500">
              {t('verifiedSkills')}
            </h3>
            <div className="flex flex-wrap gap-2">
              {candidate.skills.map((skill, idx) => (
                <span
                  key={idx}
                  className="bg-slate-100 text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Education & Contacts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-slate-655" />
                {t('education')}
              </div>
              <div className="text-sm font-semibold text-slate-900">{candidate.education}</div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-xs font-bold text-slate-500 uppercase mb-2">{t('contacts')}</div>
              <div className="flex flex-col space-y-1.5 text-xs">
                <a href={`mailto:${candidate.email}`} className="text-brand-primary hover:underline flex items-center gap-1.5 font-medium">
                  <Mail className="w-3.5 h-3.5" />
                  {candidate.email}
                </a>
                {candidate.linkedin && (
                  <span className="text-slate-700 flex items-center gap-1.5 font-medium">
                    <Globe className="w-3.5 h-3.5 text-brand-primary" />
                    {candidate.linkedin}
                  </span>
                )}
                {candidate.github && (
                  <span className="text-slate-700 flex items-center gap-1.5 font-medium">
                    <ExternalLink className="w-3.5 h-3.5 text-slate-800" />
                    {candidate.github}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Recruiter Internal Notes */}
          <div className="pt-2 border-t border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 mb-3 font-jakarta">{t('recruiterNotes')}</h3>
            
            {candidate.notes && candidate.notes.length > 0 && (
              <div className="space-y-2 mb-3">
                {candidate.notes.map((note) => (
                  <div key={note.id} className="bg-amber-50/70 p-3 rounded-lg border border-amber-200 text-xs text-slate-800">
                    <div className="font-medium">{note.text}</div>
                    <div className="text-[10px] text-slate-400 mt-1">{note.time}</div>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleAddNote} className="flex gap-2">
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('addNotePlaceholder')}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg text-xs p-2.5 text-slate-900 outline-none focus:border-brand-primary"
              />
              <button
                type="submit"
                className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{t('saveNote')}</span>
              </button>
            </form>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
          >
            {t('closeProfile')}
          </button>
        </div>

      </div>
    </div>
  );
};
