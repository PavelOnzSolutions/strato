import i18n from 'i18next';
import { initReactI18next } from "react-i18next";
import HttpApi from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";
import config from './config';

i18n
    .use(HttpApi) // Load translations from a backend API
    .use(LanguageDetector) // Detect user language
    .use(initReactI18next) // Bind i18n to React
    .init({
        fallbackLng: "en", // Fallback language
        debug: !config.prod.valueOf(), // Enable debugging in development
        backend: {
            loadPath: `${config.apiBaseUrl}/locales/{{lng}}/{{ns}}`, // API endpoint for translations
        },
        interpolation: {
            escapeValue: false, // React already escapes values
        },
        react: {
            useSuspense: true, // Use Suspense for loading translations
        },
    });

export default i18n;
