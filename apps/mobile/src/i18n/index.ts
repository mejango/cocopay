import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import pt from './locales/pt';
import en from './locales/en';
import es from './locales/es';
import zh from './locales/zh';

export const LANGUAGES = ['pt', 'en', 'es', 'zh'] as const;
export type Language = (typeof LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<Language, string> = {
  pt: 'PT',
  en: 'EN',
  es: 'ES',
  zh: 'ZH',
};

const LANG_STORAGE_KEY = 'cocopay_language';

async function getStoredLanguage(): Promise<Language | null> {
  try {
    if (Platform.OS === 'web') {
      const stored = localStorage.getItem(LANG_STORAGE_KEY);
      if (stored && LANGUAGES.includes(stored as Language)) {
        return stored as Language;
      }
      return null;
    }
    const stored = await SecureStore.getItemAsync(LANG_STORAGE_KEY);
    if (stored && LANGUAGES.includes(stored as Language)) {
      return stored as Language;
    }
  } catch {
    // ignore
  }
  return null;
}

export async function storeLanguage(lang: Language): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
      return;
    }
    await SecureStore.setItemAsync(LANG_STORAGE_KEY, lang);
  } catch {
    // ignore
  }
}

function getDeviceLanguage(): Language {
  try {
    const locales = getLocales();
    if (locales.length > 0) {
      const code = locales[0].languageCode?.toLowerCase();
      if (code && LANGUAGES.includes(code as Language)) {
        return code as Language;
      }
    }
  } catch {
    // ignore
  }
  return 'pt'; // Default to Portuguese
}

// Initialize synchronously with device language, then override with stored preference
i18n.use(initReactI18next).init({
  resources: {
    pt: { translation: pt },
    en: { translation: en },
    es: { translation: es },
    zh: { translation: zh },
  },
  lng: getDeviceLanguage(),
  fallbackLng: 'pt',
  interpolation: {
    escapeValue: false,
  },
});

// Load stored language preference asynchronously
getStoredLanguage().then((stored) => {
  if (stored && stored !== i18n.language) {
    i18n.changeLanguage(stored);
  }
});

export function cycleLanguage(): Language {
  const currentIndex = LANGUAGES.indexOf(i18n.language as Language);
  const nextIndex = (currentIndex + 1) % LANGUAGES.length;
  const nextLang = LANGUAGES[nextIndex];
  i18n.changeLanguage(nextLang);
  storeLanguage(nextLang);
  return nextLang;
}

export default i18n;
