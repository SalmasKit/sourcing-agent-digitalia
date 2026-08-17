import React, { createContext, useContext, useState } from 'react';
import { translations } from '../locales';

const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState('EN');

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
