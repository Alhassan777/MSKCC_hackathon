'use client';

import React from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SupportedLocale, TextDirection } from '@/types/chat';
import { getTextDirection } from '@/lib/i18n/config';

interface SessionState {
  sessionId: string;
  locale: SupportedLocale;
  dir: TextDirection;
  isInitialized: boolean;
  
  // Actions
  setLocale: (locale: SupportedLocale) => void;
  setDir: (dir: TextDirection) => void;
  initialize: () => void;
  generateNewSession: () => string;
}

// Generate a random session ID
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      sessionId: generateSessionId(),
      locale: 'en',
      dir: 'ltr',
      isInitialized: false,

      setLocale: (locale: SupportedLocale) => {
        const dir = getTextDirection(locale);
        set({ locale, dir });
        
        // Update document attributes
        if (typeof document !== 'undefined') {
          document.documentElement.lang = locale;
          document.documentElement.dir = dir;
          
          // Update body class for RTL styling
          if (dir === 'rtl') {
            document.body.classList.add('rtl');
          } else {
            document.body.classList.remove('rtl');
          }
        }
      },

      setDir: (dir: TextDirection) => {
        set({ dir });
        
        if (typeof document !== 'undefined') {
          document.documentElement.dir = dir;
          
          if (dir === 'rtl') {
            document.body.classList.add('rtl');
          } else {
            document.body.classList.remove('rtl');
          }
        }
      },

      initialize: () => {
        if (get().isInitialized) return;
        
        const { locale, dir } = get();
        
        // Apply locale settings to document
        if (typeof document !== 'undefined') {
          document.documentElement.lang = locale;
          document.documentElement.dir = dir;
          
          if (dir === 'rtl') {
            document.body.classList.add('rtl');
          }
        }
        
        set({ isInitialized: true });
      },

      generateNewSession: () => {
        const newSessionId = generateSessionId();
        set({ sessionId: newSessionId });
        return newSessionId;
      },
    }),
    {
      name: 'msk-session-storage',
      partialize: (state) => ({
        sessionId: state.sessionId,
        locale: state.locale,
        dir: state.dir,
      }),
    }
  )
);

// Hook to initialize session on client side
export function useSessionInit() {
  const initialize = useSessionStore((state) => state.initialize);
  const isInitialized = useSessionStore((state) => state.isInitialized);

  React.useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [initialize, isInitialized]);
}