'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { nanoid } from 'nanoid';
import { useDB } from './db-context';
import type { Card, CardType, CardStatus } from '@/types/card';

interface CardFilters {
  type?: CardType;
  status?: CardStatus;
  tagIds?: string[];
}

interface CardsContextValue {
  cards: Card[];
  isLoading: boolean;
  fetchCards: (filters?: CardFilters) => Promise<void>;
  getCard: (id: string) => Promise<Card | undefined>;
  getCardByShareId: (shareId: string) => Promise<Card | undefined>;
  createCard: (
    data: Omit<Card, 'id' | 'shareId' | 'createdAt' | 'updatedAt'>
  ) => Promise<Card>;
  updateCard: (id: string, data: Partial<Card>) => Promise<Card>;
  deleteCard: (id: string) => Promise<void>;
  promoteCard: (id: string) => Promise<Card>;
  searchCards: (query: string) => Promise<Card[]>;
}

const CardsContext = createContext<CardsContextValue | null>(null);

export function CardsProvider({ children }: { children: ReactNode }) {
  const { db } = useDB();
  const [cards, setCards] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchCards = useCallback(
    async (filters?: CardFilters) => {
      if (!db) return;
      setIsLoading(true);

      try {
        let result: Card[];

        if (filters?.type) {
          result = await db.getAllFromIndex('cards', 'by-type', filters.type);
        } else if (filters?.status) {
          result = await db.getAllFromIndex(
            'cards',
            'by-status',
            filters.status
          );
        } else {
          result = await db.getAll('cards');
        }

        // Filter by tags if specified
        if (filters?.tagIds && filters.tagIds.length > 0) {
          result = result.filter((card) =>
            filters.tagIds!.every((tagId) => card.tagIds.includes(tagId))
          );
        }

        setCards(result.sort((a, b) => b.updatedAt - a.updatedAt));
      } finally {
        setIsLoading(false);
      }
    },
    [db]
  );

  const getCard = useCallback(
    async (id: string) => {
      if (!db) return undefined;
      return db.get('cards', id);
    },
    [db]
  );

  const getCardByShareId = useCallback(
    async (shareId: string) => {
      if (!db) return undefined;
      return db.getFromIndex('cards', 'by-shareId', shareId);
    },
    [db]
  );

  const createCard = useCallback(
    async (
      data: Omit<Card, 'id' | 'shareId' | 'createdAt' | 'updatedAt'>
    ): Promise<Card> => {
      if (!db) throw new Error('Database not ready');

      const now = Date.now();
      const card: Card = {
        ...data,
        id: nanoid(),
        shareId: nanoid(10),
        createdAt: now,
        updatedAt: now,
      };

      await db.put('cards', card);
      setCards((prev) => [card, ...prev]);
      return card;
    },
    [db]
  );

  const updateCard = useCallback(
    async (id: string, data: Partial<Card>): Promise<Card> => {
      if (!db) throw new Error('Database not ready');

      const existing = await db.get('cards', id);
      if (!existing) throw new Error('Card not found');

      const updated: Card = {
        ...existing,
        ...data,
        id: existing.id,
        shareId: existing.shareId,
        createdAt: existing.createdAt,
        updatedAt: Date.now(),
      };

      await db.put('cards', updated);
      setCards((prev) => prev.map((c) => (c.id === id ? updated : c)));
      return updated;
    },
    [db]
  );

  const deleteCard = useCallback(
    async (id: string) => {
      if (!db) throw new Error('Database not ready');

      // Delete associated links
      const linksFrom = await db.getAllFromIndex('links', 'by-sourceId', id);
      const linksTo = await db.getAllFromIndex('links', 'by-targetId', id);

      const tx = db.transaction(['cards', 'links'], 'readwrite');
      await Promise.all([
        tx.objectStore('cards').delete(id),
        ...linksFrom.map((link) => tx.objectStore('links').delete(link.id)),
        ...linksTo.map((link) => tx.objectStore('links').delete(link.id)),
      ]);
      await tx.done;

      setCards((prev) => prev.filter((c) => c.id !== id));
    },
    [db]
  );

  const promoteCard = useCallback(
    async (id: string): Promise<Card> => {
      if (!db) throw new Error('Database not ready');

      const card = await db.get('cards', id);
      if (!card) throw new Error('Card not found');

      if (card.type === 'PERMANENT') {
        throw new Error('This card is already permanent');
      }

      // Check if card has any links
      const linksFrom = await db.getAllFromIndex('links', 'by-sourceId', id);
      const linksTo = await db.getAllFromIndex('links', 'by-targetId', id);

      if (linksFrom.length + linksTo.length === 0) {
        throw new Error(
          '請先建立與現有知識的聯繫（延伸或對立），再進行歸納。'
        );
      }

      const promoted: Card = {
        ...card,
        type: 'PERMANENT',
        status: 'ARCHIVED',
        promotedAt: Date.now(),
        updatedAt: Date.now(),
      };

      await db.put('cards', promoted);
      setCards((prev) => prev.map((c) => (c.id === id ? promoted : c)));
      return promoted;
    },
    [db]
  );

  const searchCards = useCallback(
    async (query: string): Promise<Card[]> => {
      if (!db) return [];

      const allCards = await db.getAll('cards');
      const lowerQuery = query.toLowerCase();

      return allCards
        .filter((card) => card.title.toLowerCase().includes(lowerQuery))
        .sort((a, b) => b.updatedAt - a.updatedAt);
    },
    [db]
  );

  return (
    <CardsContext.Provider
      value={{
        cards,
        isLoading,
        fetchCards,
        getCard,
        getCardByShareId,
        createCard,
        updateCard,
        deleteCard,
        promoteCard,
        searchCards,
      }}
    >
      {children}
    </CardsContext.Provider>
  );
}

export function useCards() {
  const context = useContext(CardsContext);
  if (!context) {
    throw new Error('useCards must be used within a CardsProvider');
  }
  return context;
}
