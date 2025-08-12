'use client';

import { useTranslations } from 'next-intl';
import { Info } from 'lucide-react';

export function DisclaimerBar() {
  const t = useTranslations('chat');

  return (
    <div className="flex items-start gap-3 rounded-lg bg-blue-50 border border-blue-200 p-3 mb-4">
      <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
      <p className="text-sm text-blue-800">
        {t('disclaimer')}
      </p>
    </div>
  );
}
