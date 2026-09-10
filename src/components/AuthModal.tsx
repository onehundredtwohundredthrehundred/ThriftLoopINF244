import React, { useState } from 'react';
import { 
  X, 
  ShoppingBag, 
  Store, 
  Lock, 
  Mail, 
  User as UserIcon, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  CheckCircle2, 
  Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBodyScrollLock } from '../lib/useBodyScrollLock';

export const AuthModal: React.FC = () => {
  const { 
    isAuthModalOpen, 
    closeAuthModal, 
    authModalTab, 
    openAuthModal, 
    authModalRole, 
    setAuthModalRole,
    login, 
    loginWithGoogle,
    register,
    resetPassword
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [boutiqueName, setBoutiqueName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotEmailSent, setForgotEmailSent] = useState(false);

  useBodyScrollLock(isAuthModalOpen);

  if (!isAuthModalOpen) return null;

  const handleGoogleAuth = async () => {
    setErrorMessage('');
    setIsGoogleSubmitting(true);
    try {
      const result = await loginWithGoogle(
        authModalRole, 
        authModalTab === 'register' ? (boutiqueName.trim() || undefined) : undefined
      );
      if (!result.success && result.error && !result.cancelled) {
        setErrorMessage(result.error);
      }
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
        setErrorMessage(err.message || 'Google sign in encountered an issue.');
      }
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (authModalTab === 'register') {
        if (!name.trim()) {
          setErrorMessage('Please provide your name.');
          setIsSubmitting(false);
          return;
        }
        const result = await register(
          name.trim(), 
          email.trim(), 
          password, 
          authModalRole, 
          boutiqueName.trim() || undefined
        );
        if (!result.success) {
          setErrorMessage(result.error || 'Registration failed. Please check your credentials.');
        }
      } else {
        const result = await login(email.trim(), password);
        if (!result.success) {
          setErrorMessage(result.error || 'Invalid login credentials.');
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected authentication error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter your registered email address.');
      return;
    }

    setIsSubmitting(true);
    const result = await resetPassword(email.trim());
    setIsSubmitting(false);

    if (result.success) {
      setForgotEmailSent(true);
    } else {
      setErrorMessage(result.error || 'Failed to send password reset email.');
    }
  };

  return (
    <div 
      id="auth-modal-overlay"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeAuthModal();
      }}
    >
      <div 
        id="auth-modal-container"
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button Top-Right */}
        <button
          id="close-auth-modal-btn"
          onClick={closeAuthModal}
          className="absolute top-4 right-4 z-10 text-stone-400 hover:text-stone-700 p-1.5 rounded-full hover:bg-stone-100 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Main Content */}
        <div className="p-6 sm:p-7 pt-7">
          
          {/* Sign In vs Register Tabs */}
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

          {/* Forgot Password View */}
          {isForgotPassword ? (
            <div>
              <h3 className="font-serif text-xl font-bold text-stone-900 mb-1">Reset Password</h3>
              <p className="text-xs text-stone-600 mb-5">
                Enter your registered account email and we will send you a password reset link.
              </p>

              {forgotEmailSent ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-emerald-900">Reset Link Sent</h4>
                  <p className="text-xs text-emerald-700 mt-1">
                    We sent password reset instructions to <span className="font-semibold">{email}</span>. Please check your inbox.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(false);
                      setForgotEmailSent(false);
                    }}
                    className="mt-4 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold"
                  >
                    Back to Sign In
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Account Email</label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@domain.com"
                        className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-900 focus:outline-none text-stone-900"
                      />
                      <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                    </div>
                  </div>

                  {errorMessage && (
                    <p className="text-xs text-rose-600 font-medium">{errorMessage}</p>
                  )}

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsForgotPassword(false)}
                      className="px-4 py-2 border border-stone-300 text-xs font-semibold text-stone-700 rounded-lg hover:bg-stone-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      <span>Send Reset Link</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <div>
              {/* Only show Account Type selection during Registration */}
              {authModalTab === 'register' && (
                <div className="mb-4">
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-2">
                    Account Type
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-stone-100 rounded-xl">
                    <button
                      id="role-buyer-toggle"
                      type="button"
                      onClick={() => setAuthModalRole('buyer')}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                        authModalRole === 'buyer'
                          ? 'bg-white text-stone-900 shadow-xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      <ShoppingBag className="w-4 h-4 text-amber-800" />
                      <span>Vintage Buyer</span>
                    </button>

                    <button
                      id="role-seller-toggle"
                      type="button"
                      onClick={() => setAuthModalRole('seller')}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                        authModalRole === 'seller'
                          ? 'bg-stone-900 text-white shadow-xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      <Store className="w-4 h-4 text-amber-400" />
                      <span>Boutique Seller</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Form Fields */}
              <form onSubmit={handleSubmit} className="space-y-3">
                
                {/* Full Name for Registration */}
                {authModalTab === 'register' && (
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <input
                        id="auth-name-input"
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Maria Santos"
                        className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-900 focus:outline-none text-stone-900"
                      />
                      <UserIcon className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                    </div>
                  </div>
                )}

                {/* Boutique Name if registering as Seller */}
                {authModalTab === 'register' && authModalRole === 'seller' && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-stone-700">
                        Boutique / Store Name
                      </label>
                      <span className={`text-[10px] font-mono ${boutiqueName.length >= 30 ? 'text-amber-600 font-bold' : 'text-stone-400'}`}>
                        {boutiqueName.length}/30
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        id="auth-boutique-input"
                        type="text"
                        maxLength={30}
                        value={boutiqueName}
                        onChange={(e) => setBoutiqueName(e.target.value)}
                        placeholder="e.g. Manila Vintage Archive"
                        className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-900 focus:outline-none text-stone-900"
                      />
                      <Store className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                    </div>
                  </div>
                )}

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      id="auth-email-input"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. yourname@domain.com"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-900 focus:outline-none text-stone-900"
                    />
                    <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-stone-700">
                      Password
                    </label>
                    {authModalTab === 'login' && (
                      <button
                        type="button"
                        onClick={() => {
                          setErrorMessage('');
                          setIsForgotPassword(true);
                        }}
                        className="text-[11px] text-amber-900 hover:text-stone-950 font-medium"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      id="auth-password-input"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete={authModalTab === 'login' ? 'current-password' : 'new-password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full pl-9 pr-10 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-900 focus:outline-none text-stone-900"
                    />
                    <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                    <button
                      id="auth-toggle-password-visibility-btn"
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-700 cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Error Banner */}
                {errorMessage && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 font-medium leading-relaxed">
                    {errorMessage}
                  </div>
                )}

                {/* Remember Me */}
                <div className="flex items-center justify-between text-xs text-stone-600 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-stone-300 text-stone-900 focus:ring-stone-900"
                    />
                    <span>Remember this device</span>
                  </label>
                </div>

                {/* Submit Action */}
                <button
                  id="auth-submit-btn"
                  type="submit"
                  disabled={isSubmitting || isGoogleSubmitting}
                  className="w-full mt-2 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-semibold rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2 group disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>{authModalTab === 'login' ? 'Sign In' : 'Create Account'}</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </button>

                {/* Divider */}
                <div className="flex items-center gap-2 my-3">
                  <div className="flex-1 h-px bg-stone-200" />
                  <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">or</span>
                  <div className="flex-1 h-px bg-stone-200" />
                </div>

                {/* Google 1-Click Sign-In Button */}
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
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                  )}
                  <span>Continue with Google</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
