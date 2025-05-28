import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en/translation.json';
import es from './locales/es/translation.json';
import de from './locales/de/translation.json';
import fr from './locales/fr/translation.json';
import hi from './locales/hi/translation.json';
import sw from './locales/sw/translation.json';
import zh from './locales/zh/translation.json';

const resources = {
  en: { translation: en },
  es: { translation: es },
  de: { translation: de },
  fr: { translation: fr },
  hi: { translation: hi },
  sw: { translation: sw },
  zh: { translation: zh },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;
