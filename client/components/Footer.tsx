'use client';

import { useTranslations } from 'next-intl';

export function Footer() {
  const t = useTranslations('footer');

  const links = [
    { label: t('resources'), href: '#' },
    { label: t('billing'), href: '#' },
    { label: t('locations'), href: '#' },
    { label: t('privacy'), href: '#' },
  ];

  return (
    <footer className="border-t bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="flex flex-wrap justify-center gap-6">
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm text-gray-600 hover:text-primary transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="text-center text-xs text-gray-500">
            <p>© 2024 Memorial Sloan Kettering Cancer Center. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
