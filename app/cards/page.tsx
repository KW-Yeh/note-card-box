'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { CardGrid } from '@/components/cards/card-grid';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useCards, useTags, useDB } from '@/contexts';
import { type CardType, CARD_TYPE_LABELS } from '@/types/card';
import { toast } from 'sonner';

const CARD_TYPES: (CardType | 'ALL')[] = ['ALL', 'PERMANENT', 'INNOVATION', 'LITERATURE', 'PROJECT'];

function CardsPageContent() {
  const searchParams = useSearchParams();
  const typeParam = searchParams.get('type') as CardType | null;

  const { db, isReady } = useDB();
  const { cards, isLoading, fetchCards, deleteCard } = useCards();
  const { tags, fetchTags } = useTags();

  const [activeType, setActiveType] = useState<CardType | 'ALL'>(typeParam || 'ALL');

  useEffect(() => {
    if (isReady && db) {
      fetchTags();
    }
  }, [isReady, db, fetchTags]);

  useEffect(() => {
    if (isReady && db) {
      if (activeType === 'ALL') {
        fetchCards();
      } else {
        fetchCards({ type: activeType });
      }
    }
  }, [isReady, db, activeType, fetchCards]);

  const handleDelete = async (id: string) => {
    try {
      await deleteCard(id);
      toast.success('卡片已刪除');
    } catch {
      toast.error('刪除失敗');
    }
  };

  const handleTypeChange = (value: string) => {
    setActiveType(value as CardType | 'ALL');
  };

  return (
    <div className="flex flex-col">
      <Header title="所有卡片" />

      <div className="flex-1 space-y-4 p-4 md:p-6">
        {/* Type Filter Tabs */}
        <Tabs value={activeType} onValueChange={handleTypeChange}>
          <TabsList className="flex-wrap">
            <TabsTrigger value="ALL">全部</TabsTrigger>
            {CARD_TYPES.filter((t) => t !== 'ALL').map((type) => (
              <TabsTrigger key={type} value={type}>
                {CARD_TYPE_LABELS[type as CardType]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Card Grid */}
        <CardGrid cards={cards} tags={tags} isLoading={isLoading} onDelete={handleDelete} />
      </div>
    </div>
  );
}

function CardsPageSkeleton() {
  return (
    <div className="flex flex-col">
      <div className="h-16 border-b" />
      <div className="flex-1 space-y-4 p-4 md:p-6">
        <Skeleton className="h-10 w-full max-w-md" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CardsPage() {
  return (
    <Suspense fallback={<CardsPageSkeleton />}>
      <CardsPageContent />
    </Suspense>
  );
}
