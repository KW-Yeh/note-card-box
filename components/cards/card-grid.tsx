'use client';

import { CardItem } from './card-item';
import { Skeleton } from '@/components/ui/skeleton';
import { type Card, type Tag } from '@/types/card';

interface CardGridProps {
  cards: Card[];
  tags: Tag[];
  isLoading?: boolean;
  onDelete?: (id: string) => void;
  emptyMessage?: string;
}

export function CardGrid({ cards, tags, isLoading, onDelete, emptyMessage }: CardGridProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-lg font-medium text-muted-foreground">
          {emptyMessage || '尚無卡片'}
        </p>
        {!emptyMessage && (
          <p className="mt-1 text-sm text-muted-foreground">
            點擊「新增卡片」開始建立你的知識庫
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <CardItem key={card.id} card={card} tags={tags} onDelete={onDelete} />
      ))}
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex gap-1">
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-5 w-12" />
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </div>
  );
}
