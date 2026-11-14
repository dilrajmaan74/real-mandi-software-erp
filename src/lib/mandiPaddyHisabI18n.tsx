import React, { createContext, useContext, useEffect, useState } from 'react';

export type MphLang = 'en' | 'pa';

const MPH_LANG_STORAGE_KEY = 'mph_lang_v1';

interface MphLangContextValue {
  lang: MphLang;
  setLang: (next: MphLang) => void;
  tr: (en: string, pa: string) => string;
}

const MphLangContext = createContext<MphLangContextValue>({
  lang: 'en',
  setLang: () => {},
  tr: (en) => en,
});

export const MphLangProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<MphLang>(() => {
    try {
      const saved = localStorage.getItem(MPH_LANG_STORAGE_KEY);
      if (saved === 'pa' || saved === 'en') return saved;
    } catch {
      // ignore storage errors
    }
    return 'en';
  });

  useEffect(() => {
    try {
      localStorage.setItem(MPH_LANG_STORAGE_KEY, lang);
    } catch {
      // ignore storage errors
    }
  }, [lang]);

  const setLang = (next: MphLang) => setLangState(next);
  const tr = (en: string, pa: string) => (lang === 'pa' ? pa : en);

  return (
    <MphLangContext.Provider value={{ lang, setLang, tr }}>
      {children}
    </MphLangContext.Provider>
  );
};

export function useMphLang(): MphLangContextValue {
  return useContext(MphLangContext);
}
