import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, User as UserIcon, Store, ShieldAlert, ArrowRight, RefreshCw, KeyRound, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBodyScrollLock } from '../lib/useBodyScrollLock';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    authModalTab,
    authModalRole,
    closeAuthModal,
    openAuthModal,
    login,
    register,
    loginWithGoogle,
    resetPassword
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [boutiqueName, setBoutiqueName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  useBodyScrollLock(isAuthModalOpen);

  useEffect(() => {
    if (isAuthModalOpen) {
      setErrorMessage('');
      setSuccessMessage('');
      setEmail('');
      setPassword('');
      setName('');
      setBoutiqueName('');
      setIsForgotPassword(false);
    }
  }, [isAuthModalOpen, authModalTab]);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsSubmitting(true);

    if (isForgotPassword) {
      const res = await resetPassword(email);
      setIsSubmitting(false);
      if (res.success) {
        setSuccessMessage('Password reset email sent! Check your inbox.');
      } else {
        setErrorMessage(res.error || 'Failed to send password reset email.');
      }
      return;
    }

    if (authModalTab === 'login') {
      const res = await login(email, password);
      setIsSubmitting(false);
      if (res.success) {
        closeAuthModal();
      } else {
        setErrorMessage(res.error || 'Login failed.');
      }
    } else {
      const role = authModalRole || 'buyer';
      const res = await register(email, password, name, role, role === 'seller' ? boutiqueName : undefined);
      setIsSubmitting(false);
      if (res.success) {
        closeAuthModal();
      } else {
        setErrorMessage(res.error || 'Registration failed.');
      }
    }
  };

  const handleGoogleAuth = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    setIsGoogleSubmitting(true);
    const role = authModalRole || 'buyer';
    const res = await loginWithGoogle(role);
    setIsGoogleSubmitting(false);
    if (res.success) {
      closeAuthModal();
    } else {
      setErrorMessage(res.error || 'Google Authentication failed.');
    }
  };

  return (
    <div
      id="auth-modal-overlay"
      className="fixed inset-0 bg-stone-950/80 backdrop-blur-xs z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeAuthModal();
      }}
    >
      <div
        id="auth-modal-container"
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          id="close-auth-modal-btn"
          onClick={closeAuthModal}
          className="absolute top-4 right-4 z-10 text-stone-400 hover:text-stone-700 p-1.5 rounded-full hover:bg-stone-100 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-7 pt-7">
          {!isForgotPassword && (
            <div className="flex border-b border-stone-200 mb-5">
              <button
                id="tab-login-btn"
                type="button"
                onClick={() => {
                  setErrorMessage('');
                  openAuthModal('login');
                }}
                className={`flex-1 pb-3 text-center text-sm font-semibold transition-all relative ${
                  authModalTab === 'login'
                    ? 'text-stone-950 font-bold'
                    : 'text-stone-400 hover:text-stone-700'
                }`}
              >
                Sign In
                {authModalTab === 'login' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-stone-900 rounded-full" />
                )}
              </button>

              <button
                id="tab-register-btn"
                type="button"
                onClick={() => {
                  setErrorMessage('');
                  openAuthModal('register', authModalRole);
                }}
                className={`flex-1 pb-3 text-center text-sm font-semibold transition-all relative ${
                  authModalTab === 'register'
                    ? 'text-stone-950 font-bold'
                    : 'text-stone-400 hover:text-stone-700'
                }`}
              >
                Create Account
                {authModalTab === 'register' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-stone-900 rounded-full" />
                )}
              </button>
            </div>
          )}

          {isForgotPassword ? (
            <div>
              <h3 className="font-serif text-xl font-bold text-stone-900 mb-1">Reset Password</h3>
              <p className="text-xs text-stone-600 mb-5">
                Enter your registered email address and we'll send you a password reset link.
              </p>
            </div>
          ) : (
            <div className="mb-5">
              <h3 className="font-serif text-xl font-bold text-stone-900 mb-1">
                {authModalTab === 'login' ? 'Welcome Back' : authModalRole === 'seller' ? 'Join as a Boutique Seller' : 'Join ThriftLoop'}
              </h3>
              <p className="text-xs text-stone-600">
                {authModalTab === 'login'
                  ? 'Sign in to access your saved listings and track orders.'
                  : 'Create an account to browse vintage archives or set up your boutique.'}
              </p>
            </div>
          )}

          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2 font-medium">
              <ShieldAlert className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2 font-medium">
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            {authModalTab === 'register' && !isForgotPassword && (
              <div>
                <label className="block font-semibold text-stone-800 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl font-medium text-stone-900 focus:ring-2 focus:ring-amber-800 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {authModalTab === 'register' && authModalRole === 'seller' && !isForgotPassword && (
              <div>
                <label className="block font-semibold text-stone-800 mb-1">
                  Boutique Store Name
                </label>
                <div className="relative">
                  <Store className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={boutiqueName}
                    onChange={(e) => setBoutiqueName(e.target.value)}
                    placeholder="e.g. Vintage Vault & Co"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl font-medium text-stone-900 focus:ring-2 focus:ring-amber-800 focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block font-semibold text-stone-800 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl font-medium text-stone-900 focus:ring-2 focus:ring-amber-800 focus:outline-none"
                />
              </div>
            </div>

            {!isForgotPassword && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-stone-800">
                    Password
                  </label>
                  {authModalTab === 'login' && (
                    <button
                      type="button"
                      onClick={() => setIsForgotPassword(true)}
                      className="text-[11px] font-semibold text-amber-900 hover:underline"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl font-medium text-stone-900 focus:ring-2 focus:ring-amber-800 focus:outline-none"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || isGoogleSubmitting}
              className="w-full py-3 px-4 bg-amber-900 hover:bg-amber-950 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isForgotPassword ? (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Send Reset Email</span>
                </>
              ) : authModalTab === 'login' ? (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {isForgotPassword && (
              <button
                type="button"
                onClick={() => setIsForgotPassword(false)}
                className="w-full text-center text-xs font-semibold text-stone-600 hover:text-stone-900 pt-2"
              >
                Back to Sign In
              </button>
            )}

            {!isForgotPassword && (
              <>
                <div className="flex items-center gap-2 my-3">
                  <div className="flex-1 h-px bg-stone-200" />
                  <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">or</span>
                  <div className="flex-1 h-px bg-stone-200" />
                </div>

                <button
                  id="google-auth-btn"
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={isGoogleSubmitting || isSubmitting}
                  className="w-full py-2.5 px-4 bg-white hover:bg-stone-50 text-stone-800 border border-stone-300 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2.5 disabled:opacity-50"
                >
                  {isGoogleSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin text-stone-600" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                  )}
                  <span>Continue with Google</span>
                </button>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
