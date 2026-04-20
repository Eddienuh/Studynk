import React, { createContext, useState, useContext, useEffect } from 'react';
import i18n, { loadLanguagePreference, saveLanguagePreference } from '../i18n';

type LanguageContextType = {
  currentLanguage: string;
  changeLanguage: (language: string) => Promise<void>;
  t: (key: string, options?: any) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [currentLanguage, setCurrentLanguage] = useState(i18n.locale.split('-')[0]);

  useEffect(() => {
    loadLanguagePreference().then(() => {
      setCurrentLanguage(i18n.locale.split('-')[0]);
    }).catch(error => {
      console.log('Error in language provider:', error);
      setCurrentLanguage('en');
    });
  }, []);

  const changeLanguage = async (language: string) => {
    await saveLanguagePreference(language);
    setCurrentLanguage(language);
    // Force re-render of components
    i18n.locale = language;
  };

  const t = (key: string, options?: any) => {
    return i18n.t(key, options);
  };

  return (
    <LanguageContext.Provider value={{ currentLanguage, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
