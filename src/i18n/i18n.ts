import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
// @ts-ignore - some projects don't ship types for this plugin
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en/translation.json';
import hi from './locales/hi/translation.json';
import ta from './locales/ta/translation.json';
import te from './locales/te/translation.json';
import ml from './locales/ml/translation.json';
import mr from './locales/mr/translation.json';
import bn from './locales/bn/translation.json';
import pa from './locales/pa/translation.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      ta: { translation: ta },
      te: { translation: te },
      ml: { translation: ml },
      mr: { translation: mr },
      bn: { translation: bn },
      pa: { translation: pa }
    },
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage']
    }
  });

export default i18n;


