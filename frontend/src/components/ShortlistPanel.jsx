import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { FileText, Download, Trash2, Eye, MapPin, Plus, BookmarkCheck, BookmarkX } from 'lucide-react';

export const ShortlistPanel = ({
  jobDescriptions = [],
  candidates = [],
  savedRoleCandidates = {},
  onViewDetails,
  onToggleSaveCandidateForJob,
  onDeleteJob,
  onOpenJobModal
}) => {
  const { t, lang } = useLanguage();

  const handleExportRoleCSV = (job, roleSavedCandidates) => {
    if (roleSavedCandidates.length === 0) return;

    const headers = ['Full Name', 'Headline', 'Match Score', 'Location', 'Experience', 'Email', 'Skills'];
    const rows = roleSavedCandidates.map(c => [
      `"${c.fullName}"`,
      `"${c.headline}"`,
      `${c.matchScore}%`,
      `"${c.location}"`,
      `"${c.experienceYears} Years"`,
      `"${c.email}"`,
      `"${c.skills.join(', ')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${job.title.toLowerCase().replace(/\s+/g, '_')}_saved_candidates_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-jakarta flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-primary" />
            <span>{t('shortlists')}</span>
          </h2>
          <p className="text-xs text-slate-400 font-semibold mt-1">
            {lang === 'FR' 
              ? 'Consultez vos fiches de poste et les candidats spécifiques que vous y avez enregistrés.' 
              : 'Review your job descriptions and the specific candidates you saved for each role.'}
          </p>
        </div>

        <button
          onClick={onOpenJobModal}
          className="flex items-center space-x-1.5 bg-brand-primary hover:bg-brand-deep-blue text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{t('newJobDesc')}</span>
        </button>
      </div>

      {/* Projects List */}
      {jobDescriptions.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-700 font-jakarta">{t('noJobDescriptions')}</h3>
          <p className="text-xs text-slate-450 mt-1 max-w-sm mx-auto">
            {lang === 'FR' ? 'Créez une première fiche de poste pour enregistrer et organiser des candidats par métier.' : 'Create your first job description to save and organize candidates per role.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {jobDescriptions.map((job) => {
            const savedIds = savedRoleCandidates[job.id] || [];
            const roleSavedCandidates = candidates.filter(c => savedIds.includes(c.id));

            return (
              <div key={job.id} className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
                
                {/* Role Info & Actions */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-extrabold text-slate-900 font-jakarta">{job.title}</h3>
                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                        roleSavedCandidates.length > 0
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>
                        {roleSavedCandidates.length} {lang === 'FR' ? 'Enregistrés' : 'Saved'}
                      </span>
                    </div>
                    
                    <p className="text-xs text-slate-500 line-clamp-2 max-w-2xl mt-1">
                      {job.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-medium mt-3">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-brand-primary" />
                        {job.location || 'All Locations'}
                      </span>
                      {job.skills && job.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {job.skills.map((s, idx) => (
                            <span key={idx} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={() => handleExportRoleCSV(job, roleSavedCandidates)}
                      disabled={roleSavedCandidates.length === 0}
                      className="flex items-center space-x-1.5 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 cursor-pointer"
                      title="Export Saved Role CSV"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-500" />
                      <span className="hidden sm:inline">CSV</span>
                    </button>

                    <button
                      onClick={(e) => onDeleteJob(e, job.id)}
                      className="p-2 bg-slate-50 hover:bg-rose-50 rounded-xl text-slate-400 hover:text-rose-600 border border-slate-200 cursor-pointer"
                      title="Delete Job Description"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Candidate Cards Grid for this Job */}
                <div className="pt-4">
                  {roleSavedCandidates.length === 0 ? (
                    <div className="text-xs text-slate-400 italic py-3 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                      {lang === 'FR' 
                        ? 'Aucun candidat enregistré pour ce poste. Naviguez dans l\'Espace Sourcing et cliquez sur "Enregistrer au poste".' 
                        : 'No candidates saved for this role yet. Browse profiles in the Sourcing Hub and click "Save to Role".'}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {roleSavedCandidates.map((candidate) => (
                        <div
                          key={candidate.id}
                          className="bg-slate-50/70 hover:bg-slate-50 p-4 rounded-xl border border-slate-200/60 flex items-start justify-between gap-3 transition-all"
                        >
                          <div className="flex items-center space-x-3 min-w-0">
                            <img
                              src={candidate.avatarUrl}
                              alt={candidate.fullName}
                              className="w-10 h-10 rounded-xl object-cover border border-slate-200"
                            />
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-slate-900 truncate">{candidate.fullName}</h4>
                              <p className="text-[10px] text-slate-400 truncate">{candidate.headline}</p>
                              <div className="text-[10px] font-extrabold text-emerald-600 mt-0.5">
                                {candidate.matchScore}% Match
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1 shrink-0">
                            <button
                              onClick={() => onViewDetails(candidate)}
                              className="p-1.5 bg-white hover:bg-indigo-50 text-brand-primary border border-slate-200 rounded-lg cursor-pointer"
                              title={t('viewProfile')}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onToggleSaveCandidateForJob(candidate.id, job.id)}
                              className="p-1.5 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 rounded-lg cursor-pointer"
                              title={lang === 'FR' ? 'Retirer de la fiche' : 'Unsave from role'}
                            >
                              <BookmarkX className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
