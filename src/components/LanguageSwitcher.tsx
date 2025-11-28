import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();

  const changeLang = (lng: string) => {
    i18n.changeLanguage(lng);
    // Trigger window event or update parent if needed
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: lng }));
  };

  return (
    <div className="absolute top-4 right-4 z-50">
      <select
        onChange={(e) => changeLang(e.target.value)}
        value={i18n.resolvedLanguage || 'en'}
        className="border border-gray-300 px-3 py-1 rounded-lg text-sm bg-white shadow-sm"
      >
        <option value="en">English</option>
        <option value="hi">हिन्दी</option>
        <option value="ta">தமிழ்</option>
        <option value="te">తెలుగు</option>
        <option value="ml">മലയാളം</option>
        <option value="mr">मराठी</option>
        <option value="bn">বাংলা</option>
        <option value="pa">ਪੰਜਾਬੀ</option>
      </select>
    </div>
  );
};

export default LanguageSwitcher;


