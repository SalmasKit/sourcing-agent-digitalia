import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { X, ArrowRightLeft, CheckCircle2, Award, MapPin, Briefcase, Sparkles, Mail, Globe, ExternalLink } from 'lucide-react';

export const CandidateComparator = ({ isOpen, onClose, candidates = [], initialSelectedIds = [] }) => {
  const { lang } = useLanguage();
  const isFR = lang === 'FR';

  const [selectedIds, setSelectedIds] = useState(() => {
    if (initialSelectedIds && initialSelectedIds.length > 0) {
      return initialSelectedIds.slice(0, 3);
    }
    return candidates.slice(0, 2).map(c => c.id);
  });

  if (!isOpen) return null;

  const selectedCandidates = candidates.filter(c => selectedIds.includes(c.id));

  const toggleSelect = (candId) => {
    if (selectedIds.includes(candId)) {
      if (selectedIds.length > 1) {
        setSelectedIds(selectedIds.filter(id => id !== candId));
      }
    } else {
      if (selectedIds.length < 3) {
        setSelectedIds([...selectedIds, candId]);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-5xl w-full overflow-hidden animate-fadeIn flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-sky-100 text-sky-700 rounded-xl">
              <ArrowRightLeft className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm font-jakarta">
                {isFR ? 'Comparateur Côte à Côte de Candidats' : 'Side-by-Side Candidate Comparator'}
              </h3>
              <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                {isFR ? 'Comparez 2 à 3 candidats sur leurs compétences, expérience et score IA' : 'Compare 2 to 3 candidates on skills, experience and AI score'}
              </p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer">
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Candidate Selector Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-4 flex-wrap">
          <span className="text-xs font-bold text-slate-600">
            {isFR ? 'Sélectionner des candidats à comparer (max 3) :' : 'Select candidates to compare (max 3):'}
          </span>
          <div className="flex flex-wrap gap-2">
            {candidates.map(c => {
              const isSelected = selectedIds.includes(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => toggleSelect(c.id)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {c.fullName}
                </button>
              );
            })}
          </div>
        </div>

        {/* Comparison Matrix Table */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className={`grid gap-6 ${selectedCandidates.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {selectedCandidates.map((candidate) => (
              <div key={candidate.id} className="bg-slate-50/70 rounded-2xl border border-slate-200/80 p-5 space-y-5">
                
                {/* Header card info */}
                <div className="text-center space-y-2 pb-4 border-b border-slate-200/60">
                  <img
                    src={candidate.avatarUrl}
                    alt={candidate.fullName}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-xs mx-auto"
                  />
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm font-jakarta">{candidate.fullName}</h4>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5 line-clamp-1">{candidate.headline}</p>
                  </div>
                  <div className="inline-flex items-center gap-1 text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{candidate.matchScore}% Match</span>
                  </div>
                </div>

                {/* Experience & Location */}
                <div className="space-y-2 text-xs">
                  <div className="font-bold text-slate-400 uppercase text-[10px] tracking-wider">
                    {isFR ? 'Expérience & Lieu' : 'Experience & Location'}
                  </div>
                  <div className="flex flex-col gap-1.5 bg-white p-3 rounded-xl border border-slate-200/60">
                    <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                      <Briefcase className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                      {candidate.experienceYears} {isFR ? 'ans d\'expérience' : 'years experience'}
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                      <MapPin className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                      {candidate.location}
                    </span>
                  </div>
                </div>

                {/* Salary & Availability */}
                <div className="space-y-2 text-xs">
                  <div className="font-bold text-slate-400 uppercase text-[10px] tracking-wider">
                    {isFR ? 'Prétentions & Dispo' : 'Expectations & Availability'}
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200/60 space-y-1 text-slate-700 font-semibold">
                    <div>{candidate.salaryExpectation || 'N/A'}</div>
                    <div className="text-slate-400 text-[11px]">{candidate.availability || 'Immediate'}</div>
                  </div>
                </div>

                {/* Technical Skills */}
                <div className="space-y-2 text-xs">
                  <div className="font-bold text-slate-400 uppercase text-[10px] tracking-wider">
                    {isFR ? 'Compétences Clés' : 'Key Tech Skills'}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {candidate.skills.map((skill, idx) => (
                      <span key={idx} className="text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-100 px-2 py-0.5 rounded-md">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* AI Rationale */}
                <div className="space-y-2 text-xs">
                  <div className="font-bold text-slate-400 uppercase text-[10px] tracking-wider">
                    {isFR ? 'Justification IA' : 'AI Match Rationale'}
                  </div>
                  <ul className="bg-white p-3 rounded-xl border border-slate-200/60 space-y-1.5 text-[11px] text-slate-600">
                    {(candidate.verifiedMatchReasons || [candidate.summary]).slice(0, 3).map((r, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0 mt-1" />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Contact links */}
                <div className="pt-2 flex items-center justify-center space-x-3 text-slate-400">
                  {candidate.email && (
                    <a href={`mailto:${candidate.email}`} className="hover:text-sky-600" title={candidate.email}>
                      <Mail className="w-4 h-4" />
                    </a>
                  )}
                  {candidate.linkedin && (
                    <a href={`https://${candidate.linkedin}`} target="_blank" rel="noreferrer" className="hover:text-sky-600" title="LinkedIn Profile">
                      <Globe className="w-4 h-4" />
                    </a>
                  )}
                  {candidate.github && (
                    <a href={`https://${candidate.github}`} target="_blank" rel="noreferrer" className="hover:text-sky-600" title="GitHub Profile">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>

              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
