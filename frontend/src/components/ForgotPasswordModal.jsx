import React, { useState, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, X, KeyRound, ArrowRight, Send, Check } from 'lucide-react';
import { forgotPasswordApi, resetPasswordApi } from '../services/api';

export function ForgotPasswordModal({
  isOpen,
  onClose,
  onResetSuccess = () => {},
  lang = 'EN',
  initialToken = ''
}) {
  const isFR = lang === 'FR';

  const [step, setStep]                       = useState(initialToken ? 2 : 1);
  const [email, setEmail]                     = useState('');
  const [resetToken, setResetToken]           = useState(initialToken || '');
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword]       = useState(false);
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState('');
  const [successMsg, setSuccessMsg]           = useState('');
  const [emailSent, setEmailSent]             = useState(false);

  useEffect(() => {
    if (initialToken) {
      setResetToken(initialToken);
      setStep(2);
      setEmailSent(false);
      setError('');
      setSuccessMsg('');
    } else if (!isOpen) {
      setStep(1);
      setEmailSent(false);
      setEmail('');
      setResetToken('');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      setSuccessMsg('');
    }
  }, [initialToken, isOpen]);

  if (!isOpen) return null;

  const handleRequestToken = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await forgotPasswordApi(email.trim());
      setEmailSent(true);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || (isFR ? 'Une erreur est survenue lors de l\'envoi.' : 'An error occurred while sending the reset link.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError(isFR ? 'Le mot de passe doit comporter au moins 8 caractères.' : 'Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(isFR ? 'Les mots de passe ne correspondent pas.' : 'Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      await resetPasswordApi(resetToken, newPassword);
      setSuccessMsg(isFR ? 'Votre mot de passe a été réinitialisé avec succès !' : 'Your password has been reset successfully!');
      setTimeout(() => {
        onResetSuccess(email, newPassword);
        handleClose();
      }, 1500);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || (isFR ? 'Lien ou code de réinitialisation invalide ou expiré.' : 'Invalid or expired reset token.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setEmailSent(false);
    setEmail('');
    setResetToken('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccessMsg('');
    onClose();
  };

  return (
    <div
      className="fpm-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <style>{`
        .fpm-overlay {
          position: fixed; inset: 0; background: rgba(18,21,27,0.7);
          backdrop-filter: blur(8px); display: flex; align-items: center;
          justify-content: center; z-index: 2000; padding: 20px;
          animation: fpmFadeIn .2s ease;
        }
        @keyframes fpmFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fpmSlideUp { from { transform: translateY(12px) scale(0.98); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
        
        .fpm-card {
          width: 100%; max-width: 440px; background: #FFFFFF;
          border-radius: 20px; border: 1px solid #E4E1D9;
          box-shadow: 0 24px 48px -12px rgba(18,21,27,0.25);
          overflow: hidden; animation: fpmSlideUp .25s cubic-bezier(0.16, 1, 0.3, 1);
          font-family: 'Inter', system-ui, sans-serif;
        }
        .fpm-head {
          padding: 24px 28px 18px; border-bottom: 1px solid #F0EFEA;
          display: flex; align-items: center; justify-content: space-between;
          background: #FBFAF7;
        }
        .fpm-title-box { display: flex; align-items: center; gap: 12px; }
        .fpm-icon {
          width: 36px; height: 36px; border-radius: 10px;
          background: #FFF7ED; color: #EA580C; display: flex;
          align-items: center; justify-content: center;
        }
        .fpm-title {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 16px; font-weight: 700; color: #12151B;
        }
        .fpm-subtitle { font-size: 11.5px; color: #717680; margin-top: 1px; }
        .fpm-close {
          background: none; border: none; color: #9B9C9E; cursor: pointer;
          padding: 4px; border-radius: 8px; transition: all .15s;
        }
        .fpm-close:hover { background: #EFECE6; color: #12151B; }
        
        .fpm-body { padding: 24px 28px 28px; }
        .fpm-field { margin-bottom: 16px; }
        .fpm-label {
          display: block; font-size: 12px; font-weight: 600; color: #3A3D44; margin-bottom: 6px;
        }
        .fpm-input-wrap {
          position: relative; display: flex; align-items: center;
        }
        .fpm-input-icon {
          position: absolute; left: 12px; color: #9B9C9E; pointer-events: none;
        }
        .fpm-input {
          width: 100%; height: 42px; padding: 0 14px 0 38px;
          border: 1px solid #E4E1D9; border-radius: 10px;
          font-size: 13.5px; color: #12151B; background: #fff;
          transition: border-color .15s, box-shadow .15s;
        }
        .fpm-input:focus {
          outline: none; border-color: #EA580C;
          box-shadow: 0 0 0 3px rgba(234,88,12,0.12);
        }

        .fpm-error {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 14px; background: #FEF2F2; border: 1px solid #FCA5A5;
          border-radius: 10px; color: #991B1B; font-size: 12px; margin-bottom: 16px;
        }
        .fpm-success {
          display: flex; align-items: center; gap: 8px;
          padding: 12px 14px; background: #ECFDF5; border: 1px solid #6EE7B7;
          border-radius: 10px; color: #065F46; font-size: 13px; font-weight: 600;
          margin-bottom: 16px;
        }

        .fpm-actions {
          display: flex; gap: 10px; justify-content: flex-end; margin-top: 22px;
        }
        .fpm-btn-secondary {
          padding: 9px 18px; border: 1px solid #E4E1D9; border-radius: 10px;
          background: #fff; color: #3A3D44; font-size: 12.5px; font-weight: 600;
          cursor: pointer; transition: background .15s;
        }
        .fpm-btn-secondary:hover { background: #F6F5F1; }
        .fpm-btn-primary {
          padding: 9px 22px; border: none; border-radius: 10px;
          background: #12151B; color: #fff; font-size: 12.5px; font-weight: 600;
          cursor: pointer; display: flex; align-items: center; gap: 6px;
          transition: background .15s, transform .15s;
        }
        .fpm-btn-primary:hover:not(:disabled) { background: #2A2E37; transform: translateY(-1px); }
        .fpm-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>

      <div className="fpm-card" role="dialog" aria-modal="true">
        <div className="fpm-head">
          <div className="fpm-title-box">
            <div className="fpm-icon"><KeyRound size={18} /></div>
            <div>
              <div className="fpm-title">{isFR ? 'Mot de passe oublié' : 'Reset Password'}</div>
              <div className="fpm-subtitle">
                {step === 1 
                  ? (isFR ? 'Recevez un lien de réinitialisation sécurisé' : 'Receive a secure reset link by email')
                  : (isFR ? 'Définissez votre nouveau mot de passe' : 'Set your new password')}
              </div>
            </div>
          </div>
          <button className="fpm-close" onClick={handleClose}><X size={18} /></button>
        </div>

        <div className="fpm-body">
          {successMsg && (
            <div className="fpm-success">
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span>{successMsg}</span>
            </div>
          )}

          {error && (
            <div className="fpm-error">
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {step === 1 ? (
            emailSent ? (
              <div style={{ textAlign: 'center', padding: '12px 4px 6px' }}>
                <div style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: '#ECFDF5',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px'
                }}>
                  <Mail size={24} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#12151B', marginBottom: 8 }}>
                  {isFR ? 'Consultez votre boîte mail' : 'Check your email'}
                </h3>
                <p style={{ fontSize: 13, color: '#4B5563', lineHeight: 1.5, marginBottom: 16 }}>
                  {isFR ? (
                    <>
                      Un lien de réinitialisation sécurisé a été envoyé à <strong>{email}</strong>.
                      <br /><br />
                      Veuillez cliquer sur le lien reçu dans l'email pour réinitialiser votre mot de passe.
                    </>
                  ) : (
                    <>
                      A secure reset link has been sent to <strong>{email}</strong>.
                      <br /><br />
                      Please click the link inside that email to set your new password.
                    </>
                  )}
                </p>
                <div style={{
                  background: '#F9FAFB',
                  border: '1px solid #E5E7EB',
                  borderRadius: 10,
                  padding: '10px 14px',
                  fontSize: 12,
                  color: '#6B7280',
                  marginBottom: 20,
                  textAlign: 'left'
                }}>
                  💡 {isFR 
                    ? 'Pensez à vérifier votre dossier spams / courriers indésirables si vous ne le recevez pas rapidement.'
                    : 'Be sure to check your spam/junk folder if you don\'t see the email within a couple of minutes.'}
                </div>
                <button
                  type="button"
                  className="fpm-btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={handleClose}
                >
                  {isFR ? 'Compris, fermer' : 'Got it, close'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleRequestToken}>
                <div className="fpm-field">
                  <label className="fpm-label">{isFR ? 'Email de votre compte' : 'Account email'}</label>
                  <div className="fpm-input-wrap">
                    <Mail size={15} className="fpm-input-icon" />
                    <input
                      type="email"
                      className="fpm-input"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="fpm-actions">
                  <button type="button" className="fpm-btn-secondary" onClick={handleClose} disabled={loading}>
                    {isFR ? 'Annuler' : 'Cancel'}
                  </button>
                  <button type="submit" className="fpm-btn-primary" disabled={loading || !email}>
                    {loading ? (isFR ? 'Envoi...' : 'Sending...') : (
                      <>
                        <span>{isFR ? 'Envoyer le lien par email' : 'Send reset link'}</span>
                        <Send size={13} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )
          ) : (
            <form onSubmit={handleResetPassword}>
              {!resetToken && (
                <div className="fpm-field">
                  <label className="fpm-label">{isFR ? 'Code / Token de réinitialisation' : 'Reset token / code'}</label>
                  <div className="fpm-input-wrap">
                    <KeyRound size={15} className="fpm-input-icon" />
                    <input
                      type="text"
                      className="fpm-input"
                      required
                      value={resetToken}
                      onChange={e => setResetToken(e.target.value)}
                      placeholder="Enter reset token from email"
                    />
                  </div>
                </div>
              )}

              <div className="fpm-field">
                <label className="fpm-label">{isFR ? 'Nouveau mot de passe' : 'New password'}</label>
                <div className="fpm-input-wrap">
                  <Lock size={15} className="fpm-input-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="fpm-input"
                    required
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder={isFR ? 'Min. 8 caractères' : 'Min. 8 characters'}
                    style={{ paddingRight: 38 }}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="cpm-eye-btn"
                    style={{ position: 'absolute', right: 10, background: 'none', border: 'none', color: '#9B9C9E', cursor: 'pointer' }}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="fpm-field">
                <label className="fpm-label">{isFR ? 'Confirmer le mot de passe' : 'Confirm password'}</label>
                <div className="fpm-input-wrap">
                  <Lock size={15} className="fpm-input-icon" />
                  <input
                    type="password"
                    className="fpm-input"
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="fpm-actions">
                <button type="button" className="fpm-btn-secondary" onClick={handleClose} disabled={loading}>
                  {isFR ? 'Annuler' : 'Cancel'}
                </button>
                <button type="submit" className="fpm-btn-primary" disabled={loading || !newPassword || !resetToken}>
                  {loading ? (isFR ? 'Mise à jour...' : 'Resetting...') : (
                    <>
                      <span>{isFR ? 'Enregistrer le nouveau mot de passe' : 'Save new password'}</span>
                      <ArrowRight size={13} />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordModal;
