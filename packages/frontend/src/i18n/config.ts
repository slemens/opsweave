import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import commonDe from './locales/de/common.json';
import commonEn from './locales/en/common.json';
import ticketsDe from './locales/de/tickets.json';
import ticketsEn from './locales/en/tickets.json';
import settingsDe from './locales/de/settings.json';
import settingsEn from './locales/en/settings.json';

const resources = {
  de: {
    common: commonDe,
    tickets: ticketsDe,
    settings: settingsDe,
  },
  en: {
    common: commonEn,
    tickets: ticketsEn,
    settings: settingsEn,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'de',
    defaultNS: 'common',
    ns: ['common', 'tickets', 'settings'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'opsweave_language',
      caches: ['localStorage'],
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
