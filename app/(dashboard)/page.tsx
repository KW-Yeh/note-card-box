'use client';

import { useEffect } from 'react';
import { Header } from '@/components/layout/header';
import { QuadrantView } from '@/components/dashboard/quadrant-view';
import { CardGrid } from '@/components/cards/card-grid';
import { useCards, useTags, useDB } from '@/contexts';

export default function DashboardPage() {
  const { db, isReady } = useDB();
  const { cards, isLoading: cardsLoading, fetchCards } = useCards();
  const { tags, fetchTags } = useTags();

  useEffect(() => {
    if (isReady && db) {
      fetchCards();
      fetchTags();
    }
  }, [isReady, db, fetchCards, fetchTags]);

  const recentCards = cards.slice(0, 6);

  return (
    <div className="flex flex-col">
      <Header title="儀表板" />

      <div className="flex-1 space-y-8 p-4 md:p-6">
        {/* Quadrant View */}
        <section>
          <h2 className="mb-4 text-lg font-semibold">卡片盒概覽</h2>
          <QuadrantView cards={cards} isLoading={cardsLoading} />
        </section>

        {/* Recent Cards */}
        <section>
          <h2 className="mb-4 text-lg font-semibold">最近編輯</h2>
          <CardGrid cards={recentCards} tags={tags} isLoading={cardsLoading} />
        </section>
      </div>
    </div>
  );
}
