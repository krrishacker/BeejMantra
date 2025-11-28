import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { languages } from '../data/languages';
import { ChevronDown, Mail, Phone, MapPin } from 'lucide-react';

interface FooterProps {
  currentLanguage: string;
  onLanguageChange: (language: string) => void;
}

const Footer: React.FC<FooterProps> = ({ currentLanguage, onLanguageChange }) => {
  const { t, i18n } = useTranslation();
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  
  // Sync i18n with currentLanguage prop
  React.useEffect(() => {
    if (i18n.language !== currentLanguage) {
      i18n.changeLanguage(currentLanguage);
    }
  }, [currentLanguage, i18n]);

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xl font-bold">B</span>
              </div>
              <span className="ml-3 text-2xl font-bold">{t('common.beejMantra')}</span>
            </div>
            <p className="text-gray-300 mb-6 max-w-md">
              {t('footer.companyDesc')}
            </p>
            
            {/* Contact Info */}
            <div className="space-y-3">
              <div className="flex items-center text-gray-300">
                <Mail className="h-5 w-5 mr-3 text-primary-400" />
                <span>support@beejmantra.com</span>
              </div>
              <div className="flex items-center text-gray-300">
                <Phone className="h-5 w-5 mr-3 text-primary-400" />
                <span>+91 1800-123-4567</span>
              </div>
              <div className="flex items-center text-gray-300">
                <MapPin className="h-5 w-5 mr-3 text-primary-400" />
                <span>Faridabad, Haryana, India</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('footer.quickLinks')}</h3>
            <ul className="space-y-2">
              <li>
                <a href="#dashboard" className="text-gray-300 hover:text-white transition-colors">
                  {t('footer.dashboard')}
                </a>
              </li>
              <li>
                <a href="#features" className="text-gray-300 hover:text-white transition-colors">
                  {t('footer.features')}
                </a>
              </li>
              <li>
                <a href="#market-intelligence" className="text-gray-300 hover:text-white transition-colors">
                  {t('footer.marketIntelligence')}
                </a>
              </li>
              <li>
                <a href="#help" className="text-gray-300 hover:text-white transition-colors">
                  {t('footer.helpSupport')}
                </a>
              </li>
            </ul>
          </div>

          {/* Language & Legal */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('footer.language')}</h3>
            
            {/* Language Selector */}
            <div className="relative mb-6">
              <button
                onClick={() => setIsLanguageOpen(!isLanguageOpen)}
                className="flex items-center justify-between w-full px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <span>{languages.find(lang => lang.code === currentLanguage)?.nativeName}</span>
                <ChevronDown className="h-4 w-4" />
              </button>
              
              {isLanguageOpen && (
                <div className="absolute bottom-full left-0 w-full mb-2 bg-gray-800 rounded-lg py-1 z-50">
                  {languages.map((language) => (
                    <button
                      key={language.code}
                      onClick={() => {
                        onLanguageChange(language.code);
                        setIsLanguageOpen(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                    >
                      {language.nativeName}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Legal Links */}
            <div className="space-y-2">
              <a href="#privacy" className="block text-gray-300 hover:text-white transition-colors">
                {t('footer.privacyPolicy')}
              </a>
              <a href="#terms" className="block text-gray-300 hover:text-white transition-colors">
                {t('footer.termsOfService')}
              </a>
              <a href="#cookies" className="block text-gray-300 hover:text-white transition-colors">
                {t('footer.cookiePolicy')}
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p className="text-gray-400">
            {t('footer.copyright')}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
