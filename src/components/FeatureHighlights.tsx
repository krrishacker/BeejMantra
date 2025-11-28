import React from 'react';
import { useTranslation } from 'react-i18next';
import { features } from '../data/features';
import { ArrowRight } from 'lucide-react';

interface FeatureHighlightsProps {
  currentLanguage: string;
}

const FeatureHighlights: React.FC<FeatureHighlightsProps> = ({ currentLanguage }) => {
  const { t, i18n } = useTranslation();
  
  // Sync i18n with currentLanguage prop
  React.useEffect(() => {
    if (i18n.language !== currentLanguage) {
      i18n.changeLanguage(currentLanguage);
    }
  }, [currentLanguage, i18n]);

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {t('features.title')}
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {t('features.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div key={feature.id} className="card group hover:scale-105 transition-transform duration-200" onClick={() => {
              if (feature.id === 'weather-forecast') {
                const nav: any = (window as any).appSetPage; if (nav) nav('weather');
              }
              if (feature.id === 'crop-monitoring') {
                const nav: any = (window as any).appSetPage; if (nav) nav('monitor');
              }
              if (feature.id === 'yield-prediction') {
                const nav: any = (window as any).appSetPage; if (nav) nav('yield');
              }
              if (feature.id === 'market-intelligence') {
                const nav: any = (window as any).appSetPage; if (nav) nav('insights');
              }
              if (feature.id === 'disease-detection') {
                const nav: any = (window as any).appSetPage; if (nav) nav('disease');
              }
              if (feature.id === 'mandi-price') {
                const nav: any = (window as any).appSetPage; if (nav) nav('mandi');
              }
            }}>
              <div className="text-center space-y-4">
                <div className="text-5xl mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {t(`features.${feature.id}` as any) || feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {t(`features.${feature.id}Desc` as any) || feature.description}
                </p>
                <button className="inline-flex items-center text-primary-600 hover:text-primary-700 font-medium group-hover:translate-x-1 transition-transform duration-200">
                  {t('features.learnMore')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeatureHighlights;
