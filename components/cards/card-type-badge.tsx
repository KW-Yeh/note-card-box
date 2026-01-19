'use client';

import { Badge } from '@/components/ui/badge';
import { type CardType, CARD_TYPE_LABELS, CARD_TYPE_COLORS } from '@/types/card';
import { cn } from '@/lib/utils';

interface CardTypeBadgeProps {
  type: CardType;
  className?: string;
}

export function CardTypeBadge({ type, className }: CardTypeBadgeProps) {
  const color = CARD_TYPE_COLORS[type];
  const label = CARD_TYPE_LABELS[type];

  return (
    <Badge
      variant="outline"
      className={cn('border-current', className)}
      style={{ color, borderColor: color }}
    >
      {label}
    </Badge>
  );
}
