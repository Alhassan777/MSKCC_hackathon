'use client';

import { useTranslations } from 'next-intl';
import { Play, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface HeroCampaignProps {
  onOpenChat: () => void;
}

export function HeroCampaign({ onOpenChat }: HeroCampaignProps) {
  const t = useTranslations('hero');

  return (
    <section className="container mx-auto px-4 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Content */}
          <div className="flex flex-col justify-center space-y-6">
            <div className="space-y-4">
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
                {t('title')}
              </h1>
              <p className="text-xl text-gray-600 text-balance">
                {t('subtitle')}
              </p>
            </div>
            
            <div className="flex flex-col gap-4 sm:flex-row">
              <Button
                size="lg"
                variant="primary"
                onClick={onOpenChat}
                className="flex items-center gap-2"
              >
                <MessageCircle className="h-5 w-5" />
                {t('openChat')}
              </Button>
            </div>
          </div>

          {/* Video Placeholder */}
          <div className="flex items-center justify-center">
            <Card className="relative aspect-video w-full max-w-lg overflow-hidden">
              <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white">
                    <Play className="h-8 w-8 ml-1" />
                  </div>
                  <p className="text-sm font-medium text-gray-600">
                    {t('watchVideo')}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Introduction to MSK Young Adult Services
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
