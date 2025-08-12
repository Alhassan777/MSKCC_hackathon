'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { SupportedLocale } from '@/types/chat';
import { useSessionStore } from '@/lib/store/session';

interface I18nContextType {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  messages: any;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children, initialMessages }: { children: React.ReactNode; initialMessages: any }) {
  const { locale, setLocale: setStoreLocale } = useSessionStore();
  const [messages, setMessages] = useState(initialMessages);

  const setLocale = async (newLocale: SupportedLocale) => {
    setStoreLocale(newLocale);
    
    // Load messages for the new locale
    try {
      const newMessages = (await import(`../../messages/${newLocale}.json`)).default;
      setMessages(newMessages);
    } catch (error) {
      console.error('Failed to load messages for locale:', newLocale, error);
    }
  };

  useEffect(() => {
    // Load messages for current locale on mount
    const loadMessages = async () => {
      try {
        const localeMessages = (await import(`../../messages/${locale}.json`)).default;
        setMessages(localeMessages);
      } catch (error) {
        console.error('Failed to load messages for locale:', locale, error);
      }
    };
    
    if (locale !== 'en') { // en is already loaded
      loadMessages();
    }
  }, [locale]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, messages }}>
      <NextIntlClientProvider messages={messages} locale={locale}>
        {children}
      </NextIntlClientProvider>
    </I18nContext.Provider>
  );
}

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
};
