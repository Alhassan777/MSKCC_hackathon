'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Send } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { containsPII } from '@/lib/utils';

interface ChatComposerProps {
  onSubmit: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

interface FormData {
  message: string;
}

export function ChatComposer({ onSubmit, disabled = false, placeholder }: ChatComposerProps) {
  const t = useTranslations('chat');
  const [showPIIWarning, setShowPIIWarning] = useState(false);
  
  const form = useForm<FormData>({
    defaultValues: {
      message: '',
    },
  });

  const handleSubmit = (data: FormData) => {
    const message = data.message.trim();
    if (!message) return;

    // Check for PII
    if (containsPII(message)) {
      setShowPIIWarning(true);
      setTimeout(() => setShowPIIWarning(false), 5000);
    }

    onSubmit(message);
    form.reset();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.handleSubmit(handleSubmit)();
    }
  };

  return (
    <div className="border-t bg-white p-4">
      {showPIIWarning && (
        <div className="mb-3 rounded-lg bg-yellow-50 border border-yellow-200 p-3">
          <p className="text-sm text-yellow-800">
            {t('safety.piiDetected')}
          </p>
        </div>
      )}
      
      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex gap-2">
        <Input
          {...form.register('message')}
          placeholder={placeholder || t('inputPlaceholder')}
          disabled={disabled}
          onKeyPress={handleKeyPress}
          className="flex-1"
          autoComplete="off"
        />
        <Button
          type="submit"
          variant="primary"
          size="icon"
          disabled={disabled || !form.watch('message')?.trim()}
          className="flex-shrink-0"
          aria-label={t('send')}
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
