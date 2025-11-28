import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { languages } from '../data/languages';
import { ChevronDown, Menu, X } from 'lucide-react';

interface NavbarProps {
  currentLanguage: string;
  onLanguageChange: (language: string) => void;
  currentPage: string;
  onPageChange: (page: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentLanguage, onLanguageChange, currentPage, onPageChange }) => {
  const { t, i18n } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);

  const currentLang = languages.find(lang => lang.code === currentLanguage) || languages[0];
  
  // Sync i18n with currentLanguage prop
  React.useEffect(() => {
    if (i18n.language !== currentLanguage) {
      i18n.changeLanguage(currentLanguage);
    }
  }, [currentLanguage, i18n]);

  return (
    <nav className="bg-white shadow-lg fixed w-full top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Title */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-lg font-bold">B</span>
                </div>
                <span className="ml-2 text-xl font-bold text-gray-900">{t('common.beejMantra')}</span>
              </div>
            </div>
          </div>

          {/* Desktop Navigation - Aligned to the right, just before hamburger */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => onPageChange('home')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentPage === 'home' 
                    ? 'text-primary-600 bg-primary-50' 
                    : 'text-gray-700 hover:text-primary-600'
                }`}
              >
                {t('nav.home')}
              </button>
              <button 
                onClick={() => onPageChange('dashboard')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentPage === 'dashboard' 
                    ? 'text-primary-600 bg-primary-50' 
                    : 'text-gray-700 hover:text-primary-600'
                }`}
              >
                {t('footer.dashboard')}
              </button>
              
              {/* Language Switcher */}
              <div className="relative">
                <button
                  onClick={() => setIsLanguageOpen(!isLanguageOpen)}
                  className="flex items-center text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  {currentLang.nativeName}
                  <ChevronDown className="ml-1 h-4 w-4" />
                </button>
                
                {isLanguageOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                    {languages.map((language) => (
                      <button
                        key={language.code}
                        onClick={() => {
                          onLanguageChange(language.code);
                          setIsLanguageOpen(false);
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-primary-600"
                      >
                        {language.nativeName}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Hamburger menu button */}
            <div className="relative">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-gray-700 hover:text-primary-600 px-3 py-2"
              >
                <Menu className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-700 hover:text-primary-600"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Hamburger Menu Navigation (Desktop & Mobile) */}
      {isMenuOpen && (
        <>
          {/* Desktop Dropdown */}
          <div className="hidden md:block absolute right-4 top-16 w-64 bg-white border rounded-lg shadow-lg z-50">
            <div className="px-2 pt-2 pb-3 space-y-1">
            <button 
              onClick={() => {
                onPageChange('weather');
                setIsMenuOpen(false);
              }}
              className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium ${
                currentPage === 'weather' 
                  ? 'text-primary-600 bg-primary-50' 
                  : 'text-gray-700 hover:text-primary-600'
              }`}
            >
              {t('nav.weather')}
            </button>
            <button 
              onClick={() => {
                onPageChange('monitor');
                setIsMenuOpen(false);
              }}
              className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium ${
                currentPage === 'monitor' 
                  ? 'text-primary-600 bg-primary-50' 
                  : 'text-gray-700 hover:text-primary-600'
              }`}
            >
              {t('nav.cropMonitoring')}
            </button>
            <button 
              onClick={() => {
                onPageChange('disease');
                setIsMenuOpen(false);
              }}
              className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium ${
                currentPage === 'disease' 
                  ? 'text-primary-600 bg-primary-50' 
                  : 'text-gray-700 hover:text-primary-600'
              }`}
            >
              {t('features.disease-detection')}
            </button>
            <button 
              onClick={() => {
                onPageChange('yield');
                setIsMenuOpen(false);
              }}
              className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium ${
                currentPage === 'yield' 
                  ? 'text-primary-600 bg-primary-50' 
                  : 'text-gray-700 hover:text-primary-600'
              }`}
            >
              {t('nav.yieldPrediction')}
            </button>
            <button 
              onClick={() => {
                onPageChange('mandi');
                setIsMenuOpen(false);
              }}
              className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium ${
                currentPage === 'mandi' 
                  ? 'text-primary-600 bg-primary-50' 
                  : 'text-gray-700 hover:text-primary-600'
              }`}
            >
              {t('nav.mandiPrice')}
            </button>
            <button 
              onClick={() => {
                onPageChange('insights');
                setIsMenuOpen(false);
              }}
              className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium ${
                currentPage === 'insights' 
                  ? 'text-primary-600 bg-primary-50' 
                  : 'text-gray-700 hover:text-primary-600'
              }`}
            >
              {t('nav.marketIntelligence')}
            </button>
            
            </div>
          </div>
          
          {/* Mobile Menu */}
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t">
              <button 
                onClick={() => {
                  onPageChange('weather');
                  setIsMenuOpen(false);
                }}
                className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium ${
                  currentPage === 'weather' 
                    ? 'text-primary-600 bg-primary-50' 
                    : 'text-gray-700 hover:text-primary-600'
                }`}
              >
                {t('nav.weather')}
              </button>
              <button 
                onClick={() => {
                  onPageChange('monitor');
                  setIsMenuOpen(false);
                }}
                className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium ${
                  currentPage === 'monitor' 
                    ? 'text-primary-600 bg-primary-50' 
                    : 'text-gray-700 hover:text-primary-600'
                }`}
              >
                {t('nav.cropMonitoring')}
              </button>
              <button 
                onClick={() => {
                  onPageChange('disease');
                  setIsMenuOpen(false);
                }}
                className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium ${
                  currentPage === 'disease' 
                    ? 'text-primary-600 bg-primary-50' 
                    : 'text-gray-700 hover:text-primary-600'
                }`}
              >
                {t('features.disease-detection')}
              </button>
              <button 
                onClick={() => {
                  onPageChange('yield');
                  setIsMenuOpen(false);
                }}
                className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium ${
                  currentPage === 'yield' 
                    ? 'text-primary-600 bg-primary-50' 
                    : 'text-gray-700 hover:text-primary-600'
                }`}
              >
                {t('nav.yieldPrediction')}
              </button>
              <button 
                onClick={() => {
                  onPageChange('mandi');
                  setIsMenuOpen(false);
                }}
                className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium ${
                  currentPage === 'mandi' 
                    ? 'text-primary-600 bg-primary-50' 
                    : 'text-gray-700 hover:text-primary-600'
                }`}
              >
                {t('nav.mandiPrice')}
              </button>
              <button 
                onClick={() => {
                  onPageChange('insights');
                  setIsMenuOpen(false);
                }}
                className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium ${
                  currentPage === 'insights' 
                    ? 'text-primary-600 bg-primary-50' 
                    : 'text-gray-700 hover:text-primary-600'
                }`}
              >
                {t('nav.marketIntelligence')}
              </button>
              
              {/* Mobile Language Switcher */}
              <div className="px-3 py-2">
                <div className="text-sm font-medium text-gray-500 mb-2">{t('nav.language')}</div>
                {languages.map((language) => (
                  <button
                    key={language.code}
                    onClick={() => {
                      onLanguageChange(language.code);
                      setIsMenuOpen(false);
                    }}
                    className={`block w-full text-left px-3 py-2 rounded-md text-sm ${
                      currentLanguage === language.code
                        ? 'text-primary-600 bg-primary-50'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {language.nativeName}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </nav>
  );
};

export default Navbar;
