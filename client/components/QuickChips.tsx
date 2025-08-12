'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface QuickChip {
  id: string;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'primary' | 'outline';
}

interface QuickChipsProps {
  chips: QuickChip[];
  className?: string;
}

export function QuickChips({ chips, className }: QuickChipsProps) {
  if (!chips || chips.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {chips.map((chip) => (
        <Button
          key={chip.id}
          variant={chip.variant || 'outline'}
          size="sm"
          onClick={chip.onClick}
          className="text-sm transition-all hover:scale-105"
        >
          {chip.label}
        </Button>
      ))}
    </div>
  );
}
