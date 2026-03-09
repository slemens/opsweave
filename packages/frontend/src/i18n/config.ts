import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import commonDe from './locales/de/common.json';
import commonEn from './locales/en/common.json';
import ticketsDe from './locales/de/tickets.json';
import ticketsEn from './locales/en/tickets.json';
import settingsDe from './locales/de/settings.json';
import settingsEn from './locales/en/settings.json';
import cmdbDe from './locales/de/cmdb.json';
import cmdbEn from './locales/en/cmdb.json';
import workflowsDe from './locales/de/workflows.json';
import workflowsEn from './locales/en/workflows.json';
import catalogDe from './locales/de/catalog.json';
import catalogEn from './locales/en/catalog.json';
import complianceDe from './locales/de/compliance.json';
import complianceEn from './locales/en/compliance.json';

const resources = {
  de: {
    common: commonDe,
    tickets: ticketsDe,
    settings: settingsDe,
    cmdb: cmdbDe,
    workflows: workflowsDe,
    catalog: catalogDe,
    compliance: complianceDe,
  },
  en: {
    common: commonEn,
    tickets: ticketsEn,
    settings: settingsEn,
    cmdb: cmdbEn,
    workflows: workflowsEn,
    catalog: catalogEn,
    compliance: complianceEn,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'de',
    defaultNS: 'common',
    ns: ['common', 'tickets', 'settings', 'cmdb', 'workflows', 'catalog', 'compliance'],
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
