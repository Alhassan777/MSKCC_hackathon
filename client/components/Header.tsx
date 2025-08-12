'use client';

import { useTranslations } from 'next-intl';
import { Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export function Header() {
  const t = useTranslations('header');
  
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <div className="flex items-center">
          <div className="flex h-8 w-32 items-center justify-center rounded bg-primary text-white text-sm font-semibold">
            MSK Logo
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Button
            variant="primary"
            size="sm"
            className="flex items-center gap-2"
            asChild
          >
            <a href="tel:+1-212-639-2000" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              <span className="hidden sm:inline">{t('callNow')}</span>
            </a>
          </Button>
        </div>
      </div>
    </header>
  );
}
