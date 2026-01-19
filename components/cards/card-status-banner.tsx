'use client';

import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type Card, CARD_TYPE_LABELS } from '@/types/card';

interface CardStatusBannerProps {
  card: Card;
  onPromote?: () => void;
}

export function CardStatusBanner({ card, onPromote }: CardStatusBannerProps) {
  if (card.type === 'PERMANENT') return null;

  return (
    <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950">
      <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
        <AlertCircle className="h-4 w-4" />
        <span className="text-sm">
          {CARD_TYPE_LABELS[card.type]} - 待歸納至永久卡片盒
        </span>
      </div>
      {onPromote && (
        <Button variant="outline" size="sm" onClick={onPromote}>
          歸納為永久卡片
        </Button>
      )}
    </div>
  );
}
