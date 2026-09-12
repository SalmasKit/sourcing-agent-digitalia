import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../locales';

const LanguageContext = createContext(null);
const STORAGE_KEY = 'targetalent_language';

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(() => {
    try {
      const saved =
        localStorage.getItem(STORAGE_KEY) ||
        localStorage.getItem('digitalia_language');
      if (saved && (saved === 'FR' || saved === 'EN')) {
        return saved;
      }
    } catch (e) {
      // ignore storage access errors
    }
    return 'EN';
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {
      // ignore storage access errors
    }
  }, [lang]);

  const toggleLanguage = () => {
    setLang(prev => (prev === 'EN' ? 'FR' : 'EN'));
  };

  const t = (key, params = {}) => {
    let str = translations[lang]?.[key] || translations['EN']?.[key] || key;
    Object.keys(params).forEach(param => {
      str = str.replace(`{${param}}`, params[param]);
    });
    return str;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
