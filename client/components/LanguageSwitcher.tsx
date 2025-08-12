'use client';

import { useTranslations } from 'next-intl';
import { ChevronDown, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSessionStore } from '@/lib/store/session';
import { languageOptions } from '@/lib/i18n/config';
import { SupportedLocale } from '@/types/chat';

interface LanguageSwitcherProps {
  variant?: 'header' | 'inline';
  onLanguageSelect?: (locale: SupportedLocale) => void;
}

export function LanguageSwitcher({ variant = 'header', onLanguageSelect }: LanguageSwitcherProps) {
  const t = useTranslations('header');
  const { locale, setLocale } = useSessionStore();
  
  const currentLanguage = languageOptions.find(lang => lang.code === locale);

  const handleLanguageChange = async (newLocale: SupportedLocale) => {
    if (newLocale === locale) return;
    
    setLocale(newLocale);
    
    // Call onLanguageSelect if provided (for inline variant)
    if (onLanguageSelect) {
      onLanguageSelect(newLocale);
      return;
    }
    
    // Update session locale on server (for header variant)
    try {
      const { sessionId } = useSessionStore.getState();
      await fetch('/api/session/locale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, locale: newLocale }),
      });
    } catch (error) {
      console.error('Failed to update session locale:', error);
    }
  };

  if (variant === 'inline') {
    return (
      <div className="flex flex-wrap gap-2">
        {languageOptions.map((language) => (
          <Button
            key={language.code}
            variant={language.code === locale ? 'primary' : 'outline'}
            size="sm"
            onClick={() => handleLanguageChange(language.code)}
            className="text-sm"
          >
            {language.nativeName}
          </Button>
        ))}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
          aria-label={t('languageSwitch')}
        >
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">
            {currentLanguage?.nativeName || 'EN'}
          </span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {languageOptions.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            className={`flex items-center justify-between ${
              language.code === locale ? 'bg-accent' : ''
            }`}
          >
            <span>{language.nativeName}</span>
            <span className="text-xs text-muted-foreground">
              {language.name}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
