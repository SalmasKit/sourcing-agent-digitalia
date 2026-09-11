import React, { useState } from 'react';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, X, ShieldCheck, KeyRound } from 'lucide-react';
import { changePasswordApi } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

export function ChangePasswordModal({ isOpen, onClose, onSuccess = () => {} }) {
  const { lang } = useLanguage();
  const isFR = lang === 'FR';

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent]         = useState(false);
  const [showNew, setShowNew]                 = useState(false);
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState('');
  const [success, setSuccess]                 = useState(false);

  if (!isOpen) return null;

  const calculateStrength = (pwd) => {
    let score = 0;
    if (pwd.length >= 8) score += 25;
    if (/[A-Z]/.test(pwd)) score += 25;
    if (/[0-9]/.test(pwd)) score += 25;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 25;
    return score;
  };

  const strength = calculateStrength(newPassword);

  const getStrengthLabel = () => {
    if (strength <= 25) return { label: isFR ? 'Faible' : 'Weak', color: '#EF4444' };
    if (strength <= 50) return { label: isFR ? 'Moyen' : 'Moderate', color: '#F59E0B' };
    if (strength <= 75) return { label: isFR ? 'Bon' : 'Strong', color: '#10B981' };
    return { label: isFR ? 'Très robuste' : 'Very strong', color: '#0A7E96' };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError(isFR ? 'Le nouveau mot de passe doit comporter au moins 8 caractères.' : 'New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(isFR ? 'Les mots de passe ne correspondent pas.' : 'Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      await changePasswordApi(currentPassword, newPassword);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        onSuccess(isFR ? 'Mot de passe mis à jour avec succès.' : 'Password updated successfully.');
        onClose();
      }, 1500);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || (isFR ? 'Échec de la modification du mot de passe.' : 'Failed to change password.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const strInfo = getStrengthLabel();

  return (
    <div className="cpm-overlay" onClick={onClose}>
      <style>{`
        .cpm-overlay {
          position: fixed; inset: 0; background: rgba(18,21,27,0.65);
          backdrop-filter: blur(8px); display: flex; align-items: center;
          justify-content: center; z-index: 100; padding: 20px;
          animation: cpmFadeIn .2s ease;
        }
        @keyframes cpmFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes cpmSlideUp { from { transform: translateY(12px) scale(0.98); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
        
        .cpm-card {
          width: 100%; max-width: 440px; background: #FFFFFF;
          border-radius: 20px; border: 1px solid #E4E1D9;
          box-shadow: 0 24px 48px -12px rgba(18,21,27,0.22);
          overflow: hidden; animation: cpmSlideUp .25s cubic-bezier(0.16, 1, 0.3, 1);
          font-family: 'Inter', system-ui, sans-serif;
        }
        .cpm-head {
          padding: 24px 28px 18px; border-bottom: 1px solid #F0EFEA;
          display: flex; align-items: center; justify-content: space-between;
          background: #FBFAF7;
        }
        .cpm-title-box { display: flex; align-items: center; gap: 12px; }
        .cpm-icon {
          width: 36px; height: 36px; border-radius: 10px;
          background: #E9F7FA; color: #0A7E96; display: flex;
          align-items: center; justify-content: center;
        }
        .cpm-title {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 16px; font-weight: 700; color: #12151B;
        }
        .cpm-subtitle { font-size: 11.5px; color: #717680; margin-top: 1px; }
        .cpm-close {
          background: none; border: none; color: #9B9C9E; cursor: pointer;
          padding: 4px; border-radius: 8px; transition: all .15s;
        }
        .cpm-close:hover { background: #EFECE6; color: #12151B; }
        
        .cpm-body { padding: 24px 28px 28px; }
        .cpm-field { margin-bottom: 16px; }
        .cpm-label {
          display: block; font-size: 12px; font-weight: 600; color: #3A3D44; margin-bottom: 6px;
        }
        .cpm-input-wrap {
          position: relative; display: flex; align-items: center;
        }
        .cpm-input-icon {
          position: absolute; left: 12px; color: #9B9C9E; pointer-events: none;
        }
        .cpm-input {
          width: 100%; height: 42px; padding: 0 40px 0 38px;
          border: 1px solid #E4E1D9; border-radius: 10px;
          font-size: 13.5px; color: #12151B; background: #fff;
          transition: border-color .15s, box-shadow .15s;
        }
        .cpm-input:focus {
          outline: none; border-color: #0A7E96;
          box-shadow: 0 0 0 3px rgba(10,126,150,0.12);
        }
        .cpm-eye-btn {
          position: absolute; right: 10px; background: none; border: none;
          color: #9B9C9E; cursor: pointer; padding: 4px;
        }
        .cpm-eye-btn:hover { color: #12151B; }

        .cpm-strength-bar {
          height: 4px; border-radius: 2px; background: #EFECE6;
          margin-top: 6px; overflow: hidden;
        }
        .cpm-strength-fill {
          height: 100%; transition: width .25s ease, background-color .25s ease;
        }
        .cpm-strength-text {
          font-size: 11px; margin-top: 4px; display: flex;
          justify-content: space-between; font-weight: 500;
        }
        
        .cpm-error {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 14px; background: #FEF2F2; border: 1px solid #FCA5A5;
          border-radius: 10px; color: #991B1B; font-size: 12px; margin-bottom: 16px;
        }
        .cpm-success {
          display: flex; align-items: center; gap: 8px;
          padding: 12px 14px; background: #ECFDF5; border: 1px solid #6EE7B7;
          border-radius: 10px; color: #065F46; font-size: 13px; font-weight: 600;
          margin-bottom: 16px;
        }

        .cpm-actions {
          display: flex; gap: 10px; justify-content: flex-end; margin-top: 22px;
        }
        .cpm-btn-secondary {
          padding: 9px 18px; border: 1px solid #E4E1D9; border-radius: 10px;
          background: #fff; color: #3A3D44; font-size: 12.5px; font-weight: 600;
          cursor: pointer; transition: background .15s;
        }
        .cpm-btn-secondary:hover { background: #F6F5F1; }
        .cpm-btn-primary {
          padding: 9px 22px; border: none; border-radius: 10px;
          background: #12151B; color: #fff; font-size: 12.5px; font-weight: 600;
          cursor: pointer; display: flex; align-items: center; gap: 6px;
          transition: background .15s, transform .15s;
        }
        .cpm-btn-primary:hover:not(:disabled) { background: #2A2E37; transform: translateY(-1px); }
        .cpm-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>

      <div className="cpm-card" onClick={e => e.stopPropagation()}>
        <div className="cpm-head">
          <div className="cpm-title-box">
            <div className="cpm-icon"><KeyRound size={18} /></div>
            <div>
              <div className="cpm-title">{isFR ? 'Changer de mot de passe' : 'Change Password'}</div>
              <div className="cpm-subtitle">{isFR ? 'Sécurisez l’accès à votre compte' : 'Keep your workspace account secure'}</div>
            </div>
          </div>
          <button className="cpm-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="cpm-body">
          {success && (
            <div className="cpm-success">
              <CheckCircle2 size={16} />
              <span>{isFR ? 'Mot de passe mis à jour avec succès !' : 'Password updated successfully!'}</span>
            </div>
          )}

          {error && (
            <div className="cpm-error">
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="cpm-field">
              <label className="cpm-label">{isFR ? 'Mot de passe actuel' : 'Current password'}</label>
              <div className="cpm-input-wrap">
                <Lock size={15} className="cpm-input-icon" />
                <input
                  type={showCurrent ? 'text' : 'password'}
                  className="cpm-input"
                  required
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button type="button" className="cpm-eye-btn" onClick={() => setShowCurrent(!showCurrent)}>
                  {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="cpm-field">
              <label className="cpm-label">{isFR ? 'Nouveau mot de passe' : 'New password'}</label>
              <div className="cpm-input-wrap">
                <ShieldCheck size={15} className="cpm-input-icon" />
                <input
                  type={showNew ? 'text' : 'password'}
                  className="cpm-input"
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder={isFR ? 'Min. 8 caractères' : 'Min. 8 characters'}
                />
                <button type="button" className="cpm-eye-btn" onClick={() => setShowNew(!showNew)}>
                  {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {newPassword.length > 0 && (
                <>
                  <div className="cpm-strength-bar">
                    <div
                      className="cpm-strength-fill"
                      style={{ width: `${strength}%`, backgroundColor: strInfo.color }}
                    />
                  </div>
                  <div className="cpm-strength-text">
                    <span style={{ color: '#717680' }}>{isFR ? 'Force :' : 'Strength:'}</span>
                    <span style={{ color: strInfo.color, fontWeight: 700 }}>{strInfo.label}</span>
                  </div>
                </>
              )}
            </div>

            <div className="cpm-field">
              <label className="cpm-label">{isFR ? 'Confirmer le nouveau mot de passe' : 'Confirm new password'}</label>
              <div className="cpm-input-wrap">
                <Lock size={15} className="cpm-input-icon" />
                <input
                  type="password"
                  className="cpm-input"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="cpm-actions">
              <button type="button" className="cpm-btn-secondary" onClick={onClose} disabled={loading}>
                {isFR ? 'Annuler' : 'Cancel'}
              </button>
              <button type="submit" className="cpm-btn-primary" disabled={loading || !currentPassword || !newPassword}>
                {loading ? (isFR ? 'Mise à jour...' : 'Updating...') : (isFR ? 'Enregistrer' : 'Save changes')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ChangePasswordModal;
