import React from 'react';
import { useTranslation } from 'react-i18next';

interface HeroSectionProps {
  currentLanguage: string;
  onLoginSignup?: () => void;
  onExplore?: () => void;
  onOpenDashboard?: () => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ currentLanguage, onLoginSignup, onExplore, onOpenDashboard }) => {
  const { t, i18n } = useTranslation();
  const goDashboard = React.useCallback(() => {
    if (onOpenDashboard) { onOpenDashboard(); return; }
    try { (window as any).appSetPage?.('dashboard'); } catch (_) {}
  }, [onOpenDashboard]);
  
  // Sync i18n with currentLanguage prop
  React.useEffect(() => {
    if (i18n.language !== currentLanguage) {
      i18n.changeLanguage(currentLanguage);
    }
  }, [currentLanguage, i18n]);

  return (
    <section className="pt-24 pb-16 bg-gradient-to-br from-primary-50 to-secondary-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                {t('hero.title')}
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 leading-relaxed">
                {t('hero.subtitle')}
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <button className="btn-primary text-lg px-8 py-4" onClick={onLoginSignup}>
                {t('hero.loginSignup')}
              </button>
              <button className="btn-secondary text-lg px-8 py-4" onClick={onExplore}>
                {t('hero.exploreFeatures')}
              </button>
            </div>
          </div>

          {/* Illustration */}
          <div className="flex justify-center lg:justify-end">
            <div className="relative">
              {/* Main illustration placeholder */}
              <div className="w-80 h-80 bg-gradient-to-br from-primary-100 to-secondary-100 rounded-3xl flex items-center justify-center shadow-2xl">
                <div className="text-center space-y-4">
                  <div className="text-6xl">🌾</div>
                  <div className="text-4xl">🤖</div>
                  <div className="text-6xl">📱</div>
                </div>
              </div>
              
              {/* Floating elements */}
              <div className="absolute -top-4 -left-4 w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center">
                <span className="text-2xl">🌤️</span>
              </div>
              <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
              <div className="absolute top-1/2 -right-8 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center">
                <span className="text-xl">🌱</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
