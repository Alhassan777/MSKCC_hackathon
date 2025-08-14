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
    <div className={cn('flex flex-wrap gap-3 justify-center', className)}>
      {chips.map((chip) => (
        <Button
          key={chip.id}
          variant={chip.variant || 'outline'}
          size="lg"
          onClick={chip.onClick}
          className="text-sm font-semibold px-6 py-3 border-2 border-gray-300 bg-white text-gray-700 hover:!border-[#002569] hover:!text-white hover:!bg-[#002569] hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 min-w-[140px] focus:ring-2 focus:ring-[#002569] focus:ring-offset-2 msk-hover"
        >
          {chip.label}
        </Button>
      ))}
    </div>
  );
}
