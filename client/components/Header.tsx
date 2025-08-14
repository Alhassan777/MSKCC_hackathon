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
          <div className="h-10 w-10 rounded-lg overflow-hidden bg-white border border-gray-200 shadow-sm">
            <img 
              src="/assets/iPfhoTo7_400x400.webp" 
              alt="Care Companion Logo" 
              className="h-full w-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.parentElement!.innerHTML = '<div class="h-full w-full bg-[#002569] flex items-center justify-center text-white text-xs font-bold">CC</div>';
              }}
            />
          </div>
          <div className="ml-3">
            <h1 className="text-lg font-semibold text-gray-900">Care Companion</h1>
            <p className="text-xs text-gray-500">Healthcare Assistant</p>
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
