import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { signup, saveSession } from '../../services/authService';
import { Phone, Lock, ChevronDown } from 'lucide-react';
import { languages } from '../../data/languages';

interface Props {
  onSuccess: () => void;
  switchToLogin: () => void;
  currentLanguage: string;
  onLanguageChange: (language: string) => void;
  onGoHome?: () => void;
}

const SignupPage: React.FC<Props> = ({ onSuccess, switchToLogin, currentLanguage, onLanguageChange, onGoHome }) => {
  const { t } = useTranslation();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = () => {
    if (!/^\d{10}$/.test(phone)) return t('signup.enterValidPhone');
    if (password.length < 6) return t('signup.passwordMinLength');
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = validate();
    if (v) { setError(v); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await signup(phone, password);
      // default to remembered session for simplicity on signup
      saveSession(res.token, res.user, true);
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.error || t('signup.signupFailed'));
    } finally {
      setLoading(false);
    }
  };

  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const langRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!langRef.current) return;
      if (!(e.target instanceof Node)) return;
      if (!langRef.current.contains(e.target)) setIsLanguageOpen(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white p-4">
      {/* Top bar with language selector */}
      <div className="max-w-5xl mx-auto flex items-center justify-end mb-4">
        <div className="relative" ref={langRef}>
          <button
            onClick={() => setIsLanguageOpen(o => !o)}
            className="flex items-center justify-between min-w-[160px] px-4 py-2 bg-white border rounded-lg shadow-sm text-sm text-gray-700 hover:bg-gray-50"
          >
            <span>{languages.find(l => l.code === currentLanguage)?.nativeName || 'English'}</span>
            <ChevronDown className="h-4 w-4 ml-2" />
          </button>
          {isLanguageOpen && (
            <div className="absolute mt-2 w-full bg-white border rounded-lg shadow-lg z-10">
              {languages.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => { onLanguageChange(lang.code); setIsLanguageOpen(false); }}
                  className={`block w-full text-left px-4 py-2 text-sm ${currentLanguage === lang.code ? 'bg-green-50 text-green-700' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  {lang.nativeName}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto flex items-center justify-center min-h-[60vh]">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6">
        <div className="text-center mb-4">
          <div className="mx-auto mb-2 w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <span className="text-2xl">🌾</span>
          </div>
          <h1 className="text-2xl font-bold text-green-700">{t('signup.createAccount')}</h1>
          <p className="text-sm text-gray-600 mt-1">{t('signup.signupToGetStarted')}</p>
        </div>

        {error && (
          <div className="mb-3 text-red-700 bg-red-50 border border-red-200 text-sm rounded-md p-2">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('signup.phone')}</label>
            <div className="flex items-center gap-2 rounded-xl border px-3 py-2 focus-within:ring-2 focus-within:ring-green-300">
              <Phone className="w-4 h-4 text-gray-400" />
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder={t('signup.placeholderPhone')}
                className="flex-1 outline-none"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('signup.password')}</label>
            <div className="flex items-center gap-2 rounded-xl border px-3 py-2 focus-within:ring-2 focus-within:ring-green-300">
              <Lock className="w-4 h-4 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={t('signup.placeholderPassword')}
                className="flex-1 outline-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button type="button" className="text-xs text-green-600" onClick={() => setShowPassword(s => !s)}>
                {showPassword ? t('signup.hide') : t('signup.show')}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button type="button" className="text-sm text-green-700 hover:underline" onClick={switchToLogin}>
              {t('signup.alreadyHaveAccount')}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white rounded-xl py-2 font-semibold hover:bg-green-700 active:scale-[0.99] transition"
          >
            {loading ? t('signup.creating') : t('signup.signup')}
          </button>
        </form>
        </div>
      </div>

      {/* Direct to Home box */}
      <div className="max-w-5xl mx-auto mt-6 flex justify-center">
        <div className="w-full max-w-xl bg-white border rounded-2xl shadow-sm p-5 text-center">
          <div className="mb-3">
            <div className="text-base font-semibold text-gray-900">{t('yield.continueWithoutLogin')}</div>
            <div className="text-sm text-gray-600">{t('yield.goDirectly')}</div>
          </div>
          <button
            onClick={onGoHome}
            className="px-5 py-2.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
          >
            {t('yield.goToHome')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;


