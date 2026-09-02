import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, type Language } from './translations';

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (path: string, fallback?: string) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('openpeek_lang');
    if (saved === 'fr' || saved === 'en') {
      return saved;
    }
    // Auto-detect browser/OS language
    if (typeof navigator !== 'undefined' && navigator.language) {
      if (navigator.language.toLowerCase().startsWith('fr')) {
        return 'fr';
      }
    }
    return 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('openpeek_lang', lang);
      document.documentElement.lang = lang;
    } catch {}
  };

  useEffect(() => {
    try {
      document.documentElement.lang = language;
    } catch {}
  }, [language]);

  const t = (path: string, fallback?: string): string => {
    const keys = path.split('.');
    let current: any = translations[language];

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        // Fallback to english if missing in target
        let enFallback: any = translations['en'];
        for (const fKey of keys) {
          if (enFallback && typeof enFallback === 'object' && fKey in enFallback) {
            enFallback = enFallback[fKey];
          } else {
            enFallback = null;
            break;
          }
        }
        return (typeof enFallback === 'string' ? enFallback : fallback || path);
      }
    }

    return typeof current === 'string' ? current : fallback || path;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    // Fallback if rendered outside provider
    return {
      language: 'fr' as Language,
      setLanguage: () => {},
      t: (path: string, fallback?: string) => fallback || path,
    };
  }
  return context;
}
