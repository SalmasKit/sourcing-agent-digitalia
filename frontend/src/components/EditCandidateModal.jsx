import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { X, Save, PlusCircle } from 'lucide-react';

export const EditCandidateModal = ({ isOpen, onClose, onSave, candidate = null }) => {
  const { t } = useLanguage();

  const [fullName, setFullName] = useState('');
  const [headline, setHeadline] = useState('');
  const [location, setLocation] = useState('');
  const [experienceYears, setExperienceYears] = useState(5);
  const [matchScore, setMatchScore] = useState(85);
  const [summary, setSummary] = useState('');
  const [skills, setSkills] = useState('');
  const [salaryExpectation, setSalaryExpectation] = useState('');
  const [availability, setAvailability] = useState('');
  const [verifiedMatchReasons, setVerifiedMatchReasons] = useState('');
  const [education, setEducation] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (candidate) {
      setFullName(candidate.fullName || '');
      setHeadline(candidate.headline || '');
      setLocation(candidate.location || '');
      setExperienceYears(candidate.experienceYears || 0);
      setMatchScore(candidate.matchScore || 80);
      setSummary(candidate.summary || '');
      setSkills(candidate.skills ? candidate.skills.join(', ') : '');
      setSalaryExpectation(candidate.salaryExpectation || '');
      setAvailability(candidate.availability || '');
      setVerifiedMatchReasons(candidate.verifiedMatchReasons ? candidate.verifiedMatchReasons.join('\n') : '');
      setEducation(candidate.education || '');
      setEmail(candidate.email || '');
    } else {
      setFullName('');
      setHeadline('');
      setLocation('Paris, France (Hybrid)');
      setExperienceYears(5);
      setMatchScore(90);
      setSummary('');
      setSkills('Java, Spring Boot, React, Docker');
      setSalaryExpectation('€70,000 / year');
      setAvailability('Immediate');
      setVerifiedMatchReasons('Solid match with core tech stack\nProven background in cloud architecture');
      setEducation('B.Sc. Computer Science');
      setEmail('candidate@example.com');
    }
  }, [candidate, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const updatedCandidate = {
      id: candidate ? candidate.id : `cand-${Date.now()}`,
      fullName,
      headline,
      location,
      experienceYears: Number(experienceYears),
      matchScore: Number(matchScore),
      summary,
      skills: skills.split(',').map(s => s.trim()).filter(Boolean),
      salaryExpectation,
      availability,
      verifiedMatchReasons: verifiedMatchReasons.split('\n').map(r => r.trim()).filter(Boolean),
      education,
      email,
      avatarUrl: candidate?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&q=80',
      shortlisted: candidate?.shortlisted || false
    };
    onSave(updatedCandidate);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden animate-fadeIn">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-extrabold text-slate-900 text-sm font-jakarta flex items-center gap-2">
            <PlusCircle className="w-4.5 h-4.5 text-brand-primary" />
            <span>{candidate ? t('editCandidate') : t('createProfile')}</span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-655 p-1 rounded-lg">
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-semibold outline-none focus:border-brand-primary"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-semibold outline-none focus:border-brand-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Job Headline</label>
            <input
              type="text"
              required
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="e.g. Senior Software Architect"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-semibold outline-none focus:border-brand-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-semibold outline-none focus:border-brand-primary"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Education</label>
              <input
                type="text"
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-semibold outline-none focus:border-brand-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Exp. Years</label>
              <input
                type="number"
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-semibold outline-none focus:border-brand-primary"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Match Score %</label>
              <input
                type="number"
                min="0"
                max="100"
                value={matchScore}
                onChange={(e) => setMatchScore(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-semibold outline-none focus:border-brand-primary"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Salary Expectation</label>
              <input
                type="text"
                value={salaryExpectation}
                onChange={(e) => setSalaryExpectation(e.target.value)}
                placeholder="e.g. €75k/year"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-semibold outline-none focus:border-brand-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Availability</label>
            <input
              type="text"
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
              placeholder="e.g. Immediate / 1 month"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-semibold outline-none focus:border-brand-primary"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Technical Skills (Comma-Separated)</label>
            <input
              type="text"
              required
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="Java, Spring Boot, Docker, React"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-semibold outline-none focus:border-brand-primary"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Professional Summary</label>
            <textarea
              rows="3"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-semibold outline-none focus:border-brand-primary resize-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">AI Match Justifications (One Per Line)</label>
            <textarea
              rows="3"
              value={verifiedMatchReasons}
              onChange={(e) => setVerifiedMatchReasons(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-semibold outline-none focus:border-brand-primary resize-none"
            />
          </div>

          {/* Action Button */}
          <button
            type="submit"
            className="w-full bg-brand-primary hover:bg-brand-deep-blue text-white font-bold py-3 rounded-xl text-xs shadow-sm transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{t('saveCandidate')}</span>
          </button>

        </form>

      </div>
    </div>
  );
};
