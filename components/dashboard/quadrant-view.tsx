'use client';

import { CardBoxTile } from './card-box-tile';
import { type Card, type CardType } from '@/types/card';
import { Skeleton } from '@/components/ui/skeleton';

interface QuadrantViewProps {
  cards: Card[];
  isLoading?: boolean;
}

const CARD_TYPES: CardType[] = ['INNOVATION', 'LITERATURE', 'PROJECT', 'PERMANENT'];

export function QuadrantView({ cards, isLoading }: QuadrantViewProps) {
  const now = Date.now();
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

  const getCountByType = (type: CardType) =>
    cards.filter((card) => card.type === type).length;

  const getRecentCountByType = (type: CardType) =>
    cards.filter((card) => card.type === type && card.createdAt > oneWeekAgo).length;

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {CARD_TYPES.map((type) => (
          <Skeleton key={type} className="h-32" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {CARD_TYPES.map((type) => (
        <CardBoxTile
          key={type}
          type={type}
          count={getCountByType(type)}
          recentCount={getRecentCountByType(type)}
        />
      ))}
    </div>
  );
}
